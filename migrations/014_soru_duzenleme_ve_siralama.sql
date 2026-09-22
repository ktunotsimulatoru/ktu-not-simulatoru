-- 013 sonrasında uygulanır: Not Kutusu paylaşımlarının yönetici tarafından
-- düzenlenmesi, sıralanması ve paylaşım sahibinin düzeltme talebi göndermesi.
begin;

do $$ begin
    if to_regclass('public.sorular') is null
       or to_regclass('public.duzeltme_talepleri') is null
       or to_regprocedure('public.admin_soru_ara(text,text,text,integer,integer)') is null then
        raise exception 'Önce 001-013 migrationlarını çalıştırın.';
    end if;
end $$;

alter table public.sorular add column if not exists goruntuleme_sirasi integer;
alter table public.sorular drop constraint if exists sorular_goruntuleme_sirasi_check;
alter table public.sorular add constraint sorular_goruntuleme_sirasi_check
    check (goruntuleme_sirasi is null or goruntuleme_sirasi between -100000 and 100000) not valid;
alter table public.sorular validate constraint sorular_goruntuleme_sirasi_check;

-- Eski hedef türü CHECK'inin adı kurulumlar arasında değişebildiği için sütuna
-- bağlı CHECK'i bulup kaldır, ardından soru türünü de içeren kuralı kur.
do $$ declare c record; begin
    for c in
        select conname from pg_constraint
        where conrelid='public.duzeltme_talepleri'::regclass and contype='c'
          and pg_get_constraintdef(oid) ~* 'hedef_turu'
    loop execute format('alter table public.duzeltme_talepleri drop constraint %I',c.conname); end loop;
end $$;
alter table public.duzeltme_talepleri add constraint duzeltme_talepleri_hedef_turu_check
    check (hedef_turu in ('nk_ders','ders','ders_verisi','soru')) not valid;
alter table public.duzeltme_talepleri validate constraint duzeltme_talepleri_hedef_turu_check;

create or replace function public.duzeltme_talebi_olustur(
    p_hedef_turu text,p_hedef_id text,p_oneri jsonb,p_aciklama text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare u uuid:=auth.uid(); hedef_sahibi uuid; yeni_ad text; yeni_kod text;
    yeni_tur text; yeni_yil integer;
begin
    if not public.nk_dogrulanmis_uye(u) then return jsonb_build_object('hata','yetkisiz'); end if;
    if p_hedef_turu not in ('nk_ders','ders','ders_verisi','soru')
       or jsonb_typeof(p_oneri)<>'object' or char_length(btrim(coalesce(p_aciklama,''))) not between 5 and 500
       or (p_hedef_turu='soru' and coalesce(p_hedef_id,'')!~'^[0-9a-fA-F-]{36}$')
       or (p_hedef_turu<>'soru' and coalesce(p_hedef_id,'')!~'^[0-9]+$') then
        return jsonb_build_object('hata','gecersiz_veri');
    end if;
    if p_hedef_turu='soru' then
        select kullanici_id into hedef_sahibi from public.sorular where id=p_hedef_id::uuid;
        if not (p_oneri ?| array['sinav_turu','akademik_yil'])
           or p_oneri - array['sinav_turu','akademik_yil']::text[] <> '{}'::jsonb then
            return jsonb_build_object('hata','gecersiz_oneri');
        end if;
        yeni_tur:=p_oneri->>'sinav_turu';
        if yeni_tur is not null and yeni_tur not in ('vize','final','butunleme','ders_notu','diger') then
            return jsonb_build_object('hata','gecersiz_oneri');
        end if;
        if p_oneri?'akademik_yil' then
            if (p_oneri->>'akademik_yil')!~'^[0-9]{4}$' then return jsonb_build_object('hata','gecersiz_oneri'); end if;
            yeni_yil:=(p_oneri->>'akademik_yil')::integer;
            if yeni_yil not between 2000 and extract(year from now())::integer+1 then return jsonb_build_object('hata','gecersiz_oneri'); end if;
        end if;
        p_oneri:=jsonb_strip_nulls(jsonb_build_object('sinav_turu',yeni_tur,'akademik_yil',yeni_yil));
    elsif p_hedef_turu='nk_ders' then
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

create or replace function public.admin_duzeltme_talepleri_listele(p_admin_token text,p_durum text default 'beklemede',p_limit integer default 30,p_offset integer default 0)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog,public
as $$ declare sonuc jsonb; begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    if p_limit not between 1 and 100 or p_offset<0 then raise exception 'gecersiz_sayfalama'; end if;
    select jsonb_build_object('toplam',(select count(*) from public.duzeltme_talepleri where p_durum is null or durum=p_durum),
        'satirlar',coalesce((select jsonb_agg(to_jsonb(x) order by x.olusturulma_tarihi desc) from (
            select t.id,t.hedef_turu,t.hedef_id,t.oneri,t.aciklama,t.durum,t.sonuc_notu,t.olusturulma_tarihi,u.email,
                case t.hedef_turu
                    when 'soru' then (select jsonb_build_object('sinav_turu',s.sinav_turu,'akademik_yil',s.akademik_yil) from public.sorular s where s.id=t.hedef_id::uuid)
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
as $$ declare t public.duzeltme_talepleri; eski text; yeni text; begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    if p_karar not in ('onaylandi','reddedildi') or char_length(coalesce(p_not,''))>1000
       or (p_karar='reddedildi' and nullif(btrim(coalesce(p_not,'')),'') is null) then return jsonb_build_object('hata','gecersiz_veri'); end if;
    select * into t from public.duzeltme_talepleri where id=p_id and durum='beklemede' for update;
    if not found then return jsonb_build_object('hata','bulunamadi'); end if;
    if p_karar='onaylandi' then
        if t.hedef_turu='soru' then
            select concat_ws(' · ',sinav_turu,akademik_yil::text) into eski from public.sorular where id=t.hedef_id::uuid;
            update public.sorular set
                sinav_turu=case when t.oneri?'sinav_turu' then t.oneri->>'sinav_turu' else sinav_turu end,
                akademik_yil=case when t.oneri?'akademik_yil' then (t.oneri->>'akademik_yil')::integer else akademik_yil end
                where id=t.hedef_id::uuid returning concat_ws(' · ',sinav_turu,akademik_yil::text) into yeni;
            if found then insert into public.nk_moderasyon_gecmisi(hedef_turu,hedef_id,islem,onceki_durum,yeni_durum,neden,aciklama)
                values('soru',t.hedef_id,'bilgi_duzeltildi',eski,yeni,'yanlis_bilgi',coalesce(nullif(btrim(p_not),''),t.aciklama)); end if;
        elsif t.hedef_turu='nk_ders' then update public.nk_dersler set ders_adi=t.oneri->>'ders_adi',ders_kodu=t.oneri->>'ders_kodu' where id=t.hedef_id::bigint;
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

create or replace function public.admin_soru_duzenle(p_admin_token text,p_id uuid,p_sinav_turu text,p_akademik_yil integer,p_goruntuleme_sirasi integer default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare eski public.sorular; yeni public.sorular; begin
    if not public._admin_token_gecerli_mi(p_admin_token) then return jsonb_build_object('hata','yetkisiz'); end if;
    if p_sinav_turu not in ('vize','final','butunleme','ders_notu','diger')
       or p_akademik_yil not between 2000 and extract(year from now())::integer+1
       or (p_goruntuleme_sirasi is not null and p_goruntuleme_sirasi not between -100000 and 100000) then
        return jsonb_build_object('hata','gecersiz_veri');
    end if;
    select * into eski from public.sorular where id=p_id for update;
    if not found then return jsonb_build_object('hata','bulunamadi'); end if;
    update public.sorular set sinav_turu=p_sinav_turu,akademik_yil=p_akademik_yil,goruntuleme_sirasi=p_goruntuleme_sirasi
        where id=p_id returning * into yeni;
    insert into public.nk_moderasyon_gecmisi(hedef_turu,hedef_id,islem,onceki_durum,yeni_durum,neden,aciklama)
    values('soru',p_id::text,'bilgi_duzenlendi',
        concat_ws(' · ',eski.sinav_turu,eski.akademik_yil::text,coalesce('sıra '||eski.goruntuleme_sirasi::text,'otomatik sıra')),
        concat_ws(' · ',yeni.sinav_turu,yeni.akademik_yil::text,coalesce('sıra '||yeni.goruntuleme_sirasi::text,'otomatik sıra')),
        'yanlis_bilgi','Paylaşım bilgileri yönetici tarafından güncellendi.');
    return jsonb_build_object('basarili',true);
end; $$;
revoke all on function public.admin_soru_duzenle(text,uuid,text,integer,integer) from public;
grant execute on function public.admin_soru_duzenle(text,uuid,text,integer,integer) to anon,authenticated;

create or replace function public.admin_soru_ara(p_admin_token text, p_durum text default null,
    p_arama text default null, p_limit integer default 25, p_offset integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public
as $$
declare l integer := least(greatest(coalesce(p_limit,25),1),100); o integer := greatest(coalesce(p_offset,0),0);
    q text := lower(nullif(btrim(p_arama),'')); sonuc jsonb;
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    with eslesen as (
        select s.id,s.ders_id,d.ders_adi,d.ders_kodu,b.ad bolum_adi,f.ad fakulte_adi,u.email kullanici_email,
            s.kullanici_id,s.sinav_turu,s.akademik_yil,s.goruntuleme_sirasi,s.element_yollari,s.durum,s.olusturulma_tarihi,
            s.moderasyon_nedeni,s.moderasyon_notu,s.moderasyon_tarihi
        from public.sorular s join public.nk_dersler d on d.id=s.ders_id
        join public.bolumler b on b.id=d.bolum_id join public.fakulteler f on f.id=b.fakulte_id
        left join auth.users u on u.id=s.kullanici_id
        where (p_durum is null or p_durum='' or s.durum=p_durum)
          and (q is null or lower(d.ders_adi) like '%'||q||'%' or lower(coalesce(d.ders_kodu,'')) like '%'||q||'%'
               or lower(coalesce(u.email,'')) like '%'||q||'%')
    ), sayfa as (select * from eslesen order by olusturulma_tarihi desc,id limit l offset o)
    select jsonb_build_object('toplam',(select count(*) from eslesen),
        'satirlar',coalesce((select jsonb_agg(to_jsonb(sayfa) order by olusturulma_tarihi desc,id) from sayfa),'[]'::jsonb)) into sonuc;
    return sonuc;
end; $$;
revoke all on function public.admin_soru_ara(text,text,text,integer,integer) from public;
grant execute on function public.admin_soru_ara(text,text,text,integer,integer) to anon, authenticated;

commit;
