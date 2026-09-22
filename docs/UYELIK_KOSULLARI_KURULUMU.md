# Üyelik koşulları ve KVKK bildirimi kurulumu

## Amaç

Yeni üyelikte iki ayrı beyan alınır:

1. Kullanıcı, `2026-09-22` sürümlü Kullanım Koşulları'nı kabul eder.
2. Kullanıcı, `2026-09-22` sürümlü KVKK Aydınlatma Metni'ni okuduğunu ve bilgilendirildiğini belirtir. Bu ikinci beyan açık rıza değildir.

Kabul sürümleri ile sunucu zamanı `public.uyelik_kabulleri` tablosuna yazılır. IP adresi ve tarayıcı bilgisi tutulmaz. Mevcut üyeler geriye dönük kabul etmiş sayılmaz ve migration nedeniyle hesapları kilitlenmez.

## Canlıya alma sırası

1. Supabase SQL Editor'da `migrations/013_uyelik_kosullari_kabulu.sql` dosyasını tek parça çalıştırın. Sonuçta şu üç alan `true` olmalıdır:

   - `kabul_tablosu_hazir`
   - `auth_hook_hazir`
   - `kabul_trigger_hazir`

2. Güncel siteyi yayımlayın. Kayıt formunda iki ayrı kutu ve iki metin bağlantısı görünmelidir.

3. Supabase Dashboard → **Authentication → Hooks → Before User Created** bölümünü açın. Hook türü olarak **Postgres Function**, işlev olarak `public.uyelik_kosullari_kontrol` seçip etkinleştirin.

Hook'u güncel kayıt formu yayımlanmadan önce etkinleştirmeyin; eski form gerekli sürüm bilgisini göndermediği için yeni kayıtlar güvenli biçimde reddedilir.

## Kabul testi

- Kutulardan biri seçilmeden form gönderilememelidir.
- İki kutu seçildiğinde doğrulama e-postası gönderilmelidir.
- Yeni kullanıcıdan sonra SQL Editor'da aşağıdaki sorgu bir satır döndürmelidir:

```sql
select kullanici_id, kullanim_kosullari_surumu, kvkk_aydinlatma_surumu, kabul_tarihi
from public.uyelik_kabulleri
order by kabul_tarihi desc
limit 5;
```

- Hook etkinken gerekli metadata olmadan doğrudan Auth API kaydı `403` ile reddedilmelidir.
- `anon` ve `authenticated` rolleri kabul tablosunu doğrudan okuyamamalıdır.

Önemli bir sözleşme değişikliğinde yeni bir sürüm değeri kullanılmalı ve mevcut kullanıcılardan yeniden kabul alınması ayrı bir migration ve kullanıcı akışıyla eklenmelidir. Eski sürüm satırları yeni sürüm kabul edilmiş gibi güncellenmemelidir.
