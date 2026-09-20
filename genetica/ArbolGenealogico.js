export class ArbolGenealogico {
    constructor() {
        this.treeMarginOffset = 0;
    }

    /**
     * Calcula las posiciones objetivo para los padres y los hijos en el árbol genealógico.
     * @param {MemeElement} el1 - Padre 1
     * @param {MemeElement} el2 - Padre 2
     * @param {Array<number>} anchosHijos - Arreglo con los anchos estimados de los hijos
     * @param {number} centroX - Posición X de origen de la colisión
     * @param {number} centroY - Posición Y de origen de la colisión
     * @param {number} windowWidth - Ancho de la ventana para verificar dónde colocar el árbol
     * @returns {Object} Un objeto con las posiciones calculadas para la familia
     */
    calcularLayoutFamilia(el1, el2, anchosHijos, centroX, centroY, windowWidth) {
        let targetCentroX = centroX;
        let targetCentroY = centroY;

        if (centroX < windowWidth) {
            targetCentroX = windowWidth + 200 + this.treeMarginOffset;
            targetCentroY = 200; 
        }
        
        let parentTotalW = el1.w + el2.w + 20;
        let parentStartX = targetCentroX - parentTotalW / 2;
        
        let padre1Pos = { x: parentStartX, y: targetCentroY };
        let padre2Pos = { x: parentStartX + el1.w + 20, y: targetCentroY };
        
        let totalWidthHijos = anchosHijos.reduce((sum, w) => sum + w, 0) + (anchosHijos.length - 1) * 30;
        let currentX = targetCentroX - totalWidthHijos / 2;

        let hijosArbolPos = [];
        for (let i = 0; i < anchosHijos.length; i++) {
            hijosArbolPos.push({ x: currentX, y: targetCentroY + 150 });
            currentX += anchosHijos[i] + 30;
        }

        if (centroX < windowWidth) {
            let maxFamilyWidth = Math.max(parentTotalW, totalWidthHijos);
            this.treeMarginOffset += Math.max(400, maxFamilyWidth + 100); 
        }

        return { padre1Pos, padre2Pos, hijosArbolPos };
    }

    /**
     * Calcula la posición para insertar el siguiente fragmento del poema en la zona de trabajo (hoja de papel).
     * @param {Array<MemeElement>} todosHijosPoema - Arreglo con todos los memes del poema actuales
     * @param {Object} zona - La zona de trabajo con propiedades x, y, w
     * @returns {Object} Coordenadas {x, y} de la nueva posición
     */
    calcularPosicionPoema(todosHijosPoema, zona) {
        let targetPoemaX = zona.x + 120; // Iniciar después de la línea roja (en x + 100)
        let targetPoemaY = zona.y + 200; // Sangría superior
        
        if (todosHijosPoema.length > 0) {
            let ultimo = todosHijosPoema[todosHijosPoema.length - 1];
            let ultimoW = ultimo.w || 60; 
            let gapAleatorio = 5 + Math.random() * 20; // Espaciado natural e irregular
            targetPoemaX = ultimo.targetX + ultimoW + gapAleatorio;
            targetPoemaY = ultimo.targetY;
            
            let probSalto = 0.0; 
            if (targetPoemaX + 120 > zona.x + zona.w) probSalto = 1.0;
            
            if (probSalto === 1.0) {
                targetPoemaX = zona.x + 120; // Reiniciar salto de línea respetando margen
                targetPoemaY += 70; // Altura de hijoPoema (60) + 10
            }
        }
        return { x: targetPoemaX, y: targetPoemaY };
    }
}
