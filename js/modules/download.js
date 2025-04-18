const { ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");
const { state, setState, updateStats } = require("./state");
const { eventEmitter, notifyBackend } = require("./payload");
const { log } = require("./ui");

function getUniqueParentFolderName(selectedPath, folderName) {
  let counter = 1;
  let newFolderName = folderName;

  while (fs.existsSync(path.join(selectedPath, newFolderName))) {
    newFolderName = `${folderName}_${counter}`;
    counter++;
  }

  return newFolderName;
}

// Download control functions
const handleDirectorySelected = (event, selectedPath) => {
  // Get the folder name from the first item in the payload
  const folderName = state.currentPayload[0].foldername;
  const uniqueFolderName = getUniqueParentFolderName(selectedPath, folderName);
  const downloadPath = path.join(selectedPath, uniqueFolderName);

  setState({
    downloadPath,
    isDownloading: true,
    isPaused: false,
    isComplete: false,
    isShowingCompleteUI: false,
  });

  // Enable pause button and disable resume button
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  if (pauseBtn) {
    pauseBtn.disabled = false;
    pauseBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }
  if (resumeBtn) {
    resumeBtn.disabled = true;
    resumeBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  // Hide directory tree if visible and restore processing log container
  const directoryTree = document.getElementById("directoryTree");
  const processingLog = document.getElementById("processingLog");

  if (directoryTree) {
    directoryTree.classList.add("hidden");
  }

  // Always show the processing log when starting a new download
  if (processingLog) {
    processingLog.classList.remove("hidden");

    // Check if the processing container was completely replaced
    const processingContainer = document.querySelector(
      ".bg-gray-50.rounded-lg.p-6.mb-4"
    );
    if (processingContainer) {
      // Ensure the container has the right structure
      if (!processingContainer.contains(processingLog)) {
        // Clear container and rebuild it
        processingContainer.innerHTML = "";

        // Add the title
        const resultsTitle = document.createElement("h3");
        resultsTitle.className = "font-semibold mb-3 text-gray-800";
        resultsTitle.textContent = "Download Results";
        processingContainer.appendChild(resultsTitle);

        // Re-add the processing log
        processingContainer.appendChild(processingLog);

        // Re-add the directory tree (but hidden)
        if (directoryTree) {
          processingContainer.appendChild(directoryTree);
        }
      }
    }

    // Ensure the log area has the correct structure inside
    if (processingLog.innerHTML === "") {
      // Recreate the internal structure of the processing log
      const processingDiv = document.createElement("div");
      processingDiv.className = "flex items-center text-gray-700 mb-2";
      processingDiv.innerHTML = `
        <span class="inline-block mr-2">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
        Processing
      `;

      // Create log container
      const logContainer = document.createElement("div");
      logContainer.className = "text-sm text-gray-600";

      // Add placeholder message
      const placeholderMessage = document.createElement("p");
      placeholderMessage.className = "text-gray-500";
      placeholderMessage.textContent = "Waiting for download to start...";
      logContainer.appendChild(placeholderMessage);

      // Append all to the log area
      processingLog.appendChild(processingDiv);
      processingLog.appendChild(logContainer);
    }
  }

  // Manually log the first message to ensure logs are working
  log(`Starting download to: ${downloadPath}`, "info");
  eventEmitter.emit("log", `Download directory: ${downloadPath}`, "info");
  eventEmitter.emit("updateButtons", state);

  ipcRenderer.send("create-parent-folder", downloadPath);
  ipcRenderer.send("calculate-initial-stats", downloadPath);
};

const pauseDownloads = () => {
  setState({ isPaused: true });
  ipcRenderer.send("pause-downloads");
  eventEmitter.emit("log", "Downloads paused", "warning");
  eventEmitter.emit("updateButtons", state);
};

const resumeDownloads = () => {
  setState({ isPaused: false });
  ipcRenderer.send(
    "resume-downloads",
    state.currentPayload,
    state.downloadPath
  );
  eventEmitter.emit("log", "Downloads resumed", "success");
  eventEmitter.emit("updateButtons", state);
};

const cancelDownloads = () => {
  setState({
    isCancelled: true,
    isPaused: false,
  });
  ipcRenderer.send("cancel-downloads");
  eventEmitter.emit("log", "Downloads cancelled", "error");
  eventEmitter.emit("updateButtons", state);
};

// Progress and stats update functions
const updateDownloadProgress = (
  event,
  { filePath, progress, downloadedSize, totalSize }
) => {
  if (!state.stats[filePath]) {
    state.stats[filePath] = {
      size: totalSize,
      completed: false,
      downloadedSize: 0,
    };
    state.stats.files++;
    state.stats.size += totalSize;
  }

  state.stats[filePath].downloadedSize = downloadedSize;
  updateStats(state.stats);
  eventEmitter.emit("updateStats", state.stats);

  // Emit progress update to UI
  eventEmitter.emit(
    "updateProgress",
    filePath,
    progress,
    downloadedSize,
    totalSize
  );

  // Only log important messages
  if (progress === 100) {
    eventEmitter.emit("log", `Downloaded: ${filePath}`, "success");
  }
};

const updateFileStats = (event, { filePath, size }) => {
  if (!state.stats[filePath]) {
    state.stats[filePath] = { size: 0, completed: false };
  }

  if (!state.stats[filePath].completed) {
    state.stats[filePath].size = size;
    state.stats[filePath].completed = true;
    state.stats.files++;
    state.stats.size += size;

    updateStats(state.stats);
    eventEmitter.emit("updateStats", state.stats);
    eventEmitter.emit("log", `Downloaded: ${filePath}`, "success");
  }
};

const handleError = async (event, message) => {
  eventEmitter.emit("log", message, "error");
  setState({ isDownloading: false });
  eventEmitter.emit("updateButtons", state);
  await notifyBackend(1, message);
};

// Event handlers
const setupDownloadEventListeners = () => {
  const ipcHandlers = {
    "selected-directory": handleDirectorySelected,
    "download-progress": updateDownloadProgress,
    "file-download-complete": updateFileStats,
    "display-directory-tree": async (event, tree) => {
      // Set state to indicate download is complete and we're showing complete UI
      setState({
        isComplete: true,
        isDownloading: false,
        isShowingCompleteUI: true,
      });

      // Hide processing log when download completes
      const processingLog = document.getElementById("processingLog");
      if (processingLog) {
        processingLog.classList.add("hidden");
      }

      // Show directory tree
      const directoryTree = document.getElementById("directoryTree");
      const { ipcRenderer } = require("electron");
      if (directoryTree) {
        directoryTree.classList.remove("hidden");
      }

      eventEmitter.emit("showDirectoryTree", tree);
      eventEmitter.emit("log", "All downloads completed!", "success");
      eventEmitter.emit("updateButtons", state);

      // Make sure the completion UI is shown
      if (typeof window.showDownloadComplete === "function") {
        window.showDownloadComplete();
      } else {
        // Fallback if the window function isn't available
        if (processingLog) {
          processingLog.classList.add("hidden"); // Ensure logs are hidden
        }
        if (directoryTree) {
          directoryTree.classList.remove("hidden");
        }
      }

      await notifyBackend(0);
    },
    "processing-error": handleError,
    "initial-stats-calculated": (event, stats) => {
      if (stats) {
        state.stats = stats;
        eventEmitter.emit("updateStats", state.stats);

        // Log initial stats - directly using log function first to ensure it displays
        const statsMessage = `Initial directory stats: ${stats.files} files, ${(
          stats.size /
          (1024 * 1024)
        ).toFixed(2)} MB`;

        log(statsMessage, "info");
        eventEmitter.emit("log", statsMessage, "info");
      }

      // Ensure downloads start automatically
      setState({ isPaused: false, isDownloading: true });
      eventEmitter.emit("updateButtons", state);

      ipcRenderer.send(
        "process-payload",
        state.currentPayload,
        state.downloadPath
      );
    },
  };

  Object.entries(ipcHandlers).forEach(([event, handler]) => {
    ipcRenderer.on(event, handler);
  });
};

module.exports = {
  setupDownloadEventListeners,
  pauseDownloads,
  resumeDownloads,
};
