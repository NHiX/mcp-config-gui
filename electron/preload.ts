import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    loadConfig: (client: string) => ipcRenderer.invoke('load-config', client),
    saveConfig: (client: string, config: unknown) => ipcRenderer.invoke('save-config', { client, config }),
    discoverConfigs: () => ipcRenderer.invoke('discover-configs'),
    testServer: (config: { command: string, args: string[], env: Record<string, string> }) => ipcRenderer.invoke('test-server', config),
    stopServerTest: () => ipcRenderer.invoke('stop-test-server'),
    onServerLog: (callback: (log: { type: string, data: string }) => void) => {
        const listener = (_: unknown, log: { type: string, data: string }) => callback(log);
        ipcRenderer.on('server-log', listener);
        return () => ipcRenderer.removeListener('server-log', listener);
    },
    openConfigFolder: (client: string) => ipcRenderer.send('open-config-folder', client),
    isNative: true
});
