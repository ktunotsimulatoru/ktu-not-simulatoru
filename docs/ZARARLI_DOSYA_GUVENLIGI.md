# Zararlı dosya güvenliği ve olay yönetimi

## Koruma akışı

1. Worker kullanıcı oturumunu, KTÜ öğrenci e-postasını, dosya türünü, gerçek dosya imzasını ve 3,5 MB sınırını doğrular.
2. Dosyanın SHA-256 özeti çıkarılır ve ham içerik yapılandırılmış tarama hizmetine gönderilir.
3. Yalnızca kesin `clean` sonucu alan dosya için kota rezervasyonu açılır ve R2'ye yazılır.
4. Tarama hizmeti yanıt vermez, zaman aşımına uğrar veya anlaşılmayan sonuç döndürürse yükleme `503` ile kapanır. Dosya R2'ye yazılmaz.
5. `malicious` veya `suspicious` sonucunda dosya saklanmaz. Özet, MIME türü, tarama motoru ve imza güvenlik olayı olarak kaydedilir; hesabın paylaşım erişimi hemen `incelemede` durumuna alınır.

Dosya içeriği güvenlik olayları tablosuna yazılmaz. Tarama hizmetine Supabase oturum belirteci, parola veya e-posta gönderilmez.

## Kullanıcı ve yönetici süreci

- İncelemedeki hesap oturum açabilir ve profilini görebilir; böylece itiraz yoluna erişebilir. Yeni Not Kutusu paylaşımı ve üye içerik erişimi kapanır.
- Kullanıcı profilindeki açıklama alanından dosyanın kaynağını ve neden güvenli olduğunu bildirebilir. İtiraz en az 20 karakter olmalıdır.
- Yönetici, admin panelindeki **Zararlı Dosya ve Hesap İncelemeleri** alanında tarama sonucunu, imzayı, olay sayısını ve itirazı görür.
- **Yanlış pozitif** kararı diğer açık veya doğrulanmış olay yoksa hesabı yeniden etkinleştirir.
- **Tespiti doğrula** kararı hesabı `donduruldu` durumuna geçirir. Yönetici karar notu yazmak zorundadır.
- Kullanıcı ek bilgi için `ktunotsimulatoru@gmail.com` adresine ulaşabilir.

## Canlıya alma koşulları

- `migrations/011_zararli_dosya_karantinasi.sql` Supabase SQL Editor'da tek parça olarak ve 010'dan sonra çalıştırılmış olmalıdır.
- Worker'da `MALWARE_SCAN_PROVIDER` ve `MALWARE_SCAN_TOKEN` secret'ları bulunmalıdır. Yerleşik `cloudmersive` seçeneği doğrudan gelişmiş dosya tarama API'sini kullanır. `generic` seçeneğinde `MALWARE_SCAN_URL` da zorunludur. Secret değerleri kaynak koda veya `wrangler.toml` içine yazılmaz.
- Tarama uç noktası ham istek gövdesini kabul etmeli ve `Authorization: Bearer`, `Content-Type`, `X-Content-SHA256` başlıklarını doğrulamalıdır.
- Yanıt JSON biçiminde `verdict` alanıyla `clean`, `malicious` veya `suspicious` döndürmelidir. İsteğe bağlı alanlar: `engine`, `signature`, `scan_id`.
- Gerçek sağlayıcının adı, veri merkezi, saklama süresi ve koşulları gizlilik politikasına eklenmeden canlı yükleme açılmamalıdır.
- Temiz bir JPG/PDF, EICAR test dosyası ve tarayıcı kesintisi senaryosu deneme hesabıyla doğrulanmalıdır. EICAR gerçek zararlı yazılım değildir fakat yalnızca kontrollü testte kullanılmalıdır.

## Sağlayıcı kapasitesi

Site ve Worker dosya başına en fazla 3,5 MB (3.500.000 bayt) kabul eder. Bu sınır Cloudmersive'ın ücretsiz katmanındaki yayımlanmış dosya boyutu sınırıyla uyumludur; aylık çağrı kotası ayrıca izlenmelidir. Kota aşılır veya tarama tamamlanamazsa sistem dosyayı depolamaz.
