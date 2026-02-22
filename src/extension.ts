import * as vscode from 'vscode';
import * as https from 'https';

import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    const provider = new FoGamesViewProvider(context.extensionUri, context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(FoGamesViewProvider.viewType, provider)
    );
}

class FoGamesViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'fogames.sidebarView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        // CSP and Local path configurations
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Render the UI
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for messages from the UI (games)
        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            switch (data.command) {
                case 'open_link':
                    // Security: Links must be opened in default browser via the host
                    vscode.env.openExternal(vscode.Uri.parse(data.url));
                    break;
                case 'save_state':
                    // Save game state from RAM to disk (globalState) when closed
                    await this._context.globalState.update(`fogames.${data.gameId}`, data.state);
                    break;
                case 'get_state':
                    // Send previous state back to UI when game starts
                    const savedState = this._context.globalState.get(`fogames.${data.gameId}`);
                    this._view?.webview.postMessage({ command: 'restore_state', gameId: data.gameId, state: savedState || null });
                    break;
            }
        });

        // Fetch Sponsor / Foworker fallback data when Webview starts
        this._fetchAndSendBannerData();
    }

    private _fetchAndSendBannerData() {
        const bannerJsonUrl = 'https://raw.githubusercontent.com/imtaxu/fogames/main/sponsor.json';

        https.get(bannerJsonUrl, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.active) {
                        this._view?.webview.postMessage({ command: 'update_banner', payload: parsedData });
                    } else {
                        this._view?.webview.postMessage({ command: 'hide_banner' });
                    }
                } catch (e) {
                    this._view?.webview.postMessage({ command: 'hide_banner' });
                }
            });
        }).on('error', () => {
            this._view?.webview.postMessage({ command: 'hide_banner' });
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        const htmlUri = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'index.html');
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'styles.css'));
        const mainJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'main.js'));
        const game2048Uri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'games', '2048.js'));
        const gameTetrisUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'games', 'tetris.js'));
        const gameDinoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'games', 'dino.js'));
        const gamePacmanUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'games', 'pacman.js'));
        const icon2048Uri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', '2048.svg'));
        const iconTetrisUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'tetris.svg'));
        const iconDinoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dino.svg'));
        const iconPacmanUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'pacman.svg'));

        let html = fs.readFileSync(htmlUri.fsPath, 'utf8');

        html = html.replace(/{{cspSource}}/g, webview.cspSource)
                   .replace(/{{nonce}}/g, nonce)
                   .replace(/{{stylesUri}}/g, stylesUri.toString())
                   .replace(/{{mainJsUri}}/g, mainJsUri.toString())
                   .replace(/{{game2048Uri}}/g, game2048Uri.toString())
                   .replace(/{{gameTetrisUri}}/g, gameTetrisUri.toString())
                   .replace(/{{gameDinoUri}}/g, gameDinoUri.toString())
                   .replace(/{{gamePacmanUri}}/g, gamePacmanUri.toString())
                   .replace(/{{icon2048Uri}}/g, icon2048Uri.toString())
                   .replace(/{{iconTetrisUri}}/g, iconTetrisUri.toString())
                   .replace(/{{iconDinoUri}}/g, iconDinoUri.toString())
                   .replace(/{{iconPacmanUri}}/g, iconPacmanUri.toString());

        return html;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}