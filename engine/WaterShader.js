import { GameState } from './GameState.js';

// =========================================================================
// WaterShader: Efecto de agua interactivo para la POOL usando canvas 2D
// Simula ondas concéntricas que reaccionan a la posición de la mano/mouse
// =========================================================================
export class WaterShader {
    constructor() {
        this.buffer = null;
        this.ripples = [];       // Lista de ondas activas
        this.maxRipples = 12;
        this.lastHandX = -1;
        this.lastHandY = -1;
        this.frameCount = 0;
        this.movementAccum = 0;  // Acumula movimiento para generar ondas
    }

    // Crea el buffer al tamaño de la pool
    _ensureBuffer(poolW, poolH) {
        let w = Math.floor(poolW);
        let h = Math.floor(poolH);
        if (!this.buffer || this.buffer.width !== w || this.buffer.height !== h) {
            if (this.buffer) this.buffer.remove();
            this.buffer = createGraphics(w, h);
        }
    }

    // Añade una nueva onda en coordenadas locales de la pool
    addRipple(localX, localY, strength = 1.0) {
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift(); // Quitar la más vieja
        }
        this.ripples.push({
            x: localX,
            y: localY,
            radius: 0,
            maxRadius: 200 + strength * 100,
            speed: 2.5 + strength * 1.5,
            strength: strength,
            life: 1.0
        });
    }

    // Actualiza las ondas y genera nuevas si la mano se mueve
    update(pool, cam) {
        this.frameCount++;

        // Obtener posición del cursor (mano o mouse) en coordenadas del mundo
        let cursorX, cursorY;
        let handActive = GameState.handTracker && GameState.handTracker.isActive;

        if (handActive) {
            // Convertir coordenadas de pantalla de la mano a coordenadas del mundo
            cursorX = (GameState.handTracker.handX - cam.pan.x) / cam.zoom;
            cursorY = (GameState.handTracker.handY - cam.pan.y) / cam.zoom;
        } else {
            cursorX = (mouseX - cam.pan.x) / cam.zoom;
            cursorY = (mouseY - cam.pan.y) / cam.zoom;
        }

        // Solo generar ondas si el cursor está dentro de la pool
        let inPool = cursorX >= pool.x && cursorX <= pool.x + pool.w &&
                     cursorY >= pool.y && cursorY <= pool.y + pool.h;

        if (inPool) {
            let localX = cursorX - pool.x;
            let localY = cursorY - pool.y;

            if (this.lastHandX >= 0) {
                let dx = localX - this.lastHandX;
                let dy = localY - this.lastHandY;
                let moved = Math.sqrt(dx * dx + dy * dy);
                this.movementAccum += moved;
            }

            // Generar ondas basándose en cuánto se movió
            if (this.movementAccum > 30) {
                let str = Math.min(this.movementAccum / 60, 2.0);
                this.addRipple(localX, localY, str);
                this.movementAccum = 0;
            }

            // Ondas de pellizco (más intensas)
            if (handActive && GameState.handTracker.isPinching && this.frameCount % 10 === 0) {
                this.addRipple(localX, localY, 1.8);
            }

            this.lastHandX = localX;
            this.lastHandY = localY;
        } else {
            this.lastHandX = -1;
            this.lastHandY = -1;
            this.movementAccum = 0;
        }

        // Avanzar animación de las ondas
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            let r = this.ripples[i];
            r.radius += r.speed;
            r.life = 1.0 - (r.radius / r.maxRadius);
            if (r.life <= 0) {
                this.ripples.splice(i, 1);
            }
        }
    }

    // Dibuja el efecto de agua sobre la pool
    draw(pool) {
        if (this.ripples.length === 0) return;

        this._ensureBuffer(pool.w, pool.h);
        let buf = this.buffer;
        buf.clear();

        // Dibujar cada onda como anillos concéntricos con transparencia
        for (let r of this.ripples) {
            let alpha = r.life * 40 * r.strength;
            
            // Onda principal
            buf.noFill();
            buf.stroke(180, 210, 255, alpha);
            buf.strokeWeight(2.5);
            buf.circle(r.x, r.y, r.radius * 2);

            // Segunda onda interior (más tenue)
            if (r.radius > 15) {
                buf.stroke(200, 225, 255, alpha * 0.5);
                buf.strokeWeight(1.5);
                buf.circle(r.x, r.y, (r.radius - 15) * 2);
            }

            // Tercera onda muy tenue
            if (r.radius > 30) {
                buf.stroke(220, 235, 255, alpha * 0.25);
                buf.strokeWeight(1);
                buf.circle(r.x, r.y, (r.radius - 30) * 2);
            }
        }

        // Dibujar brillos sutiles donde las ondas se superponen
        for (let r of this.ripples) {
            if (r.life > 0.6) {
                let glowAlpha = (r.life - 0.6) * 80 * r.strength;
                buf.noStroke();
                buf.fill(255, 255, 255, glowAlpha);
                buf.circle(r.x, r.y, 8);
            }
        }

        // Renderizar el buffer sobre la pool usando blendMode
        push();
        blendMode(ADD);
        image(buf, pool.x, pool.y);
        blendMode(BLEND);
        pop();
    }
}
