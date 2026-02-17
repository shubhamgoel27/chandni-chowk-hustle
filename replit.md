# Chandni Chowk Hustle: Deluxe Edition

## Overview
A browser-based platformer game set in the streets of Old Delhi. Players dodge rickshaws, outsmart monkeys, and collect samosas across 5 levels to become the Chandni Chowk Champion. Features procedural audio, visual effects, and rich Indian cultural elements.

## Project Architecture
- **Type**: Static HTML/JS game (multi-file)
- **index.html** — Game structure, UI overlays, HUD
- **styles.css** — All styling, animations, ability indicators
- **audio.js** — Web Audio API procedural sound system (AudioManager)
- **effects.js** — Particle system and VFX manager (VFX, Particle classes)
- **game.js** — Main game engine, entities, level generation, game loop, boss fight
- **Frameworks**: Tailwind CSS (CDN), vanilla JavaScript canvas game engine
- **No backend** — purely client-side

## Key Features
- 5 themed levels with unique sky/ground colors
- Player abilities: slide, dash with cooldown
- Double jump is a collectible power-up (🪶 feather, temporary)
- Procedural sound effects and background music (Web Audio API)
- Screen shake, particle effects, Holi color splashes
- Simple cute chibi-style canvas-drawn characters (Raju/Priya) with walking animation
- Differentiated power-ups:
  - 🌿 Paan: Speed boost (temporary)
  - 🌱 Tulsi: Shield/invulnerability (temporary)
  - 🥭 Mango: 2x score multiplier (temporary)
  - 🥥 Coconut: +1 extra life
  - 🪶 Feather: Double jump power (temporary)
  - 🍵 Chai: Speed boost
  - 🪔 Diya: Bonus points
  - 🍥 Jalebi: Points
- Obstacles: rickshaws, cows, monkeys, street dogs, water puddles
- Background decorations: kites, rangoli, marigold garlands, string lights, temple spires
- Combo system for stomping enemies
- Score popups, chai boost bar, score multiplier indicator
- **Boss Fight**: Level 5 features "Monkey Raja" — a giant monkey boss that must be stomped 3 times. Gets faster and throws more bananas with each hit.

## Technical Notes
- All canvas drawing uses save/restore to prevent globalAlpha and shadowBlur leaks
- **Zero shadowBlur policy**: All glow effects use manually drawn semi-transparent circles instead of ctx.shadowBlur to prevent emoji/text wash-out artifacts
- **Emoji rendering**: All game entity emojis are pre-rendered to offscreen canvases (emojiCache) and drawn via drawImage() instead of fillText(). This prevents browser compositing issues that cause emojis to appear transparent. Uses getEmojiImage(emoji, size) and drawEmoji() helper functions.
- Character animation uses _limbBlend for smooth transitions
- Boss class (BossMonkey) has 3 phases with increasing difficulty
- Score multiplier applies to all collected points
- Delta-time normalization ensures consistent game speed regardless of frame rate
- Inactive entities/projectiles/pigeons are periodically purged from arrays (every 60 frames)

## How It Runs
- Served via Python's built-in HTTP server on port 5000
- Deployed as a static site with the root directory as public

## Recent Changes
- 2026-02-11: Converted all emoji rendering from fillText() to pre-rendered offscreen canvas drawImage() to fix persistent transparency bug
- 2026-02-11: Fixed entity transparency bug with explicit globalAlpha/shadowBlur resets in all draw methods and between game loop sections
- 2026-02-11: Added delta-time smoothing (exponential moving average) to eliminate speed jitter
- 2026-02-11: Added boss fight preparation zone: clear area with power-ups and warning sign before Monkey Raja
- 2026-02-10: Fixed elements disappearing in Level 4 by adding periodic array cleanup for inactive entities/projectiles
- 2026-02-10: Added delta-time normalization to all game physics for consistent speed
- 2026-02-10: Fixed transparency/rendering bugs with proper canvas save/restore
- 2026-02-10: Redesigned characters as simple cute chibi style
- 2026-02-10: Converted double jump to collectible power-up (feather)
- 2026-02-10: Differentiated all power-ups with unique effects
- 2026-02-10: Added Monkey Raja boss fight on Level 5
- 2026-02-10: Replaced emoji player with canvas-drawn animated character
- 2026-02-10: Major Deluxe upgrade — split into modular files, added sound system, new abilities, VFX, desi elements
- 2026-02-09: Initial Replit environment setup
