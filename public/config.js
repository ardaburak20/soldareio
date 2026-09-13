// Backend configuration - CrazyGames iframe support
const hostname = window.location.hostname;
const isCrazyGames = hostname.includes('crazygames.com');

const BACKEND_URL = isCrazyGames 
  ? 'https://soldare.io'  // CrazyGames için soldare.io backend
  : window.location.origin; // Diğer durumlar için kendi origin

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = '639114910021-71d8vcj63rh24joti3g6shbv55dkes2o.apps.googleusercontent.com';
