const { ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const {
  downloadFileWithPause,
  pauseDownloads,
  resumeDownloads,
  isPaused,
} = require("./download");
const {
  generateDirectoryTree,
  calculateDirectoryStats,
} = require("./directory");
const { notifyBackend } = require("../modules/payload");

function setupIpcHandlers() {
  // Directory Selection
  ipcMain.on("select-download-directory", (event) => {
    dialog
      .showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
      })
      .then((result) => {
        if (!result.canceled) {
          event.reply("selected-directory", result.filePaths[0]);
        }
      })
      .catch((err) => {
        event.reply(
          "processing-error",
          `Directory selection failed: ${err.message}`
        );
        notifyBackend(1, `Directory selection failed: ${err.message}`);
      });
  });

  // Process Payload
  ipcMain.on("process-payload", async (event, payload, basePath) => {
    try {
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      for (const item of payload) {
        if (isPaused) {
          await new Promise((resolve) => {
            const interval = setInterval(() => {
              if (!isPaused) {
                clearInterval(interval);
                resolve();
              }
            }, 500);
          });
        }

        const folderPath = path.join(basePath, item.foldername.trim());
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const filePath = path.join(folderPath, item.filename);
        await downloadFileWithPause(item.url, filePath, event);
      }

      if (!isPaused) {
        const tree = generateDirectoryTree(basePath);
        event.reply("display-directory-tree", tree);
        event.reply("downloads-complete");
        notifyBackend(0);
      }
    } catch (error) {
      const errorMessage = `Processing failed: ${error.message}`;
      event.reply("processing-error", errorMessage);
      notifyBackend(1, errorMessage);
    }
  });

  // Pause Downloads
  ipcMain.on("pause-downloads", () => {
    pauseDownloads();
  });

  // Resume Downloads
  ipcMain.on("resume-downloads", (event, payload, basePath) => {
    resumeDownloads();
    if (payload && basePath) {
      ipcMain.emit("process-payload", event, payload, basePath);
    }
  });

  // Directory Stats
  ipcMain.on("calculate-initial-stats", (event, dirPath) => {
    try {
      const stats = calculateDirectoryStats(dirPath);
      event.reply("initial-stats-calculated", stats);
    } catch (error) {
      console.error("Error calculating initial stats:", error);
      event.reply("initial-stats-calculated", null);
    }
  });
}

module.exports = {
  setupIpcHandlers,
};
