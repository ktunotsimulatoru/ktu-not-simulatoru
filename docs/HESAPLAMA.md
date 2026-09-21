# Hesaplama mantığı

`src/scripts/modules/calculation-core.mjs` içindeki `hesaplaDersNotu` ortak çekirdektir. HBN iki ondalığa, mutlak değerlendirmede tam sayıya ve T-skoru tam sayıya mevcut uygulamadaki sırayla yuvarlanır. Bağıl sistemin HBN 30 ve fakülte final barajları korunur. Bağıl ve mutlak sonuçların yüksek olanı seçilir.

`gerekenFinaliHesapla`, aynı çekirdeği kullanarak 0,01 puan adımında hedefe veya üstüne ulaşan en düşük finali arar. Ulaşılamayan hedef `null` döner. Örneğin vize 70 / mutlak BA için 84,99; vize 72 / ortalama 79 / standart sapma 20 / AA için 98,99 hesaplanır. Tam sayı final gerekiyorsa yukarı yuvarlanır. Bu küçük kesir farkı, HBN'nin önce iki ondalığa yuvarlanmasının sonucudur.

Tablo-2 normal dağılıma dayalı tahmin olmaya devam eder. Bu çalışma mevzuatı yeniden yorumlamaz; mevcut kuralların ekranlar arası tutarlılığını sağlar.
