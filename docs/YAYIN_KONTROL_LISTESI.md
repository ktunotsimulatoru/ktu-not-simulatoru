# Yayın kontrol listesi

Bu sürüm özellik bakımından yayın adayıdır. Yeni özellik eklemeden önce aşağıdaki yayın kapıları tamamlanır.

## Yayından önce zorunlu

- [ ] Git için ad/e-posta tanımlanır, ilk commit oluşturulur ve uzak depoya gönderilir.
- [ ] GitHub Actions içindeki `npm run check` işi yeşil görülür.
- [ ] Supabase yedeği alınır ve `docs/diagnostics/canli-rls-rpc-denetimi.sql` SQL Editor'da çalıştırılır.
- [ ] İki doğrulanmış KTÜ test hesabıyla sahiplik testi yapılır: A'nın bekleyen dosyasını A ve yönetici açabilir, B açamaz; onaydan sonra B açabilir.
- [ ] Bir hesapla AGNO dönemi kaydetme, profilden açma, güncelleme ve silme denenir.
- [ ] Ders/ders verisi düzeltme talebi gönderme, yönetici onayı ve ret gerekçesi profilden kontrol edilir.
- [ ] Worker'da `SUPABASE_SERVICE_ROLE_KEY`, R2 binding ve 10 dakikalık cron doğrulanır; yarım yükleme/temizlik işi denenir.
- [ ] Güncel `release/site.zip` ve `release/worker.zip` dağıtılır.

## Barındırma

Tercih edilen hedef `_headers` dosyasını uygulayan Cloudflare Pages benzeri bir statik sunucudur. GitHub Pages meta CSP'yi kullanır ancak HSTS, `frame-ancestors`, `nosniff`, Permissions Policy ve diğer hazırlanan HTTP başlıklarını uygulamaz.

## Yayından hemen sonra

- [ ] Ana sayfa, hesaplama sayfaları, Not Kutusu ve profil masaüstü/mobil açılır.
- [ ] `profil.html` ve `gano-hesaplama.html` 200 döner.
- [ ] Kayıt, giriş, şifre sıfırlama ve çıkış denenir.
- [ ] Dosya yükleme, bekleyen dosya erişimi, onay ve silme denenir.
- [ ] `curl.exe -I https://www.ktunotsimulatoru.com/` ile güvenlik başlıkları kontrol edilir.
- [ ] `npm run audit:live-anon` tekrar çalıştırılır.
- [ ] Supabase ve Worker hata günlükleri ilk 24 saat izlenir.

## Yayın sonrasına bırakılabilecekler

- Moderasyon sonucunda profil içi bildirim.
- Düzeltme talebine kanıt görseli ekleme.
- Birden fazla öğrencinin aynı veriyi doğrulaması ve güven rozeti.
- Kullanım verisine göre arama/filtre ve profil ayrıntılarının geliştirilmesi.
