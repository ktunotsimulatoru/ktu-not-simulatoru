# Dosya düzeni ve çalışma mantığı

## Üç ayrı yayın hedefi

1. **Site:** HTML, CSS, tarayıcı JavaScript'i, görsel ve fontlar. `src` ve `public` kaynaklarından `dist` üretilir. Siteye yalnızca `dist` içeriği gönderilir.
2. **Worker:** Dosya yükleme/okuma sunucusu. `worker/worker.js` ve `worker/wrangler.toml` Cloudflare Workers içindir. Site dosyalarına katılmaz. Yerel `.wrangler` araç önbelleği korunur ama paketlenmez.
3. **Veritabanı:** `migrations` altındaki SQL değişiklikleri Supabase içindir. Web sunucusuna yüklenmez ve her site yayınında yeniden çalıştırılmaz.
4. **Supabase Edge Functions:** `supabase/functions` altındaki sunucu kodları Supabase CLI ile ayrıca yayımlanır. `send-email`, Resend ve Brevo arasında Auth e-posta failover'ını yürütür; statik site paketine girmez.

## Hangi dosyayı düzenlemeliyim?

| Yapılacak değişiklik | Kaynak |
| --- | --- |
| Sayfaya özel başlık, SEO ve dış iskelet | `src/pages/*.html` |
| Ortak hesaplama formları | `src/templates/calculators.html` |
| Ortak SSS, pencereler, oyun alanı ve altbilgi | `src/templates/calculator-tail.html` |
| Hesaplama kuralları | `src/scripts/modules/calculation-core.mjs` |
| Form akışları ve doğrulama | `calculator-page.mjs`, `calculator-ui.mjs`, `validation.mjs` |
| Birleşik ANO/AGNO hesabı ve kayıtlı dönemler | `src/scripts/modules/gpa-core.mjs`, `src/scripts/modules/gpa.mjs` |
| Profil, kullanıcı adı, kayıtlar ve düzeltme talepleri | `src/pages/profil.html`, `src/scripts/modules/account.mjs`, `migrations/005_genel_kullanici_adi.sql`, `migrations/006_profil_duzeltme_talepleri.sql`, `migrations/009_profil_ve_duyuru_tercihleri.sql` |
| Duyurular ve hesaba bağlı kapatma tercihi | `src/scripts/modules/announcements.mjs`, `migrations/009_profil_ve_duyuru_tercihleri.sql` |
| İstemci hata kaydı | `src/scripts/modules/error-monitor.mjs`, `migrations/004_gano_donemler_isletim.sql` |
| Pencere klavye/odak erişilebilirliği | `src/scripts/modal-accessibility.js` |
| Üyelik, oyun, anket ve istatistik | `src/scripts/modules/account.mjs`, `game.mjs`, `surveys.mjs`, `statistics.mjs` |
| Ders verileri ve dosya görüntüleme | `src/scripts/modules/courses.mjs`, `gallery.mjs` |
| Supabase bağlantısı | `src/scripts/modules/api.mjs` |
| Not Kutusu ekranı, paylaşım türleri, tepkiler ve zararlı dosya incelemesi | `src/scripts/not-kutusu.js`, `worker/worker.js`, `migrations/008_soru_emoji_tepkileri.sql`, `migrations/010_admin_istatistik_ve_not_kutusu_genisletme.sql`, `migrations/011_zararli_dosya_karantinasi.sql` |
| Özel dosya erişimi ve oturum temizliği | `src/scripts/dosya-erisim.js` |
| Yönetici depolama taraması | `src/scripts/admin-storage.js` |
| Ortak dosya yolu güvenliği | `src/scripts/dosya-guvenligi.js` |
| Ders kodu standardı | `src/scripts/course-code.js`, `migrations/003_arsiv_moderasyon.sql` |
| Genel görünüm | `src/styles/style.css` |
| Admin ve gizlilik görünümü | `src/styles/admin.css`, `src/styles/privacy.css` |
| Bildirimsel HTML olayları | `src/scripts/event-bindings.js` |
| CSP ortak kaynağı | `tools/security-config.cjs` |
| Statik HTTP güvenlik başlıkları | `public/_headers` |
| Logo, favicon, font | `public/` |
| Alan adı ve arama motoru dosyaları | `public/CNAME`, `public/robots.txt`, `public/sitemap.xml` |
| Dosya yükleme sunucusu | `worker/worker.js` |
| Yeni veritabanı değişikliği | Uygulanmış en son migration'dan sonra sıradaki numarayla yeni dosya |

`dist` ve `release` otomatik çıktıdır. Bu klasörlerde elle yapılan değişiklikler bir sonraki derlemede kaybolur. `.min.js` / `.min.css` dosyalarının ikinci bir kaynak kopyası tutulmaz.

## Neden public dosyaları kendi altında assets diye ayrılmadı?

Mevcut sayfalar `logo.png`, `fonts/...`, `script.min.js` gibi yollar kullanıyor. Derleme bunları yayın kökünde korur; adres değişikliği nedeniyle eski linkler bozulmaz. Kaynak klasöründeki yerleşim ile tarayıcının gördüğü URL aynı olmak zorunda değildir.

Eski ve yeni not sistemi PDF'leri uygulama içinde linklenmiyordu; kaynak belge olarak `docs/reference` altına alındı. Varsayılan web paketine girmezler. İleride indirme bağlantısı sunulacaksa ilgili PDF `public` altında tutulmalı ve sayfadan bağlanmalıdır.

## Neleri sildik, neleri koruduk?

- Yedi eski favicon/tema/ana sayfa karşılaştırma ekran görüntüsü kaldırıldı.
- Birebir aynı iki Worker'dan kökteki kopya kaldırıldı; asıl dosya `worker/worker.js`.
- Kökteki üç minify çıktısı kaldırıldı; artık yalnızca `dist` içinde üretiliyor.
- Eski SQL kurulumları `docs/archive/sql`, tanılama sorguları `docs/diagnostics` altında korundu. Bunlar kurulum geçmişidir; topluca çalıştırılacak yeni bir kurulum paketi değildir.
- KTÜ arka plan logoları gizlilik sayfasındaki gömülü CSS tarafından kullanıldığı için korundu.
- `node_modules` geliştirme bağımlılıklarıdır. Silinirse `npm ci` ile yeniden kurulur; şu anda test ve derleme için bırakıldı, yayın paketine girmez.
- Uygulanmış SQL migration'ları silinmez veya yeniden yazılmaz. Bir sonraki değişiklik yeni numaralı dosya olur.

Taşıma ve silme listeleri `dosya-tasima-kaydi.json` ve `silinen-dosyalar.json` dosyalarında. Silme kaydı eski dosyaların boyutunu ve SHA-256 özetini içerir; dosyaların yedeği değildir.

## Komutlar

```sh
npm ci
npm run check
npm run preview
npm run package
```

- `check`: otomatik testleri çalıştırır, siteyi üretir, script sözdizimini ve yerel dosya bağlantılarını kontrol eder.
- `preview`: güncel derlemeyi `http://127.0.0.1:4173` üzerinde açılabilir hâle getirir. Sahte Supabase yanıtları kullanır; gerçek hesap/yükleme testi değildir. Canlıya veri yazmaz.
- `package`: kontrollerden sonra `release/site.zip` ve `release/worker.zip` üretir. Paketleme komutu PowerShell 7 (`pwsh`) gerektirir; bu Windows çalışma ortamında kullanılabilir.
- `build`: sadece siteyi derler. Geliştirme kodları, SQL, belgeler, Worker ve bağımlılıklar site paketine alınmaz.

`site.zip` açıldığında `index.html` doğrudan yayın kökünde olmalı; fazladan `dist` klasörü içine yüklenmemeli. `worker.zip` yalnızca Worker kodu ve yapılandırmasını içerir; sırlar ve `.wrangler` dışarıda kalır. Paket oluşturmak yayın yapmak değildir.

## Modül ve şablon mantığı

`app.mjs` giriş noktasıdır. Modüller açık ES import/export bağlantıları kullanır; esbuild bunları mevcut `script.min.js` adresine tek paket olarak derler. Birleşik ANO/AGNO hesaplama çekirdeği DOM veya Supabase olmadan test edilir. Paylaşılan oturumun tek sahibi account modülüdür; profil ve oyun aynı genel kullanıcı adını kullanır. AGNO hesabı giriş gerektirmez; yalnızca kullanıcının açıkça seçtiği dönem kaydı oturum ve veritabanı kullanır.

HTML olayları `data-nk-*` öznitelikleriyle tanımlanır ve `event-bindings.js` içindeki sabit izin listesi üzerinden çalışır. Mevcut modüllerin dış API'si `app.mjs` tarafından `window` üzerine bağlanır; 4. aşamadaki ihtiyaç halinde yükleme çalışmasında bu geçiş köprüsü modül bazında daraltılacaktır. Yönetici ve gizlilik sayfasının script/style blokları ayrı kaynak dosyalarındadır.

`tools/security-config.cjs`, HTTP başlığı ve HTML meta etiketi için CSP'nin ortak kaynağıdır. `public/_headers` Cloudflare Pages benzeri destekleyen sunucularda tam başlıkları uygular. Mevcut GitHub Pages yayını bu dosyayı yorumlamaz; meta CSP yalnızca HTML içinde desteklenen direktifleri uygular. Ayrıntılar `GUVENLIK_BASLIKLARI_VE_YETKI_DENETIMI.md` içindedir.

Hesaplama sayfalarındaki `{{> calculators active=...}}` ifadesi ortak form şablonunu doğru sekme seçimiyle ekler. Eski dönem ortalaması adresi geriye dönük uyumluluk için birleşik AGNO sekmesini açar. `{{> calculator-tail}}` ortak alt bölümleri ekler. tools/templates.cjs bunları derleme sırasında açar; tarayıcıda şablon indirme veya çalışma zamanı derleyicisi yoktur. Bu yüzden src/pages HTML dosyaları doğrudan açılmaz; npm run preview kullanılır.

Git deposunun ana dalı `main` olarak kurulur. Üretilen `dist` ve `release` Git'e alınmaz; CI bunları temiz bir ortamda kaynaklardan yeniden üretir. `.github/workflows/ci.yml` her push ve pull request için tam `npm run check` denetimini çalıştırır.
