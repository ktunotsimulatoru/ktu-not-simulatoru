-- 004 sonrasında uygulanır: oyuna özel profil adını genel site kullanıcı adına taşır.
begin;

alter table public.kullanici_profilleri
    add column if not exists kullanici_adi text;

update public.kullanici_profilleri
set kullanici_adi=oyun_kullanici_adi
where kullanici_adi is null and oyun_kullanici_adi is not null;

create unique index if not exists kullanici_profilleri_kullanici_adi_lower_idx
    on public.kullanici_profilleri(lower(kullanici_adi))
    where kullanici_adi is not null;

create or replace function public.kullanici_profili_adlarini_esitle()
returns trigger language plpgsql set search_path=pg_catalog
as $$
begin
    if tg_op='INSERT' then
        new.kullanici_adi=coalesce(new.kullanici_adi,new.oyun_kullanici_adi);
        new.oyun_kullanici_adi=coalesce(new.oyun_kullanici_adi,new.kullanici_adi);
    elsif new.kullanici_adi is distinct from old.kullanici_adi
          and new.oyun_kullanici_adi is not distinct from old.oyun_kullanici_adi then
        new.oyun_kullanici_adi=new.kullanici_adi;
    elsif new.oyun_kullanici_adi is distinct from old.oyun_kullanici_adi then
        new.kullanici_adi=new.oyun_kullanici_adi;
    end if;
    return new;
end; $$;

drop trigger if exists kullanici_profili_adlarini_esitle on public.kullanici_profilleri;
create trigger kullanici_profili_adlarini_esitle
before insert or update of kullanici_adi,oyun_kullanici_adi on public.kullanici_profilleri
for each row execute function public.kullanici_profili_adlarini_esitle();

create or replace function public.kullanici_adi_ayarla(p_ad text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare sonuc jsonb;
begin
    sonuc:=public.oyun_kullanici_adi_ayarla(p_ad)::jsonb;
    if coalesce((sonuc->>'basarili')::boolean,false) then
        return (sonuc-'oyun_kullanici_adi') || jsonb_build_object('kullanici_adi',sonuc->>'oyun_kullanici_adi');
    end if;
    return sonuc;
end; $$;

revoke all on function public.kullanici_adi_ayarla(text) from public,anon;
grant execute on function public.kullanici_adi_ayarla(text) to authenticated;

commit;
