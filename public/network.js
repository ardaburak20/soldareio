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

  let sessionToken = null;
  let currentRoomCode = null;
  let isPlayingMatch = false;

  let pendingReload = false; // Queue reload if socket disconnected

  function connect() {
    if (socket) return;
    const backendUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : window.location.origin;
    console.log('🔌 Connecting to backend:', backendUrl);
    socket = io(backendUrl, { 
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 50,        // 25 → 50 (daha fazla deneme)
      timeout: 30000,                   // 20s → 30s (daha uzun timeout)
      forceNew: false                   // Aynı socket ID'yi kullan
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to backend!');
      
      // Send pending reload if queued
      if (pendingReload) {
        console.log('📤 Sending queued reload request');
        socket.emit('manualReload');
        pendingReload = false;
      }
      
      if (sessionToken && isPlayingMatch) {
        console.log('🔄 Reconnecting player session with token:', sessionToken);
        socket.emit('reconnectPlayer', { token: sessionToken, roomCode: currentRoomCode });
      } else if (pendingJoin) {
        socket.emit(pendingJoin.event, pendingJoin.payload);
        pendingJoin = null;
      }
      
      if (onReconnectSuccessCallback) onReconnectSuccessCallback();
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Connection lost. Reconnecting... Reason:', reason);
      if (onDisconnectCallback) onDisconnectCallback(reason);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}/50`);
      if (onReconnectAttemptCallback) onReconnectAttemptCallback(attempt);
    });

    socket.on('reconnect_failed', () => {
      console.log('❌ Reconnection failed. Please refresh the page.');
      isPlayingMatch = false;
      sessionToken = null;
      if (onReconnectFailedCallback) onReconnectFailedCallback();
    });

    socket.on('reconnectFailed', () => {
      console.log('❌ Reconnect rejected by server.');
      isPlayingMatch = false;
      sessionToken = null;
      if (onReconnectFailedCallback) onReconnectFailedCallback();
    });

    let stateWatchdogTimer = null;

    socket.on('joined', (data) => {
      myId = data.id;
      mapSize = data.mapSize;
      if (data.token) sessionToken = data.token;
      if (data.roomCode !== undefined) currentRoomCode = data.roomCode;
      isPlayingMatch = true;
      if (onJoinedCallback) onJoinedCallback(data);

      if (stateWatchdogTimer) clearTimeout(stateWatchdogTimer);
      stateWatchdogTimer = setTimeout(() => {
        if (isPlayingMatch && socket && socket.connected) {
          console.log('⚠️ GameState delayed, requesting sync...');
          socket.emit('mouseMove', { x: 5000, y: 5000 });
        }
      }, 3000);
    });

    socket.on('gameState', (state) => {
      if (stateWatchdogTimer) {
        clearTimeout(stateWatchdogTimer);
        stateWatchdogTimer = null;
      }
      if (onStateCallback) onStateCallback(state);
    });

    socket.on('eliminated', (data) => {
      isPlayingMatch = false;
      sessionToken = null;
      currentRoomCode = null;
      if (onEliminatedCallback) onEliminatedCallback(data);
    });

    socket.on('serverFull', () => {
      if (onServerFullCallback) onServerFullCallback();
    });

    socket.on('roomNotFound', () => {
      isPlayingMatch = false;
      sessionToken = null;
      if (onRoomNotFoundCallback) onRoomNotFoundCallback();
    });

    socket.on('roomFull', () => {
      if (onRoomFullCallback) onRoomFullCallback();
    });
  }

  function disconnect() {
    isPlayingMatch = false;
    sessionToken = null;
    currentRoomCode = null;
    if (socket) {
      try { socket.disconnect(); } catch(e){}
      socket = null;
      myId = null;
    }
  }

  function isConnected() {
    return !!(socket && socket.connected);
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
    if (socket && socket.connected) {
      try {
        socket.emit('manualReload');
      } catch (err) {
        console.log('⏳ Failed to emit reload, queuing request');
        pendingReload = true;
      }
    } else {
      console.log('⏳ Socket not connected, queuing reload request');
      pendingReload = true;
    }
  }

  function cancelRevolverReload() {
    if (socket && socket.connected) socket.emit('cancelRevolverReload');
  }

  function measurePing(callback) {
    if (!socket || !socket.connected) return;
    const start = Date.now();
    socket.emit('pingCheck', start, () => {
      const ping = Date.now() - start;
      if (callback) callback(ping);
    });
  }

  function getId() { return myId; }
  function getMapSize() { return mapSize; }

  function onState(cb) { onStateCallback = cb; }
  function onJoined(cb) { onJoinedCallback = cb; }
  function onEliminated(cb) { onEliminatedCallback = cb; }
  function onServerFull(cb) { onServerFullCallback = cb; }
  function onRoomNotFound(cb) { onRoomNotFoundCallback = cb; }
  function onRoomFull(cb) { onRoomFullCallback = cb; }
  function onDisconnect(cb) { onDisconnectCallback = cb; }
  function onReconnectAttempt(cb) { onReconnectAttemptCallback = cb; }
  function onReconnectSuccess(cb) { onReconnectSuccessCallback = cb; }
  function onReconnectFailed(cb) { onReconnectFailedCallback = cb; }

  return {
    connect, disconnect, isConnected, join, joinRoom, sendMouse, 
    startShooting, stopShooting, clickShoot, manualReload, cancelRevolverReload,
    equipRevolver, measurePing,
    getId, getMapSize,
    onState, onJoined, onEliminated, onServerFull, onRoomNotFound, onRoomFull,
    onDisconnect, onReconnectAttempt, onReconnectSuccess, onReconnectFailed
  };
})();
