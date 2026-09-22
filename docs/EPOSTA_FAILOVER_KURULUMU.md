# Resend → Brevo e-posta failover kurulumu

Bu proje Supabase Auth'un **Send Email Hook** özelliğini kullanır. Kayıt doğrulama, şifre sıfırlama, e-posta değişikliği ve yeniden doğrulama iletileri önce Resend API'ye gönderilir. Resend günlük/aylık kotası dolduğunda, hız sınırına girdiğinde veya geçici olarak çalışmadığında aynı ileti Brevo API üzerinden gönderilir.

## Geçiş kuralları

Brevo yalnızca şu durumlarda çalışır:

- Resend `daily_quota_exceeded`, `monthly_quota_exceeded` veya `rate_limit_exceeded` döndürürse,
- Resend `500`/`503` benzeri sunucu hatası döndürürse,
- Resend isteği ağ hatası veya zaman aşımıyla tamamlanamazsa.

Resend başarılı yanıt verdiyse Brevo çağrılmaz. Yanlış API anahtarı, doğrulanmamış gönderen alan adı veya bozuk istek gibi kalıcı `4xx` hatalarında da Brevo'ya geçilmez; yapılandırma düzeltilmelidir. Bütün sağlayıcılar başarısız olursa Supabase Auth'a hata döner ve kullanıcıya gönderilmemiş bir kod için başarı gösterilmez.

## Sağlayıcı hazırlığı

1. Resend'de gönderici alan adını doğrulayın ve API anahtarı oluşturun.
2. Brevo'da aynı gönderici adresini/alan adını doğrulayın ve SMTP & API → API Keys bölümünden API anahtarı oluşturun.
3. Önerilen gönderen adresi: `hesap@auth.ktunotsimulatoru.com`. Bu adres kullanılacaksa `auth.ktunotsimulatoru.com` için iki sağlayıcının istediği SPF/DKIM DNS kayıtlarını Cloudflare DNS'e ekleyin. İki sağlayıcının SPF talimatlarını tek bir SPF kaydında birleştirin; aynı alan için iki ayrı SPF TXT kaydı oluşturmayın.

## Supabase CLI kurulumu ve bağlantı

Komutları proje ana klasöründe çalıştırın:

```powershell
cd "C:\Users\mtass\Desktop\ktu-not-simulatoru - not kutusu - codex"
npx supabase login
npx supabase link --project-ref tsfscfgwbmiouptsljyi
```

Önce function'ı yayımlayın:

```powershell
npx supabase functions deploy send-email --no-verify-jwt
```

Supabase Dashboard → Authentication → Hooks → Send Email alanında HTTPS hook formunu açın. URL olarak aşağıdakini kullanın, `v1,whsec_...` biçimindeki secret'ı üretip kopyalayın; secret'lar yüklenene kadar formdaki son oluşturma/etkinleştirme adımını tamamlamayın:

```text
https://tsfscfgwbmiouptsljyi.supabase.co/functions/v1/send-email
```

`supabase/functions/.env.example` dosyasını `.env.local` adıyla kopyalayın ve değerleri yalnız yerel dosyada doldurun:

```powershell
Copy-Item -LiteralPath '.\supabase\functions\.env.example' -Destination '.\supabase\functions\.env.local'
notepad '.\supabase\functions\.env.local'
```

Değerler sırasıyla Resend API anahtarı, Brevo API anahtarı, hook secret'ı, iki sağlayıcıda doğrulanmış gönderen adresi ve `KTÜ Not Simülatörü` olmalıdır. `.env.local` Git tarafından dışlanır; yine de yanlışlıkla paylaşmayın.

Secret'ları uzak projeye gönderip listeyi doğrulayın:

```powershell
npx supabase secrets set --env-file '.\supabase\functions\.env.local'
npx supabase secrets list
```

Listede `RESEND_API_KEY`, `BREVO_API_KEY`, `SEND_EMAIL_HOOK_SECRET`, `EMAIL_FROM_ADDRESS` ve `EMAIL_FROM_NAME` görünmelidir. Ardından Supabase Dashboard'daki Send Email hook formunu kaydedip etkinleştirin. Authentication → Email Provider açık kalmalıdır; Supabase, e-posta sağlayıcısı açık ve hook etkin olduğunda SMTP yerine hook'u kullanır. E-posta sağlayıcısını kapatmak e-posta ile kaydı devre dışı bırakır.

## Kabul testi

1. Yeni bir test hesabı açıp doğrulama kodunun Resend üzerinden geldiğini doğrulayın.
2. Şifre sıfırlama isteği gönderip kodun çalıştığını doğrulayın.
3. Edge Function logunda `provider: "resend"` görülmelidir; e-posta adresi veya kod loglanmaz.
4. Failover testi için canlı Resend anahtarını bozmayın. Geçici bir test ortamında Resend çağrısını `monthly_quota_exceeded` yanıtıyla taklit edin veya ayrı test anahtarı kullanın; logda `provider: "brevo"` ve `failover: true` görülmelidir.
5. Brevo kotası da dolduğunda kayıt/şifre sıfırlama isteği hata vermeli; gönderilmemiş kod başarılı gösterilmemelidir.

## İşletim notları

- Failover ek kapasite sağlar fakat toplam kapasite iki sağlayıcının kullanılabilir kotası kadardır.
- Resend aylık kota hatası açıkça alındığında Brevo'ya otomatik geçilir. Resend'in kullanım sayacını önceden tahmin etmeye gerek yoktur.
- Ağ zaman aşımında Resend isteği kabul etmiş fakat yanıt kaybolmuş olabilir. Resend isteğinde aynı Auth olayı için kararlı bir idempotency anahtarı kullanılır; buna rağmen sağlayıcılar arası geçişte nadiren aynı kod iki kez ulaşabilir. İki ileti de aynı Supabase kodunu içerir.
- Authentication e-postalarını duyuru veya pazarlama gönderimleri için kullanmayın.
