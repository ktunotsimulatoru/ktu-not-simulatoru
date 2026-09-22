-- 010 sonrasında uygulanır.
-- Zararlı dosya tespitlerini, paylaşım dondurmasını, kullanıcı itirazını ve
-- yönetici incelemesini ekler. Dosya içeriği veya erişim tokenı kaydedilmez.
begin;

do $$ begin
    if to_regclass('public.nk_dosyalar') is null
       or to_regprocedure('public.nk_dogrulanmis_uye(uuid)') is null then
        raise exception 'Önce 001-010 migrationlarını çalıştırın.';
    end if;
end $$;

create table if not exists public.nk_hesap_guvenligi (
    kullanici_id uuid primary key references auth.users(id) on delete cascade,
    durum text not null check (durum in ('aktif','incelemede','itirazda','donduruldu')),
    tespit_sayisi integer not null default 0 check (tespit_sayisi>=0),
    son_neden text,
    olusturulma_tarihi timestamptz not null default now(),
    guncellenme_tarihi timestamptz not null default now()
);

create table if not exists public.nk_guvenlik_olaylari (
    id uuid primary key default gen_random_uuid(),
    kullanici_id uuid not null references auth.users(id) on delete cascade,
    dosya_ozeti text not null check (dosya_ozeti ~ '^[0-9a-f]{64}$'),
    mime text not null check (mime in ('image/jpeg','image/png','image/webp','application/pdf')),
    tarama_sonucu text not null check (tarama_sonucu in ('malicious','suspicious')),
    tarayici text not null check (char_length(tarayici) between 1 and 80),
    imza text check (imza is null or char_length(imza)<=160),
    tarama_id text check (tarama_id is null or char_length(tarama_id)<=160),
    durum text not null default 'acik' check (durum in ('acik','itirazda','yanlis_pozitif','onaylandi')),
    kullanici_aciklamasi text check (kullanici_aciklamasi is null or char_length(kullanici_aciklamasi)<=2000),
    yonetici_notu text check (yonetici_notu is null or char_length(yonetici_notu)<=2000),
    olusturulma_tarihi timestamptz not null default now(),
    itiraz_tarihi timestamptz,
    sonuclanma_tarihi timestamptz
);
create index if not exists nk_guvenlik_olaylari_durum_idx
    on public.nk_guvenlik_olaylari(durum,olusturulma_tarihi desc);
create index if not exists nk_guvenlik_olaylari_kullanici_idx
    on public.nk_guvenlik_olaylari(kullanici_id,olusturulma_tarihi desc);

alter table public.nk_hesap_guvenligi enable row level security;
alter table public.nk_guvenlik_olaylari enable row level security;
revoke all on public.nk_hesap_guvenligi,public.nk_guvenlik_olaylari from public,anon,authenticated;

-- Worker service_role yüzeyi. Ham dosya yerine SHA-256 özeti ve tarayıcı
-- kararı saklanır. Tespit anında topluluk/paylaşım erişimi dondurulur.
create or replace function public.nk_guvenlik_islem(p_islem text,p_veri jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare u uuid; yeni_id uuid; sonuc jsonb;
begin
    if p_islem<>'zararli_dosya' then return jsonb_build_object('hata','gecersiz_islem'); end if;
    begin u:=(p_veri->>'uid')::uuid; exception when others then return jsonb_build_object('hata','gecersiz_kullanici'); end;
    if not exists(select 1 from auth.users where id=u)
       or coalesce(p_veri->>'hash','')!~'^[0-9a-f]{64}$'
       or p_veri->>'mime' not in ('image/jpeg','image/png','image/webp','application/pdf')
       or p_veri->>'verdict' not in ('malicious','suspicious')
       or char_length(coalesce(p_veri->>'engine','')) not between 1 and 80
       or char_length(coalesce(p_veri->>'signature',''))>160
       or char_length(coalesce(p_veri->>'scan_id',''))>160 then
        return jsonb_build_object('hata','gecersiz_veri');
    end if;
    insert into public.nk_guvenlik_olaylari(kullanici_id,dosya_ozeti,mime,tarama_sonucu,tarayici,imza,tarama_id)
    values(u,p_veri->>'hash',p_veri->>'mime',p_veri->>'verdict',p_veri->>'engine',
        nullif(p_veri->>'signature',''),nullif(p_veri->>'scan_id','')) returning id into yeni_id;
    insert into public.nk_hesap_guvenligi(kullanici_id,durum,tespit_sayisi,son_neden)
    values(u,'incelemede',1,'Zararlı veya şüpheli dosya tespit edildi.')
    on conflict(kullanici_id) do update set
        durum=case when nk_hesap_guvenligi.durum='donduruldu' then 'donduruldu' else 'incelemede' end,
        tespit_sayisi=nk_hesap_guvenligi.tespit_sayisi+1,
        son_neden='Zararlı veya şüpheli dosya tespit edildi.',guncellenme_tarihi=now();
    return jsonb_build_object('basarili',true,'olay_id',yeni_id);
end;
$$;
revoke all on function public.nk_guvenlik_islem(text,jsonb) from public,anon,authenticated;
grant execute on function public.nk_guvenlik_islem(text,jsonb) to service_role;

-- Dondurulmuş hesap oturum açabilir, profilini ve itiraz yolunu görebilir;
-- Not Kutusu/topluluk yetkileri bu merkezi üyelik kontrolünde kapanır.
create or replace function public.nk_dogrulanmis_uye(p_uid uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
    select exists(select 1 from auth.users where id=p_uid and email_confirmed_at is not null
        and lower(email) ~ '^[^@[:space:]]+@ogr\.ktu\.edu\.tr$' and (banned_until is null or banned_until<now()))
       and not exists(select 1 from public.nk_hesap_guvenligi g where g.kullanici_id=p_uid and g.durum<>'aktif');
$$;
revoke all on function public.nk_dogrulanmis_uye(uuid) from public,anon,authenticated;

create or replace function public.nk_guvenlik_durumum()
returns jsonb language sql stable security definer set search_path=pg_catalog,public
as $$
    select case when auth.uid() is null then jsonb_build_object('hata','giris_gerekli') else
        coalesce((select jsonb_build_object('durum',g.durum,'tespit_sayisi',g.tespit_sayisi,'neden',g.son_neden,
            'olay_id',o.id,'olay_durumu',o.durum,'olusturulma_tarihi',o.olusturulma_tarihi)
            from public.nk_hesap_guvenligi g
            left join lateral(select id,durum,olusturulma_tarihi from public.nk_guvenlik_olaylari
                where kullanici_id=g.kullanici_id order by olusturulma_tarihi desc limit 1)o on true
            where g.kullanici_id=auth.uid()),jsonb_build_object('durum','aktif')) end;
$$;
revoke all on function public.nk_guvenlik_durumum() from public,anon;
grant execute on function public.nk_guvenlik_durumum() to authenticated;

create or replace function public.nk_guvenlik_itirazi_gonder(p_aciklama text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare u uuid:=auth.uid(); olay uuid;
begin
    if u is null or char_length(btrim(coalesce(p_aciklama,''))) not between 20 and 2000 then
        return jsonb_build_object('hata','gecersiz_aciklama'); end if;
    select id into olay from public.nk_guvenlik_olaylari
      where kullanici_id=u and durum='acik' order by olusturulma_tarihi desc limit 1 for update;
    if olay is null then return jsonb_build_object('hata','itiraza_acik_olay_yok'); end if;
    update public.nk_guvenlik_olaylari set durum='itirazda',kullanici_aciklamasi=btrim(p_aciklama),itiraz_tarihi=now()
      where id=olay;
    update public.nk_hesap_guvenligi set durum='itirazda',guncellenme_tarihi=now() where kullanici_id=u;
    return jsonb_build_object('basarili',true);
end;
$$;
revoke all on function public.nk_guvenlik_itirazi_gonder(text) from public,anon;
grant execute on function public.nk_guvenlik_itirazi_gonder(text) to authenticated;

create or replace function public.admin_nk_guvenlik_olaylari(p_admin_token text,p_durum text default null,p_limit integer default 30,p_offset integer default 0)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog,public
as $$ declare sonuc jsonb; begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    if p_limit not between 1 and 100 or p_offset<0 then raise exception 'gecersiz_sayfalama'; end if;
    select jsonb_build_object('toplam',(select count(*) from public.nk_guvenlik_olaylari where p_durum is null or durum=p_durum),
      'satirlar',coalesce((select jsonb_agg(to_jsonb(x) order by x.olusturulma_tarihi desc) from (
        select o.id,o.kullanici_id,u.email,o.mime,o.tarama_sonucu,o.tarayici,o.imza,o.durum,
          o.kullanici_aciklamasi,o.yonetici_notu,o.olusturulma_tarihi,o.itiraz_tarihi,o.sonuclanma_tarihi,
          g.durum hesap_durumu,g.tespit_sayisi
        from public.nk_guvenlik_olaylari o join auth.users u on u.id=o.kullanici_id
        left join public.nk_hesap_guvenligi g on g.kullanici_id=o.kullanici_id
        where p_durum is null or o.durum=p_durum order by o.olusturulma_tarihi desc limit p_limit offset p_offset)x),'[]'::jsonb)) into sonuc;
    return sonuc;
end;
$$;
revoke all on function public.admin_nk_guvenlik_olaylari(text,text,integer,integer) from public;
grant execute on function public.admin_nk_guvenlik_olaylari(text,text,integer,integer) to anon,authenticated;

create or replace function public.admin_nk_guvenlik_sonuclandir(p_admin_token text,p_id uuid,p_karar text,p_not text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare olay public.nk_guvenlik_olaylari; yeni_durum text; begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    if p_karar not in ('yanlis_pozitif','onaylandi') or char_length(btrim(coalesce(p_not,''))) not between 5 and 2000 then
      return jsonb_build_object('hata','gecersiz_karar'); end if;
    select * into olay from public.nk_guvenlik_olaylari where id=p_id and durum in('acik','itirazda') for update;
    if not found then return jsonb_build_object('hata','bulunamadi'); end if;
    update public.nk_guvenlik_olaylari set durum=p_karar,yonetici_notu=btrim(p_not),sonuclanma_tarihi=now() where id=p_id;
    if p_karar='onaylandi' then yeni_durum:='donduruldu';
    elsif exists(select 1 from public.nk_guvenlik_olaylari where kullanici_id=olay.kullanici_id and id<>p_id and durum in('acik','itirazda','onaylandi')) then
      yeni_durum:='incelemede'; else yeni_durum:='aktif'; end if;
    update public.nk_hesap_guvenligi set durum=yeni_durum,
      son_neden=case when yeni_durum='aktif' then 'İnceleme yanlış pozitif olarak sonuçlandı.' else btrim(p_not) end,
      guncellenme_tarihi=now() where kullanici_id=olay.kullanici_id;
    return jsonb_build_object('basarili',true,'hesap_durumu',yeni_durum);
end;
$$;
revoke all on function public.admin_nk_guvenlik_sonuclandir(text,uuid,text,text) from public;
grant execute on function public.admin_nk_guvenlik_sonuclandir(text,uuid,text,text) to anon,authenticated;

-- Dondurulmuş hesapların doğrudan tablo INSERT'leriyle paylaşım yapmasını da engelle.
create or replace function public.nk_dondurulmus_hesap_yazmasin()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$ begin
    if auth.uid() is not null and exists(select 1 from public.nk_hesap_guvenligi where kullanici_id=auth.uid() and durum<>'aktif') then
      raise exception using errcode='42501',message='Hesap güvenlik incelemesinde; yeni paylaşım yapılamaz.'; end if;
    return new;
end; $$;
revoke all on function public.nk_dondurulmus_hesap_yazmasin() from public,anon,authenticated;

do $$ declare tablo text; begin
  foreach tablo in array array['sorular','nk_dersler','dersler','ders_verileri'] loop
    if to_regclass('public.'||tablo) is not null then
      execute format('drop trigger if exists nk_guvenlik_yazma_engeli on public.%I',tablo);
      execute format('create trigger nk_guvenlik_yazma_engeli before insert on public.%I for each row execute function public.nk_dondurulmus_hesap_yazmasin()',tablo);
    end if;
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
