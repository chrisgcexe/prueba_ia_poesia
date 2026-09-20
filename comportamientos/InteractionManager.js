import { SpatialHash } from '../engine/SpatialHash.js';
import { AssetManager } from '../engine/AssetManager.js';
import { GeneradorPoesia } from '../poesia/GeneradorPoesia.js';
import { ArbolGenealogico } from '../genetica/ArbolGenealogico.js';
import { ComportamientoReproduccion } from './ComportamientoReproduccion.js';
import { ComportamientoCanibal } from './ComportamientoCanibal.js';
import { ComportamientoRechazo } from './ComportamientoRechazo.js';
import { GameState } from '../engine/GameState.js';

export class InteractionManager {
    constructor() {
        this.arbolGen = new ArbolGenealogico();
        this.poeta = new GeneradorPoesia();
        this.moduloCanibalismo = new ComportamientoCanibal(this.poeta, this);
        this.moduloReproduccion = new ComportamientoReproduccion(this.poeta, this);
        this.moduloRechazo = new ComportamientoRechazo(this.poeta, this);
    }

    // =========================================================================
    // MOTOR DE INTERACCIONES Y FÍSICAS DE COLISIÓN
    // =========================================================================

    evaluarInteracciones(elementos, zones, cam) {
        for (let el of elementos) el.isColliding = false;
        
        let interactuables = elementos.filter(el => !el.yaTuvoHijo && !el.isBusy);
        
        // Inicializar Spatial Hash (celdas de 150x150 px)
        let spatialHash = new SpatialHash(150);
        for (let el of interactuables) {
            spatialHash.insert(el);
        }

        let evaluatedPairs = new Set();
        
        for (let el1 of interactuables) {
            if (!el1.isDragging) continue; // Al menos uno se esta moviendo
            
            let cercanos = spatialHash.query(el1);
            
            for (let el2 of cercanos) {
                // Generar ID único temporal para el set de pares si no tienen ID (usando índices del array o creando IDs)
                if (!el1.id) el1.id = Math.random().toString(36).substr(2, 9);
                if (!el2.id) el2.id = Math.random().toString(36).substr(2, 9);

                let pairKey = el1.id < el2.id ? el1.id + '-' + el2.id : el2.id + '-' + el1.id;
                if (evaluatedPairs.has(pairKey)) continue;
                evaluatedPairs.add(pairKey);
                
                let z1 = zones.getZoneFor(el1, cam);
                let z2 = zones.getZoneFor(el2, cam);
                
                // CRÍA Y CANIBALISMO: EN WORKTABLE O EN EL ÁRBOL (OUTSIDE)
                if ((z1 === 'WORKTABLE' && z2 === 'WORKTABLE') || (z1 === 'OUTSIDE' && z2 === 'OUTSIDE')) {
                    if (el1.collidesWith(el2)) {
                        this._gestionarColision(el1, el2, elementos, zones, cam);
                    }
                }
                
                // ATRACCIÓN MAGNÉTICA: EXCLUSIVO DE LA POOL
                if (z1 === 'POOL' && z2 === 'POOL') {
                    if (!el1.collidesWith(el2)) {
                        this._aplicarAtraccionMagnetica(el1, el2, cam, zones);
                    }
                }
            }
        }
    }

    _gestionarColision(el1, el2, elementos, zones, cam) {
        el1.isColliding = true;
        el2.isColliding = true;
        
        let { fuerte, debil } = this._determinarFuerza(el1, el2);

        // Verificamos si AMBOS están adentro de la zona Worktable
        let ambosEnWorktable = (zones.getZoneFor(el1, cam) === 'WORKTABLE' && zones.getZoneFor(el2, cam) === 'WORKTABLE');

        if (keyIsDown(67) && ambosEnWorktable) return this.moduloCanibalismo.ejecutar(fuerte, debil, elementos, zones); 
        if (keyIsDown(82) && ambosEnWorktable) return this.moduloRechazo.ejecutar(el1, el2, elementos, zones); 

        let afinidad = this.poeta.evaluarAfinidadGlobal(el1, el2, AssetManager.getMapaGramatical(), AssetManager.getDiccionarioEmocional());
        let s1 = el1.sentimiento;
        let s2 = el2.sentimiento;

        // Bajar probabilidades para que la simulación sea más contemplativa y sutil
        let probCanibal = 0.01;
        let probRechazo = 0.05;

        if ((s1 === 'ira' && s2 === 'miedo') || (s2 === 'ira' && s1 === 'miedo')) {
            probCanibal = 0.85; 
            probRechazo = 0.15; 
        } 
        else if (s1 === 'ira' && s2 === 'ira') {
            probCanibal = 0.30;
            probRechazo = 0.60; 
        }
        else if (s1 === 'tristeza' || s2 === 'tristeza') {
            probRechazo = 0.45; 
        }
        
        if (afinidad > 1.0) {
            probCanibal = 0.0;  
            probRechazo = Math.min(probRechazo, 0.05); 
        }

        // REGLA ESTRICTA: Sin Worktable, no hay canibalismo ni rechazo (solo pueden reproducirse en el árbol)
        if (!ambosEnWorktable) {
            probCanibal = 0.0;
            probRechazo = 0.0;
        }

        let roll = Math.random();

        if (roll < probCanibal) {
            this.moduloCanibalismo.ejecutar(fuerte, debil, elementos, zones);
        } 
        else if (roll < (probCanibal + probRechazo)) {
            this.moduloRechazo.ejecutar(el1, el2, elementos, zones);
        } 
        else {
            this.moduloReproduccion.ejecutar(el1, el2, elementos, zones);
        }
    }
    
    _determinarFuerza(el1, el2) {
        let peso = { 'ira': 4, 'alegria': 3, 'neutral': 2, 'tristeza': 1, 'miedo': 0 };
        let p1 = peso[el1.sentimiento] || 2;
        let p2 = peso[el2.sentimiento] || 2;
        
        if (p1 > p2) return { fuerte: el1, debil: el2 };
        if (p2 > p1) return { fuerte: el2, debil: el1 };
        return Math.random() > 0.5 ? { fuerte: el1, debil: el2 } : { fuerte: el2, debil: el1 };
    }

    // =========================================================================
    // HELPERS COMPARTIDOS
    // =========================================================================

    _obtenerPalabrasRecientes(ultimoHijo, hijosPoema) {
        let obtenerPalabra = (el) => {
            let ruta = el.atlasFilename || el.imgPath;
            if (!ruta) return null;
            if (ruta.startsWith('recorte:')) return ruta.split(':')[2];
            let partes = ruta.split('/');
            let archivo = partes[partes.length - 1];
            return archivo.split('_')[1]?.split('.')[0] || archivo;
        };

        let ultimasPalabras = [];
        if (ultimoHijo) {
            let recientes = hijosPoema.slice(-4);
            for (let h of recientes) {
                let p = obtenerPalabra(h);
                if (p && !ultimasPalabras.includes(p)) ultimasPalabras.push(p);
            }
        }
        return ultimasPalabras;
    }

    mezclarSecuencia(s1, s2) {
        return s1.substring(0, s1.length / 2) + s2.substring(s2.length / 2);
    }

    _calcularEndogamia(el1, el2) {
        let endogamia = 0;
        if (el1.padres_ids && el2.padres_ids) {
            if (el1.padres_ids.includes(el2.id) || el2.padres_ids.includes(el1.id)) endogamia += 0.5;
            let ancestrosComunes = el1.padres_ids.filter(id => el2.padres_ids.includes(id));
            if (ancestrosComunes.length > 0) endogamia += 0.3 * ancestrosComunes.length;
        }
        if (endogamia > 0 && this.poeta) {
            this.poeta.nivelAbsurdo += endogamia;
        }
        return endogamia;
    }

    _determinarColorFamilia(el1, el2) {
        if (el1.dna && el1.dna.familiaColor) return el1.dna.familiaColor;
        if (el2.dna && el2.dna.familiaColor) return el2.dna.familiaColor;
        
        let r = Math.floor(Math.random() * 180);
        let g = Math.floor(Math.random() * 180);
        let b = Math.floor(Math.random() * 180);
        let maxChan = Math.floor(Math.random() * 3);
        if (maxChan === 0) r = 220;
        else if (maxChan === 1) g = 220;
        else b = 220;
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    _aplicarAtraccionMagnetica(el1, el2, cam, zones) {
        // En este punto ya sabemos que ambos están en la POOL por el chequeo previo
        if (!el1.isMating && !el2.isMating && !el1.yaTuvoHijo && !el2.yaTuvoHijo) {
            let cx1 = el1.x + el1.w/2; let cy1 = el1.y + el1.h/2;
            let cx2 = el2.x + el2.w/2; let cy2 = el2.y + el2.h/2;
            
            let dist = Math.sqrt(Math.pow(cx1 - cx2, 2) + Math.pow(cy1 - cy2, 2));
            
            // Radio súper corto para que solo actúe cuando están a punto de tocarse
            let pullRadius = 110; 
            
            if (dist < pullRadius && dist > 50) {
                // Lerp súper suave (casi imperceptible)
                let pullStrength = 0.005 * (1 - dist/pullRadius); 
                if (el1.isDragging && !el2.isDragging && !el2.isFlying) {
                    el2.x += (cx1 - cx2) * pullStrength;
                    el2.y += (cy1 - cy2) * pullStrength;
                } else if (el2.isDragging && !el1.isDragging && !el1.isFlying) {
                    el1.x -= (cx1 - cx2) * pullStrength;
                    el1.y -= (cy1 - cy2) * pullStrength;
                }
            }
        }
    }
}