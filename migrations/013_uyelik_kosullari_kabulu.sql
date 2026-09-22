-- 012 sonrasında uygulanır: yeni üyeliklerde kullanım koşulları kabulünü ve
-- KVKK aydınlatma bildiriminin alındığını sürümlü, sunucu zamanlı kaydeder.
-- Mevcut üyeler geriye dönük kabul etmiş sayılmaz ve bu migration onları kilitlemez.
begin;

create table if not exists public.uyelik_kabulleri (
    kullanici_id uuid primary key references auth.users(id) on delete cascade,
    kullanim_kosullari_surumu text not null check (char_length(kullanim_kosullari_surumu) between 1 and 40),
    kvkk_aydinlatma_surumu text not null check (char_length(kvkk_aydinlatma_surumu) between 1 and 40),
    kabul_tarihi timestamptz not null default now()
);

comment on table public.uyelik_kabulleri is
    'Yeni üyelikte kullanım koşulları kabulü ile KVKK aydınlatma bildiriminin sürüm ve sunucu zamanı.';

alter table public.uyelik_kabulleri enable row level security;
revoke all on table public.uyelik_kabulleri from public, anon, authenticated;

-- Dashboard > Authentication > Hooks > Before User Created altında bu işlev
-- etkinleştirilir. Hook etkin değilse istemci kontrolü devam eder; ancak doğrudan
-- Auth API çağrılarını sunucuda engellemek için hook mutlaka açılmalıdır.
create or replace function public.uyelik_kosullari_kontrol(event jsonb)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
declare
    v_email text := lower(coalesce(event->'user'->>'email', ''));
    v_meta jsonb := coalesce(event->'user'->'user_metadata', '{}'::jsonb);
begin
    if v_email !~ '^[^@[:space:]]+@ogr[.]ktu[.]edu[.]tr$' then
        return jsonb_build_object('error', jsonb_build_object(
            'http_code', 403,
            'message', 'Yalnızca KTÜ öğrenci e-posta adresleriyle kayıt olunabilir.'
        ));
    end if;

    if coalesce(v_meta->>'kullanim_kosullari_kabul', '') <> 'true'
       or coalesce(v_meta->>'kullanim_kosullari_surumu', '') <> '2026-09-22' then
        return jsonb_build_object('error', jsonb_build_object(
            'http_code', 403,
            'message', 'Üyelik için güncel Kullanım Koşulları kabul edilmelidir.'
        ));
    end if;

    if coalesce(v_meta->>'kvkk_aydinlatma_okundu', '') <> 'true'
       or coalesce(v_meta->>'kvkk_aydinlatma_surumu', '') <> '2026-09-22' then
        return jsonb_build_object('error', jsonb_build_object(
            'http_code', 403,
            'message', 'Üyelikten önce KVKK Aydınlatma Metni sunulmalı ve okunduğu bildirilmelidir.'
        ));
    end if;

    return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.uyelik_kosullari_kontrol(jsonb) to supabase_auth_admin;
revoke execute on function public.uyelik_kosullari_kontrol(jsonb) from public, anon, authenticated;

-- Auth kaydı oluştuktan sonra istemciden gelen beyanı değiştirilemez denetim
-- tablosuna sunucu zamanı ile kopyalar. IP adresi ve user-agent saklanmaz.
create or replace function public.yeni_uye_kabulunu_kaydet()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
    if coalesce(v_meta->>'kullanim_kosullari_kabul', '') = 'true'
       and coalesce(v_meta->>'kullanim_kosullari_surumu', '') = '2026-09-22'
       and coalesce(v_meta->>'kvkk_aydinlatma_okundu', '') = 'true'
       and coalesce(v_meta->>'kvkk_aydinlatma_surumu', '') = '2026-09-22' then
        insert into public.uyelik_kabulleri(
            kullanici_id, kullanim_kosullari_surumu, kvkk_aydinlatma_surumu, kabul_tarihi
        ) values (new.id, '2026-09-22', '2026-09-22', now())
        on conflict (kullanici_id) do nothing;
    end if;
    return new;
end;
$$;

revoke execute on function public.yeni_uye_kabulunu_kaydet() from public, anon, authenticated;
drop trigger if exists yeni_uye_kabulunu_kaydet on auth.users;
create trigger yeni_uye_kabulunu_kaydet
after insert on auth.users
for each row execute function public.yeni_uye_kabulunu_kaydet();

notify pgrst, 'reload schema';
commit;

select
    to_regclass('public.uyelik_kabulleri') is not null as kabul_tablosu_hazir,
    to_regprocedure('public.uyelik_kosullari_kontrol(jsonb)') is not null as auth_hook_hazir,
    exists(select 1 from pg_trigger where tgname='yeni_uye_kabulunu_kaydet' and not tgisinternal) as kabul_trigger_hazir;
