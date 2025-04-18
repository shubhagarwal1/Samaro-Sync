const { app, dialog, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");
const axios = require("axios");

// Configure logging
log.transports.file.level = "info";

// App version
const appVersion = app.getVersion();

// Configure auto-updater (currently disabled)
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("Application starting...");
log.info(`App version: ${appVersion}`);
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

// Manual update checker function
async function checkForUpdatesManually() {
  try {
    log.info("Manually checking for updates...");

    // Show checking dialog
    dialog.showMessageBox({
      type: "info",
      title: "Checking for Updates",
      message: "Checking for application updates...",
      buttons: ["OK"],
      noLink: true,
    });

    // Fetch the latest release info from GitHub
    const response = await axios.get(
      "https://api.github.com/repos/shubhagarwal1/Samaro-Sync/releases/latest"
    );
    const latestVersion = response.data.tag_name;
    const downloadUrl = `https://github.com/shubhagarwal1/Samaro-Sync/releases/tag/${latestVersion}`;

    log.info(
      `Current version: ${appVersion}, Latest version: ${latestVersion}`
    );

    // Compare versions (simple string comparison for now)
    if (latestVersion !== appVersion) {
      const { response: buttonIndex } = await dialog.showMessageBox({
        type: "info",
        title: "Update Available",
        message: `A new version (${latestVersion}) is available. Would you like to download it now?`,
        buttons: ["Yes", "No"],
        defaultId: 0,
      });

      if (buttonIndex === 0) {
        // Open browser to the release page
        await shell.openExternal(downloadUrl);
      }
    } else {
      dialog.showMessageBox({
        type: "info",
        title: "No Updates Available",
        message: "You are using the latest version of the application.",
        buttons: ["OK"],
        noLink: true,
      });
    }
  } catch (error) {
    log.error(`Error checking for updates manually: ${error.message}`);
    dialog.showErrorBox(
      "Error",
      "Failed to check for updates. Please try again later."
    );
  }
}

// Initialize the application
try {
  const { initializeApp } = require("./js/main");
  initializeApp();

  // Wait for app to be ready
  app.whenReady().then(() => {
    // Check for updates after app is ready
    setTimeout(() => {
      checkForUpdatesManually().catch((err) => {
        log.error("Error checking for updates:", err);
      });
    }, 5000); // Check after 5 seconds

    // Setup manual update check every hour
    setInterval(() => {
      checkForUpdatesManually().catch((err) => {
        log.error("Error checking for updates:", err);
      });
    }, 60 * 60 * 1000);
  });
} catch (error) {
  log.error(`Failed to initialize application: ${error.message}`);
  log.error(error.stack);
  app.quit();
}
