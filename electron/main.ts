import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import serve from 'electron-serve';

const loadURL = serve({ directory: path.join(__dirname, '../dist') });

function getPathForClient(client: string): string {
    const home = os.homedir();
    switch (client) {
        case 'claude':
            return path.join(home, 'Library/Application Support/Claude/claude_desktop_config.json');
        case 'gemini':
            return path.join(home, '.gemini/settings.json');
        case 'cursor':
            return path.join(home, 'Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/mcpServers.json');
        default:
            return path.join(home, '.mcp_config.json');
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1240,
        height: 860,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // In development, load from Vite dev server
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        loadURL(win);
        // win.webContents.openDevTools();
    }
}

// IPC Handlers
ipcMain.handle('load-config', async (_, client: string) => {
    const filePath = getPathForClient(client);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return { mcpServers: {} };
    } catch (err) {
        console.error('Failed to load config', err);
        return { error: 'Failed to load config', mcpServers: {} };
    }
});

ipcMain.handle('save-config', async (_, { client, config }) => {
    const filePath = getPathForClient(client);
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
        return { success: true };
    } catch (err) {
        console.error('Failed to save config', err);
        return { error: 'Failed to save config' };
    }
});

ipcMain.on('open-config-folder', (_, client: string) => {
    const filePath = getPathForClient(client);
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir)) {
        shell.openPath(dir);
    }
});

ipcMain.handle('discover-configs', async () => {
    const clients = ['claude', 'gemini'];
    const results: Record<string, any> = {};

    for (const client of clients) {
        const filePath = getPathForClient(client);
        if (fs.existsSync(filePath)) {
            try {
                const data = fs.readFileSync(filePath, 'utf-8');
                results[client] = JSON.parse(data);
            } catch (e) {
                console.warn(`Failed to parse config for ${client}`);
            }
        }
    }
    return results;
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
