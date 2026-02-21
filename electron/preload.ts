import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    loadConfig: (client: string) => ipcRenderer.invoke('load-config', client),
    saveConfig: (client: string, config: any) => ipcRenderer.invoke('save-config', { client, config }),
    discoverConfigs: () => ipcRenderer.invoke('discover-configs'),
    openConfigFolder: (client: string) => ipcRenderer.send('open-config-folder', client),
    isNative: true
});
