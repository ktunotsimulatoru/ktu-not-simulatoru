# KTÜ Not Simülatörü

Statik site + Supabase veritabanı/üyelik + Cloudflare Worker/R2 dosya depolaması.

## Klasörler

```text
src/
  pages/        Düzenlenecek HTML sayfaları
  templates/    Ortak hesaplama HTML parçaları
  scripts/      app.mjs giriş noktası ve modules/ altında ES modülleri
  styles/       Ortak CSS kaynağı
public/         Görseller, fontlar, CNAME, robots ve sitemap
worker/         Cloudflare Worker kodu ve wrangler.toml
migrations/     Sıralı veritabanı değişiklikleri
tests/         Otomatik testler
tools/         Derleme, kontrol, önizleme, paketleme araçları
docs/          Belgeler, kaynak PDF'ler, eski SQL ve tanılama sorguları
dist/          Otomatik üretilen site — elle düzenlenmez
release/       Otomatik üretilen ZIP paketleri
```

## Kullanım

Node.js 22+ gerekir. İlk kurulumda `npm ci` çalıştırın.

| Komut | Sonuç |
| --- | --- |
| `npm run check` | Testler + derleme + sözdizimi + yerel dosya bağlantısı kontrolü |
| `npm run build` | Kaynaklardan güncel `dist/` üretir |
| `npm run preview` | Derler ve `http://127.0.0.1:4173` üzerinde test önizlemesini başlatır |
| `npm run audit:live-anon` | Canlı Supabase'in anonim okuma/RPC sınırlarını satır verisi kaydetmeden denetler |
| `npm run drill:restore` | Temsili veriyi temiz veritabanına geri yükler ve bütünlük raporu üretir |
| `npm run package` | Kontrolleri çalıştırır; `release/site.zip` ve `release/worker.zip` üretir |

Paketleme PowerShell 7 (`pwsh`) gerektirir. Önizleme, Supabase için boş test yanıtları kullanır; canlı veriye yazmaz, gerçek üyelik ve dosya yüklemeyi sınamaz. Durdurmak için Ctrl+C.

## Hangi dosyalar yayınlanır?

- **Statik siteye:** yalnızca `dist/` içeriği veya açılmış `release/site.zip`. `index.html` yayın kökünde bulunmalı.
- **Cloudflare Workers'a:** `worker/worker.js` ve `worker/wrangler.toml` veya `release/worker.zip`. Sırlar paketlerde yoktur; mevcut Worker secret ayarlarında kalır.
- **Supabase'e:** sadece henüz uygulanmamış, gözden geçirilmiş yeni `migrations/*.sql` dosyaları. Site derlemesi SQL çalıştırmaz.

Önceki düzeltmeleri uyguladığınız bilgisi alındı. `001_not_kutusu_guvenlik.sql` geçmiş kaydı olarak korunur; sırf klasörler taşındı diye tekrar çalıştırılması gerekmez. `002_dosya_yasam_dongusu.sql` dosya erişimi ve kota geçişini, `003_arsiv_moderasyon.sql` arşiv/moderasyonu, `004_gano_donemler_isletim.sql` kayıtlı dönemler ile işletim hata özetini, `005_genel_kullanici_adi.sql` mevcut oyun adlarını genel profil kullanıcı adına dönüştürür. `006_profil_duzeltme_talepleri.sql` profil katkı sahipliğini ve moderasyonlu düzeltme taleplerini ekler. `007_canli_yetki_ve_sema_onarimi.sql`, 002 ile 004 birlikte uygulandığında oluşabilen AGNO RLS yetki çakışmasını giderir ve PostgREST şemasını yeniler. `008_soru_emoji_tepkileri.sql`, onaylı sorulara üyelik denetimli emoji tepkilerini ekler. `009_profil_ve_duyuru_tercihleri.sql`, kullanıcı adı kaydını sağlamlaştırır ve kapatılan duyuruları hesaba bağlar. `010_admin_istatistik_ve_not_kutusu_genisletme.sql`, yönetici listeleme hatasını giderir, platform sayaçlarını ekler ve Not Kutusu paylaşım türleri ile beş dosya sınırını etkinleştirir. `011_zararli_dosya_karantinasi.sql`, temiz tarama zorunluluğuna bağlı hesap inceleme, itiraz ve yönetici karar kayıtlarını kurar. Migrationlar sıra numarasıyla ve site yayınından önce uygulanmalıdır.

Zararlı dosya taramasının sağlayıcı sözleşmesi, olay yönetimi ve canlıya alma kontrolü için `docs/ZARARLI_DOSYA_GUVENLIGI.md` dosyasına bakın.

Yayın yolu değişmedi: örneğin `src/pages/index.html`, derlemede `dist/index.html` olur. Kaynaklarda `.min.js` dosyalarını elle oluşturmayın; bunları build üretir. `dist` üzerinde düzenleme yapmayın, bir sonraki build üzerine yazar.

## Belgeler

- [Dosya erişimi, kota ve canlıya geçiş](docs/DOSYA_YASAM_DONGUSU.md)
- [Güvenlik başlıkları ve RLS/RPC denetimi](docs/GUVENLIK_BASLIKLARI_VE_YETKI_DENETIMI.md)
- [Arşiv, ders standardı ve moderasyon](docs/ARSIV_VE_MODERASYON.md)
- [AGNO, kayıtlı dönemler ve işletim](docs/GANO_VE_ISLETIM.md)
- [Yedek ve geri yükleme tatbikatı](docs/YEDEK_GERI_YUKLEME.md)
- [Yayın kontrol listesi](docs/YAYIN_KONTROL_LISTESI.md)

- [Dosya düzeni, silinenler ve çalışma akışı](docs/DOSYA_DUZENI.md)
- [Hesaplama mantığı](docs/HESAPLAMA.md)
- [İnceleme notları ve kalan işler](docs/PROJE_INCELEME_NOTLARI.md)
- [Dosya taşıma kaydı](docs/dosya-tasima-kaydi.json)
- [Silinen dosyaların kayıtları](docs/silinen-dosyalar.json)

Eski SQL'ler `docs/archive/sql/` altında kurulum geçmişidir; topluca çalıştırılmaz. Tanılama sorguları `docs/diagnostics/`, kaynak yönetmelik PDF'leri `docs/reference/` altındadır. Kaynak PDF'ler site içinde linklenmediğinden web paketine dahil edilmez.

`node_modules/`, `dist/`, `release/`, `.wrangler/` ve yerel sırlar `.gitignore` ile dışlanır. `.github/workflows/ci.yml`, GitHub'a gönderilen her değişiklikte Node.js 22 ile `npm ci` ve `npm run check` çalıştırır. CI yalnızca doğrulama ve derleme yapar; site, Worker veya migration dağıtmaz.
