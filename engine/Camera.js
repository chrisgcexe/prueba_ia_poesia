export class Camera {
   // Propiedades de la cámara
    constructor() {
        this.zoom = 1.0;
        this.pan = { x: 0, y: 0 };
    }

    // Método para aplicar zoom
    applyZoom(deltaY) {
        let factor = (deltaY > 0) ? 0.9 : 1.1;
        this.zoom = constrain(this.zoom * factor, 0.5, 5.0);
    }

    // Método para actualizar el pan
    updatePan(dx, dy) {
        this.pan.x += dx;
        this.pan.y += dy;
    }

    // Método para convertir coordenadas globales a locales de cámara
    applyTransform() {
        translate(this.pan.x, this.pan.y);
        scale(this.zoom);
    }
}