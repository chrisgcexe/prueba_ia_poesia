// =========================================================================
// OneEuroFilter: Filtro adaptativo que reduce jitter cuando está quieto
// pero permite movimientos rápidos sin lag perceptible.
// Basado en el paper "1€ Filter" de Casiez et al. (2012)
// =========================================================================
class OneEuroFilter {
    constructor(freq = 30, minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
        this.freq = freq;
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.xPrev = null;
        this.dxPrev = 0;
        this.lastTime = null;
    }

    _alpha(cutoff) {
        let te = 1.0 / this.freq;
        let tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / te);
    }

    filter(x, timestamp) {
        if (this.lastTime && timestamp) {
            let dt = (timestamp - this.lastTime) / 1000;
            if (dt > 0) this.freq = 1.0 / dt;
        }
        this.lastTime = timestamp;

        if (this.xPrev === null) {
            this.xPrev = x;
            this.dxPrev = 0;
            return x;
        }

        let dx = (x - this.xPrev) * this.freq;
        let edx = this._alpha(this.dCutoff) * dx + (1 - this._alpha(this.dCutoff)) * this.dxPrev;
        let cutoff = this.minCutoff + this.beta * Math.abs(edx);
        let result = this._alpha(cutoff) * x + (1 - this._alpha(cutoff)) * this.xPrev;

        this.xPrev = result;
        this.dxPrev = edx;
        return result;
    }

    reset() {
        this.xPrev = null;
        this.dxPrev = 0;
        this.lastTime = null;
    }
}

// =========================================================================
// HandTracker: Módulo principal de tracking de manos con MediaPipe
// =========================================================================
export class HandTracker {
    constructor() {
        this.handX = 0;
        this.handY = 0;
        this.isPinching = false;
        this.wasPinching = false;
        this.isActive = false;
        this.showDebug = false;
        this.currentDist = 0;

        // --- Filtros One Euro para suavizar X, Y, y la distancia de pinch ---
        this.filterX = new OneEuroFilter(30, 1.5, 0.005, 1.0);
        this.filterY = new OneEuroFilter(30, 1.5, 0.005, 1.0);
        this.filterDist = new OneEuroFilter(30, 0.5, 0.001, 1.0);

        // --- Zona muerta: ignora micro-movimientos menores a este umbral (px) ---
        this.deadZone = 3;

        // --- Mapeo de zona útil de cámara a pantalla ---
        // En coordenadas normalizadas de la cámara (0-1), definimos
        // la sub-región que se remapea al 100% de la pantalla.
        // Valores por defecto: usamos el 60% central del cuadro.
        this.camZoneMinX = 0.15;  // margen izquierdo (en espejo)
        this.camZoneMaxX = 0.85;  // margen derecho (en espejo)
        this.camZoneMinY = 0.10;  // margen superior
        this.camZoneMaxY = 0.85;  // margen inferior

        // --- Auto-calibración de pinch ---
        this.calibrating = true;
        this.calibFrames = 0;
        this.calibMaxFrames = 90; // ~3 segundos a 30fps
        this.calibSamples = [];
        this.pinchThresholdOpen = 0.10;   // umbral para empezar pinch
        this.pinchThresholdClose = 0.15;  // umbral para soltar pinch
        this.calibStatus = 'Esperando mano abierta...';

        // --- Calibración de zona (fase 2, opcional con tecla Z) ---
        this.calibratingZone = false;
        this.zoneCalibSamples = [];
        this.zoneCalibFrames = 0;
        this.zoneCalibMaxFrames = 150; // ~5 seg a 30fps

        // --- Contadores de estabilidad para confirmar pinch ---
        this.pinchConfirmFrames = 0;
        this.pinchConfirmNeeded = 3;    // frames seguidos para confirmar inicio
        this.releaseConfirmFrames = 0;
        this.releaseConfirmNeeded = 3;  // frames seguidos para confirmar soltar

        // --- MediaPipe setup ---
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);

        this.hands = new window.Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });
        
        this.hands.onResults(this.onResults.bind(this));
        
        this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({image: this.videoElement});
            },
            width: 640,
            height: 480
        });
        
        this.camera.start().catch(err => {
            console.error("Camera error:", err);
        });

        this.lastResults = null;
    }

    // =========================================================================
    // AUTO-CALIBRACIÓN
    // Recoge muestras de la distancia con la mano abierta para determinar
    // dinámicamente cuáles son los umbrales de pinch óptimos para tu mano.
    // =========================================================================
    _runCalibration(dist) {
        this.calibFrames++;
        // Ignorar los primeros 15 frames (la mano se está estabilizando)
        if (this.calibFrames < 15) {
            this.calibStatus = 'Estabilizando... Mantén la mano abierta';
            return;
        }

        this.calibSamples.push(dist);
        this.calibStatus = `Calibrando: ${this.calibSamples.length}/${this.calibMaxFrames - 15}`;

        if (this.calibSamples.length >= (this.calibMaxFrames - 15)) {
            // Calcular la distancia media con mano abierta
            let sorted = [...this.calibSamples].sort((a, b) => a - b);
            // Usar la mediana para robustecer contra outliers
            let median = sorted[Math.floor(sorted.length / 2)];
            
            // El umbral de pinch es un % de la distancia de mano abierta
            this.pinchThresholdOpen = median * 0.45;   // ~45% de la apertura natural
            this.pinchThresholdClose = median * 0.65;   // ~65% para soltar
            
            this.calibrating = false;
            this.calibStatus = `Calibrado! Open: ${this.pinchThresholdOpen.toFixed(3)}, Close: ${this.pinchThresholdClose.toFixed(3)}`;
            console.log(this.calibStatus);
        }
    }

    recalibrate() {
        this.calibrating = true;
        this.calibFrames = 0;
        this.calibSamples = [];
        this.calibStatus = 'Re-calibrando... Mantén la mano abierta';
    }

    // Inicia calibración de zona: mueve la mano por toda el área útil
    recalibrateZone() {
        this.calibratingZone = true;
        this.zoneCalibSamples = [];
        this.zoneCalibFrames = 0;
        this.calibStatus = '⚡ Mueve la mano por toda la pantalla...';
    }

    _runZoneCalibration(normX, normY) {
        this.zoneCalibFrames++;
        if (this.zoneCalibFrames < 10) return; // estabilizar

        this.zoneCalibSamples.push({ x: normX, y: normY });
        let remaining = Math.ceil((this.zoneCalibMaxFrames - this.zoneCalibFrames) / 30);
        this.calibStatus = `Zona: Mueve la mano a los extremos (${remaining}s)`;

        if (this.zoneCalibFrames >= this.zoneCalibMaxFrames) {
            // Calcular los límites observados con un margen de 5%
            let xs = this.zoneCalibSamples.map(s => s.x).sort((a, b) => a - b);
            let ys = this.zoneCalibSamples.map(s => s.y).sort((a, b) => a - b);

            // Usar percentiles 5% y 95% para ignorar outliers
            let p5 = Math.floor(xs.length * 0.05);
            let p95 = Math.floor(xs.length * 0.95);

            this.camZoneMinX = xs[p5];
            this.camZoneMaxX = xs[p95];
            this.camZoneMinY = ys[p5];
            this.camZoneMaxY = ys[p95];

            this.calibratingZone = false;
            this.calibStatus = `Zona calibrada! X:[${this.camZoneMinX.toFixed(2)}-${this.camZoneMaxX.toFixed(2)}] Y:[${this.camZoneMinY.toFixed(2)}-${this.camZoneMaxY.toFixed(2)}]`;
            console.log(this.calibStatus);
        }
    }

    // Remapea un valor normalizado de cámara (0-1) al rango de pantalla
    _remapCamToScreen(normVal, camMin, camMax, screenSize) {
        let clamped = Math.max(camMin, Math.min(camMax, normVal));
        return ((clamped - camMin) / (camMax - camMin)) * screenSize;
    }

    // =========================================================================
    // PROCESAMIENTO DE RESULTADOS
    // =========================================================================
    onResults(results) {
        this.lastResults = results;
        let now = performance.now();

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            let wasActive = this.isActive;
            this.isActive = true;
            let landmarks = results.multiHandLandmarks[0];
            
            let indexTip = landmarks[8];
            let thumbTip = landmarks[4];

            // Distancia cruda filtrada
            let rawDist = Math.sqrt(
                (indexTip.x - thumbTip.x) ** 2 + 
                (indexTip.y - thumbTip.y) ** 2
            );
            this.currentDist = this.filterDist.filter(rawDist, now);

            // --- Auto-calibración ---
            if (this.calibrating) {
                this._runCalibration(this.currentDist);
                // Durante calibración, no hacer pinch
                this.isPinching = false;
            } else {
                // --- Detección de pinch con confirmación de frames ---
                let rawPinch = this.currentDist < this.pinchThresholdOpen;
                let rawRelease = this.currentDist > this.pinchThresholdClose;

                if (!this.isPinching) {
                    if (rawPinch) {
                        this.pinchConfirmFrames++;
                        if (this.pinchConfirmFrames >= this.pinchConfirmNeeded) {
                            this.isPinching = true;
                            this.releaseConfirmFrames = 0;
                        }
                    } else {
                        this.pinchConfirmFrames = 0;
                    }
                } else {
                    if (rawRelease) {
                        this.releaseConfirmFrames++;
                        if (this.releaseConfirmFrames >= this.releaseConfirmNeeded) {
                            this.isPinching = false;
                            this.pinchConfirmFrames = 0;
                        }
                    } else {
                        this.releaseConfirmFrames = 0;
                    }
                }
            }

            // --- Posición del cursor: punto medio entre índice y pulgar ---
            // Coordenada normalizada en espacio de cámara (0-1, espejada en X)
            let normX = 1 - ((indexTip.x + thumbTip.x) / 2);
            let normY = (indexTip.y + thumbTip.y) / 2;

            // Calibración de zona si está activa
            if (this.calibratingZone) {
                this._runZoneCalibration(normX, normY);
            }

            // Remapear zona útil de cámara → pantalla completa
            let rawX = this._remapCamToScreen(normX, this.camZoneMinX, this.camZoneMaxX, width);
            let rawY = this._remapCamToScreen(normY, this.camZoneMinY, this.camZoneMaxY, height);

            // Filtro One Euro para suavizado adaptativo
            let filteredX = this.filterX.filter(rawX, now);
            let filteredY = this.filterY.filter(rawY, now);

            if (!wasActive) {
                this.handX = filteredX;
                this.handY = filteredY;
            } else {
                // Zona muerta: si el movimiento es menor a deadZone px, no mover
                let dx = filteredX - this.handX;
                let dy = filteredY - this.handY;
                let moveDist = Math.sqrt(dx * dx + dy * dy);

                if (moveDist > this.deadZone) {
                    this.handX = filteredX;
                    this.handY = filteredY;
                }
                // Si no supera la zona muerta, el cursor se queda quieto
            }

        } else {
            this.isActive = false;
            this.isPinching = false;
            this.currentDist = 0;
            this.pinchConfirmFrames = 0;
            this.releaseConfirmFrames = 0;
            this.filterX.reset();
            this.filterY.reset();
            this.filterDist.reset();
        }
    }

    toggleDebug() {
        this.showDebug = !this.showDebug;
    }

    // =========================================================================
    // DIBUJADO DE DEBUG
    // =========================================================================
    drawDebug() {
        if (!this.showDebug) return;

        push();
        resetMatrix();
        
        let pipW = 320;
        let pipH = 460;
        let pipX = width - pipW - 20;
        let pipY = height - pipH - 20;
        let camH = 180;  // Altura del recuadro de cámara
        
        // Fondo
        fill(0, 200);
        stroke(80);
        strokeWeight(2);
        rect(pipX, pipY, pipW, pipH, 8);

        // --- Dibujar feed de cámara ---
        let camY = pipY + 4;
        try {
            if (this.videoElement && this.videoElement.readyState >= 2) {
                // Dibujar el video espejado
                push();
                translate(pipX + pipW - 2, camY);
                scale(-1, 1);
                drawingContext.drawImage(this.videoElement, 0, 0, pipW - 4, camH);
                pop();

                // Borde del recuadro de video
                noFill();
                stroke(this.isActive ? color(0, 255, 0, 180) : color(255, 80, 80, 180));
                strokeWeight(2);
                rect(pipX + 2, camY, pipW - 4, camH, 4);

                // Indicador "LIVE"
                fill(255, 0, 0);
                noStroke();
                circle(pipX + 16, camY + 14, 8);
                fill(255);
                textSize(11);
                text('LIVE', pipX + 24, camY + 18);
            } else {
                fill(30);
                noStroke();
                rect(pipX + 2, camY, pipW - 4, camH, 4);
                fill(150);
                textSize(14);
                textAlign(CENTER, CENTER);
                text('Cámara cargando...', pipX + pipW / 2, camY + camH / 2);
                textAlign(LEFT, BASELINE);
            }
        } catch(e) {
            // Fallback si hay error con el video
            fill(30);
            noStroke();
            rect(pipX + 2, camY, pipW - 4, camH, 4);
        }

        // Dibujar zona útil sobre el video (rectángulo amarillo punteado)
        noFill();
        stroke(255, 255, 0, 150);
        strokeWeight(1);
        drawingContext.setLineDash([4, 4]);
        let zx = pipX + this.camZoneMinX * pipW;
        let zy = camY + this.camZoneMinY * camH;
        let zw = (this.camZoneMaxX - this.camZoneMinX) * pipW;
        let zh = (this.camZoneMaxY - this.camZoneMinY) * camH;
        rect(zx, zy, zw, zh);
        drawingContext.setLineDash([]);

        // Dibujar esqueleto sobre el video
        let skeletonOffsetY = camY;

        if (this.lastResults && this.lastResults.multiHandLandmarks && this.lastResults.multiHandLandmarks.length > 0) {
            let landmarks = this.lastResults.multiHandLandmarks[0];
            
            // Conexiones del esqueleto (simplificadas)
            let connections = [
                [0,1],[1,2],[2,3],[3,4],       // Pulgar
                [0,5],[5,6],[6,7],[7,8],       // Índice
                [0,9],[9,10],[10,11],[11,12],   // Medio
                [0,13],[13,14],[14,15],[15,16], // Anular
                [0,17],[17,18],[18,19],[19,20]  // Meñique
            ];

            stroke(100, 255, 100, 120);
            strokeWeight(2);
            for (let [a, b] of connections) {
                let ax = pipX + (1 - landmarks[a].x) * pipW;
                let ay = skeletonOffsetY + landmarks[a].y * camH;
                let bx = pipX + (1 - landmarks[b].x) * pipW;
                let by = skeletonOffsetY + landmarks[b].y * camH;
                line(ax, ay, bx, by);
            }

            // Nodos
            for (let i = 0; i < landmarks.length; i++) {
                let lx = pipX + (1 - landmarks[i].x) * pipW;
                let ly = skeletonOffsetY + landmarks[i].y * camH;
                noStroke();
                fill(i === 4 || i === 8 ? color(255, 255, 0) : color(0, 200, 0));
                circle(lx, ly, i === 4 || i === 8 ? 10 : 5);
            }
            
            // Línea índice-pulgar
            let ix = pipX + (1 - landmarks[8].x) * pipW;
            let iy = skeletonOffsetY + landmarks[8].y * camH;
            let tx = pipX + (1 - landmarks[4].x) * pipW;
            let ty2 = skeletonOffsetY + landmarks[4].y * camH;
            
            stroke(this.isPinching ? color(0, 255, 0) : color(255, 80, 80));
            strokeWeight(3);
            line(ix, iy, tx, ty2);
        }
        
        // --- Panel de texto (debajo de la cámara) ---
        let ty = pipY + camH + 20;
        let lineH = 18;
        noStroke();
        textSize(13);
        textFont('monospace');

        // Estado
        fill(this.isActive ? color(0, 255, 0) : color(255, 80, 80));
        text(`Mano: ${this.isActive ? 'ACTIVA' : 'NO DETECTADA'}`, pipX + 10, ty); ty += lineH;

        // Pinch
        fill(this.isPinching ? color(0, 255, 0) : color(200));
        text(`Pinch: ${this.isPinching ? '● AGARRADO' : '○ Suelto'}`, pipX + 10, ty); ty += lineH;

        // Distancia
        fill(220);
        let distBar = Math.min(this.currentDist / 0.3, 1.0);
        text(`Dist: ${this.currentDist.toFixed(3)}`, pipX + 10, ty);
        // Barra visual
        fill(40);
        rect(pipX + 120, ty - 10, 180, 12, 3);
        fill(this.isPinching ? color(0, 200, 0) : color(200, 80, 80));
        rect(pipX + 120, ty - 10, 180 * distBar, 12, 3);
        // Marcadores de umbral
        stroke(255, 255, 0);
        strokeWeight(2);
        let openMark = pipX + 120 + 180 * (this.pinchThresholdOpen / 0.3);
        let closeMark = pipX + 120 + 180 * (this.pinchThresholdClose / 0.3);
        line(openMark, ty - 12, openMark, ty + 4);
        line(closeMark, ty - 12, closeMark, ty + 4);
        ty += lineH;

        // Umbrales
        noStroke();
        fill(180);
        text(`Umbral ON:  ${this.pinchThresholdOpen.toFixed(3)}`, pipX + 10, ty); ty += lineH;
        text(`Umbral OFF: ${this.pinchThresholdClose.toFixed(3)}`, pipX + 10, ty); ty += lineH;

        // Calibración
        if (this.calibrating || this.calibratingZone) {
            fill(255, 200, 0);
            text(`⚡ ${this.calibStatus}`, pipX + 10, ty); ty += lineH;
        } else {
            fill(100, 255, 100);
            text(`✓ Calibrado`, pipX + 10, ty); ty += lineH;
        }

        // Zona útil
        fill(255, 255, 0, 200);
        text(`Zona: X[${this.camZoneMinX.toFixed(2)}-${this.camZoneMaxX.toFixed(2)}] Y[${this.camZoneMinY.toFixed(2)}-${this.camZoneMaxY.toFixed(2)}]`, pipX + 10, ty); ty += lineH;

        // Posición del cursor
        fill(150);
        text(`Cursor: (${Math.round(this.handX)}, ${Math.round(this.handY)})`, pipX + 10, ty); ty += lineH;

        // Controles
        fill(100);
        textSize(11);
        text(`H:debug  C:pinch  Z:zona`, pipX + 10, ty);
        
        pop();
    }
}
