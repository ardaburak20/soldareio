# 🌍 Bölgesel Fiyatlandırma (Regional Pricing)

## 📊 Fiyat Tablosu

Oyuncuların IP adreslerine göre otomatik olarak ülkeleri tespit edilir ve bölgesel fiyatlar gösterilir:

### 🇹🇷 Türkiye
- **Fiyat**: ₺30.00 TRY
- **Para Birimi**: Türk Lirası (TRY)

### 🇪🇺 Avrupa Birliği (Euro Bölgesi)
- **Fiyat**: €2.99 EUR
- **Para Birimi**: Euro (EUR)
- **Ülkeler**: Almanya, Fransa, İtalya, İspanya, Hollanda, Belçika, Avusturya, Portekiz, Yunanistan, İrlanda, Finlandiya

### 🇨🇳 Çin
- **Fiyat**: ¥15.00 CNY
- **Para Birimi**: Yuan (CNY)

### 🇷🇺 Rusya
- **Fiyat**: ₽150.00 RUB
- **Para Birimi**: Ruble (RUB)

### 🇺🇸 Amerika Birleşik Devletleri
- **Fiyat**: $2.99 USD
- **Para Birimi**: Dolar (USD)

### 🇬🇧 İngiltere
- **Fiyat**: £2.49 GBP
- **Para Birimi**: Sterlin (GBP)

### Diğer Ülkeler
Tam liste için aşağıdaki tabloya bakın.

---

## 📋 Tam Fiyat Listesi

| Ülke | Para Birimi | Fiyat | Sembol |
|------|------------|-------|--------|
| 🇹🇷 Türkiye | TRY | 30.00 | ₺ |
| 🇪🇺 Avrupa (Euro) | EUR | 2.99 | € |
| 🇨🇳 Çin | CNY | 15.00 | ¥ |
| 🇷🇺 Rusya | RUB | 150.00 | ₽ |
| 🇺🇸 ABD | USD | 2.99 | $ |
| 🇬🇧 İngiltere | GBP | 2.49 | £ |
| 🇧🇷 Brezilya | BRL | 14.99 | R$ |
| 🇮🇳 Hindistan | INR | 249.00 | ₹ |
| 🇲🇽 Meksika | MXN | 54.99 | $ |
| 🇦🇷 Arjantin | ARS | 2499.00 | $ |
| 🇵🇱 Polonya | PLN | 12.99 | zł |
| 🇯🇵 Japonya | JPY | 440.00 | ¥ |
| 🇰🇷 Güney Kore | KRW | 3990.00 | ₩ |
| 🇦🇺 Avustralya | AUD | 4.49 | A$ |
| 🇨🇦 Kanada | CAD | 3.99 | C$ |
| 🇳🇿 Yeni Zelanda | NZD | 4.99 | NZ$ |
| 🇸🇬 Singapur | SGD | 3.99 | S$ |
| 🇭🇰 Hong Kong | HKD | 23.50 | HK$ |
| 🇸🇪 İsveç | SEK | 32.99 | kr |
| 🇳🇴 Norveç | NOK | 32.99 | kr |
| 🇩🇰 Danimarka | DKK | 21.99 | kr |
| 🇨🇭 İsviçre | CHF | 2.79 | CHF |

---

## 🔧 Nasıl Çalışır?

### 1. IP Tespiti
- Oyuncu mağazayı açtığında IP adresi tespit edilir
- `geoip-lite` kütüphanesi ile ülke belirlenir
- Localhost'ta test için otomatik Türkiye seçilir

### 2. Fiyat Güncelleme
- `/api/get-regional-price` endpoint'i çağrılır
- Ülkeye özel fiyat döner
- Buton metinleri otomatik güncellenir

### 3. Ödeme
- Kullanıcı "Kalıcı" butonuna basar
- IP'den ülke belirlenip bölgesal fiyat gösterilir

---

## 🧪 Test Etme

### Localhost Test
Localhost'ta çalışırken otomatik olarak **Türkiye (₺30)** seçilir.

### Farklı Ülke Test Etme
IP'yi manuel olarak test etmek için server.js'de:

```javascript
function getCountryFromIP(ip) {
  // Test için zorla bir ülke seç
  return 'US'; // veya 'RU', 'CN', vb.
}
```

### Gerçek IP Test
VPN kullanarak farklı ülkelerden bağlanıp test edebilirsiniz.

---

## 💰 Fiyat Değiştirme

Fiyatları değiştirmek için `server.js` dosyasındaki `REGIONAL_PRICES` objesini düzenleyin:

```javascript
const REGIONAL_PRICES = {
  'TR': { currency: 'TRY', price: 30, symbol: '₺' },
  'CN': { currency: 'CNY', price: 15, symbol: '¥' },
  // ... diğer ülkeler
};
```

### Yeni Ülke Ekleme
```javascript
'XX': { currency: 'XXX', price: 9.99, symbol: 'Σ' }
```
- **XX**: 2 harfli ülke kodu (ISO 3166-1 alpha-2)
- **currency**: 3 harfli para birimi kodu (ISO 4217)
- **price**: Fiyat (ondalık sayı)
- **symbol**: Para birimi sembolü

---

## 🌐 Desteklenen Ülkeler

Toplamda **25+ ülke** için özel fiyatlandırma yapıldı:

✅ Türkiye  
✅ Tüm Euro Bölgesi  
✅ Çin  
✅ Rusya  
✅ ABD  
✅ İngiltere  
✅ Brezilya  
✅ Hindistan  
✅ Japonya  
✅ Güney Kore  
✅ Avustralya  
✅ Kanada  
✅ ve daha fazlası...

Listede olmayan ülkeler için **DEFAULT (USD $2.99)** fiyat gösterilir.

---

## 📱 Kullanıcı Deneyimi

### Oyuncu Görüşü
1. Mağazayı açar (ESC tuşu)
2. Otomatik olarak kendi ülkesinin fiyatını görür
3. "Kalıcı (₺30)" veya "Kalıcı (€2.99)" gibi kendi para biriminde fiyat
4. Ödeme yaparken otomatik doğru para birimi gösterilir

### Örnek Görünümler
- Türkiye'den: **"Kalıcı (₺30)"**
- Almanya'dan: **"Kalıcı (€2.99)"**
- Çin'den: **"Kalıcı (¥15)"**
- Rusya'dan: **"Kalıcı (₽150)"**

---

## 🔍 Debug ve Log

Server console'da göreceğiniz log'lar:

```
🌍 IP 123.456.789.0 detected as TR
💰 Regional price for TR: ₺30
🌍 User from TR: ₺30 TRY
```

Client console'da:

```
💰 Fetching regional prices...
🌍 Regional pricing loaded: ₺30
```

---

## ⚠️ Önemli Notlar

1. **GeoIP Modülü**: `geoip-lite` kurulu olmalı
   ```bash
   npm install geoip-lite
   ```

2. **Proxy/VPN**: Kullanıcılar VPN kullanırsa farklı fiyat görebilirler

3. **Localhost**: Test için otomatik Türkiye seçilir

4. **Para Birimi Desteği**: Otomatik para birimi dönüşümü yapılır

---

## 🎯 Avantajları

✅ **Adil Fiyatlandırma**: Her ülke kendi ekonomisine uygun fiyat  
✅ **Daha Fazla Satış**: Uygun fiyatlar daha fazla oyuncunun satın almasını sağlar  
✅ **Otomatik**: IP'den otomatik tespit, manual seçim gerekmez  
✅ **Kolay Güncelleme**: Tek yerden tüm fiyatları değiştirebilirsiniz  
✅ **Şeffaf**: Oyuncu kendi para biriminde fiyat görür  

---

## 📞 Destek

Fiyat değişiklikleri veya yeni ülke eklemeleri için `server.js` dosyasındaki `REGIONAL_PRICES` objesini düzenleyin.

---

**Not**: Bu sistem production'da çalışır durumda. Test için önce sandbox modda deneyin!
