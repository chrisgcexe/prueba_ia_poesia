# Arquitectura del Generador de Poemas Memes

## 1. Visión General
El proyecto es un simulador interactivo en **p5.js** donde "memes" (imágenes y palabras) se comportan como organismos biológicos. Flotan en un "caldo" (pool), colisionan, se reproducen (generando recortes de palabras) o se comen entre sí, formando un ecosistema poético. A medida que interactúan, las palabras resultantes se organizan en un área de "papel" para formar un poema estructurado.

El código fuente está modularizado usando **ES6 Modules** (`export` / `import`) y está dividido en áreas de dominio específicas (`engine/`, `entities/`, `poesia/`, `comportamientos/`, `genetica/`) para facilitar la mantenibilidad y escalabilidad. Esto requiere correr el proyecto en un servidor HTTP local.

## 2. Flujo Principal y Gestores Globales (`engine/`)
* **`engine/GameState.js`**: Estado global centralizado. Mantiene la lista de `elementos` interactivos, la cámara, el engine y el gestor de input. Todas las clases leen o escriben el estado del juego desde este módulo. También expone la función crítica `removeMeme(el)` la cual se encarga de llamar a `buffer.remove()` para evitar memory leaks (fugas de memoria) en el navegador al destruir canvases cacheados.
* **`engine/AssetManager.js`**: Gestor centralizado de assets. Se encarga de cargar asíncronamente las imágenes (`atlasImg`) y los JSONs (`mapaGramatical`, `diccionarioEmocional`, `memesData`) en el `preload()`, exponiéndolos a través de *getters* al resto de módulos.
* **`engine/GameEngine.js`**: El corazón lógico del sistema. Accede a `GameState.elementos` y llama a sus funciones `update()` y `draw()` cada frame. Delega las interacciones físicas al `InteractionManager`.
* **`engine/ZoneManager.js`**: Define las "áreas" de lógica del canvas (`POOL` y `WORKTABLE`).
* **`engine/Camera.js` y `engine/InputManager.js`**: Manejan la interacción del usuario (paneo, zoom, clicks).
* **`engine/SpatialHash.js`**: (Optimización de rendimiento). Un sistema de indexado espacial (grilla de cuadrantes de 150x150) utilizado para optimizar masivamente el motor de colisiones de `O(N^2)` a `O(N)`, permitiendo soportar cientos de memes simultáneos.

## 3. Entidades Core (`entities/`)
* **`entities/MemeElement.js`**: Representa a cualquier objeto físico en pantalla. Puede ser un **Meme Raíz** (la imagen original) o un **Recorte de Palabra** (un hijo generado). 
    * Contiene lógica de máquina de estados y física básica (`isDragging`, `isFlying`, `isMating`).
    * Contiene "ADN" (un objeto `dna` que arrastra su historial genealógico).
* **`entities/MemeRenderer.js`**: Clase estática para manejar el dibujado de p5.js. Recibe un `MemeElement` y lo dibuja. Mantiene un **caché de buffers** (`createGraphics`) para simular recortes de periódico irregulares con sombras, mejorando masivamente el rendimiento visual a expensas de requerir limpieza manual (`buffer.remove()`) al morir el elemento.
* **`entities/ExplosionElement.js`**: Sistema de partículas simple para representar interacciones volátiles como el canibalismo.

## 4. Cerebro Poético (`poesia/`)
* **`poesia/GeneradorPoesia.js`**: (Versión Simplificada) Actúa como un evaluador base. Actualmente toma una decisión de cruza puramente aleatoria y extrae fragmentos (1 a 3 palabras) del ADN de los padres de forma básica consultando los datos del `AssetManager`. No implementa métrica ni rima por el momento, sirviendo como una estructura placeholder fácil de entender para futuras iteraciones.

## 5. Interacciones y Comportamientos (`comportamientos/`)
Se encargan de definir qué pasa cuando `MemeElement` A toca a `MemeElement` B.
* **`comportamientos/InteractionManager.js`**: Evalúa todas las colisiones entre los memes del pool e invoca al comportamiento correspondiente. Inyecta los memes del frame en el `SpatialHash` para solo testear distancias entre vecinos cercanos.
* **`comportamientos/ComportamientoReproduccion.js`**: Maneja el apareamiento. Tiemblan un momento y consultan a `GeneradorPoesia.js` para generar nuevos hijos.
* **`comportamientos/ComportamientoCanibal.js`**: Ocasionalmente, si dos elementos tienen sentimientos opuestos, uno "devora" al otro, eliminándolo del `GameState` (con limpieza de RAM) y generando partículas oscuras.
* **`comportamientos/ComportamientoRechazo.js`**: Lógica de rebote cuando los memes no son afines.

## 6. Genética y Posicionamiento (`genetica/`)
* **`genetica/ArbolGenealogico.js`**: Clase pura y abstracta que calcula las coordenadas de posicionamiento (`x, y`) para organizar la disposición visual de las familias en el "árbol genealógico" y de las palabras consecutivas en el área del poema. Desacopla la matemática visual de la lógica de reproducción.

## 7. Manejo de Datos (JSONs)
Ubicadas en `source_assets/json/`:
* **`atlas_palabras_global.json`**: El mapa léxico.
* **`diccionario_emocional.json`**: El mapa semántico (tipo, sentimiento y tags).
* **`atlas_memes_map.json`**: El mapa visual de los memes grandes dentro de la textura empacada principal.

## 8. Interfaces de Salida
* **Dependencias de Audio**: Removidas para mejorar rendimiento (sin p5.sound.min.js).
* **Fondos**: Removidos. Se limpió el diseño a colores planos porque la interfaz gráfica será renovada en futuras versiones.
