-- 008 sonrasında uygulanır.
-- Kullanıcı adı RPC'sini bağımsız ve anlaşılır hatalar döndürecek şekilde
-- sağlamlaştırır; kapatılan duyuruları giriş yapan hesaba bağlar.
begin;

do $$ begin
    if to_regclass('public.kullanici_profilleri') is null then
        raise exception 'kullanici_profilleri temel tablosu bulunamadı; üyelik/oyun profil altyapısını kontrol edin.';
    end if;
    if to_regclass('public.duyurular') is null then
        raise exception 'duyurular tablosu bulunamadı; önce duyuru altyapısını kontrol edin.';
    end if;
end $$;

-- 005 canlıda hiç uygulanmadıysa genel kullanıcı adı sütununu burada onar.
alter table public.kullanici_profilleri
    add column if not exists kullanici_adi text;

update public.kullanici_profilleri
set kullanici_adi = oyun_kullanici_adi
where kullanici_adi is null and oyun_kullanici_adi is not null;

create unique index if not exists kullanici_profilleri_kullanici_adi_lower_idx
    on public.kullanici_profilleri(lower(kullanici_adi))
    where kullanici_adi is not null;

create or replace function public.kullanici_profili_adlarini_esitle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
    if tg_op = 'INSERT' then
        new.kullanici_adi = coalesce(new.kullanici_adi, new.oyun_kullanici_adi);
        new.oyun_kullanici_adi = coalesce(new.oyun_kullanici_adi, new.kullanici_adi);
    elsif new.kullanici_adi is distinct from old.kullanici_adi
          and new.oyun_kullanici_adi is not distinct from old.oyun_kullanici_adi then
        new.oyun_kullanici_adi = new.kullanici_adi;
    elsif new.oyun_kullanici_adi is distinct from old.oyun_kullanici_adi then
        new.kullanici_adi = new.oyun_kullanici_adi;
    end if;
    return new;
end;
$$;

drop trigger if exists kullanici_profili_adlarini_esitle on public.kullanici_profilleri;
create trigger kullanici_profili_adlarini_esitle
before insert or update of kullanici_adi, oyun_kullanici_adi on public.kullanici_profilleri
for each row execute function public.kullanici_profili_adlarini_esitle();

create or replace function public.kullanici_adi_ayarla(p_ad text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_uid uuid := auth.uid();
    v_ad text := trim(coalesce(p_ad, ''));
    v_mevcut text;
    v_normal text;
    v_kelime text;
    v_eski_alinmis boolean := false;
    v_yasakli text[] := array[
        'amk', 'aq', 'yarrak', 'yarak', 'siktir', 'sik', 'pic', 'orospu', 'kahpe',
        'ibne', 'gavat', 'got', 'bok', 'salak', 'gerizekali', 'fuck', 'shit',
        'bitch', 'nigger', 'cunt', 'faggot', 'porn', 'sex', 'amcik', 'surtuk',
        'pezevenk', 'yavsak'
    ];
begin
    if v_uid is null then
        return jsonb_build_object('basarili', false, 'hata', 'giris_gerekli');
    end if;
    if v_ad !~ '^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_]{3,20}$' then
        return jsonb_build_object('basarili', false, 'hata', 'gecersiz_ad');
    end if;

    select kullanici_adi into v_mevcut
    from public.kullanici_profilleri where id = v_uid;
    if v_mevcut is not null and lower(v_mevcut) = lower(v_ad) then
        return jsonb_build_object('basarili', true, 'kullanici_adi', v_mevcut);
    end if;

    v_normal := translate(lower(v_ad), 'çğıöşü', 'cgiosu');
    v_normal := translate(v_normal, '013457', 'oieast');
    v_normal := replace(v_normal, '_', '');
    foreach v_kelime in array v_yasakli loop
        if position(v_kelime in v_normal) > 0 then
            return jsonb_build_object('basarili', false, 'hata', 'yasakli_kelime');
        end if;
    end loop;

    if exists (
        select 1 from public.kullanici_profilleri
        where lower(kullanici_adi) = lower(v_ad) and id <> v_uid
    ) then
        return jsonb_build_object('basarili', false, 'hata', 'ad_alinmis');
    end if;
    if to_regclass('public.ny_kullanicilar') is not null then
        execute 'select exists(select 1 from public.ny_kullanicilar where lower(kullanici_adi) = lower($1))'
        into v_eski_alinmis using v_ad;
    end if;
    if v_eski_alinmis then
        return jsonb_build_object('basarili', false, 'hata', 'ad_alinmis');
    end if;

    insert into public.kullanici_profilleri(id, kullanici_adi, oyun_kullanici_adi, guncelleme_tarihi)
    values(v_uid, v_ad, v_ad, now())
    on conflict(id) do update set
        kullanici_adi = excluded.kullanici_adi,
        oyun_kullanici_adi = excluded.oyun_kullanici_adi,
        guncelleme_tarihi = now();
    return jsonb_build_object('basarili', true, 'kullanici_adi', v_ad);
exception when unique_violation then
    return jsonb_build_object('basarili', false, 'hata', 'ad_alinmis');
end;
$$;

revoke all on function public.kullanici_adi_ayarla(text) from public, anon;
grant execute on function public.kullanici_adi_ayarla(text) to authenticated;

create table if not exists public.kullanici_duyuru_kapatmalari (
    kullanici_id uuid not null references auth.users(id) on delete cascade,
    duyuru_id text not null,
    kapatilma_tarihi timestamptz not null default now(),
    primary key(kullanici_id, duyuru_id)
);
alter table public.kullanici_duyuru_kapatmalari enable row level security;
revoke all on public.kullanici_duyuru_kapatmalari from public, anon, authenticated;

create or replace function public.duyuru_kapat(p_duyuru_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid();
begin
    if v_uid is null then
        return jsonb_build_object('basarili', false, 'hata', 'giris_gerekli');
    end if;
    if nullif(trim(coalesce(p_duyuru_id, '')), '') is null
       or not exists(select 1 from public.duyurular where id::text = p_duyuru_id) then
        return jsonb_build_object('basarili', false, 'hata', 'duyuru_bulunamadi');
    end if;
    insert into public.kullanici_duyuru_kapatmalari(kullanici_id, duyuru_id)
    values(v_uid, p_duyuru_id)
    on conflict(kullanici_id, duyuru_id) do nothing;
    return jsonb_build_object('basarili', true);
end;
$$;

create or replace function public.kapatilan_duyurularim()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select case when auth.uid() is null then '[]'::jsonb else coalesce(
        (select jsonb_agg(k.duyuru_id order by k.kapatilma_tarihi)
         from public.kullanici_duyuru_kapatmalari k where k.kullanici_id = auth.uid()),
        '[]'::jsonb
    ) end
$$;

revoke all on function public.duyuru_kapat(text) from public, anon;
revoke all on function public.kapatilan_duyurularim() from public, anon;
grant execute on function public.duyuru_kapat(text) to authenticated;
grant execute on function public.kapatilan_duyurularim() to authenticated;

commit;
notify pgrst, 'reload schema';

select
    to_regclass('public.kullanici_duyuru_kapatmalari') is not null as duyuru_tercihleri_hazir,
    to_regprocedure('public.kullanici_adi_ayarla(text)') is not null as kullanici_adi_rpc_hazir,
    to_regprocedure('public.duyuru_kapat(text)') is not null as duyuru_kapat_rpc_hazir,
    to_regprocedure('public.kapatilan_duyurularim()') is not null as duyuru_liste_rpc_hazir;
