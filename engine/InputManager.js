export class InputManager {
    constructor() {
        this.dragTarget = null;
        this.lastHandX = 0;
        this.lastHandY = 0;
    }

    mousePressed(mouseX, mouseY, cam, elementos) {
        for (let el of elementos) {
            if (el.isMouseOver(mouseX, mouseY, cam)) { 
                if (el.esHijoPoema || el.isBusy) continue; // Inmovilizar fragmentos del poema y memes bloqueados
                el.isDragging = true; 
                this.dragTarget = el;
                break; 
            }
        }
    }

    mouseReleased(elementos) {
        if (this.dragTarget) {
            this.dragTarget.isDragging = false;
            this.dragTarget = null;
        }
        elementos.forEach(el => el.isDragging = false); 
    }

    mouseDragged(mouseX, pmouseX, mouseY, pmouseY, cam, elementos, isFromHand = false) {
        if (!elementos.some(e => e.isDragging)) {
            cam.updatePan(mouseX - pmouseX, mouseY - pmouseY); 
        } else if (this.dragTarget && isFromHand) {
            this.dragTarget.x += (mouseX - pmouseX) / cam.zoom;
            this.dragTarget.y += (mouseY - pmouseY) / cam.zoom;
        }
    }

    mouseWheel(e, cam) {
        cam.applyZoom(e.deltaY); 
        return false;
    }

    keyPressed(code, cam, elementos) {
        // Funcionalidad de borrado desactivada por ahora
    }

    updateFromHand(handTracker, cam, elementos) {
        if (!handTracker.isActive) return;

        let hx = handTracker.handX;
        let hy = handTracker.handY;
        let isPinching = handTracker.isPinching;
        let wasPinching = handTracker.wasPinching;

        if (isPinching && !wasPinching) {
            this.mousePressed(hx, hy, cam, elementos);
        } else if (!isPinching && wasPinching) {
            this.mouseReleased(elementos);
        } else if (isPinching && wasPinching) {
            this.mouseDragged(hx, this.lastHandX, hy, this.lastHandY, cam, elementos, true);
        }

        handTracker.wasPinching = isPinching;
        this.lastHandX = hx;
        this.lastHandY = hy;
    }
}
