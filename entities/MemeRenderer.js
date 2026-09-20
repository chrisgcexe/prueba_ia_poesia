import { AssetManager } from '../engine/AssetManager.js';

export class MemeRenderer {
    static draw(meme, cam, zones) {
        push();
        if (meme.drawOffsetX || meme.drawOffsetY) {
            translate(meme.drawOffsetX, meme.drawOffsetY);
        }

        if (meme.rotation !== 0 || meme.baseRotation !== 0) {
            translate(meme.x + meme.w / 2, meme.y + meme.h / 2);
            rotate(meme.rotation + meme.baseRotation);
            translate(-(meme.x + meme.w / 2), -(meme.y + meme.h / 2));
        }
        
        if (!meme.buffer && meme.img && meme.img.width > 0) {
            this.createCache(meme, AssetManager.getAtlas(), AssetManager.getMemesData(), AssetManager.getMapaGramatical());
        }
        
        this.dibujar_meme(meme, AssetManager.getAtlas(), AssetManager.getMemesData(), AssetManager.getMapaGramatical());
        this.dibujar_adn(meme, cam, zones);
        this._drawHover(meme, cam);
        pop();
    }

    static createCache(meme) {
        if (meme.buffer) return;

        let sourceImg = null;
        let sx, sy, sw, sh;
        
        if (meme.atlasType === 'meme' && AssetManager.getAtlas()) {
            let data = AssetManager.getMemesData()[meme.atlasFilename];
            if (data) {
                sourceImg = AssetManager.getAtlas();
                sx = data.x; sy = data.y; sw = data.w; sh = data.h;
            }
        } else if (meme.atlasType === 'recorte') {
            let data = null;
            if (AssetManager.getAtlas() && AssetManager.getMapaGramatical() && AssetManager.getMapaGramatical()[meme.memePadre] && AssetManager.getMapaGramatical()[meme.memePadre].recortes_globales) {
                let recortes = AssetManager.getMapaGramatical()[meme.memePadre].recortes_globales;
                // Intentar match exacto primero
                if (recortes[meme.palabra]) {
                    data = recortes[meme.palabra];
                } else {
                    // Match insensible a mayúsculas y acentos
                    let cleanPalabra = meme.palabra.toLowerCase().replace(/[^a-záéíóúñ0-9]/g, '');
                    for (let key in recortes) {
                        let cleanKey = key.toLowerCase().replace(/[^a-záéíóúñ0-9]/g, '');
                        if (cleanKey === cleanPalabra) {
                            data = recortes[key];
                            break;
                        }
                    }
                }
            }

            if (data) {
                sourceImg = AssetManager.getAtlas();
                sx = data.x; sy = data.y; sw = data.w; sh = data.h;
            } else {
                this._createFallbackTextCache(meme);
                return; 
            }
        } else if (meme.img && meme.img.width > 0) {
            sourceImg = meme.img;
            sx = 0; sy = 0; sw = meme.img.width; sh = meme.img.height;
        }

        if (sourceImg) {
            meme.aspectRatio = sw / sh;
            meme.aspectRatio = constrain(meme.aspectRatio, 0.4, 4.0);

            let cacheH = 100;
            let cacheW = cacheH * meme.aspectRatio;

            if (meme.w === 100 && meme.h === 100) {
                if (meme.esHijoPoema || meme.esHijo) {
                    meme.w = cacheW * 0.6;
                    meme.h = cacheH * 0.6;
                } else {
                    meme.w = cacheW;
                    meme.h = cacheH;
                }
            }

            let pad = 10;
            meme.buffer = createGraphics(cacheW + pad * 2, cacheH + pad * 2);
            meme.buffer.clear();
            
            let p = [];
            let jx = min(cacheW * 0.08, 15); 
            let jy = min(cacheH * 0.1, 15); 
            let tl = { x: random(0, jx), y: random(0, jy) };
            let tr = { x: cacheW - random(0, jx), y: random(0, jy) };
            let br = { x: cacheW - random(0, jx), y: cacheH - random(0, jy) };
            let bl = { x: random(0, jx), y: cacheH - random(0, jy) };

            let segs = 6;
            let micro = 4.0;
            
            for(let i=0; i<=segs; i++) p.push({ x: lerp(tl.x, tr.x, i/segs), y: lerp(tl.y, tr.y, i/segs) + (i>0 && i<segs ? random(-micro, micro) : 0) });
            for(let i=1; i<=segs; i++) p.push({ x: lerp(tr.x, br.x, i/segs) + (i<segs ? random(-micro, micro) : 0), y: lerp(tr.y, br.y, i/segs) });
            for(let i=1; i<=segs; i++) p.push({ x: lerp(br.x, bl.x, i/segs), y: lerp(br.y, bl.y, i/segs) + (i<segs ? random(-micro, micro) : 0) });
            for(let i=1; i<segs; i++) p.push({ x: lerp(bl.x, tl.x, i/segs) + random(-micro, micro), y: lerp(bl.y, tl.y, i/segs) });

            meme.buffer.drawingContext.shadowOffsetX = 2;
            meme.buffer.drawingContext.shadowOffsetY = 3;
            meme.buffer.drawingContext.shadowBlur = 6;
            meme.buffer.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.35)';
            
            meme.buffer.fill(255);
            meme.buffer.noStroke();
            meme.buffer.beginShape();
            for(let pt of p) meme.buffer.vertex(pt.x + pad, pt.y + pad);
            meme.buffer.endShape(CLOSE);
            
            meme.buffer.drawingContext.shadowColor = 'transparent';

            meme.buffer.drawingContext.save();
            meme.buffer.beginShape();
            for(let pt of p) meme.buffer.vertex(pt.x + pad, pt.y + pad);
            meme.buffer.endShape(CLOSE);
            meme.buffer.drawingContext.clip();

            meme.buffer.image(sourceImg, pad, pad, cacheW, cacheH, sx, sy, sw, sh);
            meme.buffer.drawingContext.restore();
        }
    }

    static _createFallbackTextCache(meme) {
        let len = meme.palabra ? meme.palabra.length : 5;
        meme.aspectRatio = constrain(len * 0.25, 1.0, 4.0);

        let cacheH = 100;
        let cacheW = cacheH * meme.aspectRatio;

        if (meme.w === 100 && meme.h === 100) {
            if (meme.esHijoPoema || meme.esHijo) {
                meme.w = cacheW * 0.6;
                meme.h = cacheH * 0.6;
            } else {
                meme.w = cacheW;
                meme.h = cacheH;
            }
        }

        let pad = 10;
        meme.buffer = createGraphics(cacheW + pad * 2, cacheH + pad * 2);
        meme.buffer.clear();

        let p = [];
        let jx = random(2, 5); 
        let jy = random(2, 5); 
        let tl = { x: random(0, jx), y: random(0, jy) };
        let tr = { x: cacheW - random(0, jx), y: random(0, jy) };
        let br = { x: cacheW - random(0, jx), y: cacheH - random(0, jy) };
        let bl = { x: random(0, jx), y: cacheH - random(0, jy) };

        let segs = 4;
        let micro = 3.0; 
        let nSeed = random(100);
        
        for(let i=0; i<=segs; i++) p.push({ x: lerp(tl.x, tr.x, i/segs), y: lerp(tl.y, tr.y, i/segs) + (i>0 && i<segs ? (noise(nSeed+i*0.5)-0.5)*micro*2 : 0) });
        for(let i=1; i<=segs; i++) p.push({ x: lerp(tr.x, br.x, i/segs) + (i<segs ? (noise(nSeed+10+i*0.5)-0.5)*micro*2 : 0), y: lerp(tr.y, br.y, i/segs) });
        for(let i=1; i<=segs; i++) p.push({ x: lerp(br.x, bl.x, i/segs), y: lerp(br.y, bl.y, i/segs) + (i<segs ? (noise(nSeed+20+i*0.5)-0.5)*micro*2 : 0) });
        for(let i=1; i<segs; i++) p.push({ x: lerp(bl.x, tl.x, i/segs) + (noise(nSeed+30+i*0.5)-0.5)*micro*2, y: lerp(bl.y, tl.y, i/segs) });

        meme.buffer.drawingContext.shadowOffsetX = 1.5;
        meme.buffer.drawingContext.shadowOffsetY = 1.5;
        meme.buffer.drawingContext.shadowBlur = 3;
        meme.buffer.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.4)';
        
        meme.buffer.fill(255);
        meme.buffer.stroke(0);
        meme.buffer.strokeWeight(1);
        meme.buffer.beginShape();
        for(let pt of p) meme.buffer.vertex(pt.x + pad, pt.y + pad);
        meme.buffer.endShape(CLOSE);

        meme.buffer.drawingContext.shadowColor = 'transparent';

        meme.buffer.fill(0);
        meme.buffer.noStroke();
        meme.buffer.textAlign(CENTER, CENTER);
        
        let idealSize = cacheH * 0.4;
        meme.buffer.textSize(idealSize);
        meme.buffer.textWrap(WORD);
        
        meme.buffer.text(meme.palabra, pad + 5, pad + 5, cacheW - 10, cacheH - 10);
    }

    static dibujar_meme(meme) {
        if (!meme.buffer) {
            if (meme.atlasType === 'none' && !meme.img && meme.imgPath && !meme.loading) {
                meme.loading = true;
                meme.img = loadImage(meme.imgPath);
            }
            this.createCache(meme, AssetManager.getAtlas(), AssetManager.getMemesData(), AssetManager.getMapaGramatical());
        }

        if (meme.buffer) {
            if (meme.isColliding) {
                push();
                noFill();
                stroke('red');
                strokeWeight(2);
                rect(meme.x, meme.y, meme.w, meme.h);
                pop();
            }
            
            let scaleX = meme.w / (meme.buffer.width - 20);
            let scaleY = meme.h / (meme.buffer.height - 20);

            if (meme.alpha !== undefined) {
                push();
                tint(255, meme.alpha);
                image(meme.buffer, meme.x - 10 * scaleX, meme.y - 10 * scaleY, meme.buffer.width * scaleX, meme.buffer.height * scaleY);
                pop();
            } else {
                image(meme.buffer, meme.x - 10 * scaleX, meme.y - 10 * scaleY, meme.buffer.width * scaleX, meme.buffer.height * scaleY);
            }
        } else {
            if (meme.alpha !== undefined) {
                fill(255, meme.alpha);
            } else {
                fill(255);
            }
            let strokeColor = color(meme.isColliding ? 'red' : 'black');
            if (meme.alpha !== undefined) {
                strokeColor.setAlpha(meme.alpha);
            }
            stroke(strokeColor);
            strokeWeight(2);
            rect(meme.x, meme.y, meme.w, meme.h);
        }
    }

    static dibujar_adn(meme, cam, zones) {
        if (cam.zoom < 0.6) return; 
        if (meme.esHijoPoema) return; 

        if (!meme.esHijo && !meme.isDragging && !meme.isFlying) {
            let currentZone = zones ? zones.getZoneFor(meme, cam) : 'OUTSIDE';
            if (currentZone === 'POOL') return; 
        }

        let c = color((meme.dna && meme.dna.familiaColor) ? meme.dna.familiaColor : '#000000');
        if (meme.alpha !== undefined) c.setAlpha(meme.alpha);
        fill(c);
        noStroke();
        textSize(8 / cam.zoom);
        
        if (meme.dna && meme.dna.sequence) {
            let seqStr = meme.dna.sequence;
            
            if (!meme.esHijo) {
                if (seqStr.length > 25) seqStr = seqStr.substring(0, 22) + "...";
                text(seqStr, meme.x, meme.y - 8);
            } else {
                let difStr = seqStr;
                if (meme.padres && meme.padres.length >= 1) {
                    let p1Seq = meme.padres[0].dna ? meme.padres[0].dna.sequence : "";
                    let idx = 0;
                    while (idx < seqStr.length && idx < p1Seq.length && seqStr[idx] === p1Seq[idx]) {
                        idx++;
                    }
                    if (idx < seqStr.length) {
                        difStr = "+" + seqStr.substring(idx);
                    } else {
                        difStr = ""; 
                    }
                }
                if (difStr.length > 25) difStr = difStr.substring(0, 22) + "...";
                if (difStr.length > 0) {
                    text(difStr, meme.x, meme.y + meme.h + 12);
                }
            }
        }
    }

    static _drawHover(meme, cam) {
        if (!meme.esHijoPoema && !meme.isDragging && meme.isMouseOver(mouseX, mouseY, cam)) {
            push();
            fill(255, 0, 0, 30); 
            noStroke();
            rect(meme.x, meme.y, meme.w, meme.h);
            pop();
        }
    }
}
