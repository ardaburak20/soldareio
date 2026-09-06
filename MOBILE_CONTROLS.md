# Mobil Kontrol Sistemi - Soldare.io

## 🎮 Özellikler

### Otomatik Platform Algılama
- Oyun cihaz tipini otomatik algılar (mobil/masaüstü)
- Mobil cihazlarda touch kontroller aktif
- Masaüstünde mouse kontrolleri aktif

### Mobil Kontroller

#### 🕹️ Joystick (Sol Alt Köşe)
- **Konum:** Sol alt köşe, 140x140px dairesel alan
- **Fonksiyon:** Hareket yönü ve nişan alma
- **Görsel:** Yarı saydam beyaz taban + mavi kontrol çubuğu
- **Davranış:** 
  - Dokunma ile aktif olur
  - Maksimum 40px sapma
  - Bırakınca merkeze döner
  - Aktifken glow efekti

#### 🔥 Ateş Tuşu (Sağ Alt Köşe)
- **Konum:** Sağ alt köşe, 90x90px dairesel
- **Renk:** Kırmızı (#ff5252)
- **İkon:** 🔥 FIRE
- **Davranış:**
  - Basılı tutma ile sürekli ateş
  - Bırakınca durur
  - Basılıyken scale efekti

#### 🔄 Reload Tuşu (Ateş Tuşunun Çaprazında)
- **Konum:** Ateş tuşunun sol üst çaprazı, 70x70px dairesel
- **Renk:** Sarı (#ffc107)
- **İkon:** R
- **Davranış:**
  - Tek dokunuşla reload
  - 200ms görsel feedback

### Teknik Detaylar

#### Cihaz Algılama
```javascript
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 ('ontouchstart' in window) || 
                 (navigator.maxTouchPoints > 0);
```

#### Joystick Mekaniği
- Touch identifier tracking ile çoklu dokunma desteği
- 40px maksimum sapma yarıçapı
- Virtual mouse pozisyonu: oyuncunun 300 birim önü
- Smooth interpolation

#### Event Handling
- `touchstart`, `touchmove`, `touchend` event'leri
- `preventDefault()` ile sayfa kaydırma engellendi
- `passive: false` ile touch optimization

#### Viewport Optimizasyonu
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

## 🎯 Kullanım

### Oyun Başlatma
1. Oyunu aç
2. Platform otomatik algılanır
3. **Mobilde:** Touch kontroller görünür
4. **Masaüstünde:** Mouse kontrolleri aktif

### Oyun İçi
- **Mobil:** Joystick + Ateş/Reload tuşları
- **Desktop:** Mouse + R tuşu

### Ölüm/Menü
- Kontroller otomatik gizlenir
- Yeniden spawn olunca tekrar görünür

## 📱 Uyumluluk

### Test Edildi
- ✅ iOS Safari
- ✅ Android Chrome
- ✅ iPad Safari
- ✅ Desktop Chrome/Firefox/Edge

### Özellikler
- ✅ Touch event optimization
- ✅ Viewport fit (iPhone notch support)
- ✅ No scrolling interference
- ✅ Responsive button sizing
- ✅ Visual feedback (active states)
- ✅ Performance optimized

## 🎨 Stil Özellikleri

### Joystick
```css
.joystick-base: rgba(255, 255, 255, 0.1) - Yarı saydam taban
.joystick-stick: rgba(79, 195, 247, 0.7) - Mavi kontrol
.active: glow + opacity artışı
```

### Ateş Tuşu
```css
background: rgba(255, 82, 82, 0.7) - Kırmızı
.active: scale(0.95) + glow efekti
```

### Reload Tuşu
```css
background: rgba(255, 193, 7, 0.7) - Sarı
.active: scale(0.95) + glow efekti
```

## 🔧 Geliştirici Notları

### Koordinat Dönüşümü
- Screen space → World space transformation
- Joystick delta → Virtual mouse position
- Zoom-aware positioning

### Performance
- Touch events: passive: false (zorunlu preventDefault için)
- Canvas touch events engellendi
- Smooth interpolation ile pürüzsüz hareket

### Debug
```javascript
console.log('📱 Mobile device detected') // Mobil
console.log('🖥️ Desktop detected')       // Masaüstü
```
