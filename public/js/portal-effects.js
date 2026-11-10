/**
 * Portal Visual Effects
 * - Confetti Particle System (POLA Colors)
 * - Typewriter Animation (Title)
 * - Fade-in Reveal (Content)
 */

class ConfettiSystem {
    constructor() {
        this.canvas = document.getElementById('particleCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: -1000, y: -1000 };
        this.colors = ['#001F99', '#0171D3', '#01B0FF'];

        this.init();
        this.animate();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        // Reduced particle count for performance
        const particleCount = window.innerWidth < 768 ? 20 : 35;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 4 + 1,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            rotation: Math.random() * Math.PI * 2,
            vRotation: (Math.random() - 0.5) * 0.02
        };
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(p => {
            // Mouse Interaction (Repulsion) - Disabled near header area to prevent lag
            if (this.mouse.y > 80) {
                const dx = this.mouse.x - p.x;
                const dy = this.mouse.y - p.y;
                const distSq = dx * dx + dy * dy;
                const forceDist = 120;
                const forceDistSq = forceDist * forceDist;

                if (distSq < forceDistSq) {
                    const dist = Math.sqrt(distSq);
                    const force = (forceDist - dist) / forceDist;
                    const angle = Math.atan2(dy, dx);
                    p.vx -= Math.cos(angle) * force * 0.3;
                    p.vy -= Math.sin(angle) * force * 0.3;
                }
            }

            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.vRotation;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.y -= 0.1;

            if (p.x < -20) p.x = this.canvas.width + 20;
            if (p.x > this.canvas.width + 20) p.x = -20;
            if (p.y < -20) p.y = this.canvas.height + 20;
            if (p.y > this.canvas.height + 20) p.y = -20;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;
            if (p.size > 2.5) {
                this.ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        });

        requestAnimationFrame(() => this.animate());
    }
}

class TypewriterEffect {
    constructor() {
        this.titleElement = document.getElementById('portalTitle');
        this.cursorElement = document.getElementById('typewriterCursor');
        this.subtitle = document.getElementById('portalSubtitle');
        this.cards = document.getElementById('portalCards');

        this.textToType = "Selamat Datang di POLA";
        this.currentText = "";
        this.currentIndex = 0;
        this.typingSpeed = 40;

        if (this.titleElement) {
            setTimeout(() => this.type(), 100);
        }
    }

    type() {
        if (this.currentIndex < this.textToType.length) {
            this.currentText += this.textToType.charAt(this.currentIndex);
            this.titleElement.innerText = this.currentText;
            this.currentIndex++;
            setTimeout(() => this.type(), this.typingSpeed);
        } else {
            if (this.cursorElement) this.cursorElement.style.display = 'none';
            this.titleElement.innerHTML = 'Selamat Datang di <span class="animate-gradient-text">POLA</span>';
            this.sequenceReveal();
        }
    }

    sequenceReveal() {
        if (this.subtitle) {
            this.subtitle.classList.remove('opacity-0', 'translate-y-4');
        }
        if (this.cards) {
            setTimeout(() => {
                this.cards.classList.remove('opacity-0', 'translate-y-8');
            }, 500);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ConfettiSystem();
    new TypewriterEffect();
});
