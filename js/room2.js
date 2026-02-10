// Room 2: The Cache
// Orbs, cubes, image panels with hand tracking interaction

(function() {
    const container = document.getElementById('room2');
    let isActive = false;
    let animationId = null;
    
    // Three.js globals (scoped to room)
    let scene, camera, renderer;
    let orbs = [];
    let cubes = [];
    let allObjects = [];
    let imagePanels = [];
    let bondGroup;
    
    // Hand tracking
    let hands = null;
    let webcamCamera = null;
    let videoElement, startBtn, handStatus;
    
    // Interaction state
    let handPos3D = new THREE.Vector3();
    let smoothedHandPos = new THREE.Vector3();
    let isHandInScene = false;
    let lastInteractionTime = Date.now();
    let isIdle = false;
    let isPinching = false;
    let wasPinching = false;
    
    const raycaster = new THREE.Raycaster();
    const handPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    
    // Hand landmarks
    const WRIST = 0;
    const THUMB_TIP = 4;
    const INDEX_TIP = 8;

    // ============== CONFIG ==============
    const CONFIG = {
        orbCount: 80,
        containerSize: 1.75,
        minRadius: 0.12,
        maxRadius: 0.5,
        gravity: -0.001,
        damping: 0.96,
        mouseForce: 0.08,
        clickForce: 1.8,
        minSoftness: 0.7,
        maxSoftness: 0.98,
        rotationSpeed: 0.00002,
        idleThreshold: 2.0,
        bondFormRate: 0.02,
        bondBreakRate: 0.1,
        maxBondsPerOrb: 4,
        bondDistance: 0.8,
        bondStrength: 0.02,
        clusterSize: { min: 3, max: 10 },
        styles: [
            { name: 'wireframe', wireframe: true, color: 0xffffff, emissive: 0x000000, opacity: 0.9, transparent: true },
            { name: 'metallic', wireframe: false, color: 0xffd700, emissive: 0x442200, opacity: 0.85, transparent: true, metalness: 0.95, roughness: 0.05 },
            { name: 'xray', wireframe: true, color: 0x00ffff, emissive: 0x004444, opacity: 0.5, transparent: true },
            { name: 'neon', wireframe: true, color: 0xff00ff, emissive: 0xff00ff, opacity: 0.8, transparent: true },
            { name: 'flesh', wireframe: false, color: 0xee9977, emissive: 0x442222, opacity: 0.75, transparent: true },
            { name: 'glass', wireframe: false, color: 0xaaddff, emissive: 0x223344, opacity: 0.4, transparent: true, metalness: 0.1, roughness: 0.05 },
            { name: 'toxic', wireframe: true, color: 0x00ff44, emissive: 0x00ff22, opacity: 0.7, transparent: true },
            { name: 'blood', wireframe: false, color: 0xaa0022, emissive: 0x440000, opacity: 0.8, transparent: true },
            { name: 'hologram', wireframe: true, color: 0x4488ff, emissive: 0x2244aa, opacity: 0.6, transparent: true },
            { name: 'pearl', wireframe: false, color: 0xffeeff, emissive: 0x332233, opacity: 0.7, transparent: true, metalness: 0.3, roughness: 0.2 }
        ]
    };

    const IMAGE_COUNT = 100;
    const CUBE_COUNT = 20;

    // ============== INIT ==============
    function init() {
        // Create UI elements
        videoElement = document.createElement('video');
        videoElement.id = 'room2-video';
        videoElement.autoplay = true;
        videoElement.playsinline = true;
        videoElement.style.cssText = 'position:fixed;bottom:20px;right:20px;width:200px;height:150px;transform:scaleX(-1);border:2px solid #333;border-radius:8px;opacity:0.7;z-index:100;';
        container.appendChild(videoElement);
        
        startBtn = document.createElement('button');
        startBtn.id = 'room2-startBtn';
        startBtn.textContent = 'Start Hand Tracking';
        startBtn.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 40px;font-size:18px;background:#222;color:#fff;border:2px solid #444;border-radius:8px;cursor:pointer;z-index:200;';
        startBtn.addEventListener('click', initHandTracking);
        container.appendChild(startBtn);
        
        handStatus = document.createElement('div');
        handStatus.id = 'room2-handStatus';
        handStatus.textContent = 'Click button to start';
        handStatus.style.cssText = 'position:fixed;top:70px;left:20px;color:#666;font-family:monospace;font-size:14px;z-index:100;';
        container.appendChild(handStatus);
        
        // Three.js container
        const threeContainer = document.createElement('div');
        threeContainer.id = 'room2-three';
        threeContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        container.appendChild(threeContainer);
        
        setupThreeJS(threeContainer);
        setupMouseFallback();
    }

    function setupThreeJS(threeContainer) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050508);
        
        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 9);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        threeContainer.appendChild(renderer.domElement);
        
        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);
        const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.3);
        dirLight2.position.set(-5, -3, -5);
        scene.add(dirLight2);
        scene.add(new THREE.PointLight(0xffffee, 0.4));
        
        // Bounding box
        const boxGeo = new THREE.BoxGeometry(CONFIG.containerSize * 2, CONFIG.containerSize * 2, CONFIG.containerSize * 2);
        const boxEdges = new THREE.EdgesGeometry(boxGeo);
        const boxMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.4 });
        scene.add(new THREE.LineSegments(boxEdges, boxMat));
        
        // Bond group
        bondGroup = new THREE.Group();
        scene.add(bondGroup);
        
        // Create objects
        createImagePanels();
        createOrbs();
        createCubes();
        
        allObjects = [...orbs, ...cubes];
    }

    // ============== SOFT ORB CLASS ==============
    class SoftOrb {
        constructor(index) {
            this.index = index;
            const sizeRand = Math.pow(Math.random(), 1.5);
            this.baseRadius = CONFIG.minRadius + sizeRand * (CONFIG.maxRadius - CONFIG.minRadius);
            this.softness = CONFIG.minSoftness + Math.random() * (CONFIG.maxSoftness - CONFIG.minSoftness);
            this.jellyFactor = 0.5 + Math.random() * 0.5;
            this.style = CONFIG.styles[Math.floor(Math.random() * CONFIG.styles.length)];
            this.meshDetail = Math.floor(4 + Math.random() * 28);
            
            this.position = new THREE.Vector3(
                (Math.random() - 0.5) * CONFIG.containerSize * 1.8,
                (Math.random() - 0.5) * CONFIG.containerSize * 1.8,
                (Math.random() - 0.5) * CONFIG.containerSize * 1.8
            );
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.squish = new THREE.Vector3(1, 1, 1);
            this.targetSquish = new THREE.Vector3(1, 1, 1);
            this.jellyPhase = Math.random() * Math.PI * 2;
            this.jellySpeed = 1 + Math.random() * 2;
            this.bonds = [];
            
            this.createGeometry();
            this.material = this.createMaterial();
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.mesh.position.copy(this.position);
            scene.add(this.mesh);
        }
        
        createGeometry() {
            this.geometry = new THREE.SphereGeometry(this.baseRadius, this.meshDetail, this.meshDetail);
            const positions = this.geometry.attributes.position.array;
            const irregularity = 0.1 + Math.random() * 0.25;
            
            for (let i = 0; i < positions.length; i += 3) {
                const noise = (Math.random() - 0.5) * irregularity * this.baseRadius;
                const len = Math.sqrt(positions[i]**2 + positions[i+1]**2 + positions[i+2]**2);
                if (len > 0) {
                    const scale = (len + noise) / len;
                    positions[i] *= scale;
                    positions[i+1] *= scale;
                    positions[i+2] *= scale;
                }
            }
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.computeVertexNormals();
            this.originalPositions = positions.slice();
        }
        
        createMaterial() {
            const s = this.style;
            if (s.metalness !== undefined) {
                return new THREE.MeshStandardMaterial({
                    color: s.color, emissive: s.emissive, metalness: s.metalness, roughness: s.roughness,
                    transparent: s.transparent, opacity: s.opacity, wireframe: s.wireframe, side: THREE.DoubleSide
                });
            }
            return new THREE.MeshPhongMaterial({
                color: s.color, emissive: s.emissive, transparent: s.transparent,
                opacity: s.opacity, wireframe: s.wireframe, shininess: 50, side: THREE.DoubleSide
            });
        }
        
        update(objects, mousePos, isMouseIn, time) {
            this.velocity.y += CONFIG.gravity;
            
            // Bond forces
            for (const bondedIdx of this.bonds) {
                const other = objects[bondedIdx];
                if (!other) continue;
                const toOther = new THREE.Vector3().subVectors(other.position, this.position);
                const dist = toOther.length();
                const targetDist = (this.baseRadius + other.baseRadius) * 1.2;
                if (dist > targetDist) {
                    this.velocity.add(toOther.normalize().multiplyScalar((dist - targetDist) * CONFIG.bondStrength));
                }
            }
            
            // Mouse/hand interaction
            if (isMouseIn && mousePos) {
                const toMouse = new THREE.Vector3().subVectors(mousePos, this.position);
                const dist = toMouse.length();
                if (dist < 2.5) {
                    this.velocity.add(toMouse.normalize().multiplyScalar(-CONFIG.mouseForce / (dist + 0.3)));
                    const squishAmt = Math.max(0, 1 - dist / 2.5) * this.softness * 0.5;
                    this.targetSquish.set(1 + squishAmt, 1 - squishAmt * 0.7, 1 + squishAmt * 0.5);
                }
            }
            
            // Orb collision
            for (const other of objects) {
                if (other === this) continue;
                const toOther = new THREE.Vector3().subVectors(other.position, this.position);
                const dist = toOther.length();
                const minDist = this.baseRadius + other.baseRadius;
                if (dist < minDist && dist > 0.01) {
                    const overlap = minDist - dist;
                    const pushDir = toOther.normalize();
                    const myMass = Math.pow(this.baseRadius, 3);
                    const otherMass = Math.pow(other.baseRadius, 3);
                    this.velocity.sub(pushDir.clone().multiplyScalar(overlap * 0.3 * (otherMass / (myMass + otherMass))));
                    const sf = this.softness * overlap * 3;
                    this.targetSquish.set(1 + sf * (0.5 + Math.abs(pushDir.x)), 1 - sf * 0.5, 1 + sf * (0.5 + Math.abs(pushDir.z)));
                }
            }
            
            // Bounds
            const bounds = CONFIG.containerSize - this.baseRadius * 0.8;
            ['x', 'y', 'z'].forEach(axis => {
                if (this.position[axis] > bounds) { this.position[axis] = bounds; this.velocity[axis] *= -0.3; this.targetSquish[axis] = 0.6; }
                if (this.position[axis] < -bounds) { this.position[axis] = -bounds; this.velocity[axis] *= -0.3; this.targetSquish[axis] = 0.6; }
            });
            
            this.velocity.multiplyScalar(CONFIG.damping);
            this.position.add(this.velocity);
            this.squish.lerp(this.targetSquish, 0.06);
            this.targetSquish.lerp(new THREE.Vector3(1,1,1), 0.03);
            
            this.mesh.position.copy(this.position);
            this.mesh.scale.copy(this.squish);
            
            // Vertex wobble
            const positions = this.geometry.attributes.position.array;
            const phase = this.jellyPhase + time * this.jellySpeed;
            const velMag = this.velocity.length();
            for (let i = 0; i < positions.length; i += 3) {
                const wobble = (Math.sin(phase + i * 0.5) * 0.02 + velMag * 0.8) * this.jellyFactor;
                positions[i] = this.originalPositions[i] * (1 + Math.sin(phase * 1.3 + this.originalPositions[i] * 8) * wobble);
                positions[i+1] = this.originalPositions[i+1] * (1 + Math.cos(phase * 0.9 + this.originalPositions[i+1] * 6) * wobble);
                positions[i+2] = this.originalPositions[i+2] * (1 + Math.sin(phase * 1.1 + this.originalPositions[i+2] * 7) * wobble);
            }
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.computeVertexNormals();
        }
        
        explodeFrom(point, force) {
            const dir = new THREE.Vector3().subVectors(this.position, point);
            const dist = dir.length();
            if (dist < 5) {
                const strength = force / (dist + 0.3);
                dir.normalize().multiplyScalar(strength);
                dir.x += (Math.random() - 0.5) * strength * 0.8;
                dir.y += (Math.random() - 0.5) * strength * 0.8;
                dir.z += (Math.random() - 0.5) * strength * 0.8;
                this.velocity.add(dir);
                this.targetSquish.set(0.4 + Math.random() * 0.4, 1.6 + Math.random() * 0.6, 0.4 + Math.random() * 0.4);
                this.jellyFactor = Math.min(1.5, this.jellyFactor + 0.5);
            }
        }
    }

    // ============== SOFT CUBE CLASS ==============
    class SoftCube {
        constructor(index, orbCount) {
            this.index = orbCount + index;
            this.isCube = true;
            const sizeRand = Math.pow(Math.random(), 1.5);
            this.baseRadius = CONFIG.minRadius * 0.8 + sizeRand * (CONFIG.maxRadius - CONFIG.minRadius) * 0.8;
            this.softness = CONFIG.minSoftness + Math.random() * (CONFIG.maxSoftness - CONFIG.minSoftness);
            this.jellyFactor = 0.4 + Math.random() * 0.4;
            this.style = CONFIG.styles[Math.floor(Math.random() * CONFIG.styles.length)];
            this.meshDetail = Math.floor(1 + Math.random() * 4);
            
            this.position = new THREE.Vector3(
                (Math.random() - 0.5) * CONFIG.containerSize * 1.8,
                (Math.random() - 0.5) * CONFIG.containerSize * 1.8,
                (Math.random() - 0.5) * CONFIG.containerSize * 1.8
            );
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.rotation = new THREE.Vector3(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
            this.rotationVel = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
            this.squish = new THREE.Vector3(1, 1, 1);
            this.targetSquish = new THREE.Vector3(1, 1, 1);
            this.jellyPhase = Math.random() * Math.PI * 2;
            this.jellySpeed = 0.8 + Math.random() * 1.5;
            this.bonds = [];
            
            this.createGeometry();
            this.material = this.createMaterial();
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.mesh.position.copy(this.position);
            scene.add(this.mesh);
        }
        
        createGeometry() {
            this.geometry = new THREE.BoxGeometry(this.baseRadius * 1.6, this.baseRadius * 1.6, this.baseRadius * 1.6, this.meshDetail, this.meshDetail, this.meshDetail);
            const positions = this.geometry.attributes.position.array;
            const irregularity = 0.1 + Math.random() * 0.2;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * irregularity * this.baseRadius;
                positions[i+1] += (Math.random() - 0.5) * irregularity * this.baseRadius;
                positions[i+2] += (Math.random() - 0.5) * irregularity * this.baseRadius;
            }
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.computeVertexNormals();
            this.originalPositions = positions.slice();
        }
        
        createMaterial() {
            const s = this.style;
            if (s.metalness !== undefined) {
                return new THREE.MeshStandardMaterial({
                    color: s.color, emissive: s.emissive, metalness: s.metalness, roughness: s.roughness,
                    transparent: s.transparent, opacity: s.opacity, wireframe: s.wireframe, side: THREE.DoubleSide
                });
            }
            return new THREE.MeshPhongMaterial({
                color: s.color, emissive: s.emissive, transparent: s.transparent,
                opacity: s.opacity, wireframe: s.wireframe, shininess: 50, side: THREE.DoubleSide
            });
        }
        
        update(objects, mousePos, isMouseIn, time) {
            this.velocity.y += CONFIG.gravity;
            
            for (const bondedIdx of this.bonds) {
                const other = objects[bondedIdx];
                if (!other) continue;
                const toOther = new THREE.Vector3().subVectors(other.position, this.position);
                const dist = toOther.length();
                const targetDist = (this.baseRadius + other.baseRadius) * 1.2;
                if (dist > targetDist) {
                    this.velocity.add(toOther.normalize().multiplyScalar((dist - targetDist) * CONFIG.bondStrength));
                }
            }
            
            if (isMouseIn && mousePos) {
                const toMouse = new THREE.Vector3().subVectors(mousePos, this.position);
                const dist = toMouse.length();
                if (dist < 2.5) {
                    this.velocity.add(toMouse.normalize().multiplyScalar(-CONFIG.mouseForce / (dist + 0.3)));
                }
            }
            
            for (const other of objects) {
                if (other === this) continue;
                const toOther = new THREE.Vector3().subVectors(other.position, this.position);
                const dist = toOther.length();
                const minDist = this.baseRadius + other.baseRadius;
                if (dist < minDist && dist > 0.01) {
                    const overlap = minDist - dist;
                    const pushDir = toOther.normalize();
                    const myMass = Math.pow(this.baseRadius, 3);
                    const otherMass = Math.pow(other.baseRadius, 3);
                    this.velocity.sub(pushDir.clone().multiplyScalar(overlap * 0.3 * (otherMass / (myMass + otherMass))));
                    this.rotationVel.x += (Math.random() - 0.5) * overlap * 0.5;
                    this.rotationVel.y += (Math.random() - 0.5) * overlap * 0.5;
                }
            }
            
            const bounds = CONFIG.containerSize - this.baseRadius * 0.8;
            ['x', 'y', 'z'].forEach(axis => {
                if (this.position[axis] > bounds) { this.position[axis] = bounds; this.velocity[axis] *= -0.3; }
                if (this.position[axis] < -bounds) { this.position[axis] = -bounds; this.velocity[axis] *= -0.3; }
            });
            
            this.velocity.multiplyScalar(CONFIG.damping);
            this.position.add(this.velocity);
            this.rotation.add(this.rotationVel);
            this.rotationVel.multiplyScalar(0.98);
            this.squish.lerp(this.targetSquish, 0.06);
            this.targetSquish.lerp(new THREE.Vector3(1,1,1), 0.03);
            
            this.mesh.position.copy(this.position);
            this.mesh.scale.copy(this.squish);
            this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        }
        
        explodeFrom(point, force) {
            const dir = new THREE.Vector3().subVectors(this.position, point);
            const dist = dir.length();
            if (dist < 5) {
                const strength = force / (dist + 0.3);
                dir.normalize().multiplyScalar(strength);
                this.velocity.add(dir);
                this.rotationVel.x += (Math.random() - 0.5) * strength * 0.5;
                this.rotationVel.y += (Math.random() - 0.5) * strength * 0.5;
                this.jellyFactor = Math.min(1.2, this.jellyFactor + 0.4);
            }
        }
    }

    // ============== IMAGE PANEL CLASS ==============
    class ImagePanel {
        constructor(index, position, rotation, size) {
            this.index = index;
            this.basePosition = position.clone();
            this.position = position.clone();
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.rotation = rotation.clone();
            this.rotationVel = new THREE.Vector3(0, 0, 0);
            this.size = size;
            this.isDeleted = false;
            this.phase = Math.random() * Math.PI * 2;
            this.driftSpeed = 0.1 + Math.random() * 0.3;
            this.glitchIntensity = 0.4 + Math.random() * 0.4;
            this.corruption = 0.3 + Math.random() * 0.4;
            this.imageIndex = Math.floor(Math.random() * IMAGE_COUNT) + 1;
            this.mesh = null;
            this.uniforms = null;
            this.loadImage();
        }
        
        loadImage() {
            const imgNum = this.imageIndex.toString().padStart(3, '0');
            const loader = new THREE.TextureLoader();
            loader.load(
                `assets/room2/imagenet/img${imgNum}.jpg`,
                (texture) => this.createMesh(texture),
                undefined,
                () => this.createFallbackMesh()
            );
        }
        
        createMesh(texture) {
            texture.minFilter = THREE.LinearFilter;
            const geometry = new THREE.PlaneGeometry(this.size, this.size * 0.75, 15, 15);
            
            this.uniforms = {
                map: { value: texture },
                time: { value: Math.random() * 100 },
                glitchIntensity: { value: 0.4 + Math.random() * 0.4 },
                rgbShift: { value: 0.5 + Math.random() * 0.8 },
                scanlines: { value: 0.5 + Math.random() * 0.5 },
                noise: { value: 0.3 + Math.random() * 0.4 },
                blockGlitch: { value: 0.3 + Math.random() * 0.4 },
                corruption: { value: 0.3 + Math.random() * 0.4 },
                warp: { value: 0.4 + Math.random() * 0.5 },
                mouseInfluence: { value: 0.0 },
                pixelate: { value: 0.2 + Math.random() * 0.5 }
            };
            
            // Heavy structural corruption shader - bright but unrecognizable
            const material = new THREE.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: `
                    varying vec2 vUv;
                    uniform float time;
                    uniform float warp;
                    
                    void main() {
                        vUv = uv;
                        vec3 pos = position;
                        // Vertex displacement
                        float wave = sin(pos.y * 4.0 + time * 2.0) * warp * 0.15;
                        pos.x += wave;
                        pos.z += cos(pos.x * 3.0 + time * 1.5) * warp * 0.1;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    uniform sampler2D map;
                    uniform float time;
                    uniform float glitchIntensity;
                    uniform float rgbShift;
                    uniform float scanlines;
                    uniform float noise;
                    uniform float blockGlitch;
                    uniform float corruption;
                    uniform float mouseInfluence;
                    uniform float pixelate;
                    
                    float rand(vec2 co) {
                        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
                    }
                    
                    float rand2(vec2 co, float seed) {
                        return fract(sin(dot(co.xy, vec2(12.9898 + seed, 78.233 + seed))) * 43758.5453);
                    }
                    
                    void main() {
                        vec2 uv = vUv;
                        
                        // Heavy pixelation - make blocky
                        float pixelSize = 0.02 + pixelate * 0.08;
                        vec2 pixelUv = floor(uv / pixelSize) * pixelSize;
                        
                        // Block displacement - shift entire chunks
                        float blockSize = 0.05 + blockGlitch * 0.1;
                        vec2 blockCoord = floor(uv / blockSize);
                        float blockRand = rand(blockCoord + floor(time * 2.0));
                        
                        if (blockRand > 0.7) {
                            // Shift this block
                            float shiftX = (rand(blockCoord + 0.5) - 0.5) * corruption * 0.5;
                            float shiftY = (rand(blockCoord + 1.5) - 0.5) * corruption * 0.3;
                            pixelUv.x += shiftX;
                            pixelUv.y += shiftY;
                        }
                        
                        // Random horizontal slice displacement
                        float sliceY = floor(uv.y * 20.0);
                        float sliceRand = rand(vec2(sliceY, floor(time * 3.0)));
                        if (sliceRand > 0.85) {
                            pixelUv.x += (rand(vec2(time, sliceY)) - 0.5) * glitchIntensity * 0.4;
                        }
                        
                        // Mirror/flip random sections
                        float flipRand = rand(blockCoord * 2.0 + floor(time));
                        if (flipRand > 0.8) {
                            pixelUv.x = 1.0 - pixelUv.x;
                        }
                        if (flipRand < 0.15) {
                            pixelUv.y = 1.0 - pixelUv.y;
                        }
                        
                        // UV scramble - swap parts of image
                        float scrambleRand = rand(floor(uv * 8.0) + floor(time * 0.5));
                        if (scrambleRand > 0.9) {
                            pixelUv = fract(pixelUv + vec2(rand(blockCoord), rand(blockCoord + 3.0)));
                        }
                        
                        // Clamp UVs
                        pixelUv = clamp(pixelUv, 0.0, 1.0);
                        
                        // Heavy RGB channel separation
                        float shift = rgbShift * 0.04 + mouseInfluence * 0.03;
                        float r = texture2D(map, pixelUv + vec2(shift, shift * 0.5)).r;
                        float g = texture2D(map, pixelUv).g;
                        float b = texture2D(map, pixelUv - vec2(shift, -shift * 0.3)).b;
                        
                        // Channel swap on interaction
                        if (mouseInfluence > 0.3) {
                            float temp = r;
                            r = b;
                            b = temp;
                        }
                        
                        vec3 color = vec3(r, g, b);
                        
                        // Subtle scanlines (don't darken much)
                        float scanline = sin(vUv.y * 400.0) * 0.03 * scanlines;
                        color -= scanline;
                        
                        // Light grain noise
                        float grainNoise = (rand(vUv + time) - 0.5) * noise * 0.15;
                        color += grainNoise;
                        
                        // Keep colors bright and saturated
                        color = clamp(color, 0.0, 1.0);
                        
                        // Boost saturation slightly
                        float gray = dot(color, vec3(0.299, 0.587, 0.114));
                        color = mix(vec3(gray), color, 1.2);
                        
                        gl_FragColor = vec4(color, 0.9);
                    }
                `,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            this.mesh.renderOrder = -1;
            scene.add(this.mesh);
        }
        
        createFallbackMesh() {
            const geometry = new THREE.PlaneGeometry(this.size, this.size * 0.75);
            const material = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.3 });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            this.mesh.renderOrder = -1;
            scene.add(this.mesh);
        }
        
        update(time, mousePos, isMouseIn) {
            if (!this.mesh || this.isDeleted) return;
            
            const toBase = new THREE.Vector3().subVectors(this.basePosition, this.position);
            this.velocity.add(toBase.multiplyScalar(0.0005));
            this.velocity.x += Math.sin(time * this.driftSpeed + this.phase) * 0.0003;
            this.velocity.y += Math.cos(time * this.driftSpeed * 0.7 + this.phase) * 0.0002;
            
            if (isMouseIn && mousePos) {
                const toMouse = new THREE.Vector3().subVectors(mousePos, this.position);
                const dist = toMouse.length();
                if (dist < 8) {
                    this.velocity.add(toMouse.normalize().multiplyScalar(-0.015 / (dist + 0.5)));
                }
            }
            
            this.velocity.multiplyScalar(0.97);
            this.position.add(this.velocity);
            this.mesh.position.copy(this.position);
            
            if (this.uniforms) this.uniforms.time.value = time;
        }
        
        explode(point, force) {
            if (this.isDeleted) return;
            const dist = this.position.distanceTo(point);
            if (dist < 10) {
                const dir = new THREE.Vector3().subVectors(this.position, point).normalize();
                this.velocity.add(dir.multiplyScalar(force / (dist + 0.5) * 0.2));
            }
        }
    }

    // ============== CREATE FUNCTIONS ==============
    function createOrbs() {
        for (let i = 0; i < CONFIG.orbCount; i++) {
            orbs.push(new SoftOrb(i));
        }
    }
    
    function createCubes() {
        for (let i = 0; i < CUBE_COUNT; i++) {
            cubes.push(new SoftCube(i, CONFIG.orbCount));
        }
    }
    
    function createImagePanels() {
        const bgCubeSize = CONFIG.containerSize * 6;
        const panelsPerFace = 10;  // Maximum panels
        const faces = [
            { pos: [0, 0, -1], rot: [0, 0, 0] },
            { pos: [0, 0, 1], rot: [0, Math.PI, 0] },
            { pos: [-1, 0, 0], rot: [0, Math.PI/2, 0] },
            { pos: [1, 0, 0], rot: [0, -Math.PI/2, 0] },
            { pos: [0, 1, 0], rot: [-Math.PI/2, 0, 0] },
            { pos: [0, -1, 0], rot: [Math.PI/2, 0, 0] }
        ];
        
        faces.forEach(face => {
            for (let i = 0; i < panelsPerFace; i++) {
                const size = 1.5 + Math.random() * 2.5;
                const pos = new THREE.Vector3(
                    face.pos[0] * bgCubeSize * 0.5 + (face.pos[0] === 0 ? (Math.random() - 0.5) * bgCubeSize * 0.8 : 0),
                    face.pos[1] * bgCubeSize * 0.5 + (face.pos[1] === 0 ? (Math.random() - 0.5) * bgCubeSize * 0.8 : 0),
                    face.pos[2] * bgCubeSize * 0.5 + (face.pos[2] === 0 ? (Math.random() - 0.5) * bgCubeSize * 0.8 : 0)
                );
                const rot = new THREE.Euler(face.rot[0], face.rot[1], face.rot[2] + (Math.random() - 0.5) * 0.2);
                imagePanels.push(new ImagePanel(imagePanels.length, pos, rot, size));
            }
        });
    }

    // ============== HAND TRACKING ==============
    function initHandTracking() {
        hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.4
        });
        
        hands.onResults(onHandResults);
        
        let frameCount = 0;
        webcamCamera = new Camera(videoElement, {
            onFrame: async () => {
                frameCount++;
                if (frameCount % 3 === 0) {
                    await hands.send({ image: videoElement });
                }
            },
            width: 320,
            height: 240
        });
        
        webcamCamera.start();
        startBtn.style.display = 'none';
        handStatus.textContent = 'Looking for hands...';
    }
    
    function onHandResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const palmX = (landmarks[WRIST].x + landmarks[9].x) / 2;
            const palmY = (landmarks[WRIST].y + landmarks[9].y) / 2;
            const palmZ = (landmarks[WRIST].z + landmarks[9].z) / 2;
            
            const screenX = (1 - palmX) * 2 - 1;
            const screenY = -(palmY * 2 - 1);
            
            const targetPos = new THREE.Vector3();
            raycaster.setFromCamera({ x: screenX, y: screenY }, camera);
            raycaster.ray.intersectPlane(handPlane, targetPos);
            targetPos.z += palmZ * 5;
            
            smoothedHandPos.lerp(targetPos, 0.3);
            handPos3D.copy(smoothedHandPos);
            
            isHandInScene = true;
            lastInteractionTime = Date.now();
            isIdle = false;
            
            // Pinch detection
            const thumbTip = landmarks[THUMB_TIP];
            const indexTip = landmarks[INDEX_TIP];
            const pinchDist = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) +
                Math.pow(thumbTip.y - indexTip.y, 2) +
                Math.pow(thumbTip.z - indexTip.z, 2)
            );
            
            wasPinching = isPinching;
            isPinching = pinchDist < 0.08;
            
            if (isPinching && !wasPinching) {
                triggerExplosion();
            }
            
            handStatus.textContent = isPinching ? 'PINCH!' : 'Hand detected';
            handStatus.style.color = isPinching ? '#f0f' : '#0f0';
        } else {
            isHandInScene = false;
            handStatus.textContent = 'Looking for hands...';
            handStatus.style.color = '#666';
        }
    }
    
    function triggerExplosion() {
        allObjects.forEach(obj => {
            obj.explodeFrom(handPos3D, CONFIG.clickForce);
            const dist = obj.position.distanceTo(handPos3D);
            if (dist < 3) {
                obj.bonds = obj.bonds.filter(() => Math.random() > CONFIG.bondBreakRate);
            }
        });
        imagePanels.forEach(panel => panel.explode(handPos3D, CONFIG.clickForce));
    }

    // ============== MOUSE FALLBACK ==============
    function setupMouseFallback() {
        const mouse = new THREE.Vector2();
        
        container.addEventListener('mousemove', (e) => {
            if (hands) return;
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            raycaster.ray.intersectPlane(handPlane, handPos3D);
            isHandInScene = true;
            lastInteractionTime = Date.now();
            isIdle = false;
        });
        
        container.addEventListener('mouseleave', () => {
            if (!hands) isHandInScene = false;
        });
        
        container.addEventListener('click', (e) => {
            if (hands) return;
            triggerExplosion();
        });
    }

    // ============== BOND SYSTEM ==============
    function tryFormBonds() {
        if (!isIdle) return;
        allObjects.forEach(obj => {
            if (obj.bonds.length >= CONFIG.maxBondsPerOrb) return;
            if (Math.random() > CONFIG.bondFormRate) return;
            const candidates = allObjects.filter(other => {
                if (other === obj) return false;
                if (obj.bonds.includes(other.index)) return false;
                if (other.bonds.length >= CONFIG.maxBondsPerOrb) return false;
                return obj.position.distanceTo(other.position) < CONFIG.bondDistance;
            });
            if (candidates.length > 0) {
                const target = candidates[Math.floor(Math.random() * candidates.length)];
                obj.bonds.push(target.index);
                target.bonds.push(obj.index);
            }
        });
    }
    
    function breakBondsNearMouse() {
        if (!isHandInScene) return;
        allObjects.forEach(obj => {
            const dist = obj.position.distanceTo(handPos3D);
            if (dist < 1.5 && obj.bonds.length > 0 && Math.random() < 0.05) {
                const bondToBreak = obj.bonds[Math.floor(Math.random() * obj.bonds.length)];
                obj.bonds = obj.bonds.filter(b => b !== bondToBreak);
                const other = allObjects[bondToBreak];
                if (other) other.bonds = other.bonds.filter(b => b !== obj.index);
            }
        });
    }

    // ============== ANIMATION ==============
    function animate() {
        if (!isActive) return;
        animationId = requestAnimationFrame(animate);
        
        const time = Date.now() * 0.001;
        const timeSinceInteraction = (Date.now() - lastInteractionTime) / 1000;
        isIdle = timeSinceInteraction > CONFIG.idleThreshold;
        
        // Camera rotation
        const camAngle = time * CONFIG.rotationSpeed * 100;
        camera.position.x = Math.sin(camAngle) * 9;
        camera.position.z = Math.cos(camAngle) * 9;
        camera.position.y = Math.sin(camAngle * 0.5) * 1.5;
        camera.lookAt(0, 0, 0);
        
        tryFormBonds();
        breakBondsNearMouse();
        
        allObjects.forEach(obj => {
            obj.update(allObjects, handPos3D, isHandInScene, time);
            obj.jellyFactor = Math.max(0.5, obj.jellyFactor - 0.002);
        });
        
        imagePanels.forEach(panel => panel.update(time, handPos3D, isHandInScene));
        
        renderer.render(scene, camera);
    }
    
    function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ============== PUBLIC INTERFACE ==============
    const room2 = {
        activate() {
            isActive = true;
            if (!scene) init();
            animate();
            window.addEventListener('resize', onResize);
            rooms.setStatus('Room 2: The Cache');
        },
        
        deactivate() {
            isActive = false;
            if (webcamCamera) webcamCamera.stop();
            if (animationId) cancelAnimationFrame(animationId);
            window.removeEventListener('resize', onResize);
        }
    };
    
    if (typeof rooms !== 'undefined') {
        rooms.register(2, room2);
    }
})();
