window.GameDino = (function() {
    let canvas, ctx;
    let isInitialized = false;
    let isPaused = true;
    let lastTime = 0;
    
    const dinoPath = new Path2D("M50 10 h30 v10 h10 v10 h10 v20 h-10 v10 h-30 v30 h10 v10 h-20 v-20 h-10 v20 h-20 v-10 h10 v-20 h-20 v-10 h-10 v-10 h10 v-10 h10 v-10 h30 v-10 z");
    const dinoEyePath = new Path2D("M70 20 h10 v10 h-10 z");
    const deadEyePath = new Path2D("M65 20 l10 10 m0 -10 l-10 10");
    const cactusPath = new Path2D("M20 0 h10 v100 h-10 z M0 30 h10 v20 h-10 z M10 50 h10 v10 h-10 z M40 20 h10 v20 h-10 z M30 40 h10 v10 h-10 z");
    
    // Game Physics
    const GRAVITY = 0.4;
    const JUMP_POWER = -9;
    const INITIAL_SPEED = 2.5;
    
    // State
    let dino = { x: 50, y: 150 - 47, width: 44, height: 47, dy: 0, isJumping: false, frame: 0 };
    let obstacles = [];
    let speed = INITIAL_SPEED;
    let score = 0;
    let highScore = 0;
    let gameOver = false;
    let animationId = null;
    let groundY = 130;
    let frameCount = 0;

    let spriteImg = null;

    function reset() {
        dino = { x: 50, y: groundY - 47, width: 44, height: 47, dy: 0, isJumping: false, frame: 0 };
        obstacles = [];
        speed = INITIAL_SPEED;
        score = 0;
        gameOver = false;
        frameCount = 0;
        lastTime = performance.now();
        document.getElementById('score-dino').innerText = Math.floor(score);
    }

    function spawnObstacle() {
        if (Math.random() < 0.02) {
            if (obstacles.length > 0) {
                const last = obstacles[obstacles.length - 1];
                if (canvas.width - last.x < 180) return;
            }
            // Small or large cactus
            const isLarge = Math.random() > 0.5;
            const w = isLarge ? 25 : 17;
            const h = isLarge ? 50 : 35;
            const sx = isLarge ? 332 : 228;
            
            obstacles.push({
                x: canvas.width,
                y: groundY - h,
                width: w,
                height: h,
                sx: sx,
                sy: 2
            });
        }
    }

    function update(deltaTime) {
        if (gameOver || isPaused) return;

        frameCount++;

        // Dino Physics
        dino.dy += GRAVITY;
        dino.y += dino.dy;

        if (dino.y >= groundY - dino.height) {
            dino.y = groundY - dino.height;
            dino.dy = 0;
            dino.isJumping = false;
        }

        // Running animation
        if (!dino.isJumping && frameCount % 6 === 0) {
            dino.frame = dino.frame === 0 ? 1 : 0;
        }

        // Move obstacles
        for (let i = 0; i < obstacles.length; i++) {
            let obs = obstacles[i];
            obs.x -= speed;

            // Collision hitbox (slightly smaller than visual)
            let hitboxMargin = 10;
            if (dino.x + hitboxMargin < obs.x + obs.width - hitboxMargin &&
                dino.x + dino.width - hitboxMargin > obs.x + hitboxMargin &&
                dino.y + hitboxMargin < obs.y + obs.height - hitboxMargin &&
                dino.y + dino.height - hitboxMargin > obs.y + hitboxMargin) {
                    gameOver = true;
                    if (score > highScore) {
                        highScore = Math.floor(score);
                        document.getElementById('hiscore-dino').innerText = highScore;
                    }
                    return;
            }
        }

        if (obstacles.length && obstacles[0].x + obstacles[0].width < 0) {
            obstacles.shift();
        }

        spawnObstacle();

        score += 0.1;
        speed += 0.001;
        document.getElementById('score-dino').innerText = Math.floor(score);
    }

    function draw() {
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--vscode-editorWidget-background');
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground line
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--vscode-panel-border');
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        let fgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-foreground').trim();
        if (!fgColor) fgColor = getComputedStyle(document.body).getPropertyValue('--vscode-foreground').trim() || '#fff';
        let bgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editorWidget-background').trim() || '#000';

        if (gameOver) {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--vscode-editorError-foreground');
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
            ctx.font = '12px monospace';
            ctx.fillText("Press Up/Space to restart", canvas.width / 2, canvas.height / 2 + 20);
            
            // Draw dead dino
            ctx.save();
            ctx.translate(dino.x, dino.y);
            ctx.scale(dino.width / 100, dino.height / 100);
            ctx.fillStyle = fgColor;
            ctx.fill(dinoPath);
            ctx.strokeStyle = bgColor;
            ctx.lineWidth = 8;
            ctx.stroke(deadEyePath);
            ctx.restore();
        } else {
            // Obstacles
            ctx.fillStyle = fgColor;
            for (let obs of obstacles) {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                ctx.scale(obs.width / 50, obs.height / 100);
                ctx.fill(cactusPath);
                ctx.restore();
            }

            // Dino
            let bobOffset = (!dino.isJumping && dino.frame === 0) ? 2 : 0;
            ctx.save();
            ctx.translate(dino.x, dino.y - bobOffset);
            ctx.scale(dino.width / 100, dino.height / 100);
            ctx.fillStyle = fgColor;
            ctx.fill(dinoPath);
            ctx.fillStyle = bgColor;
            ctx.fill(dinoEyePath);
            ctx.restore();
        }
    }

    function loop(timestamp) {
        if (isPaused) return;

        let deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        update(deltaTime);
        draw();

        if (!isPaused) {
            animationId = requestAnimationFrame(loop);
        }
    }

    function handleInput(e) {
        if (isPaused) return;
        if (e.code === 'Space' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (gameOver) {
                reset();
            } else if (!dino.isJumping) {
                dino.dy = JUMP_POWER;
                dino.isJumping = true;
            }
        }
    }

    function init(state) {
        canvas = document.getElementById('canvas-dino');
        ctx = canvas.getContext('2d');
        
        if (state && state.highScore) {
            highScore = state.highScore;
            document.getElementById('hiscore-dino').innerText = highScore;
        }

        reset();
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
        return { highScore };
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
