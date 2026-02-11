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

## Mobile Support
- Responsive layout for phone screens (max-width: 768px media query)
- Touch controls: left/right d-pad buttons + jump/slide/dash action buttons
- Fixed at bottom of screen, semi-transparent, thumb-friendly sizing
- Multi-touch support (hold direction while pressing jump)
- Prevents zoom/scroll interference during gameplay
- Landscape mode optimizations (hidden header, adjusted sizes)
- Desktop version completely unchanged (controls hidden via CSS)
- Canvas scales to full width on mobile with proper aspect ratio

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
- Character animation uses _limbBlend for smooth transitions
- Boss class (BossMonkey) has 3 phases with increasing difficulty
- Score multiplier applies to all collected points
- Delta-time normalization ensures consistent game speed regardless of frame rate
- Inactive entities/projectiles/pigeons are periodically purged from arrays (every 60 frames)

## How It Runs
- Served via Python's built-in HTTP server on port 5000
- Deployed as a static site with the root directory as public

## Recent Changes
- 2026-02-11: Added mobile touch controls and responsive layout for phone browsers
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
