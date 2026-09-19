// ==========================================
//  SOLDARE.IO - Game Server (v5.0 - Multi-CPU Cluster Mode)
// ==========================================
const cluster = require('cluster');
const numCPUs = 2; // 2 CPU Cores (DigitalOcean Droplet)

if (cluster.isPrimary || cluster.isMaster) {
  console.log(`🚀 Primary Process ${process.pid} is running.`);
  console.log(`⚡ Forking ${numCPUs} CPU Workers (CPU 1 = Tek Sayılı Odalar, CPU 2 = Çift Sayılı Odalar)...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({ WORKER_INDEX: i + 1 });
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker process ${worker.process.pid} exited. Restarting worker...`);
    const workerIndex = worker.id || 1;
    cluster.fork({ WORKER_INDEX: workerIndex });
  });
} else {
  const WORKER_INDEX = parseInt(process.env.WORKER_INDEX || 1, 10);
  console.log(`⚡ [CPU ${WORKER_INDEX}] Worker process ${process.pid} initialized.`);

  const express = require('express');
  const http = require('http');
  const { Server } = require('socket.io');
  const path = require('path');
  const { createAdapter } = require("@socket.io/redis-adapter");
  const { createClient } = require("redis");

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { 
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

// ==========================================
//  REDIS ADAPTER - Multi-CPU Cluster Support
// ==========================================
const redisClient = createClient({ 
  url: 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 50, 500);
      console.log(`🔄 Redis reconnection attempt ${retries}, delay: ${delay}ms`);
      return delay;
    }
  }
});

const subClient = redisClient.duplicate();

// Redis bağlantısı kur
Promise.all([redisClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(redisClient, subClient));
    console.log('✅ Redis adapter connected - Multi-CPU cluster mode ACTIVE');
    console.log('📊 Rooms will be distributed across 2 CPUs automatically');

    subClient.subscribe('cluster_room_sync', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.workerIndex === WORKER_INDEX) return;

        if (data.type === 'PLAYER_JOIN') {
          const { roomCode, socketId, player } = data;
          if (!rooms[roomCode]) {
            rooms[roomCode] = createRoomObj(roomCode, false);
          }
          rooms[roomCode].players[socketId] = player;
          rooms[roomCode].playerCount = Object.keys(rooms[roomCode].players).length;
          rooms[roomCode].lastActivity = Date.now();
        } else if (data.type === 'PLAYER_INPUT') {
          const { roomCode, socketId, action, inputData } = data;
          if (rooms[roomCode] && rooms[roomCode].players[socketId]) {
            const p = rooms[roomCode].players[socketId];
            if (action === 'mouseMove' && inputData) {
              p.mouseX = clamp(inputData.x || 0, 0, MAP_SIZE);
              p.mouseY = clamp(inputData.y || 0, 0, MAP_SIZE);
            } else if (action === 'startShooting' && p.alive) {
              p.isHoldingFire = true;
              if (p.isReloading && p.reloadEndTime && Date.now() >= p.reloadEndTime) p.isReloading = false;
              if (!p.isReloading) p.isShooting = true;
            } else if (action === 'stopShooting') {
              p.isHoldingFire = false;
              p.isShooting = false;
            } else if (action === 'clickShoot' && p.alive) {
              p.clickShoot = true;
            } else if (action === 'manualReload' && p.alive) {
              const now = Date.now();
              if (p.isReloading && (p.reloadEndTime ? now >= p.reloadEndTime : p.reloadTimer <= 0)) p.isReloading = false;
              if (!p.isReloading && p.weapon !== 'minigun') {
                const wDef = WEAPONS[p.weapon];
                if (wDef && p.ammo < wDef.magSize) {
                  p.isReloading = true;
                  p.isShooting = false;
                  p.clickShoot = false;
                  let duration = 0;
                  if (p.weapon === 'revolver') {
                    p.revolverReloadStartAmmo = p.ammo;
                    p.revolverReloadStartTime = now;
                    p.revolverInterrupting = false;
                    p.revolverFinalAmmo = 6;
                    duration = (6 - p.ammo) * 0.4 + 0.5;
                  } else {
                    duration = wDef.reloadTime;
                  }
                  p.reloadTimer = duration;
                  p.reloadEndTime = now + duration * 1000;
                }
              }
            } else if (action === 'autoReload' && p.alive) {
              if (p.weapon !== 'minigun') {
                const wDef = WEAPONS[p.weapon];
                p.isReloading = true;
                p.isShooting = false;
                p.clickShoot = false;
                let duration = 0;
                if (p.weapon === 'revolver') {
                  p.revolverReloadStartAmmo = p.ammo;
                  p.revolverReloadStartTime = Date.now();
                  p.revolverInterrupting = false;
                  p.revolverFinalAmmo = 6;
                  duration = 6 * 0.4 + 0.5;
                } else {
                  duration = wDef ? wDef.reloadTime : 2.27;
                }
                p.reloadTimer = duration;
                p.reloadEndTime = Date.now() + duration * 1000;
              }
            } else if (action === 'cancelRevolverReload' && p.alive) {
              if (p.isReloading && p.weapon === 'revolver' && !p.revolverInterrupting) {
                const now = Date.now();
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
                const duration = timeUntilCurrentDone + 0.5;
                p.reloadTimer = duration;
                p.reloadEndTime = now + duration * 1000;
              }
            } else if (action === 'reloadFinished') {
              p.isReloading = false;
              p.reloadTimer = 0;
              p.reloadEndTime = 0;
              p.revolverInterrupting = false;
              if (data.ammo !== undefined) p.ammo = data.ammo;
            } else if (action === 'equipRevolver' && p.alive) {
              if (p.storedPickup) { activateStoredPickup(p); }
              else if (p.weapon !== 'revolver') { switchToRevolver(p); }
            }
          }
        } else if (data.type === 'PLAYER_LEAVE') {
          const { roomCode, socketId } = data;
          if (rooms[roomCode] && rooms[roomCode].players[socketId]) {
            delete rooms[roomCode].players[socketId];
            rooms[roomCode].playerCount = Math.max(0, Object.keys(rooms[roomCode].players).length);
          }
        }
      } catch (err) {
        console.error('Redis room sync error:', err.message);
      }
    });
  })
  .catch((err) => {
    console.error('❌ Redis connection failed:', err.message);
    console.log('⚠️  FALLBACK: Running in single-CPU mode (Redis not required)');
    console.log('💡 To enable cluster mode: Install Redis and restart server');
  });

function publishRoomSync(type, data) {
  if (redisClient && redisClient.isOpen) {
    redisClient.publish('cluster_room_sync', JSON.stringify({ workerIndex: WORKER_INDEX, type, ...data }));
  }
}

// Redis error handling (non-blocking)
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});

subClient.on('error', (err) => {
  console.error('Redis Sub Client Error:', err.message);
});

// Redis reconnection success
redisClient.on('connect', () => {
  console.log('✅ Redis client reconnected');
});

subClient.on('connect', () => {
  console.log('✅ Redis sub client reconnected');
});

// CORS middleware + iframe embedding headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Allow iframe embedding
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  
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
const RECONNECT_TIMEOUT = 30000; // 30 saniye içinde geri dönebilir
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
const VIEW_RANGE = 3500; // Optimized viewport range for fast networking and zero flicker

// Zone-based update throttling for performance
const ZONE_CLOSE = 2000;
const ZONE_MID = 3500;
const ZONE_FAR = 5000;

const ZONE_CLOSE_SQ = ZONE_CLOSE * ZONE_CLOSE;
const ZONE_MID_SQ = ZONE_MID * ZONE_MID;
const ZONE_FAR_SQ = ZONE_FAR * ZONE_FAR;

// Performance optimization: Room stats tracking
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
const disconnectedPlayers = new Map(); // socketId -> { player, roomCode, disconnectTime }

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

let roomCounter = 100000;
function generateRoomCode() {
  let code = roomCounter.toString();
  while (rooms[code]) {
    roomCounter++;
    code = roomCounter.toString();
  }
  return code;
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

// Formation cache per player (stretch + angle cache)
const playerFormationCache = new Map();

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

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const invSqrtStretch = 1 / Math.sqrt(stretch);
  const result = new Array(count);
  for (let i = 0; i < count; i++) {
    const ox = baseFormation[i].baseX * stretch;
    const oy = baseFormation[i].baseY * invSqrtStretch;
    result[i] = {
      ox: ox * cos - oy * sin,
      oy: ox * sin + oy * cos
    };
  }
  return result;
}

function getCachedFormation(playerId, count, stretch, angle) {
  const cacheKey = `${playerId}_${count}`;
  const cached = playerFormationCache.get(cacheKey);
  
  // Cache if stretch and angle haven't changed much (0.01 threshold)
  if (cached && 
      Math.abs(cached.stretch - stretch) < 0.01 && 
      Math.abs(cached.angle - angle) < 0.01) {
    return cached.formation;
  }
  
  const formation = computeFormation(count, stretch, angle);
  playerFormationCache.set(cacheKey, { stretch, angle, formation });
  
  // Limit cache size
  if (playerFormationCache.size > 100) {
    const firstKey = playerFormationCache.keys().next().value;
    playerFormationCache.delete(firstKey);
  }
  
  return formation;
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
function createRoomObj(code, isPrivate) {
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
    spawnTickNeutral: 0,
    spawnTickPickup: 0,
    // Per-room leaderboard cache (prevents mixing data between rooms)
    leaderboardCache: null,
    leaderboardCacheTime: 0
  };
}

function getOrCreateRoom() {
  // Find oldest PUBLIC room with space (fill current room completely before opening a new room)
  const availablePublicRooms = Object.values(rooms)
    .filter(r => !r.isPrivate && r.playerCount < MAX_PLAYERS)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (availablePublicRooms.length > 0) {
    return availablePublicRooms[0];
  }
  
  if (Object.keys(rooms).length >= MAX_ROOMS) return null;
  
  let code = generateRoomCode();
  let attempts = 0;
  while ((rooms[code] || code.startsWith('0')) && attempts < 100) { 
    code = generateRoomCode(); 
    attempts++; 
  }
  if (attempts >= 100) return null;
  
  rooms[code] = createRoomObj(code, false);
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
function createPlayer(id, name, color, skin, hasAdBonus, token) {
  const pos = randPos();
  const w = WEAPONS.revolver;
  const userToken = token || `token_${id}_${Date.now()}_${Math.random()}`;
  const p = {
    id, token: userToken, name: (name || 'Soldier').substring(0, 16),
    color: color || '#3498db', skin: skin || null,
    x: pos.x, y: pos.y, angle: 0, mouseX: pos.x, mouseY: pos.y,
    soldiers: [], weapon: 'revolver', ammo: w.magSize,
    storedRevolverAmmo: undefined,
    isShooting: false, clickShoot: false,
    isReloading: false, reloadTimer: 0, reloadEndTime: 0, fireTimer: 0,
    shieldActive: !!hasAdBonus, shieldTimer: hasAdBonus ? 15 : 0, weaponTimer: 0,
    alive: true, kills: 0, storedPickup: null,
    maxSoldiers: 1, stretch: 1.0
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

function respawnPlayer(player) {
  const pos = randPos();
  player.x = pos.x; player.y = pos.y;
  player.soldiers = []; player.weapon = 'revolver';
  player.ammo = WEAPONS.revolver.magSize;
  player.storedRevolverAmmo = undefined;
  player.isShooting = false; player.clickShoot = false;
  player.isReloading = false; player.reloadTimer = 0; player.reloadEndTime = 0; player.fireTimer = 0;
  player.shieldActive = false; player.shieldTimer = 0; player.weaponTimer = 0;
  player.alive = true; player.maxSoldiers = 1; player.stretch = 1.0;
}

function switchToRevolver(player) {
  if (player.weapon === 'revolver') player.storedRevolverAmmo = player.ammo;
  player.weapon = 'revolver';
  player.ammo = player.storedRevolverAmmo !== undefined ? player.storedRevolverAmmo : WEAPONS.revolver.magSize;
  player.weaponTimer = 0; player.isReloading = false; player.reloadTimer = 0; player.reloadEndTime = 0; player.fireTimer = 0;
}

function activateStoredPickup(player) {
  if (!player.storedPickup) return false;
  const { type, ammo } = player.storedPickup;
  player.storedPickup = null;
  if (player.weapon === 'revolver') player.storedRevolverAmmo = player.ammo;
  player.weapon = type; player.ammo = ammo;
  player.weaponTimer = WEAPONS[type].duration;
  player.isReloading = false; player.reloadTimer = 0; player.reloadEndTime = 0; player.fireTimer = 0;
  return true;
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
      publishRoomSync('PLAYER_LEAVE', { roomCode, socketId });
    }
    
    if (room.playerCount === 0) {
      setTimeout(() => {
        if (rooms[roomCode] && rooms[roomCode].playerCount === 0) {
          delete rooms[roomCode];
          console.log(`🗑️ Empty room cleaned: ${roomCode}`);
        }
      }, 30000);
    }
  }
  delete socketToRoom[socketId];
}

// ==========================================
//  SOCKET HANDLERS
// ==========================================
io.on('connection', (socket) => {

  // Normal multiplayer join
  socket.on('join', (data) => {
    leaveCurrentRoom(socket.id);
    const room = getOrCreateRoom();
    if (!room) { socket.emit('serverFull'); return; }
    
    const name = (data.name || 'Soldier').substring(0, 16);
    const p = createPlayer(socket.id, name, data.color, data.skin, data.hasAdBonus, data.token);
    room.players[socket.id] = p;
    socketToRoom[socket.id] = room.code;
    socket.join(room.code);
    room.playerCount++;
    room.lastActivity = Date.now();

    publishRoomSync('PLAYER_JOIN', { roomCode: room.code, socketId: socket.id, player: p });

    console.log(`👤 Player ${name} joined room ${room.code} (${room.playerCount}/${MAX_PLAYERS})`);
    socket.emit('joined', { id: socket.id, mapSize: MAP_SIZE, roomCode: room.code, token: p.token });
  });

  // Join specific room by code
  socket.on('joinRoom', (data) => {
    leaveCurrentRoom(socket.id);
    const roomCode = data.roomCode;
    // Reject empty, non-6-digit, or room codes starting with '0'
    if (!roomCode || !/^[1-9]\d{5}$/.test(roomCode)) { socket.emit('roomNotFound'); return; }
    
    let room = getRoomByCode(roomCode);
    
    // If room doesn't exist, create it
    if (!room) {
      if (Object.keys(rooms).length >= MAX_ROOMS) { socket.emit('roomNotFound'); return; }
      rooms[roomCode] = createRoomObj(roomCode, true); // Private room
      room = rooms[roomCode];
      console.log(`🏠 New private room: ${roomCode}`);
    }
    
    if (room.playerCount >= MAX_PLAYERS) { socket.emit('roomFull'); return; }
    
    const name = (data.name || 'Soldier').substring(0, 16);
    const p = createPlayer(socket.id, name, data.color, data.skin, data.hasAdBonus, data.token);
    room.players[socket.id] = p;
    socketToRoom[socket.id] = room.code;
    socket.join(room.code);
    room.playerCount++;
    room.lastActivity = Date.now();

    publishRoomSync('PLAYER_JOIN', { roomCode: room.code, socketId: socket.id, player: p });

    console.log(`👤 Player ${name} joined room ${roomCode} (${room.playerCount}/${MAX_PLAYERS})`);
    socket.emit('joined', { id: socket.id, mapSize: MAP_SIZE, roomCode: room.code, token: p.token });
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
      publishRoomSync('PLAYER_INPUT', { roomCode, socketId: socket.id, action: 'mouseMove', inputData: { x: p.mouseX, y: p.mouseY } });
    }
  });

  socket.on('startShooting', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p && p.alive) {
      p.isHoldingFire = true;
      if (p.isReloading && p.reloadEndTime && Date.now() >= p.reloadEndTime) p.isReloading = false;
      if (!p.isReloading) p.isShooting = true;
      publishRoomSync('PLAYER_INPUT', { roomCode, socketId: socket.id, action: 'startShooting' });
    }
  });

  socket.on('stopShooting', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p) {
      p.isHoldingFire = false;
      p.isShooting = false;
      publishRoomSync('PLAYER_INPUT', { roomCode, socketId: socket.id, action: 'stopShooting' });
    }
  });

  socket.on('clickShoot', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p && p.alive) {
      p.clickShoot = true;
      publishRoomSync('PLAYER_INPUT', { roomCode, socketId: socket.id, action: 'clickShoot' });
    }
  });

  socket.on('manualReload', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (p && p.alive) {
      const now = Date.now();
      if (p.isReloading && (p.reloadEndTime ? now >= p.reloadEndTime : p.reloadTimer <= 0)) p.isReloading = false;
      if (!p.isReloading) {
        if (p.weapon === 'minigun') return; // Minigun has no reload
        const wDef = WEAPONS[p.weapon];
        if (p.ammo < wDef.magSize) {
          p.isReloading = true;
          p.isShooting = false;
          p.clickShoot = false;
          let duration = 0;
          if (p.weapon === 'revolver') {
            const missing = 6 - p.ammo; // Calculate exact missing bullets (no Math.max!)
            p.revolverReloadStartAmmo = p.ammo;
            p.revolverReloadStartTime = now;
            p.revolverInterrupting = false;
            p.revolverFinalAmmo = 6;
            duration = missing * 0.4 + 0.5;
          } else {
            duration = wDef.reloadTime;
          }
          p.reloadTimer = duration;
          p.reloadEndTime = now + duration * 1000;
          publishRoomSync('PLAYER_INPUT', { roomCode, socketId: socket.id, action: 'manualReload' });
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
      const duration = timeUntilCurrentDone + 0.5;
      p.reloadTimer = duration;
      p.reloadEndTime = now + duration * 1000;
      publishRoomSync('PLAYER_INPUT', { roomCode, socketId: socket.id, action: 'cancelRevolverReload' });
    }
  });

  socket.on('equipRevolver', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players[socket.id];
    if (!p || !p.alive) return;
    if (p.storedPickup) { activateStoredPickup(p); }
    else if (p.weapon !== 'revolver') switchToRevolver(p);
    publishRoomSync('PLAYER_INPUT', { roomCode, socketId: socket.id, action: 'equipRevolver' });
  });

  socket.on('pingCheck', (clientTime, callback) => {
    if (typeof callback === 'function') {
      callback(clientTime);
    }
  });

  socket.on('disconnect', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode || !rooms[roomCode]) return;
    
    const room = rooms[roomCode];
    const player = room.players[socket.id];
    
    if (player) {
      const token = player.token || socket.id;
      console.log(`⚠️ Player ${player.name} (${token}) disconnected, waiting for reconnect...`);
      
      disconnectedPlayers.set(token, {
        player: player,
        roomCode: roomCode,
        oldSocketId: socket.id,
        disconnectTime: Date.now()
      });
      
      // 30 saniye sonra hala geri dönmediyse sil
      setTimeout(() => {
        if (disconnectedPlayers.has(token)) {
          const dData = disconnectedPlayers.get(token);
          if (dData && dData.oldSocketId === socket.id) {
            console.log(`❌ Player ${player.name} timeout, removing from game`);
            disconnectedPlayers.delete(token);
            leaveCurrentRoom(socket.id);
          }
        }
      }, RECONNECT_TIMEOUT);
    } else {
      leaveCurrentRoom(socket.id);
    }
  });

  socket.on('reconnectPlayer', (data) => {
    const token = data ? data.token : null;
    if (!token) {
      socket.emit('reconnectFailed');
      return;
    }

    let dData = disconnectedPlayers.get(token);
    
    // Fallback: Check if player is still in room under token
    if (!dData && data.roomCode && rooms[data.roomCode]) {
      const room = rooms[data.roomCode];
      for (const pId in room.players) {
        if (room.players[pId].token === token) {
          dData = { player: room.players[pId], roomCode: data.roomCode, oldSocketId: pId };
          break;
        }
      }
    }

    if (dData) {
      const room = rooms[dData.roomCode];
      if (room) {
        const oldId = dData.oldSocketId;
        const player = dData.player;

        // Update player reference in room
        if (oldId !== socket.id) {
          delete room.players[oldId];
          delete socketToRoom[oldId];
        }

        player.id = socket.id;
        room.players[socket.id] = player;
        socketToRoom[socket.id] = dData.roomCode;
        socket.join(dData.roomCode);

        disconnectedPlayers.delete(token);

        console.log(`✅ Player ${player.name} reconnected successfully! (New socket: ${socket.id})`);

        socket.emit('joined', {
          id: socket.id,
          mapSize: MAP_SIZE,
          roomCode: room.isPrivate ? room.code : room.code,
          token: token
        });
        return;
      }
    }

    console.log(`❌ Reconnect failed for token ${token}`);
    socket.emit('reconnectFailed');
  });
});

// ==========================================
//  GAME LOOP (Optimized)
// ==========================================
function gameLoop() {
  const dt = 1 / TICK_RATE;

  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    // Only the designated host worker runs physics and spawning for this room
    const roomNum = parseInt(roomCode, 10);
    const isHostWorker = isNaN(roomNum) || (roomNum % numCPUs) === (WORKER_INDEX - 1);
    if (!isHostWorker) continue;

    const players = room.players;
    const bullets = room.bullets;
    const neutralSoldiers = room.neutralSoldiers;
    const pickups = room.pickups;

    // --- Update Players ---
    for (const id in players) {
      const p = players[id];
      if (!p.alive) continue;

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

      // Formation - USE CACHED VERSION
      const formation = getCachedFormation(id, p.soldiers.length, p.stretch, p.angle);
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
        
        // Clamp soldier position to map boundaries
        s.x = clamp(s.x, SOLDIER_RADIUS, MAP_SIZE - SOLDIER_RADIUS);
        s.y = clamp(s.y, SOLDIER_RADIUS, MAP_SIZE - SOLDIER_RADIUS);
      }

      // Recruit neutrals - VIEWPORT CULLING: Only check visible area
      const recruitRadSq = RECRUIT_RADIUS * RECRUIT_RADIUS;
      const armyBoundRadN = Math.ceil(Math.sqrt((p.soldiers.length || 1) / 3)) * 30 + 80 + RECRUIT_RADIUS;
      const armyBoundSqN = armyBoundRadN * armyBoundRadN;
      
      // Viewport culling: Calculate player's view area (based on scale)
      const scaleLevel = calculateScaleLevel(p.soldiers.length + 1);
      const viewRadius = (1000 * Math.pow(1.1, scaleLevel)) + armyBoundRadN; // Player's view range
      const viewRadiusSq = viewRadius * viewRadius;

      for (let j = neutralSoldiers.length - 1; j >= 0; j--) {
        const ns = neutralSoldiers[j];
        
        // OPTIMIZE: Skip if outside viewport
        const dSqView = distSq(p, ns);
        if (dSqView > viewRadiusSq) continue;
        
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
        if (p.reloadTimer <= 0 || (p.reloadEndTime && Date.now() >= p.reloadEndTime)) {
          p.isReloading = false;
          p.ammo = (p.weapon === 'revolver' && p.revolverInterrupting) ? (p.revolverFinalAmmo || 6) : (p.weapon === 'revolver' ? 6 : WEAPONS[p.weapon].magSize);
          p.reloadTimer = 0;
          p.reloadEndTime = 0;
          p.revolverInterrupting = false;

          publishRoomSync('PLAYER_INPUT', { roomCode, socketId: p.id, action: 'reloadFinished', ammo: p.ammo });

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
            let duration = 0;
            if (p.weapon === 'revolver') {
              p.revolverReloadStartAmmo = p.ammo;
              p.revolverReloadStartTime = Date.now();
              p.revolverInterrupting = false;
              p.revolverFinalAmmo = 6;
              duration = 6 * 0.4 + 0.5; // 2.9s full reload
            } else {
              duration = wDef.reloadTime;
            }
            p.reloadTimer = duration;
            p.reloadEndTime = Date.now() + duration * 1000;
            publishRoomSync('PLAYER_INPUT', { roomCode, socketId: p.id, action: 'autoReload' });
          }
        }
      }
      p.clickShoot = false;

      // Pickup collision - VIEWPORT CULLING
      const pickupRadSq = (SOLDIER_RADIUS + PICKUP_RADIUS) * (SOLDIER_RADIUS + PICKUP_RADIUS);
      const armyBoundRadP = Math.ceil(Math.sqrt((p.soldiers.length || 1) / 3)) * 30 + 80 + PICKUP_RADIUS;
      const armyBoundSqP = armyBoundRadP * armyBoundRadP;

      for (let i = pickups.length - 1; i >= 0; i--) {
        const pk = pickups[i];
        
        // OPTIMIZE: Skip if outside viewport (reuse viewRadiusSq from above)
        const dSqView = distSq(p, pk);
        if (dSqView > viewRadiusSq) continue;
        
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
              
              io.to(enemy.id).emit('eliminated', { 
                score: soldierCount, kills: enemyKills, maxSoldiers: enemyMaxSoldiers
              });
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
    
    // Cache leaderboard calculation per-room (update every 500ms instead of every tick)
    let leaderboard;
    if (!room.leaderboardCache || (now - room.leaderboardCacheTime) > LEADERBOARD_CACHE_MS) {
      const alivePlayers = Object.values(players).filter(p => p.alive);
      
      // Always return at least one entry (even if no players) to prevent empty leaderboard
      if (alivePlayers.length === 0) {
        leaderboard = [];
      } else {
        leaderboard = alivePlayers
          .map(p => ({ name: p.name, score: p.soldiers.length + 1, color: p.color }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5); // Top 5 players only
      }
      
      room.leaderboardCache = leaderboard;
      room.leaderboardCacheTime = now;
    } else {
      leaderboard = room.leaderboardCache;
    }

    const totalPlayers = Object.values(players).filter(p => p.alive).length;

    // Build full player data once (object pooling for better performance)
    const allPlayerData = {};
    const minimapData = [];
    for (const id in players) {
      const p = players[id];
      if (p.alive) {
        minimapData.push({
          id: p.id,
          x: Math.round(p.x),
          y: Math.round(p.y),
          color: p.color
        });
      }
      const solLen = p.soldiers.length;
      const solArr = new Array(solLen);
      for (let sIdx = 0; sIdx < solLen; sIdx++) {
        const s = p.soldiers[sIdx];
        solArr[sIdx] = { x: Math.round(s.x), y: Math.round(s.y), cs: s.canShoot };
      }
      allPlayerData[id] = {
        id: p.id, name: p.name, color: p.color, skin: p.skin,
        x: Math.round(p.x), y: Math.round(p.y), angle: Math.round((p.angle || 0) * 100) / 100,
        soldiers: solArr,
        weapon: p.weapon, weaponName: WEAPONS[p.weapon].name,
        ammo: p.ammo, maxAmmo: WEAPONS[p.weapon].magSize,
        isReloading: p.isReloading, isShooting: !!p.isShooting, clickShoot: !!p.clickShoot,
        shieldActive: p.shieldActive, shieldTimer: Math.round((p.shieldTimer || 0) * 10) / 10,
        weaponTimer: Math.round((p.weaponTimer || 0) * 10) / 10,
        score: p.soldiers.length + 1, alive: p.alive, kills: p.kills || 0,
        hasStoredPickup: !!p.storedPickup
      };
    }

    // Send filtered state per player (optimized with zone-based throttling)
    const viewRangeSq = VIEW_RANGE * VIEW_RANGE;
    const playerViewRangeSq = (VIEW_RANGE + 600) * (VIEW_RANGE + 600);
    
    for (const id in players) {
      const me = players[id];
      
      // Initialize player's frame counter if not exists
      if (!me.updateFrame) me.updateFrame = 0;
      me.updateFrame++;

      // Filter players by distance (always full detail for players)
      const nearPlayers = {};
      for (const pid in players) {
        const other = players[pid];
        if (!other.alive) continue;
        if (pid === id) {
          nearPlayers[pid] = allPlayerData[pid];
        } else {
          const dx = me.x - other.x;
          const dy = me.y - other.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < playerViewRangeSq) {
            nearPlayers[pid] = allPlayerData[pid];
          }
        }
      }
      
      // Filter neutrals in viewport (consistent broadcast to prevent flickering)
      const nearNeutrals = [];
      const neutralLen = neutralSoldiers.length;
      for (let i = 0; i < neutralLen; i++) {
        const n = neutralSoldiers[i];
        const dx = me.x - n.x;
        const dy = me.y - n.y;
        if ((dx * dx + dy * dy) <= viewRangeSq) {
          nearNeutrals.push({ id: n.id, x: Math.round(n.x), y: Math.round(n.y), cs: n.canShoot });
        }
      }
      
      // Filter bullets (always every frame, full precision - critical for gameplay)
      const nearBullets = [];
      const bulletLen = bullets.length;
      for (let i = 0; i < bulletLen; i++) {
        const b = bullets[i];
        const dx = me.x - b.x;
        const dy = me.y - b.y;
        if ((dx * dx + dy * dy) <= viewRangeSq) {
          nearBullets.push({ id: b.id, x: Math.round(b.x), y: Math.round(b.y), c: b.color, weapon: b.weapon, ownerId: b.ownerId });
        }
      }
      
      // Filter pickups in viewport (consistent broadcast)
      const nearPickups = [];
      const pickupLen = pickups.length;
      for (let i = 0; i < pickupLen; i++) {
        const pk = pickups[i];
        const dx = me.x - pk.x;
        const dy = me.y - pk.y;
        if ((dx * dx + dy * dy) <= viewRangeSq) {
          nearPickups.push({ id: pk.id, x: Math.round(pk.x), y: Math.round(pk.y), type: pk.type });
        }
      }

      const state = {
        players: nearPlayers,
        neutrals: nearNeutrals,
        pickups: nearPickups,
        bullets: nearBullets,
        leaderboard,
        totalPlayers,
        minimap: minimapData,
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
  console.log(`⚡ [CPU ${WORKER_INDEX}] Worker process ${process.pid} listening on http://localhost:${PORT}`);
});
} // End of Worker process block
