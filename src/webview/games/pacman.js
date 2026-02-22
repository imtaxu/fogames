window.GamePacman = (function() {
    let canvas, ctx;
    let isInitialized = false;
    let isPaused = true;
    let lastTime = 0;
    let animationId = null;

    const BLOCK_SIZE = 16;
    const ROWS = 15;
    const COLS = 15;
    
    // 0: empty, 1: wall, 2: dot, 3: power, 4: door
    const levelMap = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,2,2,2,2,2,1,2,2,2,2,2,3,1],
        [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
        [1,2,2,2,2,1,2,2,2,1,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,2,1,0,0,0,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,4,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,0,1,2,1,1,1,1],
        [1,2,2,2,2,2,0,1,0,2,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],
        [1,2,2,1,2,2,2,1,2,2,2,1,2,2,1],
        [1,1,2,1,2,1,2,1,2,1,2,1,2,1,1],
        [1,3,2,2,2,1,2,2,2,1,2,2,2,3,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    let grid = [];
    let score = 0;
    let pacman = { x: 7, y: 11, nx: 7, ny: 11, dir: 0, nextDir: 0, t: 0, mouth: 0, mDir: 1 };
    let ghosts = [];
    let gameOver = false;
    let powerModeTimer = 0;

    // Directions: 0:right, 1:down, 2:left, 3:up
    const dirs = [[1,0], [0,1], [-1,0], [0,-1]];

    function reset() {
        grid = levelMap.map(row => [...row]);
        score = 0;
        pacman = { x: 7, y: 11, nx: 7, ny: 11, dir: 0, nextDir: 0, t: 0, mouth: 0, mDir: 1 };
        
        ghosts = [
            { id: 0, x: 7, y: 5, nx: 7, ny: 5, dir: 0, t: 0, color: '#ff0000' },
            { id: 1, x: 6, y: 7, nx: 6, ny: 7, dir: 3, t: 0.5, color: '#ffb8ff' },
            { id: 2, x: 7, y: 7, nx: 7, ny: 7, dir: 3, t: 0.2, color: '#00ffff' },
            { id: 3, x: 8, y: 7, nx: 8, ny: 7, dir: 3, t: 0.8, color: '#ffb852' }
        ];
        gameOver = false;
        powerModeTimer = 0;
        document.getElementById('score-pacman').innerText = score;
        lastTime = performance.now();
    }

    function canMove(gx, gy, dir) {
        const nx = gx + dirs[dir][0];
        const ny = gy + dirs[dir][1];
        if (nx < 0 || nx >= COLS) return true; // tunnel
        if (ny < 0 || ny >= ROWS) return false;
        return grid[ny][nx] !== 1 && grid[ny][nx] !== 4;
    }

    function canGhostMove(gx, gy, dir) {
        const nx = gx + dirs[dir][0];
        const ny = gy + dirs[dir][1];
        if (nx < 0 || nx >= COLS) return true;
        if (ny < 0 || ny >= ROWS) return false;
        return grid[ny][nx] !== 1;
    }

    function updatePacman(dt) {
        pacman.t += dt * 0.005; // speed
        
        // Mouth animation
        pacman.mouth += pacman.mDir * dt * 0.5;
        if (pacman.mouth >= 45) { pacman.mouth = 45; pacman.mDir = -1; }
        if (pacman.mouth <= 0) { pacman.mouth = 0; pacman.mDir = 1; }

        if (pacman.t >= 1) {
            pacman.x = pacman.nx;
            pacman.y = pacman.ny;
            pacman.t -= 1;
            
            // Tunnel
            if (pacman.x < 0) pacman.x = COLS - 1;
            if (pacman.x >= COLS) pacman.x = 0;
            pacman.nx = pacman.x;

            // Eat
            if (grid[pacman.y] && grid[pacman.y][pacman.x] === 2) {
                grid[pacman.y][pacman.x] = 0;
                score += 10;
            } else if (grid[pacman.y] && grid[pacman.y][pacman.x] === 3) {
                grid[pacman.y][pacman.x] = 0;
                score += 50;
                powerModeTimer = 8000;
            }
            document.getElementById('score-pacman').innerText = score;

            // Check next turn
            if (canMove(pacman.x, pacman.y, pacman.nextDir)) {
                pacman.dir = pacman.nextDir;
            }
            // Move
            if (canMove(pacman.x, pacman.y, pacman.dir)) {
                pacman.nx = pacman.x + dirs[pacman.dir][0];
                pacman.ny = pacman.y + dirs[pacman.dir][1];
            } else {
                pacman.t = 0;
            }
        }
    }

    function updateGhosts(dt) {
        for (let g of ghosts) {
            g.t += dt * 0.004;
            if (g.t >= 1) {
                g.x = g.nx;
                g.y = g.ny;
                g.t -= 1;
                
                if (g.x < 0) g.x = COLS - 1;
                if (g.x >= COLS) g.x = 0;
                g.nx = g.x;

                // Simple AI: continue or pick random valid turn
                let possible = [];
                for(let i=0; i<4; i++) {
                    // Don't perfectly reverse unless stuck
                    if (Math.abs(g.dir - i) !== 2 && canGhostMove(g.x, g.y, i)) {
                        possible.push(i);
                    }
                }
                if (possible.length === 0) possible.push((g.dir + 2) % 4); // Reverse
                
                let chosen = possible[Math.floor(Math.random() * possible.length)];
                // Favor continuing straight
                if (possible.includes(g.dir) && Math.random() < 0.6) {
                    chosen = g.dir;
                }
                g.dir = chosen;

                g.nx = g.x + dirs[g.dir][0];
                g.ny = g.y + dirs[g.dir][1];
            }

            // Collision Check (AABB around center)
            const pRealX = (pacman.x + (pacman.nx - pacman.x)*pacman.t);
            const pRealY = (pacman.y + (pacman.ny - pacman.y)*pacman.t);
            const gRealX = (g.x + (g.nx - g.x)*g.t);
            const gRealY = (g.y + (g.ny - g.y)*g.t);

            const dx = pRealX - gRealX;
            const dy = pRealY - gRealY;
            if (Math.sqrt(dx*dx + dy*dy) < 0.8) {
                if (powerModeTimer > 0) {
                    score += 200;
                    document.getElementById('score-pacman').innerText = score;
                    g.x = 7; g.y = 7; g.nx = 7; g.ny = 7;
                } else {
                    gameOver = true;
                }
            }
        }
    }

    function update(deltaTime) {
        if (gameOver || isPaused) return;

        if (powerModeTimer > 0) {
            powerModeTimer -= deltaTime;
            if (powerModeTimer < 0) powerModeTimer = 0;
        }

        updatePacman(deltaTime);
        updateGhosts(deltaTime);
    }

    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0, canvas.width, canvas.height);

        // Map
        for (let y=0; y<ROWS; y++) {
            for(let x=0; x<COLS; x++) {
                if (!grid[y]) continue;
                let val = grid[y][x];
                
                if (val === 1) {
                    ctx.fillStyle = '#1919A6';
                    ctx.fillRect(x*BLOCK_SIZE + 2, y*BLOCK_SIZE + 2, BLOCK_SIZE-4, BLOCK_SIZE-4);
                } else if (val === 2) {
                    ctx.fillStyle = '#FFB8AE';
                    ctx.fillRect(x*BLOCK_SIZE +BLOCK_SIZE/2 - 2, y*BLOCK_SIZE + BLOCK_SIZE/2 - 2, 4, 4);
                } else if (val === 3) {
                    ctx.fillStyle = '#FFB8AE';
                    ctx.beginPath();
                    ctx.arc(x*BLOCK_SIZE +BLOCK_SIZE/2, y*BLOCK_SIZE + BLOCK_SIZE/2, 6, 0, Math.PI*2);
                    ctx.fill();
                } else if (val === 4) {
                    ctx.fillStyle = '#FFB8FF';
                    ctx.fillRect(x*BLOCK_SIZE, y*BLOCK_SIZE + BLOCK_SIZE/2 - 2, BLOCK_SIZE, 4);
                }
            }
        }

        const toScreen = (v) => v * BLOCK_SIZE + BLOCK_SIZE/2;

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
            return;
        }

        // Pacman
        const px = toScreen(pacman.x + (pacman.nx - pacman.x)*pacman.t);
        const py = toScreen(pacman.y + (pacman.ny - pacman.y)*pacman.t);
        
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(pacman.dir * Math.PI/2);
        
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        const m = (pacman.mouth * Math.PI) / 180;
        ctx.arc(0, 0, BLOCK_SIZE/2 - 1, m, Math.PI*2 - m);
        ctx.lineTo(0,0);
        ctx.fill();
        ctx.restore();

        // Ghosts
        for(let g of ghosts) {
            const gx = toScreen(g.x + (g.nx - g.x)*g.t);
            const gy = toScreen(g.y + (g.ny - g.y)*g.t);
            const r = BLOCK_SIZE/2 - 1;
            
            let gColor = g.color;
            if (powerModeTimer > 0) {
                gColor = (powerModeTimer < 2000 && Math.floor(powerModeTimer / 200) % 2 === 0) ? '#FFFFFF' : '#0000FF';
            }
            
            ctx.fillStyle = gColor;
            ctx.beginPath();
            ctx.arc(gx, gy, r, Math.PI, 0);
            ctx.lineTo(gx + r, gy + r);
            ctx.lineTo(gx - r, gy + r);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(gx - 3, gy - 2, 2, 0, Math.PI*2);
            ctx.arc(gx + 3, gy - 2, 2, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = '#00f';
            ctx.beginPath();
            let dx = dirs[g.dir][0]*1;
            let dy = dirs[g.dir][1]*1;
            ctx.arc(gx - 3 + dx, gy - 2 + dy, 1, 0, Math.PI*2);
            ctx.arc(gx + 3 + dx, gy - 2 + dy, 1, 0, Math.PI*2);
            ctx.fill();
        }
    }

    function loop(timestamp) {
        if (isPaused) return;

        let deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        
        // Prevent huge jumps
        if (deltaTime > 100) deltaTime = 100;

        update(deltaTime);
        draw();

        if (!isPaused) {
            animationId = requestAnimationFrame(loop);
        }
    }

    function handleInput(e) {
        if (isPaused) return;
        
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }

        if (gameOver && e.code === 'Enter') {
            reset();
            return;
        }

        if (e.code === 'ArrowRight') pacman.nextDir = 0;
        else if (e.code === 'ArrowDown') pacman.nextDir = 1;
        else if (e.code === 'ArrowLeft') pacman.nextDir = 2;
        else if (e.code === 'ArrowUp') pacman.nextDir = 3;
    }

    function init(state) {
        canvas = document.getElementById('canvas-pacman');
        ctx = canvas.getContext('2d');
        
        if (state && state.grid) {
            grid = state.grid;
            score = state.score || 0;
            pacman = state.pacman;
            ghosts = state.ghosts;
            document.getElementById('score-pacman').innerText = score;
        } else {
            reset();
        }

        isInitialized = true;
        isPaused = true;
        
        document.removeEventListener('keydown', handleInput);
        document.addEventListener('keydown', handleInput);
        
        lastTime = performance.now();
        draw();
    }

    function pause() {
        if (!isInitialized) return {};
        isPaused = true;
        if (animationId) cancelAnimationFrame(animationId);
        document.removeEventListener('keydown', handleInput);
        
        return {
            grid,
            score,
            pacman,
            ghosts
        };
    }

    function resume() {
        if (!isInitialized) return;
        isPaused = false;
        document.addEventListener('keydown', handleInput);
        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
    }

    return {
        init,
        pause,
        resume,
        get isInitialized() { return isInitialized; },
        get isPaused() { return isPaused; }
    };
})();
