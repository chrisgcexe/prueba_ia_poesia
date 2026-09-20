import { MemeElement } from '../entities/MemeElement.js';
import { ExplosionElement } from '../entities/ExplosionElement.js';
import { AssetManager } from '../engine/AssetManager.js';
import { GameState } from '../engine/GameState.js';

export class ComportamientoReproduccion {
    constructor(poeta, crianzaContext) {
        this.poeta = poeta;
        this.crianza = crianzaContext;
    }

    ejecutar(el1, el2, elementos, zones) {
        // Desanclar del cursor al iniciar el apareamiento
        el1.isDragging = false; 
        el2.isDragging = false;

        el1.yaTuvoHijo = true; el2.yaTuvoHijo = true;
        el1.isBusy = true; el2.isBusy = true;
        el1.isMating = true; el2.isMating = true;
        
        let centroX = (el1.x + el1.w/2 + el2.x + el2.w/2) / 2;
        let centroY = Math.max(el1.y, el2.y);

        // Efecto visual: se superponen suavemente hacia el centro mientras vibran
        let frames = 20;
        let overlapInterval = setInterval(() => {
            el1.x = lerp(el1.x, centroX - el1.w/2, 0.2);
            el1.y = lerp(el1.y, centroY - el1.h/2, 0.2);
            el2.x = lerp(el2.x, centroX - el2.w/2, 0.2);
            el2.y = lerp(el2.y, centroY - el2.h/2, 0.2);
            frames--;
            if (frames <= 0) clearInterval(overlapInterval);
        }, 30);

        let endogamia = this.crianza._calcularEndogamia(el1, el2);
        let colorFam = this.crianza._determinarColorFamilia(el1, el2);
        let hijosExistentes = elementos.filter(e => e.esHijo);
        let datosHijos = this.cruzar(el1, el2, hijosExistentes);

        setTimeout(() => {
            this._nacerHijos(el1, el2, datosHijos, colorFam, centroX, centroY, elementos, zones);
        }, 600); // Reducido a la mitad para mayor agilidad
    }

    cruzar(padre1, padre2, hijosPoema = []) {
        // Delegamos todo el proceso de elección genética a nuestra versión ultra simplificada del poeta
        let fragmentos = this.poeta.cruzarADN(padre1, padre2, hijosPoema);
        
        // Formateamos los resultados para que _nacerHijos los pueda instanciar correctamente
        let hijosNuevos = fragmentos.map(frag => {
            // Extraer el nombre de la palabra del formato ruta: recorte:meme_1.jpg:0_palabra.png
            let nombrePalabra = frag.ruta.split(':')[2];
            
            let infoElegido = (AssetManager.getDiccionarioEmocional() && AssetManager.getDiccionarioEmocional()[nombrePalabra]) ? AssetManager.getDiccionarioEmocional()[nombrePalabra] : { tipo: 'sustantivo', sentimiento: 'neutral' };
            
            return {
                ruta: frag.ruta,
                tipo: infoElegido.tipo,
                sentimiento: infoElegido.sentimiento,
                dna: {
                    sequence: this.crianza.mezclarSecuencia(padre1.dna.sequence, padre2.dna.sequence),
                    archivo: frag.dna.archivo,
                    tipo: infoElegido.tipo,
                    sentimiento: infoElegido.sentimiento,
                    generacion: frag.dna.generacion
                }
            };
        });
        
        return hijosNuevos;
    }

    _nacerHijos(el1, el2, datosHijos, colorFam, centroX, centroY, elementos, zones) {
        el1.isBusy = false; el2.isBusy = false;
        el1.isMating = false; el2.isMating = false;
        if (el1.dna) el1.dna.familiaColor = colorFam;
        if (el2.dna) el2.dna.familiaColor = colorFam;
        
        // Preadaptamos el ancho de los hijos para evitar solapamientos
        let anchosHijos = [];
        for (let dataHijo of datosHijos) {
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
            anchosHijos.push(estimadoW);
        }

        // Delegar cálculo matemático de árbol a ArbolGenealogico
        let layout = this.crianza.arbolGen.calcularLayoutFamilia(el1, el2, anchosHijos, centroX, centroY, windowWidth);
        
        el1.targetX = layout.padre1Pos.x;
        el1.targetY = layout.padre1Pos.y;
        el1.isFlying = true;
        
        el2.targetX = layout.padre2Pos.x;
        el2.targetY = layout.padre2Pos.y;
        el2.isFlying = true;

        for (let index = 0; index < datosHijos.length; index++) {
            let dataHijo = datosHijos[index];
            dataHijo.dna.familiaColor = colorFam;
            
            let posArbol = layout.hijosArbolPos[index];
            
            let hijoArbol = new MemeElement(centroX, centroY, dataHijo.dna, dataHijo.ruta);
            hijoArbol.targetX = posArbol.x;
            hijoArbol.targetY = posArbol.y;
            hijoArbol.isFlying = true;
            hijoArbol.esHijo = true; 
            hijoArbol.w = anchosHijos[index]; 
            hijoArbol.h = 60;
            hijoArbol.padres = [el1, el2];
            hijoArbol.padres_ids = [...new Set([el1.id, el2.id, ...(el1.padres_ids || []), ...(el2.padres_ids || [])])];
            elementos.push(hijoArbol);

            let todosHijosPoema = elementos.filter(e => e.esHijoPoema);
            let zona = zones.zones.find(z => z.name === 'WORKTABLE');
            
            // Usar ArbolGenealogico para colocar recortes en la libreta
            let pPoema = this.crianza.arbolGen.calcularPosicionPoema(todosHijosPoema, zona);
            
            let hijoPoema = new MemeElement(centroX, centroY, dataHijo.dna, dataHijo.ruta);
            hijoPoema.targetX = pPoema.x;
            hijoPoema.targetY = pPoema.y;
            hijoPoema.isFlying = true;
            hijoPoema.esHijo = true;
            hijoPoema.esHijoPoema = true;
            hijoPoema.yaTuvoHijo = true;
            hijoPoema.w = anchosHijos[index];
            hijoPoema.h = 60;
            hijoPoema.padres = [el1, el2];
            hijoPoema.padres_ids = [...new Set([el1.id, el2.id, ...(el1.padres_ids || []), ...(el2.padres_ids || [])])];
            elementos.push(hijoPoema);
        }
        
        elementos.push(new ExplosionElement(centroX, centroY));
    }
}
