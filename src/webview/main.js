const vscode = acquireVsCodeApi();

let activeGame = null;

// Helper to access game objects safely
function getGameObj(gameId) {
    if (gameId === '2048') return window.Game2048;
    if (gameId === 'tetris') return window.GameTetris;
    if (gameId === 'dino') return window.GameDino;
    if (gameId === 'pacman') return window.GamePacman;
    return null;
}

// Global button focus removal on click
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('vscode-button')) {
        e.target.blur();
    }
});

// Tab switching logic
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Manage game pause/resume based on active tab
        if (targetId === 'tab-games') {
            // Do not auto-resume. Let user manually start if they want.
        } else {
            if (activeGame) {
                const gameObj = getGameObj(activeGame);
                if (gameObj && typeof gameObj.pause === 'function') {
                    const state = gameObj.pause();
                    vscode.postMessage({ command: 'save_state', gameId: activeGame, state: state });
                    
                    const containerElem = document.getElementById(`game-${activeGame}-container`);
                    if (containerElem) {
                        const startBtn = containerElem.querySelector('.btn-start');
                        if (startBtn && gameObj.isPaused !== undefined) {
                            startBtn.innerText = '▶ Start';
                        }
                    }
                }
            }
        }
    });
});

// Game Grid interactions
document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
        const gameId = card.getAttribute('data-game');
        
        // Hide grid, show player
        document.getElementById('game-grid').classList.add('hidden');
        document.getElementById('game-player').classList.remove('hidden');
        
        // Hide all game containers properly
        document.querySelectorAll('.game-container').forEach(c => {
            c.classList.add('hidden');
            c.style.display = '';
        });
        
        activeGame = gameId;

        const containerId = `game-${gameId}-container`;
        const containerElem = document.getElementById(containerId);
        if (containerElem) {
            containerElem.classList.remove('hidden');
            // Need relative or block for canvases, flex for 2048
            containerElem.style.display = gameId === '2048' ? 'flex' : 'block';
        }

        const gameObj = getGameObj(gameId);
        if (!gameObj || !gameObj.isInitialized) {
             // Fetch saved state for the clicked game ONLY IF NOT INITIALIZED
             vscode.postMessage({ command: 'get_state', gameId: gameId });
        } else {
             // Already initialized in memory, just pause it and sync UI
             if (typeof gameObj.pause === 'function') gameObj.pause();
             
             const startBtn = containerElem.querySelector('.btn-start');
             if (startBtn && gameObj.isPaused !== undefined) {
                 startBtn.innerText = gameObj.isPaused ? '▶ Start' : '⏸ Pause';
             }
        }
    });
});

// --- Game Controls (.btn-start, .btn-reset, .btn-back) ---

function handleBack() {
    if (activeGame) {
        const gameObj = getGameObj(activeGame);
        if (gameObj && typeof gameObj.pause === 'function') {
            const state = gameObj.pause();
            vscode.postMessage({ command: 'save_state', gameId: activeGame, state: state });
        }
    }
    document.getElementById('game-player').classList.add('hidden');
    document.getElementById('game-grid').classList.remove('hidden');
    activeGame = null;
}

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', handleBack);
});

document.querySelectorAll('.btn-reset').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetGame = e.target.getAttribute('data-target');
        const gameObj = getGameObj(targetGame);
        if (gameObj && typeof gameObj.init === 'function') {
            gameObj.init();
            vscode.postMessage({ command: 'save_state', gameId: targetGame, state: null });
            
            // Re-sync start button if present
            const startBtn = e.target.parentElement.querySelector('.btn-start');
            if (startBtn) startBtn.innerText = '▶ Start';
        }
    });
});

document.querySelectorAll('.btn-start').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetGame = e.target.getAttribute('data-target');
        const gameObj = getGameObj(targetGame);
        if (gameObj) {
            if (gameObj.isPaused !== undefined) {
                if (gameObj.isPaused) {
                    gameObj.resume();
                    e.target.innerText = '⏸ Pause';
                } else {
                    gameObj.pause();
                    e.target.innerText = '▶ Start';
                }
            } else {
                // For 2048 which doesn't have isPaused
                // Do nothing or restart
                if (typeof gameObj.init === 'function') gameObj.init();
            }
        }
    });
});

// Canvas Click-to-Start
['2048', 'tetris', 'pacman', 'dino'].forEach(gameId => {
    const clickableContainer = gameId === '2048' ? document.getElementById('grid-2048') : document.getElementById(`canvas-${gameId}`);
    if (clickableContainer) {
        clickableContainer.style.cursor = 'pointer';
        clickableContainer.addEventListener('click', () => {
             const gameObj = getGameObj(gameId);
             if (gameObj && gameObj.isPaused) {
                 gameObj.resume();
                 const containerElem = document.getElementById(`game-${gameId}-container`);
                 const startBtn = containerElem.querySelector('.btn-start');
                 if (startBtn) startBtn.innerText = '⏸ Pause';
             }
        });
    }
});

// External Links (About Tab)
document.querySelectorAll('.external-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('data-url');
        if (url) {
            vscode.postMessage({ command: 'open_link', url: url });
        }
    });
});

// Incoming messages from Extension Host
window.addEventListener('message', event => {
    const message = event.data;
    
    if (message.command === 'update_banner') {
        const image = document.getElementById('sponsor-image');
        const footer = document.getElementById('sponsor-footer');
        if (image && footer) {
            image.src = message.payload.imageUrl;
            image.alt = message.payload.altText || 'Sponsor';
            image.onclick = () => {
                vscode.postMessage({ command: 'open_link', url: message.payload.targetUrl });
            };
            footer.style.display = 'block';
        }
    } else if (message.command === 'hide_banner') {
        const footer = document.getElementById('sponsor-footer');
        if (footer) {
            footer.style.display = 'none';
        }
    } else if (message.command === 'restore_state') {
        const gameObj = getGameObj(message.gameId);
        if (gameObj) {
            gameObj.init(message.state);
            const containerElem = document.getElementById(`game-${message.gameId}-container`);
            if (containerElem) {
                const startBtn = containerElem.querySelector('.btn-start');
                if (startBtn && gameObj.isPaused !== undefined) {
                    startBtn.innerText = gameObj.isPaused ? '▶ Start' : '⏸ Pause';
                }
            }
        }
    }
});

// Save state when webview hides/unloads
window.addEventListener('blur', () => {
    if (activeGame) {
        const gameObj = getGameObj(activeGame);
        if (gameObj) {
            const state = gameObj.pause();
            vscode.postMessage({ command: 'save_state', gameId: activeGame, state: state });
        }
    }
});
