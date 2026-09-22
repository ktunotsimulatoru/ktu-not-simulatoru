-- 011 sonrasında uygulanır. Dosya başına sınırı Cloudmersive ücretsiz katmanıyla
-- uyumlu 3.500.000 bayta indirir. Mevcut aktif büyük kayıt varsa veri silmez;
-- migration durur ve kaydın yönetici tarafından incelenmesini ister.
begin;

do $$ begin
    if to_regclass('public.nk_dosyalar') is null
       or to_regprocedure('public.nk_dosya_islem(text,jsonb)') is null then
        raise exception 'Önce 001-011 migrationlarını çalıştırın.';
    end if;
    if exists(select 1 from public.nk_dosyalar
              where boyut>3500000 and durum not in ('deleting','deleted')) then
        raise exception '3,5 MB üstünde aktif dosya bulundu. Önce bu kaydı yönetici panelinden inceleyip kaldırın.';
    end if;
end $$;

-- Silme kuyruğundaki eski tombstone kayıtları temizlenebilmek için korunur;
-- okunabilir/yeni dosyalar kesin 3,5 MB sınırındadır.
alter table public.nk_dosyalar drop constraint if exists nk_dosyalar_boyut_check;
alter table public.nk_dosyalar add constraint nk_dosyalar_boyut_check
    check (boyut between 1 and 3500000 or durum in ('deleting','deleted'));

-- Canlıdaki 002 fonksiyonunun iki 5 MiB sabitini, fonksiyonun geri kalanını
-- kopyalamadan güvenli biçimde güncelle. Yeni kurulumda değer zaten 3.500.000'dir.
do $$ declare tanim text; begin
    select pg_get_functiondef('public.nk_dosya_islem(text,jsonb)'::regprocedure) into tanim;
    if position('5242880' in tanim)>0 then
        execute replace(tanim,'5242880','3500000');
    end if;
    select pg_get_functiondef('public.nk_dosya_islem(text,jsonb)'::regprocedure) into tanim;
    if position('5242880' in tanim)>0 or position('3500000' in tanim)=0 then
        raise exception 'Dosya boyutu fonksiyon sınırı güncellenemedi.';
    end if;
end $$;

notify pgrst,'reload schema';
commit;
