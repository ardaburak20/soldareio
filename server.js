// ==========================================
//  SOLDARE.IO - Game Server (v5.0 - Optimized + Bot Rework)
// ==========================================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/sounds', express.static(path.join(__dirname, 'sounds')));
app.use(express.json());

// ==========================================
//  CONSTANTS
// ==========================================
const PORT = process.env.PORT || 3000;
const MAP_SIZE = 10000; 
const TICK_RATE = 30;
const TICK_MS = 1000 / TICK_RATE;
const PLAYER_SPEED = 250;
const BULLET_SPEED = 800;
const MAX_BULLET_DIST = 900;
const SOLDIER_RADIUS = 16;
const BULLET_RADIUS = 4;
const PICKUP_RADIUS = 25;
const MAX_NEUTRALS = 400;
const MAX_PICKUPS = 40;
const MAX_PLAYERS = 20;
const PAD = 200;
const RECRUIT_RADIUS = 40;
const MAX_ROOMS = 10000;
const MAX_BULLETS_PER_ROOM = 500;
const MAX_SHOOTERS_PER_PLAYER = 25;
const BOT_NAMES = ['Michael', 'Adam', 'Jessica', 'Enes', 'Fatih', 'Soul', 'Walter', 'Ellie', 'Arda', 'Sophia'];
const BOT_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e', '#e17055', '#74b9ff'];
const BOT_VISION_RANGE = 500;
const BOT_SHOOT_RANGE = 450;
const MAX_BOTS = 7;
const VIEW_RANGE = 2500; // Viewport range for state filtering

// Performance optimization: leaderboard cache
let leaderboardCache = null;
let leaderboardCacheTime = 0;
const LEADERBOARD_CACHE_MS = 500; // Update leaderboard every 500ms instead of every tick

// ==========================================
//  WEAPON DEFINITIONS
// ==========================================
const WEAPONS = {
  revolver: { name: 'Revolver', fireRate: 4, damage: 1, magSize: 6, reloadTime: 2, duration: Infinity, auto: false }, 
  smg:      { name: 'SMG',      fireRate: 6, damage: 0.5, magSize: 30, reloadTime: 2.27, duration: 20, auto: true },
  m4:       { name: 'M4',       fireRate: 4, damage: 1, magSize: 32, reloadTime: 2.27, duration: 20, auto: true },
  ak47:     { name: 'AK-47',    fireRate: 4, damage: 1, magSize: 32, reloadTime: 2.27, duration: 20, auto: true },
  minigun:  { name: 'Minigun',  fireRate: 10, damage: 1, magSize: 300, reloadTime: 0, duration: 20, auto: true }
};

const PICKUP_WEIGHTS = [
  { type: 'smg',     weight: 30 },
  { type: 'shield',  weight: 30 },
  { type: 'm4',      weight: 20 },
  { type: 'ak47',    weight: 15 },
  { type: 'minigun', weight: 5 }
];
const TOTAL_WEIGHT = PICKUP_WEIGHTS.reduce((s, p) => s + p.weight, 0);

// ==========================================
//  GAME STATE
// ==========================================
let nextId = 1;
const rooms = {};
const socketToRoom = {};

// ==========================================
//  UTILITY
// ==========================================
function uid() { return nextId++; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function distSq(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx*dx + dy*dy; }
function randRange(min, max) { return Math.random() * (max - min) + min; }
function randPos() { return { x: randRange(PAD, MAP_SIZE - PAD), y: randRange(PAD, MAP_SIZE - PAD) }; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function weightedRandom() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const p of PICKUP_WEIGHTS) {
    r -= p.weight;
    if (r <= 0) return p.type;
  }
  return PICKUP_WEIGHTS[0].type;
}

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function calculateScaleLevel(score) {
  if (score >= 250) return 14;
  if (score >= 200) return 13;
  if (score >= 150) return 12;
  if (score >= 120) return 11;
  if (score >= 100) return 10;
  return Math.floor(score / 10);
}

// ==========================================
const formationCache = new Map();
const FORMATION_CACHE_MAX = 300;
const formationResultPool = [];

function computeFormation(count, stretch, angle) {
  if (count === 0) return [];
  
  let baseFormation = formationCache.get(count);
  if (!baseFormation) {
    baseFormation = [];
    let ring = 1, placed = 0;
    while (placed < count) {
      const cap = ring * 6;
      const radius = ring * 30;
      const toPlace = Math.min(cap, count - placed);
      for (let i = 0; i < toPlace; i++) {
        const a = (i / cap) * Math.PI * 2 + (ring % 2) * 0.25;
        baseFormation.push({ baseX: Math.cos(a) * radius, baseY: Math.sin(a) * radius });
        placed++;
      }
      ring++;
    }
    if (formationCache.size >= FORMATION_CACHE_MAX) {
      const firstKey = formationCache.keys().next().value;
      formationCache.delete(firstKey);
    }
    formationCache.set(count, baseFormation);
  }

  while (formationResultPool.length < count) {
    formationResultPool.push({ ox: 0, oy: 0 });
  }

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const invSqrtStretch = 1 / Math.sqrt(stretch);
  const result = new Array(count);
  for (let i = 0; i < count; i++) {
    const ox = baseFormation[i].baseX * stretch;
    const oy = baseFormation[i].baseY * invSqrtStretch;
    const item = formationResultPool[i];
    item.ox = ox * cos - oy * sin;
    item.oy = ox * sin + oy * cos;
    result[i] = item;
  }
  return result;
}

function getSoldierBulletRanges(player, aimAngle) {
  const aimDirX = Math.cos(aimAngle);
  const aimDirY = Math.sin(aimAngle);
  const ranges = new Map();
  let minForward = Infinity;

  for (const s of player.soldiers) {
    if (!s.canShoot) continue;
    const forwardDepth = (s.x - player.x) * aimDirX + (s.y - player.y) * aimDirY;
    ranges.set(s, forwardDepth);
    if (forwardDepth < minForward) minForward = forwardDepth;
  }
  if (!Number.isFinite(minForward)) minForward = 0;

  const maxDistBySoldier = new Map();
  for (const [s, forwardDepth] of ranges) {
    maxDistBySoldier.set(s, MAX_BULLET_DIST + Math.max(0, forwardDepth - minForward));
  }
  return maxDistBySoldier;
}

// ==========================================
//  ROOM MANAGEMENT
// ==========================================
function createRoomObj(code, isPrivate, isBotRoom) {
  return {
    code,
    players: {},
    playerCount: 0,
    bullets: [],
    neutralSoldiers: [],
    pickups: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
    isPrivate: isPrivate || false,
    isBotRoom: isBotRoom || false,
    spawnTickNeutral: 0,
    spawnTickPickup: 0
  };
}

function getOrCreateRoom() {
  // Find first PUBLIC room with space
  for (const code in rooms) {
    const room = rooms[code];
    if (!room.isPrivate && room.playerCount < MAX_PLAYERS) {
      return room;
    }
  }
  
  if (Object.keys(rooms).length >= MAX_ROOMS) return null;
  
  let code = generateRoomCode();
  let attempts = 0;
  while (rooms[code] && attempts < 100) { code = generateRoomCode(); attempts++; }
  if (attempts >= 100) return null;
  
  rooms[code] = createRoomObj(code, false, false);
  console.log(`🏠 New public room: ${code} (Total: ${Object.keys(rooms).length})`);
  return rooms[code];
}

function getRoomByCode(code) {
  return rooms[code] || null;
}

function getRoomStats() {
  const totalRooms = Object.keys(rooms).length;
  const totalPlayers = Object.values(rooms).reduce((sum, room) => sum + room.playerCount, 0);
  return { totalRooms, totalPlayers };
}

// ==========================================
//  SPAWN FUNCTIONS
// ==========================================
function spawnNeutralBatch(neutralSoldiers) {
  if (neutralSoldiers.length >= MAX_NEUTRALS) return;
  const toSpawn = Math.min(30, MAX_NEUTRALS - neutralSoldiers.length);
  for (let i = 0; i < toSpawn; i++) {
    const pos = randPos();
    const groupSize = Math.random() < 0.3 ? 2 : 1;
    for (let g = 0; g < groupSize; g++) {
      neutralSoldiers.push({
        id: uid(),
        x: pos.x + g * 25,
        y: pos.y + g * 10,
        canShoot: Math.random() < (1 / 3),
        hp: 1
      });
    }
  }
}

function spawnPickups(pickups) {
  if (pickups.length >= MAX_PICKUPS) return;
  const toSpawn = Math.min(15, MAX_PICKUPS - pickups.length);
  for (let i = 0; i < toSpawn; i++) {
    const pos = randPos();
    pickups.push({ id: uid(), x: pos.x, y: pos.y, type: weightedRandom() });
  }
}

// ==========================================
//  PLAYER HELPERS
// ==========================================
function createPlayer(id, name, color, skin, hasAdBonus) {
  const pos = randPos();
  const w = WEAPONS.revolver;
  const p = {
    id, name: (name || 'Soldier').substring(0, 16),
    color: color || '#3498db', skin: skin || null,
    x: pos.x, y: pos.y, angle: 0, mouseX: pos.x, mouseY: pos.y,
    soldiers: [], weapon: 'revolver', ammo: w.magSize,
    storedRevolverAmmo: undefined,
    isShooting: false, clickShoot: false,
    isReloading: false, reloadTimer: 0, fireTimer: 0,
    shieldActive: !!hasAdBonus, shieldTimer: hasAdBonus ? 15 : 0, weaponTimer: 0,
    alive: true, kills: 0, storedPickup: null,
    maxSoldiers: 1, isBot: false, stretch: 1.0
  };

  if (hasAdBonus) {
    for (let b = 0; b < 10; b++) {
      p.soldiers.push({
        id: uid(),
        x: pos.x + Math.cos((b / 10) * Math.PI * 2) * 35,
        y: pos.y + Math.sin((b / 10) * Math.PI * 2) * 35,
        canShoot: b % 3 === 0,
        hp: 1,
        fireTimer: 0
      });
    }
    p.maxSoldiers = 11;
  }

  return p;
}

function createBot(id, name, color) {
  const bot = createPlayer(id, name, color, null);
  bot.isBot = true;
  bot.botTarget = null;
  bot.botState = 'explore';
  bot.botThinkTimer = 0;
  return bot;
}

function respawnPlayer(player) {
  const pos = randPos();
  player.x = pos.x; player.y = pos.y;
  player.soldiers = []; player.weapon = 'revolver';
  player.ammo = WEAPONS.revolver.magSize;
  player.storedRevolverAmmo = undefined;
  player.isShooting = false; player.clickShoot = false;
  player.isReloading = false; player.reloadTimer = 0; player.fireTimer = 0;
  player.shieldActive = false; player.shieldTimer = 0; player.weaponTimer = 0;
  player.alive = true; player.maxSoldiers = 1; player.stretch = 1.0;
}

function switchToRevolver(player) {
  if (player.weapon === 'revolver') player.storedRevolverAmmo = player.ammo;
  player.weapon = 'revolver';
  player.ammo = player.storedRevolverAmmo !== undefined ? player.storedRevolverAmmo : WEAPONS.revolver.magSize;
  player.weaponTimer = 0; player.isReloading = false; player.fireTimer = 0;
}

function activateStoredPickup(player) {
  if (!player.storedPickup) return false;
  const { type, ammo } = player.storedPickup;
  player.storedPickup = null;
  if (player.weapon === 'revolver') player.storedRevolverAmmo = player.ammo;
  player.weapon = type; player.ammo = ammo;
  player.weaponTimer = WEAPONS[type].duration;
  player.isReloading = false; player.fireTimer = 0;
  return true;
}

// ==========================================
//  BOT AI (only for bot rooms)
// ==========================================
function updateBotAI(bot, room, dt) {
  if (!bot.alive || !bot.isBot) return;
  bot.botThinkTimer -= dt;
  if (bot.botThinkTimer > 0) return;
  bot.botThinkTimer = 0.3;

  const { neutralSoldiers, pickups, players } = room;

  let closestNeutral = null, closestNeutralDist = Infinity;
  for (const n of neutralSoldiers) {
    const d = distSq(bot, n);
    if (d < BOT_VISION_RANGE * BOT_VISION_RANGE && d < closestNeutralDist) {
      closestNeutral = n; closestNeutralDist = d;
    }
  }

  let closestPickup = null, closestPickupDist = Infinity;
  for (const p of pickups) {
    const d = distSq(bot, p);
    if (d < BOT_VISION_RANGE * BOT_VISION_RANGE && d < closestPickupDist) {
      closestPickup = p; closestPickupDist = d;
    }
  }

  let closestEnemy = null, closestEnemyDist = Infinity, targetX = 0, targetY = 0;
  for (const id in players) {
    const enemy = players[id];
    if (enemy.id === bot.id || !enemy.alive) continue;
    const d = distSq(bot, enemy);
    if (d < BOT_VISION_RANGE * BOT_VISION_RANGE && d < closestEnemyDist) {
      closestEnemy = enemy; closestEnemyDist = d;
      targetX = enemy.x; targetY = enemy.y;
    }
  }

  const shootRangeSq = BOT_SHOOT_RANGE * BOT_SHOOT_RANGE;
  if (closestEnemy && closestEnemyDist < shootRangeSq) {
    bot.botState = 'attack';
    bot.mouseX = targetX; bot.mouseY = targetY;
    bot.isShooting = true; bot.clickShoot = true;
  } else if (closestPickup && (!closestNeutral || closestPickupDist < closestNeutralDist * 0.8)) {
    bot.botState = 'collect';
    bot.mouseX = closestPickup.x; bot.mouseY = closestPickup.y;
    bot.isShooting = false;
  } else if (closestNeutral) {
    bot.botState = 'collect';
    bot.mouseX = closestNeutral.x; bot.mouseY = closestNeutral.y; // Use actual position
    bot.isShooting = false;
  } else {
    bot.botState = 'explore';
    if (Math.random() < 0.5) {
      bot.mouseX = randRange(PAD, MAP_SIZE - PAD);
      bot.mouseY = randRange(PAD, MAP_SIZE - PAD);
    }
    bot.isShooting = false;
  }

  if (bot.ammo <= 3 && !bot.isReloading) {
    bot.isReloading = true;
    bot.reloadTimer = WEAPONS[bot.weapon].reloadTime;
    bot.isShooting = false;
  }
}

function addBotsToRoom(room) {
  const bots = Object.values(room.players).filter(p => p.isBot);
  const aliveBots = bots.filter(b => b.alive).length;
  const neededBots = MAX_BOTS - aliveBots;
  const usedNames = bots.map(b => b.name);
  const availableNames = BOT_NAMES.filter(name => !usedNames.includes(name));
  
  for (let i = 0; i < neededBots; i++) {
    if (availableNames.length === 0) break;
    const randomIndex = Math.floor(Math.random() * availableNames.length);
    const botName = availableNames.splice(randomIndex, 1)[0];
    const botId = `bot_${room.code}_${Date.now()}_${Math.random()}`;
    const botColor = BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];
    room.players[botId] = createBot(botId, botName, botColor);
  }
}

function manageBots(room) {
  // Only manage bots in bot rooms
  if (!room.isBotRoom) return;
  
  const realPlayers = Object.values(room.players).filter(p => !p.isBot).length;
  
  // Remove all bots if no real players in room
  if (realPlayers === 0) {
    for (const id in room.players) {
      if (room.players[id].isBot) delete room.players[id];
    }
    return;
  }

  // Respawn dead bots
  const aliveBots = Object.values(room.players).filter(p => p.isBot && p.alive).length;
  if (aliveBots < MAX_BOTS) {
    // First try respawning dead bots
    for (const id in room.players) {
      if (room.players[id].isBot && !room.players[id].alive) {
        respawnPlayer(room.players[id]);
      }
    }
    // Then add new ones if needed
    addBotsToRoom(room);
  }
}

function leaveCurrentRoom(socketId) {
  const roomCode = socketToRoom[socketId];
  if (roomCode && rooms[roomCode]) {
    const room = rooms[roomCode];
    if (room.players[socketId]) {
      delete room.players[socketId];
      room.playerCount = Math.max(0, room.playerCount - 1);
      room.lastActivity = Date.now();
      console.log(`👋 Player left room ${roomCode} (${room.playerCount} remaining)`);
    }
    
    if (room.playerCount === 0) {
      if (room.isBotRoom) {
        for (const id in room.players) delete room.players[id];
        delete rooms[roomCode];
        console.log(`🗑️ Bot room cleaned: ${roomCode}`);
      } else {
        setTimeout(() => {
          if (rooms[roomCode] && rooms[roomCode].playerCount === 0) {
            delete rooms[roomCode];
            console.log(`🗑️ Empty room cleaned: ${roomCode}`);
          }
        }, 30000);
      }
    }
  }
  delete socketToRoom[socketId];
}

// ==========================================
//  SOCKET HANDLERS
// ==========================================
io.on('connection', (socket) => {

  // Normal multiplayer join - NO bots
  socket.on('join', (data) => {
    leaveCurrentRoom(socket.id);
    const room = getOrCreateRoom();
    if (!room) { socket.emit('serverFull'); return; }
    
    const name = (data.name || 'Soldier').substring(0, 16);
    room.players[socket.id] = createPlayer(socket.id, name, data.color, data.skin, data.hasAdBonus);
    socketToRoom[socket.id] = room.code;
    room.playerCount++;
    room.lastActivity = Date.now();

    console.log(`👤 Player ${name} joined room ${room.code} (${room.playerCount}/${MAX_PLAYERS})`);
    socket.emit('joined', { id: socket.id, mapSize: MAP_SIZE, roomCode: room.code });
  });

  // Join with bots - private offline room
  socket.on('joinWithBots', (data) => {
    leaveCurrentRoom(socket.id);
    if (Object.keys(rooms).length >= MAX_ROOMS) { socket.emit('serverFull'); return; }
    
    let code = generateRoomCode();
    let attempts = 0;
    while (rooms[code] && attempts < 100) { code = generateRoomCode(); attempts++; }
    if (attempts >= 100) { socket.emit('serverFull'); return; }
    
    // Create private bot room
    rooms[code] = createRoomObj(code, true, true);
    const room = rooms[code];
    
    const name = (data.name || 'Soldier').substring(0, 16);
    room.players[socket.id] = createPlayer(socket.id, name, data.color, data.skin, data.hasAdBonus);
    socketToRoom[socket.id] = code;
    room.playerCount++;
    room.lastActivity = Date.now();
    
    // Add bots
    addBotsToRoom(room);

    console.log(`🤖 Player ${name} started bot game in private room ${code}`);
    socket.emit('joined', { id: socket.id, mapSize: MAP_SIZE, roomCode: null }); // Don't show room code
  });

  // Join specific room by code
  socket.on('joinRoom', (data) => {
    leaveCurrentRoom(socket.id);
    const roomCode = data.roomCode;
    if (!roomCode || !/^\d{6}$/.test(roomCode)) { socket.emit('roomNotFound'); return; }
    
    let room = getRoomByCode(roomCode);
    
    // If room doesn't exist, create it
    if (!room) {
      if (Object.keys(rooms).length >= MAX_ROOMS) { socket.emit('roomNotFound'); return; }
      rooms[roomCode] = createRoomObj(roomCode, true, false); // Private but no bots
      room = rooms[roomCode];
      console.log(`🏠 New private room: ${roomCode}`);
    }
    
    // Don't allow joining bot rooms
    if (room.isBotRoom) { socket.emit('roomFull'); return; }
    if (room.playerCount >= MAX_PLAYERS) { socket.emit('roomFull'); return; }
    
    const name = (data.name || 'Soldier').substring(0, 16);
    room.players[socket.id] = createPlayer(socket.id, name, data.color, data.skin, data.hasAdBonus);
    socketToRoom[socket.id] = room.code;
    room.playerCount++;
    room.lastActivity = Date.now();

    console.log(`👤 Player ${name} joined room ${roomCode} (${room.playerCount}/${MAX_PLAYERS})`);
    socket.emit('joined', { id: socket.id, mapSize: MAP_SIZE, roomCode: room.code });
  });

  socket.on('mouseMove', (data) => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players[socket.id];
    if (p && data) {
      p.mouseX = clamp(data.x || 0, 0, MAP_SIZE);
      p.mouseY = clamp(data.y || 0, 0, MAP_SIZE);
    }
  });

  socket.on('startShooting', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p && p.alive) {
      p.isHoldingFire = true;
      if (!p.isReloading) p.isShooting = true;
    }
  });

  socket.on('stopShooting', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p) {
      p.isHoldingFire = false;
      p.isShooting = false;
    }
  });

  socket.on('clickShoot', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p && p.alive) p.clickShoot = true;
  });

  socket.on('manualReload', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p && p.alive && !p.isReloading) {
      if (p.weapon === 'minigun') return; // Minigun has no reload
      const wDef = WEAPONS[p.weapon];
      if (p.ammo < wDef.magSize) {
        p.isReloading = true;
        p.isShooting = false;
        p.clickShoot = false;
        if (p.weapon === 'revolver') {
          const missing = 6 - p.ammo; // Calculate exact missing bullets (no Math.max!)
          p.revolverReloadStartAmmo = p.ammo;
          p.revolverReloadStartTime = Date.now();
          p.revolverInterrupting = false;
          p.revolverFinalAmmo = 6;
          p.reloadTimer = missing * 0.4 + 0.5;
        } else {
          p.reloadTimer = wDef.reloadTime;
        }
      }
    }
  });

  socket.on('cancelRevolverReload', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p && p.alive && p.isReloading && p.weapon === 'revolver' && !p.revolverInterrupting) {
      const now = Date.now();
      const timeSinceLastPress = (now - (p.lastFirePressTime || 0)) / 1000;
      p.lastFirePressTime = now;
      if (timeSinceLastPress <= 0.4) {
        return; // Tolerated rapid tap (<=0.4s gap), do not cancel reload
      }
      p.revolverInterrupting = true;
      p.isShooting = false;
      p.clickShoot = false;
      const elapsed = (now - (p.revolverReloadStartTime || now)) / 1000;
      const startAmmo = p.revolverReloadStartAmmo !== undefined ? p.revolverReloadStartAmmo : 0;
      const missingTotal = Math.max(1, 6 - startAmmo);
      const bulletsDone = Math.min(missingTotal, Math.floor(elapsed / 0.4));
      const currentBulletFinishTime = (bulletsDone + 1) * 0.4;
      const timeUntilCurrentDone = Math.max(0, currentBulletFinishTime - elapsed);
      const finalAmmo = Math.min(6, startAmmo + bulletsDone + 1);
      p.revolverFinalAmmo = finalAmmo;
      p.reloadTimer = timeUntilCurrentDone + 0.5;
    }
  });

  socket.on('equipRevolver', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (!p || !p.alive) return;
    if (p.storedPickup) { activateStoredPickup(p); return; }
    if (p.weapon !== 'revolver') switchToRevolver(p);
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket.id);
  });
});

// ==========================================
//  GAME LOOP (Optimized)
// ==========================================
function gameLoop() {
  const dt = 1 / TICK_RATE;

  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    const players = room.players;
    const bullets = room.bullets;
    const neutralSoldiers = room.neutralSoldiers;
    const pickups = room.pickups;

    // Only manage bots in bot rooms
    manageBots(room);

    // --- Update Players ---
    for (const id in players) {
      const p = players[id];
      if (!p.alive) continue;

      if (p.isBot) updateBotAI(p, room, dt);

      // Movement
      const dx = p.mouseX - p.x;
      const dy = p.mouseY - p.y;
      const dSq = dx*dx + dy*dy;
      let isMoving = false;
      if (dSq > 25) { // 5^2
        isMoving = true;
        const d = Math.sqrt(dSq);
        const speed = PLAYER_SPEED * dt;
        p.x += (dx / d) * speed;
        p.y += (dy / d) * speed;
        p.angle = Math.atan2(dy, dx);
      }
      p.x = clamp(p.x, SOLDIER_RADIUS, MAP_SIZE - SOLDIER_RADIUS);
      p.y = clamp(p.y, SOLDIER_RADIUS, MAP_SIZE - SOLDIER_RADIUS);

      const targetStretch = isMoving ? 1.8 : 1.0;
      p.stretch += (targetStretch - p.stretch) * 0.05;

      // Track max soldiers
      const curCount = p.soldiers.length + 1;
      if (curCount > p.maxSoldiers) p.maxSoldiers = curCount;

      // Formation
      const formation = computeFormation(p.soldiers.length, p.stretch, p.angle);
      for (let i = 0; i < p.soldiers.length; i++) {
        const s = p.soldiers[i];
        const tx = p.x + formation[i].ox;
        const ty = p.y + formation[i].oy;
        const sdx = tx - s.x;
        const sdy = ty - s.y;
        const sdSq = sdx*sdx + sdy*sdy;
        
        if (sdSq > 10000) { // 100^2
          const sd = Math.sqrt(sdSq);
          const moveSpd = PLAYER_SPEED * 3 * dt;
          s.x += (sdx / sd) * moveSpd;
          s.y += (sdy / sd) * moveSpd;
        } else {
          s.x += sdx * 0.3;
          s.y += sdy * 0.3;
        }
      }

      // Recruit neutrals
      const recruitRadSq = RECRUIT_RADIUS * RECRUIT_RADIUS;
      const armyBoundRadN = Math.ceil(Math.sqrt((p.soldiers.length || 1) / 3)) * 30 + 80 + RECRUIT_RADIUS;
      const armyBoundSqN = armyBoundRadN * armyBoundRadN;

      for (let j = neutralSoldiers.length - 1; j >= 0; j--) {
        const ns = neutralSoldiers[j];
        const dSqP = distSq(p, ns);
        if (dSqP > armyBoundSqN) continue;

        let recruited = false;
        if (dSqP < recruitRadSq) recruited = true;
        else {
          for (const s of p.soldiers) {
            if (distSq(s, ns) < recruitRadSq) { recruited = true; break; }
          }
        }
        if (recruited) {
          p.soldiers.push({ id: uid(), x: ns.x, y: ns.y, canShoot: ns.canShoot, hp: 1, fireTimer: 0 });
          neutralSoldiers.splice(j, 1);
          const c = p.soldiers.length + 1;
          if (c > p.maxSoldiers) p.maxSoldiers = c;
        }
      }

      // Weapon timer
      if (p.weaponTimer > 0) {
        p.weaponTimer -= dt;
        if (p.weaponTimer <= 0) {
          p.weapon = 'revolver';
          p.ammo = p.storedRevolverAmmo !== undefined ? p.storedRevolverAmmo : WEAPONS.revolver.magSize;
          p.weaponTimer = 0; p.isReloading = false;
        }
      }

      // Shield timer
      if (p.shieldActive) {
        p.shieldTimer -= dt;
        if (p.shieldTimer <= 0) { p.shieldActive = false; p.shieldTimer = 0; }
      }

      // Reload timer
      if (p.isReloading) {
        p.reloadTimer -= dt;
        if (p.weapon === 'revolver' && !p.revolverInterrupting) {
          const elapsed = (Date.now() - (p.revolverReloadStartTime || Date.now())) / 1000;
          const startAmmo = p.revolverReloadStartAmmo !== undefined ? p.revolverReloadStartAmmo : 0;
          const missingTotal = Math.max(1, 6 - startAmmo);
          const bulletsLoaded = Math.min(missingTotal, Math.floor(elapsed / 0.4));
          p.ammo = Math.min(6, startAmmo + bulletsLoaded);
        }
        if (p.reloadTimer <= 0) {
          p.isReloading = false;
          p.ammo = (p.weapon === 'revolver' && p.revolverInterrupting) ? (p.revolverFinalAmmo || 6) : (p.weapon === 'revolver' ? 6 : WEAPONS[p.weapon].magSize);
          p.reloadTimer = 0;
          p.revolverInterrupting = false;

          // Resume auto firing immediately if player is holding fire button when reload finishes
          const wDef = WEAPONS[p.weapon];
          if (wDef.auto && p.isHoldingFire && p.ammo > 0) {
            p.isShooting = true;
          }
        }
      }

      p.fireTimer -= dt;

      // Shooting
      const wDef = WEAPONS[p.weapon];
      const wantsToShoot = wDef.auto ? p.isShooting : p.clickShoot;

      if (wantsToShoot && !p.isReloading && p.ammo > 0 && p.fireTimer <= 0 && bullets.length < MAX_BULLETS_PER_ROOM) {
        const angle = Math.atan2(p.mouseY - p.y, p.mouseX - p.x);
        const scaleMultiplier = Math.pow(1.1, calculateScaleLevel(p.soldiers.length + 1));
        const maxD = MAX_BULLET_DIST * scaleMultiplier;

        bullets.push({
          id: uid(), ownerId: p.id, color: p.color, weapon: p.weapon,
          x: p.x + Math.cos(angle) * (SOLDIER_RADIUS + 4),
          y: p.y + Math.sin(angle) * (SOLDIER_RADIUS + 4),
          vx: Math.cos(angle) * BULLET_SPEED,
          vy: Math.sin(angle) * BULLET_SPEED,
          damage: wDef.damage, traveled: 0, maxDist: maxD
        });
        p.ammo--;
        p.fireTimer = 1 / wDef.fireRate;

        // Soldier shooting (capped)
        let shooters = 0;
        const soldierRanges = getSoldierBulletRanges(p, angle);
        for (const s of p.soldiers) {
          if (!s.canShoot) continue;
          if (shooters >= MAX_SHOOTERS_PER_PLAYER) break;
          if (bullets.length >= MAX_BULLETS_PER_ROOM) break;
          shooters++;
          const sAngle = Math.atan2(p.mouseY - s.y, p.mouseX - s.x);
          bullets.push({
            id: uid(), ownerId: p.id, color: p.color, weapon: 'revolver',
            x: s.x + Math.cos(sAngle) * (SOLDIER_RADIUS + 2),
            y: s.y + Math.sin(sAngle) * (SOLDIER_RADIUS + 2),
            vx: Math.cos(sAngle) * BULLET_SPEED,
            vy: Math.sin(sAngle) * BULLET_SPEED,
            damage: WEAPONS.revolver.damage, traveled: 0,
            maxDist: soldierRanges.get(s) || MAX_BULLET_DIST
          });
        }

        if (p.ammo <= 0) {
          p.isShooting = false; p.clickShoot = false;
          if (p.weapon !== 'minigun') {
            p.isReloading = true;
            if (p.weapon === 'revolver') {
              p.revolverReloadStartAmmo = 0;
              p.revolverReloadStartTime = Date.now();
              p.revolverInterrupting = false;
              p.revolverFinalAmmo = 6;
              p.reloadTimer = 6 * 0.4 + 0.5; // 2.9s full reload
            } else {
              p.reloadTimer = wDef.reloadTime;
            }
          }
        }
      }
      p.clickShoot = false;

      // Pickup collision
      const pickupRadSq = (SOLDIER_RADIUS + PICKUP_RADIUS) * (SOLDIER_RADIUS + PICKUP_RADIUS);
      const armyBoundRadP = Math.ceil(Math.sqrt((p.soldiers.length || 1) / 3)) * 30 + 80 + PICKUP_RADIUS;
      const armyBoundSqP = armyBoundRadP * armyBoundRadP;

      for (let i = pickups.length - 1; i >= 0; i--) {
        const pk = pickups[i];
        const dSqP = distSq(p, pk);
        if (dSqP > armyBoundSqP) continue;

        let collected = false;
        if (dSqP < pickupRadSq) collected = true;
        else {
          for (const s of p.soldiers) {
            if (distSq(s, pk) < pickupRadSq) { collected = true; break; }
          }
        }
        if (collected) {
          if (pk.type === 'shield') {
            p.shieldActive = true; p.shieldTimer = 10;
          } else {
            const w = WEAPONS[pk.type];
            if (p.weapon === 'revolver') p.storedRevolverAmmo = p.ammo;
            p.weapon = pk.type; p.ammo = w.magSize;
            p.weaponTimer = w.duration; p.isReloading = false; p.fireTimer = 0;
          }
          pickups.splice(i, 1);
        }
      }
    }

    // --- Bullet Collisions (Spatial Grid Optimized) ---
    const bulletRadSq = (SOLDIER_RADIUS + BULLET_RADIUS) * (SOLDIER_RADIUS + BULLET_RADIUS);
    const shieldRadSq = (SOLDIER_RADIUS + BULLET_RADIUS + 5) * (SOLDIER_RADIUS + BULLET_RADIUS + 5);
    const GRID_SIZE_SPATIAL = 300;

    const spatialGrid = new Map();
    function getGridKey(gx, gy) {
      return (gx & 0xFFFF) | ((gy & 0xFFFF) << 16);
    }

    for (const pid in players) {
      const enemy = players[pid];
      if (!enemy.alive) continue;

      const egx = Math.floor(enemy.x / GRID_SIZE_SPATIAL);
      const egy = Math.floor(enemy.y / GRID_SIZE_SPATIAL);
      const eKey = getGridKey(egx, egy);

      let cellEnemies = spatialGrid.get(eKey);
      if (!cellEnemies) {
        cellEnemies = [];
        spatialGrid.set(eKey, cellEnemies);
      }
      cellEnemies.push(enemy);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.traveled += BULLET_SPEED * dt;

      if (b.traveled >= (b.maxDist || MAX_BULLET_DIST) || b.x < 0 || b.x > MAP_SIZE || b.y < 0 || b.y > MAP_SIZE) {
        bullets.splice(i, 1);
        continue;
      }

      const shooter = players[b.ownerId];
      let hit = false;

      const bgx = Math.floor(b.x / GRID_SIZE_SPATIAL);
      const bgy = Math.floor(b.y / GRID_SIZE_SPATIAL);

      for (let dx = -1; dx <= 1 && !hit; dx++) {
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          const key = getGridKey(bgx + dx, bgy + dy);
          const cellEnemies = spatialGrid.get(key);
          if (!cellEnemies) continue;

          for (let eIdx = 0; eIdx < cellEnemies.length; eIdx++) {
            const enemy = cellEnemies[eIdx];
            if (enemy.id === b.ownerId || !enemy.alive) continue;

            const armyRadius = Math.ceil(Math.sqrt((enemy.soldiers.length || 1) / 3)) * 30 + 80;
            if (distSq(b, enemy) > armyRadius * armyRadius) continue;

            // Shield check
            if (enemy.shieldActive) {
              let nearShield = false;
              if (distSq(b, enemy) < shieldRadSq) nearShield = true;
              if (!nearShield) {
                for (const s of enemy.soldiers) {
                  if (distSq(b, s) < shieldRadSq) { nearShield = true; break; }
                }
              }
              if (nearShield) { hit = true; break; }
              continue;
            }

            // Soldier hit check
            for (let j = enemy.soldiers.length - 1; j >= 0; j--) {
              if (distSq(b, enemy.soldiers[j]) < bulletRadSq) {
                const es = enemy.soldiers[j];
                es.hp = (es.hp || 1) - b.damage;
                if (es.hp <= 0) {
                  const taken = enemy.soldiers.splice(j, 1)[0];
                  if (shooter) { taken.hp = 1; taken.fireTimer = 0; shooter.soldiers.push(taken); }
                }
                hit = true; break;
              }
            }
            if (hit) break;

            // Main body hit
            if (distSq(b, enemy) < bulletRadSq) {
              const soldierCount = enemy.soldiers.length + 1;
              const enemyKills = enemy.kills || 0;
              const enemyMaxSoldiers = enemy.maxSoldiers || soldierCount;
              if (shooter) {
                for (const s of enemy.soldiers) { s.hp = 1; s.fireTimer = 0; shooter.soldiers.push(s); }
                const sc = shooter.soldiers.length + 1;
                if (sc > shooter.maxSoldiers) shooter.maxSoldiers = sc;
              }
              if (shooter && shooter !== enemy) shooter.kills = (shooter.kills || 0) + 1;
              enemy.alive = false; enemy.soldiers = [];
              
              if (!enemy.isBot) {
                io.to(enemy.id).emit('eliminated', { 
                  score: soldierCount, kills: enemyKills, maxSoldiers: enemyMaxSoldiers
                });
              } else {
                setTimeout(() => {
                  if (room.players[enemy.id] && room.players[enemy.id].isBot) {
                    respawnPlayer(room.players[enemy.id]);
                  }
                }, 3000);
              }
              hit = true; break;
            }
          }
        }
      }
      if (hit) bullets.splice(i, 1);
    }

    // --- Spawning ---
    room.spawnTickNeutral++;
    if (room.spawnTickNeutral >= TICK_RATE * 1.5) { 
      spawnNeutralBatch(neutralSoldiers);
      room.spawnTickNeutral = 0;
    }
    room.spawnTickPickup++;
    if (room.spawnTickPickup >= TICK_RATE * 4) { 
      spawnPickups(pickups);
      room.spawnTickPickup = 0;
    }

    // --- Build & Send State (per-player viewport filtering) ---
    const now = Date.now();
    
    // Cache leaderboard calculation (update every 500ms instead of every tick)
    let leaderboard;
    if (!leaderboardCache || (now - leaderboardCacheTime) > LEADERBOARD_CACHE_MS) {
      leaderboard = Object.values(players)
        .filter(p => p.alive)
        .map(p => ({ name: p.name, score: p.soldiers.length + 1, color: p.color }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      leaderboardCache = leaderboard;
      leaderboardCacheTime = now;
    } else {
      leaderboard = leaderboardCache;
    }

    const totalPlayers = Object.values(players).filter(p => p.alive).length;

    // Build full player data once (object pooling for better performance)
    const allPlayerData = {};
    for (const id in players) {
      const p = players[id];
      const solLen = p.soldiers.length;
      const solArr = new Array(solLen);
      for (let sIdx = 0; sIdx < solLen; sIdx++) {
        const s = p.soldiers[sIdx];
        solArr[sIdx] = { x: Math.round(s.x), y: Math.round(s.y), cs: s.canShoot };
      }
      allPlayerData[id] = {
        id: p.id, name: p.name, color: p.color, skin: p.skin,
        x: Math.round(p.x), y: Math.round(p.y), angle: p.angle,
        soldiers: solArr,
        weapon: p.weapon, weaponName: WEAPONS[p.weapon].name,
        ammo: p.ammo, maxAmmo: WEAPONS[p.weapon].magSize,
        isReloading: p.isReloading, isShooting: !!p.isShooting, clickShoot: !!p.clickShoot,
        shieldActive: p.shieldActive, shieldTimer: p.shieldTimer,
        weaponTimer: p.weaponTimer,
        score: p.soldiers.length + 1, alive: p.alive, kills: p.kills || 0,
        hasStoredPickup: !!p.storedPickup
      };
    }

    // Send filtered state per player (optimized spatial queries)
    const viewRangeSq = VIEW_RANGE * VIEW_RANGE;
    const playerViewRangeSq = (VIEW_RANGE + 600) * (VIEW_RANGE + 600);
    
    for (const id in players) {
      if (players[id].isBot) continue; // Don't send to bots
      
      const me = players[id];

      // Filter players by distance (only send nearby players to client)
      const nearPlayers = {};
      for (const pid in players) {
        const other = players[pid];
        if (!other.alive) continue;
        if (pid === id) {
          nearPlayers[pid] = allPlayerData[pid];
        } else {
          // Fast distance check with squared distance
          const dx = me.x - other.x;
          const dy = me.y - other.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < playerViewRangeSq) {
            nearPlayers[pid] = allPlayerData[pid];
          }
        }
      }
      
      // Filter neutrals by distance (pre-allocate array for better performance)
      const nearNeutrals = [];
      const neutralLen = neutralSoldiers.length;
      for (let i = 0; i < neutralLen; i++) {
        const n = neutralSoldiers[i];
        const dx = me.x - n.x;
        const dy = me.y - n.y;
        if ((dx * dx + dy * dy) < viewRangeSq) {
          nearNeutrals.push({ id: n.id, x: n.x, y: n.y, cs: n.canShoot });
        }
      }
      
      // Filter bullets by distance
      const nearBullets = [];
      const bulletLen = bullets.length;
      for (let i = 0; i < bulletLen; i++) {
        const b = bullets[i];
        const dx = me.x - b.x;
        const dy = me.y - b.y;
        if ((dx * dx + dy * dy) < viewRangeSq) {
          nearBullets.push({ id: b.id, x: b.x, y: b.y, c: b.color });
        }
      }
      
      // Filter pickups by distance
      const nearPickups = [];
      const pickupLen = pickups.length;
      for (let i = 0; i < pickupLen; i++) {
        const pk = pickups[i];
        const dx = me.x - pk.x;
        const dy = me.y - pk.y;
        if ((dx * dx + dy * dy) < viewRangeSq) {
          nearPickups.push({ id: pk.id, x: pk.x, y: pk.y, type: pk.type });
        }
      }

      const state = {
        players: nearPlayers,
        neutrals: nearNeutrals,
        pickups: nearPickups,
        bullets: nearBullets,
        leaderboard,
        totalPlayers,
        roomCode: room.isPrivate ? null : roomCode
      };

      io.to(id).volatile.emit('gameState', state);
    }
  } // End room loop
}

setInterval(gameLoop, TICK_MS);

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const room = rooms[code];
    if (room.playerCount === 0 && (now - room.lastActivity) > 5 * 60 * 1000) {
      delete rooms[code];
      console.log(`🗑️ Inactive room cleaned: ${code}`);
    }
  }
  const stats = getRoomStats();
  if (stats.totalRooms > 0) {
    console.log(`📊 Stats: ${stats.totalPlayers} players in ${stats.totalRooms} rooms`);
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Soldare.IO server running on http://localhost:${PORT}`);
});
