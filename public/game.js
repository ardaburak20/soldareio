// ==========================================
//  SOLDARE.IO - Game Client (v4.0 - Simplified)
// ==========================================
(() => {
  // === Constants ===
  const GRID_SIZE = 100;
  const SOLDIER_RADIUS = 16;
  const BG_COLOR = '#12121f';
  const GRID_COLOR = '#1c1c32';
  
  // === Performance Optimization Settings ===
  const MAX_PARTICLES = 30;
  const MAX_VISIBLE_ENTITIES = 150;
  const CULLING_MARGIN = 300;
  const SKIN_CACHE_LIMIT = 50;
  const MAX_RENDER_FPS = 60;
  const INTERPOLATION_SMOOTHING = 0.2;
  
  // Frame throttling
  let lastRenderTime = 0;
  const minFrameTime = 1000 / MAX_RENDER_FPS;
  
  // Object pools for performance
  const bulletPool = [];
  const soldierPool = [];
  
  function getBulletFromPool() {
    return bulletPool.length > 0 ? bulletPool.pop() : {};
  }
  
  function returnBulletToPool(bullet) {
    if (bulletPool.length < 100) bulletPool.push(bullet);
  }

  // === Weapon Icons - Ultra Realistic ===
  const WEAPON_ICONS = {
    revolver: `
      <svg viewBox="0 0 64 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Simplified Revolver Icon based on reference image -->
        <!-- Barrel - long and thin -->
        <rect x="32" y="18" width="28" height="4" rx="2" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="0.8"/>
        <rect x="33" y="18.5" width="26" height="3" rx="1.5" fill="#a8a8a8"/>
        
        <!-- Cylinder - dark gray drum -->
        <rect x="22" y="15" width="12" height="10" rx="2" fill="#3a3a3a" stroke="#2a2a2a" stroke-width="1"/>
        <rect x="23" y="16" width="10" height="8" rx="1.5" fill="#4a4a4a"/>
        <!-- Cylinder chambers indicator -->
        <line x1="24" y1="17" x2="24" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="26" y1="17" x2="26" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="28" y1="17" x2="28" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="30" y1="17" x2="30" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="32" y1="17" x2="32" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        
        <!-- Frame - connecting piece -->
        <path d="M18 20 L22 20 L22 24 L18 30 L12 30 L12 24 Z" fill="#b8b8b8" stroke="#888888" stroke-width="0.8"/>
        <path d="M13 24 L20 24 L20 26 L13 26 Z" fill="#c8c8c8"/>
        
        <!-- Trigger -->
        <ellipse cx="15" cy="27" rx="1.5" ry="2.5" fill="#5a5a5a" stroke="#3a3a3a" stroke-width="0.6"/>
        
        <!-- Grip - brown/orange wood -->
        <rect x="8" y="25" width="8" height="16" rx="3" fill="#b87850" stroke="#8a5a38" stroke-width="1"/>
        <rect x="9" y="26" width="6" height="14" rx="2.5" fill="#c88860"/>
        <!-- Wood grain lines -->
        <path d="M10 28 Q11 33 10 38" stroke="#a86840" stroke-width="0.6" fill="none"/>
        <path d="M12 28 Q13 33 12 38" stroke="#a86840" stroke-width="0.6" fill="none"/>
        <path d="M14 28 Q13.5 33 14 38" stroke="#a86840" stroke-width="0.6" fill="none"/>
        
        <!-- Hammer -->
        <path d="M20 13 L22 15 L20 17" stroke="#6a6a6a" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `,
    
    ak47: `
      <svg viewBox="0 0 48 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Realistic AK-47 -->
        <rect x="29" y="15.5" width="15" height="2.5" rx="1.2" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="30" y="16" width="13" height="1.5" rx="0.8" fill="#3a3a3a"/>
        <rect x="43" y="14.5" width="3" height="4.5" rx="0.5" fill="#1a1a1a"/>
        <line x1="44" y1="15.5" x2="44" y2="18.5" stroke="#3a3a3a" stroke-width="0.5"/>
        <line x1="45" y1="15.5" x2="45" y2="18.5" stroke="#3a3a3a" stroke-width="0.5"/>
        <rect x="28" y="14" width="12" height="1.2" rx="0.6" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.5"/>
        <rect x="17" y="14" width="15" height="6" rx="1.5" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="18" y="15.5" width="12" height="3" rx="1" fill="#3a3a3a"/>
        <rect x="23" y="14.5" width="5" height="2.5" rx="0.5" fill="#2a2a2a"/>
        <rect x="25" y="18" width="9" height="4" rx="1.5" fill="#8B4513" stroke="#654321" stroke-width="0.7"/>
        <line x1="26" y1="19.5" x2="33" y2="19.5" stroke="#654321" stroke-width="0.4" opacity="0.6"/>
        <line x1="26" y1="20.5" x2="33" y2="20.5" stroke="#654321" stroke-width="0.4" opacity="0.6"/>
        <path d="M26 19 Q28 20 26 21" stroke="#543311" stroke-width="0.5" fill="none"/>
        <rect x="7" y="16" width="11" height="4" rx="2" fill="#8B4513" stroke="#654321" stroke-width="0.7"/>
        <rect x="8" y="17" width="8" height="2" rx="1" fill="#654321" opacity="0.6"/>
        <line x1="8.5" y1="17.5" x2="15" y2="17.5" stroke="#543311" stroke-width="0.5"/>
        <path d="M15 20 L15 28 L17.5 30 L20 28 L20 22 Z" fill="#8B4513" stroke="#654321" stroke-width="0.7"/>
        <rect x="16" y="24" width="3" height="1" rx="0.5" fill="#654321"/>
        <rect x="16" y="26" width="3" height="0.8" rx="0.4" fill="#543311"/>
        <path d="M17 26 Q16 27.5 17 28" stroke="#2a2a2a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M16 24 Q14 26 16 28" stroke="#2a2a2a" stroke-width="1.2" fill="none"/>
        <path d="M18 20 L17 28 Q17 30 19 30.5 L20 30.5 Q22 30 22 28 L21 21 Z" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.7"/>
        <path d="M18.5 22 L18 28 Q18 29 19.5 29.5 L20 29.5 Q21 29 21 28 L20.5 22 Z" fill="#2a2a2a"/>
        <rect x="37" y="13" width="1.5" height="2.5" rx="0.4" fill="#2a2a2a"/>
        <circle cx="37.8" cy="13.5" r="0.5" fill="#3a3a3a"/>
        <rect x="28" y="13" width="2" height="2" rx="0.5" fill="#2a2a2a"/>
      </svg>
    `,
    
    smg: `
      <svg viewBox="0 0 60 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Simplified SMG Icon -->
        <path d="M4 16 L12 12 L12 28 L4 32 Z" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>
        <path d="M6 18 L10 16 L10 26 L6 28 Z" fill="#9a9a9a"/>
        <rect x="12" y="15" width="32" height="10" rx="2" fill="#1a1a1a" stroke="#000000" stroke-width="1"/>
        <rect x="13" y="16" width="30" height="8" rx="1.5" fill="#2a2a2a"/>
        <rect x="44" y="17" width="14" height="6" rx="3" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.8"/>
        <rect x="45" y="18" width="12" height="4" rx="2" fill="#4a4a4a"/>
        <rect x="24" y="25" width="6" height="14" rx="1.5" fill="#1a1a1a" stroke="#000000" stroke-width="0.8"/>
        <rect x="25" y="26" width="4" height="12" rx="1" fill="#2a2a2a"/>
        <path d="M18 25 L18 34 L20 36 L22 34 L22 27 Z" fill="#1a1a1a" stroke="#000000" stroke-width="0.8"/>
        <rect x="19" y="29" width="2" height="1" rx="0.5" fill="#2a2a2a"/>
        <ellipse cx="20" cy="30" rx="1" ry="1.5" fill="#3a3a3a"/>
        <path d="M19 27 Q17 30 19 33" stroke="#1a1a1a" stroke-width="1" fill="none"/>
        <rect x="36" y="25" width="3" height="6" rx="1.5" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.6"/>
      </svg>
    `,
    
    m4: `
      <svg viewBox="0 0 48 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Realistic M4 Carbine -->
        <rect x="27" y="15.5" width="15" height="2.5" rx="1.2" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="28" y="16" width="13" height="1.5" rx="0.8" fill="#3a3a3a"/>
        <rect x="41" y="14.5" width="3.5" height="4.5" rx="0.5" fill="#1a1a1a"/>
        <rect x="41.5" y="15.5" width="2.5" height="2.5" rx="0.3" fill="#333"/>
        <line x1="42" y1="16" x2="43.5" y2="16" stroke="#2a2a2a" stroke-width="0.4"/>
        <rect x="16" y="14" width="14" height="6" rx="1.5" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="17" y="15.5" width="11" height="3" rx="1" fill="#3a3a3a"/>
        <rect x="23" y="14.5" width="4" height="3" rx="0.5" fill="#1a1a1a" opacity="0.9"/>
        <circle cx="25" cy="16" r="0.4" fill="#3a3a3a"/>
        <rect x="24" y="15" width="7" height="5" rx="1" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.6"/>
        <line x1="25" y1="16" x2="30" y2="16" stroke="#2a2a2a" stroke-width="0.4"/>
        <line x1="25" y1="17" x2="30" y2="17" stroke="#2a2a2a" stroke-width="0.4"/>
        <line x1="25" y1="18" x2="30" y2="18" stroke="#2a2a2a" stroke-width="0.4"/>
        <rect x="7" y="15.5" width="10" height="3" rx="1.5" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.6"/>
        <rect x="8" y="16" width="7" height="2" rx="1" fill="#1a1a1a"/>
        <rect x="5" y="16" width="4" height="1.5" rx="0.8" fill="#3a3a3a"/>
        <circle cx="5.5" cy="16.8" r="0.6" fill="#2a2a2a"/>
        <path d="M14 20 L14 27.5 L16.5 29.5 L19 27.5 L19 21.5 Z" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="15" y="23" width="3" height="1" rx="0.5" fill="#1a1a1a"/>
        <rect x="15" y="25" width="3" height="0.8" rx="0.4" fill="#1a1a1a"/>
        <path d="M16 25 Q15 26.5 16 27" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M15 23 Q13 25.5 15 28" stroke="#2a2a2a" stroke-width="1.2" fill="none"/>
        <rect x="17" y="20" width="4" height="9" rx="1.5" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="18" y="22" width="2" height="6" rx="0.8" fill="#2a2a2a"/>
        <rect x="27" y="12" width="6" height="2.5" rx="1" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.6"/>
        <circle cx="30" cy="13.2" r="0.8" fill="#4a9eff" opacity="0.8"/>
        <rect x="28" y="12.5" width="4" height="1.5" rx="0.5" fill="#3a3a3a"/>
        <rect x="36" y="13.5" width="1.5" height="2.5" rx="0.4" fill="#2a2a2a"/>
        <rect x="27" y="13.5" width="1" height="1.5" rx="0.3" fill="#3a3a3a"/>
      </svg>
    `,
    
    minigun: `
      <svg viewBox="0 0 80 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Simplified Minigun Icon -->
        <path d="M8 12 L20 12 L20 36 L8 36 Z" fill="#a8a8a8" stroke="#888888" stroke-width="1"/>
        <path d="M10 16 L18 24 L10 32 Z" fill="#c8c8c8"/>
        <rect x="20" y="12" width="18" height="24" rx="2" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1.2"/>
        <rect x="22" y="14" width="14" height="20" rx="1.5" fill="#6a6a6a"/>
        <path d="M24 16 Q26 20 24 24 Q26 28 24 32" stroke="#c8c8c8" stroke-width="0.8" fill="none"/>
        <path d="M28 16 Q30 20 28 24 Q30 28 28 32" stroke="#c8c8c8" stroke-width="0.8" fill="none"/>
        <path d="M32 16 Q34 20 32 24 Q34 28 32 32" stroke="#c8c8c8" stroke-width="0.8" fill="none"/>
        <rect x="38" y="14" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="18" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="22" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="26" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="30" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="34" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <circle cx="72" cy="15" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="19" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="23" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="27" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="31" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="35" r="1" fill="#5a5a5a"/>
      </svg>
    `
  };
  
  let lastRenderedWeaponIcon = null;
  function updateWeaponIcon(weapon) {
    const displayWeapon = weapon || 'revolver';
    if (displayWeapon === lastRenderedWeaponIcon) return;
    lastRenderedWeaponIcon = displayWeapon;

    const iconContainer = document.getElementById('currentWeaponIcon');
    if (iconContainer && WEAPON_ICONS[displayWeapon]) {
      iconContainer.innerHTML = WEAPON_ICONS[displayWeapon];
    }
    
    const btn = document.getElementById('equipRevolverBtn');
    if (btn) {
      const weaponNames = {
        revolver: 'Revolver', ak47: 'AK-47', smg: 'SMG', m4: 'M4 Carbine', minigun: 'Minigun'
      };
      btn.title = weaponNames[weapon] || 'Current Weapon';
    }
  }

  const I18N = {
    tr: {
      subtitle: "Ordunu kur. Haritaya hükmet.", placeholder: "İsmini gir...", play: "OYNA", playBots: "BOTLARLA OYNA",
      mouse: "Fare", moveAim: "Hareket et & Nişan al", click: "Tıkla", shoot: "Ateş et",
      leaderboard: "🏆 SIRALAMA", reloading: "YENİDEN DOLDUR...", eliminated: "ELENDİN!", soldiers: "asker",
      color: "Renk Seç:", drawSkin: "Askerini Boya (8x8):", clear: "Temizle", eraser: "Silgi",
      customizeBtn: "Skin & Renk Özelleştir", reloadKey: "Şarjör doldurma", killCount: "Öldürme", playersAlive: "Hayatta",
      justColor: "Sadece Renk", drawSkinRadio: "Skin Çiz",
      backToMenu: "Ana Menüye Dön", yourSoldiers: "Askerlerin", yourScore: "Skorun",
      joinRoom: "ODAYA GİR", joinRoomTitle: "ODAYA GİR", roomCodePrompt: "Oda kodunu girin (6 haneli sayı)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "GİR", cancel: "İPTAL",
      muteMusic: "Müziği Kapat", unmuteMusic: "Müziği Aç",
      watchAdBonus: "🎬 REKLAM İZLE: Ödül Al!", adBonusActive: "⚡ REKLAM ÖDÜLÜ AKTİF!"
    },
    en: {
      subtitle: "Build your army. Dominate the map.", placeholder: "Enter name...", play: "PLAY", playBots: "PLAY WITH BOTS",
      mouse: "Mouse", moveAim: "Move & Aim", click: "Click", shoot: "Shoot",
      leaderboard: "🏆 LEADERBOARD", reloading: "RELOADING...", eliminated: "ELIMINATED!", soldiers: "soldiers",
      color: "Color:", drawSkin: "Draw Skin (8x8):", clear: "Clear", eraser: "Eraser",
      customizeBtn: "Customize Skin & Color", reloadKey: "Reload", killCount: "Kills", playersAlive: "Alive",
      justColor: "Just Color", drawSkinRadio: "Draw Skin",
      backToMenu: "Back to Menu", yourSoldiers: "Your Soldiers", yourScore: "Your Score",
      joinRoom: "JOIN ROOM", joinRoomTitle: "JOIN ROOM", roomCodePrompt: "Enter room code (6 digits)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "JOIN", cancel: "CANCEL",
      muteMusic: "Mute Music", unmuteMusic: "Unmute Music",
      watchAdBonus: "🎬 WATCH AD: Get Bonus!", adBonusActive: "⚡ AD BONUS ACTIVE!"
    },
    ru: {
      subtitle: "Создай армию. Доминируй на карте.", placeholder: "Введите имя...", play: "ИГРАТЬ", playBots: "ИГРАТЬ С БОТАМИ",
      mouse: "Мышь", moveAim: "Движение и Прицел", click: "Клик", shoot: "Стрелять",
      leaderboard: "🏆 РЕЙТИНГ", reloading: "ПЕРЕЗАРЯДКА...", eliminated: "ВЫБЫЛ!", soldiers: "солдат",
      color: "Цвет:", drawSkin: "Рисовать скин:", clear: "Очистить", eraser: "Ластик",
      customizeBtn: "Настроить скин и цвет", reloadKey: "Перезарядка", killCount: "Убийства", playersAlive: "Живы",
      justColor: "Только цвет", drawSkinRadio: "Рисовать скин",
      backToMenu: "В меню", yourSoldiers: "Ваши солдаты", yourScore: "Ваш счет",
      joinRoom: "ВОЙТИ В КОМНАТУ", joinRoomTitle: "ВОЙТИ В КОМНАТУ", roomCodePrompt: "Введите код комнаты (6 цифр)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "ВОЙТИ", cancel: "ОТМЕНА",
      muteMusic: "Выкл. музыку", unmuteMusic: "Вкл. музыку",
      watchAdBonus: "🎬 СМОТРЕТЬ РЕКЛАМУ: Бонус!", adBonusActive: "⚡ БОНУС АКТИВЕН!"
    },
    zh: {
      subtitle: "建立你的军队。统治地图。", placeholder: "输入名字...", play: "开始游戏", playBots: "与机器人玩",
      mouse: "鼠标", moveAim: "移动与瞄准", click: "点击", shoot: "射击",
      leaderboard: "🏆 排行榜", reloading: "重新装弹...", eliminated: "被淘汰！", soldiers: "士兵",
      color: "颜色:", drawSkin: "画皮肤(8x8):", clear: "清除", eraser: "橡皮擦",
      customizeBtn: "自定义皮肤和颜色", reloadKey: "重新装弹", killCount: "击杀", playersAlive: "存活",
      justColor: "仅颜色", drawSkinRadio: "画皮肤",
      backToMenu: "返回菜单", yourSoldiers: "你的士兵", yourScore: "你的得分",
      joinRoom: "加入房间", joinRoomTitle: "加入房间", roomCodePrompt: "输入房间代码 (6位数字)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "加入", cancel: "取消",
      muteMusic: "静音音乐", unmuteMusic: "开启音乐",
      watchAdBonus: "🎬 观看广告: 获得奖励!", adBonusActive: "⚡ 奖励已激活!"
    },
    de: {
      subtitle: "Baue deine Armee auf. Beherrsche die Karte.", placeholder: "Name eingeben...", play: "SPIELEN", playBots: "MIT BOTS SPIELEN",
      mouse: "Maus", moveAim: "Bewegen & Zielen", click: "Klick", shoot: "Schießen",
      leaderboard: "🏆 BESTENLISTE", reloading: "NACHLADEN...", eliminated: "ELIMINIERT!", soldiers: "Soldaten",
      color: "Farbe:", drawSkin: "Skin zeichnen:", clear: "Klar", eraser: "Radiergummi",
      customizeBtn: "Skin & Farbe anpassen", reloadKey: "Nachladen", killCount: "Kills", playersAlive: "Lebend",
      justColor: "Nur Farbe", drawSkinRadio: "Skin zeichnen",
      backToMenu: "Zurück zum Menü", yourSoldiers: "Deine Soldaten", yourScore: "Dein Punktestand",
      joinRoom: "RAUM BEITRETEN", joinRoomTitle: "RAUM BEITRETEN", roomCodePrompt: "Raumcode eingeben (6 Ziffern)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "BEITRETEN", cancel: "ABBRECHEN",
      muteMusic: "Musik aus", unmuteMusic: "Musik an",
      watchAdBonus: "🎬 WERBUNG ANSEHEN: Bonus!", adBonusActive: "⚡ BONUS AKTIV!"
    },
    fr: {
      subtitle: "Construisez votre armée. Dominez la carte.", placeholder: "Entrez votre nom...", play: "JOUER", playBots: "JOUER AVEC BOTS",
      mouse: "Souris", moveAim: "Bouger & Viser", click: "Clic", shoot: "Tirer",
      leaderboard: "🏆 CLASSEMENT", reloading: "RECHARGEMENT...", eliminated: "ÉLIMINÉ!", soldiers: "soldats",
      color: "Couleur:", drawSkin: "Dessiner la peau:", clear: "Effacer", eraser: "Gomme",
      customizeBtn: "Personnaliser la peau et la couleur", reloadKey: "Recharger", killCount: "Tués", playersAlive: "En vie",
      justColor: "Juste couleur", drawSkinRadio: "Dessiner la peau",
      backToMenu: "Retour au menu", yourSoldiers: "Vos soldats", yourScore: "Votre score",
      joinRoom: "REJOINDRE SALLE", joinRoomTitle: "REJOINDRE SALLE", roomCodePrompt: "Entrez le code de la salle (6 chiffres)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "REJOINDRE", cancel: "ANNULER",
      muteMusic: "Couper musique", unmuteMusic: "Activer musique",
      watchAdBonus: "🎬 REGARDER PUB: Bonus!", adBonusActive: "⚡ BONUS ACTIF!"
    }
  };

  let currentLang = 'en';

  // === Canvas ===
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
    willReadFrequently: false
  });

  // === DOM Elements ===
  const startScreen = document.getElementById('startScreen');
  const nameInput = document.getElementById('nameInput');
  const playBtn = document.getElementById('playBtn');
  const playBotsBtn = document.getElementById('playBotsBtn');
  const leaderboardEl = document.getElementById('leaderboard');
  const lbList = document.getElementById('lbList');
  const weaponHud = document.getElementById('weaponHud');
  const bottomRightHud = document.getElementById('bottomRightHud');
  const weaponSlotsHud = document.getElementById('weaponSlotsHud');
  const weaponNameEl = document.getElementById('weaponName');
  const ammoFill = document.getElementById('ammoFill');
  const ammoText = document.getElementById('ammoText');
  const reloadIndicator = document.getElementById('reloadIndicator');
  const weaponTimerEl = document.getElementById('weaponTimer');
  const shieldHud = document.getElementById('shieldHud');
  const shieldTimerEl = document.getElementById('shieldTimer');
  const eliminatedOverlay = document.getElementById('eliminatedOverlay');
  const soldierCountEl = document.getElementById('soldierCount');
  const myCountEl = document.getElementById('myCount');
  const langSelect = document.getElementById('langSelect');
  const colorPalette = document.getElementById('colorPalette');
  const colorBtns = document.querySelectorAll('.color-btn');
  const toggleCustomBtn = document.getElementById('toggleCustomBtn');
  const customizationPanel = document.getElementById('customizationPanel');
  const equipRevolverBtn = document.getElementById('equipRevolverBtn');
  const storedPickupBadge = document.getElementById('storedPickupBadge');
  
  const topCenterHud = document.getElementById('topCenterHud');
  const topKillsVal = document.getElementById('topKillsVal');
  const topAliveVal = document.getElementById('topAliveVal');
  const deathKillsVal = document.getElementById('deathKillsVal');
  const deathMaxSoldiersVal = document.getElementById('deathMaxSoldiersVal');
  const deathSoldierScoreVal = document.getElementById('deathSoldierScoreVal');
  
  const deathScreen = document.getElementById('deathScreen');
  const respawnBtn = document.getElementById('respawnBtn');
  const backToMenuBtn = document.getElementById('backToMenuBtn');
  const deathNameInput = document.getElementById('deathNameInput');
  const deathToggleCustomBtn = document.getElementById('deathToggleCustomBtn');
  const deathCustomizationPanel = document.getElementById('deathCustomizationPanel');
  
  const customModeRadios = document.querySelectorAll('input[name="customMode"]');
  const colorModeWrap = document.getElementById('colorModeWrap');
  const skinModeWrap = document.getElementById('skinModeWrap');

  const deathCustomModeRadios = document.querySelectorAll('input[name="deathCustomMode"]');
  const deathColorModeWrap = document.getElementById('deathColorModeWrap');
  const deathSkinModeWrap = document.getElementById('deathSkinModeWrap');

  let selectedColor = null; 
  let selectedPaintColor = '#ff3333';

  toggleCustomBtn.addEventListener('click', () => {
    customizationPanel.classList.toggle('hidden');
  });

  let lastEquipRevolverTime = 0;
  equipRevolverBtn.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastEquipRevolverTime < 300) {
      return;
    }
    lastEquipRevolverTime = now;
    Network.equipRevolver();
  });

  deathToggleCustomBtn.addEventListener('click', () => {
    deathCustomizationPanel.classList.toggle('hidden');
  });

  customModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if(e.target.value === 'color') {
        colorModeWrap.classList.remove('hidden');
        skinModeWrap.classList.add('hidden');
      } else {
        colorModeWrap.classList.add('hidden');
        skinModeWrap.classList.remove('hidden');
      }
    });
  });

  deathCustomModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if(e.target.value === 'color') {
        deathColorModeWrap.classList.remove('hidden');
        deathSkinModeWrap.classList.add('hidden');
      } else {
        deathColorModeWrap.classList.add('hidden');
        deathSkinModeWrap.classList.remove('hidden');
      }
    });
  });

  colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      colorBtns.forEach(b => b.classList.remove('selected'));
      document.querySelectorAll('.color-btn-d').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedColor = e.target.getAttribute('data-color');
    });
  });

  const deathColorBtns = document.querySelectorAll('.color-btn-d');
  deathColorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      deathColorBtns.forEach(b => b.classList.remove('selected'));
      colorBtns.forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedColor = e.target.getAttribute('data-color');
    });
  });

  const paintBtns = document.querySelectorAll('.paint-btn');
  const deathPaintBtns = document.querySelectorAll('.paint-btn-d');

  function updatePaintSelection(colorStr, targetBtn) {
    paintBtns.forEach(b => b.classList.remove('selected'));
    deathPaintBtns.forEach(b => b.classList.remove('selected'));
    targetBtn.classList.add('selected');
    selectedPaintColor = colorStr;
    useEraser = false;
  }

  paintBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      updatePaintSelection(e.target.getAttribute('data-color'), e.target);
    });
  });

  deathPaintBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      updatePaintSelection(e.target.getAttribute('data-color'), e.target);
    });
  });

  // === Pixel Editor ===
  const pEditCanvas = document.getElementById('pixelEditor');
  const pEditCtx = pEditCanvas.getContext('2d');
  const deathPEditCanvas = document.getElementById('deathPixelEditor');
  const deathPEditCtx = deathPEditCanvas.getContext('2d');
  
  const PIXEL_RES = 8;
  const PIXEL_SIZE = pEditCanvas.width / PIXEL_RES;
  let skinData = new Array(PIXEL_RES * PIXEL_RES).fill('#ffffff');
  let isDrawingSkin = false;
  let useEraser = false;

  function drawPixelEditor() {
    [ {ctx: pEditCtx, canvas: pEditCanvas}, {ctx: deathPEditCtx, canvas: deathPEditCanvas} ].forEach(({ctx, canvas}) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      for(let i=0; i<=PIXEL_RES; i++) {
        ctx.beginPath(); ctx.moveTo(i*PIXEL_SIZE, 0); ctx.lineTo(i*PIXEL_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*PIXEL_SIZE); ctx.lineTo(canvas.width, i*PIXEL_SIZE); ctx.stroke();
      }
      for(let i=0; i<skinData.length; i++) {
        if(skinData[i]) {
          const x = (i % PIXEL_RES) * PIXEL_SIZE;
          const y = Math.floor(i / PIXEL_RES) * PIXEL_SIZE;
          ctx.fillStyle = skinData[i];
          ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    });
  }

  function paintPixel(e, canvas) {
    if(!isDrawingSkin) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);
    if(x >= 0 && x < PIXEL_RES && y >= 0 && y < PIXEL_RES) {
      const idx = y * PIXEL_RES + x;
      skinData[idx] = useEraser ? '#ffffff' : selectedPaintColor;
      drawPixelEditor();
    }
  }

  pEditCanvas.addEventListener('mousedown', (e) => { isDrawingSkin = true; paintPixel(e, pEditCanvas); });
  pEditCanvas.addEventListener('mousemove', (e) => paintPixel(e, pEditCanvas));
  
  deathPEditCanvas.addEventListener('mousedown', (e) => { isDrawingSkin = true; paintPixel(e, deathPEditCanvas); });
  deathPEditCanvas.addEventListener('mousemove', (e) => paintPixel(e, deathPEditCanvas));

  window.addEventListener('mouseup', () => { isDrawingSkin = false; });

  document.getElementById('clearSkinBtn').addEventListener('click', () => {
    skinData.fill('#ffffff');
    drawPixelEditor();
  });
  document.getElementById('deathClearSkinBtn').addEventListener('click', () => {
    skinData.fill('#ffffff');
    drawPixelEditor();
  });

  function toggleEraser(e) {
    useEraser = !useEraser;
    const bg = useEraser ? 'rgba(255,255,255,0.4)' : '';
    document.getElementById('eraserSkinBtn').style.background = bg;
    document.getElementById('deathEraserSkinBtn').style.background = bg;
  }
  document.getElementById('eraserSkinBtn').addEventListener('click', toggleEraser);
  document.getElementById('deathEraserSkinBtn').addEventListener('click', toggleEraser);

  drawPixelEditor(); // Init

  // Cache generated skin canvases
  const skinCanvasCache = {};
  let skinCacheSize = 0;

  function getSkinCanvas(playerId, skinArray) {
    if(!skinArray || skinArray.every(p => p === null)) return null;
    if(skinCanvasCache[playerId]) return skinCanvasCache[playerId];
    
    if (skinCacheSize >= SKIN_CACHE_LIMIT) {
      const oldestKey = Object.keys(skinCanvasCache)[0];
      delete skinCanvasCache[oldestKey];
      skinCacheSize--;
    }
    
    const size = 32;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const cx = c.getContext('2d', { alpha: true, willReadFrequently: false });

    // Apply circular mask once during creation
    cx.beginPath();
    cx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    cx.clip();

    const pSize = size / PIXEL_RES;
    for(let i=0; i<skinArray.length; i++) {
      if(skinArray[i]) {
        const x = (i % PIXEL_RES) * pSize;
        const y = Math.floor(i / PIXEL_RES) * pSize;
        cx.fillStyle = skinArray[i];
        cx.fillRect(x, y, pSize, pSize);
      }
    }
    skinCanvasCache[playerId] = c;
    skinCacheSize++;
    return c;
  }

  // === State ===
  let playing = false;
  let gameState = null;
  let camera = { x: 5000, y: 5000 };
  let isCameraSnapped = false;
  let isCurrentGameBotMatch = false;
  let zoom = 1.0;
  let mouseScreen = { x: 0, y: 0 };
  let smoothPositions = {};
  let lastTime = 0;
  let eliminatedTimer = 0;
  let isMouseDown = false;
  let isMobileFireActive = false;
  let lastRevolverAmmo = undefined;

  // === Mobile Detection ===
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);

  // === Sound Manager ===
  const SoundManager = (() => {
    const mainThemeAudio = new Audio(encodeURI('/sounds/soldare io main theme.mp3'));
    mainThemeAudio.loop = true;
    mainThemeAudio.volume = 0.45;

    const revolverAudio = new Audio(encodeURI('/sounds/revolver.wav'));
    revolverAudio.volume = 0.6;

    const revolverReloadAudio = new Audio(encodeURI('/sounds/revolver reload.wav'));
    revolverReloadAudio.volume = 0.7;

    const revolverReloadFinishAudio = new Audio(encodeURI('/sounds/revolver reload finish.wav'));
    revolverReloadFinishAudio.volume = 0.7;

    const autoReloadAudio = new Audio(encodeURI('/sounds/smg m4 ak47 reload.mp3'));
    autoReloadAudio.volume = 0.7;

    const autoEndAudio = new Audio(encodeURI('/sounds/smg m4 ak47 end.wav'));
    autoEndAudio.volume = 0.6;

    const minigunEndAudio = new Audio(encodeURI('/sounds/minigun end.wav'));
    minigunEndAudio.volume = 0.48;

    // Web Audio API for continuous gapless looping
    let audioCtx = null;
    let autoBuffer = null;
    let minigunBuffer = null;
    let autoSource = null;
    let minigunSource = null;

    let isAutoFiring = false;
    let isMinigunFiring = false;
    let isMainThemePlaying = false;
    let hasInteracted = false;
    let isMuted = false;

    let revolverReloadTimers = [];
    let isRevolverReloadingSound = false;
    let revolverReloadStartTime = 0;
    let revolverStartAmmo = 0;
    let revolverMissingCount = 0;
    let revolverIsInterrupting = false;
    let lastReloadState = false;
    let lastPlayerAmmo = undefined;
    let lastPlayerWeapon = undefined;

    function getAudioContext() {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    function loadBuffer(url, callback) {
      fetch(encodeURI(url))
        .then(r => r.arrayBuffer())
        .then(buf => {
          const ctx = getAudioContext();
          if (ctx) {
            ctx.decodeAudioData(buf, (decoded) => {
              callback(decoded);
            }, () => {});
          }
        })
        .catch(() => {});
    }

    loadBuffer('/sounds/smg m4 ak47 fire.wav', b => { autoBuffer = b; });
    loadBuffer('/sounds/minigun fire.wav', b => { minigunBuffer = b; });

    // HTML5 audio fallbacks
    const autoFireAudio = new Audio(encodeURI('/sounds/smg m4 ak47 fire.wav'));
    autoFireAudio.loop = true;
    autoFireAudio.volume = 0.6;

    const minigunFireAudio = new Audio(encodeURI('/sounds/minigun fire.wav'));
    minigunFireAudio.loop = true;
    minigunFireAudio.volume = 0.48;

    function initInteraction() {
      if (!hasInteracted) {
        hasInteracted = true;
        getAudioContext();
        if (!playing && !isMainThemePlaying && !isMuted) {
          playMainTheme();
        }
      }
    }

    function toggleMute() {
      isMuted = !isMuted;
      if (isMuted) {
        mainThemeAudio.pause();
        isMainThemePlaying = false;
        stopAllWeaponSounds();
      } else {
        if (!playing) {
          playMainTheme();
        }
      }
      updateMuteButtonUI();
      return isMuted;
    }

    function updateMuteButtonUI() {
      const muteIcon = document.getElementById('muteIcon');
      const muteText = document.getElementById('muteText');
      const dict = I18N[currentLang] || I18N.tr;
      if (isMuted) {
        if (muteIcon) muteIcon.textContent = '🔇';
        if (muteText) muteText.textContent = dict.unmuteMusic || 'Müziği Aç';
      } else {
        if (muteIcon) muteIcon.textContent = '🔊';
        if (muteText) muteText.textContent = dict.muteMusic || 'Müziği Kapat';
      }
    }

    function playMainTheme() {
      if (isMuted) return;
      mainThemeAudio.currentTime = 0;
      mainThemeAudio.play().then(() => {
        isMainThemePlaying = true;
      }).catch(() => {
        isMainThemePlaying = false;
      });
    }

    function stopMainTheme() {
      mainThemeAudio.pause();
      mainThemeAudio.currentTime = 0;
      isMainThemePlaying = false;
    }

    function playRevolver() {
      if (isMuted) return;
      try {
        const clone = revolverAudio.cloneNode();
        clone.volume = 0.6;
        clone.play().catch(() => {});
      } catch (e) {}
    }

    function clearRevolverReloadSequence() {
      revolverReloadTimers.forEach(t => clearTimeout(t));
      revolverReloadTimers = [];
      isRevolverReloadingSound = false;
      revolverIsInterrupting = false;
    }

    function playRevolverReloadSequence(startAmmo, missingCount) {
      clearRevolverReloadSequence();
      if (isMuted) return;
      isRevolverReloadingSound = true;
      revolverIsInterrupting = false;
      revolverReloadStartTime = Date.now();
      revolverStartAmmo = startAmmo;
      const count = Math.max(1, Math.min(6, missingCount));
      revolverMissingCount = count;
      
      const ammoTextEl = document.getElementById('ammoText');
      const ammoFillEl = document.getElementById('ammoFill');

      // Play 'revolver reload.wav' once for each missing bullet (0.4s each)
      for (let i = 0; i < count; i++) {
        const delay = i * 400; // 0.4s per bullet
        const timer1 = setTimeout(() => {
          if (!isRevolverReloadingSound || isMuted || revolverIsInterrupting) return;
          try {
            const clone = revolverReloadAudio.cloneNode();
            clone.volume = 0.75;
            clone.play().catch(() => {});
          } catch (e) {}
        }, delay);
        revolverReloadTimers.push(timer1);

        // Update ammo display after each bullet is inserted (at (i+1)*400ms)
        const stepAmmo = Math.min(6, startAmmo + i + 1);
        const timer2 = setTimeout(() => {
          if (!isRevolverReloadingSound || isMuted || revolverIsInterrupting) return;
          if (ammoTextEl) ammoTextEl.textContent = `${stepAmmo} / 6`;
          if (ammoFillEl) {
            const pct = Math.round((stepAmmo / 6) * 100);
            ammoFillEl.style.width = `${pct}%`;
          }
        }, (i + 1) * 400);
        revolverReloadTimers.push(timer2);
      }

      // After all missing bullets are inserted, play 'revolver reload finish.wav' (0.5s)
      const finishDelay = count * 400;
      const finishTimer = setTimeout(() => {
        if (!isRevolverReloadingSound || isMuted || revolverIsInterrupting) return;
        try {
          const clone = revolverReloadFinishAudio.cloneNode();
          clone.volume = 0.75;
          clone.play().catch(() => {});
        } catch (e) {}
        isRevolverReloadingSound = false;
      }, finishDelay);
      revolverReloadTimers.push(finishTimer);
    }

    function interruptRevolverReload() {
      if (!isRevolverReloadingSound || revolverIsInterrupting) return;
      revolverIsInterrupting = true;
      const dt = Date.now() - revolverReloadStartTime;
      const bulletsDone = Math.min(revolverMissingCount, Math.floor(dt / 400));
      
      // Clear all scheduled timers after current bullet
      revolverReloadTimers.forEach(t => clearTimeout(t));
      revolverReloadTimers = [];

      const currentBulletFinishDelay = Math.max(0, (bulletsDone + 1) * 400 - dt);
      const finalAmmo = Math.min(6, revolverStartAmmo + bulletsDone + 1);
      
      const ammoTextEl = document.getElementById('ammoText');
      const ammoFillEl = document.getElementById('ammoFill');

      const finishTimer = setTimeout(() => {
        if (ammoTextEl) ammoTextEl.textContent = `${finalAmmo} / 6`;
        if (ammoFillEl) {
          const pct = Math.round((finalAmmo / 6) * 100);
          ammoFillEl.style.width = `${pct}%`;
        }
        if (!isMuted) {
          try {
            const clone = revolverReloadFinishAudio.cloneNode();
            clone.volume = 0.75;
            clone.play().catch(() => {});
          } catch (e) {}
        }
        isRevolverReloadingSound = false;
        revolverIsInterrupting = false;
      }, currentBulletFinishDelay);
      revolverReloadTimers.push(finishTimer);
    }

    function playAutoReloadSound() {
      if (isMuted) return;
      try {
        const clone = autoReloadAudio.cloneNode();
        clone.volume = 0.75;
        clone.play().catch(() => {});
      } catch (e) {}
    }

    function startAutoFire() {
      if (isMuted || isAutoFiring) return;
      isAutoFiring = true;
      const ctx = getAudioContext();
      if (ctx && autoBuffer) {
        stopAutoSourceNode();
        autoSource = ctx.createBufferSource();
        autoSource.buffer = autoBuffer;
        autoSource.loop = true;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.6;
        autoSource.connect(gainNode);
        gainNode.connect(ctx.destination);
        autoSource.start(0);
      } else {
        autoFireAudio.currentTime = 0;
        autoFireAudio.play().catch(() => {});
      }
    }

    function stopAutoFire(playEndSound = false) {
      if (isAutoFiring) {
        isAutoFiring = false;
        stopAutoSourceNode();
        if (playEndSound && !isMuted) {
          try {
            const clone = autoEndAudio.cloneNode();
            clone.volume = 0.6;
            clone.play().catch(() => {});
          } catch (e) {}
        }
      }
    }

    function stopAutoSourceNode() {
      if (autoSource) {
        try {
          autoSource.stop();
          autoSource.disconnect();
        } catch (e) {}
        autoSource = null;
      }
      autoFireAudio.pause();
      autoFireAudio.currentTime = 0;
    }

    function startMinigunFire() {
      if (isMuted || isMinigunFiring) return;
      isMinigunFiring = true;
      const ctx = getAudioContext();
      if (ctx && minigunBuffer) {
        stopMinigunSourceNode();
        minigunSource = ctx.createBufferSource();
        minigunSource.buffer = minigunBuffer;
        minigunSource.loop = true;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.48;
        minigunSource.connect(gainNode);
        gainNode.connect(ctx.destination);
        minigunSource.start(0);
      } else {
        minigunFireAudio.currentTime = 0;
        minigunFireAudio.play().catch(() => {});
      }
    }

    function stopMinigunFire(playEndSound = false) {
      if (isMinigunFiring) {
        isMinigunFiring = false;
        stopMinigunSourceNode();
        if (playEndSound && !isMuted) {
          try {
            const clone = minigunEndAudio.cloneNode();
            clone.volume = 0.48;
            clone.play().catch(() => {});
          } catch (e) {}
        }
      }
    }

    function stopMinigunSourceNode() {
      if (minigunSource) {
        try {
          minigunSource.stop();
          minigunSource.disconnect();
        } catch (e) {}
        minigunSource = null;
      }
      minigunFireAudio.pause();
      minigunFireAudio.currentTime = 0;
    }

    // === Spatial Audio for Other Players ===
    const spatialAudioMap = new Map(); // otherId -> { source, gainNode, weapon }
    const seenBulletIds = new Set();

    function getSpatialVolume(shooterX, shooterY, myX, myY, baseVol = 0.6) {
      const dx = shooterX - myX;
      const dy = shooterY - myY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const viewW = canvas.width / zoom;
      const viewH = canvas.height / zoom;
      const viewDiag = Math.sqrt(viewW * viewW + viewH * viewH) / 2;
      const maxHearDist = viewDiag * 1.2; // 20% larger than normal viewport
      
      if (dist >= maxHearDist) return 0;
      const factor = 1 - (dist / maxHearDist);
      return baseVol * Math.pow(factor, 1.2);
    }

    function updateWeaponSounds(myPlayer, isShootingRequested) {
      if (!myPlayer || !myPlayer.alive || !playing) {
        stopAutoFire(false);
        stopMinigunFire(false);
        clearRevolverReloadSequence();
        stopSpatialAudio();
        lastReloadState = false;
        lastPlayerWeapon = undefined;
        return;
      }

      // === Process Spatial Audio for Other Players (Firing Sounds Only) ===
      if (gameState) {
        const activeOtherShooters = new Set();

        // 1. Single shots (Revolver) from other players
        if (gameState.bullets) {
          for (const b of gameState.bullets) {
            if (b.ownerId !== myPlayer.id && !seenBulletIds.has(b.id)) {
              seenBulletIds.add(b.id);
              if (b.weapon === 'revolver') {
                const vol = getSpatialVolume(b.x, b.y, myPlayer.x, myPlayer.y, 0.5);
                if (vol > 0.02 && !isMuted) {
                  try {
                    const clone = revolverAudio.cloneNode();
                    clone.volume = vol;
                    clone.play().catch(() => {});
                  } catch (e) {}
                }
              }
            }
          }
          if (seenBulletIds.size > 300) {
            const currentIds = new Set(gameState.bullets.map(b => b.id));
            for (const id of seenBulletIds) {
              if (!currentIds.has(id)) seenBulletIds.delete(id);
            }
          }
        }

        // 2. Continuous firing loops for other players (SMG, M4, AK47, Minigun)
        for (const otherId in gameState.players) {
          if (otherId === myPlayer.id) continue;
          const op = gameState.players[otherId];
          if (!op.alive) continue;

          const isAuto = (op.weapon === 'smg' || op.weapon === 'm4' || op.weapon === 'ak47');
          const isMinigun = (op.weapon === 'minigun');
          const isFiring = (isAuto || isMinigun) && op.isShooting && !op.isReloading && op.ammo > 0;

          if (isFiring) {
            const baseVol = isMinigun ? 0.48 : 0.6;
            const vol = getSpatialVolume(op.x, op.y, myPlayer.x, myPlayer.y, baseVol);
            if (vol > 0.02 && !isMuted) {
              activeOtherShooters.add(otherId);
              let entry = spatialAudioMap.get(otherId);
              const ctx = getAudioContext();
              const buffer = isMinigun ? minigunBuffer : autoBuffer;

              if (!entry || entry.weapon !== op.weapon) {
                if (entry) {
                  try { entry.source.stop(); entry.source.disconnect(); } catch(e){}
                }
                if (ctx && buffer) {
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.loop = true;
                  const gainNode = ctx.createGain();
                  gainNode.gain.value = vol;
                  source.connect(gainNode);
                  gainNode.connect(ctx.destination);
                  source.start(0);
                  entry = { source, gainNode, weapon: op.weapon };
                  spatialAudioMap.set(otherId, entry);
                }
              } else if (entry && entry.gainNode) {
                entry.gainNode.gain.value = vol;
              }
            }
          }
        }

        // Clean up spatial loops for players who stopped firing or left range
        for (const [otherId, entry] of spatialAudioMap.entries()) {
          if (!activeOtherShooters.has(otherId)) {
            try { entry.source.stop(); entry.source.disconnect(); } catch(e){}
            spatialAudioMap.delete(otherId);
          }
        }
      }

      const weapon = myPlayer.weapon;
      const isReloading = myPlayer.isReloading;
      const ammo = myPlayer.ammo;

      // Handle Weapon Switch
      if (lastPlayerWeapon !== undefined && lastPlayerWeapon !== weapon) {
        clearRevolverReloadSequence();
        stopAutoFire(false);
        stopMinigunFire(false);
      }

      // Handle Reload Sounds
      if (isReloading && !lastReloadState) {
        stopAutoFire(false);
        stopMinigunFire(false);

        if (weapon === 'revolver') {
          const prevAmmo = (lastPlayerAmmo !== undefined) ? lastPlayerAmmo : ammo;
          const missing = Math.max(1, 6 - prevAmmo);
          playRevolverReloadSequence(prevAmmo, missing);
        } else if (weapon === 'smg' || weapon === 'm4' || weapon === 'ak47') {
          playAutoReloadSound();
        }
      } else if (!isReloading && lastReloadState) {
        clearRevolverReloadSequence();
      }

      lastReloadState = isReloading;
      lastPlayerAmmo = ammo;
      lastPlayerWeapon = weapon;

      // Handle Firing Sounds
      const canShoot = !isReloading && (weapon === 'minigun' || ammo > 0) && isShootingRequested;

      const isAutoWeapon = (weapon === 'smg' || weapon === 'm4' || weapon === 'ak47');
      if (isAutoWeapon && canShoot) {
        startAutoFire();
      } else {
        if (isAutoFiring) {
          stopAutoFire(true);
        }
      }

      const isMinigunWeapon = (weapon === 'minigun');
      if (isMinigunWeapon && canShoot) {
        startMinigunFire();
      } else {
        if (isMinigunFiring) {
          stopMinigunFire(true);
        }
      }
    }

    function stopSpatialAudio() {
      for (const [otherId, entry] of spatialAudioMap.entries()) {
        try { entry.source.stop(); entry.source.disconnect(); } catch(e){}
      }
      spatialAudioMap.clear();
    }

    function stopAllWeaponSounds() {
      stopAutoFire(false);
      stopMinigunFire(false);
      clearRevolverReloadSequence();
      stopSpatialAudio();
    }

    window.addEventListener('click', initInteraction);
    window.addEventListener('keydown', initInteraction);
    window.addEventListener('touchstart', initInteraction);

    return {
      playMainTheme,
      stopMainTheme,
      playRevolver,
      updateWeaponSounds,
      stopAllWeaponSounds,
      interruptRevolverReload,
      initInteraction,
      toggleMute,
      updateMuteButtonUI
    };
  })();
  
  // Viewport culling cache
  let viewportBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  
  function updateViewportBounds() {
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    viewportBounds.left = camera.x - viewW / 2 - CULLING_MARGIN;
    viewportBounds.right = camera.x + viewW / 2 + CULLING_MARGIN;
    viewportBounds.top = camera.y - viewH / 2 - CULLING_MARGIN;
    viewportBounds.bottom = camera.y + viewH / 2 + CULLING_MARGIN;
  }
  
  function isInViewport(x, y) {
    return x >= viewportBounds.left && x <= viewportBounds.right &&
           y >= viewportBounds.top && y <= viewportBounds.bottom;
  }

  // === Update Language ===
  function updateLang() {
    const dict = Object.assign({}, I18N[currentLang]);
    if (isMobile) {
      if (currentLang === 'tr') {
        dict.mouse = "Joystick";
        dict.click = "Ateş Tuşu";
        dict.reloadKey = "Reload Tuşu";
      } else if (currentLang === 'en') {
        dict.mouse = "Joystick";
        dict.click = "Fire Button";
        dict.reloadKey = "Reload Button";
      } else if (currentLang === 'ru') {
        dict.mouse = "Джойстик";
        dict.click = "Кнопка огня";
        dict.reloadKey = "Кнопка перезарядки";
      } else if (currentLang === 'zh') {
        dict.mouse = "摇杆";
        dict.click = "开火按钮";
        dict.reloadKey = "换弹按钮";
      } else if (currentLang === 'de') {
        dict.mouse = "Joystick";
        dict.click = "Feuer-Taste";
        dict.reloadKey = "Nachladen-Taste";
      } else if (currentLang === 'fr') {
        dict.mouse = "Joystick";
        dict.click = "Bouton Tir";
        dict.reloadKey = "Bouton Recharger";
      }
    }
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (dict[el.getAttribute('data-i18n')]) el.textContent = dict[el.getAttribute('data-i18n')];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      if (dict[el.getAttribute('data-i18n-ph')]) el.placeholder = dict[el.getAttribute('data-i18n-ph')];
    });
    SoundManager.updateMuteButtonUI();
  }
  langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    updateLang();
  });
  
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      SoundManager.toggleMute();
    });
  }
  
  updateLang();

  // === Pickup / Weapon visuals ===
  const PICKUP_STYLES = {
    smg:     { color: '#42a5f5', label: 'SMG' },
    m4:      { color: '#66bb6a', label: 'M4' },
    ak47:    { color: '#ff7043', label: 'AK-47' },
    minigun: { color: '#ef5350', label: 'MINIGUN' },
    shield:  { color: '#26c6da', label: 'SHIELD' }
  };

  function drawWeaponIcon(ctx, type, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size/20, size/20);
    ctx.fillStyle = '#fff';
    if (type === 'smg') {
      ctx.fillRect(-8, -4, 16, 6);
      ctx.fillRect(-2, 2, 4, 8);
      ctx.fillRect(-8, 2, 3, 6);
    } else if (type === 'm4') {
      ctx.fillRect(-10, -3, 20, 5);
      ctx.fillRect(-10, -5, 6, 2);
      ctx.fillRect(0, 2, 4, 7);
      ctx.fillRect(-6, 2, 3, 5);
    } else if (type === 'ak47') {
      ctx.fillStyle = '#e5a059'; 
      ctx.fillRect(-12, -4, 6, 4); 
      ctx.fillRect(4, -4, 8, 3);   
      ctx.fillStyle = '#bbb';
      ctx.fillRect(-6, -4, 10, 5); 
      ctx.fillRect(0, 1, 4, 8);    
      ctx.fillRect(-4, 1, 3, 5);   
      ctx.fillRect(12, -4, 8, 2);  
    } else if (type === 'minigun') {
      ctx.fillStyle = '#555';
      ctx.fillRect(-10, -6, 12, 12); 
      ctx.fillStyle = '#888';
      ctx.fillRect(2, -4, 14, 2); 
      ctx.fillRect(2, 0, 14, 2);  
      ctx.fillRect(2, 4, 14, 2);  
      ctx.fillStyle = '#333';
      ctx.fillRect(-4, -10, 4, 4); 
      ctx.fillRect(-4, 6, 4, 6); 
    } else if (type === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(8, -6);
      ctx.lineTo(8, 4);
      ctx.lineTo(0, 12);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-8, -6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // === Resize ===
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  let smoothPositionsCount = 0;
  function smooth(key, tx, ty, factor) {
    if (!smoothPositions[key]) {
      smoothPositionsCount++;
      if (smoothPositionsCount > 1500) {
        smoothPositions = {};
        smoothPositionsCount = 0;
      }
      smoothPositions[key] = { x: tx, y: ty };
    }
    const p = smoothPositions[key];
    p.x += (tx - p.x) * (factor * 1.5);
    p.y += (ty - p.y) * (factor * 1.5);
    return p;
  }

  function drawCircle(sx, sy, r, fill, stroke, lineW) {
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineW || 1.5; ctx.stroke(); }
  }

  function hexToRgba(hex, a) {
    if(!hex) return 'rgba(255,255,255,1)';
    if (hex.startsWith('hsl')) return hex.replace(')', `,${a})`).replace('hsl', 'hsla');
    const r = parseInt(hex.slice(1, 3), 16) || 255;
    const g = parseInt(hex.slice(3, 5), 16) || 255;
    const b = parseInt(hex.slice(5, 7), 16) || 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  // === Draw Grid ===
  function drawGrid() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);

    const mapSize = Network.getMapSize();
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    const left = camera.x - viewW / 2;
    const top = camera.y - viewH / 2;
    const right = left + viewW;
    const bottom = top + viewH;

    const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = startX; x <= right + GRID_SIZE; x += GRID_SIZE) {
      ctx.moveTo(x, top - 100);
      ctx.lineTo(x, bottom + 100);
    }
    for (let y = startY; y <= bottom + GRID_SIZE; y += GRID_SIZE) {
      ctx.moveTo(left - 100, y);
      ctx.lineTo(right + 100, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, mapSize, mapSize);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    if (left < 0) ctx.fillRect(left-100, top-100, -left+100, viewH+200);
    if (top < 0) ctx.fillRect(left-100, top-100, viewW+200, -top+100);
    if (right > mapSize) ctx.fillRect(mapSize, top-100, right-mapSize+100, viewH+200);
    if (bottom > mapSize) ctx.fillRect(left-100, mapSize, viewW+200, bottom-mapSize+100);

    ctx.restore();
  }

  function runInWorld(renderFn) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    renderFn();
    ctx.restore();
  }

  function calculateScaleLevel(score) {
    if (score >= 250) return 14;
    if (score >= 200) return 13;
    if (score >= 150) return 12;
    if (score >= 120) return 11;
    if (score >= 100) return 10;
    return Math.floor(score / 10);
  }

  // === Draw Entities ===
  function drawPickups() {
    if (!gameState) return;
    const time = Date.now() / 1000;
    
    const myId = Network.getId();
    const me = gameState.players[myId];
    let pickupScale = 1.0;
    if (me) {
      pickupScale = Math.pow(1.1, calculateScaleLevel(me.score));
    }

    for (const pk of gameState.pickups) {
      if (!isInViewport(pk.x, pk.y)) continue;
      
      const style = PICKUP_STYLES[pk.type] || PICKUP_STYLES.smg;
      const pulse = 1 + Math.sin(time * 3 + pk.id) * 0.12;
      const finalScale = pulse * pickupScale;

      drawCircle(pk.x, pk.y, 35 * finalScale, hexToRgba(style.color, 0.15), null);
      drawCircle(pk.x, pk.y, 22 * finalScale, hexToRgba(style.color, 0.3), style.color, 2 * pickupScale);
      drawWeaponIcon(ctx, pk.type, pk.x, pk.y, 20 * finalScale);

      ctx.font = '700 12px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = style.color;
      ctx.fillText(style.label, pk.x, pk.y + 32 * pickupScale);
    }
  }

  function drawNeutrals() {
    if (!gameState) return;
    for (const ns of gameState.neutrals) {
      if (!isInViewport(ns.x, ns.y)) continue;
      
      const pos = smooth(`n_${ns.id}`, ns.x, ns.y, 0.3);
      drawCircle(pos.x, pos.y, SOLDIER_RADIUS, '#d0d0d0', '#aaa', 1.5);
      if (ns.cs) {
        ctx.strokeStyle = '#ffd740';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pos.x + SOLDIER_RADIUS - 2, pos.y);
        ctx.lineTo(pos.x + SOLDIER_RADIUS + 8, pos.y);
        ctx.stroke();
      }
    }
  }

  function drawSoldierUnit(sx, sy, color, canShoot, isMain, angle, skinCanvas) {
    const r = SOLDIER_RADIUS;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(sx, sy + r * 0.5, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    drawCircle(sx, sy, r, color, isMain ? '#fff' : hexToRgba('#000', 0.4), isMain ? 2 : 1.5);

    if (skinCanvas) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(skinCanvas, -r, -r, r * 2, r * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(sx - r * 0.2, sy - r * 0.2, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    if (canShoot || isMain) {
      const a = angle || 0;
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * (r - 2), sy + Math.sin(a) * (r - 2));
      ctx.lineTo(sx + Math.cos(a) * (r + 10), sy + Math.sin(a) * (r + 10));
      ctx.stroke();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawPlayers() {
    if (!gameState) return;
    const myId = Network.getId();
    const playerIds = Object.keys(gameState.players);
    const sortedIds = playerIds.filter(id => id !== myId).concat(playerIds.filter(id => id === myId));

    for (const id of sortedIds) {
      const p = gameState.players[id];
      if (!p.alive) continue;

      const isMe = id === myId;
      const pos = smooth(`p_${id}`, p.x, p.y, isMe ? 0.35 : 0.2);
      const angle = p.angle || 0;
      const skinCnv = getSkinCanvas(id, p.skin);

      // Shield effect
      if (p.shieldActive) {
        const time = Date.now() / 1000;
        const shieldR = SOLDIER_RADIUS + 30 + p.soldiers.length * 4;
        const pulse = 1 + Math.sin(time * 4) * 0.05;

        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(time * 3) * 0.05;
        const shieldGrad = ctx.createRadialGradient(pos.x, pos.y, shieldR * 0.5, pos.x, pos.y, shieldR * pulse);
        shieldGrad.addColorStop(0, 'rgba(38, 198, 218, 0.05)');
        shieldGrad.addColorStop(0.8, 'rgba(38, 198, 218, 0.25)');
        shieldGrad.addColorStop(1, 'rgba(38, 198, 218, 0)');
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, shieldR * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(38, 198, 218, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // Draw swarm soldiers with Viewport Culling
      for (let i = 0; i < p.soldiers.length; i++) {
        const sol = p.soldiers[i];
        if (!isInViewport(sol.x, sol.y)) continue;

        const solPos = smooth(`s_${id}_${i}`, sol.x, sol.y, 0.25);
        const solAngle = Math.atan2(pos.y - sol.y, pos.x - sol.x);
        drawSoldierUnit(solPos.x, solPos.y, p.color, sol.cs, false, sol.cs ? angle : solAngle, skinCnv);
      }

      // Draw main soldier
      if (isInViewport(pos.x, pos.y)) {
        drawSoldierUnit(pos.x, pos.y, p.color, true, true, angle, skinCnv);
      }

      // Name tag
      ctx.font = '800 16px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const nameText = `${p.name} [${p.score}]`;
      const nameW = ctx.measureText(nameText).width + 16;
      const nameY = pos.y - SOLDIER_RADIUS - 16;
      
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, pos.x - nameW / 2, nameY - 18, nameW, 22, 6);
      ctx.fill();
      ctx.fillStyle = isMe ? '#4fc3f7' : '#fff';
      ctx.fillText(nameText, pos.x, nameY + 2);
    }
  }

  function drawBullets() {
    if (!gameState || !gameState.bullets || gameState.bullets.length === 0) return;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < gameState.bullets.length; i++) {
      const b = gameState.bullets[i];
      if (!isInViewport(b.x, b.y)) continue;
      ctx.moveTo(b.x + 3.5, b.y);
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    }
    ctx.fill();

    for (let i = 0; i < gameState.bullets.length; i++) {
      const b = gameState.bullets[i];
      if (!isInViewport(b.x, b.y)) continue;
      ctx.strokeStyle = b.c || '#4fc3f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawAimLine() {
    if (!gameState) return;
    const myId = Network.getId();
    const me = gameState.players[myId];
    if (!me || !me.alive) return;

    const pos = smooth(`p_${myId}`, me.x, me.y, 0.35);
    
    let wx, wy;
    
    if (isMobile) {
      // Use virtual mouse position from joystick
      wx = virtualMouseWorld.x;
      wy = virtualMouseWorld.y;
    } else {
      // Use actual mouse position
      wx = (mouseScreen.x - canvas.width / 2) / zoom + camera.x;
      wy = (mouseScreen.y - canvas.height / 2) / zoom + camera.y;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 12]);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(wx, wy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const r = 16;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx - r - 6, wy); ctx.lineTo(wx - r + 4, wy);
    ctx.moveTo(wx + r - 4, wy); ctx.lineTo(wx + r + 6, wy);
    ctx.moveTo(wx, wy - r - 6); ctx.lineTo(wx, wy - r + 4);
    ctx.moveTo(wx, wy + r - 4); ctx.lineTo(wx, wy + r + 6);
    ctx.stroke();
  }

  // === HUD Update ===
  let lastLbCache = '';
  const hudCache = {};
  function updateHUD() {
    if (!gameState) return;
    const myId = Network.getId();
    const me = gameState.players[myId];
    if (!me) return;

    const lbCacheKey = JSON.stringify(gameState.leaderboard) + '_' + me.name;
    if (lbCacheKey !== lastLbCache) {
      lastLbCache = lbCacheKey;
      lbList.innerHTML = '';
      for (let i = 0; i < gameState.leaderboard.length; i++) {
        const entry = gameState.leaderboard[i];
        const row = document.createElement('div');
        row.className = 'lb-row' + (entry.name === me.name ? ' me' : '');
        row.innerHTML = `
          <span class="lb-rank">${i + 1}.</span>
          <span class="lb-color" style="background:${entry.color}"></span>
          <span class="lb-name">${entry.name}</span>
          <span class="lb-score">${entry.score}</span>
        `;
        lbList.appendChild(row);
      }
    }

    const wName = me.weaponName || 'REVOLVER';
    if (hudCache.weaponName !== wName) {
      hudCache.weaponName = wName;
      weaponNameEl.textContent = wName;
    }
    
    // Update weapon icon
    updateWeaponIcon(me.weapon || 'revolver');
    
    const isMinigun = (me.weapon === 'minigun');
    const pct = Math.round((me.ammo / me.maxAmmo) * 100);
    if (hudCache.ammoPct !== pct) {
      hudCache.ammoPct = pct;
      ammoFill.style.width = `${pct}%`;
      if (pct > 50) ammoFill.style.background = 'linear-gradient(90deg, #4fc3f7, #00e676)';
      else if (pct > 20) ammoFill.style.background = 'linear-gradient(90deg, #ffd740, #ff9800)';
      else ammoFill.style.background = 'linear-gradient(90deg, #ff5252, #ff1744)';
    }

    const aText = `${me.ammo} / ${me.maxAmmo}`;
    if (hudCache.ammoText !== aText) {
      hudCache.ammoText = aText;
      ammoText.textContent = aText;
    }

    const isRel = me.isReloading && !isMinigun;
    if (hudCache.isReloading !== isRel) {
      hudCache.isReloading = isRel;
      if (isRel) reloadIndicator.classList.remove('hidden');
      else reloadIndicator.classList.add('hidden');
    }

    const reloadBtn = document.getElementById('reloadButton');
    if (reloadBtn) {
      if (isMinigun) {
        reloadBtn.style.display = 'none';
      } else {
        reloadBtn.style.display = 'flex';
      }
    }

    if (me.weaponTimer > 0 && me.weapon !== 'revolver') {
      const wTimerText = `⏱ ${me.weaponTimer.toFixed(1)}s`;
      if (hudCache.weaponTimerText !== wTimerText) {
        hudCache.weaponTimerText = wTimerText;
        weaponTimerEl.classList.remove('hidden');
        weaponTimerEl.textContent = wTimerText;
      }
    } else if (hudCache.weaponTimerText !== 'hidden') {
      hudCache.weaponTimerText = 'hidden';
      weaponTimerEl.classList.add('hidden');
    }

    if (me.shieldActive) {
      const sTimerText = `${me.shieldTimer.toFixed(1)}s`;
      if (hudCache.shieldTimerText !== sTimerText) {
        hudCache.shieldTimerText = sTimerText;
        shieldHud.classList.remove('hidden');
        shieldTimerEl.textContent = sTimerText;
      }
    } else if (hudCache.shieldTimerText !== 'hidden') {
      hudCache.shieldTimerText = 'hidden';
      shieldHud.classList.add('hidden');
    }

    if (hudCache.myCount !== me.score) {
      hudCache.myCount = me.score;
      myCountEl.textContent = me.score;
    }
    const kills = me.kills || 0;
    if (hudCache.topKills !== kills) {
      hudCache.topKills = kills;
      topKillsVal.textContent = kills;
    }
    const totPlayers = gameState.totalPlayers || 0;
    if (hudCache.topAlive !== totPlayers) {
      hudCache.topAlive = totPlayers;
      topAliveVal.textContent = totPlayers;
    }

    const hasStored = me.hasStoredPickup;
    if (hudCache.hasStored !== hasStored) {
      hudCache.hasStored = hasStored;
      if (hasStored) {
        equipRevolverBtn.classList.add('has-stored');
        storedPickupBadge.classList.remove('hidden');
        storedPickupBadge.textContent = '!';
      } else {
        equipRevolverBtn.classList.remove('has-stored');
        storedPickupBadge.classList.add('hidden');
      }
    }
  }

  function drawMinimap() {
    if (!gameState) return;
    const myId = Network.getId();
    const mapSize = Network.getMapSize();
    const mmSize = isMobile ? 110 : 160;
    const mmPadX = isMobile ? 15 : 20;
    const mmPadY = isMobile ? 90 : 20;
    const mmX = mmPadX;
    const mmY = canvas.height - mmSize - mmPadY;
    const scale = mmSize / mapSize;

    ctx.save();
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    roundRect(ctx, mmX, mmY, mmSize, mmSize, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const id in gameState.players) {
      const p = gameState.players[id];
      if (!p.alive) continue;
      const px = mmX + p.x * scale;
      const py = mmY + p.y * scale;
      const isMe = id === myId;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, isMe ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (isMe) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    const vpX = mmX + (camera.x - viewW/2) * scale;
    const vpY = mmY + (camera.y - viewH/2) * scale;
    const vpW = viewW * scale;
    const vpH = viewH * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
    ctx.restore();
  }

  // === Main Render Loop ===
  let frameCounter = 0;
  let lastCleanupFrame = 0;

  function render(timestamp) {
    if (!gameState) {
      requestAnimationFrame(render);
      return;
    }

    frameCounter++;
    
    // Memory cleanup every 2 seconds
    if (frameCounter - lastCleanupFrame >= 120) {
      const activeKeys = new Set();
      for (const id in gameState.players) {
        activeKeys.add(`p_${id}`);
        for (let i = 0; i < gameState.players[id].soldiers.length; i++) {
          activeKeys.add(`s_${id}_${i}`);
        }
      }
      for (const n of gameState.neutrals) activeKeys.add(`n_${n.id}`);
      for (const b of gameState.bullets) activeKeys.add(`b_${b.id}`);
      
      for (const key in smoothPositions) {
        if (!activeKeys.has(key)) delete smoothPositions[key];
      }
      
      lastCleanupFrame = frameCounter;
    }

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    const myId = Network.getId();
    const me = gameState ? gameState.players[myId] : null;

    if (playing && me && me.alive) {
      if (!isCameraSnapped) {
        camera.x = me.x;
        camera.y = me.y;
        isCameraSnapped = true;
      } else {
        camera.x += (me.x - camera.x) * 0.1;
        camera.y += (me.y - camera.y) * 0.1;
      }
      
      const scaleLevel = calculateScaleLevel(me.score);
      const targetZoom = 1.0 / Math.pow(1.1, scaleLevel);
      zoom += (targetZoom - zoom) * 0.05;

      const isShootingRequested = isMouseDown || isMobileFireActive;

      if (me.weapon === 'revolver') {
        if (lastRevolverAmmo !== undefined && me.ammo < lastRevolverAmmo) {
          SoundManager.playRevolver();
        }
        lastRevolverAmmo = me.ammo;
      } else {
        lastRevolverAmmo = undefined;
      }

      SoundManager.updateWeaponSounds(me, isShootingRequested);
    } else {
      lastRevolverAmmo = undefined;
      SoundManager.stopAllWeaponSounds();
    }
    
    updateViewportBounds();

    if (eliminatedTimer > 0) {
      eliminatedTimer -= dt;
      if (eliminatedTimer <= 0) eliminatedOverlay.classList.add('hidden');
    }

    drawGrid();

    runInWorld(() => {
      drawPickups();
      drawNeutrals();
      drawBullets();
      drawPlayers();
      drawAimLine();
    });

    drawMinimap();
    updateHUD();

    requestAnimationFrame(render);
  }

  // === Mobile Detection & Controls ===
  const mobileControls = document.getElementById('mobileControls');
  const joystickArea = document.getElementById('joystickArea');
  const joystickStick = document.getElementById('joystickStick');
  const fireButton = document.getElementById('fireButton');
  const reloadButton = document.getElementById('reloadButton');
  
  let joystickActive = false;
  let joystickId = null;
  let joystickStartPos = { x: 0, y: 0 };
  let joystickDelta = { x: 0, y: 0 };
  
  // Virtual mouse position for mobile (follows joystick direction)
  let virtualMouseWorld = { x: 5000, y: 5000 };
  
  if (isMobile) {
    console.log('📱 Mobile device detected - touch controls enabled');
    const moveKey = document.getElementById('ctrlMoveKey');
    const shootKey = document.getElementById('ctrlShootKey');
    const reloadKey = document.getElementById('ctrlReloadKey');
    if (moveKey) moveKey.innerHTML = '🕹️ <span data-i18n="mouse">Joystick</span>';
    if (shootKey) shootKey.innerHTML = '🔫 <span data-i18n="click">Ateş Tuşu</span>';
    if (reloadKey) reloadKey.innerHTML = '🔄 <span data-i18n="reloadKey">Reload Tuşu</span>';
    updateLang();
  } else {
    console.log('🖥️ Desktop detected - mouse controls enabled');
  }

  // === Dynamic Joystick Logic ===
  function showJoystickAt(x, y) {
    joystickArea.style.left = (x - 70) + 'px';
    joystickArea.style.top = (y - 70) + 'px';
    joystickArea.classList.add('active');
  }
  
  function hideJoystick() {
    joystickArea.classList.remove('active');
  }

  function handleJoystickStart(e) {
    if (!playing) return;
    
    // Only handle touches on the left half of the screen
    const touch = e.touches[0];
    if (touch.clientX > canvas.width / 2) return;
    
    e.preventDefault();
    joystickActive = true;
    joystickId = touch.identifier;
    joystickStartPos = { x: touch.clientX, y: touch.clientY };
    showJoystickAt(touch.clientX, touch.clientY);
    joystickStick.classList.add('active');
  }

  function handleJoystickMove(e) {
    if (!joystickActive || !playing) return;
    
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === joystickId) {
        e.preventDefault();
        const dx = touch.clientX - joystickStartPos.x;
        const dy = touch.clientY - joystickStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 40;
        
        if (distance > maxDistance) {
          const angle = Math.atan2(dy, dx);
          joystickDelta.x = Math.cos(angle) * maxDistance;
          joystickDelta.y = Math.sin(angle) * maxDistance;
        } else {
          joystickDelta.x = dx;
          joystickDelta.y = dy;
        }
        
        joystickStick.style.transform = `translate(-50%, -50%) translate(${joystickDelta.x}px, ${joystickDelta.y}px)`;
        
        // Update virtual mouse position based on joystick
        if (gameState) {
          const myId = Network.getId();
          const me = gameState.players[myId];
          if (me && me.alive) {
            const magnitude = Math.sqrt(joystickDelta.x * joystickDelta.x + joystickDelta.y * joystickDelta.y);
            if (magnitude > 5) {
              const angle = Math.atan2(joystickDelta.y, joystickDelta.x);
              const distance = 300;
              virtualMouseWorld.x = me.x + Math.cos(angle) * distance;
              virtualMouseWorld.y = me.y + Math.sin(angle) * distance;
            }
          }
        }
        break;
      }
    }
  }

  function handleJoystickEnd(e) {
    if (!joystickActive) return;
    
    let touchStillActive = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickId) {
        touchStillActive = true;
        break;
      }
    }
    
    if (!touchStillActive) {
      joystickActive = false;
      joystickId = null;
      joystickDelta = { x: 0, y: 0 };
      joystickStick.style.transform = 'translate(-50%, -50%)';
      joystickStick.classList.remove('active');
      hideJoystick();
    }
  }

  function handleShootTrigger() {
    if (!gameState) return false;
    const myId = Network.getId();
    const me = gameState.players[myId];
    if (me && me.alive && me.isReloading && me.weapon === 'revolver') {
      Network.cancelRevolverReload();
      SoundManager.interruptRevolverReload();
      return true;
    }
    return false;
  }

  if (isMobile) {
    // Listen for touches on canvas (left half) for joystick
    canvas.addEventListener('touchstart', handleJoystickStart, { passive: false });
    canvas.addEventListener('touchmove', handleJoystickMove, { passive: false });
    canvas.addEventListener('touchend', handleJoystickEnd, { passive: false });
    
    // Fire button
    fireButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!playing) return;
      fireButton.classList.add('active');
      if (handleShootTrigger()) return;
      isMobileFireActive = true;
      Network.clickShoot();
      Network.startShooting();
    });
    
    fireButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      isMobileFireActive = false;
      fireButton.classList.remove('active');
      Network.stopShooting();
    });
    
    // Reload button
    reloadButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!playing) return;
      reloadButton.classList.add('active');
      Network.manualReload();
      setTimeout(() => reloadButton.classList.remove('active'), 200);
    });
  }

  // === Input Handling ===
  let mouseSendInterval = null;

  canvas.addEventListener('mousemove', (e) => {
    if (!isMobile) {
      mouseScreen.x = e.clientX;
      mouseScreen.y = e.clientY;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!isMobile && e.button === 0 && playing) {
      if (handleShootTrigger()) return;
      isMouseDown = true;
      Network.clickShoot();
      Network.startShooting();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!isMobile && e.button === 0 && playing) {
      isMouseDown = false;
      Network.stopShooting();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (!isMobile && playing && (e.key === 'r' || e.key === 'R')) {
      Network.manualReload();
    }
  });

  function sendMousePosition() {
    if (!playing) return;
    
    let wx, wy;
    
    if (isMobile) {
      // Use virtual mouse position from joystick
      wx = virtualMouseWorld.x;
      wy = virtualMouseWorld.y;
    } else {
      // Use actual mouse position
      wx = (mouseScreen.x - canvas.width / 2) / zoom + camera.x;
      wy = (mouseScreen.y - canvas.height / 2) / zoom + camera.y;
    }
    
    Network.sendMouse(wx, wy);
  }

  // === Connect and Setup ===
  Network.connect();

  // === CrazyGames SDK v3 Integration ===
  let crazySDK = null;
  let isCrazySDKActive = false;

  async function initCrazyGamesSDK() {
    try {
      const host = window.location.hostname;
      const isAllowedHost = host.includes('crazygames.com') || host.includes('localhost') || host === '127.0.0.1';
      
      if (isAllowedHost && window.CrazyGames && window.CrazyGames.SDK) {
        crazySDK = window.CrazyGames.SDK;
        await crazySDK.init();
        isCrazySDKActive = true;
        console.log("🎮 CrazyGames SDK v3 initialized successfully");
      } else {
        isCrazySDKActive = false;
        console.log("ℹ️ CrazyGames SDK disabled on this domain (running standalone)");
      }
    } catch (e) {
      isCrazySDKActive = false;
      crazySDK = null;
      console.log("ℹ️ CrazyGames SDK notice: Running standalone on custom domain");
    }
  }
  initCrazyGamesSDK();

  function crazyGameplayStart() {
    if (isCrazySDKActive && crazySDK && crazySDK.game) {
      try { crazySDK.game.gameplayStart(); } catch(e){}
    }
  }

  function crazyGameplayStop() {
    if (isCrazySDKActive && crazySDK && crazySDK.game) {
      try { crazySDK.game.gameplayStop(); } catch(e){}
    }
  }

  let deathAdCounter = 0;
  function requestMidrollAd(onComplete) {
    deathAdCounter++;
    if (isCrazySDKActive && deathAdCounter % 2 === 0 && crazySDK && crazySDK.ad) {
      try {
        crazySDK.ad.requestAd('midroll', {
          adStarted: () => { SoundManager.stopAllWeaponSounds(); },
          adFinished: () => { if (onComplete) onComplete(); },
          adError: (error) => { console.log('Midroll ad info:', error); if (onComplete) onComplete(); }
        });
      } catch(e) {
        if (onComplete) onComplete();
      }
    } else {
      if (onComplete) onComplete();
    }
  }

  let hasAdBonus = false;
  const rewardedAdBtn = document.getElementById('rewardedAdBtn');
  const rewardedAdText = document.getElementById('rewardedAdText');

  function resetRewardedAdUI() {
    hasAdBonus = false;
    if (rewardedAdBtn) {
      rewardedAdBtn.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
      if (rewardedAdText) {
        const dict = I18N[currentLang] || I18N.tr;
        rewardedAdText.textContent = dict.watchAdBonus || '🎬 REKLAM İZLE: +10 Askerle Başla!';
      }
    }
  }

  if (rewardedAdBtn) {
    rewardedAdBtn.addEventListener('click', () => {
      if (hasAdBonus) return;
      if (isCrazySDKActive && crazySDK && crazySDK.ad) {
        try {
          crazySDK.ad.requestAd('rewarded', {
            adStarted: () => { SoundManager.stopAllWeaponSounds(); },
            adFinished: () => {
              hasAdBonus = true;
              rewardedAdBtn.style.background = 'linear-gradient(135deg, #4caf50, #2e7d32)';
              const dict = I18N[currentLang] || I18N.tr;
              if (rewardedAdText) rewardedAdText.textContent = dict.adBonusActive || '⚡ REKLAM ÖDÜLÜ AKTİF!';
            },
            adError: (error) => {
              alert('Reklam şu an gösterilemiyor. Lütfen tekrar deneyin.');
            }
          });
        } catch(e) {
          hasAdBonus = true;
          rewardedAdBtn.style.background = 'linear-gradient(135deg, #4caf50, #2e7d32)';
          const dict = I18N[currentLang] || I18N.tr;
          if (rewardedAdText) rewardedAdText.textContent = dict.adBonusActive || '⚡ REKLAM ÖDÜLÜ AKTİF!';
        }
      } else {
        hasAdBonus = true;
        rewardedAdBtn.style.background = 'linear-gradient(135deg, #4caf50, #2e7d32)';
        const dict = I18N[currentLang] || I18N.tr;
        if (rewardedAdText) rewardedAdText.textContent = dict.adBonusActive || '⚡ REKLAM ÖDÜLÜ AKTİF!';
      }
    });
  }

  // Room modal elements
  const openRoomModalBtn = document.getElementById('openRoomModalBtn');
  const roomModal = document.getElementById('roomModal');
  const closeRoomModalBtn = document.getElementById('closeRoomModalBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const roomCodeInput = document.getElementById('roomCodeInput');

  // Room code input validation
  roomCodeInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 6) value = value.slice(0, 6);
    e.target.value = value;
  });

  roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      joinRoomBtn.click();
    }
  });

  openRoomModalBtn.addEventListener('click', () => {
    roomModal.classList.remove('hidden');
  });

  closeRoomModalBtn.addEventListener('click', () => {
    roomModal.classList.add('hidden');
  });

  joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim();
    
    if (roomCode.length !== 6) {
      alert(I18N[currentLang].roomCodePrompt || 'Oda kodu 6 haneli olmalıdır');
      roomCodeInput.focus();
      return;
    }
    
    if (!/^\d{6}$/.test(roomCode)) {
      alert('Oda kodu sadece sayılardan oluşmalıdır');
      roomCodeInput.focus();
      return;
    }
    
    const name = nameInput.value.trim() || 'Soldier';
    let color = selectedColor;
    
    if (!color) {
      const colors = ['#ff3333', '#ffeb3b', '#ff9800', '#4caf50', '#2196f3', '#ff99cc', '#00bcd4', '#ffffff'];
      color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    const modeSelector = 'input[name="customMode"]:checked';
    const mode = document.querySelector(modeSelector).value;
    const finalSkinData = mode === 'skin' ? skinData : null;

    const adBonusUsed = hasAdBonus;
    resetRewardedAdUI();

    roomModal.classList.add('hidden');
    Network.joinRoom(roomCode, name, color, finalSkinData, adBonusUsed);
  });

  Network.onRoomNotFound(() => {
    alert('Oda bulunamadı. Lütfen oda kodunu kontrol edin.');
  });

  Network.onRoomFull(() => {
    alert('Bu oda dolu. Başka bir oda kodu deneyin veya normal oyna butonuna tıklayın.');
  });

  // === Game Events ===
  Network.onJoined((data) => {
    crazyGameplayStart();
    gameState = null;
    smoothPositions = {};
    isCameraSnapped = false;
    SoundManager.stopMainTheme();
    SoundManager.stopAllWeaponSounds();
    startScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
    leaderboardEl.classList.remove('hidden');
    topCenterHud.classList.remove('hidden');
    bottomRightHud.classList.remove('hidden');
    soldierCountEl.classList.remove('hidden');
    eliminatedOverlay.classList.add('hidden');
    playing = true;

    // Show mobile controls if on mobile
    if (isMobile) {
      mobileControls.classList.add('active');
    }

    if (data.roomCode) {
      document.getElementById('roomCodeDisplay').textContent = '#' + data.roomCode;
      document.getElementById('roomCodeHud').classList.remove('hidden');
    } else {
      document.getElementById('roomCodeHud').classList.add('hidden');
    }

    if (mouseSendInterval) clearInterval(mouseSendInterval);
    mouseSendInterval = setInterval(sendMousePosition, 150);
  });

  Network.onState((state) => {
    const myId = Network.getId();
    if (playing && myId && state.players) {
      const meInState = state.players[myId];
      // Ignore stale state packets received immediately after joining a new game
      if (!gameState && (!meInState || !meInState.alive)) {
        return;
      }
    }
    gameState = state;
  });

  Network.onEliminated((data) => {
    crazyGameplayStop();
    requestMidrollAd();
    SoundManager.stopAllWeaponSounds();
    deathScreen.classList.remove('hidden');
    if (deathNameInput && nameInput) {
      deathNameInput.value = nameInput.value;
    }
    const score = data && data.score ? data.score : 0;
    const kills = data && data.kills !== undefined ? data.kills : 0;
    const maxSoldiers = data && data.maxSoldiers !== undefined ? data.maxSoldiers : score;
    const totalScore = maxSoldiers + (kills * 50);
    
    deathKillsVal.textContent = kills;
    deathMaxSoldiersVal.textContent = maxSoldiers;
    if (deathSoldierScoreVal) {
      deathSoldierScoreVal.textContent = totalScore;
    }
    
    leaderboardEl.classList.add('hidden');
    topCenterHud.classList.add('hidden');
    bottomRightHud.classList.add('hidden');
    soldierCountEl.classList.add('hidden');
    document.getElementById('roomCodeHud').classList.add('hidden');
    
    // Hide mobile controls
    if (isMobile) {
      mobileControls.classList.remove('active');
    }

    Network.stopShooting();
    isMouseDown = false;
    playing = false;
    if (mouseSendInterval) clearInterval(mouseSendInterval);
  });

  Network.onServerFull(() => {
    alert("Sunucu dolu! / Server full!");
  });

  // === Start Game ===
  function getPlayerConfig(isRespawn) {
    const inputEl = isRespawn ? deathNameInput : nameInput;
    const rawName = (inputEl.value || nameInput.value || 'Soldier').trim();
    const name = rawName || 'Soldier';
    let color = selectedColor;
    if (!color) {
      const colors = ['#ff3333', '#ffeb3b', '#ff9800', '#4caf50', '#2196f3', '#ff99cc', '#00bcd4', '#ffffff'];
      color = colors[Math.floor(Math.random() * colors.length)];
    }
    const modeSelector = isRespawn ? 'input[name="deathCustomMode"]:checked' : 'input[name="customMode"]:checked';
    const modeEl = document.querySelector(modeSelector);
    const mode = modeEl ? modeEl.value : 'color';
    const finalSkinData = mode === 'skin' ? skinData : null;
    const adBonusUsed = hasAdBonus;
    resetRewardedAdUI();
    return { name, color, finalSkinData, adBonusUsed };
  }

  function startGame(isRespawn = false) {
    isCurrentGameBotMatch = false;
    const { name, color, finalSkinData, adBonusUsed } = getPlayerConfig(isRespawn);
    Network.join(name, color, finalSkinData, adBonusUsed);
  }

  function startBotGame(isRespawn = false) {
    isCurrentGameBotMatch = true;
    const { name, color, finalSkinData, adBonusUsed } = getPlayerConfig(isRespawn);
    Network.joinWithBots(name, color, finalSkinData, adBonusUsed);
  }

  playBtn.addEventListener('click', () => startGame(false));
  playBotsBtn.addEventListener('click', () => startBotGame(false));
  respawnBtn.addEventListener('click', () => {
    if (isCurrentGameBotMatch) startBotGame(true);
    else startGame(true);
  });
  
  backToMenuBtn.addEventListener('click', () => {
    crazyGameplayStop();
    deathScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    playing = false;
    isCurrentGameBotMatch = false;
    SoundManager.stopAllWeaponSounds();
    SoundManager.playMainTheme();
    
    // Hide mobile controls
    if (isMobile) {
      mobileControls.classList.remove('active');
    }
    
    if (mouseSendInterval) clearInterval(mouseSendInterval);
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(false);
  });
  deathNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (isCurrentGameBotMatch) startBotGame(true);
      else startGame(true);
    }
  });

  nameInput.addEventListener('input', () => {
    if (deathNameInput) deathNameInput.value = nameInput.value;
  });
  deathNameInput.addEventListener('input', () => {
    if (nameInput) nameInput.value = deathNameInput.value;
  });

  // Focus name input on load
  nameInput.focus();
  updateLang();

  requestAnimationFrame(render);

})();
