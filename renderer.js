const { ipcRenderer } = require("electron");
const { resetState, state } = require("./js/modules/state");
const {
  initializeElements,
  resetUI,
  setupUIEventListeners,
  clearOtpInputs,
} = require("./js/modules/ui");
const { fetchPayload, showOtpScreen } = require("./js/modules/payload");
const {
  setupDownloadEventListeners,
  pauseDownloads,
  resumeDownloads,
} = require("./js/modules/download");
const {
  initializeFolderSelection,
  showFolderSelectionScreen,
  setupFolderSelectionListeners,
} = require("./js/modules/folderSelection");

// Initialize application
function init() {
  // Expose state to window object for beforeunload handler
  window.state = state;

  // Wait for DOM to be ready
  document.addEventListener("DOMContentLoaded", () => {
    // Initialize UI elements
    initializeElements();
    initializeFolderSelection();

    // Reset application state and UI
    resetState();
    resetUI();

    // Ensure we start with OTP screen
    showOtpScreen();

    // Setup event handlers
    const handlers = {
      onFetch: async (otp) => {
        const payload = await fetchPayload(otp);
        if (payload && payload.fileCount) {
          showFolderSelectionScreen(payload.fileCount);
        }
      },
      onProcess: () => ipcRenderer.send("select-download-directory"),
      onPause: pauseDownloads,
      onResume: resumeDownloads,
      onNewDownload: () => {
        resetState();
        resetUI();
        clearOtpInputs();
        showOtpScreen();
      },
    };

    // Setup UI and download event listeners
    setupUIEventListeners(handlers);
    setupDownloadEventListeners();
    setupFolderSelectionListeners();
  });
}

// Start the application
init();
