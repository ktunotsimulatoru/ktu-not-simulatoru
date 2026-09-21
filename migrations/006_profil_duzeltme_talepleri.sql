-- 005 sonrasında uygulanır: profil katkıları ve moderasyonlu düzeltme talepleri.
-- Mevcut kayıtları değiştirmez; yeni ders/veri paylaşımlarına kapalı bir sahiplik kaydı ekler.
begin;

do $$ begin
    if to_regclass('public.kayitli_donemler') is null then
        raise exception 'Önce 004_gano_donemler_isletim.sql migrationını çalıştırın.';
    end if;
end $$;

create table if not exists public.katki_sahipligi (
    hedef_turu text not null check (hedef_turu in ('ders','ders_verisi')),
    hedef_id text not null,
    kullanici_id uuid not null references auth.users(id) on delete cascade,
    olusturulma_tarihi timestamptz not null default now(),
    primary key(hedef_turu,hedef_id)
);
create index if not exists katki_sahipligi_kullanici_idx on public.katki_sahipligi(kullanici_id,olusturulma_tarihi desc);
alter table public.katki_sahipligi enable row level security;
revoke all on public.katki_sahipligi from public,anon,authenticated;

create or replace function public.katki_sahipligi_yaz()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$ declare u uuid:=auth.uid(); begin
    if u is not null then insert into public.katki_sahipligi(hedef_turu,hedef_id,kullanici_id)
        values(tg_argv[0],new.id::text,u) on conflict do nothing; end if;
    return new;
end; $$;
drop trigger if exists ders_katki_sahipligi_yaz on public.dersler;
create trigger ders_katki_sahipligi_yaz after insert on public.dersler for each row execute function public.katki_sahipligi_yaz('ders');
drop trigger if exists ders_verisi_katki_sahipligi_yaz on public.ders_verileri;
create trigger ders_verisi_katki_sahipligi_yaz after insert on public.ders_verileri for each row execute function public.katki_sahipligi_yaz('ders_verisi');

create table if not exists public.duzeltme_talepleri (
    id uuid primary key default gen_random_uuid(),
    kullanici_id uuid not null references auth.users(id) on delete cascade,
    hedef_turu text not null check (hedef_turu in ('nk_ders','ders','ders_verisi')),
    hedef_id text not null,
    oneri jsonb not null check (jsonb_typeof(oneri)='object'),
    aciklama text not null check (char_length(btrim(aciklama)) between 5 and 500),
    durum text not null default 'beklemede' check (durum in ('beklemede','onaylandi','reddedildi','iptal')),
    sonuc_notu text check (sonuc_notu is null or char_length(sonuc_notu)<=1000),
    olusturulma_tarihi timestamptz not null default now(),
    sonuclanma_tarihi timestamptz
);
create unique index if not exists duzeltme_talebi_acik_unique
    on public.duzeltme_talepleri(kullanici_id,hedef_turu,hedef_id) where durum='beklemede';
create index if not exists duzeltme_talebi_durum_idx
    on public.duzeltme_talepleri(durum,olusturulma_tarihi desc);
alter table public.duzeltme_talepleri enable row level security;
revoke all on public.duzeltme_talepleri from public,anon,authenticated;

create or replace function public.duzeltme_talebi_olustur(
    p_hedef_turu text,p_hedef_id text,p_oneri jsonb,p_aciklama text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare u uuid:=auth.uid(); hedef_sahibi uuid; yeni_ad text; yeni_kod text;
begin
    if not public.nk_dogrulanmis_uye(u) then return jsonb_build_object('hata','yetkisiz'); end if;
    if p_hedef_turu not in ('nk_ders','ders','ders_verisi') or coalesce(p_hedef_id,'')!~'^[0-9]+$'
       or jsonb_typeof(p_oneri)<>'object' or char_length(btrim(coalesce(p_aciklama,''))) not between 5 and 500 then
        return jsonb_build_object('hata','gecersiz_veri');
    end if;
    if p_hedef_turu='nk_ders' then
        select ekleyen_kullanici_id into hedef_sahibi from public.nk_dersler where id=p_hedef_id::bigint;
        yeni_ad:=nullif(btrim(p_oneri->>'ders_adi'),''); yeni_kod:=nullif(btrim(p_oneri->>'ders_kodu'),'');
        if yeni_ad is null or char_length(yeni_ad)>160 or (yeni_kod is not null and public.nk_ders_kodu_standartlastir(yeni_kod) is null)
           or p_oneri - array['ders_adi','ders_kodu']::text[] <> '{}'::jsonb then return jsonb_build_object('hata','gecersiz_oneri'); end if;
        p_oneri:=jsonb_build_object('ders_adi',yeni_ad,'ders_kodu',public.nk_ders_kodu_standartlastir(yeni_kod));
    elsif p_hedef_turu='ders' then
        select kullanici_id into hedef_sahibi from public.katki_sahipligi where hedef_turu='ders' and hedef_id=p_hedef_id;
        yeni_ad:=nullif(btrim(p_oneri->>'ders_adi'),''); yeni_kod:=nullif(btrim(p_oneri->>'ders_kodu'),'');
        if yeni_ad is null or char_length(yeni_ad)>160 or (yeni_kod is not null and public.nk_ders_kodu_standartlastir(yeni_kod) is null)
           or p_oneri - array['ders_adi','ders_kodu']::text[] <> '{}'::jsonb then return jsonb_build_object('hata','gecersiz_oneri'); end if;
        p_oneri:=jsonb_build_object('ders_adi',yeni_ad,'ders_kodu',public.nk_ders_kodu_standartlastir(yeni_kod));
    else
        select kullanici_id into hedef_sahibi from public.katki_sahipligi where hedef_turu='ders_verisi' and hedef_id=p_hedef_id;
        if p_oneri - array['ortalama','std_sapma','ogrenci_sayisi']::text[] <> '{}'::jsonb
           or not (p_oneri ?| array['ortalama','std_sapma','ogrenci_sayisi'])
           or (p_oneri ? 'ortalama' and ((p_oneri->>'ortalama')!~'^[0-9]+([.][0-9]+)?$' or (p_oneri->>'ortalama')::numeric not between 0 and 100))
           or (p_oneri ? 'std_sapma' and ((p_oneri->>'std_sapma')!~'^[0-9]+([.][0-9]+)?$' or (p_oneri->>'std_sapma')::numeric not between 0 and 50))
           or (p_oneri ? 'ogrenci_sayisi' and ((p_oneri->>'ogrenci_sayisi')!~'^[0-9]+$' or (p_oneri->>'ogrenci_sayisi')::integer not between 1 and 10000))
        then return jsonb_build_object('hata','gecersiz_oneri'); end if;
    end if;
    if hedef_sahibi is null then return jsonb_build_object('hata','kayit_bulunamadi'); end if;
    if hedef_sahibi<>u then return jsonb_build_object('hata','yetkisiz'); end if;
    if exists(select 1 from public.duzeltme_talepleri where kullanici_id=u and hedef_turu=p_hedef_turu and hedef_id=p_hedef_id and durum='beklemede')
       then return jsonb_build_object('hata','zaten_bekliyor'); end if;
    insert into public.duzeltme_talepleri(kullanici_id,hedef_turu,hedef_id,oneri,aciklama)
        values(u,p_hedef_turu,p_hedef_id,p_oneri,btrim(p_aciklama));
    return jsonb_build_object('basarili',true);
exception when unique_violation then return jsonb_build_object('hata','zaten_bekliyor');
end; $$;
revoke all on function public.duzeltme_talebi_olustur(text,text,jsonb,text) from public,anon;
grant execute on function public.duzeltme_talebi_olustur(text,text,jsonb,text) to authenticated;

create or replace function public.duzeltme_taleplerim()
returns jsonb language sql stable security definer set search_path=pg_catalog,public
as $$ select coalesce(jsonb_agg(to_jsonb(t) order by t.olusturulma_tarihi desc),'[]'::jsonb)
      from (select id,hedef_turu,hedef_id,oneri,aciklama,durum,sonuc_notu,olusturulma_tarihi,sonuclanma_tarihi
            from public.duzeltme_talepleri where kullanici_id=auth.uid() limit 100) t $$;
revoke all on function public.duzeltme_taleplerim() from public,anon;
grant execute on function public.duzeltme_taleplerim() to authenticated;

create or replace function public.duzeltme_talebi_iptal(p_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ begin
    update public.duzeltme_talepleri set durum='iptal',sonuclanma_tarihi=now()
    where id=p_id and kullanici_id=auth.uid() and durum='beklemede';
    if not found then return jsonb_build_object('hata','bulunamadi'); end if;
    return jsonb_build_object('basarili',true);
end; $$;
revoke all on function public.duzeltme_talebi_iptal(uuid) from public,anon;
grant execute on function public.duzeltme_talebi_iptal(uuid) to authenticated;

create or replace function public.profil_katkilarim()
returns jsonb language sql stable security definer set search_path=pg_catalog,public
as $$
select jsonb_build_object(
    'dersler',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'ders_adi',d.ders_adi,'ders_kodu',d.ders_kodu,'onaylandi',d.onaylandi,'bolum_adi',b.ad) order by d.id desc)
        from public.katki_sahipligi k join public.dersler d on d.id::text=k.hedef_id left join public.bolumler b on b.id=d.bolum_id
        where k.hedef_turu='ders' and k.kullanici_id=auth.uid()),'[]'::jsonb),
    'veriler',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'ortalama',v.ortalama,'std_sapma',v.std_sapma,'ogrenci_sayisi',v.ogrenci_sayisi,'can_turu',v.can_turu,'donem',v.donem,'yil',v.yil,'ders_adi',d.ders_adi,'ders_kodu',d.ders_kodu) order by v.id desc)
        from public.katki_sahipligi k join public.ders_verileri v on v.id::text=k.hedef_id left join public.dersler d on d.id=v.ders_id
        where k.hedef_turu='ders_verisi' and k.kullanici_id=auth.uid()),'[]'::jsonb)
) $$;
revoke all on function public.profil_katkilarim() from public,anon;
grant execute on function public.profil_katkilarim() to authenticated;

create or replace function public.admin_duzeltme_talepleri_listele(p_admin_token text,p_durum text default 'beklemede',p_limit integer default 30,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public
as $$ declare sonuc jsonb; begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    if p_limit not between 1 and 100 or p_offset<0 then raise exception 'gecersiz_sayfalama'; end if;
    select jsonb_build_object('toplam',(select count(*) from public.duzeltme_talepleri where p_durum is null or durum=p_durum),
        'satirlar',coalesce((select jsonb_agg(to_jsonb(x) order by x.olusturulma_tarihi desc) from (
            select t.id,t.hedef_turu,t.hedef_id,t.oneri,t.aciklama,t.durum,t.sonuc_notu,t.olusturulma_tarihi,u.email,
                case t.hedef_turu
                    when 'nk_ders' then (select jsonb_build_object('ders_adi',d.ders_adi,'ders_kodu',d.ders_kodu) from public.nk_dersler d where d.id=t.hedef_id::bigint)
                    when 'ders' then (select jsonb_build_object('ders_adi',d.ders_adi,'ders_kodu',d.ders_kodu) from public.dersler d where d.id=t.hedef_id::bigint)
                    else (select jsonb_build_object('ortalama',v.ortalama,'std_sapma',v.std_sapma,'ogrenci_sayisi',v.ogrenci_sayisi) from public.ders_verileri v where v.id=t.hedef_id::bigint)
                end mevcut
            from public.duzeltme_talepleri t left join auth.users u on u.id=t.kullanici_id
            where p_durum is null or t.durum=p_durum order by t.olusturulma_tarihi desc limit p_limit offset p_offset) x),'[]'::jsonb)) into sonuc;
    return sonuc;
end; $$;
revoke all on function public.admin_duzeltme_talepleri_listele(text,text,integer,integer) from public;
grant execute on function public.admin_duzeltme_talepleri_listele(text,text,integer,integer) to anon,authenticated;

create or replace function public.admin_duzeltme_talebi_sonuclandir(p_admin_token text,p_id uuid,p_karar text,p_not text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare t public.duzeltme_talepleri; begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    if p_karar not in ('onaylandi','reddedildi') or char_length(coalesce(p_not,''))>1000
       or (p_karar='reddedildi' and nullif(btrim(coalesce(p_not,'')),'') is null) then return jsonb_build_object('hata','gecersiz_veri'); end if;
    select * into t from public.duzeltme_talepleri where id=p_id and durum='beklemede' for update;
    if not found then return jsonb_build_object('hata','bulunamadi'); end if;
    if p_karar='onaylandi' then
        if t.hedef_turu='nk_ders' then update public.nk_dersler set ders_adi=t.oneri->>'ders_adi',ders_kodu=t.oneri->>'ders_kodu' where id=t.hedef_id::bigint;
        elsif t.hedef_turu='ders' then update public.dersler set ders_adi=t.oneri->>'ders_adi',ders_kodu=nullif(t.oneri->>'ders_kodu','') where id=t.hedef_id::bigint;
        else update public.ders_verileri set
            ortalama=case when t.oneri?'ortalama' then (t.oneri->>'ortalama')::numeric else ortalama end,
            std_sapma=case when t.oneri?'std_sapma' then (t.oneri->>'std_sapma')::numeric else std_sapma end,
            ogrenci_sayisi=case when t.oneri?'ogrenci_sayisi' then (t.oneri->>'ogrenci_sayisi')::integer else ogrenci_sayisi end
            where id=t.hedef_id::bigint; end if;
        if not found then return jsonb_build_object('hata','hedef_bulunamadi'); end if;
    end if;
    update public.duzeltme_talepleri set durum=p_karar,sonuc_notu=nullif(btrim(p_not),''),sonuclanma_tarihi=now() where id=p_id;
    return jsonb_build_object('basarili',true);
end; $$;
revoke all on function public.admin_duzeltme_talebi_sonuclandir(text,uuid,text,text) from public;
grant execute on function public.admin_duzeltme_talebi_sonuclandir(text,uuid,text,text) to anon,authenticated;

commit;
