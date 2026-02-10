class Particle {
    constructor(x, y, color, opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = opts.vx || (Math.random() - 0.5) * 10;
        this.vy = opts.vy || (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = opts.decay || 0.04;
        this.color = color;
        this.size = opts.size || 6;
        this.gravity = opts.gravity || 0;
        this.type = opts.type || 'circle';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
    }

    draw(ctx, cameraX) {
        if (this.life <= 0) return;
        const drawX = this.x - cameraX;
        if (drawX < -50 || drawX > 1330) return;

        ctx.globalAlpha = Math.max(0, this.life);

        if (this.type === 'star') {
            ctx.save();
            ctx.translate(drawX, this.y);
            ctx.rotate(Date.now() / 200);
            ctx.fillStyle = this.color;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size * 0.3, -this.size * 0.3);
                ctx.lineTo(0, 0);
                ctx.lineTo(-this.size * 0.3, -this.size * 0.3);
                ctx.fill();
                ctx.rotate(Math.PI * 2 / 5);
            }
            ctx.restore();
        } else if (this.type === 'ring') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(drawX, this.y, this.size * (1 - this.life) * 3, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(drawX, this.y, this.size * this.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
}

const VFX = {
    particles: [],
    shakeAmount: 0,
    shakeDecay: 0.9,
    flashAlpha: 0,
    flashColor: 'white',

    update() {
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());

        if (this.shakeAmount > 0.5) {
            this.shakeAmount *= this.shakeDecay;
        } else {
            this.shakeAmount = 0;
        }

        if (this.flashAlpha > 0) {
            this.flashAlpha -= 0.05;
        }
    },

    draw(ctx, cameraX) {
        this.particles.forEach(p => p.draw(ctx, cameraX));
    },

    drawFlash(ctx) {
        if (this.flashAlpha > 0) {
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(0, 0, 1280, 720);
            ctx.globalAlpha = 1;
        }
    },

    getShakeOffset() {
        if (this.shakeAmount < 0.5) return { x: 0, y: 0 };
        return {
            x: (Math.random() - 0.5) * this.shakeAmount * 2,
            y: (Math.random() - 0.5) * this.shakeAmount * 2
        };
    },

    shake(amount) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    },

    flash(color, alpha) {
        this.flashColor = color;
        this.flashAlpha = alpha;
    },

    createDust(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, '#A0866B', {
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 4 - 1,
                size: 3 + Math.random() * 3,
                decay: 0.03,
                gravity: 0.1
            }));
        }
    },

    createSparkle(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color || '#FFD700', {
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                size: 4 + Math.random() * 4,
                decay: 0.03,
                type: 'star'
            }));
        }
    },

    createHoliSplash(x, y) {
        const colors = ['#FF1744', '#FF9100', '#FFEA00', '#00E676', '#2979FF', '#D500F9', '#FF4081', '#00BCD4'];
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i;
            const speed = 3 + Math.random() * 8;
            this.particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)], {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                size: 5 + Math.random() * 6,
                decay: 0.02,
                gravity: 0.15
            }));
        }
    },

    createCollectBurst(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y, '#FFD700', {
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 6 - 2,
                size: 5,
                decay: 0.04,
                type: 'star',
                gravity: 0.1
            }));
        }
        this.particles.push(new Particle(x, y, '#FFA000', {
            vx: 0, vy: 0,
            size: 10,
            decay: 0.05,
            type: 'ring'
        }));
    },

    createDashTrail(x, y, facingRight) {
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(x, y + Math.random() * 60, '#FF9800', {
                vx: facingRight ? -4 - Math.random() * 3 : 4 + Math.random() * 3,
                vy: (Math.random() - 0.5) * 2,
                size: 4 + Math.random() * 4,
                decay: 0.06
            }));
        }
    },

    createSpeedLines(x, y) {
        for (let i = 0; i < 2; i++) {
            this.particles.push(new Particle(x, y + Math.random() * 80 - 40, '#FFEB3B', {
                vx: -15 - Math.random() * 10,
                vy: 0,
                size: 2,
                decay: 0.08
            }));
        }
    },

    createHitEffect(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y, '#FF1744', {
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                size: 4 + Math.random() * 4,
                decay: 0.04,
                gravity: 0.2
            }));
        }
        this.shake(8);
        this.flash('red', 0.3);
    },

    createWaterSplash(x, y) {
        for (let i = 0; i < 12; i++) {
            this.particles.push(new Particle(x, y, '#4FC3F7', {
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 8 - 2,
                size: 3 + Math.random() * 4,
                decay: 0.03,
                gravity: 0.3
            }));
        }
    },

    createLandingDust(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(x, y, '#8D6E63', {
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 2,
                size: 4 + Math.random() * 3,
                decay: 0.03,
                gravity: 0.05
            }));
        }
    }
};
