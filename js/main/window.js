const { BrowserWindow, app } = require("electron");
const path = require("path");

let mainWindow;
let forceQuit = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false, // Don't show the window until it's ready
  });

  // Handle window close event (red X button)
  mainWindow.on("close", (event) => {
    if (!forceQuit) {
      event.preventDefault();
      mainWindow.hide();
      // Keep the app running in background
      event.returnValue = false;
    }
  });

  // Emit ready-to-show when the window is loaded
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadFile("index.html");
  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

// Force quit the app
function quitApp() {
  forceQuit = true;
  app.quit();
}

module.exports = {
  createWindow,
  getMainWindow,
  showWindow,
  quitApp,
};
