# Chandni Chowk Hustle: Deluxe Edition

## Overview
A browser-based platformer game set in the streets of Old Delhi. Players dodge rickshaws, outsmart monkeys, and collect samosas across 5 levels to become the Chandni Chowk Champion. Features procedural audio, visual effects, and rich Indian cultural elements.

## Project Architecture
- **Type**: Static HTML/JS game (multi-file)
- **index.html** — Game structure, UI overlays, HUD
- **styles.css** — All styling, animations, ability indicators
- **audio.js** — Web Audio API procedural sound system (AudioManager)
- **effects.js** — Particle system and VFX manager (VFX, Particle classes)
- **game.js** — Main game engine, entities, level generation, game loop
- **Frameworks**: Tailwind CSS (CDN), vanilla JavaScript canvas game engine
- **No backend** — purely client-side

## Key Features
- 5 themed levels with unique sky/ground colors
- Player abilities: double jump, slide, dash with cooldown
- Procedural sound effects and background music (Web Audio API)
- Screen shake, particle effects, Holi color splashes
- Canvas-drawn animated characters (Raju/Priya) with walking/running limb animation
- Desi collectibles: chai (speed boost), paan/tulsi/coconut (+1 life), mango (+2 lives), diya (bonus points), jalebi
- Obstacles: rickshaws, cows, monkeys, street dogs, water puddles
- Background decorations: kites, rangoli, marigold garlands, string lights, temple spires
- Combo system for stomping enemies
- Score popups and chai boost bar

## How It Runs
- Served via Python's built-in HTTP server on port 5000
- Deployed as a static site with the root directory as public

## Recent Changes
- 2026-02-10: Replaced emoji player with canvas-drawn animated character with walking/running animation, added life-up items (tulsi, mango, coconut), increased life-ups in later levels
- 2026-02-10: Major Deluxe upgrade — split into modular files, added sound system, new abilities, VFX, desi elements
- 2026-02-09: Initial Replit environment setup
