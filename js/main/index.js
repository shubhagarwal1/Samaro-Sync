const { app, BrowserWindow } = require("electron");
const { createWindow, showWindow } = require("./window");
const { setupIpcHandlers } = require("./ipc");

function initializeApp() {
  // Prevent multiple instances of the app
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return;
  }

  // Someone tried to run a second instance, focus our window instead
  app.on("second-instance", () => {
    showWindow();
  });

  app.whenReady().then(() => {
    createWindow();
    setupIpcHandlers();
  });

  // Handle window-all-closed event
  app.on("window-all-closed", () => {
    // On macOS, don't quit the app when all windows are closed
    if (process.platform !== "darwin") {
      // Just hide the window, don't quit the app
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((window) => {
        window.hide();
      });
    }
  });

  // Handle activate event (macOS)
  app.on("activate", () => {
    showWindow();
  });

  // Prevent the app from quitting when the last window is closed
  app.on("before-quit", (event) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0 && !windows[0].isDestroyed()) {
      event.preventDefault();
      windows.forEach((window) => {
        window.hide();
      });
    }
  });
}

module.exports = {
  initializeApp,
};
