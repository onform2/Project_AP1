// Room 4: The Sediment
// Head profile with data particles falling as sediment

(function() {
    const container = document.getElementById('room4');
    let isActive = false;
    let animationId = null;
    
    let canvas, ctx, strataContainer;
    let width, height, centerX, centerY, scale;
    
    // Hand tracking
    let videoElement, hands, webcamCamera;
    let handStatus;
    let isPinching = false;
    let wasPinching = false;

    // Strata sprite filenames (bottom to top) - removed 8028, added 8042-8055
    const STRATA_SPRITES = [
        'IMG_8023.png', 'IMG_8024.png', 'IMG_8025.png', 'IMG_8026.png', 'IMG_8027.png',
        'IMG_8029.png', 'IMG_8030.png', 'IMG_8031.png', 'IMG_8032.png',
        'IMG_8042.png', 'IMG_8043.png', 'IMG_8044.png', 'IMG_8045.png', 'IMG_8046.png',
        'IMG_8047.png', 'IMG_8048.png', 'IMG_8049.png', 'IMG_8050.png', 'IMG_8051.png',
        'IMG_8052.png', 'IMG_8053.png', 'IMG_8054.png', 'IMG_8055.png'
    ];
    
    // Each strata layer covers from the bottom up to this normalized Y value
    // As layers are added, the "floor" rises
    const STRATA_Y_LEVELS = [];
    // Calculate Y levels - each layer covers roughly equal portion from bottom (0.915) to top (0.0)
    (function() {
        const bottomY = 0.915;
        const topY = 0.0;
        const step = (bottomY - topY) / STRATA_SPRITES.length;
        for (let i = 0; i < STRATA_SPRITES.length; i++) {
            STRATA_Y_LEVELS.push(bottomY - (i + 1) * step);
        }
    })();

    // Original head outline (normalized 0-1)
    const HEAD_OUTLINE = [
        {'x': 0.4531, 'y': 0.0000}, {'x': 0.3555, 'y': 0.0188}, {'x': 0.2939, 'y': 0.0375},
        {'x': 0.2520, 'y': 0.0563}, {'x': 0.2217, 'y': 0.0751}, {'x': 0.1973, 'y': 0.0938},
        {'x': 0.1777, 'y': 0.1126}, {'x': 0.1621, 'y': 0.1314}, {'x': 0.1514, 'y': 0.1502},
        {'x': 0.1426, 'y': 0.1689}, {'x': 0.1357, 'y': 0.1877}, {'x': 0.1309, 'y': 0.2065},
        {'x': 0.1270, 'y': 0.2252}, {'x': 0.1230, 'y': 0.2440}, {'x': 0.1191, 'y': 0.2628},
        {'x': 0.1182, 'y': 0.2815}, {'x': 0.1211, 'y': 0.3003}, {'x': 0.1260, 'y': 0.3191},
        {'x': 0.1191, 'y': 0.3378}, {'x': 0.1035, 'y': 0.3566}, {'x': 0.0869, 'y': 0.3754},
        {'x': 0.0684, 'y': 0.3941}, {'x': 0.0508, 'y': 0.4129}, {'x': 0.0469, 'y': 0.4317},
        {'x': 0.0654, 'y': 0.4505}, {'x': 0.1064, 'y': 0.4692}, {'x': 0.0996, 'y': 0.4880},
        {'x': 0.0947, 'y': 0.5068}, {'x': 0.1104, 'y': 0.5255}, {'x': 0.1035, 'y': 0.5443},
        {'x': 0.1211, 'y': 0.5631}, {'x': 0.1279, 'y': 0.5818}, {'x': 0.1240, 'y': 0.6006},
        {'x': 0.1221, 'y': 0.6194}, {'x': 0.1279, 'y': 0.6381}, {'x': 0.1543, 'y': 0.6569},
        {'x': 0.3027, 'y': 0.6757}, {'x': 0.3232, 'y': 0.6944}, {'x': 0.3311, 'y': 0.7132},
        {'x': 0.3330, 'y': 0.7320}, {'x': 0.3291, 'y': 0.7508}, {'x': 0.3008, 'y': 0.7695},
        {'x': 0.2227, 'y': 0.7883}, {'x': 0.1465, 'y': 0.8071}, {'x': 0.0918, 'y': 0.8258},
        {'x': 0.0791, 'y': 0.8446}, {'x': 0.0674, 'y': 0.8634}, {'x': 0.0410, 'y': 0.8821},
        {'x': 0.0176, 'y': 0.9009}, {'x': 0.0000, 'y': 0.9150},
        {'x': 0.9990, 'y': 0.9150},
        {'x': 0.9932, 'y': 0.9122}, {'x': 0.9727, 'y': 0.8934},
        {'x': 0.9414, 'y': 0.8746}, {'x': 0.9326, 'y': 0.8559}, {'x': 0.9229, 'y': 0.8371},
        {'x': 0.9111, 'y': 0.8183}, {'x': 0.8984, 'y': 0.7995}, {'x': 0.8838, 'y': 0.7808},
        {'x': 0.8682, 'y': 0.7620}, {'x': 0.8535, 'y': 0.7432}, {'x': 0.8408, 'y': 0.7245},
        {'x': 0.8311, 'y': 0.7057}, {'x': 0.8232, 'y': 0.6869}, {'x': 0.8174, 'y': 0.6682},
        {'x': 0.8135, 'y': 0.6494}, {'x': 0.8115, 'y': 0.6306}, {'x': 0.8115, 'y': 0.6119},
        {'x': 0.8125, 'y': 0.5931}, {'x': 0.8135, 'y': 0.5743}, {'x': 0.8174, 'y': 0.5556},
        {'x': 0.8242, 'y': 0.5368}, {'x': 0.8311, 'y': 0.5180}, {'x': 0.8418, 'y': 0.4992},
        {'x': 0.8555, 'y': 0.4805}, {'x': 0.8672, 'y': 0.4617}, {'x': 0.8770, 'y': 0.4429},
        {'x': 0.8887, 'y': 0.4242}, {'x': 0.8975, 'y': 0.4054}, {'x': 0.9043, 'y': 0.3866},
        {'x': 0.9102, 'y': 0.3679}, {'x': 0.9141, 'y': 0.3491}, {'x': 0.9160, 'y': 0.3303},
        {'x': 0.9170, 'y': 0.3116}, {'x': 0.9170, 'y': 0.2928}, {'x': 0.9160, 'y': 0.2740},
        {'x': 0.9131, 'y': 0.2553}, {'x': 0.9092, 'y': 0.2365}, {'x': 0.9043, 'y': 0.2177},
        {'x': 0.8975, 'y': 0.1989}, {'x': 0.8896, 'y': 0.1802}, {'x': 0.8809, 'y': 0.1614},
        {'x': 0.8701, 'y': 0.1426}, {'x': 0.8574, 'y': 0.1239}, {'x': 0.8418, 'y': 0.1051},
        {'x': 0.8203, 'y': 0.0863}, {'x': 0.7959, 'y': 0.0676}, {'x': 0.7627, 'y': 0.0488},
        {'x': 0.7178, 'y': 0.0300}, {'x': 0.6465, 'y': 0.0113}
    ];

    // State
    const state = {
        nodes: [],
        edges: [],
        adjacency: [],
        currentNode: 0,
        traveler: { x: 0, y: 0 },
        isMoving: true,
        isPouring: false,
        currentLayer: 0,
        fallingPixels: [],
        glowingEdges: [],
        headPath: [],
        strataFloorY: 0.915  // Current Y level where strata has filled to
    };

    let lastMoveTime = 0;
    const MOVE_INTERVAL = 400;

    function init() {
        // Create strata container FIRST (behind canvas)
        strataContainer = document.createElement('div');
        strataContainer.id = 'room4-strata';
        strataContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
        container.appendChild(strataContainer);
        
        // Create canvas ON TOP of strata
        canvas = document.createElement('canvas');
        canvas.id = 'room4-canvas';
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;';
        container.appendChild(canvas);
        ctx = canvas.getContext('2d');
        
        // Create video element for hand tracking
        videoElement = document.createElement('video');
        videoElement.id = 'room4-video';
        videoElement.autoplay = true;
        videoElement.playsinline = true;
        videoElement.style.cssText = 'position:fixed;bottom:20px;right:20px;width:160px;height:120px;transform:scaleX(-1);border:2px solid #333;border-radius:8px;opacity:0.6;z-index:100;';
        container.appendChild(videoElement);
        
        // Hand status indicator
        handStatus = document.createElement('div');
        handStatus.id = 'room4-handStatus';
        handStatus.textContent = 'Initializing hand tracking...';
        handStatus.style.cssText = 'position:fixed;top:70px;left:20px;color:#666;font-family:monospace;font-size:12px;z-index:100;';
        container.appendChild(handStatus);
        
        // Add strata styles
        const style = document.createElement('style');
        style.textContent = `
            #room4-strata img {
                position: absolute;
                opacity: 0;
                transition: opacity 1.5s ease-in-out;
                pointer-events: none;
            }
            #room4-strata img.visible {
                opacity: 1;
            }
        `;
        container.appendChild(style);
        
        initCanvas();
        initProfile();
        initStrataSprites();
        initHandTracking();
        
        // Keep click as fallback
        canvas.addEventListener('click', onClick);
        window.addEventListener('resize', onResize);
    }
    
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
                if (!isActive) return;
                frameCount++;
                if (frameCount % 3 === 0) {
                    await hands.send({ image: videoElement });
                }
            },
            width: 320,
            height: 240
        });
        
        webcamCamera.start();
        handStatus.textContent = 'Looking for hands...';
    }
    
    function onHandResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Pinch detection (thumb tip to index tip)
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const pinchDist = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) +
                Math.pow(thumbTip.y - indexTip.y, 2) +
                Math.pow(thumbTip.z - indexTip.z, 2)
            );
            
            wasPinching = isPinching;
            isPinching = pinchDist < 0.08;
            
            // Trigger pour on pinch start
            if (isPinching && !wasPinching) {
                if (!state.isPouring && state.currentLayer < STRATA_SPRITES.length) {
                    startPouring();
                }
            }
            
            handStatus.textContent = isPinching ? '✊ PINCH - Pouring!' : '✋ Hand detected';
            handStatus.style.color = isPinching ? '#c9b89a' : '#0f0';
        } else {
            handStatus.textContent = 'Looking for hands... (or click)';
            handStatus.style.color = '#666';
        }
    }

    function initCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        centerX = width / 2;
        centerY = height / 2;
        scale = Math.min(width, height) * 0.7;
    }

    function isInsideProfile(x, y) {
        let inside = false;
        for (let i = 0, j = HEAD_OUTLINE.length - 1; i < HEAD_OUTLINE.length; j = i++) {
            const xi = HEAD_OUTLINE[i].x, yi = HEAD_OUTLINE[i].y;
            const xj = HEAD_OUTLINE[j].x, yj = HEAD_OUTLINE[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function getHeadBoundsAtY(ny) {
        let leftX = null, rightX = null;
        for (let testX = 0; testX <= 1.0; testX += 0.01) {
            if (isInsideProfile(testX, ny)) {
                if (leftX === null) leftX = testX;
                rightX = testX;
            }
        }
        return { leftX, rightX };
    }

    function generateNodes() {
        const nodes = [];
        const gridSpacing = 0.14;
        let nodeId = 0;
        
        for (let y = 0.05; y <= 0.95; y += gridSpacing) {
            for (let x = 0.05; x <= 0.95; x += gridSpacing) {
                if (isInsideProfile(x, y)) {
                    nodes.push({
                        id: nodeId++,
                        nx: x, ny: y,
                        x: centerX + (x - 0.5) * scale,
                        y: centerY + (y - 0.5) * scale * 1.3,
                        active: true  // Track if node is above strata
                    });
                }
            }
        }
        
        for (let i = 0; i < HEAD_OUTLINE.length; i += 6) {
            const p = HEAD_OUTLINE[i];
            nodes.push({
                id: nodeId++,
                nx: p.x, ny: p.y,
                x: centerX + (p.x - 0.5) * scale,
                y: centerY + (p.y - 0.5) * scale * 1.3,
                active: true
            });
        }
        
        return nodes;
    }

    function generateEdges(nodes) {
        const edges = [];
        const maxDist = 0.20;
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].nx - nodes[j].nx;
                const dy = nodes[i].ny - nodes[j].ny;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    edges.push({ from: i, to: j });
                }
            }
        }
        return edges;
    }

    function buildAdjacency(nodes, edges) {
        const adj = nodes.map(() => []);
        edges.forEach(({ from, to }) => {
            adj[from].push(to);
            adj[to].push(from);
        });
        return adj;
    }

    function initStrataSprites() {
        strataContainer.innerHTML = '';
        
        const clipPoints = HEAD_OUTLINE.map(p => {
            const screenX = centerX + (p.x - 0.5) * scale;
            const screenY = centerY + (p.y - 0.5) * scale * 1.3;
            return `${screenX}px ${screenY}px`;
        }).join(', ');
        
        strataContainer.style.clipPath = `polygon(${clipPoints})`;
        
        // Same scaling for ALL sprites - stretched width (5% wider), match head height
        const spriteW = scale * 1.05;  // 5% wider than head
        const spriteH = scale * 1.3;   // Match head height ratio
        
        STRATA_SPRITES.forEach((filename, index) => {
            const img = document.createElement('img');
            img.src = `assets/room4/strata/${filename}`;
            img.style.width = spriteW + 'px';
            img.style.height = spriteH + 'px';
            img.style.left = (centerX - spriteW / 2) + 'px';
            img.style.top = (centerY - spriteH / 2) + 'px';
            img.style.objectFit = 'cover';  // Ensure image fills the space
            img.style.objectPosition = 'center';
            img.dataset.layer = index;
            strataContainer.appendChild(img);
        });
    }

    function revealNextLayer() {
        if (state.currentLayer >= STRATA_SPRITES.length) return;
        
        const img = strataContainer.querySelector(`img[data-layer="${state.currentLayer}"]`);
        if (img) img.classList.add('visible');
        
        // Update the strata floor level
        state.strataFloorY = STRATA_Y_LEVELS[state.currentLayer];
        
        // Deactivate nodes below the new floor
        deactivateNodesBelowStrata();
        
        state.currentLayer++;
        
        // If current traveler node is now inactive, move to an active node
        if (!state.nodes[state.currentNode].active) {
            moveToActiveNode();
        }
    }
    
    function deactivateNodesBelowStrata() {
        state.nodes.forEach(node => {
            // If node's Y is below (greater than) the strata floor, deactivate it
            if (node.ny > state.strataFloorY) {
                node.active = false;
            }
        });
        
        // Rebuild adjacency to only include active nodes
        rebuildActiveAdjacency();
    }
    
    function rebuildActiveAdjacency() {
        // Only connect active nodes to other active nodes
        state.adjacency = state.nodes.map(() => []);
        state.edges.forEach(({ from, to }) => {
            if (state.nodes[from].active && state.nodes[to].active) {
                state.adjacency[from].push(to);
                state.adjacency[to].push(from);
            }
        });
    }
    
    function moveToActiveNode() {
        // Find the nearest active node
        const activeNodes = state.nodes
            .map((n, i) => ({ ...n, idx: i }))
            .filter(n => n.active);
        
        if (activeNodes.length === 0) {
            state.isMoving = false;
            return;
        }
        
        // Find topmost active node
        const topNode = activeNodes.sort((a, b) => a.ny - b.ny)[0];
        state.currentNode = topNode.idx;
        state.traveler.x = topNode.x;
        state.traveler.y = topNode.y;
    }

    function initProfile() {
        state.headPath = HEAD_OUTLINE.map(p => ({
            x: centerX + (p.x - 0.5) * scale,
            y: centerY + (p.y - 0.5) * scale * 1.3
        }));
        
        state.nodes = generateNodes();
        state.edges = generateEdges(state.nodes);
        state.adjacency = buildAdjacency(state.nodes, state.edges);
        
        const topNodes = state.nodes
            .map((n, i) => ({ ...n, idx: i }))
            .filter(n => n.ny < 0.2)
            .sort((a, b) => a.ny - b.ny);
        
        if (topNodes.length > 0) {
            state.currentNode = topNodes[0].idx;
            state.traveler.x = topNodes[0].x;
            state.traveler.y = topNodes[0].y;
        }
    }

    function updateTraveler(timestamp) {
        if (!state.isMoving || state.isPouring) return;
        
        // Check if current node is still active
        if (!state.nodes[state.currentNode].active) {
            moveToActiveNode();
            return;
        }
        
        if (timestamp - lastMoveTime > MOVE_INTERVAL) {
            lastMoveTime = timestamp;
            
            // Only consider active neighbors
            const neighbors = state.adjacency[state.currentNode].filter(
                idx => state.nodes[idx].active
            );
            
            if (neighbors.length > 0) {
                const nextIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                state.glowingEdges.push({
                    from: state.currentNode,
                    to: nextIdx,
                    alpha: 1
                });
                
                state.currentNode = nextIdx;
                state.traveler.x = state.nodes[nextIdx].x;
                state.traveler.y = state.nodes[nextIdx].y;
            }
        }
        
        state.glowingEdges = state.glowingEdges
            .map(e => ({ ...e, alpha: e.alpha - 0.02 }))
            .filter(e => e.alpha > 0);
    }

    function getRandomColor() {
        const colors = [
            '#8B4513', '#A0522D', '#6B4423', '#8B7355', '#CD853F',
            '#D2691E', '#BC8F8F', '#C4A484', '#967969', '#7B6D52',
            '#708090', '#778899', '#696969', '#B0C4DE', '#D8BFD8',
            '#DEB887', '#E6CCB3', '#D4A574', '#C9B8A8', '#FAEBD7'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function spawnFallingPixels() {
        const node = state.nodes[state.currentNode];
        const color = getRandomColor();
        
        for (let i = 0; i < 1000; i++) {
            state.fallingPixels.push({
                x: node.x + (Math.random() - 0.5) * 20,
                y: node.y,
                vx: (Math.random() - 0.5) * 2,
                vy: 1 + Math.random() * 2,
                size: 2 + Math.random() * 3,
                color: color,
                alpha: 1,
                delay: i * 5
            });
        }
    }

    function updateFallingPixels() {
        // Particles fade out at the current strata floor level
        const fadeStartY = state.strataFloorY - 0.15;
        const fadeEndY = state.strataFloorY;
        
        state.fallingPixels = state.fallingPixels
            .map(p => {
                if (p.delay > 0) return { ...p, delay: p.delay - 16 };
                
                let newX = p.x + p.vx;
                let newY = p.y + p.vy;
                let newVx = p.vx;
                let newVy = p.vy;
                
                // Only collide with ACTIVE nodes
                for (const node of state.nodes) {
                    if (!node.active) continue;
                    
                    const dx = newX - node.x;
                    const dy = newY - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const nodeRadius = 8;
                    
                    if (dist < nodeRadius + p.size / 2) {
                        const angle = Math.atan2(dy, dx);
                        const speed = Math.sqrt(newVx * newVx + newVy * newVy);
                        
                        newVx = Math.cos(angle) * speed * 0.7 + (Math.random() - 0.5) * 2;
                        newVy = Math.abs(Math.sin(angle) * speed * 0.5) + 0.5;
                        
                        newX = node.x + Math.cos(angle) * (nodeRadius + p.size / 2 + 1);
                        newY = node.y + Math.sin(angle) * (nodeRadius + p.size / 2 + 1);
                        break;
                    }
                }
                
                const normX = (newX - centerX) / scale + 0.5;
                const normY = (newY - centerY) / (scale * 1.3) + 0.5;
                
                const bounds = getHeadBoundsAtY(normY);
                if (bounds.leftX !== null && bounds.rightX !== null) {
                    if (normX < bounds.leftX) {
                        newX = centerX + (bounds.leftX - 0.5 + 0.02) * scale;
                        newVx = Math.abs(newVx) * 0.5;
                    } else if (normX > bounds.rightX) {
                        newX = centerX + (bounds.rightX - 0.5 - 0.02) * scale;
                        newVx = -Math.abs(newVx) * 0.5;
                    }
                }
                
                let alpha = 1;
                if (normY > fadeStartY) {
                    alpha = 1 - (normY - fadeStartY) / (fadeEndY - fadeStartY);
                    alpha = Math.max(0, alpha);
                }
                
                return { ...p, x: newX, y: newY, vx: newVx, vy: newVy + 0.15, alpha };
            })
            .filter(p => p.alpha > 0);
    }

    function startPouring() {
        if (state.isPouring || state.currentLayer >= STRATA_SPRITES.length) return;
        
        state.isPouring = true;
        state.isMoving = false;
        spawnFallingPixels();
        
        setTimeout(() => revealNextLayer(), 800);
        setTimeout(() => {
            state.isPouring = false;
            state.isMoving = true;
        }, 1500);
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        
        // Draw ALL edges (visible through strata as mesh)
        ctx.strokeStyle = 'rgba(139, 125, 107, 0.15)';
        ctx.lineWidth = 1;
        state.edges.forEach(({ from, to }) => {
            const n1 = state.nodes[from];
            const n2 = state.nodes[to];
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        });
        
        // Glowing edges (only for active traversal paths)
        state.glowingEdges.forEach(({ from, to, alpha }) => {
            const n1 = state.nodes[from];
            const n2 = state.nodes[to];
            ctx.strokeStyle = `rgba(201, 184, 154, ${alpha * 0.8})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        });
        
        // Draw ALL nodes (visible through strata)
        state.nodes.forEach((node, idx) => {
            const isCurrent = idx === state.currentNode && node.active;
            ctx.fillStyle = isCurrent ? 'rgba(201, 184, 154, 0.9)' : 'rgba(139, 125, 107, 0.3)';
            ctx.beginPath();
            ctx.arc(node.x, node.y, isCurrent ? 5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Head outline
        ctx.strokeStyle = 'rgba(201, 184, 154, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        state.headPath.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.stroke();
        
        // Traveler (only if on active node)
        if (!state.isPouring && state.nodes[state.currentNode].active) {
            ctx.fillStyle = '#c9b89a';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#c9b89a';
            ctx.beginPath();
            ctx.arc(state.traveler.x, state.traveler.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Falling pixels
        state.fallingPixels.forEach(p => {
            if (p.delay > 0) return;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
        ctx.globalAlpha = 1;
    }

    function animate(timestamp) {
        if (!isActive) return;
        
        updateTraveler(timestamp);
        updateFallingPixels();
        draw();
        animationId = requestAnimationFrame(animate);
    }

    function onClick() {
        if (!state.isPouring && state.currentLayer < STRATA_SPRITES.length) {
            startPouring();
        }
    }

    function onResize() {
        if (!isActive) return;
        initCanvas();
        initProfile();
        initStrataSprites();
        
        // Reapply strata state
        for (let i = 0; i < state.currentLayer; i++) {
            const img = strataContainer.querySelector(`img[data-layer="${i}"]`);
            if (img) img.classList.add('visible');
        }
        deactivateNodesBelowStrata();
    }

    // Public interface
    const room4 = {
        activate() {
            isActive = true;
            if (!canvas) init();
            animationId = requestAnimationFrame(animate);
            if (typeof rooms !== 'undefined') {
                rooms.setStatus('Room 4: The Sediment - Pinch or click to pour');
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
        rooms.register(4, room4);
    }
})();
