import { AssetManager } from '../engine/AssetManager.js';
export class ExplosionElement {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40; // Inicia pequeña
        this.h = 40;
        this.life = 60; // Dura 1 segundo
        this.maxLife = 60;
        
        // Flags para que no interactúe con nada
        this.isDragging = false;
        this.yaTuvoHijo = true; 
        this.esHijo = false;
        this.esExplosion = true; 
    }

    isMouseOver() { return false; } 
    collidesWith() { return false; } 

    update(cam) {
        this.life--;
        // Se agranda drásticamente en cada frame (crecimiento ultra rápido shitpostero)
        this.w += 20;
        this.h += 20;
    }

    draw(cam) {
        push();
        // Nos movemos al centro del choque
        translate(this.x, this.y);
        imageMode(CENTER);
        
        let explosionImg = AssetManager.getExplosionImg ? AssetManager.getExplosionImg() : null;
        if (explosionImg) {
            // Animación del spritesheet (asumimos 5x5 frames en 320x320)
            let cols = 5;
            let rows = 5;
            let frameWidth = explosionImg.width / cols;
            let frameHeight = explosionImg.height / rows;
            
            // Calculamos qué frame dibujar (de 0 a 24) basado en el tiempo transcurrido
            let totalFrames = cols * rows;
            let currentFrame = floor(map(this.maxLife - this.life, 0, this.maxLife, 0, totalFrames - 1));
            
            // Seguridad
            if (currentFrame < 0) currentFrame = 0;
            if (currentFrame >= totalFrames) currentFrame = totalFrames - 1;
            
            let col = currentFrame % cols;
            let row = floor(currentFrame / cols);
            
            let sx = col * frameWidth;
            let sy = row * frameHeight;

            // Calculamos opacidad
            let alpha = map(this.life, 0, this.maxLife, 0, 255);
            tint(255, alpha); 
            
            // Vibración exagerada (camera shake localizado)
            let shakeX = random(-10, 10);
            let shakeY = random(-10, 10);
            
            // image(img, dx, dy, dw, dh, sx, sy, sw, sh)
            image(explosionImg, shakeX, shakeY, this.w, this.h, sx, sy, frameWidth, frameHeight);
        }
        pop();
    }
}
