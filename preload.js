const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    onBackendMessage: (cb) => ipcRenderer.on("backend-message", (_, data) => cb(data)),
    onFadeOut: (cb) => ipcRenderer.on("fade-out", cb),
    onFadeRemove: (cb) => ipcRenderer.on("fade-remove", cb)
});