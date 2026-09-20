export const GameState = {
    elementos: [],
    handTracker: null,
    
    addMeme: function(meme) {
        this.elementos.push(meme);
    },
    
    removeMeme: function(memeOrIndex) {
        let index = -1;
        if (typeof memeOrIndex === 'number') {
            index = memeOrIndex;
        } else {
            index = this.elementos.indexOf(memeOrIndex);
        }
        
        if (index > -1) {
            let el = this.elementos[index];
            if (el.buffer && typeof el.buffer.remove === 'function') {
                el.buffer.remove(); // Limpia el canvas de memoria
            }
            this.elementos.splice(index, 1);
        }
    },
    
    clear: function() {
        for (let el of this.elementos) {
            if (el.buffer && typeof el.buffer.remove === 'function') {
                el.buffer.remove();
            }
        }
        this.elementos = [];
    }
};
