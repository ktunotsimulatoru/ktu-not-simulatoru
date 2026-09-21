# Sıralı çalışma durumu

1. Modüller ve ortak hesaplama şablonları tamamlandı. Hesaplama, arayüz, doğrulama, dönem, üyelik, ders, galeri, oyun, anket, duyuru, istatistik ve bağlantı sorumlulukları ayrıldı. Mevcut HTML çıktısı korunuyor.
2. Yerel uygulama ve migration tamamlandı: yükleme rezervasyonu/kayıt, kota, R2 silme kuyruğu, özel dosya erişimi, eski sahipsiz nesne envanteri. Worker/R2 üzerinde iki gerçek üyeyle canlı kabul testi ve güncel Worker dağıtımı bekliyor.
3. Anonim canlı RLS/RPC sınırı denetlendi, inline olay/script/style blokları kaldırıldı, katı CSP ve güvenlik başlıkları hazırlandı. Tam yetkili SQL denetimi ve giriş yapmış kullanıcı kabul testi yapılmalı; GitHub Pages tam HTTP başlıklarını sunmadığı için `_headers` destekleyen barındırmaya geçilmeli.
4. Tamamlandı: sunucuda sayaç/arama/sayfalama eklendi. Ortak kodun modüllere ayrılması 1. aşamada tamamlanmıştı. Git ana dalı ve `npm run check` çalıştıran CI kuruldu.
5. Tamamlandı: ders kodu standardı, aynı bölüm içinde güvenli ders birleştirme, gerekçeli moderasyon geçmişi ve üye içerik bildirimi eklendi.
6. Tamamlandı: yeni yönetmeliğe göre birleşik ANO/AGNO ve hedef ortalama, üyeye özel kayıtlı dönemler, ayrı profil sayfası ve genel kullanıcı adı, profilde katkı geçmişi ile moderasyonlu düzeltme talepleri, modal klavye/odak erişilebilirliği, kişisel veriden arındırılmış hata takibi, yönetici işletim özeti ve yerel geri yükleme tatbikatı eklendi.

## Kullanıcının dosya erişimi kararı

Onaylı soru dosyalarını yalnızca giriş yapmış KTÜ üyeleri okuyabilir. Bekleyen dosyaları yalnızca sahibi ve yönetici okuyabilir. Bu karar yeni Worker ve 002 migrationında uygulandı; canlıda etkinleşmesi dağıtım gerektirir. Kalıcı açık R2 bağlantıları bu modele uygun değildir. Erişim denetimi sadece HTML arayüzünde değil sunucuda uygulanmalıdır.

## Bu aşamadaki doğrulama

Güncel pakette 60 otomatik test geçiyor ve derleme 52 yayın dosyası üretiyor. Yerel sahte Supabase ortamında hesaplama, profil ve giriş akışları; canlı Supabase'de anonim erişim sınırı doğrulandı. Gerçek iki üyeli dosya sahipliği ve Worker/R2 kabul testi bekliyor.

## 2. aşama doğrulaması

37 otomatik test geçti. Yerel tarayıcıda özel görsel yükleme, galeri geçişi ve çıkışta erişimin kapanması doğrulandı. Gerçek Supabase/R2 üzerinde canlı kabul kontrolleri ve dağıtım bekliyor.

## 3. aşama doğrulaması

41 otomatik test geçti. Derleme 48 yayın dosyası üretiyor ve inline olay, çalıştırılabilir inline script, inline style bloğu ile harici JavaScript'i reddediyor. Katı CSP altında harf notu hesaplama, bilgi/giriş pencereleri ve dinamik dönem dersi ekleme-silme tarayıcıda hatasız çalıştı. Anonim canlı Supabase denetimindeki 20 kontrol geçti; 002 migrationının canlıda bulunmadığı ayrıca doğrulandı. Tam `authenticated`, yönetici ve `service_role` denetimi dağıtım sırasında SQL Editor ve kabul hesaplarıyla yapılmalı.

## 4–5. aşama doğrulaması

Arşiv ve moderasyon migrationı yerel PostgreSQL uyumlu ortamda iki kez uygulanarak sınandı ve canlı RPC varlığı anonim denetimde doğrulandı. Sayaç, arama, sayfalama, ders kodu standardı, bildirim sınırları, gerekçeli karar geçmişi ve ders birleştirme testleri eklendi. `docs/ARSIV_VE_MODERASYON.md` içindeki gerçek yönetici kabul adımları tamamlanmalıdır.
