const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

if (!ctx.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        this.beginPath();
        this.moveTo(x + r[0], y);
        this.arcTo(x + w, y, x + w, y + h, r[1]);
        this.arcTo(x + w, y + h, x, y + h, r[2]);
        this.arcTo(x, y + h, x, y, r[3]);
        this.arcTo(x, y, x + w, y, r[0]);
        this.closePath();
        return this;
    };
}

const GRAVITY = 0.8;
const GROUND_Y = 620;

const LEVEL_CONFIG = [
    { dist: 6000, name: "The Market", desc: "Avoid Rickshaws and grab samosas!", sky1: '#87CEEB', sky2: '#FFF3E0', groundColor: '#8D6E63', accent: '#FF6F00' },
    { dist: 9000, name: "Paranthe Wali Gali", desc: "Watch out for cows and slippery oil!", sky1: '#FFE0B2', sky2: '#FFF8E1', groundColor: '#795548', accent: '#F57F17' },
    { dist: 12000, name: "Kinari Bazaar", desc: "Jump on cloth stalls to stay safe.", sky1: '#E1BEE7', sky2: '#FCE4EC', groundColor: '#6D4C41', accent: '#AD1457' },
    { dist: 15000, name: "Rooftops", desc: "Monkeys are angry! Dodge the bananas!", sky1: '#FFCCBC', sky2: '#FBE9E7', groundColor: '#5D4037', accent: '#BF360C' },
    { dist: 20000, name: "Red Fort", desc: "The final stretch. Don't stop!", sky1: '#B3E5FC', sky2: '#E8F5E9', groundColor: '#4E342E', accent: '#1B5E20' }
];

const PLAYER_W = 70;
const PLAYER_H = 100;
const PLATFORM_H = 160;
const PLATFORM_W = 220;

const SPRITES = {
    raju: '👦🏽', priya: '👧🏽',
    rickshaw: '🛺', cow: '🐄', monkey: '🐒',
    food: ['🥟', '🧆', '☕', '🧁', '🍩'],
    desiFood: ['🫓', '🍵', '🪔'],
    pigeon: '🐦', banana: '🍌',
    dog: '🐕', heart: '❤️',
    chai: '🍵', paan: '🌿', diya: '🪔', jalebi: '🍥',
    tulsi: '🌱', mango: '🥭', coconut: '🥥',
    kite: '🪁', marigold: '🌼', bell: '🔔',
    autoRickshaw: '🛺',
    feather: '🪶'
};

const emojiCache = {};
function getEmojiImage(emoji, size) {
    const key = emoji + '_' + size;
    if (emojiCache[key]) return emojiCache[key];
    const padding = Math.ceil(size * 0.3);
    const canvasSize = size + padding * 2;
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasSize;
    offscreen.height = canvasSize;
    const offCtx = offscreen.getContext('2d');
    offCtx.clearRect(0, 0, canvasSize, canvasSize);
    offCtx.globalAlpha = 1;
    offCtx.font = size + 'px Arial';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(emoji, canvasSize / 2, canvasSize / 2);
    emojiCache[key] = { canvas: offscreen, size: canvasSize, padding: padding };
    return emojiCache[key];
}

function drawEmoji(emoji, x, y, size, scaleX, scaleY, rot) {
    const cached = getEmojiImage(emoji, size);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(x, y);
    if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(cached.canvas, -cached.size / 2, -cached.size / 2, cached.size, cached.size);
    ctx.restore();
}

let gameState = {
    screen: 'START',
    level: 1,
    score: 0,
    lives: 5,
    cameraX: 0,
    gameWidth: 0,
    character: 'raju',
    platforms: [],
    pigeons: [],
    projectiles: [],
    totalDistanceTraveled: 0,
    comboCount: 0,
    comboTimer: 0,
    chaiBoostTimer: 0,
    puddles: [],
    kites: [],
    stringLights: [],
    rangolis: [],
    scorePopups: [],
    lastFrameTime: 0,
    deltaTime: 1,
    smoothDelta: 1,
    cleanupAccum: 0,
    frameCount: 0,
    bossDefeated: false,
    bossWarningX: 0,
    bossWarningShown: false
};

window.selectChar = function (char) {
    gameState.character = char;
    document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
    document.getElementById(`btn-${char}`).classList.add('selected');
    document.getElementById('startBtn').disabled = false;
};

const keys = { right: false, left: false, up: false, down: false, dash: false };

const handleKeyDown = (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!keys.up) {
            keys.up = true;
            if (gameState.screen === 'PLAY') player.jump();
        }
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (!keys.down) {
            keys.down = true;
            if (gameState.screen === 'PLAY') player.startSlide();
        }
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') {
        if (!keys.dash) {
            keys.dash = true;
            if (gameState.screen === 'PLAY') player.startDash();
        }
    }
};

const handleKeyUp = (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') keys.dash = false;
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

const bindTouch = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys[key] = true;
        if (key === 'up' && gameState.screen === 'PLAY') player.jump();
        if (key === 'down' && gameState.screen === 'PLAY') player.startSlide();
        if (key === 'dash' && gameState.screen === 'PLAY') player.startDash();
    });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    el.addEventListener('mousedown', () => {
        keys[key] = true;
        if (key === 'up' && gameState.screen === 'PLAY') player.jump();
        if (key === 'down' && gameState.screen === 'PLAY') player.startSlide();
        if (key === 'dash' && gameState.screen === 'PLAY') player.startDash();
    });
    el.addEventListener('mouseup', () => keys[key] = false);
};
bindTouch('leftBtn', 'left');
bindTouch('rightBtn', 'right');
bindTouch('jumpBtn', 'up');
bindTouch('slideBtn', 'down');
bindTouch('dashBtn', 'dash');

class ScorePopup {
    constructor(x, y, text, color) {
        this.x = x; this.y = y;
        this.text = text; this.color = color;
        this.life = 1.0; this.vy = -2;
    }
    update() { const dt = gameState.deltaTime; this.y += this.vy * dt; this.life -= 0.02 * dt; }
    draw() {
        if (this.life <= 0) return;
        const drawX = this.x - gameState.cameraX;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = 'bold 28px Poppins';
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, drawX, this.y);
        ctx.fillText(this.text, drawX, this.y);
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.w = 50; this.h = 50;
        this.active = true;
        this.rot = 0;
    }
    update() {
        const dt = gameState.deltaTime;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 0.15 * dt;
        this.rot += 0.1 * dt;
        if (this.y > GROUND_Y) this.active = false;
    }
    draw() {
        if (!this.active) return;
        let drawX = this.x - gameState.cameraX;
        if (drawX < -50 || drawX > canvas.width + 50) return;
        drawEmoji(SPRITES.banana, drawX + 25, this.y + 25, 50, 1, 1, this.rot);
    }
}

class Pigeon {
    constructor(x) {
        this.x = x;
        this.y = GROUND_Y + 20;
        this.flying = false;
        this.vx = 0; this.vy = 0;
        this.flip = Math.random() > 0.5;
    }
    update() {
        const dt = gameState.deltaTime;
        if (!this.flying && Math.abs(this.x - player.x) < 200) {
            this.flying = true;
            this.vy = -4 - Math.random() * 3;
            this.vx = (this.x < player.x) ? -4 : 4;
            this.flip = (this.vx < 0);
        }
        if (this.flying) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.vy -= 0.15 * dt;
        }
    }
    draw() {
        if (this.y < -50) return;
        let drawX = this.x - gameState.cameraX;
        if (drawX < -50 || drawX > canvas.width + 50) return;
        drawEmoji(SPRITES.pigeon, drawX, this.y, 30, this.flip ? -1 : 1, 1, 0);
    }
}

class WaterPuddle {
    constructor(x) {
        this.x = x;
        this.y = GROUND_Y - 5;
        this.w = 120 + Math.random() * 80;
        this.h = 10;
        this.splashed = false;
    }
    draw() {
        let drawX = this.x - gameState.cameraX;
        if (drawX < -200 || drawX > canvas.width + 200) return;
        ctx.fillStyle = 'rgba(33, 150, 243, 0.4)';
        ctx.beginPath();
        ctx.ellipse(drawX + this.w / 2, this.y + 5, this.w / 2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(drawX + this.w / 2 - 10, this.y + 2, this.w / 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Platform {
    constructor(x, type) {
        this.x = x;
        this.y = GROUND_Y - PLATFORM_H;
        this.w = PLATFORM_W;
        this.h = PLATFORM_H;
        this.type = type;
        this.garlandOffset = Math.random() * Math.PI * 2;
    }
    draw() {
        let drawX = this.x - gameState.cameraX;
        if (drawX < -300 || drawX > canvas.width + 300) return;

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#CD853F';
        ctx.fillRect(drawX, this.y, this.w, this.h);
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(drawX + 15, this.y + 15, this.w - 30, this.h - 15);

        if (this.type === 0) {
            ctx.fillStyle = '#F97316';
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.arc(drawX + 50 + (j * 45), this.y + 110, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFCC80';
                ctx.beginPath();
                ctx.arc(drawX + 50 + (j * 45), this.y + 105, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#F97316';
            }
        } else if (this.type === 1) {
            ['#EF4444', '#10B981', '#3B82F6', '#F59E0B'].forEach((c, k) => {
                ctx.fillStyle = c;
                ctx.fillRect(drawX + 30 + (k * 42), this.y + 30, 35, 100);
            });
        } else if (this.type === 2) {
            ctx.fillStyle = '#FFA726';
            for (let j = 0; j < 4; j++) {
                ctx.beginPath();
                ctx.arc(drawX + 35 + (j * 45), this.y + 90, 15, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#FF7043';
            for (let j = 0; j < 4; j++) {
                ctx.beginPath();
                ctx.arc(drawX + 35 + (j * 45), this.y + 120, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.beginPath();
        ctx.moveTo(drawX, this.y);
        ctx.lineTo(drawX + this.w, this.y);
        ctx.lineTo(drawX + this.w + 15, this.y + 50);
        ctx.lineTo(drawX - 15, this.y + 50);
        const awningColors = ['#C62828', '#1565C0', '#2E7D32', '#E65100', '#6A1B9A'];
        ctx.fillStyle = awningColors[this.type % awningColors.length];
        ctx.fill();

        const stripeColor = 'rgba(255,255,255,0.15)';
        ctx.fillStyle = stripeColor;
        for (let s = 0; s < 4; s++) {
            ctx.fillRect(drawX + 20 + s * 55, this.y, 25, 50);
        }

        ctx.fillStyle = (this.type % 2 === 0) ? '#FCD34D' : '#F87171';
        ctx.beginPath();
        ctx.arc(drawX + 20, this.y + 60, 8, 0, Math.PI * 2);
        ctx.arc(drawX + this.w - 20, this.y + 60, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(drawX + 20, this.y + 56, 3, 0, Math.PI * 2);
        ctx.arc(drawX + this.w - 20, this.y + 56, 3, 0, Math.PI * 2);
        ctx.fill();

        const t = Date.now() / 1000 + this.garlandOffset;
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let g = 0; g <= this.w; g += 5) {
            const gy = this.y - 5 + Math.sin((g / this.w) * Math.PI) * 15 + Math.sin(t + g * 0.05) * 2;
            if (g === 0) ctx.moveTo(drawX + g, gy);
            else ctx.lineTo(drawX + g, gy);
        }
        ctx.stroke();

        const marigoldCount = 6;
        for (let m = 0; m < marigoldCount; m++) {
            const mx = drawX + (this.w / (marigoldCount + 1)) * (m + 1);
            const my = this.y - 5 + Math.sin(((m + 1) / (marigoldCount + 1)) * Math.PI) * 15;
            ctx.fillStyle = m % 2 === 0 ? '#FF9800' : '#FFC107';
            ctx.beginPath();
            ctx.arc(mx, my, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Player {
    constructor() {
        this.w = PLAYER_W;
        this.h = PLAYER_H;
        this.normalH = PLAYER_H;
        this.slideH = 50;
        this.x = 100;
        this.y = GROUND_Y - this.h;
        this.vx = 0;
        this.vy = 0;
        this.speed = 8;
        this.jumpStrength = -22;
        this.grounded = true;
        this.facingRight = true;
        this.sprite = (gameState.character === 'raju') ? SPRITES.raju : SPRITES.priya;
        this.animTimer = 0;
        this.scaleY = 1;

        this.canDoubleJump = false;
        this.hasDoubleJumped = false;
        this.hasDoubleJumpPower = false;
        this.doubleJumpTimer = 0;
        this.scoreMultiplier = 1;
        this.scoreMultTimer = 0;

        this.isSliding = false;
        this.slideTimer = 0;
        this.slideDuration = 30;

        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 12;
        this.dashCooldown = 0;
        this.dashCooldownMax = 180; // Increased to 3s to prevent abuse
        this.dashSpeed = 25;

        this.invulnTimer = 0;
        this.dustTimer = 0;

        if (gameState.character === 'priya') {
            this.jumpStrength = -25;
            this.speed = 7;
        }
    }

    jump() {
        if (this.isSliding) return;
        if (this.grounded) {
            this.vy = this.jumpStrength;
            this.grounded = false;
            this.scaleY = 1.3;
            this.hasDoubleJumped = false;
            VFX.createDust(this.x + this.w / 2, this.y + this.h, 8);
            AudioManager.jump();
        } else if (this.hasDoubleJumpPower && !this.hasDoubleJumped) {
            this.vy = this.jumpStrength * 0.85;
            this.hasDoubleJumped = true;
            this.scaleY = 1.2;
            VFX.createSparkle(this.x + this.w / 2, this.y + this.h / 2, 8, '#FF9800');
            AudioManager.doubleJump();
        }
    }

    startSlide() {
        if (!this.grounded || this.isSliding || this.isDashing) return;
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        this.h = this.slideH;
        this.y = GROUND_Y - this.h;
        AudioManager.slide();
    }

    endSlide() {
        this.isSliding = false;
        this.h = this.normalH;
        this.y = GROUND_Y - this.h;
    }

    startDash() {
        if (this.dashCooldown > 0 || this.isDashing || this.isSliding) return;
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.invulnTimer = Math.max(this.invulnTimer, this.dashDuration);
        AudioManager.dash();
    }

    update() {
        const dt = gameState.deltaTime;
        const speedMult = gameState.chaiBoostTimer > 0 ? 1.5 : 1;

        if (this.isDashing) {
            this.dashTimer -= dt;
            this.vx = this.facingRight ? this.dashSpeed : -this.dashSpeed;
            VFX.createDashTrail(this.x + (this.facingRight ? 0 : this.w), this.y + this.h / 2, this.facingRight);
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashCooldown = this.dashCooldownMax;
            }
        } else if (this.isSliding) {
            this.slideTimer -= dt;
            this.vx *= Math.pow(0.95, dt);
            this.dustTimer += dt;
            if (Math.floor(this.dustTimer) % 4 === 0) {
                VFX.createDust(this.x + this.w / 2, this.y + this.h, 2);
            }
            if (this.slideTimer <= 0 || !keys.down) {
                this.endSlide();
            }
        } else {
            if (keys.right) { this.vx = this.speed * speedMult; this.facingRight = true; this.animTimer++; }
            else if (keys.left) { this.vx = -this.speed * speedMult; this.facingRight = false; this.animTimer++; }
            else { this.vx *= Math.pow(0.8, dt); if (Math.abs(this.vx) < 1) this.vx = 0; }
        }

        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.invulnTimer > 0) this.invulnTimer -= dt;

        if (gameState.chaiBoostTimer > 0) {
            gameState.chaiBoostTimer -= dt;
            if (Math.abs(this.vx) > 2) {
                VFX.createSpeedLines(this.x + this.w, this.y + this.h / 2);
            }
        }

        this.x += this.vx * dt;
        if (this.x < 0) this.x = 0;
        if (this.x > gameState.gameWidth) this.x = gameState.gameWidth;

        if (!this.isDashing) {
            this.vy += GRAVITY * dt;
        }
        this.y += this.vy * dt;

        let wasGrounded = this.grounded;
        this.grounded = false;

        if (!this.isSliding) {
            gameState.platforms.forEach(p => {
                if (this.vy > 0 &&
                    this.y + this.h > p.y &&
                    this.y + this.h < p.y + this.vy * dt + 30 &&
                    this.x + this.w > p.x + 20 &&
                    this.x < p.x + p.w - 20) {
                    this.y = p.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                    if (this.scaleY === 1) this.scaleY = 0.85;
                }
            });
        }

        if (!this.grounded && this.y >= GROUND_Y - this.h) {
            this.y = GROUND_Y - this.h;
            this.vy = 0;
            this.grounded = true;
            if (!wasGrounded) {
                if (this.scaleY === 1) this.scaleY = 0.9;
                VFX.createLandingDust(this.x + this.w / 2, GROUND_Y);
            }
        }

        if (this.grounded) {
            this.hasDoubleJumped = false;
        }

        if (this.doubleJumpTimer > 0) {
            this.doubleJumpTimer -= dt;
            if (this.doubleJumpTimer <= 0) {
                this.hasDoubleJumpPower = false;
            }
        }
        if (this.scoreMultTimer > 0) {
            this.scoreMultTimer -= dt;
            if (this.scoreMultTimer <= 0) {
                this.scoreMultiplier = 1;
            }
        }

        this.scaleY += (1 - this.scaleY) * (1 - Math.pow(0.85, dt));
        if (Math.abs(this.scaleY - 1) < 0.01) this.scaleY = 1;
        if (!this.grounded && !this.isDashing) this.scaleY = 1.05;

        if (this.grounded && Math.abs(this.vx) > 3) {
            this.dustTimer += dt;
            if (Math.floor(this.dustTimer) % 8 === 0) {
                VFX.createDust(this.x + this.w / 2, this.y + this.h, 2);
            }
        }

        gameState.puddles.forEach(puddle => {
            if (this.grounded &&
                this.x + this.w > puddle.x &&
                this.x < puddle.x + puddle.w &&
                !this.isDashing) {
                if (Math.abs(this.vx) > 2 && !puddle.splashed) {
                    VFX.createWaterSplash(this.x + this.w / 2, GROUND_Y);
                    AudioManager.splash();
                    puddle.splashed = true;
                    this.vx *= 1.5;
                }
            }
        });

        let targetCamX = this.x - canvas.width / 3;
        if (targetCamX < 0) targetCamX = 0;
        if (targetCamX > gameState.gameWidth - canvas.width) targetCamX = gameState.gameWidth - canvas.width;
        gameState.cameraX += (targetCamX - gameState.cameraX) * (1 - Math.pow(0.9, dt));
    }

    draw() {
        let drawX = this.x - gameState.cameraX;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(drawX + this.w / 2, GROUND_Y, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer) % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        if (this.isDashing) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#FF9800';
            ctx.beginPath();
            ctx.arc(drawX + this.w / 2, this.y + this.h - 40, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.translate(drawX + this.w / 2, this.y + this.h);

        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.isSliding) {
            ctx.rotate(-Math.PI / 4);
            ctx.scale(1, 0.7);
        } else {
            ctx.scale(1, this.scaleY);
        }

        const isRaju = (gameState.character === 'raju');
        const skinColor = '#D2956A';
        const hairColor = '#1A1A2E';

        const speed = Math.abs(this.vx);
        const walking = (speed > 2 && this.grounded);
        const running = (speed > 5 && this.grounded);
        const animSpeed = running ? 0.5 : 0.3;
        const targetSwing = walking ? Math.sin(this.animTimer * animSpeed) : 0;
        this._limbBlend = this._limbBlend || 0;
        this._limbBlend += (targetSwing - this._limbBlend) * 0.25;
        const limbSwing = this._limbBlend;
        const bodyBob = walking ? Math.abs(Math.sin(this.animTimer * animSpeed)) * 2 : 0;
        const jumpPose = !this.grounded;
        const bY = -bodyBob;

        const headY = bY - 75;
        const bodyY = bY - 45;

        if (isRaju) {
            ctx.fillStyle = '#1565C0';
            if (jumpPose) {
                ctx.save(); ctx.translate(-7, bY - 15); ctx.rotate(-0.5);
                ctx.fillRect(-4, 0, 8, 25); ctx.restore();
                ctx.save(); ctx.translate(7, bY - 15); ctx.rotate(0.5);
                ctx.fillRect(-4, 0, 8, 25); ctx.restore();
            } else {
                ctx.save(); ctx.translate(-7, bY - 15); ctx.rotate(limbSwing * 0.5);
                ctx.fillRect(-4, 0, 8, 25);
                ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 27, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                ctx.save(); ctx.translate(7, bY - 15); ctx.rotate(-limbSwing * 0.5);
                ctx.fillStyle = '#1565C0'; ctx.fillRect(-4, 0, 8, 25);
                ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 27, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            ctx.fillStyle = '#FF6F00';
            ctx.beginPath();
            ctx.roundRect(-14, bodyY, 28, 32, 4);
            ctx.fill();

            ctx.fillStyle = '#FFB300';
            ctx.beginPath();
            ctx.moveTo(-5, bodyY + 2);
            ctx.lineTo(0, bodyY + 14);
            ctx.lineTo(5, bodyY + 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = skinColor;
            if (jumpPose) {
                ctx.save(); ctx.translate(-14, bodyY + 6); ctx.rotate(-1.0);
                ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                ctx.save(); ctx.translate(14, bodyY + 6); ctx.rotate(1.0);
                ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            } else {
                ctx.save(); ctx.translate(-14, bodyY + 6); ctx.rotate(limbSwing * 0.5);
                ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                ctx.save(); ctx.translate(14, bodyY + 6); ctx.rotate(-limbSwing * 0.5);
                ctx.fillStyle = skinColor; ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }

            ctx.fillStyle = skinColor;
            ctx.beginPath();
            ctx.arc(0, headY, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(-7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
            ctx.ellipse(7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(-7, headY + 2, 3, 0, Math.PI * 2);
            ctx.arc(7, headY + 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(-6, headY + 1, 1.2, 0, Math.PI * 2);
            ctx.arc(8, headY + 1, 1.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#E65100';
            ctx.beginPath();
            ctx.arc(0, headY + 9, 2, 0, Math.PI, false);
            ctx.fill();
            if (walking || running) {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(1, headY + 13, running ? 4 : 2.5, 0, Math.PI, false);
                ctx.fill();
            }

            ctx.fillStyle = hairColor;
            ctx.beginPath();
            ctx.ellipse(0, headY - 10, 18, 12, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-17, headY - 8, 34, 6);

            ctx.fillStyle = '#E53935';
            ctx.beginPath();
            ctx.arc(0, headY - 6, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath();
            ctx.arc(0, headY - 6, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else {

            ctx.fillStyle = '#7B1FA2';
            if (jumpPose) {
                ctx.save(); ctx.translate(-7, bY - 15); ctx.rotate(-0.5);
                ctx.fillRect(-4, 0, 8, 25); ctx.restore();
                ctx.save(); ctx.translate(7, bY - 15); ctx.rotate(0.5);
                ctx.fillRect(-4, 0, 8, 25); ctx.restore();
            } else {
                ctx.save(); ctx.translate(-7, bY - 15); ctx.rotate(limbSwing * 0.5);
                ctx.fillRect(-4, 0, 8, 25);
                ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 27, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                ctx.save(); ctx.translate(7, bY - 15); ctx.rotate(-limbSwing * 0.5);
                ctx.fillStyle = '#7B1FA2'; ctx.fillRect(-4, 0, 8, 25);
                ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 27, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            ctx.fillStyle = '#E91E63';
            ctx.beginPath();
            ctx.moveTo(-14, bodyY + 32);
            ctx.lineTo(-12, bodyY);
            ctx.quadraticCurveTo(0, bodyY - 3, 12, bodyY);
            ctx.lineTo(14, bodyY + 32);
            ctx.quadraticCurveTo(10, bodyY + 36, 0, bodyY + 36);
            ctx.quadraticCurveTo(-10, bodyY + 36, -14, bodyY + 32);
            ctx.fill();

            ctx.fillStyle = '#FFD54F';
            ctx.beginPath();
            ctx.moveTo(-4, bodyY + 3);
            ctx.lineTo(0, bodyY + 12);
            ctx.lineTo(4, bodyY + 3);
            ctx.closePath();
            ctx.fill();

            ctx.save();
            ctx.strokeStyle = '#FF80AB';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.7;
            const dupatAngle = walking ? Math.sin(this.animTimer * 0.15) * 0.3 : 0.1;
            ctx.beginPath();
            ctx.moveTo(10, bodyY + 2);
            ctx.quadraticCurveTo(22, bodyY + 12 + dupatAngle * 8, 18, bodyY + 35);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = skinColor;
            if (jumpPose) {
                ctx.save(); ctx.translate(-14, bodyY + 6); ctx.rotate(-1.0);
                ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                ctx.save(); ctx.translate(14, bodyY + 6); ctx.rotate(1.0);
                ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            } else {
                ctx.save(); ctx.translate(-14, bodyY + 6); ctx.rotate(limbSwing * 0.5);
                ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                ctx.save(); ctx.translate(14, bodyY + 6); ctx.rotate(-limbSwing * 0.5);
                ctx.fillStyle = skinColor; ctx.fillRect(-3, 0, 6, 20);
                ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }

            ctx.fillStyle = skinColor;
            ctx.beginPath();
            ctx.arc(0, headY, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(-7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
            ctx.ellipse(7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(-7, headY + 2, 3, 0, Math.PI * 2);
            ctx.arc(7, headY + 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(-6, headY + 1, 1.2, 0, Math.PI * 2);
            ctx.arc(8, headY + 1, 1.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#E53935';
            ctx.beginPath();
            ctx.arc(0, headY - 5, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#E65100';
            ctx.beginPath();
            ctx.arc(0, headY + 9, 2, 0, Math.PI, false);
            ctx.fill();
            if (walking || running) {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(1, headY + 13, running ? 4 : 2.5, 0, Math.PI, false);
                ctx.fill();
            }

            ctx.fillStyle = hairColor;
            ctx.beginPath();
            ctx.ellipse(0, headY - 8, 19, 14, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-15, headY + 4, 4, 16, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(15, headY + 4, 4, 16, -0.1, 0, Math.PI * 2);
            ctx.fill();
        }

        if (gameState.chaiBoostTimer > 0) {
            const sparkleT = Date.now() / 100;
            for (let i = 0; i < 4; i++) {
                const angle = sparkleT + i * 1.57;
                const sx = Math.cos(angle) * 25;
                const sy = -80 + Math.sin(angle) * 8;
                drawEmoji('✨', sx, sy, 12, 1, 1, 0);
            }
        }

        if (this.hasDoubleJumpPower) {
            const cached = getEmojiImage('🪶', 16);
            ctx.save();
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.3;
            ctx.drawImage(cached.canvas, -cached.size / 2, headY - 22 - cached.size / 2, cached.size, cached.size);
            ctx.restore();
        }

        ctx.restore();
    }
}

class Entity {
    constructor(x, y, type, isHazard, subtype) {
        this.x = x; this.y = y;
        this.w = 80; this.h = 80;
        this.type = type;
        this.isHazard = isHazard;
        this.active = true;
        this.squashed = false;
        this.subtype = subtype || '';

        this.origX = x;
        this.vx = 0;

        if (type === SPRITES.cow) {
            this.vx = (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.7);
            this.patrolDist = 100 + Math.random() * 150;
            this.state = 'walk';
            this.stateTimer = 0;
        }

        if (type === SPRITES.dog) {
            this.vx = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random() * 1.5);
            this.patrolDist = 80 + Math.random() * 120;
            this.state = 'walk';
            this.stateTimer = 0;
        }

        this.throwTimer = Math.random() * 100;
        this.hornTimer = 0;
        this.glowPhase = Math.random() * Math.PI * 2;
    }

    update() {
        const dt = gameState.deltaTime;
        if (this.type === SPRITES.cow) {
            if (this.state === 'walk') {
                this.x += this.vx * dt;
                if (this.x > this.origX + this.patrolDist || this.x < this.origX - this.patrolDist) {
                    this.vx *= -1;
                }
                if (Math.random() < 0.005 * dt) {
                    this.state = 'graze';
                    this.stateTimer = 50 + Math.random() * 100;
                }
            } else if (this.state === 'graze') {
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'walk';
                    if (Math.random() < 0.5) this.vx *= -1;
                }
            }
        }

        if (this.type === SPRITES.dog) {
            if (this.state === 'walk') {
                this.x += this.vx * dt;
                if (this.x > this.origX + this.patrolDist || this.x < this.origX - this.patrolDist) {
                    this.vx *= -1;
                }
                if (Math.abs(this.x - player.x) < 300) {
                    this.state = 'chase';
                }
            } else if (this.state === 'chase') {
                const dir = player.x > this.x ? 1 : -1;
                this.vx = dir * 3;
                this.x += this.vx * dt;
                if (Math.abs(this.x - player.x) > 400) {
                    this.state = 'walk';
                    this.vx = (Math.random() < 0.5 ? 1 : -1) * 1.5;
                }
            }
        }

        if (this.type === SPRITES.rickshaw || this.subtype === 'auto') {
            this.hornTimer += dt;
            if (this.hornTimer > 200 && Math.abs(this.x - player.x) < 400) {
                AudioManager.rickshawHorn();
                this.hornTimer = 0;
            }
        }

        if (this.type === SPRITES.monkey && this.active) {
            const dist = this.x - player.x;
            const inRange = Math.abs(dist) < 1200;
            if (inRange) {
                this.throwTimer += dt;
                if (this.throwTimer > 150) {
                    this.throwTimer = 0;
                    const dir = (dist > 0) ? -1 : 1;
                    const vx = (4 + Math.random() * 2) * dir;
                    const vy = -5 - Math.random() * 3;
                    gameState.projectiles.push(new Projectile(this.x, this.y + 40, vx, vy));
                }
            }
        }
    }

    draw() {
        if (!this.active) return;
        let drawX = this.x - gameState.cameraX;
        if (drawX < -150 || drawX > canvas.width + 150) return;

        const cx = drawX + 40;
        let cy = this.y + 70;
        let scaleX = 1, scaleY = 1, rot = 0;

        if (this.squashed) {
            scaleY = 0.3;
        } else if (this.type === SPRITES.cow) {
            if (this.vx > 0) scaleX = -1;
            rot = this.state === 'graze' ? Math.PI / 8 : Math.sin(Date.now() / 500) * 0.05;
        } else if (this.type === SPRITES.dog) {
            if (this.vx > 0) scaleX = -1;
            rot = Math.sin(Date.now() / 200) * 0.1;
        } else if (this.type === SPRITES.monkey) {
            if (player.x > this.x) scaleX = -1;
            rot = Math.sin(Date.now() / 300) * 0.1;
        } else if (!this.isHazard) {
            cy += Math.sin(Date.now() / 200) * 10;
            const glowColors = { chai: '#FF9800', diya: '#FFD700', paan: '#00E676', tulsi: '#4CAF50', mango: '#FFC107', coconut: '#8D6E63', feather: '#FF9800' };
            if (glowColors[this.subtype]) {
                ctx.save();
                ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 200 + this.glowPhase) * 0.15;
                ctx.fillStyle = glowColors[this.subtype];
                ctx.beginPath();
                ctx.arc(cx, cy - 15, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        drawEmoji(this.type, cx, cy, 80, scaleX, scaleY, rot);
    }
}

class Kite {
    constructor(x) {
        this.x = x;
        this.y = 50 + Math.random() * 150;
        this.color = ['#FF1744', '#FF9100', '#00E676', '#2979FF', '#D500F9'][Math.floor(Math.random() * 5)];
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.3 + Math.random() * 0.5;
    }
    draw() {
        let drawX = this.x - gameState.cameraX * 0.3;
        if (drawX < -50 || drawX > canvas.width + 50) return;
        const t = Date.now() / 1000;
        const bobY = this.y + Math.sin(t * this.speed + this.phase) * 20;

        ctx.save();
        ctx.translate(drawX, bobY);
        ctx.rotate(Math.sin(t * this.speed + this.phase) * 0.2);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(15, 0);
        ctx.lineTo(0, 25);
        ctx.lineTo(-15, 0);
        ctx.fill();

        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 25);
        for (let i = 0; i < 40; i++) {
            ctx.lineTo(Math.sin(i * 0.5 + t) * 5, 25 + i * 2);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

class Rangoli {
    constructor(x) {
        this.x = x;
        this.colors = [
            ['#FF1744', '#FF9100', '#FFEA00'],
            ['#00E676', '#2979FF', '#D500F9'],
            ['#FF4081', '#FF6D00', '#FFD600']
        ][Math.floor(Math.random() * 3)];
        this.size = 30 + Math.random() * 20;
    }
    draw() {
        let drawX = this.x - gameState.cameraX;
        if (drawX < -100 || drawX > canvas.width + 100) return;

        ctx.save();
        ctx.translate(drawX, GROUND_Y + 5);
        ctx.globalAlpha = 0.6;

        for (let ring = 0; ring < 3; ring++) {
            ctx.fillStyle = this.colors[ring];
            const r = this.size - ring * 10;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                ctx.beginPath();
                ctx.ellipse(Math.cos(angle) * r * 0.6, Math.sin(angle) * r * 0.2, 8 - ring * 2, 3, angle, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = this.colors[0];
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function drawStringLights(y) {
    const t = Date.now() / 1000;
    const offset = gameState.cameraX * 0.6;
    const spacing = 80;
    const colors = ['#FF1744', '#FF9100', '#FFEA00', '#00E676', '#2979FF', '#D500F9'];

    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -spacing; x < canvas.width + spacing; x += 5) {
        const wx = x + (offset % spacing);
        const wy = y + Math.sin(wx * 0.02) * 10;
        if (x === -spacing) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
    }
    ctx.stroke();

    for (let x = 0; x < canvas.width + spacing; x += spacing) {
        const wx = x - (offset % spacing);
        const wy = y + Math.sin(wx * 0.02 + offset * 0.02) * 10;
        const idx = Math.floor((x + offset) / spacing) % colors.length;
        const brightness = 0.6 + Math.sin(t * 3 + idx) * 0.4;

        ctx.save();
        ctx.fillStyle = colors[idx];
        ctx.globalAlpha = brightness * 0.3;
        ctx.beginPath();
        ctx.arc(wx, wy + 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = brightness;
        ctx.beginPath();
        ctx.arc(wx, wy + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawBackground() {
    const lvl = LEVEL_CONFIG[gameState.level - 1];
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, lvl.sky1);
    grad.addColorStop(1, lvl.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sunX = canvas.width - 200;
    const sunY = 100;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 167, 38, 0.15)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFA726';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    for (let r = 80; r < 120; r += 10) {
        ctx.globalAlpha = 0.1 - (r - 80) * 0.002;
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    const p1 = gameState.cameraX * 0.15;
    ctx.fillStyle = 'rgba(121, 85, 72, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let i = -200; i < canvas.width + 200; i += 150) {
        let x = i - (p1 % 150);
        ctx.lineTo(x, GROUND_Y - 140);
        ctx.lineTo(x + 30, GROUND_Y - 180);
        ctx.lineTo(x + 60, GROUND_Y - 140);
        ctx.lineTo(x + 150, GROUND_Y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    const p15 = gameState.cameraX * 0.25;
    ctx.fillStyle = 'rgba(121, 85, 72, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let i = -100; i < canvas.width + 200; i += 200) {
        let x = i - (p15 % 200);
        ctx.lineTo(x, GROUND_Y - 100);

        ctx.lineTo(x + 20, GROUND_Y - 110);
        ctx.lineTo(x + 25, GROUND_Y - 130);
        ctx.lineTo(x + 30, GROUND_Y - 140);
        ctx.lineTo(x + 35, GROUND_Y - 130);
        ctx.lineTo(x + 40, GROUND_Y - 110);

        ctx.lineTo(x + 60, GROUND_Y - 100);
        ctx.lineTo(x + 200, GROUND_Y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    gameState.kites.forEach(k => { k.draw(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)'; });

    drawStringLights(30);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';
    if (gameState.level >= 3) drawStringLights(60);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    ctx.fillStyle = lvl.groundColor;
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(0, GROUND_Y, canvas.width, 10);

    const brickP = gameState.cameraX * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let bx = 0; bx < canvas.width + 40; bx += 40) {
        const row = Math.floor((bx + brickP) / 40) % 2;
        ctx.fillRect(bx - (brickP % 40), GROUND_Y + 15 + row * 5, 38, 18);
    }

    gameState.rangolis.forEach(r => { r.draw(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)'; });
}

class BossMonkey {
    constructor(x) {
        this.x = x;
        this.y = GROUND_Y - 200;
        this.w = 160;
        this.h = 200;
        this.hp = 5; // Buffed from 3
        this.maxHp = 5; // Buffed from 3
        this.phase = 0;
        this.active = true;
        this.stunTimer = 0;
        this.throwTimer = 0;
        this.moveDir = 1;
        this.moveSpeed = 2;
        this.baseX = x;
        this.patrolRange = 400;
        this.defeated = false;
        this.defeatTimer = 0;
        this.shakeTimer = 0;
        this.platformsSpawned = false;
    }

    update() {
        if (!this.active) return;
        const dt = gameState.deltaTime;
        if (this.defeated) {
            this.defeatTimer += dt;
            this.y += 1 * dt;
            if (this.defeatTimer > 120) {
                this.active = false;
                gameState.bossDefeated = true;
            }
            return;
        }

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            this.shakeTimer = this.stunTimer;
            return;
        }

        const speed = this.moveSpeed + this.phase * 1;
        this.x += this.moveDir * speed * dt;
        if (this.x > this.baseX + this.patrolRange) this.moveDir = -1;
        if (this.x < this.baseX - this.patrolRange) this.moveDir = 1;

        const throwRate = Math.max(30, 80 - this.phase * 20);
        this.throwTimer += dt;
        if (this.throwTimer >= throwRate) {
            this.throwTimer = 0;
            const dir = player.x < this.x ? -1 : 1;
            const bananaCount = 1 + this.phase;
            for (let i = 0; i < bananaCount; i++) {
                const spread = (i - (bananaCount - 1) / 2) * 2;
                gameState.projectiles.push(new Projectile(
                    this.x + 80, this.y + 60,
                    (5 + Math.random() * 3) * dir + spread,
                    -6 - Math.random() * 3
                ));
            }
            AudioManager.rickshawHorn();
        }
    }

    hit() {
        if (this.stunTimer > 0 || this.defeated) return;
        this.hp--;
        this.stunTimer = 90;
        this.phase = this.maxHp - this.hp;
        VFX.shake(12);
        VFX.createHoliSplash(this.x + 80, this.y + 100);
        AudioManager.stomp();

        if (this.hp <= 0) {
            this.defeated = true;
            this.defeatTimer = 0;
            VFX.flash('#FFD700', 0.5);
            VFX.createSparkle(this.x + 80, this.y + 80, 30, '#FFD700');
            gameState.score += 1000;
            addScorePopup(this.x + 80, this.y, '+1000 BOSS DEFEATED!', '#FFD700');
            AudioManager.levelComplete();
        } else {
            addScorePopup(this.x + 80, this.y, `HIT! ${this.hp} LEFT`, '#FF4081');
        }
    }

    draw() {
        if (!this.active) return;
        const drawX = this.x - gameState.cameraX;
        if (drawX < -200 || drawX > canvas.width + 200) return;

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.translate(drawX + 80, this.y + this.h);

        if (this.shakeTimer > 0) {
            ctx.translate(Math.sin(this.shakeTimer * 2) * 5, 0);
        }
        if (this.defeated) {
            ctx.globalAlpha = Math.max(0, 1 - this.defeatTimer / 120);
            ctx.rotate(this.defeatTimer * 0.02);
        }
        if (this.moveDir < 0) ctx.scale(-1, 1);

        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.ellipse(0, -120, 55, 65, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#D7CCC8';
        ctx.beginPath();
        ctx.ellipse(0, -110, 38, 45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.arc(-18, -125, 12, 0, Math.PI * 2);
        ctx.arc(18, -125, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-18, -125, 7, 0, Math.PI * 2);
        ctx.arc(18, -125, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(-18, -124, 4, 0, Math.PI * 2);
        ctx.arc(18, -124, 4, 0, Math.PI * 2);
        ctx.fill();

        if (this.stunTimer > 0) {
            const stunCached = getEmojiImage('😵', 16);
            ctx.drawImage(stunCached.canvas, -stunCached.size / 2, -155 - stunCached.size / 2, stunCached.size, stunCached.size);
        } else if (this.phase >= 2) {
            ctx.fillStyle = '#E53935';
            ctx.beginPath();
            ctx.arc(-18, -118, 5, 0, Math.PI * 2);
            ctx.arc(18, -118, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#D7CCC8';
        ctx.beginPath();
        ctx.ellipse(0, -100, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.arc(0, -98, 3, 0, Math.PI, false);
        ctx.fill();

        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.roundRect(-40, -70, 80, 75, 10);
        ctx.fill();

        const armSwing = Math.sin(Date.now() / 200) * 0.3;
        ctx.save();
        ctx.translate(-40, -60);
        ctx.rotate(-0.5 + armSwing);
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-10, 0, 18, 50);
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.arc(0, 52, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(40, -60);
        ctx.rotate(0.5 - armSwing);
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-8, 0, 18, 50);
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.arc(0, 52, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#5D4037';
        ctx.save();
        ctx.translate(-20, -5);
        ctx.fillRect(-8, 0, 16, 30);
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.ellipse(0, 32, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(20, -5);
        ctx.fillRect(-8, 0, 16, 30);
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.ellipse(0, 32, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#FFD700';
        ctx.save();
        ctx.translate(0, -185);
        ctx.beginPath();
        ctx.moveTo(-20, 10);
        ctx.lineTo(-15, -5);
        ctx.lineTo(-8, 5);
        ctx.lineTo(0, -12);
        ctx.lineTo(8, 5);
        ctx.lineTo(15, -5);
        ctx.lineTo(20, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();

        ctx.save();
        const hpBarX = drawX + 30;
        const hpBarY = this.y - 30;
        ctx.fillStyle = '#333';
        ctx.fillRect(hpBarX, hpBarY, 100, 12);
        ctx.fillStyle = this.hp > 1 ? '#4CAF50' : '#E53935';
        ctx.fillRect(hpBarX + 1, hpBarY + 1, (this.hp / this.maxHp) * 98, 10);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('MONKEY RAJA', hpBarX + 50, hpBarY - 4);
        ctx.restore();
    }
}

let player;
let entities = [];
let boss = null;

function initLevel(lvlIdx) {
    gameState.level = lvlIdx + 1;
    const config = LEVEL_CONFIG[lvlIdx];
    gameState.gameWidth = config.dist;
    gameState.cameraX = 0;
    gameState.platforms = [];
    gameState.pigeons = [];
    gameState.projectiles = [];
    gameState.puddles = [];
    gameState.kites = [];
    gameState.rangolis = [];

    // Reset Score ONLY on first level
    if (lvlIdx === 0) {
        gameState.score = 0;
        gameState.lives = 5;
        gameState.totalDistanceTraveled = 0;
    }

    gameState.scorePopups = [];
    gameState.comboCount = 0;
    gameState.comboTimer = 0;
    gameState.chaiBoostTimer = 0;
    gameState.bossDefeated = false;
    gameState.bossWarningX = 0;
    gameState.bossWarningShown = false;
    gameState.bossWarningShown = false;
    gameState.lastFrameTime = 0;
    gameState.deltaTime = 1;
    gameState.smoothDelta = 1;
    gameState.cleanupAccum = 0;
    // Player Name for Leaderboard
    if (!gameState.playerName) gameState.playerName = "Anonymous";
    VFX.particles = [];
    player = new Player();
    entities = [];
    boss = null;

    for (let k = 0; k < 15; k++) {
        gameState.kites.push(new Kite(Math.random() * gameState.gameWidth));
    }

    let x = 600;
    while (x < gameState.gameWidth - 600) {
        if (Math.random() < 0.3) gameState.pigeons.push(new Pigeon(x + Math.random() * 150));

        if (Math.random() < 0.15) {
            gameState.rangolis.push(new Rangoli(x + Math.random() * 200));
        }

        if (Math.random() < 0.12 && gameState.level >= 2) {
            gameState.puddles.push(new WaterPuddle(x + Math.random() * 100));
        }

        const powerUpChance = 0.08 + (gameState.level - 1) * 0.04;
        const powerUpItems = [
            { sprite: SPRITES.paan, sub: 'paan' },
            { sprite: SPRITES.tulsi, sub: 'tulsi' },
            { sprite: SPRITES.mango, sub: 'mango' },
            { sprite: SPRITES.coconut, sub: 'coconut' },
            { sprite: SPRITES.feather, sub: 'feather' }
        ];

        if (Math.random() < 0.45) {
            let shopCount = Math.floor(Math.random() * 2) + 1;
            for (let s = 0; s < shopCount; s++) {
                let type = Math.floor(Math.random() * 3);
                gameState.platforms.push(new Platform(x, type));

                if (Math.random() > 0.4) {
                    if (Math.random() < powerUpChance) {
                        const item = powerUpItems[Math.floor(Math.random() * powerUpItems.length)];
                        entities.push(new Entity(x + 70, GROUND_Y - PLATFORM_H - 100, item.sprite, false, item.sub));
                    } else if (Math.random() < 0.2) {
                        entities.push(new Entity(x + 70, GROUND_Y - PLATFORM_H - 100, SPRITES.chai, false, 'chai'));
                    } else if (Math.random() < 0.15) {
                        entities.push(new Entity(x + 70, GROUND_Y - PLATFORM_H - 100, SPRITES.diya, false, 'diya'));
                    } else if (Math.random() < 0.15) {
                        entities.push(new Entity(x + 70, GROUND_Y - PLATFORM_H - 100, SPRITES.jalebi, false, 'jalebi'));
                    } else {
                        let foodType = SPRITES.food[Math.floor(Math.random() * SPRITES.food.length)];
                        entities.push(new Entity(x + 70, GROUND_Y - PLATFORM_H - 100, foodType, false));
                    }
                } else if (gameState.level > 2 || Math.random() < 0.3) {
                    entities.push(new Entity(x + 70, GROUND_Y - PLATFORM_H - 80, SPRITES.monkey, true));
                }
                x += PLATFORM_W + 20;
            }
        } else {
            let gap = 300 + Math.random() * 300;

            if (Math.random() < 0.5 + (gameState.level * 0.05)) {
                if (Math.random() < 0.15 && gameState.level >= 2) {
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, SPRITES.dog, true));
                } else if (Math.random() > 0.7) {
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, SPRITES.cow, true));
                } else {
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, SPRITES.rickshaw, true, 'auto'));
                }
            } else if (Math.random() > 0.5) {
                if (Math.random() < powerUpChance + 0.05) {
                    const item = powerUpItems[Math.floor(Math.random() * powerUpItems.length)];
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, item.sprite, false, item.sub));
                } else if (Math.random() < 0.25) {
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, SPRITES.chai, false, 'chai'));
                } else {
                    let foodType = SPRITES.food[Math.floor(Math.random() * SPRITES.food.length)];
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, foodType, false));
                }
            }

            if (gameState.level >= 3 && Math.random() < 0.08 * gameState.level) {
                const lifeItem = powerUpItems[Math.floor(Math.random() * powerUpItems.length)];
                entities.push(new Entity(x + gap / 2 + 150, GROUND_Y - 80, lifeItem.sprite, false, lifeItem.sub));
            }

            x += gap;
        }
    }

    if (gameState.level === 5) {
        const bossX = gameState.gameWidth - 1200;

        const clearStart = bossX - 800;
        entities = entities.filter(e => e.x < clearStart);
        gameState.platforms = gameState.platforms.filter(p => p.x < clearStart);
        gameState.puddles = gameState.puddles.filter(p => p.x < clearStart);

        entities.push(new Entity(clearStart + 100, GROUND_Y - 80, SPRITES.coconut, false, 'coconut'));
        entities.push(new Entity(clearStart + 250, GROUND_Y - 80, SPRITES.chai, false, 'chai'));
        entities.push(new Entity(clearStart + 400, GROUND_Y - 80, SPRITES.tulsi, false, 'tulsi'));
        entities.push(new Entity(clearStart + 550, GROUND_Y - 80, SPRITES.feather, false, 'feather'));

        gameState.bossWarningX = clearStart + 300;

        boss = new BossMonkey(bossX);
        for (let bp = 0; bp < 5; bp++) {
            const px = bossX - 200 + bp * 250;
            gameState.platforms.push(new Platform(px, Math.floor(Math.random() * 3)));
        }
    }

    document.getElementById('targetDistDisplay').innerText = gameState.gameWidth / 10;
}

function checkCollisions() {
    gameState.projectiles.forEach(proj => {
        if (!proj.active) return;
        if (proj.x > player.x && proj.x < player.x + player.w &&
            proj.y > player.y && proj.y < player.y + player.h) {
            if (player.invulnTimer > 0) {
                proj.active = false;
                VFX.createSparkle(proj.x, proj.y, 5, '#FF9800');
                return;
            }
            proj.active = false;
            gameState.lives--;
            gameState.comboCount = 0;
            VFX.createHitEffect(player.x + 35, player.y + 50);
            AudioManager.hit();
            player.vy = -6;
            player.vx = -10;
            player.invulnTimer = 60;
            updateHUD();
            if (gameState.lives <= 0) endGame(false);
        }
    });

    entities.forEach(ent => {
        if (!ent.active) return;

        let pL = player.x + 15; let pR = player.x + player.w - 15;
        let pT = player.y; let pB = player.y + player.h;
        let eL = ent.x + 15; let eR = ent.x + ent.w - 15;
        let eT = ent.y; let eB = ent.y + ent.h;

        if (pL < eR && pR > eL && pT < eB && pB > eT) {
            if (ent.isHazard) {
                if (player.invulnTimer > 0 && player.isDashing) {
                    ent.squashed = true;
                    ent.active = false;
                    VFX.createHoliSplash(ent.x + 40, ent.y + 40);
                    AudioManager.stomp();
                    gameState.score += 75;
                    addScorePopup(ent.x + 40, ent.y, '+75 DASH!', '#FF9800');
                    if (Math.random() < 0.2) addScorePopup(ent.x + 40, ent.y - 40, "Hatt!", "#FFF");
                    updateHUD();
                    return;
                }

                if ((ent.type === SPRITES.rickshaw || ent.type === SPRITES.cow) && player.vy > 0 && pB < eT + 40) {
                    ent.squashed = true;
                    ent.active = false;
                    player.vy = -14;
                    VFX.createHoliSplash(ent.x + 40, ent.y);
                    AudioManager.stomp();
                    gameState.comboCount++;
                    gameState.comboTimer = 120;
                    const comboBonus = 50 * gameState.comboCount;
                    gameState.score += comboBonus;
                    addScorePopup(ent.x + 40, ent.y, `+${comboBonus} x${gameState.comboCount}`, '#FF4081');
                    if (Math.random() < 0.2) addScorePopup(ent.x + 40, ent.y - 40, "Waah!", "#FFF");
                    updateHUD();
                } else if (!ent.squashed && player.invulnTimer <= 0) {
                    gameState.lives--;
                    gameState.comboCount = 0;
                    ent.active = false;
                    VFX.createHitEffect(player.x + 35, player.y + 50);
                    AudioManager.hit();
                    if (Math.random() < 0.2) addScorePopup(player.x + 35, player.y, "Arey!", "#FFF");
                    player.vy = -10;
                    player.vx = -15;
                    player.invulnTimer = 60;
                    updateHUD();
                    if (gameState.lives <= 0) endGame(false);
                }
            } else {
                let points = 100;
                let feedbackText = "";
                if (ent.subtype === 'chai') {
                    gameState.chaiBoostTimer = 180;
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 15, '#FF9800');
                    VFX.flash('#FF9800', 0.15);
                    points = 200;
                    addScorePopup(ent.x + 40, ent.y, '+200 CHAI BOOST!', '#FF9800');
                    feedbackText = "Kadak!";
                } else if (ent.subtype === 'diya') {
                    points = 300;
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 20, '#FFD700');
                    VFX.flash('#FFD700', 0.15);
                    addScorePopup(ent.x + 40, ent.y, '+300 DIYA!', '#FFD700');
                } else if (ent.subtype === 'jalebi') {
                    points = 150;
                    AudioManager.collect();
                    VFX.createCollectBurst(ent.x + 40, ent.y + 40);
                    addScorePopup(ent.x + 40, ent.y, '+150', '#FFA000');
                    feedbackText = "Mitha!";
                } else if (ent.subtype === 'paan') {
                    points = 75;
                    gameState.chaiBoostTimer = Math.max(gameState.chaiBoostTimer, 120);
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 10, '#00E676');
                    addScorePopup(ent.x + 40, ent.y, 'SPEED BOOST!', '#00E676');
                } else if (ent.subtype === 'tulsi') {
                    points = 100;
                    player.invulnTimer = Math.max(player.invulnTimer, 180);
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 12, '#4CAF50');
                    VFX.flash('#4CAF50', 0.1);
                    addScorePopup(ent.x + 40, ent.y, 'SHIELD!', '#4CAF50');
                } else if (ent.subtype === 'mango') {
                    points = 50;
                    player.scoreMultiplier = 2;
                    player.scoreMultTimer = 300;
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 15, '#FFC107');
                    VFX.flash('#FFC107', 0.1);
                    addScorePopup(ent.x + 40, ent.y, '2x SCORE!', '#FFC107');
                } else if (ent.subtype === 'coconut') {
                    points = 50;
                    gameState.lives = Math.min(gameState.lives + 1, 9);
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 12, '#8D6E63');
                    addScorePopup(ent.x + 40, ent.y, '+1 LIFE!', '#8D6E63');
                } else if (ent.subtype === 'feather') {
                    points = 50;
                    player.hasDoubleJumpPower = true;
                    player.doubleJumpTimer = 600;
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 15, '#FF9800');
                    VFX.flash('#FF9800', 0.15);
                    addScorePopup(ent.x + 40, ent.y, 'DOUBLE JUMP!', '#FF9800');
                } else {
                    AudioManager.collect();
                    VFX.createCollectBurst(ent.x + 40, ent.y + 40);
                    addScorePopup(ent.x + 40, ent.y, `+${points}`, '#FFD700');
                    if (Math.random() < 0.2) feedbackText = ["Mast!", "Gazab!", "Crispy!"][Math.floor(Math.random() * 3)];
                }
                gameState.score += Math.floor(points * player.scoreMultiplier);
                ent.active = false;

                if (feedbackText && Math.random() < 0.3) {
                    addScorePopup(ent.x + 40, ent.y - 40, feedbackText, '#FFD700');
                }

                updateHUD();
            }
        }
    });

    if (boss && boss.active && !boss.defeated) {
        const bL = boss.x + 20; const bR = boss.x + boss.w - 20;
        const bT = boss.y; const bB = boss.y + boss.h;
        const pL = player.x + 15; const pR = player.x + player.w - 15;
        const pT = player.y; const pB = player.y + player.h;

        if (pL < bR && pR > bL && pT < bB && pB > bT) {
            if (player.vy > 0 && pB < bT + 50) {
                boss.hit();
                player.vy = -18;
                player.invulnTimer = Math.max(player.invulnTimer, 30);
            } else if (player.isDashing && player.invulnTimer > 0) {
                boss.hit();
                player.vx = player.facingRight ? -15 : 15;
            } else if (player.invulnTimer <= 0) {
                gameState.lives--;
                VFX.createHitEffect(player.x + 35, player.y + 50);
                AudioManager.hit();
                player.vy = -12;
                player.vx = player.x < boss.x + 80 ? -15 : 15;
                player.invulnTimer = 60;
                updateHUD();
                if (gameState.lives <= 0) endGame(false);
            }
        }
    }

    if (gameState.level === 5 && boss) {
        if (gameState.bossDefeated) endGame(true);
    } else {
        if (player.x >= gameState.gameWidth - 200) endGame(true);
    }
}

function addScorePopup(x, y, text, color) {
    gameState.scorePopups.push(new ScorePopup(x, y, text, color));
}

function updateHUD() {
    document.getElementById('scoreDisplay').innerText = gameState.score;
    document.getElementById('livesDisplay').innerText = gameState.lives;
    document.getElementById('distDisplay').innerText = Math.floor(player.x / 10);

    const dashEl = document.getElementById('dashCooldownOverlay');
    if (dashEl) {
        const pct = player.dashCooldown / player.dashCooldownMax;
        dashEl.style.height = (pct * 100) + '%';
    }

    const boostBar = document.getElementById('chaiBoostBar');
    if (boostBar) {
        if (gameState.chaiBoostTimer > 0) {
            boostBar.classList.remove('hidden');
            const pct = (gameState.chaiBoostTimer / 180) * 100;
            document.getElementById('chaiBoostFill').style.width = pct + '%';
        } else {
            boostBar.classList.add('hidden');
        }
    }

    if (gameState.comboTimer > 0) {
        gameState.comboTimer -= gameState.deltaTime;
        if (gameState.comboTimer <= 0) gameState.comboCount = 0;
    }

    const djIcon = document.getElementById('doubleJumpIcon');
    if (djIcon) {
        djIcon.style.opacity = player.hasDoubleJumpPower ? '1' : '0.3';
    }

    const multBar = document.getElementById('scoreMultBar');
    if (multBar) {
        if (player.scoreMultiplier > 1) {
            multBar.classList.remove('hidden');
        } else {
            multBar.classList.add('hidden');
        }
    }
}

function endGame(win) {
    gameState.screen = win ? 'LEVEL_COMPLETE' : 'GAME_OVER';
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('abilityBar').classList.add('hidden');

    AudioManager.stopMusic();

    if (win) {
        gameState.totalDistanceTraveled += Math.floor(player.x / 10);
        AudioManager.levelComplete();
        VFX.flash('#FFD700', 0.3);

        if (gameState.level === 5) {
            // Save Score ONLY on Final Win
            saveHighScore(gameState.score + 1000); // Bonus for winning
            showFinalScreen();
            // Also update final screen stats
            document.getElementById('finalTotalDist').innerText = gameState.totalDistanceTraveled + 'm';
            document.getElementById('finalTotalScore').innerText = gameState.score + 1000;
        } else {
            document.getElementById('winScreen').classList.remove('hidden');
        }
    } else {
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('failScore').innerText = Math.floor(player.x / 10) + 'm';

        // Save Score on Fail
        saveHighScore(gameState.score);

        AudioManager.gameOver();
        VFX.shake(10);
    }
}

function showFinalScreen() {
    document.getElementById('finalScreen').classList.remove('hidden');
    document.getElementById('finalTotalDist').innerText = gameState.totalDistanceTraveled + "m";
    document.getElementById('finalTotalScore').innerText = gameState.score;
}

function gameLoop(timestamp) {
    if (gameState.screen !== 'PLAY') return;

    if (!timestamp || gameState.lastFrameTime === 0) {
        gameState.lastFrameTime = timestamp || performance.now();
        gameState.smoothDelta = 1;
        gameState.deltaTime = 1;
    } else {
        const rawDelta = (timestamp - gameState.lastFrameTime) / (1000 / 60);
        const clampedDelta = Math.min(rawDelta, 3);
        gameState.smoothDelta += (clampedDelta - gameState.smoothDelta) * 0.2;
        gameState.deltaTime = gameState.smoothDelta;
        gameState.lastFrameTime = timestamp;
    }

    if (gameState.deltaTime <= 0 || isNaN(gameState.deltaTime)) gameState.deltaTime = 1;

    gameState.frameCount++;

    gameState.cleanupAccum += gameState.deltaTime;
    if (gameState.cleanupAccum >= 60) {
        gameState.cleanupAccum = 0;
        entities = entities.filter(e => e.active);
        gameState.projectiles = gameState.projectiles.filter(p => p.active);
        gameState.pigeons = gameState.pigeons.filter(p => p.y > -200);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const shake = VFX.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawBackground();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    gameState.puddles.forEach(p => p.draw());
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    gameState.platforms.forEach(p => p.draw());
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    gameState.pigeons.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    player.update();
    player.draw();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    entities.forEach(ent => {
        ent.update(); ent.draw();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';
    });
    if (boss) { boss.update(); boss.draw(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)'; }
    gameState.projectiles.forEach(p => { p.update(); p.draw(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; });

    if (gameState.level === 5 && gameState.bossWarningX > 0 && !gameState.bossDefeated) {
        const warningDrawX = gameState.bossWarningX - gameState.cameraX;
        if (warningDrawX > -200 && warningDrawX < canvas.width + 200) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            const t = Date.now() / 500;
            const pulse = 0.7 + Math.sin(t) * 0.3;

            ctx.fillStyle = `rgba(255, 23, 68, ${pulse * 0.15})`;
            ctx.fillRect(warningDrawX - 150, 0, 300, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(warningDrawX - 140, GROUND_Y - 280, 280, 100, 10);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 23, 68, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(warningDrawX - 140, GROUND_Y - 280, 280, 100, 10);
            ctx.stroke();

            ctx.fillStyle = '#FF1744';
            ctx.font = 'bold 20px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ WARNING ⚠', warningDrawX, GROUND_Y - 250);

            ctx.fillStyle = '#FFD740';
            ctx.font = 'bold 16px Poppins';
            ctx.fillText('MONKEY RAJA AHEAD!', warningDrawX, GROUND_Y - 225);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '13px Poppins';
            ctx.fillText('Stomp his head 3 times to win', warningDrawX, GROUND_Y - 200);

            ctx.restore();

            if (!gameState.bossWarningShown && warningDrawX < canvas.width * 0.7) {
                gameState.bossWarningShown = true;
                VFX.flash('#FF1744', 0.15);
            }
        }
    }

    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';
    VFX.update();
    VFX.draw(ctx, gameState.cameraX);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    gameState.scorePopups = gameState.scorePopups.filter(p => p.life > 0);
    gameState.scorePopups.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    checkCollisions();
    updateHUD();

    let finishX = gameState.gameWidth - gameState.cameraX;
    if (finishX < canvas.width + 200) {
        ctx.save();
        const t = Date.now() / 500;
        ctx.globalAlpha = 0.3 + Math.sin(t) * 0.15;
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(finishX - 10, 0, 32, canvas.height);
        ctx.globalAlpha = 1;
        ctx.fillRect(finishX, 0, 12, canvas.height);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Poppins';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
        ctx.strokeText('🏁 FINISH', finishX + 60, GROUND_Y - 150);
        ctx.fillText('🏁 FINISH', finishX + 60, GROUND_Y - 150);
        ctx.restore();
    }

    VFX.drawFlash(ctx);

    if (gameState.chaiBoostTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

function showLevelIntro(lvlIdx) {
    const config = LEVEL_CONFIG[lvlIdx];
    document.getElementById('levelTitle').innerText = `LEVEL ${lvlIdx + 1}`;
    document.getElementById('levelName').innerText = config.name;
    document.getElementById('levelDesc').innerText = `"${config.desc}"`;

    const intro = document.getElementById('levelIntroScreen');
    intro.classList.remove('hidden');

    const dismiss = () => {
        intro.classList.add('hidden');
        intro.removeEventListener('click', dismiss);
        startLevel(lvlIdx);
    };
    setTimeout(() => intro.addEventListener('click', dismiss), 200);
}

function startLevel(lvlIdx) {
    AudioManager.init();
    AudioManager.resume();
    initLevel(lvlIdx);
    gameState.screen = 'PLAY';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('winScreen').classList.add('hidden');
    document.getElementById('gameHUD').classList.remove('hidden');
    document.getElementById('abilityBar').classList.remove('hidden');
    AudioManager.startMusic();
    requestAnimationFrame(gameLoop);
}

function handleNextLevelClick() {
    document.getElementById('winScreen').classList.add('hidden');
    if (gameState.level < 5) {
        showLevelIntro(gameState.level);
    }
}

// --- Leaderboard & Rating System ---

function saveHighScore(score) {
    const KEY = 'cch_scores_v2'; // Reset for new logic
    let scores = JSON.parse(localStorage.getItem(KEY)) || [];

    // Check if score is already saved for this run to prevent duplicates on strict mode
    // (Simple check: if same player has same score within last 5 seconds. Not perfect but okay for local)
    const now = new Date();
    const recent = scores.find(s => s.name === gameState.playerName && s.score === score && (now - new Date(s.date)) < 5000);
    if (recent) return;

    scores.push({ name: gameState.playerName, score: score, date: now.toISOString() });

    // Sort descending
    scores.sort((a, b) => b.score - a.score);

    // Keep top 10
    scores = scores.slice(0, 10);

    localStorage.setItem(KEY, JSON.stringify(scores));
    updateLeaderboardUI(scores);
}

function updateLeaderboardUI(scores) {
    const createRows = (list) => {
        return list.map((s, i) => `
            <tr class="border-b border-white/5">
                <td class="py-1 text-yellow-500/80">${i + 1}.</td>
                <td class="py-1 font-bold text-white/90 truncate max-w-[120px]">${s.name}</td>
                <td class="py-1 text-right text-yellow-400">${s.score}</td>
            </tr>
        `).join('');
    };

    const rows = createRows(scores);
    const failBody = document.getElementById('leaderboardBodyFail');
    const winBody = document.getElementById('leaderboardBodyWin');

    if (failBody) failBody.innerHTML = rows;
    if (winBody) winBody.innerHTML = rows;
}

function setupRatingUI() {
    const handleRate = (e) => {
        if (e.target.tagName === 'SPAN') {
            const val = e.target.getAttribute('data-val');
            const parent = e.target.parentElement;
            const containerId = parent.id;

            // Visual feedback - Highlight stars
            Array.from(parent.children).forEach((child, idx) => {
                child.style.opacity = (idx < val) ? '1' : '0.3';
                child.style.transform = (idx < val) ? 'scale(1.2)' : 'scale(1)';
            });

            // Save locally
            localStorage.setItem('cch_rating', val);

            // Replace content with "Thank You" message
            const wrapper = parent.parentElement;
            wrapper.innerHTML = `
                <div class="animate-pulse text-center">
                    <p class="text-yellow-400 font-bold text-lg mb-1">Thank you for playing! ❤️</p>
                    <p class="text-stone-400 text-sm mb-2">Global Rating: <span class="text-yellow-500 font-bold">4.9/5</span> ⭐</p>
                    <a href="https://x.com/shubhamg_" target="_blank" 
                       class="inline-block mt-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold border border-stone-600 hover:bg-stone-900 transition">
                       Follow @shubhamg_ on 𝕏
                    </a>
                </div>
            `;
        }
    };

    const failContainer = document.getElementById('ratingContainerFail');
    const winContainer = document.getElementById('ratingContainerWin');

    if (failContainer) failContainer.addEventListener('click', handleRate);
    if (winContainer) winContainer.addEventListener('click', handleRate);
}
// Init Rating UI once
setupRatingUI();

function handleRestartClick() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    gameState.lives = 5;
    showLevelIntro(gameState.level - 1);
}

document.getElementById('startBtn').addEventListener('click', () => {
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput && nameInput.value.trim() !== "") {
        gameState.playerName = nameInput.value.trim();
    }
    AudioManager.init();
    AudioManager.resume();
    showLevelIntro(0);
});

// Name Input Logic to Enable Start Button
const nameInput = document.getElementById('playerNameInput');
const startBtn = document.getElementById('startBtn');
if (nameInput && startBtn) {
    // Disable by default if empty
    if (nameInput.value.trim() === "") {
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    nameInput.addEventListener('input', (e) => {
        if (e.target.value.trim() !== "") {
            startBtn.disabled = false;
            startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            startBtn.disabled = true;
            startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
}

document.getElementById('restartBtn').addEventListener('click', handleRestartClick);
document.getElementById('nextLevelBtn').addEventListener('click', handleNextLevelClick);

initLevel(0);
drawBackground();
gameState.platforms.forEach(p => p.draw());
