# AGNO, kayıtlı dönemler ve işletim

## Yönetmelik dayanağı

`docs/reference/KTÜ Yeni Not Sistemi.pdf` içindeki 24 Mart 2026 tarihli Usul ve Esasların 11. maddesi genel ortalamayı **Ağırlıklı Genel Not Ortalaması (AGNO)** olarak adlandırır. Arayüzde yalnızca bu resmi ad kullanılır. Aynı ekranda dönem ANO'su da hesaplanır. Hesap:

`(mevcut AGNO × mevcut kredi + dönem derslerinin kredi × katsayı toplamı) / yeni toplam kredi`

Madde 11 uyarınca sonuç iki ondalığa yuvarlanır. Katsayılar Tablo 3'ten alınır. D notu 0.0 katsayıyla ortalamaya katılır; G ve K katılmaz. Tablo 3, S notunu “katılır” olarak gösterse de sayısal katsayı vermediği için uygulama S notu için varsayım üretmez. Ders tekrarı ve intibakın transkripte etkisi bu Usul ve Esaslarda ayrıntılandırılmadığından kullanıcı güncel resmi transkriptindeki mevcut AGNO ve kredi toplamını girmelidir.

## Kayıtlı dönemler

`migrations/004_gano_donemler_isletim.sql` dosyası 003 sonrasında tek parça çalıştırılır. `kayitli_donemler` tablosu kullanıcı başına en fazla 20 kayıt ve dönem başına en fazla 50 ders kabul eder. RLS politikaları her kaydı yalnızca sahibi olan, doğrulanmış KTÜ üyesine açar. Hesaplama girişsiz kullanılabilir; yalnızca kaydetme, açma ve silme işlemleri hesap gerektirir.

## Hata takibi

İstemci yalnızca giriş yapmış üyelerde, dakikada aynı hatayı tekrar göndermeden ve kullanıcı başına 24 saatte en fazla 30 kayıtla hata bildirir. Hata mesajından e-posta, URL ve JWT biçimli tokenlar hem istemcide hem veritabanında ayıklanır. Stack trace, form alanları, not listesi ve dosya içeriği gönderilmez. Worker'ın mevcut zamanlanmış bakımı `uygulama_hatasi_temizle()` fonksiyonunu service role ile çağırarak 90 günden eski kayıtları temizler. Yönetici panelindeki “İşletim Sağlığı” özeti son hata sayılarını ve temizlenmeyi bekleyen dosyaları gösterir.

## Modal erişilebilirliği

`modal-accessibility.js` mevcut modal açma işlevlerini değiştirmeden bütün `.modal-overlay` bileşenlerini izler. Açılışta odağı modal içine taşır, Tab/Shift+Tab odağını içeride tutar, Escape ile kapatır ve kapanışta odağı modalı açan öğeye döndürür. Eksik `role="dialog"`, `aria-modal`, `aria-labelledby` ve `aria-hidden` öznitelikleri çalışma anında tamamlanır.

## Canlı kabul kontrolü

1. 004 migrationını 003 sonrasında, 005'i 004 sonrasında ve profil katkıları için 006'yı 005 sonrasında çalıştırın. Canlı AGNO RLS izinlerini ve PostgREST şema görünürlüğünü onarmak için 007'yi en son uygulayın.
2. AGNO sayfasında girişsiz ANO ve AGNO hesaplamasını deneyin; ağ isteğinde dönem verisi gönderilmemelidir.
3. KTÜ hesabıyla giriş yapın; bir dönem kaydedin, sayfayı yenileyin, kaydı açın, güncelleyin ve silin.
4. Başka bir test hesabının aynı kaydı okuyamadığını doğrulayın.
5. Bilerek kontrollü bir istemci hatası üretip yönetici “İşletim Sağlığı” özetinde yalnızca temizlenmiş mesajın göründüğünü doğrulayın.
6. Modal açan düğmelerde Tab döngüsü, Escape ile kapanma ve odağın geri dönmesini klavyeyle kontrol edin.
