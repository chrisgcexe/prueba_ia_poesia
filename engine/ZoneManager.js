export class ZoneManager {
   // Define zonas como rectángulos con nombre y color
    constructor(totalMemes = 181) {
        let margin = 50;
        
        // La piscina (POOL) ahora tiene un tamaño fijo relativo a la pantalla.
        // Como son microorganismos, no importa que se superpongan un poco al principio.
        let poolWidth = windowWidth - 2 * margin;
        let poolHeight = Math.max(400, windowHeight * 0.65); 
        
        this.zones = [
            { name: 'POOL', x: margin, y: margin, w: poolWidth, h: poolHeight, color: color(200, 200, 200, 50) },
            { name: 'WORKTABLE', x: margin, y: margin + poolHeight + 120, w: poolWidth, h: 2000, color: color(252, 252, 250) } // Color hoja de papel
        ];
    }

// Método para dibujar las zonas
    draw(cam) {
        push();
        noStroke();
        for (let z of this.zones) {
            if (z.name === 'WORKTABLE') {
                // Dibujo muy minimalista de la mesa de trabajo (sin rayas ni lineas)
                fill(245, 245, 245, 200);
                rect(z.x, z.y, z.w, z.h);
            } else {
                fill(z.color);
                rect(z.x, z.y, z.w, z.h);
            }
            
            // Ocultamos los nombres de debug ('WORKTABLE' y 'POOL') para la versión final
        }
        pop();
    }

    // Devuelve en qué zona está un elemento
    getZoneFor(element, cam) {
        let cx = element.x + element.w / 2;
        let cy = element.y + element.h / 2;
        
        for (let z of this.zones) {
            if (cx >= z.x && cx <= z.x + z.w &&
                cy >= z.y && cy <= z.y + z.h) {
                return z.name;
            }
        }
        return 'OUTSIDE';
    }
}