const { app, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");

// Configure logging
log.transports.file.level = "info";

// Configure auto-updater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("Application starting...");
log.info(`App version: ${app.getVersion()}`);
log.info(`App name: ${app.getName()}`);
log.info(`App path: ${app.getAppPath()}`);
log.info(`Executable path: ${process.execPath}`);
log.info(`Working directory: ${process.cwd()}`);
log.info(`Platform: ${process.platform}`);
log.info(`Process args: ${process.argv.join(" ")}`);

// Set app name explicitly
app.setName("Samaro Sync");

// Handle Windows-specific setup
if (process.platform === "win32") {
  // Fix path resolution issues on Windows
  try {
    const appPath = app.getAppPath();
    const execPath = path.dirname(process.execPath);
    log.info(`Windows app path: ${appPath}`);
    log.info(`Windows executable directory: ${execPath}`);

    // Add our paths to process.env.PATH to ensure Windows can find dependencies
    process.env.PATH = `${execPath};${appPath};${process.env.PATH}`;

    // Check if executable exists
    if (fs.existsSync(process.execPath)) {
      log.info(`Executable file exists at ${process.execPath}`);
    } else {
      log.error(`Executable not found at ${process.execPath}`);
    }
  } catch (error) {
    log.error(`Error setting up Windows paths: ${error.message}`);
  }

  // Handle squirrel events (Windows)
  try {
    // Import Windows-specific setup module
    const isSquirrelStartup = require("./js/main/squirrel-startup");
    if (isSquirrelStartup) {
      log.info("Exiting due to Squirrel startup event");
      app.quit();
      process.exit(0);
    }
  } catch (error) {
    log.error(`Error handling Squirrel events: ${error.message}`);
  }
}

// Setup error handler
process.on("uncaughtException", (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  log.error(error.stack);

  if (app.isReady()) {
    dialog.showErrorBox(
      "Application Error",
      `An unexpected error occurred:\n${error.message}\n\nCheck the logs for more details.`
    );
  }
});

// Setup auto-updater events
autoUpdater.on("checking-for-update", () => {
  log.info("Checking for updates...");
  // Only show dialog if app is ready
  if (app.isReady()) {
    dialog.showMessageBox({
      type: "info",
      title: "Checking for Updates",
      message: "Checking for application updates...",
      buttons: ["OK"],
      noLink: true,
    });
  }
});

autoUpdater.on("update-available", (info) => {
  log.info("Update available:", info);
  // Only show dialog if app is ready
  if (app.isReady()) {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Available",
        message:
          "A new version is available. Would you like to download and install it now?",
        buttons: ["Yes", "No"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  }
});

autoUpdater.on("update-not-available", (info) => {
  log.info("Update not available:", info);
  // Only show dialog if app is ready
  if (app.isReady()) {
    dialog.showMessageBox({
      type: "info",
      title: "No Updates Available",
      message: "You are using the latest version of the application.",
      buttons: ["OK"],
      noLink: true,
    });
  }
});

autoUpdater.on("error", (err) => {
  log.error("Error in auto-updater:", err);
  // Only show dialog if app is ready
  if (app.isReady()) {
    dialog.showErrorBox(
      "Error",
      "Failed to check for updates. Please try again later."
    );
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  let message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  log.info(message);
});

autoUpdater.on("update-downloaded", (info) => {
  log.info("Update downloaded:", info);
  dialog
    .showMessageBox({
      type: "info",
      title: "Update Ready",
      message:
        "Update has been downloaded. The application will restart to install the update.",
      buttons: ["Restart"],
      defaultId: 0,
    })
    .then(() => {
      autoUpdater.quitAndInstall(false, true);
    });
});

// Initialize the application
try {
  const { initializeApp } = require("./js/main");
  initializeApp();

  // Wait for app to be ready before checking for updates
  app.whenReady().then(() => {
    // Check for updates after app is ready
    autoUpdater.checkForUpdates().catch((err) => {
      log.error("Error checking for updates:", err);
    });

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        log.error("Error checking for updates:", err);
      });
    }, 60 * 60 * 1000);
  });
} catch (error) {
  log.error(`Failed to initialize application: ${error.message}`);
  log.error(error.stack);
  app.quit();
}
