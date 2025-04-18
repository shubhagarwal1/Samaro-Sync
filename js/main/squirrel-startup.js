const { app } = require("electron");
const path = require("path");
const { spawn, execFile } = require("child_process");
const fs = require("fs");
const log = require("electron-log");

// Handle Squirrel.Windows events
function handleSquirrelEvent() {
  log.info("Checking for Squirrel events...");

  if (process.argv.length === 1) {
    log.info("No Squirrel event detected (no command line args)");
    return false;
  }

  const appFolder = path.resolve(process.execPath, "..");
  const rootFolder = path.resolve(appFolder, "..");
  const updateExe = path.resolve(path.join(rootFolder, "Update.exe"));
  const exeName = path.basename(process.execPath);

  log.info(`App folder: ${appFolder}`);
  log.info(`Root folder: ${rootFolder}`);
  log.info(`Update.exe path: ${updateExe}`);
  log.info(`Executable name: ${exeName}`);

  // Check if Update.exe exists
  if (!fs.existsSync(updateExe)) {
    log.warn(`Update.exe not found at ${updateExe}`);
  }

  const squirrelEvents = {
    "--squirrel-install": function () {
      // Called when the app is installed
      log.info("Handling --squirrel-install");
      createShortcuts("--createShortcut", [exeName]);
      setTimeout(app.quit, 1000);
      return true;
    },
    "--squirrel-updated": function () {
      // Called when the app is updated
      log.info("Handling --squirrel-updated");
      createShortcuts("--createShortcut", [exeName]);
      setTimeout(app.quit, 1000);
      return true;
    },
    "--squirrel-uninstall": function () {
      // Called when the app is uninstalled
      log.info("Handling --squirrel-uninstall");
      createShortcuts("--removeShortcut", [exeName]);
      setTimeout(app.quit, 1000);
      return true;
    },
    "--squirrel-obsolete": function () {
      // Called when this version is obsolete (being updated to)
      log.info("Handling --squirrel-obsolete");
      app.quit();
      return true;
    },
    "--squirrel-firstrun": function () {
      // Called when the app is run for the first time after installation
      log.info("Handling --squirrel-firstrun");
      return false; // Allow app to continue running
    },
  };

  function createShortcuts(operation, targets) {
    log.info(
      `Creating shortcuts with operation: ${operation}, targets: ${targets.join(
        " "
      )}`
    );

    try {
      const args = [operation].concat(targets);
      log.info(`Running update.exe with args: ${args.join(" ")}`);

      // Try execFile first
      execFile(updateExe, args, (error, stdout, stderr) => {
        if (error) {
          log.error(`execFile error: ${error.message}`);
          log.error(`Falling back to spawn method`);

          // Fall back to spawn method
          const child = spawn(updateExe, args, { detached: true });

          child.on("close", (code) => {
            log.info(`Shortcut operation complete with code: ${code}`);
          });

          child.on("error", (err) => {
            log.error(`Shortcut operation error: ${err.message}`);
          });
        } else {
          log.info(`Shortcut operation complete via execFile`);
          if (stdout) log.info(`stdout: ${stdout}`);
          if (stderr) log.warn(`stderr: ${stderr}`);
        }
      });
    } catch (error) {
      log.error(`Failed to create shortcuts: ${error.message}`);
    }
  }

  // Check for a Squirrel.Windows event
  const eventArg = process.argv.find((arg) => {
    return Object.keys(squirrelEvents).includes(arg);
  });

  if (eventArg) {
    log.info(`Detected Squirrel event: ${eventArg}`);
    return squirrelEvents[eventArg]();
  }

  log.info("No Squirrel event detected in command line args");
  return false;
}

// Execute and export whether we're handling a Squirrel event
try {
  log.info("Checking for Squirrel events on startup");
  const isHandlingSquirrelEvent = handleSquirrelEvent();
  log.info(`Is handling Squirrel event: ${isHandlingSquirrelEvent}`);
  module.exports = isHandlingSquirrelEvent;
} catch (error) {
  log.error(`Error in squirrel-startup.js: ${error.message}`);
  log.error(error.stack);
  module.exports = false;
}
