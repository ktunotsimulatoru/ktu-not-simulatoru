# Güvenlik başlıkları ve yetki denetimi

Son yerel denetim: **21 Eylül 2026**

## Uygulanan değişiklikler

- HTML içindeki çalıştırılabilir scriptler ve `onclick`, `onchange`, `oninput`, `onkeydown` öznitelikleri kaldırıldı.
- Olaylar `data-nk-*` öznitelikleri ve sabit işlem izin listesi kullanan `event-bindings.js` üzerinden bağlandı.
- Admin ve gizlilik sayfalarının inline script/style blokları ayrı dosyalara çıkarıldı.
- Supabase JS ve Chart.js sürümleri `package-lock.json` ile sabitlendi ve site paketine yerel olarak dahil edildi; tarayıcı artık JavaScript CDN'ine bağlanmıyor.
- `script-src 'self'` kullanan CSP eklendi. Cloudflare Web Analytics için yalnız resmi `beacon.min.js` yolu ayrıca izinlidir; `unsafe-inline` ve `unsafe-eval` script izni yoktur.
- Statik sunucu için `public/_headers`, Worker yanıtları için güvenlik başlıkları eklendi.
- Derleme, inline olay/script/style bloğu veya harici JavaScript görürse durur.

`style-src-attr 'unsafe-inline'` şimdilik korunuyor. Arayüzdeki görünürlük ve konum değişiklikleri hem mevcut `style` özniteliklerini hem de JavaScript `element.style` işlemlerini kullanıyor. Script politikası bundan bağımsız olarak katıdır. Bu stil borcu, bileşen sınıflarına geçiş sırasında ayrıca kaldırılabilir.

## Canlı RLS/RPC bulguları

`npm run audit:live-anon` canlı Supabase Data API'sine yalnızca yayınlanmış anonim anahtarla, satır gövdelerini kaydetmeden istek yapar. 21 Eylül 2026 denetiminde:

- `sorular` ve `kullanici_profilleri` anonim çağrıda sıfır satır döndürdü.
- Anket/hesaplama/sayfa görüntüleme günlükleri anonim çağrıyı `401` ile reddetti.
- Herkese açık fakülte, bölüm, ders, duyuru ve anket katalogları okunabildi.
- Dosya, AGNO, katkı sahipliği ve düzeltme talebi tabloları anonim çağrıyı `401` ile reddetti.
- Denenen yönetici RPC'leri; arşiv, işletim özeti ve düzeltme taleplerinde geçersiz yönetici tokenını reddetti.
- 002, 004 ve 006 ile kurulan tabloların/RPC'lerin canlı varlığı doğrulandı.

Sonuç özeti [canli-anon-denetimi-sonuc.json](diagnostics/canli-anon-denetimi-sonuc.json) içindedir. Bu tarama anonim sınırı doğrular; giriş yapmış kullanıcı, yönetici ve `service_role` yetkilerini kanıtlamaz.

Tam katalog denetimi için Supabase SQL Editor'da [canli-rls-rpc-denetimi.sql](diagnostics/canli-rls-rpc-denetimi.sql) çalıştırılmalıdır. İlk sorguda Data API'ye açık olup RLS'si kapalı tablo bulunmamalı; `SECURITY DEFINER` işlevlerde sabit `search_path` ve yalnızca gereken rollerde `EXECUTE` olmalıdır. 002 dağıtıldıktan sonra dosya denetimindeki beş özel kontrolün tamamı `true` dönmelidir.

## Canlı HTTP başlık durumu

21 Eylül 2026 tarihinde `https://www.ktunotsimulatoru.com/` yanıtı `Server: GitHub.com` döndürdü ve CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP ile çerçeveleme korumasını içermedi.

Her üretilen HTML sayfasına meta CSP eklenir; bu, GitHub Pages üzerinde script ve kaynak yükleme politikasını hemen uygulanabilir kılar. Meta CSP `frame-ancestors` direktifini ve HTTP'ye özgü diğer başlıkları uygulayamaz. Tam koruma için site çıktısı `_headers` dosyasını destekleyen Cloudflare Pages gibi bir statik sunucuya taşınmalı veya alan adının önündeki proxy aynı başlıkları eklemelidir.

`public/_headers` şu korumaları hazırlar:

- katı CSP ve `frame-ancestors 'none'`
- bir yıllık HSTS
- `nosniff`, `DENY`, `strict-origin-when-cross-origin`
- kamera, mikrofon, konum, ödeme ve USB kapalı Permissions Policy
- COOP/CORP ve admin sayfası için `no-store` / `noindex`

Dağıtımdan sonra aşağıdaki kontrol tekrarlanmalıdır:

```powershell
curl.exe -I https://www.ktunotsimulatoru.com/
npm run audit:live-anon
```

## Canlıya geçiş sırası

1. Salt okunur tam RLS/RPC tanılama sorgusunu çalıştırın; beklenmeyen grant veya policy varsa yayını durdurun.
2. Worker sırlarını/yapılandırmasını doğrulayıp güncel `worker/worker.js` dosyasını dağıtın.
3. Güncel site paketini dağıtın. Tam HTTP başlıkları için `_headers` destekleyen sunucu veya proxy kullanın.
4. Anonim denetimi, giriş yapmış KTÜ üyesi kabul testi, sahip/yönetici bekleyen dosya testi ve HTTP başlık kontrolünü tekrarlayın.
