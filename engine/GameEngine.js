import { GameState } from './GameState.js';
import { InteractionManager } from '../comportamientos/InteractionManager.js';
import { WaterShader } from './WaterShader.js';

export class GameEngine {
    constructor(criador, zones) {
        GameState.elementos = [];
        this.criador = criador;
        this.zones = zones;
        this.waterShader = new WaterShader();
    }

    addElement(el) {
        GameState.addMeme(el);
    }

    run(cam, width, height) {
        this.update(cam, GameState.elementos);
        this.draw(cam, width, height);
    }

    update(cam, elementos) {
        if (GameState.handTracker && GameState.inputManager) {
            GameState.inputManager.updateFromHand(GameState.handTracker, cam, GameState.elementos);
        }

        let isAnyDragging = GameState.elementos.some(el => el.isDragging);
        if (isAnyDragging) {
            this.criador.evaluarInteracciones(GameState.elementos, this.zones, cam);
        } else {
            // Si nadie se mueve, nos aseguramos de que no queden marcados como colisionando
            for (let el of GameState.elementos) el.isColliding = false;
        }

        // Iteramos hacia atrás para poder borrar elementos (explosiones) sin romper el loop
        for (let i = GameState.elementos.length - 1; i >= 0; i--) {
            let el = GameState.elementos[i];
            el.update(cam, this.zones, GameState.elementos, this.criador.poeta);
            // El dibujado ahora se hace SÓLO en GameEngine.draw() para evitar problemas de renderizado doble
            
            // Limpieza de explosiones muertas
            if (el.esExplosion && el.life <= 0) {
                GameState.removeMeme(i);
            }
        }
    }

    draw(cam, width, height) {
        this.zones.draw(cam);

        // Actualizar y dibujar el efecto de agua en la POOL
        let pool = this.zones.zones.find(z => z.name === 'POOL');
        if (pool && this.waterShader) {
            this.waterShader.update(pool, cam);
            this.waterShader.draw(pool);
        }
        
        // Límites de la cámara para frustum culling (solo dibujar lo que se ve)
        let left = -cam.pan.x / cam.zoom;
        let right = left + width / cam.zoom;
        let top = -cam.pan.y / cam.zoom;
        let bottom = top + height / cam.zoom;

        // Dibujar primero las líneas genealógicas (atrás de los memes)
        for (let el of GameState.elementos) {
            // Solo dibujamos hilos para los memes del árbol, no para las palabras del poema
            if (el.padres && el.padres.length === 2 && !el.esHijoPoema) {
                let colorFam = (el.dna && el.dna.familiaColor) ? el.dna.familiaColor : '#000000';
                stroke(colorFam);
                strokeWeight(3);
                
                let p1 = el.padres[0];
                let p2 = el.padres[1];
                
                // Punto de bifurcación (unión entre padre y madre, un poco más abajo)
                let midX = (p1.x + p1.w/2 + p2.x + p2.w/2) / 2;
                let midY = Math.max(p1.y + p1.h, p2.y + p2.h) + 30; // 30px debajo de los padres
                
                let drawOrganic = (x1, y1, x2, y2) => {
                    noFill();
                    // Usamos Perlin noise basado en las coordenadas espaciales para que sea estático pero curvo
                    let n1 = noise(x1 * 0.01, y1 * 0.01) * 40 - 20;
                    let n2 = noise(x2 * 0.01, y2 * 0.01) * 40 - 20;
                    
                    let cx1 = x1 + (x2 - x1) * 0.3 + n1;
                    let cy1 = y1 + (y2 - y1) * 0.3 + n2;
                    let cx2 = x1 + (x2 - x1) * 0.7 - n2;
                    let cy2 = y1 + (y2 - y1) * 0.7 - n1;
                    
                    stroke(colorFam);
                    strokeWeight(3);
                    noFill();
                    
                    beginShape();
                    let steps = 15;
                    for (let i = 0; i <= steps; i++) {
                        let t = i / steps;
                        let bx = bezierPoint(x1, cx1, cx2, x2, t);
                        let by = bezierPoint(y1, cy1, cy2, y2, t);
                        // Usar noise() determinista en vez de random() para que la curva sea irregular pero estática
                        let nX = noise(bx * 0.05, by * 0.05) * 6 - 3;
                        let nY = noise(bx * 0.05 + 100, by * 0.05 + 100) * 6 - 3;
                        vertex(bx + nX, by + nY);
                    }
                    endShape();
                };

                // Hilo que sale del Padre 1 y Padre 2 y se une en el centro
                drawOrganic(p1.x + p1.w/2, p1.y + p1.h, midX, midY);
                drawOrganic(p2.x + p2.w/2, p2.y + p2.h, midX, midY);
                
                // Bifurcación: Hilo que sale del centro de la unión hasta la cabeza del hijo (o gemelo)
                drawOrganic(midX, midY, el.x + el.w/2, el.y);
            }
        }

        for (let el of GameState.elementos) {
            // Frustum culling: verificar si el elemento está dentro de la pantalla
            if (el.x + el.w > left && el.x < right && el.y + el.h > top && el.y < bottom) {
                el.draw(cam, this.zones);
            }
        }

        // Draw hand cursor in HUD space (ignoring camera transform)
        if (GameState.handTracker && GameState.handTracker.isActive) {
            push();
            resetMatrix();
            fill(GameState.handTracker.isPinching ? color(0, 255, 0, 150) : color(255, 0, 0, 150));
            noStroke();
            circle(GameState.handTracker.handX, GameState.handTracker.handY, 20);
            pop();
        }

        // Draw debug UI if enabled
        if (GameState.handTracker) {
            GameState.handTracker.drawDebug();
        }
    }
}
