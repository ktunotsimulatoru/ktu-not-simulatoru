-- 007 sonrasında uygulanır.
-- Onaylı Not Kutusu sorularına, doğrulanmış üyelerin kimliği açıklanmadan
-- tek bir emoji tepkisi bırakmasını sağlar.
begin;

do $$ begin
    if to_regclass('public.sorular') is null
       or to_regprocedure('public.nk_dogrulanmis_uye(uuid)') is null then
        raise exception 'Önce 001-007 migrationlarını sırasıyla çalıştırın.';
    end if;
end $$;

create table if not exists public.nk_soru_ifadeleri (
    soru_id uuid not null references public.sorular(id) on delete cascade,
    kullanici_id uuid not null references auth.users(id) on delete cascade,
    ifade text not null check (ifade in ('faydali', 'tesekkur', 'zor')),
    olusturulma_tarihi timestamptz not null default now(),
    guncellenme_tarihi timestamptz not null default now(),
    primary key (soru_id, kullanici_id)
);

create index if not exists nk_soru_ifadeleri_kullanici_idx
    on public.nk_soru_ifadeleri(kullanici_id);

alter table public.nk_soru_ifadeleri enable row level security;
revoke all on public.nk_soru_ifadeleri from public, anon, authenticated;

create or replace function public.nk_soru_ifade_ozetleri(p_soru_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    v_kullanici uuid := auth.uid();
    v_sonuc jsonb;
begin
    if not public.nk_dogrulanmis_uye(v_kullanici) then
        raise exception using errcode = '42501', message = 'Doğrulanmış KTÜ üyeliği gerekiyor.';
    end if;
    if p_soru_ids is null or cardinality(p_soru_ids) = 0 then
        return '[]'::jsonb;
    end if;
    if cardinality(p_soru_ids) > 50 then
        raise exception using errcode = '22023', message = 'Bir istekte en fazla 50 soru sorgulanabilir.';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'soru_id', x.soru_id,
        'faydali', x.faydali,
        'tesekkur', x.tesekkur,
        'zor', x.zor,
        'benim_ifadem', x.benim_ifadem
    ) order by x.soru_id), '[]'::jsonb)
    into v_sonuc
    from (
        select s.id as soru_id,
            count(i.*) filter (where i.ifade = 'faydali')::integer as faydali,
            count(i.*) filter (where i.ifade = 'tesekkur')::integer as tesekkur,
            count(i.*) filter (where i.ifade = 'zor')::integer as zor,
            max(i.ifade) filter (where i.kullanici_id = v_kullanici) as benim_ifadem
        from public.sorular s
        left join public.nk_soru_ifadeleri i on i.soru_id = s.id
        where s.id = any(p_soru_ids) and s.durum = 'onaylandi'
        group by s.id
    ) x;
    return v_sonuc;
end;
$$;

create or replace function public.nk_soru_ifade_ayarla(p_soru_id uuid, p_ifade text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_kullanici uuid := auth.uid();
    v_ifade text := lower(trim(coalesce(p_ifade, '')));
    v_sahip uuid;
    v_durum text;
    v_mevcut text;
    v_sonuc jsonb;
begin
    if not public.nk_dogrulanmis_uye(v_kullanici) then
        return jsonb_build_object('basarili', false, 'hata', 'uyelik_gerekli');
    end if;
    if v_ifade not in ('faydali', 'tesekkur', 'zor') then
        return jsonb_build_object('basarili', false, 'hata', 'gecersiz_ifade');
    end if;

    select kullanici_id, durum into v_sahip, v_durum
    from public.sorular where id = p_soru_id
    for update;
    if not found or v_durum <> 'onaylandi' then
        return jsonb_build_object('basarili', false, 'hata', 'soru_kapali');
    end if;
    if v_sahip = v_kullanici then
        return jsonb_build_object('basarili', false, 'hata', 'kendi_icerigin');
    end if;

    select ifade into v_mevcut from public.nk_soru_ifadeleri
    where soru_id = p_soru_id and kullanici_id = v_kullanici;
    if v_mevcut = v_ifade then
        delete from public.nk_soru_ifadeleri
        where soru_id = p_soru_id and kullanici_id = v_kullanici;
        v_ifade := null;
    else
        insert into public.nk_soru_ifadeleri(soru_id, kullanici_id, ifade)
        values (p_soru_id, v_kullanici, v_ifade)
        on conflict (soru_id, kullanici_id) do update
        set ifade = excluded.ifade, guncellenme_tarihi = now();
    end if;

    select jsonb_build_object(
        'basarili', true,
        'soru_id', p_soru_id,
        'faydali', count(*) filter (where ifade = 'faydali')::integer,
        'tesekkur', count(*) filter (where ifade = 'tesekkur')::integer,
        'zor', count(*) filter (where ifade = 'zor')::integer,
        'benim_ifadem', v_ifade
    ) into v_sonuc
    from public.nk_soru_ifadeleri where soru_id = p_soru_id;
    return v_sonuc;
end;
$$;

revoke all on function public.nk_soru_ifade_ozetleri(uuid[]) from public, anon;
revoke all on function public.nk_soru_ifade_ayarla(uuid, text) from public, anon;
grant execute on function public.nk_soru_ifade_ozetleri(uuid[]) to authenticated;
grant execute on function public.nk_soru_ifade_ayarla(uuid, text) to authenticated;

commit;
notify pgrst, 'reload schema';

select
    to_regclass('public.nk_soru_ifadeleri') is not null as ifade_tablosu_hazir,
    to_regprocedure('public.nk_soru_ifade_ayarla(uuid,text)') is not null as ifade_rpc_hazir,
    to_regprocedure('public.nk_soru_ifade_ozetleri(uuid[])') is not null as ozet_rpc_hazir;
