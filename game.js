const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    autoRickshaw: '🛺'
};

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
    frameCount: 0
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
    update() { this.y += this.vy; this.life -= 0.02; }
    draw() {
        if (this.life <= 0) return;
        const drawX = this.x - gameState.cameraX;
        ctx.globalAlpha = this.life;
        ctx.font = 'bold 28px Poppins';
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, drawX, this.y);
        ctx.fillText(this.text, drawX, this.y);
        ctx.globalAlpha = 1;
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
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15;
        this.rot += 0.1;
        if (this.y > GROUND_Y) this.active = false;
    }
    draw() {
        if (!this.active) return;
        let drawX = this.x - gameState.cameraX;
        if (drawX < -50 || drawX > canvas.width + 50) return;
        ctx.save();
        ctx.translate(drawX + 25, this.y + 25);
        ctx.rotate(this.rot);
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(SPRITES.banana, 0, 0);
        ctx.restore();
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
        if (!this.flying && Math.abs(this.x - player.x) < 200) {
            this.flying = true;
            this.vy = -4 - Math.random() * 3;
            this.vx = (this.x < player.x) ? -4 : 4;
            this.flip = (this.vx < 0);
        }
        if (this.flying) {
            this.x += this.vx;
            this.y += this.vy;
            this.vy -= 0.15;
        }
    }
    draw() {
        if (this.y < -50) return;
        let drawX = this.x - gameState.cameraX;
        if (drawX < -50 || drawX > canvas.width + 50) return;
        ctx.save();
        ctx.translate(drawX, this.y);
        if (this.flip) ctx.scale(-1, 1);
        ctx.font = '30px Arial';
        ctx.fillText(SPRITES.pigeon, 0, 0);
        ctx.restore();
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

        this.canDoubleJump = true;
        this.hasDoubleJumped = false;

        this.isSliding = false;
        this.slideTimer = 0;
        this.slideDuration = 30;

        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 12;
        this.dashCooldown = 0;
        this.dashCooldownMax = 60;
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
        } else if (this.canDoubleJump && !this.hasDoubleJumped) {
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
        const speedMult = gameState.chaiBoostTimer > 0 ? 1.5 : 1;

        if (this.isDashing) {
            this.dashTimer--;
            this.vx = this.facingRight ? this.dashSpeed : -this.dashSpeed;
            VFX.createDashTrail(this.x + (this.facingRight ? 0 : this.w), this.y + this.h / 2, this.facingRight);
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashCooldown = this.dashCooldownMax;
            }
        } else if (this.isSliding) {
            this.slideTimer--;
            this.vx *= 0.95;
            this.dustTimer++;
            if (this.dustTimer % 4 === 0) {
                VFX.createDust(this.x + this.w / 2, this.y + this.h, 2);
            }
            if (this.slideTimer <= 0 || !keys.down) {
                this.endSlide();
            }
        } else {
            if (keys.right) { this.vx = this.speed * speedMult; this.facingRight = true; this.animTimer++; }
            else if (keys.left) { this.vx = -this.speed * speedMult; this.facingRight = false; this.animTimer++; }
            else { this.vx *= 0.8; if (Math.abs(this.vx) < 0.5) this.vx = 0; this.animTimer = 0; }
        }

        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.invulnTimer > 0) this.invulnTimer--;

        if (gameState.chaiBoostTimer > 0) {
            gameState.chaiBoostTimer--;
            if (Math.abs(this.vx) > 2) {
                VFX.createSpeedLines(this.x + this.w, this.y + this.h / 2);
            }
        }

        this.x += this.vx;
        if (this.x < 0) this.x = 0;
        if (this.x > gameState.gameWidth) this.x = gameState.gameWidth;

        if (!this.isDashing) {
            this.vy += GRAVITY;
        }
        this.y += this.vy;

        let wasGrounded = this.grounded;
        this.grounded = false;

        if (!this.isSliding) {
            gameState.platforms.forEach(p => {
                if (this.vy > 0 &&
                    this.y + this.h > p.y &&
                    this.y + this.h < p.y + this.vy + 30 &&
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
            this.canDoubleJump = true;
        }

        if (this.scaleY < 1) this.scaleY += 0.05;
        if (this.scaleY > 1) this.scaleY = 1;
        if (!this.grounded && !this.isDashing) this.scaleY = 1.1;

        if (this.grounded && Math.abs(this.vx) > 3) {
            this.dustTimer++;
            if (this.dustTimer % 8 === 0) {
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
        gameState.cameraX += (targetCamX - gameState.cameraX) * 0.1;
    }

    draw() {
        let drawX = this.x - gameState.cameraX;
        ctx.save();

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(drawX + this.w / 2, GROUND_Y, 25, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.invulnTimer > 0 && this.invulnTimer % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        ctx.translate(drawX + this.w / 2, this.y + this.h);

        if (this.isDashing) {
            ctx.shadowColor = '#FF9800';
            ctx.shadowBlur = 20;
        }

        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.isSliding) {
            ctx.rotate(-Math.PI / 4);
            ctx.scale(1, 0.7);
        } else {
            ctx.scale(1, this.scaleY);
        }

        const isRaju = (gameState.character === 'raju');
        const skinColor = '#C68642';
        const hairColor = isRaju ? '#1A1A2E' : '#1A1A2E';
        const shirtColor = isRaju ? '#FF6F00' : '#E91E63';
        const pantsColor = isRaju ? '#1565C0' : '#7B1FA2';
        const shoeColor = '#5D4037';

        const walking = (Math.abs(this.vx) > 1 && this.grounded);
        const running = (Math.abs(this.vx) > 5 && this.grounded);
        const animSpeed = running ? 0.5 : 0.3;
        const limbSwing = walking ? Math.sin(this.animTimer * animSpeed) : 0;
        const armSwing = walking ? Math.sin(this.animTimer * animSpeed) * 0.8 : 0;
        const bodyBob = walking ? Math.abs(Math.sin(this.animTimer * animSpeed)) * 3 : 0;
        const jumpPose = !this.grounded;

        const bY = -bodyBob;

        ctx.fillStyle = pantsColor;
        if (jumpPose) {
            ctx.save();
            ctx.translate(-8, bY - 18);
            ctx.rotate(-0.4);
            ctx.fillRect(-5, 0, 10, 30);
            ctx.restore();
            ctx.save();
            ctx.translate(8, bY - 18);
            ctx.rotate(0.4);
            ctx.fillRect(-5, 0, 10, 30);
            ctx.restore();
        } else {
            ctx.save();
            ctx.translate(-8, bY - 18);
            ctx.rotate(limbSwing * 0.6);
            ctx.fillRect(-5, 0, 10, 28);
            ctx.fillStyle = shoeColor;
            ctx.fillRect(-6, 25, 12, 7);
            ctx.beginPath();
            ctx.ellipse(1, 32, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.translate(8, bY - 18);
            ctx.rotate(-limbSwing * 0.6);
            ctx.fillStyle = pantsColor;
            ctx.fillRect(-5, 0, 10, 28);
            ctx.fillStyle = shoeColor;
            ctx.fillRect(-6, 25, 12, 7);
            ctx.beginPath();
            ctx.ellipse(1, 32, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (jumpPose) {
            ctx.fillStyle = shoeColor;
            ctx.save();
            ctx.translate(-12, bY + 8);
            ctx.rotate(-0.3);
            ctx.fillRect(-4, 0, 10, 7);
            ctx.restore();
            ctx.save();
            ctx.translate(12, bY + 8);
            ctx.rotate(0.3);
            ctx.fillRect(-4, 0, 10, 7);
            ctx.restore();
        }

        ctx.fillStyle = shirtColor;
        const torsoY = bY - 55;
        ctx.beginPath();
        ctx.moveTo(-16, torsoY + 38);
        ctx.lineTo(-14, torsoY);
        ctx.quadraticCurveTo(0, torsoY - 5, 14, torsoY);
        ctx.lineTo(16, torsoY + 38);
        ctx.closePath();
        ctx.fill();

        if (isRaju) {
            ctx.fillStyle = '#FFB300';
            ctx.fillRect(-12, torsoY + 2, 24, 4);
            ctx.beginPath();
            ctx.moveTo(0, torsoY + 2);
            ctx.lineTo(3, torsoY - 2);
            ctx.lineTo(-3, torsoY - 2);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = '#FFD54F';
            ctx.beginPath();
            ctx.arc(-6, torsoY + 15, 3, 0, Math.PI * 2);
            ctx.arc(6, torsoY + 15, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#F48FB1';
            ctx.fillRect(-14, torsoY + 35, 28, 3);
        }

        ctx.fillStyle = skinColor;
        if (jumpPose) {
            ctx.save();
            ctx.translate(-16, torsoY + 5);
            ctx.rotate(-1.2);
            ctx.fillRect(-4, 0, 8, 25);
            ctx.beginPath();
            ctx.arc(0, 27, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.translate(16, torsoY + 5);
            ctx.rotate(1.2);
            ctx.fillRect(-4, 0, 8, 25);
            ctx.beginPath();
            ctx.arc(0, 27, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.save();
            ctx.translate(-16, torsoY + 5);
            ctx.rotate(armSwing * 0.7);
            ctx.fillRect(-4, 0, 8, 25);
            ctx.beginPath();
            ctx.arc(0, 27, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.translate(16, torsoY + 5);
            ctx.rotate(-armSwing * 0.7);
            ctx.fillRect(-4, 0, 8, 25);
            ctx.beginPath();
            ctx.arc(0, 27, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const headY = torsoY - 22;
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(0, headY, 16, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1A1A1A';
        const eyeY = headY + 2;
        ctx.beginPath();
        ctx.ellipse(-6, eyeY, 3, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(6, eyeY, 3, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-5, eyeY - 1, 1.2, 1.2, 0, 0, Math.PI * 2);
        ctx.ellipse(7, eyeY - 1, 1.2, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#E65100';
        ctx.beginPath();
        ctx.arc(0, headY + 8, 2.5, 0, Math.PI, false);
        ctx.fill();

        if (walking || running) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(2, headY + 14, running ? 5 : 3.5, 0, Math.PI, false);
            ctx.fill();
        }

        ctx.fillStyle = hairColor;
        if (isRaju) {
            ctx.beginPath();
            ctx.ellipse(0, headY - 12, 17, 10, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-12, headY - 5, 5, 10, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(12, headY - 5, 5, 10, -0.3, 0, Math.PI * 2);
            ctx.fill();
            const spikeHeights = [3, 1, 4, 2, 3];
            for (let spike = 0; spike < 5; spike++) {
                const sx = -10 + spike * 5;
                ctx.beginPath();
                ctx.moveTo(sx - 3, headY - 18);
                ctx.lineTo(sx, headY - 26 - spikeHeights[spike]);
                ctx.lineTo(sx + 3, headY - 18);
                ctx.fill();
            }
        } else {
            ctx.beginPath();
            ctx.ellipse(0, headY - 10, 18, 12, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-14, headY, 5, 15, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(14, headY, 5, 15, -0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FF5722';
            ctx.beginPath();
            ctx.arc(14, headY - 8, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFD54F';
            ctx.beginPath();
            ctx.arc(14, headY - 8, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        if (gameState.chaiBoostTimer > 0) {
            const sparkleT = Date.now() / 100;
            ctx.fillStyle = '#FFD700';
            for (let i = 0; i < 4; i++) {
                const angle = sparkleT + i * 1.57;
                const sx = Math.cos(angle) * 30;
                const sy = headY - 30 + Math.sin(angle) * 10;
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('✨', sx, sy);
            }
        }

        ctx.restore();

        if (this.isDashing) {
            ctx.shadowBlur = 0;
        }
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
        if (this.type === SPRITES.cow) {
            if (this.state === 'walk') {
                this.x += this.vx;
                if (this.x > this.origX + this.patrolDist || this.x < this.origX - this.patrolDist) {
                    this.vx *= -1;
                }
                if (Math.random() < 0.005) {
                    this.state = 'graze';
                    this.stateTimer = 50 + Math.random() * 100;
                }
            } else if (this.state === 'graze') {
                this.stateTimer--;
                if (this.stateTimer <= 0) {
                    this.state = 'walk';
                    if (Math.random() < 0.5) this.vx *= -1;
                }
            }
        }

        if (this.type === SPRITES.dog) {
            if (this.state === 'walk') {
                this.x += this.vx;
                if (this.x > this.origX + this.patrolDist || this.x < this.origX - this.patrolDist) {
                    this.vx *= -1;
                }
                if (Math.abs(this.x - player.x) < 300) {
                    this.state = 'chase';
                }
            } else if (this.state === 'chase') {
                const dir = player.x > this.x ? 1 : -1;
                this.vx = dir * 3;
                this.x += this.vx;
                if (Math.abs(this.x - player.x) > 400) {
                    this.state = 'walk';
                    this.vx = (Math.random() < 0.5 ? 1 : -1) * 1.5;
                }
            }
        }

        if (this.type === SPRITES.rickshaw || this.subtype === 'auto') {
            this.hornTimer++;
            if (this.hornTimer > 200 && Math.abs(this.x - player.x) < 400) {
                AudioManager.rickshawHorn();
                this.hornTimer = 0;
            }
        }

        if (this.type === SPRITES.monkey && this.active) {
            const dist = this.x - player.x;
            const inRange = Math.abs(dist) < 1200;
            if (inRange) {
                this.throwTimer++;
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

        ctx.save();
        ctx.translate(drawX + 40, this.y + 70);

        if (this.squashed) {
            ctx.scale(1, 0.3);
        } else if (this.type === SPRITES.cow) {
            if (this.vx > 0) ctx.scale(-1, 1);
            if (this.state === 'graze') {
                ctx.rotate(Math.PI / 8);
            } else {
                ctx.rotate(Math.sin(Date.now() / 500) * 0.05);
            }
        } else if (this.type === SPRITES.dog) {
            if (this.vx > 0) ctx.scale(-1, 1);
            ctx.rotate(Math.sin(Date.now() / 200) * 0.1);
        } else if (this.type === SPRITES.monkey) {
            if (player.x > this.x) ctx.scale(-1, 1);
            ctx.rotate(Math.sin(Date.now() / 300) * 0.1);
        } else if (!this.isHazard) {
            ctx.translate(0, Math.sin(Date.now() / 200) * 10);
            const glowColors = { chai: '#FF9800', diya: '#FFD700', paan: '#00E676', tulsi: '#4CAF50', mango: '#FFC107', coconut: '#8D6E63' };
            if (glowColors[this.subtype]) {
                ctx.shadowColor = glowColors[this.subtype];
                ctx.shadowBlur = 15 + Math.sin(Date.now() / 200 + this.glowPhase) * 8;
            }
        }

        ctx.font = '80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type, 0, 0);
        ctx.restore();
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

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

function drawStringLights(y) {
    const t = Date.now() / 1000;
    const offset = gameState.cameraX * 0.6;
    const spacing = 80;
    const colors = ['#FF1744', '#FF9100', '#FFEA00', '#00E676', '#2979FF', '#D500F9'];

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

        ctx.fillStyle = colors[idx];
        ctx.globalAlpha = brightness;
        ctx.shadowColor = colors[idx];
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(wx, wy + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
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
    ctx.fillStyle = '#FFA726';
    ctx.shadowColor = '#FF9800';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let r = 80; r < 120; r += 10) {
        ctx.globalAlpha = 0.1 - (r - 80) * 0.002;
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

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

    gameState.kites.forEach(k => k.draw());

    drawStringLights(30);
    if (gameState.level >= 3) drawStringLights(60);

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

    gameState.rangolis.forEach(r => r.draw());
}

let player;
let entities = [];

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
    gameState.scorePopups = [];
    gameState.comboCount = 0;
    gameState.comboTimer = 0;
    gameState.chaiBoostTimer = 0;
    VFX.particles = [];
    player = new Player();
    entities = [];

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

        const lifeUpChance = 0.05 + (gameState.level - 1) * 0.06;
        const lifeUpItems = [
            { sprite: SPRITES.paan, sub: 'paan' },
            { sprite: SPRITES.tulsi, sub: 'tulsi' },
            { sprite: SPRITES.mango, sub: 'mango' },
            { sprite: SPRITES.coconut, sub: 'coconut' }
        ];

        if (Math.random() < 0.45) {
            let shopCount = Math.floor(Math.random() * 2) + 1;
            for (let s = 0; s < shopCount; s++) {
                let type = Math.floor(Math.random() * 3);
                gameState.platforms.push(new Platform(x, type));

                if (Math.random() > 0.4) {
                    if (Math.random() < lifeUpChance) {
                        const item = lifeUpItems[Math.floor(Math.random() * lifeUpItems.length)];
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
                if (Math.random() < lifeUpChance + 0.1) {
                    const item = lifeUpItems[Math.floor(Math.random() * lifeUpItems.length)];
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, item.sprite, false, item.sub));
                } else if (Math.random() < 0.25) {
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, SPRITES.chai, false, 'chai'));
                } else {
                    let foodType = SPRITES.food[Math.floor(Math.random() * SPRITES.food.length)];
                    entities.push(new Entity(x + gap / 2, GROUND_Y - 80, foodType, false));
                }
            }

            if (gameState.level >= 3 && Math.random() < 0.08 * gameState.level) {
                const lifeItem = lifeUpItems[Math.floor(Math.random() * lifeUpItems.length)];
                entities.push(new Entity(x + gap / 2 + 150, GROUND_Y - 80, lifeItem.sprite, false, lifeItem.sub));
            }

            x += gap;
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
                    updateHUD();
                } else if (!ent.squashed && player.invulnTimer <= 0) {
                    gameState.lives--;
                    gameState.comboCount = 0;
                    ent.active = false;
                    VFX.createHitEffect(player.x + 35, player.y + 50);
                    AudioManager.hit();
                    player.vy = -10;
                    player.vx = -15;
                    player.invulnTimer = 60;
                    updateHUD();
                    if (gameState.lives <= 0) endGame(false);
                }
            } else {
                let points = 100;
                if (ent.subtype === 'chai') {
                    gameState.chaiBoostTimer = 180;
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 15, '#FF9800');
                    VFX.flash('#FF9800', 0.15);
                    points = 200;
                    addScorePopup(ent.x + 40, ent.y, '+200 CHAI BOOST!', '#FF9800');
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
                } else if (ent.subtype === 'paan') {
                    points = 125;
                    gameState.lives = Math.min(gameState.lives + 1, 9);
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 10, '#00E676');
                    addScorePopup(ent.x + 40, ent.y, '+1 LIFE! PAAN', '#00E676');
                } else if (ent.subtype === 'tulsi') {
                    points = 100;
                    gameState.lives = Math.min(gameState.lives + 1, 9);
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 12, '#4CAF50');
                    addScorePopup(ent.x + 40, ent.y, '+1 LIFE! TULSI', '#4CAF50');
                } else if (ent.subtype === 'mango') {
                    points = 150;
                    gameState.lives = Math.min(gameState.lives + 2, 9);
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 15, '#FFC107');
                    VFX.flash('#FFC107', 0.1);
                    addScorePopup(ent.x + 40, ent.y, '+2 LIVES! MANGO', '#FFC107');
                } else if (ent.subtype === 'coconut') {
                    points = 100;
                    gameState.lives = Math.min(gameState.lives + 1, 9);
                    player.invulnTimer = Math.max(player.invulnTimer, 90);
                    AudioManager.powerUp();
                    VFX.createSparkle(ent.x + 40, ent.y + 40, 12, '#8D6E63');
                    addScorePopup(ent.x + 40, ent.y, '+1 LIFE! COCONUT', '#8D6E63');
                } else {
                    AudioManager.collect();
                    VFX.createCollectBurst(ent.x + 40, ent.y + 40);
                    addScorePopup(ent.x + 40, ent.y, `+${points}`, '#FFD700');
                }
                gameState.score += points;
                ent.active = false;
                updateHUD();
            }
        }
    });

    if (player.x >= gameState.gameWidth - 200) endGame(true);
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
        gameState.comboTimer--;
        if (gameState.comboTimer <= 0) gameState.comboCount = 0;
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
            showFinalScreen();
        } else {
            document.getElementById('winScreen').classList.remove('hidden');
        }
    } else {
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('failScore').innerText = Math.floor(player.x / 10) + 'm';
        AudioManager.gameOver();
        VFX.shake(10);
    }
}

function showFinalScreen() {
    document.getElementById('finalScreen').classList.remove('hidden');
    document.getElementById('finalTotalDist').innerText = gameState.totalDistanceTraveled + "m";
    document.getElementById('finalTotalScore').innerText = gameState.score;
}

function gameLoop() {
    if (gameState.screen !== 'PLAY') return;
    gameState.frameCount++;

    const shake = VFX.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    drawBackground();
    gameState.puddles.forEach(p => p.draw());
    gameState.platforms.forEach(p => p.draw());
    gameState.pigeons.forEach(p => { p.update(); p.draw(); });

    player.update();
    player.draw();

    entities.forEach(ent => { ent.update(); ent.draw(); });
    gameState.projectiles.forEach(p => { p.update(); p.draw(); });

    VFX.update();
    VFX.draw(ctx, gameState.cameraX);

    gameState.scorePopups = gameState.scorePopups.filter(p => p.life > 0);
    gameState.scorePopups.forEach(p => { p.update(); p.draw(); });

    checkCollisions();
    updateHUD();

    let finishX = gameState.gameWidth - gameState.cameraX;
    if (finishX < canvas.width + 200) {
        const t = Date.now() / 500;
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(finishX, 0, 12, canvas.height);
        ctx.shadowColor = '#4CAF50';
        ctx.shadowBlur = 20 + Math.sin(t) * 10;
        ctx.fillRect(finishX, 0, 12, canvas.height);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Poppins';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
        ctx.strokeText('🏁 FINISH', finishX + 60, GROUND_Y - 150);
        ctx.fillText('🏁 FINISH', finishX + 60, GROUND_Y - 150);
    }

    VFX.drawFlash(ctx);

    if (gameState.chaiBoostTimer > 0) {
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
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
    gameLoop();
}

function handleNextLevelClick() {
    document.getElementById('winScreen').classList.add('hidden');
    if (gameState.level < 5) {
        showLevelIntro(gameState.level);
    }
}

function handleRestartClick() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    gameState.lives = 5;
    showLevelIntro(gameState.level - 1);
}

document.getElementById('startBtn').addEventListener('click', () => {
    AudioManager.init();
    AudioManager.resume();
    showLevelIntro(0);
});
document.getElementById('restartBtn').addEventListener('click', handleRestartClick);
document.getElementById('nextLevelBtn').addEventListener('click', handleNextLevelClick);

initLevel(0);
drawBackground();
gameState.platforms.forEach(p => p.draw());
