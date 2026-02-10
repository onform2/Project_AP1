// Room 1: Identity Codification
// Webcam selfie transformed into glitchy code-based version using MediaPipe

(function() {
    const container = document.getElementById('room1');
    let isActive = false;
    let animationId = null;
    
    let canvas, ctx;
    let videoElement, captureBtn, statusText;
    let faceMesh = null;
    let webcamCamera = null;
    
    // State
    let hasCaptured = false;
    let capturedImage = null;
    let glitchPhase = 0;
    let faceData = null;
    
    // Glitch parameters
    const glitchParams = {
        pixelSize: 4,
        rgbShift: 8,
        scanlineIntensity: 0.3,
        noiseAmount: 0.15,
        blockGlitch: 0.4,
        dataCorruption: 0.3,
        codeOverlay: true
    };

    function init() {
        // Create canvas
        canvas = document.createElement('canvas');
        canvas.id = 'room1-canvas';
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        container.appendChild(canvas);
        ctx = canvas.getContext('2d');
        
        // Create video element (hidden, used for capture)
        videoElement = document.createElement('video');
        videoElement.id = 'room1-video';
        videoElement.autoplay = true;
        videoElement.playsinline = true;
        videoElement.style.cssText = 'position:fixed;bottom:20px;right:20px;width:240px;height:180px;transform:scaleX(-1);border:2px solid #333;border-radius:8px;opacity:0.8;z-index:100;';
        container.appendChild(videoElement);
        
        // Capture button
        captureBtn = document.createElement('button');
        captureBtn.textContent = 'CAPTURE IDENTITY';
        captureBtn.style.cssText = `
            position: fixed;
            bottom: 220px;
            right: 20px;
            padding: 15px 30px;
            font-size: 14px;
            font-family: 'Courier New', monospace;
            background: #111;
            color: #0f0;
            border: 2px solid #0f0;
            border-radius: 4px;
            cursor: pointer;
            z-index: 100;
            text-transform: uppercase;
            letter-spacing: 2px;
        `;
        captureBtn.addEventListener('click', captureIdentity);
        container.appendChild(captureBtn);
        
        // Status text
        statusText = document.createElement('div');
        statusText.style.cssText = 'position:fixed;top:70px;left:20px;color:#0f0;font-family:monospace;font-size:12px;z-index:100;white-space:pre;';
        statusText.textContent = 'INITIALIZING IDENTITY SCANNER...';
        container.appendChild(statusText);
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #444;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 50;
            pointer-events: none;
        `;
        instructions.innerHTML = `
            <p style="font-size: 24px; color: #222; margin-bottom: 20px;">IDENTITY CODIFICATION CHAMBER</p>
            <p>Position your face in the camera preview</p>
            <p style="margin-top: 10px;">Press CAPTURE to encode your identity</p>
        `;
        instructions.id = 'room1-instructions';
        container.appendChild(instructions);
        
        initCanvas();
        initFaceMesh();
        
        window.addEventListener('resize', onResize);
    }
    
    function initCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function initFaceMesh() {
        faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults(onFaceResults);
        
        let frameCount = 0;
        webcamCamera = new Camera(videoElement, {
            onFrame: async () => {
                if (!isActive) return;
                frameCount++;
                if (frameCount % 2 === 0) {
                    await faceMesh.send({ image: videoElement });
                }
            },
            width: 640,
            height: 480
        });
        
        webcamCamera.start();
        statusText.textContent = 'SCANNER READY\nAWAITING SUBJECT...';
    }
    
    function onFaceResults(results) {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            faceData = results.multiFaceLandmarks[0];
            statusText.textContent = 'FACE DETECTED\nIDENTITY LOCK: ACQUIRED';
            statusText.style.color = '#0f0';
        } else {
            faceData = null;
            statusText.textContent = 'SCANNING...\nNO FACE DETECTED';
            statusText.style.color = '#ff0';
        }
    }
    
    function captureIdentity() {
        if (!faceData) {
            statusText.textContent = 'ERROR: NO FACE TO CAPTURE\nPOSITION FACE IN FRAME';
            statusText.style.color = '#f00';
            return;
        }
        
        // Capture current video frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoElement.videoWidth;
        tempCanvas.height = videoElement.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Mirror the image
        tempCtx.translate(tempCanvas.width, 0);
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(videoElement, 0, 0);
        
        capturedImage = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        hasCaptured = true;
        
        // Hide instructions
        const instructions = document.getElementById('room1-instructions');
        if (instructions) instructions.style.display = 'none';
        
        // Update button
        captureBtn.textContent = 'RECAPTURE';
        captureBtn.style.borderColor = '#f0f';
        captureBtn.style.color = '#f0f';
        
        statusText.textContent = 'IDENTITY CAPTURED\nPROCESSING CODIFICATION...';
        statusText.style.color = '#f0f';
        
        // Start intense glitch animation
        glitchPhase = 0;
    }
    
    function applyGlitchEffect(imageData, time) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Create output buffer
        const output = new Uint8ClampedArray(data.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                
                // Pixelation
                const px = Math.floor(x / glitchParams.pixelSize) * glitchParams.pixelSize;
                const py = Math.floor(y / glitchParams.pixelSize) * glitchParams.pixelSize;
                const pi = (py * width + px) * 4;
                
                // Block glitch - shift entire blocks
                let sourceI = pi;
                const blockX = Math.floor(x / 20);
                const blockY = Math.floor(y / 20);
                const blockRand = Math.sin(blockX * 12.9898 + blockY * 78.233 + time) * 43758.5453 % 1;
                
                if (blockRand > 0.7) {
                    const shiftX = Math.floor((blockRand - 0.5) * 100 * glitchParams.blockGlitch);
                    const shiftY = Math.floor((Math.cos(blockRand * 100) - 0.5) * 50 * glitchParams.blockGlitch);
                    const newX = Math.max(0, Math.min(width - 1, px + shiftX));
                    const newY = Math.max(0, Math.min(height - 1, py + shiftY));
                    sourceI = (newY * width + newX) * 4;
                }
                
                // Horizontal slice displacement
                const sliceRand = Math.sin(y * 0.1 + time * 5) * 0.5 + 0.5;
                if (sliceRand > 0.9) {
                    const sliceShift = Math.floor(Math.sin(time * 10 + y) * 50);
                    const newX = Math.max(0, Math.min(width - 1, px + sliceShift));
                    sourceI = (py * width + newX) * 4;
                }
                
                // RGB shift
                const rShift = Math.floor(glitchParams.rgbShift * Math.sin(time * 2));
                const bShift = Math.floor(glitchParams.rgbShift * Math.cos(time * 2));
                
                const rI = Math.max(0, Math.min(data.length - 4, sourceI + rShift * 4));
                const bI = Math.max(0, Math.min(data.length - 4, sourceI - bShift * 4));
                
                output[i] = data[rI];         // R from shifted position
                output[i + 1] = data[sourceI + 1]; // G from source
                output[i + 2] = data[bI + 2];     // B from shifted position
                output[i + 3] = 255;
                
                // Add noise
                if (Math.random() < glitchParams.noiseAmount) {
                    const noise = (Math.random() - 0.5) * 100;
                    output[i] = Math.max(0, Math.min(255, output[i] + noise));
                    output[i + 1] = Math.max(0, Math.min(255, output[i + 1] + noise));
                    output[i + 2] = Math.max(0, Math.min(255, output[i + 2] + noise));
                }
                
                // Data corruption - random pixel replacement
                if (Math.random() < glitchParams.dataCorruption * 0.01) {
                    const corruptType = Math.floor(Math.random() * 4);
                    if (corruptType === 0) output[i] = 0;
                    else if (corruptType === 1) output[i + 1] = 255;
                    else if (corruptType === 2) output[i + 2] = 0;
                    else {
                        output[i] = output[i + 1] = output[i + 2] = Math.random() > 0.5 ? 255 : 0;
                    }
                }
            }
        }
        
        // Apply scanlines
        for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const darken = glitchParams.scanlineIntensity * 30;
                output[i] = Math.max(0, output[i] - darken);
                output[i + 1] = Math.max(0, output[i + 1] - darken);
                output[i + 2] = Math.max(0, output[i + 2] - darken);
            }
        }
        
        return new ImageData(output, width, height);
    }
    
    function drawCodeOverlay(ctx, width, height, time) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.font = '10px monospace';
        
        // Binary/hex data streams
        const chars = '01アイウエオカキクケコ█▓▒░■□▪▫●○◆◇';
        
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(i * 0.5 + time) * 0.5 + 0.5) * width;
            const y = ((time * 50 + i * 30) % height);
            
            ctx.fillStyle = `rgba(0, ${150 + Math.random() * 105}, 0, ${0.1 + Math.random() * 0.2})`;
            
            let str = '';
            for (let j = 0; j < 8; j++) {
                str += chars[Math.floor(Math.random() * chars.length)];
            }
            ctx.fillText(str, x, y);
        }
        
        // Face data readout
        if (faceData) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
            ctx.font = '11px monospace';
            
            const readout = [
                `SUBJECT ID: ${Math.floor(Math.random() * 999999).toString(16).toUpperCase()}`,
                `FACE_HASH: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                `LANDMARKS: ${faceData.length}`,
                `ENCODING: UTF-FLESH-8`,
                `STATUS: CODIFIED`,
                `TIMESTAMP: ${new Date().toISOString()}`
            ];
            
            readout.forEach((line, i) => {
                ctx.fillText(line, 20, height - 120 + i * 16);
            });
        }
    }
    
    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (hasCaptured && capturedImage) {
            glitchPhase += 0.016;
            
            // Apply glitch effects
            const glitched = applyGlitchEffect(capturedImage, glitchPhase);
            
            // Scale to fill screen while maintaining aspect
            const imgAspect = capturedImage.width / capturedImage.height;
            const screenAspect = canvas.width / canvas.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imgAspect > screenAspect) {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspect;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspect;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            }
            
            // Create temp canvas to draw glitched image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = glitched.width;
            tempCanvas.height = glitched.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(glitched, 0, 0);
            
            // Draw to main canvas
            ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);
            
            // Code overlay
            if (glitchParams.codeOverlay) {
                drawCodeOverlay(ctx, canvas.width, canvas.height, glitchPhase);
            }
            
            // Vignette
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
                canvas.width / 2, canvas.height / 2, canvas.height * 0.8
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
        } else {
            // Pre-capture state - just show subtle grid/scan lines
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.05)';
            ctx.lineWidth = 1;
            
            const gridSize = 50;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        }
    }
    
    function animate() {
        if (!isActive) return;
        draw();
        animationId = requestAnimationFrame(animate);
    }
    
    function onResize() {
        if (!isActive) return;
        initCanvas();
    }
    
    // Public interface
    const room1 = {
        activate() {
            isActive = true;
            if (!canvas) init();
            animationId = requestAnimationFrame(animate);
            if (typeof rooms !== 'undefined') {
                rooms.setStatus('Room 1: Identity Codification');
            }
        },
        
        deactivate() {
            isActive = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            if (webcamCamera) {
                webcamCamera.stop();
            }
        }
    };
    
    if (typeof rooms !== 'undefined') {
        rooms.register(1, room1);
    }
})();
