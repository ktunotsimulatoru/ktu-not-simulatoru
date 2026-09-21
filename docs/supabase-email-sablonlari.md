# KTÜ Not Simülatörü — Supabase Auth E-posta Şablonları (Türkçe)

Her başlığın altındaki **Konu** satırını ve **HTML** kod bloğunu, Supabase Dashboard →
Authentication → Emails → ilgili şablonun içine (Subject / Message body (HTML) alanlarına)
kopyala-yapıştır yap.

Hepsi aynı görsel dile sahip (site renginle, #006FEE) ve hepsinde **kod** ({{ .Token }})
gösteriliyor — link değil.

**GÜNCELLEME:** Giriş artık e-posta+şifre ile yapılıyor (her girişte mail atmamak, Resend'in
ücretsiz plan sınırını (100/gün, 3000/ay) aşmamak için). Bu yüzden sitede gerçekten
tetiklenen şablonlar artık şunlar:
- **"Confirm sign up"** — hesap ilk oluşturulurken (tek seferlik).
- **"Reset password"** — kullanıcı "Şifremi unuttum" dediğinde.

**"Magic link or OTP" artık hiç kullanılmıyor** (giriş şifreyle yapıldığı için mail
gitmiyor). Invite user, Change email address, Reauthentication da şu an tetiklenmiyor.
Hepsi yine de Türkçeleştirilip hazır bırakıldı, ileride lazım olursa diye — ama öncelik
sırasıyla **Confirm sign up** ve **Reset password** şablonlarını doğru ayarlamak.

---

## 1) Confirm sign up (Kayıt / İlk Doğrulama)

**Kullanım:** Bir öğrenci Not Kutusu'na ilk kez e-postasını girdiğinde gönderilir.

**Subject:**
```
KTÜ Not Simülatörü - Doğrulama Kodun
```

**Message body (HTML):**
```html
<div style="font-family:'Poppins','Segoe UI',Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; background-color:#ffffff;">
  <div style="text-align:center; margin-bottom:24px;">
    <img src="https://www.ktunotsimulatoru.com/logo.png" alt="KTÜ Not Simülatörü" width="180" style="max-width:180px; height:auto;">
  </div>
  <h1 style="font-size:20px; color:#18181b; text-align:center; margin:0 0 8px 0;">Not Kutusu'na Hoş Geldin 👋</h1>
  <p style="font-size:15px; color:#52525b; text-align:center; line-height:1.6; margin:0 0 28px 0;">
    Çıkmış soruları görebilmek ve paylaşabilmek için aşağıdaki kodu doğrulama ekranına gir:
  </p>
  <div style="background-color:#eef6ff; border:1px solid #cfe4ff; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
    <span style="font-size:34px; font-weight:700; letter-spacing:8px; color:#006FEE;">{{ .Token }}</span>
  </div>
  <p style="font-size:13px; color:#71717a; text-align:center; line-height:1.6; margin:0 0 24px 0;">
    Bu kod 60 dakika boyunca geçerlidir. Bu isteği sen yapmadıysan bu e-postayı görmezden gelebilirsin, hesabında hiçbir işlem yapılmayacaktır.
  </p>
  <hr style="border:none; border-top:1px solid #e4e4e7; margin:24px 0;">
  <p style="font-size:12px; color:#a1a1aa; text-align:center; margin:0;">
    KTÜ Not Simülatörü — Not Kutusu · Bu otomatik bir bildirimdir, yanıtlamayın.<br>
    Sorularınız için: <a href="mailto:ktunotsimulatoru@gmail.com" style="color:#006FEE;">ktunotsimulatoru@gmail.com</a>
  </p>
</div>
```

---

## 2) Magic link or OTP (Giriş Kodu)

**Kullanım:** Daha önce üye olmuş bir öğrenci tekrar giriş yapmak için kod istediğinde gönderilir.

**Subject:**
```
KTÜ Not Simülatörü - Giriş Kodun
```

**Message body (HTML):**
```html
<div style="font-family:'Poppins','Segoe UI',Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; background-color:#ffffff;">
  <div style="text-align:center; margin-bottom:24px;">
    <img src="https://www.ktunotsimulatoru.com/logo.png" alt="KTÜ Not Simülatörü" width="180" style="max-width:180px; height:auto;">
  </div>
  <h1 style="font-size:20px; color:#18181b; text-align:center; margin:0 0 8px 0;">Giriş Kodun Hazır 🔑</h1>
  <p style="font-size:15px; color:#52525b; text-align:center; line-height:1.6; margin:0 0 28px 0;">
    Not Kutusu'na giriş yapmak için aşağıdaki kodu doğrulama ekranına gir:
  </p>
  <div style="background-color:#eef6ff; border:1px solid #cfe4ff; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
    <span style="font-size:34px; font-weight:700; letter-spacing:8px; color:#006FEE;">{{ .Token }}</span>
  </div>
  <p style="font-size:13px; color:#71717a; text-align:center; line-height:1.6; margin:0 0 24px 0;">
    Bu kod 60 dakika boyunca geçerlidir. Bu girişi sen istemediysen bu e-postayı görmezden gelebilirsin.
  </p>
  <hr style="border:none; border-top:1px solid #e4e4e7; margin:24px 0;">
  <p style="font-size:12px; color:#a1a1aa; text-align:center; margin:0;">
    KTÜ Not Simülatörü — Not Kutusu · Bu otomatik bir bildirimdir, yanıtlamayın.<br>
    Sorularınız için: <a href="mailto:ktunotsimulatoru@gmail.com" style="color:#006FEE;">ktunotsimulatoru@gmail.com</a>
  </p>
</div>
```

---

## 3) Invite user (Davet) — şu an sitede kullanılmıyor

**Kullanım:** İleride admin panelinden birini elle davet etme özelliği eklersen kullanılır. Bu tek link tabanlı kalmalı (davet kabul etme doğası gereği bir bağlantıyla yapılır).

**Subject:**
```
KTÜ Not Simülatörü'ne Davet Edildin
```

**Message body (HTML):**
```html
<div style="font-family:'Poppins','Segoe UI',Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; background-color:#ffffff;">
  <div style="text-align:center; margin-bottom:24px;">
    <img src="https://www.ktunotsimulatoru.com/logo.png" alt="KTÜ Not Simülatörü" width="180" style="max-width:180px; height:auto;">
  </div>
  <h1 style="font-size:20px; color:#18181b; text-align:center; margin:0 0 8px 0;">Davet Edildin 🎉</h1>
  <p style="font-size:15px; color:#52525b; text-align:center; line-height:1.6; margin:0 0 28px 0;">
    KTÜ Not Simülatörü'nde Not Kutusu'na katılman için davet edildin. Katılmak için aşağıdaki butona tıkla:
  </p>
  <div style="text-align:center; margin-bottom:24px;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block; background-color:#006FEE; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:10px;">Daveti Kabul Et</a>
  </div>
  <p style="font-size:13px; color:#71717a; text-align:center; line-height:1.6; margin:0 0 24px 0;">
    Bu daveti sen istemediysen bu e-postayı görmezden gelebilirsin.
  </p>
  <hr style="border:none; border-top:1px solid #e4e4e7; margin:24px 0;">
  <p style="font-size:12px; color:#a1a1aa; text-align:center; margin:0;">
    KTÜ Not Simülatörü — Not Kutusu · Bu otomatik bir bildirimdir, yanıtlamayın.<br>
    Sorularınız için: <a href="mailto:ktunotsimulatoru@gmail.com" style="color:#006FEE;">ktunotsimulatoru@gmail.com</a>
  </p>
</div>
```

---

## 4) Change email address (E-posta Değişikliği) — şu an sitede kullanılmıyor

**Kullanım:** İleride üyelerin e-postasını değiştirme özelliği eklersen kullanılır.

**Subject:**
```
KTÜ Not Simülatörü - E-posta Değişikliği Onay Kodu
```

**Message body (HTML):**
```html
<div style="font-family:'Poppins','Segoe UI',Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; background-color:#ffffff;">
  <div style="text-align:center; margin-bottom:24px;">
    <img src="https://www.ktunotsimulatoru.com/logo.png" alt="KTÜ Not Simülatörü" width="180" style="max-width:180px; height:auto;">
  </div>
  <h1 style="font-size:20px; color:#18181b; text-align:center; margin:0 0 8px 0;">E-posta Değişikliğini Onayla ✉️</h1>
  <p style="font-size:15px; color:#52525b; text-align:center; line-height:1.6; margin:0 0 28px 0;">
    Hesabının e-posta adresini değiştirmek için aşağıdaki kodu gir:
  </p>
  <div style="background-color:#eef6ff; border:1px solid #cfe4ff; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
    <span style="font-size:34px; font-weight:700; letter-spacing:8px; color:#006FEE;">{{ .Token }}</span>
  </div>
  <p style="font-size:13px; color:#71717a; text-align:center; line-height:1.6; margin:0 0 24px 0;">
    Bu değişikliği sen istemediysen bu e-postayı görmezden gelebilirsin, hesabında hiçbir işlem yapılmayacaktır.
  </p>
  <hr style="border:none; border-top:1px solid #e4e4e7; margin:24px 0;">
  <p style="font-size:12px; color:#a1a1aa; text-align:center; margin:0;">
    KTÜ Not Simülatörü — Not Kutusu · Bu otomatik bir bildirimdir, yanıtlamayın.<br>
    Sorularınız için: <a href="mailto:ktunotsimulatoru@gmail.com" style="color:#006FEE;">ktunotsimulatoru@gmail.com</a>
  </p>
</div>
```

---

## 5) Reset password (Şifre Sıfırlama) — şu an sitede kullanılmıyor

**Kullanım:** Not Kutusu'nda şifre yok (sadece e-posta + kod ile giriş), bu yüzden bu şablon şu an hiç tetiklenmiyor. Yine de hazır bulunsun diye Türkçeleştirildi.

**Subject:**
```
KTÜ Not Simülatörü - Şifre Sıfırlama Kodu
```

**Message body (HTML):**
```html
<div style="font-family:'Poppins','Segoe UI',Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; background-color:#ffffff;">
  <div style="text-align:center; margin-bottom:24px;">
    <img src="https://www.ktunotsimulatoru.com/logo.png" alt="KTÜ Not Simülatörü" width="180" style="max-width:180px; height:auto;">
  </div>
  <h1 style="font-size:20px; color:#18181b; text-align:center; margin:0 0 8px 0;">Şifre Sıfırlama 🔒</h1>
  <p style="font-size:15px; color:#52525b; text-align:center; line-height:1.6; margin:0 0 28px 0;">
    Şifreni sıfırlamak için aşağıdaki kodu gir:
  </p>
  <div style="background-color:#eef6ff; border:1px solid #cfe4ff; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
    <span style="font-size:34px; font-weight:700; letter-spacing:8px; color:#006FEE;">{{ .Token }}</span>
  </div>
  <p style="font-size:13px; color:#71717a; text-align:center; line-height:1.6; margin:0 0 24px 0;">
    Bu isteği sen yapmadıysan bu e-postayı görmezden gelebilirsin, şifren değişmeyecektir.
  </p>
  <hr style="border:none; border-top:1px solid #e4e4e7; margin:24px 0;">
  <p style="font-size:12px; color:#a1a1aa; text-align:center; margin:0;">
    KTÜ Not Simülatörü — Not Kutusu · Bu otomatik bir bildirimdir, yanıtlamayın.<br>
    Sorularınız için: <a href="mailto:ktunotsimulatoru@gmail.com" style="color:#006FEE;">ktunotsimulatoru@gmail.com</a>
  </p>
</div>
```

---

## 6) Reauthentication (Hassas İşlem Onayı) — şu an sitede kullanılmıyor

**Kullanım:** İleride "hesabı sil" gibi hassas bir işlem eklersen, o işlemden hemen önce kimliği tekrar doğrulamak için kullanılır.

**Subject:**
```
KTÜ Not Simülatörü - Kimlik Doğrulama Kodu
```

**Message body (HTML):**
```html
<div style="font-family:'Poppins','Segoe UI',Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; background-color:#ffffff;">
  <div style="text-align:center; margin-bottom:24px;">
    <img src="https://www.ktunotsimulatoru.com/logo.png" alt="KTÜ Not Simülatörü" width="180" style="max-width:180px; height:auto;">
  </div>
  <h1 style="font-size:20px; color:#18181b; text-align:center; margin:0 0 8px 0;">Kimliğini Doğrula ✅</h1>
  <p style="font-size:15px; color:#52525b; text-align:center; line-height:1.6; margin:0 0 28px 0;">
    Hassas bir işlemi tamamlamak için aşağıdaki kodu gir:
  </p>
  <div style="background-color:#eef6ff; border:1px solid #cfe4ff; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
    <span style="font-size:34px; font-weight:700; letter-spacing:8px; color:#006FEE;">{{ .Token }}</span>
  </div>
  <p style="font-size:13px; color:#71717a; text-align:center; line-height:1.6; margin:0 0 24px 0;">
    Bu isteği sen yapmadıysan hesabının güvenliğini kontrol et ve bize yaz.
  </p>
  <hr style="border:none; border-top:1px solid #e4e4e7; margin:24px 0;">
  <p style="font-size:12px; color:#a1a1aa; text-align:center; margin:0;">
    KTÜ Not Simülatörü — Not Kutusu · Bu otomatik bir bildirimdir, yanıtlamayın.<br>
    Sorularınız için: <a href="mailto:ktunotsimulatoru@gmail.com" style="color:#006FEE;">ktunotsimulatoru@gmail.com</a>
  </p>
</div>
```

---

## Notlar
- Sender adı/adresi olarak "no-reply" kullanmamanı, `bildirim@ktunotsimulatoru.com` gibi bir adres kullanmanı Resend'in kendi uyarısı zaten söylemişti — bu şablonlardaki "yanıtlamayın" notu ile o tavsiye çelişmiyor, sadece adresin *ismi* "no-reply" olmasın deniyordu.
- `https://www.ktunotsimulatoru.com/logo.png` linki sitenin canlı logosunu çekiyor — logoyu değiştirirsen bu link otomatik güncel kalır, dosya yüklemene gerek yok.
- Her şablonu kaydettikten sonra Supabase genelde bir "Send test email" seçeneği sunuyor — oradan kendine bir test at, kodun ve tasarımın göründüğü gibi geldiğini doğrula.
