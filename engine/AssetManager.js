export const AssetManager = {
    atlasImg: null,
    mapaGramatical: null,
    diccionarioEmocional: null,
    memesData: null,

    preload: function(p) {
        // Asume que p es el contexto global de p5
        this.atlasImg = loadImage('source_assets/atlas_memes.jpg');
        this.mapaGramatical = loadJSON('source_assets/json/atlas_palabras_global.json');
        this.diccionarioEmocional = loadJSON('source_assets/json/diccionario_emocional.json');
        this.memesData = loadJSON('source_assets/json/atlas_memes_map.json');
    },

    getAtlas: function() {
        return this.atlasImg;
    },

    getMapaGramatical: function() {
        return this.mapaGramatical;
    },

    getDiccionarioEmocional: function() {
        return this.diccionarioEmocional;
    },

    getMemesData: function() {
        return this.memesData;
    }
};
