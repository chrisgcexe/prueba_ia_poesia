import { AssetManager } from '../engine/AssetManager.js';
import { MemeRenderer } from './MemeRenderer.js';

export class MemeElement {
    constructor(x, y, dnaData, source) {
        this.x = x;
        this.y = y;
        this.aspectRatio = 1.0;
        this.w = 100;
        this.h = 100;
        this.dna = dnaData;
        
        this.noiseOffsetX = random(10000);
        this.noiseOffsetY = random(10000);
        
        this._parseSource(source);
        
        this.loading = false;
        this.isDragging = false;
        this.isColliding = false;
        this.yaTuvoHijo = false;
        this.isBusy = false; // Lock temporal para evitar múltiples estados a la vez
        
        this.targetX = x;
        this.targetY = y;
        this.rotation = 0;
        this.baseRotation = random(-0.06, 0.06); // Ligera rotación orgánica base
        this.isFlying = false;
        
        this.tipo = dnaData ? (dnaData.tipo || 'neutral') : 'neutral';
        this.sentimiento = this._calcDominantEmotion();
        
        this.id = Math.random().toString(36).substr(2, 9);
        this.padres_ids = []; 
    }

    // =========================================================================
    // DIBUJADO Y RENDER
    // =========================================================================

    draw(cam, zones) {
        if (typeof MemeRenderer !== 'undefined') {
            MemeRenderer.draw(this, cam, zones, AssetManager.getAtlas(), AssetManager.getMemesData(), AssetManager.getMapaGramatical());
        }
    }

    // =========================================================================
    // UPDATE Y MÁQUINA DE ESTADOS
    // =========================================================================

    update(cam, zones, elementos, poeta) {
        this._handleLoading();

        if (this.isFlying) return this._updateFlying();
        if (this.isMating) return this._updateMating(cam);
        if (this.isDragging) return this._updateDragging(cam);

        this.drawOffsetX = 0;
        this.drawOffsetY = 0;
        
        if (zones && !this.esHijo && !this.yaTuvoHijo) {
            this._updatePoolPhysics(cam, zones, elementos, poeta);
        } 
    }

    // =========================================================================
    // LÓGICA PRIVADA Y COMPORTAMIENTOS
    // =========================================================================

    _parseSource(source) {
        if (typeof source === 'string') {
            if (AssetManager.getMemesData() && AssetManager.getMemesData()[source]) {
                this.atlasType = 'meme';
                this.atlasFilename = source;
                this.imgPath = null;
            } else if (source.startsWith('recorte:')) {
                this.atlasType = 'recorte';
                let parts = source.substring(8).split(':');
                this.memePadre = parts[0];
                this.palabra = parts[1];
                this.atlasFilename = source;
                this.imgPath = null;
            } else {
                this.atlasType = 'none';
                this.imgPath = source.includes('/') ? source : 'source_assets/memes/' + source;
            }
            this.img = null;
        } else {
            this.atlasType = 'none';
            this.imgPath = null;
            this.img = source; 
        }
    }

    _calcDominantEmotion() {
        if (!this.dna || !this.dna.texto || typeof AssetManager.getDiccionarioEmocional() === 'undefined' || !AssetManager.getDiccionarioEmocional()) {
            return 'neutral';
        }
        let palabras = this.dna.texto.toLowerCase().match(/[a-záéíóúñ0-9]+/g) || [];
        let conteo = {};
        for (let p of palabras) {
            let info = AssetManager.getDiccionarioEmocional()[p];
            if (info && info.sentimiento !== 'neutral') {
                conteo[info.sentimiento] = (conteo[info.sentimiento] || 0) + 1;
            }
        }
        let max = 0, dominante = 'neutral';
        for (let s in conteo) {
            if (conteo[s] > max) { 
                max = conteo[s]; 
                dominante = s; 
            }
        }
        return dominante;
    }

    _handleLoading() {
        if (!this.buffer && !this.loading) {
            this.loading = true;
            if (this.atlasType !== 'none') {
                MemeRenderer.createCache(this, AssetManager.getAtlas(), AssetManager.getMemesData(), AssetManager.getMapaGramatical());
                this.loading = false;
            } else if (this.imgPath) {
                loadImage(this.imgPath, (loadedImg) => {
                    this.img = loadedImg;
                    MemeRenderer.createCache(this, AssetManager.getAtlas(), AssetManager.getMemesData(), AssetManager.getMapaGramatical());
                    this.loading = false;
                });
            } else if (this.img) {
                MemeRenderer.createCache(this, AssetManager.getAtlas(), AssetManager.getMemesData(), AssetManager.getMapaGramatical());
                this.loading = false;
            } else {
                this.loading = false;
            }
        }
    }

    _updateFlying() {
        this.x = lerp(this.x, this.targetX, 0.08);
        this.y = lerp(this.y, this.targetY, 0.08);
        this.rotation += 0.4; 
        
        if (dist(this.x, this.y, this.targetX, this.targetY) < 3) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.rotation = 0;
            this.isFlying = false;
        }
    }

    _updateMating(cam) {
        // Un temblor fuerte y notorio propio de la reproducción
        this.drawOffsetX = random(-4, 4) / cam.zoom;
        this.drawOffsetY = random(-4, 4) / cam.zoom;
    }

    _updateDragging(cam) {
        this.x += (mouseX - pmouseX) / cam.zoom;
        this.y += (mouseY - pmouseY) / cam.zoom;
        
        let poolBottom = Math.max(400, window.innerHeight * 0.65) + 50;
        if (this.y >= poolBottom && !this.esHijo && !this.esHijoPoema) {
            // Un temblor muy sutil solo para indicar que está interactivo
            this.drawOffsetX = random(-1, 1) / cam.zoom;
            this.drawOffsetY = random(-1, 1) / cam.zoom;
        } else {
            this.drawOffsetX = 0;
            this.drawOffsetY = 0;
        }
    }

    _updatePoolPhysics(cam, zones, elementos, poeta) {
        let currentZone = zones.getZoneFor(this, cam);
        let pool = zones.zones.find(z => z.name === 'POOL');
        
        // Memes más chicos para que no desborden
        let targetSizeH = (currentZone === 'POOL') ? 45 : 80;
        let targetSizeW = targetSizeH * this.aspectRatio;
        this.w = lerp(this.w, targetSizeW, 0.1);
        this.h = lerp(this.h, targetSizeH, 0.1);

        if (currentZone === 'POOL' && pool) {
            if (typeof this.vx === 'undefined') {
                this.vx = 0;
                this.vy = 0;
            }

            this._applyOrganicSwimming();
            this._applyEcosystemForces(elementos, poeta);
            this._applyMouseRepulsion(cam);
            this._applyPhysicsAndLimits(pool);
        }
    }

    _applyOrganicSwimming() {
        this.noiseOffsetX += 0.005;
        this.noiseOffsetY += 0.005;
        this.vx += (noise(this.noiseOffsetX) - 0.5) * 0.4;
        this.vy += (noise(this.noiseOffsetY) - 0.5) * 0.4;
    }

    _applyEcosystemForces(elementos, poeta) {
        let repX = 0; let repY = 0;
        let atrX = 0; let atrY = 0;
        
        let vecinosIntimos = 0;
        let umbralIntimo = this.w * 0.8; 
        let radioVision = 250;

        for (let otro of elementos) {
            if (otro === this || otro.esHijo || otro.isDragging) continue;

            let dx = (otro.x + otro.w/2) - (this.x + this.w/2);
            let dy = (otro.y + otro.h/2) - (this.y + this.h/2);
            let distMemes = Math.sqrt(dx*dx + dy*dy);

            if (distMemes < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; distMemes = 1; }

            // 1. Anti-colisión dura
            if (distMemes < umbralIntimo) {
                vecinosIntimos++;
                let force = map(distMemes, 0, umbralIntimo, 0.1, 0); // Repulsión más sutil
                repX -= (dx / distMemes) * force;
                repY -= (dy / distMemes) * force;
            }

            // 2. Máquina de estados (Asimetría y Comportamiento)
            if (distMemes < radioVision && frameCount % 15 === 0) {
                let afinidad = poeta ? poeta.evaluarAfinidadGlobal(this, otro, AssetManager.getMapaGramatical(), AssetManager.getDiccionarioEmocional()) : 0;
                let factor = this._calcEmotionalForce(otro, afinidad, vecinosIntimos);

                if (factor > 0) {
                    let pull = factor * 0.02; // Atracción mucho más sutil
                    atrX += (dx / distMemes) * pull;
                    atrY += (dy / distMemes) * pull;
                } else if (factor < 0) {
                    let push = Math.abs(factor) * 0.02; // Repulsión mucho más sutil
                    repX -= (dx / distMemes) * push;
                    repY -= (dy / distMemes) * push;
                }
            }
        }
        
        this.vx += repX + atrX;
        this.vy += repY + atrY;
    }

    _calcEmotionalForce(otro, afinidad, vecinosIntimos) {
        let factor = 0;
        
        if (this.sentimiento === 'ira' && otro.sentimiento === 'miedo') factor = 0.8; 
        else if (this.sentimiento === 'miedo') factor = -0.7; 
        else if (this.sentimiento === 'tristeza') factor = -0.3; 
        else if (this.sentimiento === 'alegria' && otro.sentimiento === 'tristeza') factor = 0.6; 
        else if (afinidad > 1.0) factor = 0.4; 
        else if (afinidad === 0) factor = -0.15; 

        // Claustrofobia
        if (vecinosIntimos > 2) factor -= 1.0; 

        return factor;
    }

    _applyMouseRepulsion(cam) {
        let worldMouseX = (mouseX - cam.pan.x) / cam.zoom;
        let worldMouseY = (mouseY - cam.pan.y) / cam.zoom;
        let cx = this.x + this.w / 2;
        let cy = this.y + this.h / 2;
        let distToMouse = dist(worldMouseX, worldMouseY, cx, cy);
        
        if (distToMouse < 60) {
            let force = map(distToMouse, 0, 60, 0.05, 0); // Repulsión de mouse casi imperceptible 
            let angle = Math.atan2(cy - worldMouseY, cx - worldMouseX);
            this.vx += Math.cos(angle) * force;
            this.vy += Math.sin(angle) * force;
        }
    }

    _applyPhysicsAndLimits(pool) {
        this.vx *= 0.90; 
        this.vy *= 0.90;

        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        let maxSpeed = 2.5; 
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Rebotes rectangulares básicos
        if (this.x <= pool.x) { this.x = pool.x; this.vx = Math.abs(this.vx) + 0.5; } 
        else if (this.x + this.w >= pool.x + pool.w) { this.x = pool.x + pool.w - this.w; this.vx = -Math.abs(this.vx) - 0.5; }

        if (this.y <= pool.y) { this.y = pool.y; this.vy = Math.abs(this.vy) + 0.5; } 
        else if (this.y + this.h >= pool.y + pool.h) { this.y = pool.y + pool.h - this.h; this.vy = -Math.abs(this.vy) - 0.5; }
    }

    isMouseOver(mx, my, cam) {
        let worldMouseX = (mx - cam.pan.x) / cam.zoom;
        let worldMouseY = (my - cam.pan.y) / cam.zoom;
        return (worldMouseX >= this.x && worldMouseX <= this.x + this.w &&
                worldMouseY >= this.y && worldMouseY <= this.y + this.h);
    }

    collidesWith(other) {
        return this.x < other.x + this.w && this.x + this.w > other.x &&
               this.y < other.y + this.h && this.y + this.h > other.y;
    }
}