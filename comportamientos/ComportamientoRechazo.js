export class ComportamientoRechazo {
    constructor(poeta, crianzaContext) {
        this.poeta = poeta;
        this.crianza = crianzaContext;
    }

    ejecutar(el1, el2, elementos, zones) {
        console.log(`[ECOSISTEMA] ¡Rechazo! Combate por territorio.`);
        
        el1.isDragging = false;
        el2.isDragging = false;
        
        let { fuerte, debil } = this.crianza._determinarFuerza(el1, el2);

        let pool = zones.zones.find(z => z.name === 'POOL');
        let poolCX = pool ? pool.x + pool.w / 2 : (typeof windowWidth !== 'undefined' ? windowWidth / 2 : 500);
        let poolCY = pool ? pool.y + pool.h / 2 : 300;

        // Calculamos un ángulo de empuje que aleje a la presa de la pool y del atacante
        let angle = Math.atan2(debil.y - fuerte.y, debil.x - fuerte.x);
        let angleAwayPool = Math.atan2(debil.y - poolCY, debil.x - poolCX);
        // Promediamos suavemente los ángulos o simplemente usamos el angle original pero priorizando ir hacia afuera
        // Si el angle apunta hacia adentro, lo corregimos
        if (Math.abs(angle - angleAwayPool) > Math.PI / 2) {
            angle = angleAwayPool; 
        }

        let slideForce = 35; 
        
        debil.isBusy = true;
        debil.isMating = true; 
        debil.alpha = 255;

        fuerte.isBusy = true; 
        fuerte.isMating = true;
        
        // FASE 1: Empujón violento y arrastre
        let slideInterval = setInterval(() => {
            debil.x += Math.cos(angle) * slideForce;
            debil.y += Math.sin(angle) * slideForce;
            
            if (typeof frameCount !== 'undefined') {
                debil.rotation = Math.sin(frameCount * 0.8) * 0.3; // Tiembla mientras es empujado
            }

            slideForce *= 0.85; // Fricción
            
            if (slideForce < 2) {
                clearInterval(slideInterval);
                debil.rotation = 0;
                
                // FASE 2: Empieza a achicarse, morir y desaparecer
                let dieInterval = setInterval(() => {
                    if (debil.alpha > 0) {
                        debil.w *= 0.88;
                        debil.h *= 0.88;
                        debil.alpha -= 12;
                        if (debil.alpha < 0) debil.alpha = 0;
                    } else {
                        clearInterval(dieInterval);
                        let index = elementos.indexOf(debil);
                        if (index > -1) elementos.splice(index, 1);
                    }
                }, 30);

                // FASE 3: El fuerte vuelve caminando victorioso
                if (pool) {
                    let walkInterval = setInterval(() => {
                        let dx = poolCX - (fuerte.x + fuerte.w/2);
                        let dy = poolCY - (fuerte.y + fuerte.h/2);
                        let distToPool = Math.sqrt(dx*dx + dy*dy);
                        
                        if (typeof frameCount !== 'undefined') {
                            fuerte.rotation = Math.sin(frameCount * 0.2) * 0.15;
                        }
                        
                        if (distToPool < 20 || zones.getZoneFor(fuerte, null) === 'POOL') {
                            clearInterval(walkInterval);
                            fuerte.rotation = 0;
                            fuerte.isBusy = false;
                            fuerte.isMating = false;
                        } else {
                            let speed = 4.5;
                            fuerte.x += (dx / distToPool) * speed;
                            fuerte.y += (dy / distToPool) * speed;
                        }
                    }, 16);
                } else {
                    fuerte.isBusy = false;
                    fuerte.isMating = false;
                }
            }
        }, 20);
    }
}
