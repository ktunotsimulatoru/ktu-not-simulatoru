-- 009 sonrasında uygulanır.
-- Yönetici okuma RPC'lerinin token son-kullanım güncellemesiyle çakışan
-- STABLE işaretini düzeltir; platform özetini ve Not Kutusu genişletmelerini ekler.
begin;

do $$ begin
    if to_regclass('public.sorular') is null
       or to_regclass('public.nk_dosyalar') is null
       or to_regprocedure('public._admin_token_gecerli_mi(text)') is null then
        raise exception 'Önce 001-009 migrationlarını ve temel site şemasını kurun.';
    end if;
end $$;

-- _admin_token_gecerli_mi() yönetici oturumunun son kullanım zamanını günceller.
-- Bu nedenle onu çağıran RPC'ler salt okunur/STABLE olamaz.
alter function public.admin_nk_moderasyon_gecmisi(text,text,text) volatile;
alter function public.admin_nk_ders_ara(text,text,integer,integer,integer) volatile;
alter function public.admin_nk_bildirim_listele(text,text,integer,integer) volatile;
alter function public.admin_duzeltme_talepleri_listele(text,text,integer,integer) volatile;
alter function public.admin_isletim_ozeti(text) volatile;

-- Bir paylaşımda en fazla beş dosya. Yol sahipliği ve uzantı denetimi korunur.
create or replace function public.nk_ek_yollari_gecerli(p_yollar text[], p_kullanici uuid)
returns boolean language sql immutable
set search_path = pg_catalog
as $$
    select coalesce(array_ndims(p_yollar) = 1
        and cardinality(p_yollar) between 1 and 5
        and p_kullanici is not null
        and not exists (
            select 1 from unnest(p_yollar) as ek(yol)
            where yol is null
                or yol !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
                or split_part(yol, '/', 1) <> p_kullanici::text
        ), false);
$$;

alter table public.sorular drop constraint if exists sorular_element_max3;
alter table public.sorular drop constraint if exists sorular_element_max5;
alter table public.sorular add constraint sorular_element_max5
    check (cardinality(element_yollari) between 1 and 5) not valid;

-- Eski kurulumlarda CHECK adı farklı olabildiği için sinav_turu sütununa bağlı
-- tüm eski CHECK'leri bulup kaldır, ardından tek ve açık bir kural kur.
do $$ declare r record; begin
    for r in
        select c.conname
        from pg_constraint c
        where c.conrelid='public.sorular'::regclass and c.contype='c'
          and pg_get_constraintdef(c.oid) ~* 'sinav_turu'
    loop
        execute format('alter table public.sorular drop constraint %I',r.conname);
    end loop;
end $$;
alter table public.sorular add constraint sorular_sinav_turu_check
    check (sinav_turu in ('vize','final','butunleme','ders_notu','diger')) not valid;

-- Kimlik veya içerik döndürmeden yönetim paneline tüm-zamanlar sayaçları verir.
create or replace function public.admin_platform_ozeti(p_admin_token text)
returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, public
as $$
declare sonuc jsonb;
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then raise exception 'yetkisiz'; end if;
    select jsonb_build_object(
        'kayitli_kullanici',(select count(*) from auth.users),
        'kullanici_adi',(select count(*) from public.kullanici_profilleri where kullanici_adi is not null),
        'ders',(select count(*) from public.dersler),
        'ders_verisi',(select count(*) from public.ders_verileri),
        'kayitli_agno_donemi',(select count(*) from public.kayitli_donemler),
        'not_kutusu_dersi',(select count(*) from public.nk_dersler),
        'paylasim',(select count(*) from public.sorular),
        'onayli_paylasim',(select count(*) from public.sorular where durum='onaylandi'),
        'bekleyen_paylasim',(select count(*) from public.sorular where durum='beklemede'),
        'saklanan_dosya',(select count(*) from public.nk_dosyalar where durum not in ('deleted','deleting')),
        'emoji_tepkisi',(select count(*) from public.nk_soru_ifadeleri),
        'acik_bildirim',(select count(*) from public.nk_icerik_bildirimleri where durum='acik'),
        'bekleyen_duzeltme',(select count(*) from public.duzeltme_talepleri where durum='beklemede')
    ) into sonuc;
    return sonuc;
end;
$$;
revoke all on function public.admin_platform_ozeti(text) from public;
grant execute on function public.admin_platform_ozeti(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
