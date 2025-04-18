const { ipcRenderer } = require("electron");

let folderSelectionScreen;
let fileCountText;
let selectFolderBtn;
let downloadScreen;

function initializeFolderSelection() {
  folderSelectionScreen = document.getElementById("folderSelectionScreen");
  fileCountText = document.getElementById("fileCountText");
  selectFolderBtn = document.getElementById("selectFolderBtn");
  downloadScreen = document.getElementById("downloadScreen");
}

function showFolderSelectionScreen(fileCount = 0) {
  if (!folderSelectionScreen) initializeFolderSelection();

  // Update file count text
  fileCountText.textContent = `This download includes ${fileCount.toLocaleString()} files`;

  // Hide other screens and show folder selection
  document.getElementById("otpScreen").classList.add("hidden");
  downloadScreen.classList.add("hidden");
  folderSelectionScreen.classList.remove("hidden");
}

function setupFolderSelectionListeners() {
  if (!selectFolderBtn) initializeFolderSelection();

  selectFolderBtn.addEventListener("click", () => {
    ipcRenderer.send("select-download-directory");
  });

  // Listen for selected directory from main process
  ipcRenderer.on("selected-directory", (event, path) => {
    if (path) {
      // Hide folder selection screen and show download screen
      folderSelectionScreen.classList.add("hidden");
      downloadScreen.classList.remove("hidden");
    }
  });
}

module.exports = {
  initializeFolderSelection,
  showFolderSelectionScreen,
  setupFolderSelectionListeners,
};
