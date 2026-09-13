// ==========================================
//  SOLDARE.IO - Network Layer (v4.0 - Simplified)
// ==========================================
const Network = (() => {
  let socket = null;
  let myId = null;
  let mapSize = 5000;
  let onStateCallback = null;
  let onJoinedCallback = null;
  let onEliminatedCallback = null;
  let onServerFullCallback = null;
  let onRoomNotFoundCallback = null;
  let onRoomFullCallback = null;

  function connect() {
    if (socket) return;
    const backendUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : window.location.origin;
    console.log('🔌 Connecting to backend:', backendUrl);
    socket = io(backendUrl, { 
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 50,        // 25 → 50 (daha fazla deneme)
      timeout: 30000,                   // 20s → 30s (daha uzun timeout)
      forceNew: false                   // Aynı socket ID'yi kullan
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to backend!');
      
      // Reconnect sonrası kullanıcıya bildir
      if (myId && onStateCallback) {
        console.log('✅ Reconnected successfully!');
      }
      
      if (pendingJoin) {
        socket.emit(pendingJoin.event, pendingJoin.payload);
        pendingJoin = null;
      }
    });

    socket.on('disconnect', () => {
      console.log('⚠️ Connection lost. Reconnecting...');
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}/50`);
    });

    socket.on('reconnect_failed', () => {
      console.log('❌ Reconnection failed. Please refresh the page.');
    });

    socket.on('joined', (data) => {
      myId = data.id;
      mapSize = data.mapSize;
      if (onJoinedCallback) onJoinedCallback(data);
    });

    socket.on('gameState', (state) => {
      if (onStateCallback) onStateCallback(state);
    });

    socket.on('eliminated', (data) => {
      if (onEliminatedCallback) onEliminatedCallback(data);
    });

    socket.on('serverFull', () => {
      if (onServerFullCallback) onServerFullCallback();
    });

    socket.on('roomNotFound', () => {
      if (onRoomNotFoundCallback) onRoomNotFoundCallback();
    });

    socket.on('roomFull', () => {
      if (onRoomFullCallback) onRoomFullCallback();
    });
  }

  let pendingJoin = null;

  function sendJoinEvent(event, payload) {
    connect();
    if (socket) {
      if (socket.connected) {
        socket.emit(event, payload);
        pendingJoin = null;
      } else {
        pendingJoin = { event, payload };
        try { socket.connect(); } catch(e){}
      }
    }
  }

  function join(name, color, skin, hasAdBonus) {
    sendJoinEvent('join', { name, color, skin, hasAdBonus });
  }

  function joinWithBots(name, color, skin, hasAdBonus) {
    sendJoinEvent('joinWithBots', { name, color, skin, hasAdBonus });
  }

  function joinRoom(roomCode, name, color, skin, hasAdBonus) {
    sendJoinEvent('joinRoom', { roomCode, name, color, skin, hasAdBonus });
  }

  function sendMouse(x, y) {
    if (socket) socket.volatile.emit('mouseMove', { x, y });
  }

  function startShooting() {
    if (socket) socket.emit('startShooting');
  }

  function stopShooting() {
    if (socket) socket.emit('stopShooting');
  }

  function clickShoot() {
    if (socket) socket.emit('clickShoot');
  }

  function equipRevolver() {
    if (socket) socket.emit('equipRevolver');
  }

  function manualReload() {
    if (socket) socket.emit('manualReload');
  }

  function cancelRevolverReload() {
    if (socket) socket.emit('cancelRevolverReload');
  }

  function getId() { return myId; }
  function getMapSize() { return mapSize; }

  function onState(cb) { onStateCallback = cb; }
  function onJoined(cb) { onJoinedCallback = cb; }
  function onEliminated(cb) { onEliminatedCallback = cb; }
  function onServerFull(cb) { onServerFullCallback = cb; }
  function onRoomNotFound(cb) { onRoomNotFoundCallback = cb; }
  function onRoomFull(cb) { onRoomFullCallback = cb; }

  return {
    connect, join, joinWithBots, joinRoom, sendMouse, 
    startShooting, stopShooting, clickShoot, manualReload, cancelRevolverReload,
    equipRevolver,
    getId, getMapSize,
    onState, onJoined, onEliminated, onServerFull, onRoomNotFound, onRoomFull
  };
})();
