-- ============================================================
-- NOT KUTUSU (Çıkmış Soru Paylaşım Sistemi) — Kurulum
-- ============================================================
-- Bu dosya "Not Kutusu" özelliği için gereken tabloyu ve RLS
-- politikalarını oluşturur. fakulteler / bolumler / dersler
-- tabloları zaten mevcut ("Ders Verileri" özelliğinden) — onlara
-- hiç dokunulmuyor, sadece foreign key ile referans veriliyor.
--
-- ÖNEMLİ — Supabase Dashboard'da AYRICA elle yapman gerekenler:
--
-- 1) Authentication > Providers > Email: açık olmalı (muhtemelen
--    zaten açık).
--
-- 2) Authentication > Emails: "Confirm signup" ve "Magic Link"
--    şablonlarının içinde {{ .ConfirmationURL }} yerine {{ .Token }}
--    kullanıldığından emin ol. not-kutusu.js, signInWithOtp() +
--    verifyOtp() ile 6 haneli KOD akışı kullanıyor — eğer şablonlar
--    hâlâ link gönderiyorsa, kullanıcı koda değil linke tıklamak
--    zorunda kalır ve doğrulama ekranı çalışmaz.
--
-- 3) Bu dosya, @ogr.ktu.edu.tr DIŞINDAKİ adreslere OTP e-postası
--    gönderilmesini ENGELLEMİYOR — sadece o adreslerin gerçek VERİYE
--    (sorular tablosuna) erişmesini RLS ile engelliyor. Yani biri
--    formu atlatıp kendi Gmail adresine kod gönderilmesini sağlayabilir
--    ama üye olamaz / soru göremez. E-posta gönderimini de baştan
--    engellemek istersen, Authentication > Hooks kısmından bir
--    "Before User Created" (Postgres) hook eklemek gerekir; bu daha
--    fazla kurulum istediği için şimdilik atlandı, istersen sonra
--    ekleriz.
--
-- 4) Fotoğraf depolama (Supabase Storage bucket, RLS'i vb.) henüz bu
--    dosyada YOK — "sonra ayarlarız" dediğin için sorular.fotograf_yolu
--    sütunu şimdilik hep NULL kalacak. Depolamayı nereye koyacağımıza
--    karar verince, bu tabloya dokunmadan sadece storage tarafını
--    ekleyip not-kutusu.js'teki soru paylaşım formunu güncelleyeceğiz.

create table if not exists public.sorular (
    id uuid primary key default gen_random_uuid(),
    -- dersler.id UUID DEĞİL, integer (bys tarafındaki ders id'leriyle aynı) —
    -- ilk sürümde yanlışlıkla uuid yazılmıştı, "incompatible types: uuid and
    -- integer" hatası buradan geliyordu.
    ders_id integer not null references public.dersler(id) on delete cascade,
    kullanici_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    sinav_turu text not null check (sinav_turu in ('vize', 'final', 'butunleme')),
    akademik_yil integer not null check (akademik_yil >= 2015 and akademik_yil <= extract(year from now())::int + 1),
    fotograf_yolu text,                      -- Supabase Storage yolu — depolama sonra bağlanacak, şimdilik NULL
    durum text not null default 'beklemede' check (durum in ('beklemede', 'onaylandi', 'reddedildi')),
    olusturulma_tarihi timestamptz not null default now()
);

create index if not exists sorular_ders_id_idx on public.sorular (ders_id);
create index if not exists sorular_kullanici_id_idx on public.sorular (kullanici_id);
create index if not exists sorular_durum_idx on public.sorular (durum);

alter table public.sorular enable row level security;

-- Oturum açmış kullanıcının JWT'sindeki e-posta @ogr.ktu.edu.tr ile mi bitiyor?
-- (KTÜ öğrenci maili doğrulaması burada, güvenlik sınırı olarak yapılıyor —
-- istemci tarafındaki (not-kutusu.js) domain kontrolü sadece kullanıcı deneyimi içindir.)
create or replace function public.is_ktu_uyesi()
returns boolean
language sql
stable
as $$
    select coalesce((auth.jwt() ->> 'email') ilike '%@ogr.ktu.edu.tr', false);
$$;

drop policy if exists "sorular_select_uye" on public.sorular;
create policy "sorular_select_uye" on public.sorular
    for select
    to authenticated
    using (
        public.is_ktu_uyesi()
        and (durum = 'onaylandi' or kullanici_id = auth.uid())
    );

drop policy if exists "sorular_insert_uye" on public.sorular;
create policy "sorular_insert_uye" on public.sorular
    for insert
    to authenticated
    with check (
        public.is_ktu_uyesi()
        and kullanici_id = auth.uid()
        and durum = 'beklemede'
    );

drop policy if exists "sorular_delete_uye" on public.sorular;
create policy "sorular_delete_uye" on public.sorular
    for delete
    to authenticated
    using (
        kullanici_id = auth.uid() and durum <> 'onaylandi'
    );

-- 'anon' rolüne (misafir / oturumsuz ziyaretçi) hiçbir policy tanımlanmadı,
-- yani RLS sayesinde misafirler bu tabloyu HİÇ okuyamaz/yazamaz.

-- ============================================================
-- Admin onay/red RPC'leri BİLEREK bu dosyaya eklenmedi.
-- Projenin diğer admin_* fonksiyonlarının (admin_ders_onayla vb.)
-- admin_token'ı TAM OLARAK nasıl doğruladığını görmeden aynı desene
-- uymayan/güvensiz bir fonksiyon yazmamak için, önce
-- tani-admin-token-dogrulama.sql dosyasındaki sorguyu çalıştırıp
-- sonucu paylaşman gerekiyor. Ondan sonra admin_soru_listele /
-- admin_soru_onayla / admin_soru_reddet fonksiyonlarını ekleyeceğim
-- ve admin paneline "Not Kutusu Onayları" sekmesini bağlayacağım.
-- ============================================================
