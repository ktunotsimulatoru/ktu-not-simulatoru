# Yedek ve geri yükleme tatbikatı

## Yerel tatbikat

`npm run drill:restore`, kişisel veri içermeyen temsili bir PGlite veritabanı oluşturur; kullanıcı, ders, soru, dosya kaydı, moderasyon geçmişi ve kayıtlı dönem verilerini dışarı alıp temiz bir ikinci veritabanına geri yükler. Satır sayıları ile SHA-256 özetlerini ve temsili R2 nesne envanterini karşılaştırır. Sonuç `docs/diagnostics/yedek-geri-yukleme-sonuc.json` dosyasına yazılır.

Bu test uygulama tabloları arasındaki veri bütünlüğünü denetler; gerçek Supabase Auth yedeği, gerçek R2 nesneleri, ağ kesintisi veya üretim boyutundaki geri yükleme süresini sınamaz.

## Canlı tatbikat prosedürü

1. Canlı projeyi değiştirmeden önce Supabase Dashboard'daki Database > Backups bölümünde kullanılabilir geri yükleme noktasını doğrulayın. Ücretsiz planda düzenli mantıksal yedek için Supabase CLI `db dump` kullanın.
2. Veritabanı yedeği R2 nesnelerini içermez. R2 bucket envanterini ayrı alın; nesne anahtarı, boyut, ETag ve son değiştirilme zamanını saklayın.
3. Geri yüklemeyi canlı projenin üzerine ilk deneme olarak yapmayın. Ayrı bir Supabase test projesi ve ayrı bir R2 test bucket'ı kullanın.
4. Şema, roller ve veriyi resmi Supabase CLI yedek/geri yükleme adımlarına göre kurun. Proje sırlarını, Worker bindinglerini ve kimlik doğrulama ayarlarını ayrıca yapılandırın.
5. R2 nesnelerini test bucket'ına kopyalayın. `nk_dosyalar.yol` kayıtlarını bucket anahtarlarıyla karşılaştırın; eksik ve sahipsiz nesneleri raporlayın, otomatik silmeyin.
6. Kullanıcı, kayıtlı dönem, ders, soru, moderasyon geçmişi ve dosya sahipliği satır sayılarını kaynakla karşılaştırın. En az bir üye ve yönetici kabul akışını çalıştırın.
7. Başlangıç/bitiş saatini, veri boyutunu, eksikleri ve elle yapılan işlemleri tatbikat raporuna yazın. Hedef geri yükleme süresi ile kabul edilebilir veri kaybı aralığını sonuçlara göre belirleyin.

Supabase resmi belgeleri, veritabanı yedeğinin Storage/R2 nesnelerini kapsamadığını ve geri yükleme sırasında kesinti olacağını belirtir: https://supabase.com/docs/guides/platform/backups. CLI ile yeni projeye yedek/geri yükleme adımları: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore. Cloudflare R2 nesne listeleri güçlü tutarlıdır: https://developers.cloudflare.com/r2/reference/consistency/.
