import os
import re

def process_file(filepath, imports, class_name):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Prepend imports
    if imports:
        content = imports + '\n\n' + content
    
    # Replace class declaration
    content = re.sub(rf'^class {class_name}', f'export class {class_name}', content, flags=re.MULTILINE)
    
    # Replace globals
    content = content.replace('mapaGramatical', 'AssetManager.getMapaGramatical()')
    content = content.replace('diccionarioEmocional', 'AssetManager.getDiccionarioEmocional()')
    content = content.replace('atlasImg', 'AssetManager.getAtlas()')
    content = content.replace('memesData', 'AssetManager.getMemesData()')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('entities/MemeElement.js', "import { MemeRenderer } from './MemeRenderer.js';", 'MemeElement')

process_file('entities/ExplosionElement.js', "", 'ExplosionElement')

process_file('entities/MemeRenderer.js', "import { AssetManager } from '../engine/AssetManager.js';", 'MemeRenderer')

process_file('genetica/ArbolGenealogico.js', "", 'ArbolGenealogico')

process_file('poesia/GeneradorPoesia.js', "", 'GeneradorPoesia')

process_file('comportamientos/ComportamientoRechazo.js', "", 'ComportamientoRechazo')

process_file('comportamientos/ComportamientoCanibal.js', "import { ExplosionElement } from '../entities/ExplosionElement.js';\nimport { GameState } from '../engine/GameState.js';", 'ComportamientoCanibal')

process_file('comportamientos/ComportamientoReproduccion.js', "import { MemeElement } from '../entities/MemeElement.js';\nimport { ExplosionElement } from '../entities/ExplosionElement.js';\nimport { AssetManager } from '../engine/AssetManager.js';\nimport { GameState } from '../engine/GameState.js';", 'ComportamientoReproduccion')

process_file('comportamientos/InteractionManager.js', "import { GeneradorPoesia } from '../poesia/GeneradorPoesia.js';\nimport { ArbolGenealogico } from '../genetica/ArbolGenealogico.js';\nimport { ComportamientoReproduccion } from './ComportamientoReproduccion.js';\nimport { ComportamientoCanibal } from './ComportamientoCanibal.js';\nimport { ComportamientoRechazo } from './ComportamientoRechazo.js';\nimport { GameState } from '../engine/GameState.js';", 'InteractionManager')

process_file('engine/ZoneManager.js', "", 'ZoneManager')

process_file('engine/Camera.js', "", 'Camera')

process_file('engine/InputManager.js', "", 'InputManager')

process_file('engine/GameEngine.js', "import { GameState } from './GameState.js';\nimport { InteractionManager } from '../comportamientos/InteractionManager.js';", 'GameEngine')

print('Refactor done')
