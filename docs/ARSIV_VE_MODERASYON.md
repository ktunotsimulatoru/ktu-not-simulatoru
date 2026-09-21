# Arşiv, ders standardı ve moderasyon

Bu çalışma `migrations/003_arsiv_moderasyon.sql` ile kurulur. Migration, `001` ve `002` sonrasında bir kez Supabase SQL Editor üzerinden uygulanmalıdır. Yeniden çalıştırılabilir; ders veya soru silmez. Dosyanın sonundaki sorgu aynı bölümde aynı standart kodu taşıyan olası dersleri yalnızca raporlar.

## Büyük arşiv akışı

- Fakülte ve bölüm sayaçları `nk_klasor_sayaclari` RPC'sinde hesaplanır. Tarayıcı bütün soru kimliklerini indirmez.
- Ders araması, sıralaması ve sayfalaması `nk_ders_ara` RPC'sinde yapılır. Bir sayfada en fazla 50 kayıt döner; arayüz 24 kayıt ister.
- Seçilen dersteki sorular Supabase `range` ve `count: exact` ile 12'şer yüklenir. Sınav türü ve akademik yıl filtreleri sorguya uygulanır.
- Yönetici soru ve ders tabloları sırasıyla `admin_soru_ara` ve `admin_nk_ders_ara` üzerinden toplam kayıt sayısıyla sayfalanır.

## Ders kodu ve birleştirme

Ders kodu boş bırakılabilir. Doluysa iki ile on harf, iki ile dört rakam ve isteğe bağlı son harften oluşmalıdır. Boşluk, tire ve nokta kaldırılır; Türkçe harfler Latin karşılığına çevrilir ve sonuç büyük harfle saklanır. Örneğin `blm-301`, `BLM301` olur.

Migration mevcut geçerli kodları dönüştürür. Eski ve kurala uymayan kodları silmez; bu kayıtların `ders_kodu_standart` alanı boş kalır ve yönetici tarafından düzeltilmesi gerekir. Mevcut tekrarlar raporlandıktan sonra aynı bölüm ve standart kodla yeni bir ders eklenmesi veya başka bir dersin bu koda çevrilmesi engellenir.

Yönetici yalnızca aynı bölümdeki iki dersi birleştirebilir. Kaynak derse bağlı sorular hedefe taşınır, işlem geçmişe yazılır ve kaynak ders silinir. Bu işlem geri alma düğmesi sunmadığı için hedef ders ve taşınan soru sayısı panelde işlem öncesinde kontrol edilmelidir.

## Moderasyon ve bildirim

Soru onayı veya reddi `admin_soru_modere_et` ile yapılır. Ret için standart bir gerekçe zorunludur; isteğe bağlı yönetici notu soru kaydında ve `nk_moderasyon_gecmisi` tablosunda tutulur. Ders düzenleme, birleştirme, soru silme ve bildirim kapatma işlemleri de geçmişe yazılır.

Onaylı sorularda giriş yapmış doğrulanmış KTÜ üyeleri içerik bildirimi oluşturabilir. Kullanıcı kendi sorusunu bildiremez, aynı soru için ikinci açık bildirim açamaz ve 24 saatte en fazla 10 bildirim gönderebilir. Bildirim tablosu doğrudan istemciye açık değildir; kullanıcı yazması ve yönetici okuması yalnızca RPC üzerinden gerçekleşir.

## Dağıtım sırası

1. Veritabanı yedeğini ve geçerli geri yükleme noktasını doğrulayın.
2. `migrations/003_arsiv_moderasyon.sql` dosyasını Supabase SQL Editor'de çalıştırın.
3. Dosyanın sonundaki olası tekrar ders listesini inceleyin; birleştirmeyi yönetici panelinden yapın.
4. Güncel `dist` site çıktısını yayınlayın.
5. Bir üye hesabıyla ders arama, soru sayfalama ve içerik bildirme akışını; yöneticiyle ret, geçmiş ve birleştirme akışını kabul testinden geçirin.

`003` uygulanmadan yeni siteyi yayınlamak arşiv ve yönetici ekranındaki yeni RPC çağrılarını bozar. Migration site derlemesinin parçası değildir ve otomatik çalışmaz.
