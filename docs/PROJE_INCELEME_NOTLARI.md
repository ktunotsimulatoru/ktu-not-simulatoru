# Proje İnceleme ve Uygulama Notları

20 Eylül 2026. Önceki düzeltmelerin kullanıcı tarafından uygulandığı bilgisi alındı. Bu klasör düzenlemesi sırasında canlı yayın veya canlı SQL işlemi yapılmadı.

## Tamamlanan yerel değişiklikler

- Harf notu, gereken final ve senaryo hesapları aynı çekirdeği kullanıyor. HBN/T-skoru yuvarlaması, bağıl/mutlak karşılaştırması ve barajlar ters hesapta da uygulanıyor.
- 13.365 parametre/hedef birleşiminde gereken finalin yeterli olduğu ve 0,01 puan altının yetmediği kontrol ediliyor. BA ve AA regresyon örnekleri ayrıca test ediliyor.
- Öğrenci, profil ve yönetim ekranındaki ek yolları UUID/UUID.uzantı biçimiyle filtreleniyor. Hata mesajları güvenli metin olarak gösteriliyor.
- Worker gerçek dosya akışında 5 MB sınırı, dosya imzası, nosniff, JWT issuer/audience/süre kontrolleri uyguluyor. ES256 ve HS256 yolları yerel testlerle korunuyor.
- Veri silmeyen migrations/001_not_kutusu_guvenlik.sql hazır. Ders kurucusu silinince ders korunuyor; soru içeren dersin silinmesi engelleniyor; yeni ek yolları kayıt sahibine ait olmalı. PGlite üzerinde veri koruma ve tekrar uygulama testleri var.
- Eski klasör sistemi SQL'indeki otomatik TRUNCATE kaldırıldı; eski ders eşlemesi gereken yerde işlem duruyor.
- Not Kutusu katalog sorguları sayfalanıyor; ağ hatası boş katalog gibi gösterilmiyor ve yeniden deneme var. Oturum kapanışında katalog/önizleme temizleniyor. Eksiz soru gönderimi engelleniyor.
- Önizleme nesne URL'leri serbest bırakılıyor.
- package.json, kilit dosyası, test/build/sözdizimi komutları ve canlıya yazmayan yerel önizleme eklendi.
- Supabase CDN sürümü 2.116.0'a sabitlendi; sitemap'e eksik iki sayfa eklendi. Hesaplama sonuçlarında erişilebilir durum bildirimi var.
- Önceki listede eksik görünen görsel yakınlaştırma, sürükleme ve galeri gezinmesi zaten uygulanmıştı.

## Klasör düzenlemesi

Kaynaklar src, sabit yayın dosyaları public, sunucu kodu worker altında toplandı. Derleme dist, dağıtım paketleri release içine üretiliyor. Önceki SQL dosyaları docs/archive/sql altında korunuyor. Kullanım için DOSYA_DUZENI.md belgesine bakın. Uygulanmış migration tekrar çalıştırılmamalı; yeni değişiklik yeni dosyayla gelmeli.

## Sonraki işler — sıralı

1. Yükleme kaydı/rezervasyon, kullanıcı kotası, R2 geçici dosya ve silme sonrası temizlik. Nesne sahipliği ve varlığının veritabanına güvenilir bağlanması. Dosyaların açık bağlantı modeli için ürün kararı.
2. Canlı RLS/RPC yetki denetimi, statik sunucu HTTP güvenlik başlıkları, inline olaylardan çıkış ve katı CSP.
3. Büyük arşiv için sunucuda soru sayaçları, arama ve sayfalama; ortak kodun hesap/oyun/anket/istatistik modüllerine ayrılması ve ihtiyaca göre yüklenmesi. Sürüm kontrolü ve CI kurulması.
4. Ders birleştirme, standart ders kodları, moderasyon nedenleri/geçmişi ve içerik bildirme.
5. Kaydedilen dönemler, hedef ortalama, kapsamlı modal klavye/odak erişilebilirliği; işletim hata takibi ve yedekten geri yükleme denemesi.

Kurulum ve teknik sınırlar için README.md esas alınmalıdır.
