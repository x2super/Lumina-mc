const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: value => ipcRenderer.invoke('settings:save', value),
  listVersions: () => ipcRenderer.invoke('versions:list'),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  chooseJava: () => ipcRenderer.invoke('java:choose'),
  openFolder: target => ipcRenderer.invoke('folder:open', target),
  listContent: type => ipcRenderer.invoke('content:list', type),
  openContentFolder: type => ipcRenderer.invoke('content:open', type),
  importContent: type => ipcRenderer.invoke('content:import', type),
  toggleContent: (type, fileName) => ipcRenderer.invoke('content:toggle', type, fileName),
  runInstaller: type => ipcRenderer.invoke('installer:run', type),
  getAuthStatus: () => ipcRenderer.invoke('auth:status'),
  loginMicrosoft: () => ipcRenderer.invoke('auth:login'),
  logoutMicrosoft: () => ipcRenderer.invoke('auth:logout'),
  launch: options => ipcRenderer.invoke('game:launch', options),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  onState: callback => ipcRenderer.on('game:state', (_, value) => callback(value)),
  onProgress: callback => ipcRenderer.on('game:progress', (_, value) => callback(value)),
  onLog: callback => ipcRenderer.on('game:log', (_, value) => callback(value)),
  onAuthState: callback => ipcRenderer.on('auth:state', (_, value) => callback(value))
});
