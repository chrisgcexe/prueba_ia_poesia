import { AssetManager } from '../engine/AssetManager.js';

export class GeneradorPoesia {
    constructor() {
    }

    // --- EVALUACIÓN GLOBAL (Para la Pool) ---
    evaluarAfinidadGlobal(meme1, meme2) {
        // En esta versión simplificada, todos tienen una chance base de afinidad.
        // Mientras más grande el número, más probable es que se reproduzcan.
        // Devolvemos un número aleatorio entre 0 y 1 para que haya variedad.
        return Math.random();
    }

    // --- SELECCIÓN DE ADN / PALABRAS ---
    // Dado un meme, decide qué recorte/palabra de su interior heredar a la descendencia
    obtenerFragmentosHeredables(meme) {
        if (!AssetManager.getMapaGramatical() || !meme.dna || !meme.dna.archivo) return [];
        let infoMeme = AssetManager.getMapaGramatical()[meme.dna.archivo];
        if (!infoMeme || !infoMeme.recortes_globales) return [];

        let palabras = Object.keys(infoMeme.recortes_globales);
        return palabras.map(p => ({
            palabra: p.toLowerCase(),
            ruta: `recorte:${meme.dna.archivo}:${p}`,
            carpeta: meme.dna.archivo
        }));
    }

    // Elige un conjunto de palabras que formarán los hijos del cruce
    cruzarADN(padre1, padre2, hijosPoemaExistentes) {
        let herencia1 = this.obtenerFragmentosHeredables(padre1);
        let herencia2 = this.obtenerFragmentosHeredables(padre2);
        
        let combinados = [...herencia1, ...herencia2];
        if (combinados.length === 0) return [];
        
        // Simplemente elegimos al azar entre 1 y 3 palabras heredadas para que no sea muy largo
        let cantHijos = Math.floor(Math.random() * 3) + 1;
        let elegidos = [];
        
        for (let i = 0; i < cantHijos; i++) {
            let aleatorio = combinados[Math.floor(Math.random() * combinados.length)];
            elegidos.push({
                ruta: aleatorio.ruta,
                dna: { archivo: aleatorio.carpeta, generacion: Math.max(padre1.dna.generacion || 0, padre2.dna.generacion || 0) + 1 }
            });
        }
        
        return elegidos;
    }
}