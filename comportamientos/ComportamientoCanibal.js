import { ExplosionElement } from '../entities/ExplosionElement.js';
import { GameState } from '../engine/GameState.js';
import { AssetManager } from '../engine/AssetManager.js';

export class ComportamientoCanibal {
    constructor(poeta, crianzaContext) {
        this.poeta = poeta;
        this.crianza = crianzaContext;
    }

ejecutar(depredador, presa, elementos, zones) {
        console.log(`[ECOSISTEMA] Asimilación gradual...`);
        
        // Bloqueo total de estado
        depredador.isBusy = true; 
        depredador.isMating = true;   
        presa.isBusy = true;      // <--- IMPORTANTE: Bloqueamos la presa también
        presa.isMating = true;        // <--- IMPORTANTE: Evita que el motor la vea como colisionable
        
        depredador.sizeOriginal = depredador.w; 
        
        let steps = 20;
        let currentStep = 0;

        let digestInterval = setInterval(() => {
            currentStep++;
            depredador.w += 2; 
            depredador.h += 2;
            
            // La presa se comprime hacia el centro del depredador
            presa.w *= 0.8;
            presa.h *= 0.8;
            presa.x = lerp(presa.x, depredador.x + depredador.w/2 - presa.w/2, 0.3);
            presa.y = lerp(presa.y, depredador.y + depredador.h/2 - presa.h/2, 0.3);
            
            if (currentStep >= steps) {
                clearInterval(digestInterval);
                let index = elementos.indexOf(presa);
                if (index > -1) GameState.removeMeme(index);
                
                // Solo ahora iniciamos la gestación
                this._iniciarGestacion(depredador, elementos, zones);
            }
        }, 50);
    }

    _iniciarGestacion(depredador, elementos, zones) {
        let colorFam = depredador.dna.familiaColor || this.crianza._determinarColorFamilia(depredador, depredador);
        if (depredador.dna) depredador.dna.familiaColor = colorFam;

        let hijosExistentes = elementos.filter(e => e.esHijoPoema);
        let datosHijos = this._generarPalabrasPropias(depredador, 2, hijosExistentes);

        let zonaWorktable = zones.zones.find(z => z.name === 'WORKTABLE');
        let posicionesPoema = [];
        let currentHijos = [...hijosExistentes]; 
        
        for (let i = 0; i < datosHijos.length; i++) {
            let dataHijo = datosHijos[i];
            let estimadoW = 60;
            if (dataHijo.ruta && dataHijo.ruta.startsWith('recorte:')) {
                let parts = dataHijo.ruta.substring(8).split(':');
                let memePadre = parts[0];
                let palabra = parts[1];
                if (typeof AssetManager.getMapaGramatical() !== 'undefined' && AssetManager.getMapaGramatical()[memePadre] && AssetManager.getMapaGramatical()[memePadre].recortes_globales && AssetManager.getMapaGramatical()[memePadre].recortes_globales[palabra]) {
                    let data = AssetManager.getMapaGramatical()[memePadre].recortes_globales[palabra];
                    let ratio = constrain(data.w / data.h, 0.4, 4.0);
                    estimadoW = 60 * ratio;
                } else {
                    estimadoW = 60 * constrain(palabra.length * 0.25, 1.0, 4.0);
                }
            }
            dataHijo.estimadoW = estimadoW; 

            let p = this.poeta.calcularPosicion(currentHijos, zonaWorktable);
            posicionesPoema.push(p);
            currentHijos.push({ targetX: p.x, targetY: p.y, w: estimadoW, esHijoPoema: true });
        }

        let targetArbolX = depredador.x + depredador.w/2;
        if (targetArbolX < windowWidth) {
            targetArbolX = windowWidth + 200 + this.crianza.treeMarginOffset;
            this.crianza.treeMarginOffset += 400; 
        }
        let targetArbolY = 200;

        setTimeout(() => {
            this._iniciarPeregrinacion(depredador, datosHijos, posicionesPoema, {x: targetArbolX, y: targetArbolY}, colorFam, elementos);
        }, 800); 
    }

_iniciarPeregrinacion(madre, datosHijos, posicionesPoema, targetArbol, colorFam, elementos) {
        let step = 0;
        let walkToNext = () => {
            if (step < posicionesPoema.length) {
                let target = posicionesPoema[step];
                this._caminarHacia(madre, target.x, target.y, () => {
                    this._ponerHuevo(madre, datosHijos[step], target, colorFam, elementos, false);
                    step++;
                    setTimeout(walkToNext, 600); 
                });
            } else {
                // Llegada al árbol
                this._caminarHacia(madre, targetArbol.x - madre.w/2, targetArbol.y, () => {
                    // Poner huevos del árbol
                    for (let i = 0; i < datosHijos.length; i++) {
                        let offset = (datosHijos.length > 1) ? (i === 0 ? -60 : 60) : 0;
                        let targetHuevoArbol = { x: targetArbol.x - 50 + offset, y: targetArbol.y + 150 };
                        this._ponerHuevo(madre, datosHijos[i], targetHuevoArbol, colorFam, elementos, true);
                    }
                    
                    // --- AQUÍ EL EFECTO BLENDED ---
                    let frames = 30; // Duración del blend en frames
                    let shrinkInterval = setInterval(() => {
                        madre.w = lerp(madre.w, madre.sizeOriginal, 0.1);
                        madre.h = lerp(madre.h, madre.sizeOriginal, 0.1);
                        frames--;
                        
                        if (frames <= 0) {
                            clearInterval(shrinkInterval);
                            madre.w = madre.sizeOriginal;
                            madre.h = madre.sizeOriginal;
                            madre.isMating = false; 
                            madre.isBusy = false;
                        }
                    }, 30);
                });
            }
        };
        walkToNext();
    }

    _caminarHacia(entidad, tx, ty, callback) {
        let walkInterval = setInterval(() => {
            let dx = tx - entidad.x;
            let dy = ty - entidad.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            entidad.rotation = sin(frameCount * 0.2) * 0.1; // Bamboleo lateral mientras camina
            if (dist < 6) {
                clearInterval(walkInterval);
                entidad.x = tx;
                entidad.y = ty;
                entidad.drawOffsetX = 0;
                entidad.drawOffsetY = 0;
                callback();
            } else {
                let speed = 5; 
                entidad.x += (dx / dist) * speed;
                entidad.y += (dy / dist) * speed;
                entidad.drawOffsetX = random(-3, 3);
                entidad.drawOffsetY = random(-3, 3);
            }
        }, 16);
    }

    _ponerHuevo(madre, dataHijo, targetPos, colorFam, elementos, esArbol) {
        dataHijo.dna.familiaColor = colorFam;
        // Creamos el huevo en la posición final deseada, no en la posición de la madre
        let hijo = new MemeElement(targetPos.x, targetPos.y, dataHijo.dna, dataHijo.ruta);
        hijo.w = dataHijo.estimadoW || 100; 
        hijo.h = 60; // Forzamos altura de 60 para mantener consistencia con los otros hijos
        hijo.yaTuvoHijo = true; 
        
        if (esArbol) {
            hijo.targetX = targetPos.x;
            hijo.targetY = targetPos.y;
            hijo.isFlying = true;
        } else {
            hijo.x = targetPos.x;
            hijo.y = targetPos.y;
            hijo.targetX = targetPos.x;
            hijo.targetY = targetPos.y;
            hijo.esHijoPoema = true;
        }
        
        hijo.esHijo = true;
        hijo.padres = [madre, madre];
        hijo.padres_ids = [...new Set([madre.id, ...(madre.padres_ids || [])])];
        
        elementos.push(hijo);
        setTimeout(() => { hijo.yaTuvoHijo = false; }, 2000);
    }

    _generarPalabrasPropias(padre, cantidad, hijosPoema) {
        let recortesObj = AssetManager.getMapaGramatical()[padre.dna.archivo]?.recortes_globales || {};
        let opciones = Object.keys(recortesObj).map(k => ({ nombre: k, carpeta: padre.dna.archivo.replace(/\.(png|jpg|jpeg)$/i, '') }));
        
        let ultimoHijo = hijosPoema.length > 0 ? hijosPoema[hijosPoema.length - 1] : null;
        let ultimasPalabras = this.crianza._obtenerPalabrasRecientes(ultimoHijo, hijosPoema);
        
        opciones = opciones.filter(opt => !ultimasPalabras.includes(opt.nombre));
        if (opciones.length === 0) opciones = Object.keys(recortesObj).map(k => ({ nombre: k, carpeta: padre.dna.archivo.replace(/\.(png|jpg|jpeg)$/i, '') }));

        return this.crianza.moduloReproduccion._procesarSeleccionGenetica(opciones, cantidad, ultimoHijo, padre.dna.sequence, padre.dna.sequence);
    }
}