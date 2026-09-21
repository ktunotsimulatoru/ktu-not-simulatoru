-- Mevcut kurulu Not Kutusu için; boş veritabanı kurulumu değildir.
-- Veri silmez. Önce yedek alın ve test projesinde uygulayın.
begin;

-- Dersin kurucusu silinse bile ortak ders ve diğer öğrencilerin soruları kalır.
alter table public.nk_dersler alter column ekleyen_kullanici_id drop not null;
alter table public.nk_dersler drop constraint if exists nk_dersler_ekleyen_kullanici_id_fkey;
alter table public.nk_dersler add constraint nk_dersler_ekleyen_kullanici_id_fkey
    foreign key (ekleyen_kullanici_id) references auth.users(id) on delete set null;

-- İçinde soru bulunan ders yanlışlıkla topluca silinemez.
alter table public.sorular drop constraint if exists sorular_ders_id_fkey;
alter table public.sorular add constraint sorular_ders_id_fkey
    foreign key (ders_id) references public.nk_dersler(id) on delete restrict;

create or replace function public.nk_ek_yollari_gecerli(p_yollar text[], p_kullanici uuid)
returns boolean language sql immutable
set search_path = pg_catalog
as $$
    select coalesce(array_ndims(p_yollar) = 1
        and cardinality(p_yollar) between 1 and 3
        and p_kullanici is not null
        and not exists (
            select 1 from unnest(p_yollar) as ek(yol)
            where yol is null
                or yol !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
                or split_part(yol, '/', 1) <> p_kullanici::text
        ), false);
$$;

-- NOT VALID mevcut kayıtları silmez veya migrasyonu onlar yüzünden durdurmaz.
-- Yeni INSERT/UPDATE işlemlerinde kural geçerlidir. Eski geçersiz kayıtları
-- düzeltmeden onaylamak da engellenir. Nesnenin R2'de varlığını bu CHECK kanıtlamaz.
alter table public.sorular drop constraint if exists sorular_ek_yolu_guvenli;
alter table public.sorular add constraint sorular_ek_yolu_guvenli
    check (public.nk_ek_yollari_gecerli(element_yollari, kullanici_id)) not valid;

create or replace function public.admin_nk_ders_sil(p_admin_token text, p_id integer)
returns json language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then
        return json_build_object('basarili', false, 'hata', 'yetkisiz');
    end if;
    delete from public.nk_dersler where id = p_id;
    return json_build_object('basarili', true);
exception when foreign_key_violation or restrict_violation then
    return json_build_object('basarili', false, 'hata', 'Bu derste soru var. Önce soruları başka derse taşıyın veya ayrı ayrı silin.');
end;
$$;
commit;

-- Salt okunur geçiş kontrolü. Sonuç varsa kayıtları tek tek inceleyin.
select id, kullanici_id, element_yollari from public.sorular
where not public.nk_ek_yollari_gecerli(element_yollari, kullanici_id);
-- Yukarıdaki sonuç boşaldığında ayrı bir işlem olarak:
-- alter table public.sorular validate constraint sorular_ek_yolu_guvenli;
