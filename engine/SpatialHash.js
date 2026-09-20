export class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    _hash(x, y) {
        let cx = Math.floor(x / this.cellSize);
        let cy = Math.floor(y / this.cellSize);
        return cx + ',' + cy;
    }

    clear() {
        this.cells.clear();
    }

    insert(element) {
        let minX = element.x;
        let minY = element.y;
        let maxX = element.x + element.w;
        let maxY = element.y + element.h;

        let startX = Math.floor(minX / this.cellSize);
        let startY = Math.floor(minY / this.cellSize);
        let endX = Math.floor(maxX / this.cellSize);
        let endY = Math.floor(maxY / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                let key = x + ',' + y;
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                this.cells.get(key).push(element);
            }
        }
    }

    query(element) {
        let minX = element.x;
        let minY = element.y;
        let maxX = element.x + element.w;
        let maxY = element.y + element.h;

        let startX = Math.floor(minX / this.cellSize);
        let startY = Math.floor(minY / this.cellSize);
        let endX = Math.floor(maxX / this.cellSize);
        let endY = Math.floor(maxY / this.cellSize);

        let result = new Set();

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                let key = x + ',' + y;
                if (this.cells.has(key)) {
                    for (let other of this.cells.get(key)) {
                        if (other !== element) {
                            result.add(other);
                        }
                    }
                }
            }
        }

        return Array.from(result);
    }
}
