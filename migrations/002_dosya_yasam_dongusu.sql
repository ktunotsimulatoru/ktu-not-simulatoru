-- 001 sonrasında uygulanır. Mevcut dosyalar silinmez; ilk yetkili okumada doğrulanır.
begin;
create table if not exists public.nk_dosya_ayarlari (
    id boolean primary key default true check (id),
    kota_bayt bigint not null default 104857600 check (kota_bayt > 0),
    kota_adet integer not null default 100 check (kota_adet > 0),
    gunluk_adet integer not null default 30 check (gunluk_adet > 0)
);
insert into public.nk_dosya_ayarlari(id) values(true) on conflict do nothing;
create table if not exists public.nk_dosyalar (
    yol text primary key,
    kullanici_id uuid not null,
    soru_id uuid references public.sorular(id) on delete set null deferrable initially deferred,
    durum text not null check (durum in ('reserved','ready','attached','legacy','deleting','deleted')),
    boyut bigint not null check (boyut between 1 and 3500000),
    mime text not null check (mime in ('image/jpeg','image/png','image/webp','application/pdf')),
    etag text,
    kaynak text not null default 'upload' check (kaynak in ('upload','legacy','orphan')),
    olusturulma timestamptz not null default now(),
    son_tarih timestamptz not null default now() + interval '1 hour',
    sonraki_temizlik timestamptz not null default now(),
    check (public.nk_ek_yollari_gecerli(array[yol], kullanici_id))
);
create index if not exists nk_dosyalar_kullanici on public.nk_dosyalar(kullanici_id, olusturulma);
create index if not exists nk_dosyalar_soru on public.nk_dosyalar(soru_id);
create index if not exists nk_dosyalar_temizlik on public.nk_dosyalar(durum, sonraki_temizlik, son_tarih);
alter table public.nk_dosyalar enable row level security;
alter table public.nk_dosya_ayarlari enable row level security;
revoke all on public.nk_dosyalar, public.nk_dosya_ayarlari from public, anon, authenticated;
-- Tablolar tarayıcıya kapalı; Worker sadece aşağıdaki dar RPC yüzeyini kullanır.

-- Aynı yol birden fazla soruda ise sessizce sahip seçilmez: geçiş raporuna kalır.
insert into public.nk_dosyalar(yol,kullanici_id,soru_id,durum,boyut,kaynak,mime)
select yol, min(s.kullanici_id::text)::uuid, min(s.id::text)::uuid, 'legacy', 3500000, 'legacy',
    case right(yol,3) when 'pdf' then 'application/pdf' when 'png' then 'image/png'
      when 'jpg' then 'image/jpeg' else 'image/webp' end
from public.sorular s cross join lateral unnest(s.element_yollari) e(yol)
where public.nk_ek_yollari_gecerli(array[yol],s.kullanici_id)
group by yol having count(*) = 1
on conflict do nothing;

create or replace function public.nk_dogrulanmis_uye(p_uid uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $$ select exists(select 1 from auth.users where id=p_uid and email_confirmed_at is not null
    and lower(email) ~ '^[^@[:space:]]+@ogr\.ktu\.edu\.tr$' and (banned_until is null or banned_until < now())); $$;
revoke all on function public.nk_dogrulanmis_uye(uuid) from public, anon, authenticated;

create or replace function public.nk_soru_dosya_bagla()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare f public.nk_dosyalar; p text;
begin
    if TG_OP = 'DELETE' then
        update public.nk_dosyalar set durum='deleting', sonraki_temizlik=now()
        where soru_id=old.id and durum in ('attached','legacy');
        return old;
    end if;
    if TG_OP = 'UPDATE' then
        if new.kullanici_id is distinct from old.kullanici_id or new.element_yollari is distinct from old.element_yollari then
            raise exception 'Dosya sahibi ve ekler değiştirilemez; yeni soru oluşturun.' using errcode='23514';
        end if;
        return new;
    end if;
    if not public.nk_dogrulanmis_uye(new.kullanici_id) or new.durum <> 'beklemede'
       or not public.nk_ek_yollari_gecerli(new.element_yollari,new.kullanici_id)
       or cardinality(new.element_yollari) <> (select count(distinct x) from unnest(new.element_yollari) x) then
        raise exception 'Geçersiz soru ekleri veya üyelik' using errcode='23514';
    end if;
    -- Her istekte aynı kilit sırası; eşzamanlı iki soru aynı dosyayı kullanamaz.
    for p in select unnest(new.element_yollari) order by 1 loop
        select * into f from public.nk_dosyalar where yol=p for update;
        if not found or f.kullanici_id<>new.kullanici_id or f.durum<>'ready' or f.son_tarih<=now() or f.etag is null then
            raise exception 'Dosya doğrulanmamış, süresi dolmuş veya başka soruya bağlı' using errcode='23514';
        end if;
        update public.nk_dosyalar set durum='attached', soru_id=new.id where yol=p;
    end loop;
    return new;
end; $$;
revoke all on function public.nk_soru_dosya_bagla() from public, anon, authenticated;
drop trigger if exists nk_soru_dosya_bagla on public.sorular;
create trigger nk_soru_dosya_bagla before insert or update or delete on public.sorular
for each row execute function public.nk_soru_dosya_bagla();

-- Yalnızca Worker service_role anahtarı. p_uid daima doğrulanmış JWT sub değeridir.
create or replace function public.nk_dosya_islem(p_islem text, p_veri jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare u uuid := nullif(p_veri->>'uid','')::uuid; p text := p_veri->>'yol';
    f public.nk_dosyalar; a public.nk_dosya_ayarlari; b bigint; n integer; g integer;
    ext text; sonuc jsonb; yonetici boolean := false;
begin
    if p_islem in ('inventory','orphan_queue') then
        if not coalesce(public._admin_token_gecerli_mi(p_veri->>'admin_token'),false) then
            return jsonb_build_object('hata','yetkisiz'); end if;
        if p_islem='inventory' then
            if jsonb_array_length(p_veri->'yollar')>100 then return jsonb_build_object('hata','gecersiz_islem'); end if;
            select coalesce(jsonb_agg(jsonb_build_object('yol',e.yol,'durum',d.durum,
                'referansli',exists(select 1 from public.sorular s where e.yol=any(s.element_yollari)))),'[]') into sonuc
            from jsonb_array_elements_text(p_veri->'yollar') e(yol) left join public.nk_dosyalar d on d.yol=e.yol;
            return sonuc;
        end if;
        if not public.nk_ek_yollari_gecerli(array[p],split_part(p,'/',1)::uuid)
            or exists(select 1 from public.sorular s where p=any(s.element_yollari)) then
            return jsonb_build_object('hata','referansli_dosya'); end if;
        insert into public.nk_dosyalar(yol,kullanici_id,durum,boyut,mime,kaynak)
            values(p,split_part(p,'/',1)::uuid,'deleting',(p_veri->>'boyut')::bigint,p_veri->>'mime','orphan') on conflict do nothing;
        if not found then return jsonb_build_object('hata','kayitli_dosya'); end if;
        return jsonb_build_object('basarili',true);
    end if;
    if p_islem in ('reserve','quota') then
        if not public.nk_dogrulanmis_uye(u) then return jsonb_build_object('hata','ktu_uyesi_degil'); end if;
        perform pg_advisory_xact_lock(hashtextextended(u::text,0));
        select * into a from public.nk_dosya_ayarlari where id;
        select coalesce(sum(boyut) filter(where durum<>'deleted'),0), count(*) filter(where durum<>'deleted'),
            count(*) filter(where kaynak='upload' and olusturulma > now()-interval '24 hours') into b,n,g
            from public.nk_dosyalar where kullanici_id=u;
        if p_islem='quota' then return jsonb_build_object('kullanilan_bayt',b,'kullanilan_adet',n,'gunluk_adet',g,
            'kota_bayt',a.kota_bayt,'kota_adet',a.kota_adet,'gunluk_limit',a.gunluk_adet); end if;
        if (p_veri->>'boyut')::bigint not between 1 and 3500000 then return jsonb_build_object('hata','dosya_cok_buyuk'); end if;
        if b+(p_veri->>'boyut')::bigint>a.kota_bayt or n>=a.kota_adet or g>=a.gunluk_adet then
            return jsonb_build_object('hata','kota_asildi'); end if;
        ext := case p_veri->>'mime' when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg'
            when 'image/png' then 'png' when 'image/webp' then 'webp' end;
        if ext is null then return jsonb_build_object('hata','gecersiz_dosya_tipi'); end if;
        p := u::text || '/' || gen_random_uuid()::text || '.' || ext;
        insert into public.nk_dosyalar(yol,kullanici_id,durum,boyut,mime)
            values(p,u,'reserved',(p_veri->>'boyut')::bigint,p_veri->>'mime');
        return jsonb_build_object('yol',p);
    elsif p_islem='cleanup_due' then
        with aday as (
            select yol from public.nk_dosyalar
            where (durum in ('reserved','ready') and son_tarih<now())
               or (durum in ('deleting','deleted') and sonraki_temizlik<=now())
            order by sonraki_temizlik limit 20 for update skip locked
        ), secilen as (
            update public.nk_dosyalar d set durum=case when d.durum='deleted' then 'deleted' else 'deleting' end, sonraki_temizlik=now()+interval '10 minutes'
            from aday where d.yol=aday.yol returning d.yol
        ) select coalesce(jsonb_agg(yol),'[]') into sonuc from secilen;
        return sonuc;
    end if;

    select * into f from public.nk_dosyalar where yol=p for update;
    if not found then return jsonb_build_object('hata','bulunamadi'); end if;
    if p_islem='complete' then
        if f.kullanici_id<>u or f.durum<>'reserved' or f.son_tarih<=now()
           or f.boyut<>(p_veri->>'boyut')::bigint or f.mime<>p_veri->>'mime' or coalesce(p_veri->>'etag','')='' then
            return jsonb_build_object('hata','rezervasyon_gecersiz'); end if;
        update public.nk_dosyalar set durum='ready',etag=p_veri->>'etag' where yol=p;
    elsif p_islem='cancel' then
        if f.kullanici_id<>u then return jsonb_build_object('hata','yetkisiz'); end if;
        -- Kaydı başarılı olmuş fakat cevabı kaybolmuş sorunun ekini silme.
        if f.durum in ('reserved','ready') then
            update public.nk_dosyalar set durum='deleting',sonraki_temizlik=now() where yol=p;
        end if;
    elsif p_islem='cleanup_ack' then
        if f.durum not in ('deleting','deleted') then return jsonb_build_object('hata','durum_gecersiz'); end if;
        -- Tombstone korunur: geciken R2 PUT tekrar erişilebilir bir yetim oluşturamaz.
        update public.nk_dosyalar set durum='deleted',sonraki_temizlik=case when olusturulma>now()-interval '7 days' then now()+interval '1 day' else 'infinity'::timestamptz end where yol=p;
    elsif p_islem in ('read','legacy_complete') then
        if nullif(p_veri->>'admin_token','') is not null then
            yonetici := coalesce(public._admin_token_gecerli_mi(p_veri->>'admin_token'),false);
        end if;
        if not yonetici and not public.nk_dogrulanmis_uye(u) then return jsonb_build_object('hata','yetkisiz'); end if;
        if f.durum not in ('attached','legacy') or not exists (
            select 1 from public.sorular s where s.id=f.soru_id and s.kullanici_id=f.kullanici_id
            and p=any(s.element_yollari) and (yonetici or s.durum='onaylandi' or s.kullanici_id=u)
        ) then return jsonb_build_object('hata','bulunamadi'); end if;
        if p_islem='legacy_complete' then
            if f.durum<>'legacy' or (p_veri->>'boyut')::bigint not between 1 and 3500000
                or f.mime<>p_veri->>'mime' or coalesce(p_veri->>'etag','')='' then return jsonb_build_object('hata','durum_gecersiz'); end if;
            update public.nk_dosyalar set durum='attached',boyut=(p_veri->>'boyut')::bigint,etag=p_veri->>'etag' where yol=p;
        end if;
        return jsonb_build_object('basarili',true,'durum',f.durum,'mime',f.mime,'boyut',f.boyut,'etag',f.etag);
    else return jsonb_build_object('hata','gecersiz_islem');
    end if;
    return jsonb_build_object('basarili',true);
end; $$;
revoke all on function public.nk_dosya_islem(text,jsonb) from public, anon, authenticated;
grant execute on function public.nk_dosya_islem(text,jsonb) to service_role;
commit;

-- Geçiş raporu: kayıtlar otomatik silinmez, eksik/çoklu yollar ayrıca incelenir.
select s.id, e.yol from public.sorular s cross join lateral unnest(s.element_yollari) e(yol)
left join public.nk_dosyalar d on d.yol=e.yol and d.soru_id=s.id where d.yol is null;
