import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    loadConfig: (client) => ipcRenderer.invoke('load-config', client),
    saveConfig: (client, config) => ipcRenderer.invoke('save-config', { client, config }),
    discoverConfigs: () => ipcRenderer.invoke('discover-configs'),
    testServer: (config) => ipcRenderer.invoke('test-server', config),
    stopServerTest: () => ipcRenderer.invoke('stop-test-server'),
    onServerLog: (callback) => {
        const listener = (_, log) => callback(log);
        ipcRenderer.on('server-log', listener);
        return () => ipcRenderer.removeListener('server-log', listener);
    },
    openConfigFolder: (client) => ipcRenderer.send('open-config-folder', client),
    isNative: true
});
