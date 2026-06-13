# GDD — Auto-Battler (çalışma adı)

> Tek cümle: *Birim satın al, tahtaya stratejik diz, "Savaş" de ve dövüşü izle — kazanmak elindeki dizilim ve ekonomiyi yönetmekte, refleste değil.*

## 1. Vizyon ve his
Oyuncu hiç refleks kullanmaz. Tüm karar **savaştan önce** verilir: hangi birimi alacağım, nereye koyacağım, paramı ne zaman harcayıp ne zaman biriktireceğim. "Savaş" tuşuna bastıktan sonra oyuncu sadece izler; sonuç tamamen hazırlığın kalitesine bağlıdır. Hedef his: **"doğru kurguyu bulunca kazanmanın tatmini."**

## 2. Çekirdek döngü (core loop)
```
HAZIRLIK (prep)              SAVAŞ (battle)            SONUÇ
─────────────               ─────────────             ─────
gelir al  →  dükkândan      →  "Savaş" de  →  birimler  →  kazandın: altın + tur++
birim al  →  tahtaya diz         otomatik dövüşür         kaybettin: can--
(istersen reroll)                (izlersin)               → tekrar HAZIRLIK
```
Bu döngü her tur tekrarlanır. Tur ilerledikçe düşman dalgaları güçlenir.

## 3. Sistemler

### 3.1 Ekonomi
- Her turun başında **gelir** alırsın (base income).
- **Faiz**: biriktirdiğin her 10 altın için +1 altın (bir tavana kadar). Bu, "harca mı biriktir mi" gerilimini yaratır — oyunun kalbi.
- Kazanırsan küçük bir **zafer bonusu**.

### 3.2 Dükkân (shop)
- Her hazırlıkta rastgele N birim teklif edilir.
- **Reroll**: küçük bir ücretle dükkânı yeniler (istediğin birimi ararken).

### 3.3 Birimler
- Her birimin: maliyet, can, hasar, menzil, saldırı hızı, hareket hızı vardır.
- Tipler farklı rol oynar: tank (öne geçer, dayanır), okçu (uzaktan vurur), büyücü (yavaş ama çok hasar).
- Dizilim önemli: tankı öne, kırılganları arkaya koymak strateji.

### 3.4 Yıldız yükseltme (sonraki adım, MVP'de yok)
- Aynı birimden 3 tane → 1 güçlü "2 yıldız" birim. Klasik auto-battler derinliği. MVP'den sonra eklenecek.

### 3.5 Savaş simülasyonu (deterministik, oyuncu girdisi yok)
- Her birim **en yakın düşmanı** hedefler, menzile girene kadar ona doğru ilerler, menzildeyse saldırı hızına göre vurur.
- Can 0 olan birim ölür. Bir taraf tamamen yok olunca savaş biter.
- Rastgelelik yok → aynı dizilim aynı sonucu verir (adil, öğrenilebilir).

### 3.6 Düşman dalgaları
- Her tur, tura göre ölçeklenen bir "bütçe" ile düşman dalgası üretilir.
- Tur arttıkça daha çok ve daha pahalı düşman.

### 3.7 Can / yenilgi / zafer
- Başlangıçta birkaç **can** vardır.
- Savaşı kaybedince can azalır. Can 0 → **oyun biter (yenilgi)**.
- Hedef tura (örn. 10) ulaşıp hayatta kalmak → **zafer**.

## 4. İlk birim seti (başlangıç dengesi)
| Birim   | Maliyet | Can | Hasar | Menzil | Saldırı/sn | Rol            |
|---------|--------:|----:|------:|-------:|-----------:|----------------|
| Şövalye | 3       | 120 | 14    | yakın  | 1.0        | dengeli ön saf |
| Okçu    | 3       | 60  | 12    | uzak   | 1.1        | uzaktan dps    |
| Büyücü  | 4       | 55  | 30    | uzak   | 0.6        | patlama hasarı |
| Dev     | 5       | 260 | 22    | yakın  | 0.7        | tank           |

> Bu sayılar başlangıç tahminidir; oynayıp **dengeleyeceğiz** (oyun tasarımının asıl işi budur).

## 5. Kontroller / UX
- Dükkân kartına tıkla → satın al (altın düşer, birim tahtaya eklenir).
- Tahtadaki birime tıkla → sat (altın iadesi).
- "Reroll" → dükkânı yenile. "Savaş" → turu başlat.
- Savaş sırasında girdi yok; sadece izlenir.

## 6. Kapsam: MVP → yol haritası
**MVP (şu an kurulan iskelet):** ekonomi + dükkân + tahtaya dizme + deterministik savaş + tur ilerleme + can/zafer.

**Sonraki adımlar (öncelik sırasıyla):**
1. Yıldız yükseltme (3 birleştir).
2. Sürükle-bırak ile serbest konumlandırma.
3. Birim sinerjileri / sınıflar (örn. 3 okçu = +menzil).
4. Yetenekler (mana dolunca özel saldırı).
5. Görsel/ses cilası, animasyon.

## 7. Teknik mimari (codebase)
Tarayıcıda, motor yok, sıfır kurulum. Saf JavaScript + Canvas. Sorumluluklar dosyalara ayrıldı:

```
chaos/
├── index.html        # Sayfa + canvas + UI; script'leri sırayla yükler
├── src/
│   ├── config.js     # Tüm sabitler: birimler, ekonomi, tahta boyutu (denge burada)
│   ├── units.js      # Birim üretimi (createUnit) ve yardımcılar
│   ├── battle.js     # Saf savaş simülasyonu (tick) — UI'dan bağımsız, test edilebilir
│   ├── render.js     # Canvas'a çizim (tahta, birimler, can barları)
│   └── main.js       # Durum makinesi (prep/battle/result) + oyun döngüsü + girdi
└── docs/GDD.md       # Bu doküman
```
Neden böyle: **denge `config.js`'te tek yerde**, **savaş mantığı `battle.js`'te saf** (çizimden ayrı, kolay test/dengeleme), çizim ve durum yönetimi ayrı. İleride Unity'ye taşırsan bu mantık katmanı (config + battle) neredeyse aynen taşınır.

## 8. v2 eklentileri — Darkest Dungeon dersleri
DD'nin asıl dersi *"HP'nin ötesinde ikinci bir kaynak + sınırlı kadro"*. Bunu refleks/şans katmadan, sistemlerle aldık:

- **Yıpranma (attrition):** Birimlerin kalıcı `wounds` değeri vardır; etkin can = `maxHP − wounds`. Savaşan birim aldığı hasarın bir kısmını kalıcı yaraya çevirir (ölürse büyük yara, tavanla sınırlı). Yedekte dinlenen birim her tur iyileşir. Yıpranan birim zayıfladığı için onu **gönüllü olarak** yedeğe alıp dinlendirmek bir karar olur.
- **Karakter sınırı yok — ekonomi tek kısıt:** Sahaya istediğin kadar birim dizebilirsin; sınır yalnızca **paran** (ve fiziksel tahta yeri). Sabit bir kadro limiti yoktur.
- **Şifacı (Medic):** Hasar vermez; savaşta en yaralı müttefiki iyileştirir. Birimlerin net hasarını düşürerek yıpranmayı dolaylı azaltır → ikili değer.
- **Yedek kulübesi (bench) + sürükle-bırak:** Satın alınan birim önce yedeğe düşer (sol panel, dükkânın altında). Oyuncu sürükleyerek sahaya dizer / yerini değiştirir / istediği zaman yedeğe alır / satar. Konum önemlidir: tankı öne, kırılganları/şifacıyı arkaya.
- **Düşman önizlemesi + tekrar deneme:** Her turun düşman dalgası planlama safhasında **soluk** olarak gösterilir; oyuncu dizilişini ona göre kurar. Savaş kaybedilirse tur ilerlemez — bir can gider ve **aynı dalga** tekrar oynanır (öğren, dizilişini değiştir, yen). Can biterse oyun biter.

**Bilinçli tasarım duruşu:** DD'nin gerilimi varyanstan (stress/krit/isabet) gelir; biz **deterministik** kaldık. Derinlik *sistemlerden* gelir (pozisyon, yıpranma, saha limiti, şifa), zardan değil — "satranç gibi strateji" kimliği korunur.

**Sıradaki adaylar:** yıldız yükseltme (3 birleştir), hedefleme rolleri (taunt/guard + en arkayı vuran suikastçı), zırh + bleed/zehir + stun, eşya/trinket.
