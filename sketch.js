import { AssetManager } from './engine/AssetManager.js';
import { GameState } from './engine/GameState.js';
import { GameEngine } from './engine/GameEngine.js';
import { ZoneManager } from './engine/ZoneManager.js';
import { Camera } from './engine/Camera.js';
import { InputManager } from './engine/InputManager.js';
import { InteractionManager } from './comportamientos/InteractionManager.js';
import { MemeElement } from './entities/MemeElement.js';
import { HandTracker } from './engine/HandTracker.js';

let adnEstructurado = null;

function preload() {
    let v = "?v=" + Date.now();
    adnEstructurado = loadJSON('source_assets/json/ADN_Estructurado_Final.json' + v);
    AssetManager.preload();
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    if (!adnEstructurado || !AssetManager.getMapaGramatical()) {
        console.error("Error: Los archivos JSON no se cargaron correctamente.");
        return;
    }

    GameState.cam = new Camera();
    GameState.zonas = new ZoneManager();
    GameState.interacciones = new InteractionManager();
    GameState.inputManager = new InputManager();
    GameState.engine = new GameEngine(GameState.interacciones, GameState.zonas);
    GameState.handTracker = new HandTracker();
    
    let pool = GameState.zonas.zones.find(z => z.name === 'POOL');
    
    let keys = Object.keys(adnEstructurado);
    for (let k of keys) {
        let datosMeme = adnEstructurado[k];
        let filename = datosMeme.archivo; 
        
        let randomX = random(pool.x + 50, pool.x + pool.w - 250);
        let randomY = random(pool.y + 50, pool.y + pool.h - 100);
        
        let el = new MemeElement(randomX, randomY, datosMeme, filename);
        GameState.addMeme(el);
    }
}

function draw() {
    clear();
    push();
    if (GameState.cam) GameState.cam.applyTransform();
    if (GameState.engine) GameState.engine.run(GameState.cam, width, height);    
    pop();
}

function mousePressed() {
    if (!GameState.inputManager) return;
    GameState.inputManager.mousePressed(mouseX, mouseY, GameState.cam, GameState.elementos);
}

function mouseReleased() { 
    if (!GameState.inputManager) return;
    GameState.inputManager.mouseReleased(GameState.elementos);
}

function mouseDragged() { 
    if (!GameState.inputManager) return;
    GameState.inputManager.mouseDragged(mouseX, pmouseX, mouseY, pmouseY, GameState.cam, GameState.elementos);
}

function mouseWheel(e) { 
    if (!GameState.inputManager) return;
    GameState.inputManager.mouseWheel(e, GameState.cam);
    return false; 
}

function keyPressed() {
    if (!GameState.inputManager) return;
    GameState.inputManager.keyPressed(keyCode, GameState.cam, GameState.elementos);
    
    // Toggle HandTracker debug with 'H' key (72 is keycode for H)
    if (keyCode === 72 || key.toUpperCase() === 'H') {
        if (GameState.handTracker) {
            GameState.handTracker.toggleDebug();
        }
    }
    // Re-calibrate HandTracker with 'C' key
    if (keyCode === 67 || key.toUpperCase() === 'C') {
        if (GameState.handTracker) {
            GameState.handTracker.recalibrate();
        }
    }
    // Calibrate camera zone with 'Z' key
    if (keyCode === 90 || key.toUpperCase() === 'Z') {
        if (GameState.handTracker) {
            GameState.handTracker.recalibrateZone();
        }
    }
}

// Expose p5 methods to global window
window.preload = preload;
window.setup = setup;
window.draw = draw;
window.mousePressed = mousePressed;
window.mouseReleased = mouseReleased;
window.mouseDragged = mouseDragged;
window.mouseWheel = mouseWheel;
window.keyPressed = keyPressed;