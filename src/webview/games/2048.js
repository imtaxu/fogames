window.Game2048 = (function() {
    let grid = [];
    let score = 0;
    let isInitialized = false;
    let isPaused = false;
    
    function initGrid() {
        grid = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];
        score = 0;
        addRandomTile();
        addRandomTile();
    }

    function addRandomTile() {
        let emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) emptyCells.push({r, c});
            }
        }
        if (emptyCells.length > 0) {
            let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            grid[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    function render() {
        const container = document.getElementById('grid-2048');
        if (!container) return;
        
        container.innerHTML = '';
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const val = grid[r][c];
                const cell = document.createElement('div');
                cell.className = 'cell-2048';
                cell.setAttribute('data-val', val);
                if (val > 0) {
                    cell.innerText = val;
                }
                container.appendChild(cell);
            }
        }
        document.getElementById('score-2048').innerText = score;
    }

    function slideRow(row) {
        let arr = row.filter(val => val);
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i+1]) {
                arr[i] *= 2;
                score += arr[i];
                arr[i+1] = 0;
            }
        }
        arr = arr.filter(val => val);
        while (arr.length < 4) {
            arr.push(0);
        }
        return arr;
    }

    function moveLeft() {
        let changed = false;
        for (let r = 0; r < 4; r++) {
            let oldRow = grid[r].slice();
            grid[r] = slideRow(grid[r]);
            if (oldRow.join(',') !== grid[r].join(',')) changed = true;
        }
        return changed;
    }

    function moveRight() {
        let changed = false;
        for (let r = 0; r < 4; r++) {
            let oldRow = grid[r].slice();
            grid[r] = slideRow(grid[r].slice().reverse()).reverse();
            if (oldRow.join(',') !== grid[r].join(',')) changed = true;
        }
        return changed;
    }

    function moveUp() {
        let changed = false;
        for (let c = 0; c < 4; c++) {
            let oldCol = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
            let newCol = slideRow(oldCol);
            for (let r = 0; r < 4; r++) {
                grid[r][c] = newCol[r];
            }
            if (oldCol.join(',') !== newCol.join(',')) changed = true;
        }
        return changed;
    }

    function moveDown() {
        let changed = false;
        for (let c = 0; c < 4; c++) {
            let oldCol = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]].reverse();
            let newCol = slideRow(oldCol).reverse();
            for (let r = 0; r < 4; r++) {
                grid[r][c] = newCol[r];
            }
            if (oldCol.reverse().join(',') !== newCol.join(',')) changed = true;
        }
        return changed;
    }

    function handleKeyDown(e) {
        if (isPaused) return;

        let changed = false;
        switch(e.key) {
            case 'ArrowLeft':  changed = moveLeft(); break;
            case 'ArrowRight': changed = moveRight(); break;
            case 'ArrowUp':    changed = moveUp(); break;
            case 'ArrowDown':  changed = moveDown(); break;
        }
        
        if (changed) {
            addRandomTile();
            render();
        }
    }

    function init(state) {
        if (state && state.grid) {
            grid = state.grid;
            score = state.score || 0;
        } else {
            initGrid();
        }
        isInitialized = true;
        isPaused = false;
        render();
        
        document.removeEventListener('keydown', handleKeyDown);
        document.addEventListener('keydown', handleKeyDown);
    }

    function pause() {
        isPaused = true;
        document.removeEventListener('keydown', handleKeyDown);
        return { grid, score };
    }

    function resume() {
        if (!isInitialized) return;
        isPaused = false;
        document.addEventListener('keydown', handleKeyDown);
    }

    return {
        init,
        pause,
        resume,
        get isInitialized() { return isInitialized; },
        get isPaused() { return isPaused; }
    };
})();
