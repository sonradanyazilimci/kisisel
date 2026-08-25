# Kişisel Link Sitesi (Firebase Firestore ile)

> **Bu proje için Firebase kurulumu zaten tamamlandı.** `erhankenar4@gmail.com` hesabı altında
> `kisisel-link-sitesi` adlı proje oluşturuldu, Firestore (eur3/Europe) ve Authentication
> (E-posta/Şifre) etkinleştirildi, `js/firebase-config.js` gerçek değerlerle dolduruldu ve
> `erhankenar35@gmail.com` admin kullanıcısı eklendi. Firestore yazma kuralı sadece bu admin
> kullanıcısının UID'sine izin verecek şekilde sıkılaştırıldı. Aşağıdaki adım adım kurulum
> bölümü referans/genel bilgi amaçlıdır — sıfırdan tekrar kurman gerekmiyor. Tek eksik: siteyi
> GitHub Pages'te yayınladığında o adresi **Authentication → Settings → Authorized domains**'e
> eklemen gerekiyor, yoksa admin girişi canlı sitede çalışmaz (localhost zaten ekli).

Linktree tarzında, admin panelinden yönetilebilen kişisel link/portföy sitesi. Veriler
**Firebase Firestore**'da tutulur; admin panelinden yaptığın her değişiklik, siteyi ziyaret
eden **herkese, her cihazda, sayfa yenilenmeden anında** yansır. Görseller ise veritabanına
gömülmez — gerçek dosya olarak `images/` klasöründe tutulur ve GitHub'a senin elinle yüklenir.

## Dosyalar

- `index.html` — herkese açık site (profil + linkler + portföy), Firestore'u canlı dinler
- `admin.html` — Firebase Authentication ile korunan yönetici paneli
- `js/firebase-config.js` — **senin dolduracağın** Firebase proje ayarları
- `js/firebase.js` — Firebase başlatma ve paylaşılan referanslar
- `js/site.js` — genel siteyi Firestore verisinden oluşturan kod
- `js/admin.js` — panel mantığı (giriş, CRUD, görsel yolu, yedekleme)
- `js/icons.js` — sosyal medya ikonları
- `images/` — profil ve portföy görsellerinin **gerçek dosya** olarak duracağı klasör

## 1) Firebase projesi kurulumu

1. https://console.firebase.google.com adresine git, Google hesabınla bir proje oluştur.
2. Proje içinde **Build → Firestore Database** bölümüne gir, "Veritabanı oluştur" de.
   Konum olarak sana yakın bir bölge seç, üretim modunda başlayabilirsin (kuralları aşağıda
   ayrıca vereceğiz).
3. **Build → Authentication** bölümüne gir, "Oturum açma yöntemi" (Sign-in method)
   sekmesinden **E-posta/Şifre**'yi etkinleştir.
4. Authentication → **Kullanıcılar** (Users) sekmesinden "Kullanıcı ekle" ile **kendine**
   bir yönetici hesabı oluştur (bir e-posta + en az 6 haneli bir şifre). Bu, admin paneline
   giriş yaparken kullanacağın bilgi.
5. Proje Ayarları (dişli ikonu) → Genel sekmesi → "Uygulamalarınız" altından **Web**
   uygulaması ekle (`</>` ikonu). Sana bir `firebaseConfig` nesnesi verecek.
6. Bu nesnedeki değerleri `js/firebase-config.js` dosyasına kopyala.

Bu `firebaseConfig` değerleri (apiKey vb.) **gizli değildir**, Firebase web projelerinde
tarayıcıda görünmesi normaldir. Gerçek güvenlik bir sonraki adımdaki kurallardan gelir.

## 2) Firestore güvenlik kuralları

Firebase Console → Firestore Database → **Kurallar** (Rules) sekmesine git, aşağıdakini yapıştır
ve yayınla:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /site/data {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Bu kural: siteyi **herkes okuyabilir** (linkler herkese görünür), ama **sadece giriş yapmış**
(senin admin hesabın) **yazabilir**. Daha da sıkı tutmak istersen, Authentication → Users
sekmesinden kendi kullanıcının UID'ini kopyalayıp kuralı şöyle değiştirebilirsin:

```
allow write: if request.auth != null && request.auth.uid == "BURAYA_KENDI_UID_IN";
```

## 3) Yetkili alan adları (Authorized domains)

Firebase Authentication → Settings → **Authorized domains** kısmına, siteyi yayınladığın
GitHub Pages adresini ekle (örn. `kullaniciadi.github.io`). Aksi halde admin paneline canlı
sitede giriş yapamazsın (localhost zaten varsayılan olarak eklidir).

## 4) Yerelde çalıştırma

Modül tabanlı script'ler (`type="module"`) kullanıldığı için sayfayı çift tıklayarak
(`file://`) açmak çalışmaz. Klasörde basit bir yerel sunucu başlat:

```
python -m http.server 8000
```

sonra `http://localhost:8000/index.html` ve `http://localhost:8000/admin.html` adreslerini kullan.

## 5) Admin paneli nasıl çalışır?

- `admin.html` adresine gidip Firebase'de oluşturduğun e-posta/şifre ile giriş yap.
- Profil, Linkler ve Portföy sekmelerinden ekleme/düzenleme/silme/sıralama yapabilirsin.
- **Kaydet**'e bastığın an değişiklik Firestore'a yazılır ve siteyi o an açık olan
  **herkesin** ekranına (sayfa yenilenmeden) yansır — sen dahil, farklı cihaz/tarayıcı fark etmez.
- **Ayarlar** sekmesinden şifreni değiştirebilir, tüm veriyi JSON olarak yedekleyip geri
  yükleyebilir veya siteyi boş bir şablona sıfırlayabilirsin.

## 6) Görseller nasıl çalışır?

Firestore'a büyük görselleri gömmek yerine, görseller **gerçek dosya** olarak `images/`
klasöründe tutulur; Firestore'da sadece dosyanın **yolu** (`images/proje-1.jpg` gibi) saklanır.

Profil fotoğrafı veya portföy görseli eklerken:

1. "Bilgisayarından seç" ile bir resim seç.
2. Dosya, önerilen bir adla (örn. `proje-adi-abc123.jpg`) bilgisayarına iner (genelde
   İndirilenler klasörüne). Yol alanı da otomatik doldurulur ve hemen kaydedilir.
3. İnen dosyayı proje klasöründeki **`images/`** klasörüne taşı.
4. Projeyi GitHub'a yüklerken `images/` klasörünü de birlikte gönder.

Yol kaydedildiği an Firestore'daki metin herkese yansır, ama dosyayı `images/` içine koyup
siteyi yayınlayana kadar görsel kırık görünür — bu beklenen bir durumdur. İstersen dosya
seçmeden, yol kutusuna zaten `images/` içine koyduğun bir dosyanın adını da elle yazabilirsin.

## 7) GitHub'a yayınlama

Bu proje tamamen statik dosyalardan oluşur (HTML/CSS/JS). `images/` klasörü dahil tüm
klasörü GitHub deposuna yükleyip GitHub Pages ile yayınlayabilirsin. Veriler artık Firestore'da
canlı tutulduğu için, veri için ayrıca bir dosya taşımana gerek yok — sadece `images/`
klasörünü güncel tutman yeterli.

## Güvenlik notu

Firebase Authentication + Firestore kuralları, önceki "tarayıcıda saklanan şifre" yöntemine
göre gerçek bir güvenlik sağlar. Yine de: admin hesabının şifresini güçlü tut, ve
Authentication → Users altında sadece kendi hesabının bulunduğundan emin ol (sitenin
kendisinde bir "kayıt ol" formu yok, bu yüzden başkaları kendi başına hesap açamaz).

## Özelleştirme

- Vurgu rengini Profil sekmesinden değiştirebilirsin.
- Yeni bir sosyal medya ikonu eklemek için `js/icons.js` içindeki `PLATFORM_ICONS` ve
  `PLATFORM_LIST` listelerine ekleme yapman yeterli.
