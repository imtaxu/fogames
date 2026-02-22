"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const https = require("https");
const fs = require("fs");
function activate(context) {
    const provider = new FoGamesViewProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(FoGamesViewProvider.viewType, provider));
}
class FoGamesViewProvider {
    _extensionUri;
    _context;
    static viewType = 'fogames.sidebarView';
    _view;
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        // CSP ve Local yol ayarlamaları
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        // UI'yi render et
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // UI'dan (oyunlardan) gelen mesajları dinle
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'open_link':
                    // Güvenlik: Linkler kesinlikle host üzerinden, varsayılan tarayıcıda açılır.
                    vscode.env.openExternal(vscode.Uri.parse(data.url));
                    break;
                case 'save_state':
                    // Oyun kapandığında durumu RAM'den diske (globalState) kaydet
                    await this._context.globalState.update(`fogames.${data.gameId}`, data.state);
                    break;
                case 'get_state':
                    // Oyun açıldığında eski durumu UI'a geri gönder
                    const savedState = this._context.globalState.get(`fogames.${data.gameId}`);
                    if (savedState) {
                        this._view?.webview.postMessage({ command: 'restore_state', gameId: data.gameId, state: savedState });
                    }
                    break;
            }
        });
        // Webview ayağa kalktığında Sponsor / Foworker fallback datası çek
        this._fetchAndSendBannerData();
    }
    _fetchAndSendBannerData() {
        const fallbackData = {
            active: true,
            imageUrl: "", // Foworker default banner base64 veya local uri buraya gelecek
            targetUrl: "https://foworker.com",
            altText: "Powered by Foworker"
        };
        const bannerJsonUrl = 'https://raw.githubusercontent.com/KULLANICI_ADIN/vscode-fogames/main/banner.json';
        https.get(bannerJsonUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    // GitHub'dan veri başarıyla çekilirse ve aktifse Webview'a yolla
                    if (parsedData.active) {
                        this._view?.webview.postMessage({ command: 'update_banner', payload: parsedData });
                    }
                    else {
                        this._view?.webview.postMessage({ command: 'update_banner', payload: fallbackData });
                    }
                }
                catch (e) {
                    // JSON parse hatası (Offline vs) -> Foworker Fallback
                    this._view?.webview.postMessage({ command: 'update_banner', payload: fallbackData });
                }
            });
        }).on('error', () => {
            // Ağ hatası -> Foworker Fallback
            this._view?.webview.postMessage({ command: 'update_banner', payload: fallbackData });
        });
    }
    _getHtmlForWebview(webview) {
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
        const dinoSpriteUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dino-sprite.png'));
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
            .replace(/{{iconPacmanUri}}/g, iconPacmanUri.toString())
            .replace(/{{dinoSpriteUri}}/g, dinoSpriteUri.toString());
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
//# sourceMappingURL=extension.js.map