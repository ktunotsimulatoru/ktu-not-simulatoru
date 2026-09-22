# Zararlı dosya güvenliği ve olay yönetimi

## Koruma akışı

1. Worker kullanıcı oturumunu, KTÜ öğrenci e-postasını, dosya türünü, gerçek dosya imzasını ve 3,5 MB sınırını doğrular.
2. Dosyanın SHA-256 özeti çıkarılır ve ham içerik yapılandırılmış tarama hizmetine gönderilir.
3. Yalnızca kesin `clean` sonucu alan dosya için kota rezervasyonu açılır ve R2'ye yazılır.
4. Birincil Cloudmersive hizmeti kota (`429`), zaman aşımı, ağ veya geçici sunucu hatası verirse yapılandırılmış Scanii yedeği denenir. İki hizmet de kesin sonuç üretemezse yükleme `503` ile kapanır ve dosya R2'ye yazılmaz.
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
- Scanii yedeği için `MALWARE_SCAN_FALLBACK_PROVIDER=scanii`, `MALWARE_SCAN_FALLBACK_KEY` ve `MALWARE_SCAN_FALLBACK_SECRET` Worker secret'ları bulunmalıdır. Anahtar ve secret, Scanii hesabındaki API credentials bölümünden alınır. Kod sabit olarak Dublin/İrlanda `api-eu1.scanii.com` bölgesini kullanır.
- Tarama uç noktası ham istek gövdesini kabul etmeli ve `Authorization: Bearer`, `Content-Type`, `X-Content-SHA256` başlıklarını doğrulamalıdır.
- Yanıt JSON biçiminde `verdict` alanıyla `clean`, `malicious` veya `suspicious` döndürmelidir. İsteğe bağlı alanlar: `engine`, `signature`, `scan_id`.
- Gerçek sağlayıcının adı, veri merkezi, saklama süresi ve koşulları gizlilik politikasına eklenmeden canlı yükleme açılmamalıdır.
- Temiz bir JPG/PDF, EICAR test dosyası ve tarayıcı kesintisi senaryosu deneme hesabıyla doğrulanmalıdır. EICAR gerçek zararlı yazılım değildir fakat yalnızca kontrollü testte kullanılmalıdır.

## Sağlayıcı geçiş kuralları

- Cloudmersive temiz veya zararlı karar verdiyse Scanii çağrılmaz.
- Cloudmersive `408`, `425`, `429`, `5xx`, ağ hatası veya zaman aşımı verdiğinde Scanii çağrılır.
- Cloudmersive `401`/`403` gibi kalıcı kimlik ya da yapılandırma hatası verdiğinde yedeğe geçilmez; yanlış anahtarın gizlenmemesi için yükleme kapalı kalır.
- Scanii sonucu da yalnızca kesin temiz kararda depolamaya izin verir. Her bulgu zararlı karar olarak ele alınır ve mevcut hesap inceleme sürecini başlatır.
- Worker logunda yedek kullanımında yalnızca sağlayıcı adlarıyla `malware_scan_failover` olayı oluşur; dosya, kullanıcı bilgisi veya dosya özeti loglanmaz.

## Scanii yedeğini canlıya alma

1. [Scanii](https://scanii.com/signup) hesabı açın ve API key/secret oluşturun. API anahtarında malware detection açık olmalı; başka içerik filtreleri açılırsa onların bulguları da güvenli tarafta kalmak için zararlı karar sayılır. İlk denemeler için ücretsiz kredi verir; kesintisiz üretim yedeği için kullanımınıza uygun ücretli kapasite gerekir.
2. Proje kökünden aşağıdaki komutları çalıştırıp değerleri etkileşimli olarak girin:

```powershell
Set-Location -LiteralPath '.\worker'
npx wrangler secret put MALWARE_SCAN_FALLBACK_PROVIDER
npx wrangler secret put MALWARE_SCAN_FALLBACK_KEY
npx wrangler secret put MALWARE_SCAN_FALLBACK_SECRET
npx wrangler deploy
```

İlk komutun değeri tam olarak `scanii` olmalıdır. Anahtarları komut satırına eklemeyin ve Git'e kaydetmeyin.

3. Önce normal temiz dosya yükleyerek Cloudmersive yolunu doğrulayın. Yedek yolu kontrollü biçimde doğrulamak için üretim anahtarını bozmayın; test Worker'ında Cloudmersive kota yanıtı veya EICAR test örneği kullanın. Canlı loglarda `malware_scan_failover` yalnızca gerçek geçiş olduğunda görünür.

Scanii, dosya içeriğini seçilen bölgede yalnızca analiz süresince tuttuğunu ve analiz tamamlandığında sildiğini; sonuç metadatasını ise hesap planına göre sakladığını belirtir. Sağlayıcı koşulları ve veri işleme sözleşmesi üretime geçmeden önce hesap sahibi tarafından kabul edilmelidir.

## Sağlayıcı kapasitesi

Site ve Worker dosya başına en fazla 3,5 MB (3.500.000 bayt) kabul eder. Bu sınır Cloudmersive'ın ücretsiz katmanındaki yayımlanmış dosya boyutu sınırıyla uyumludur; iki sağlayıcının kredileri ayrıca izlenmelidir. Her iki kapasite de biter veya tarama tamamlanamazsa sistem dosyayı depolamaz.
