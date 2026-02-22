window.GameTetris = (function() {
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 24;
    
    let canvas, ctx;
    let grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    let score = 0;
    let isInitialized = false;
    let isPaused = true;
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;
    let animationId = null;
    let gameOver = false;

    // Colors mapping to pieces
    const colors = [
        null,
        '#FF0D72', // T
        '#0DC2FF', // I
        '#0DFF72', // S
        '#F538FF', // Z
        '#FF8E0D', // L
        '#FFE138', // J
        '#3877FF'  // O
    ];

    const pieces = [
        [],
        // T
        [
            [0,0,0],
            [1,1,1],
            [0,1,0]
        ],
        // I
        [
            [0,2,0,0],
            [0,2,0,0],
            [0,2,0,0],
            [0,2,0,0]
        ],
        // S
        [
            [0,3,3],
            [3,3,0],
            [0,0,0]
        ],
        // Z
        [
            [4,4,0],
            [0,4,4],
            [0,0,0]
        ],
        // L
        [
            [0,5,0],
            [0,5,0],
            [0,5,5]
        ],
        // J
        [
            [0,6,0],
            [0,6,0],
            [6,6,0]
        ],
        // O
        [
            [7,7],
            [7,7]
        ]
    ];

    let player = {
        pos: {x: 0, y: 0},
        matrix: null
    };

    function createPiece(type) {
        // Deep copy of piece
        let p = pieces[type];
        return p.map(row => [...row]);
    }

    function collide(board, p) {
        const m = p.matrix;
        const o = p.pos;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    function merge(board, p) {
        p.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + p.pos.y][x + p.pos.x] = value;
                }
            });
        });
    }

    function drawMatrix(matrix, offset) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = colors[value];
                    ctx.fillRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawMatrix(grid, {x: 0, y: 0});
        if (!gameOver) drawMatrix(player.matrix, player.pos);

        if (gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.fillStyle = "#fff";
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
        }
    }

    function playerReset() {
        const piecesPool = '1234567';
        player.matrix = createPiece(piecesPool[piecesPool.length * Math.random() | 0]);
        player.pos.y = 0;
        player.pos.x = (Math.floor(COLS / 2)) - Math.floor(player.matrix[0].length / 2);
        
        if (collide(grid, player)) {
            gameOver = true;
        }
    }

    function playerDrop() {
        player.pos.y++;
        if (collide(grid, player)) {
            player.pos.y--;
            merge(grid, player);
            playerReset();
            arenaSweep();
        }
        dropCounter = 0;
    }

    function playerMove(offset) {
        player.pos.x += offset;
        if (collide(grid, player)) {
            player.pos.x -= offset;
        }
    }

    function rotateSub(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [ matrix[x][y], matrix[y][x] ] = [ matrix[y][x], matrix[x][y] ];
            }
        }
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    function playerRotate(dir) {
        const pos = player.pos.x;
        let offset = 1;
        rotateSub(player.matrix, dir);
        while (collide(grid, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotateSub(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
    }

    function arenaSweep() {
        let rowCount = 1;
        outer: for (let y = grid.length -1; y >= 0; --y) {
            for (let x = 0; x < grid[y].length; ++x) {
                if (grid[y][x] === 0) {
                    continue outer;
                }
            }
            const row = grid.splice(y, 1)[0].fill(0);
            grid.unshift(row);
            ++y;

            score += rowCount * 100;
            rowCount *= 2;
            document.getElementById('score-tetris').innerText = score;
        }
    }

    function loop(time = 0) {
        if (isPaused) return;

        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }

        draw();

        if (!isPaused) {
            animationId = requestAnimationFrame(loop);
        }
    }

    function handleInput(e) {
        if (isPaused) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(e.code)) {
            e.preventDefault();
        }
        
        if (gameOver && e.code === 'Enter') {
            grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
            score = 0;
            gameOver = false;
            document.getElementById('score-tetris').innerText = score;
            playerReset();
            return;
        }

        if (e.code === 'ArrowLeft') {
            playerMove(-1);
        } else if (e.code === 'ArrowRight') {
            playerMove(1);
        } else if (e.code === 'ArrowDown') {
            playerDrop();
        } else if (e.code === 'ArrowUp') {
            playerRotate(1);
        }
    }

    function init(state) {
        canvas = document.getElementById('canvas-tetris');
        ctx = canvas.getContext('2d');

        if (state && state.grid) {
            grid = state.grid;
            score = state.score || 0;
            player.matrix = state.playerMatrix;
            player.pos = state.playerPos;
            document.getElementById('score-tetris').innerText = score;
        } else {
            grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
            score = 0;
            gameOver = false;
            document.getElementById('score-tetris').innerText = score;
            playerReset();
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
        
        // Exact state preservation
        return {
            grid: grid,
            score: score,
            playerMatrix: player.matrix,
            playerPos: player.pos
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
