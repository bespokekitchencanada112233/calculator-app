const { app, BrowserWindow } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const path = require("node:path");

const isDev = !app.isPackaged;

log.transports.file.level = "info";
log.transports.console.level = "info";
autoUpdater.logger = log;

let mainWindow = null;

function sendStatus(status) {
  log.info("[update]", status);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", status);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 760,
    minWidth: 380,
    minHeight: 600,
    title: "Team Calculator",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    autoUpdater.on("checking-for-update", () => sendStatus({ type: "checking" }));
    autoUpdater.on("update-available", (info) => sendStatus({ type: "available", version: info.version }));
    autoUpdater.on("update-not-available", (info) => sendStatus({ type: "up-to-date", version: info.version }));
    autoUpdater.on("download-progress", (progress) =>
      sendStatus({ type: "downloading", percent: Math.round(progress.percent) })
    );
    autoUpdater.on("update-downloaded", (info) => sendStatus({ type: "downloaded", version: info.version }));
    autoUpdater.on("error", (err) => sendStatus({ type: "error", message: String(err && err.message ? err.message : err) }));

    log.info("App version:", app.getVersion(), "checking for updates...");
    autoUpdater.checkForUpdates().catch((err) => {
      log.error("checkForUpdates failed", err);
      sendStatus({ type: "error", message: String(err && err.message ? err.message : err) });
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
