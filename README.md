# Soldare.io Backend Server

Multiplayer 2D top-down .io game backend with Socket.io

## Features

- Real-time multiplayer gameplay
- **Mobile & Desktop Support:**
  - Desktop: Mouse controls (move, aim, shoot)
  - Mobile: Touch controls with virtual joystick and action buttons
- Regional pricing with IP detection
- Google OAuth login
- High score persistence
- Gold & items system
- Bot AI for offline play

## Mobile Controls

- **Joystick (Bottom Left):** Move and aim direction
- **Fire Button (Bottom Right):** Shoot
- **Reload Button (Top Left of Fire):** Reload weapon

Controls automatically adapt based on device type. Desktop users play with mouse, mobile users see touch controls.

## Glitch Deployment

1. Go to https://glitch.com
2. Click "New Project" → "Import from GitHub" 
3. Or manually create project and upload these files:
   - server.js
   - package.json
   - config.json (empty: `{}`)
   - users.json (empty: `{}`)
   - highscores.json (empty: `{}`)

## Environment Variables (Optional)

- `PORT` - Server port (default: 3000)

## Features

- Real-time multiplayer gameplay
- Regional pricing with IP detection
- Google OAuth login
- High score persistence
- Gold & items system
