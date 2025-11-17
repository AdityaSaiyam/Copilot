// ========================================================
//                 COPILOT WIDGET MAIN.JS
//     Floating Popup • Auto-Hide • Frameless • Clean AF
// ========================================================

const { app, BrowserWindow, Tray, Menu, screen } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const { Worker } = require("worker_threads");
let mainWindow = null;
let tray = null;
let pythonProcess = null;
let hideTimeout = null;
let worker = null;
const trayIcon = app.isPackaged
  ? path.join(process.resourcesPath, "icon.png")
  : path.join(__dirname, "icon.png");

// --------------------------------------------------------
//  GET BASE PATH (Dev vs EXE)
// --------------------------------------------------------
function getBasePath() {
    return app.isPackaged ? process.resourcesPath : __dirname;
}

// --------------------------------------------------------
//  START PYTHON BACKEND
// --------------------------------------------------------
function startPython() {
    const base = getBasePath();
    const serverPath = path.join(base, "backend", "server.exe");

    console.log("[PY] Starting server:", serverPath);

    pythonProcess = spawn(serverPath, [process.pid.toString()], {
        cwd: path.dirname(serverPath),
        windowsHide: true,
        shell: false
    });

    pythonProcess.stdout?.on("data", d => console.log("[PY]", d.toString()));
    pythonProcess.stderr?.on("data", d => console.log("[PY ERR]", d.toString()));
    pythonProcess.on("close", c => console.log("[PYTHON CLOSED]", c));
}


function startWorker() {
    const workerPath = path.join(__dirname, "worker.js");

    worker = new Worker(workerPath);

    worker.on("message", (data) => {
        mainWindow.webContents.send("backend-message", data);
    });

    worker.on("error", (err) => {
        console.log("Worker error:", err);
    });

    worker.on("exit", () => {
        console.log("Worker exited. Restarting in 2s...");
        setTimeout(startWorker, 2000);
    });
}

// --------------------------------------------------------
//  CREATE FRAMLESS FLOATING WIDGET
// --------------------------------------------------------
function createWidget() {
    mainWindow = new BrowserWindow({
    width: 420,
    height: 500,
    frame: false,
    resizable: false,
    transparent: true,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,

    webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: true,
    }
});

    mainWindow.loadFile("index.html");

    // Open DevTools ONLY in dev mode
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }

    // Fade-in effect and show centered
    mainWindow.once("ready-to-show", () => {
        showCentered();
    });

   

    mainWindow.on("blur", () => {
        if (app.isQuitting) return;

        // Start 5 sec timer
        hideTimeout = setTimeout(() => {

            // Trigger fade-out animation inside renderer
            mainWindow.webContents.send("fade-out");

            // Hide window *after* fade animation completes
            setTimeout(() => {
                mainWindow.hide();
            }, 350); // match CSS transition time

        }, 5000); // 5 seconds
    });

    mainWindow.on("focus", () => {
        // Cancel hide if user interacts again
        if (hideTimeout) clearTimeout(hideTimeout);

        // Remove fade-out in case it was applied
        mainWindow.webContents.send("fade-remove");
    });
}

// --------------------------------------------------------
//  CENTER POP-UP WINDOW
// --------------------------------------------------------
function showCentered() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    const offsetY = 400; // how low you want it ↓ (adjust if needed)

    const x = Math.round(width / 2 - mainWindow.getBounds().width / 2);
    const y = Math.round(height / 2 - mainWindow.getBounds().height / 2 + offsetY);

    mainWindow.setPosition(x, y);
    mainWindow.show();
    mainWindow.focus();
}
// --------------------------------------------------------
//  CREATE TRAY ICON
// --------------------------------------------------------
function createTray() {
    tray = new Tray(trayIcon);

    const menu = Menu.buildFromTemplate([
        {
            label: "Show COPILOT",
            click: () => showCentered()
        },
        {
            label: "Quit",
            click: () => {
                app.isQuitting = true;
                cleanup();
                app.quit();
            }
        }
    ]);

    tray.setToolTip("COPILOT Running");
    tray.setContextMenu(menu);

    // Toggle popup on tray click
    tray.on("click", () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            showCentered();
        }
    });
}

// --------------------------------------------------------
//  KILL PYTHON BACKEND CLEANLY
// --------------------------------------------------------
function cleanup() {
    console.log("🛑 Cleaning up backend...");

    try {
        if (pythonProcess) pythonProcess.kill();
    } catch {}

    try {
        spawn("taskkill", ["/f", "/im", "server.exe"], {
            windowsHide: true,
            shell: false
        });
    } catch {}
}

// --------------------------------------------------------
//  APP BOOTSTRAP
// --------------------------------------------------------
app.whenReady().then(() => {
    console.log("🚀 Launching Copilot backend + UI");

    startPython();
    createWidget();
    createTray();
    startWorker(); 
});

// --------------------------------------------------------
//  EXIT HANDLING
// --------------------------------------------------------
app.on("before-quit", () => {
    app.isQuitting = true;
    cleanup();
});

app.on("window-all-closed", () => {});
