# Dosya yaşam döngüsü ve 2. aşama geçişi

## Uygulanan davranış

Onaylı dosyaları yalnızca e-postası doğrulanmış, engellenmemiş KTÜ öğrenci hesabı okuyabilir. Bekleyen ve reddedilmiş dosyaları sahibi veya mevcut yönetici oturumuyla yönetici okuyabilir. Silinmiş, süresi dolmuş ve soruya bağlanmamış dosyalar okunamaz. Kontrol her istekte Worker ve veritabanında yapılır; dosya adresini bilmek yetmez. Token URL'ye eklenmez, yanıtlar `private, no-store` taşır.

Üye başına **100 MiB (arayüzde MB), 100 dosya, kayan son 24 saatte 30 yükleme** sınırı vardır. Dosya başına 3,5 MB (3.500.000 bayt) ve paylaşım başına en fazla 5 farklı ek korunur. Başarısız/iptal edilmiş rezervasyonlar günlük sayaca dahildir; silip tekrar yükleyerek günlük sınır aşılamaz. Eski dosyalar ve eski sahipsiz dosya temizliği günlük yeni yükleme sayılmaz. Kota değerlerinin tek kaynağı `nk_dosya_ayarlari` tablosudur.

Akış: dosya içeriği ve JWT kontrolü → harici zararlı yazılım taraması → yalnızca kesin `clean` sonucunda kullanıcıya özel veritabanı kilidiyle kota rezervasyonu → R2 PUT ve HEAD doğrulaması → `ready` kaydı → paylaşım INSERT tetikleyicisiyle tek paylaşıma bağlama (`attached`). Tarama yapılandırılmamışsa, zaman aşımına uğrarsa veya belirsiz sonuç verirse dosya R2'ye yazılmadan yükleme reddedilir. Tarayıcı veritabanına sahte dosya yolu yazarak bu süreci atlayamaz. Nesnenin boyutu, MIME türü ve ETag bilgisi kaydedilir; sonraki okumada eşleşmeyen nesne servis edilmez.

Dosyalar 1 saat içinde soruya bağlanmazsa temizliğe alınır. İstemci hata aldığında önceden yüklenen ekler için iptal ister; yanıtı kaybolmuş başarılı soru kaydının bağlı ekleri iptal edilmez. İptal isteği de başarısız olursa süre sonu temizliği devreye girer.

Soru silindiğinde (hesap silinmesinin cascade etkisi dahil) tetikleyici ekleri `deleting` durumuna geçirir. Dosya erişimi anında kapanır. Worker cron'u 10 dakikada bir en fazla 20 kaydı işler. R2 silme ve veritabanı onayı yeniden denenebilir. Fiziksel silme onaylanana kadar alan kotası serbest bırakılmaz. Kuyruk birikirse temizlik birden fazla cron turu sürer.

Silinen kayıtlar yeniden kullanımını engellemek için tutulur. Yeni oluşturulmuş kayıtların ilk 7 gününde günlük tekrar silme kontrolü, gecikmiş bir PUT'un geride nesne bırakmasını giderir. Sonrasında tombstone kaydı kalır, günlük kontrol sona erer.

## Eski kayıtlar

Migration mevcut soruları veya R2 dosyalarını silmez. Geçerli ve tek bir soruya ait yollar `legacy` olarak kayda alınır. İlk yetkili görüntülemede gerçek dosyanın boyutu, içerik imzası, MIME ve ETag bilgisi kontrol edilir; uygun dosya `attached` olur. Doğrulanana kadar eski dosya kotada ihtiyatlı olarak 3,5 MB sayılır. Çok eski eki olan kullanıcı, ekleri doğrulanana kadar kota dolu görebilir.

Birden fazla soruda kullanılan, bozuk veya sahiplikle uyuşmayan yollar migration sonundaki raporda çıkar. Bunlar otomatik sahiplenilmez/silinmez; erişime açılmadan önce ayrıca düzeltilmelidir. Kaydı var ama R2 nesnesi yoksa kullanıcıya dosya bulunamadığı bildirilir.

Yönetici paneli → Not Kutusu → **Dosya depolama kontrolü** ile R2 sayfalar halinde taranır. Tarama salt okunurdur. Hiçbir soruya veya dosya kaydına bağlı olmayan, yolu geçerli ve en az 24 saatlik nesneler için ayrı temizleme düğmesi çıkar. Yönetici onayında ilişkiler sunucuda tekrar kontrol edilir; uygunsa dosya cron kuyruğuna alınır. Bozuk yollu veya 3,5 MB üstü eski nesneler raporda kalır ve otomatik silinmez.

## Canlıya geçiş — henüz uygulanmadı

Bu değişiklik site, Worker ve veritabanının birlikte güncellenmesini gerektirir. Yerel testler canlı Supabase yetkileri, R2 ayarları veya cron çalıştığını kanıtlamaz.

1. Supabase yedeğini ve mevcut site/Worker sürümünü saklayın. SQL'i önce test projesinde deneyin. `001_not_kutusu_guvenlik.sql` zaten uygulanmış olmalı; yeniden çalıştırmak gerekmez.
2. R2 bucket'ının **public r2.dev erişimini ve doğrudan public custom domain erişimini kapatın**. Dosyalara tek erişim yolu bu Worker olmalı. Harici açık bucket adresi varsa Worker kontrolü onu korumaz.
3. Worker için Supabase'in legacy **service_role API anahtarını** `SUPABASE_SERVICE_ROLE_KEY` secret adıyla ekleyin. Tarama hizmeti için `MALWARE_SCAN_PROVIDER` ve `MALWARE_SCAN_TOKEN` secret'larını ekleyin. `cloudmersive` seçimi yerleşik adaptörü kullanır. `generic` seçiminde ayrıca ham dosya kabul eden HTTPS adresini `MALWARE_SCAN_URL` olarak ekleyin; bu uç nokta `Authorization: Bearer`, gerçek MIME ve `X-Content-SHA256` almalı, JSON olarak `clean`, `malicious` veya `suspicious` kararı döndürmelidir. Cloudmersive yedeği olarak Scanii kullanıldığında `MALWARE_SCAN_FALLBACK_PROVIDER=scanii`, `MALWARE_SCAN_FALLBACK_KEY` ve `MALWARE_SCAN_FALLBACK_SECRET` eklenir. Anahtarları kaynak dosyaya, `wrangler.toml` vars bölümüne, tarayıcıya veya sohbet mesajına koymayın. Sağlayıcının adı, saklama bölgesi ve koşulları gizlilik metnine yazılmadan canlı dosya yüklemeyi açmayın.
4. Bakım aralığında yeni Worker'ı yayımlayın; migration hazır değilse API güvenli biçimde 503 döner. Ardından Supabase SQL Editor'da yalnızca `migrations/002_dosya_yasam_dongusu.sql` çalıştırın ve sondaki geçiş raporunu inceleyin. Eski açık Worker sürümünü bu aralıkta erişimde bırakmayın.
5. `release/site.zip` içeriğini statik siteye yayımlayın. Bu pakette yeni dosya istemcisi ve yönetici depolama ekranı vardır. Kaynak `src` veya migration dosyalarını siteye yüklemeyin.
6. Cloudflare Worker cron tetikleyicisinin `*/10 * * * *` olarak kurulduğunu ve başarılı çalıştığını kontrol edin. Eski public dosya yanıtlarını tutan CDN önbelleğini temizleyin; eski sürüm tarayıcılara 1 saatlik cache verdiğinden önceden indirilmiş/önbelleğe alınmış kopyalar uzaktan geri alınamaz.
7. Aşağıdaki canlı kabul kontrollerini yapın. Sorun varsa eski herkese açık Worker'a dönmeyin; dosya API'sini kapalı tutup düzeltin. DB migrationını kaldırmak yükleme güvencelerini kaldırır; geri dönüş ayrı planlanmalıdır.

Worker klasöründe kullanılacak komutlar (sır etkileşimli girilir):

```powershell
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put MALWARE_SCAN_PROVIDER
wrangler secret put MALWARE_SCAN_URL
wrangler secret put MALWARE_SCAN_TOKEN
wrangler secret put MALWARE_SCAN_FALLBACK_PROVIDER
wrangler secret put MALWARE_SCAN_FALLBACK_KEY
wrangler secret put MALWARE_SCAN_FALLBACK_SECRET
wrangler deploy
```

`MALWARE_SCAN_PROVIDER=cloudmersive` kullanıldığında `MALWARE_SCAN_URL` komutunu atlayın. `generic` kullanıldığında üç birincil tarama secret'ı da gerekir. Scanii yedeği kullanılmıyorsa üç `MALWARE_SCAN_FALLBACK_*` komutunu atlayın. Ayrıntılı geçiş ve test adımları `docs/ZARARLI_DOSYA_GUVENLIGI.md` içindedir.

`worker.zip` sadece Worker kodu ve wrangler yapılandırmasını taşır; secret'ı içermez. Canlı secret ekleme, migration uygulama veya dağıtım bu çalışma sırasında yapılmadı.

## Canlı kabul kontrolleri

- İki farklı doğrulanmış test hesabı kullanın. A'nın bekleyen dosyasını A ve yönetici açabilmeli, B açamamalı. Onay sonrasında B açabilmeli. Oturumsuz doğrudan URL 401 vermeli.
- 1–5 ekli paylaşım yükleyin. `nk_dosyalar` kayıtları `attached` olmalı; altıncı ek reddedilmeli. Bir dosyanın yolunu ikinci paylaşımda kullanma girişimi reddedilmeli.
- Kaydı tamamlanmayan yükleme, süresi dolduktan sonra temizlenmeli. Soru silindikten sonra URL hemen kapanmalı, sonraki cron turlarında R2 nesnesi silinmeli ve kota azalmalı.
- `anon` ve `authenticated` rolleri `nk_dosyalar` tablosunu veya `nk_dosya_islem` RPC'sini doğrudan kullanamamalı. Admin token'ı geçersizken envanter ve bekleyen dosya erişimi reddedilmeli.
- Yönetici envanterini önce okuyun. Bağlı soru eklerinin temizleme adayı olmadığını doğrulayın. Temizlik için yalnızca geri alınmasına gerek olmayan test dosyasını seçin.

## Yerel doğrulama ve dosya haritası

`npm run check`: hesaplama/güvenlik testleri, PGlite üzerinde gerçek migration ve Worker/R2 taklidiyle yaşam döngüsü testleri, istemci temizleme testleri, derleme, sözdizimi ve yayın bağlantıları. PGlite testleri gerçek ağ ve dağıtılmış eşzamanlılık testi değildir; üretim cron kapasitesi ayrıca izlenmelidir.

`npm run preview` sonrasında `/preview-private-files.html`, sahte oturum ve gömülü görsellerle özel görsel yükleme, galeri geçişi ve çıkışta blob temizliğini sınar. Dış ağ bağlantıları engellidir. Test sayfası `tools/fixtures` altında kalır; yayın paketine girmez.

- `migrations/002_dosya_yasam_dongusu.sql`: dosya kaydı, kota, özel RPC, soru tetikleyicisi.
- `worker/worker.js`: üyelik, R2 yazma/okuma, yönetici envanteri, cron temizliği.
- `src/scripts/dosya-erisim.js`: kimlik başlığıyla dosya getirme, blob ve oturum temizliği.
- `src/scripts/not-kutusu.js`: yükleme hatalarında iptal, kota göstergesi.
- `src/scripts/admin-storage.js`: yönetici depolama taraması.

Tasarımda kullanılan resmi kaynaklar: [R2 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [R2 tutarlılık modeli](https://developers.cloudflare.com/r2/reference/consistency/), [Worker scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/), [Supabase fonksiyon yetkileri](https://supabase.com/docs/guides/database/functions).
