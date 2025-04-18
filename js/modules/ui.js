const { ipcRenderer } = require("electron");
const { state, setState } = require("./state");
const { eventEmitter } = require("./payload");

// DOM Elements
let elements = null;
let handlers = null;

// Initialize DOM elements
const initializeElements = () => {
  elements = {
    urlInput: document.getElementById("payloadUrlInput"),
    processBtn: document.getElementById("processPayloadBtn"),
    logArea: document.getElementById("processingLog"),
    otpLogArea: document.getElementById("otpProcessingLog"),
    treeArea: document.getElementById("directoryTree"),
    fileCount: document.getElementById("totalFiles"),
    sizeCount: document.getElementById("totalSize"),
    pauseBtn: document.getElementById("pauseBtn"),
    resumeBtn: document.getElementById("resumeBtn"),
    newDownloadBtn: document.getElementById("newDownloadBtn"),
    progressBar: document.getElementById("progressBar"),
    progressPercentage: document.getElementById("progressPercentage"),
    currentFile: document.getElementById("currentFile"),
  };

  // Setup event listeners for payload events
  eventEmitter.on("log", log);
  eventEmitter.on("otpLog", otpLog);
  eventEmitter.on("updateButtons", updateButtonStates);
  eventEmitter.on("updateStats", updateStatsDisplay);
  eventEmitter.on("showDirectoryTree", showDirectoryTree);
  eventEmitter.on("clearOtpInputs", clearOtpInputs);
  eventEmitter.on("enableProcess", (enable) => {
    if (elements && elements.processBtn) {
      elements.processBtn.disabled = !enable;
    }
  });
  eventEmitter.on("updateProgress", updateProgress);

  // Setup OTP input validation
  const otpInputs = document.querySelectorAll(".otp-input");
  if (otpInputs.length > 0) {
    otpInputs.forEach((input, index) => {
      // Handle input
      input.addEventListener("input", (e) => {
        // Only allow numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, "");

        // Move to next input if current input is filled
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });

      // Handle backspace
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !e.target.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });

      // Handle paste
      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData
          .getData("text")
          .replace(/[^0-9]/g, "");
        if (pastedData.length === 6) {
          otpInputs.forEach((input, i) => {
            input.value = pastedData[i] || "";
          });
          validateOtp(pastedData);
        }
      });
    });

    // Auto-validate when all inputs are filled
    const lastInput = otpInputs[otpInputs.length - 1];
    lastInput.addEventListener("input", () => {
      if (lastInput.value.length === 1) {
        const otp = Array.from(otpInputs)
          .map((input) => input.value)
          .join("");
        if (otp.length === 6) {
          validateOtp(otp);
        }
      }
    });
  }

  return elements;
};

// Validate OTP
const validateOtp = (otp) => {
  if (otp.length !== 6) {
    eventEmitter.emit("otpLog", "OTP must be exactly 6 digits", "error");
    clearOtpInputs();
    return;
  }
  if (handlers && handlers.onFetch) {
    handlers.onFetch(otp);
  }
};

// Clear OTP inputs
const clearOtpInputs = () => {
  const otpInputs = document.querySelectorAll(".otp-input");
  otpInputs.forEach((input) => {
    input.value = "";
    input.classList.add("error");
  });
  setTimeout(() => {
    otpInputs.forEach((input) => {
      input.classList.remove("error");
    });
  }, 500);
  otpInputs[0].focus();
};

// Helper function to initialize the log area with proper structure
const initializeLogArea = () => {
  if (!elements || !elements.logArea) return;

  // Clear the log area
  elements.logArea.innerHTML = "";
  elements.logArea.classList.remove("hidden");

  // Add initial processing message
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
  elements.logArea.appendChild(processingDiv);
  elements.logArea.appendChild(logContainer);

  return logContainer;
};

// UI Update Functions
const log = (message, type = "info") => {
  if (!elements || !elements.logArea) return;

  // Only show error, success, and important info messages
  if (
    type === "error" ||
    type === "success" ||
    (type === "info" && message.includes("Download directory")) ||
    message.includes("All downloads completed")
  ) {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      error: "text-red-600",
      success: "text-green-600",
      warning: "text-yellow-600",
      info: "text-gray-700",
    };

    // Skip making the log area visible for completion messages or when showing complete UI
    if (
      !message.includes("All downloads completed") &&
      !state.isShowingCompleteUI
    ) {
      elements.logArea.classList.remove("hidden");
    }

    // Find or create the log container
    let logContainer = elements.logArea.querySelector(".text-sm.text-gray-600");
    if (!logContainer) {
      // Initialize the log area if container doesn't exist
      logContainer = initializeLogArea();
    } else {
      // Clear placeholder if it exists
      const placeholder = logContainer.querySelector(".text-gray-500");
      if (placeholder) {
        logContainer.removeChild(placeholder);
      }
    }

    // Create and add the log entry to the container
    const entry = document.createElement("p");
    entry.className = colors[type];
    entry.textContent = `[${timestamp}] ${message}`;

    // Add to the beginning of the log for newest-first ordering
    if (logContainer.firstChild) {
      logContainer.insertBefore(entry, logContainer.firstChild);
    } else {
      logContainer.appendChild(entry);
    }

    // Scroll to the top to show newest entries
    elements.logArea.scrollTop = 0;
  }
};

const otpLog = (message, type = "info") => {
  if (!elements) return;

  const colors = {
    error: "text-red-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    info: "text-gray-700",
  };

  const entry = document.createElement("div");
  entry.innerHTML = `<span class="${colors[type]}">${message}</span>`;
  elements.otpLogArea.innerHTML = ""; // Clear previous message
  elements.otpLogArea.appendChild(entry);
  elements.otpLogArea.scrollTop = elements.otpLogArea.scrollHeight;
};

const updateStatsDisplay = (stats) => {
  if (!elements) return;

  elements.fileCount.textContent = stats.files;
  const sizeInMB = stats.size / (1024 * 1024);
  elements.sizeCount.textContent =
    sizeInMB < 1
      ? `${(stats.size / 1024).toFixed(2)} KB`
      : `${sizeInMB.toFixed(2)} MB`;
};

const updateButtonStates = (state) => {
  if (!elements) return;

  // Process button (Choose Download Location)
  elements.processBtn.disabled = state.isDownloading;

  // Pause button - enabled only when downloading and not paused
  elements.pauseBtn.disabled =
    !state.isDownloading || state.isPaused || state.isComplete;

  // Resume button - enabled only when paused
  elements.resumeBtn.disabled = !state.isPaused || state.isComplete;

  // Make sure the disabled/enabled states are visually reflected
  if (elements.pauseBtn.disabled) {
    elements.pauseBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    elements.pauseBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }

  if (elements.resumeBtn.disabled) {
    elements.resumeBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    elements.resumeBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }

  // Hide pause/resume buttons and show new download button when download is complete
  if (state.isComplete) {
    elements.pauseBtn.style.display = "none";
    elements.resumeBtn.style.display = "none";
    elements.newDownloadBtn.style.display = "block";
    elements.processBtn.style.display = "none"; // Hide process button on completion

    // Show download complete UI
    showDownloadComplete();
  } else {
    elements.pauseBtn.style.display = "block";
    elements.resumeBtn.style.display = "block";
    elements.newDownloadBtn.style.display = "none";

    // Different states for the process button
    if (state.isDownloading) {
      elements.processBtn.style.display = "none"; // Hide during download
    } else {
      elements.processBtn.style.display = "block"; // Show when not downloading
    }
  }
};

// Function to format directory tree for display
const formatDirectoryTree = (tree) => {
  if (typeof tree === "string") {
    return `<pre>${tree}</pre>`;
  }

  if (!tree || typeof tree !== "object") {
    return '<p class="text-gray-600">No directory structure available</p>';
  }

  let html = '<ul class="pl-4">';

  // Sort entries to show directories first, then files
  const entries = Object.entries(tree).sort((a, b) => {
    const aIsDir = typeof a[1] === "object";
    const bIsDir = typeof b[1] === "object";
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a[0].localeCompare(b[0]);
  });

  for (const [name, content] of entries) {
    if (typeof content === "object") {
      // It's a directory
      html += `<li class="mb-1"><span class="text-blue-600">📁 ${name}/</span>`;
      html += formatDirectoryTree(content);
      html += "</li>";
    } else {
      // It's a file
      const fileIcon = getFileIcon(name);
      html += `<li class="mb-1">${fileIcon} ${name}</li>`;
    }
  }

  html += "</ul>";
  return html;
};

// Helper function to get file icon based on extension
const getFileIcon = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  const icons = {
    pdf: "📄",
    doc: "📄",
    docx: "📄",
    xls: "📊",
    xlsx: "📊",
    ppt: "📑",
    pptx: "📑",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    mp3: "🎵",
    mp4: "🎬",
    zip: "🗜️",
    rar: "🗜️",
    txt: "📝",
    html: "🌐",
    css: "🎨",
    js: "⚙️",
    json: "⚙️",
  };

  return icons[ext] || "📄";
};

const showDirectoryTree = (tree) => {
  if (!elements) return;

  // Hide the log area first
  if (elements.logArea) {
    elements.logArea.classList.add("hidden");
  }

  // Clear the tree area first
  elements.treeArea.innerHTML = "";

  // Show the tree area
  elements.treeArea.classList.remove("hidden");

  // Add tree content
  const treeContent = document.createElement("div");
  treeContent.className = "font-mono text-sm";
  treeContent.innerHTML = formatDirectoryTree(tree);
  elements.treeArea.appendChild(treeContent);

  // Call our new function to show download complete UI
  showDownloadComplete();
};

const resetUI = () => {
  if (!elements) return;

  // Clear all logs and initialize log area
  elements.otpLogArea.innerHTML = "";
  elements.treeArea.innerHTML = "";

  // Make sure the processing log is visible and directory tree is hidden
  if (elements.logArea) {
    elements.logArea.innerHTML = ""; // Clear existing content
    elements.logArea.classList.remove("hidden");
  }

  if (elements.treeArea) {
    elements.treeArea.classList.add("hidden");
  }

  // Reset UI state flag
  setState({ isShowingCompleteUI: false });

  // Initialize the log area with proper structure
  initializeLogArea();

  // Reset download status elements
  const downloadStatus = document.getElementById("downloadStatus");
  const downloadMessage = document.getElementById("downloadMessage");
  if (downloadStatus) {
    downloadStatus.textContent = "Downloading media...";
    downloadStatus.classList.remove(
      "text-green-600",
      "flex",
      "items-center",
      "justify-center"
    );

    // Remove any children (like the success icon)
    while (downloadStatus.firstChild) {
      downloadStatus.removeChild(downloadStatus.firstChild);
    }
    downloadStatus.textContent = "Downloading media...";
  }
  if (downloadMessage) {
    downloadMessage.textContent = "Relax, your download is in progress";
  }

  // Reset progress
  if (elements.progressBar) {
    elements.progressBar.style.width = "0%";
  }
  if (elements.progressPercentage) {
    elements.progressPercentage.textContent = "0%";
  }
  if (elements.currentFile) {
    elements.currentFile.textContent = "No file being downloaded";
  }

  // Reset the pause/resume buttons
  if (elements.pauseBtn) {
    elements.pauseBtn.disabled = true; // Initially disabled until download starts
    elements.pauseBtn.classList.remove(
      "active",
      "opacity-50",
      "cursor-not-allowed"
    );
    elements.pauseBtn.style.display = "block";
  }
  if (elements.resumeBtn) {
    elements.resumeBtn.disabled = true; // Initially disabled until pause is clicked
    elements.resumeBtn.classList.remove(
      "active",
      "opacity-50",
      "cursor-not-allowed"
    );
    elements.resumeBtn.style.display = "block";
  }

  // Hide process button
  elements.processBtn.style.display = "none";

  // Hide the new download button container
  const newDownloadBtnContainer = document.getElementById(
    "newDownloadBtnContainer"
  );
  if (newDownloadBtnContainer) {
    newDownloadBtnContainer.classList.add("hidden");
    newDownloadBtnContainer.classList.remove("visible");
  }

  // Reset download complete flag
  if (typeof window.resetDownloadCompleteFlag === "function") {
    window.resetDownloadCompleteFlag();
  }

  // Reset button states to default (not downloading, not paused)
  updateButtonStates({
    isDownloading: false,
    isPaused: false,
    isComplete: false,
  });
};

// UI Event Listeners
const setupUIEventListeners = (newHandlers) => {
  if (!elements) return;

  // Set the handlers for OTP validation
  handlers = newHandlers;

  elements.processBtn.addEventListener("click", handlers.onProcess);
  elements.pauseBtn.addEventListener("click", handlers.onPause);
  elements.resumeBtn.addEventListener("click", handlers.onResume);
  elements.newDownloadBtn.addEventListener("click", handlers.onNewDownload);
};

const updateProgress = (filePath, progress, downloadedSize, totalSize) => {
  if (!elements) return;

  // Update progress bar
  elements.progressBar.style.width = `${progress}%`;
  elements.progressPercentage.textContent = `${progress}%`;

  // Update current file info
  const sizeInMB = totalSize / (1024 * 1024);
  const downloadedInMB = downloadedSize / (1024 * 1024);
  elements.currentFile.textContent = `${filePath} (${downloadedInMB.toFixed(
    2
  )} MB / ${sizeInMB.toFixed(2)} MB)`;
};

// Function to show download complete UI
const showDownloadComplete = () => {
  // Set flag to prevent logs from becoming visible again
  setState({ isShowingCompleteUI: true });

  // Ensure logs are hidden
  if (elements && elements.logArea) {
    elements.logArea.classList.add("hidden");
  } else {
    // Direct DOM access as fallback
    const processingLog = document.getElementById("processingLog");
    if (processingLog) {
      processingLog.classList.add("hidden");
    }
  }

  if (typeof window.showDownloadComplete === "function") {
    window.showDownloadComplete();
  }
};

module.exports = {
  initializeElements,
  log,
  otpLog,
  updateStatsDisplay,
  updateButtonStates,
  showDirectoryTree,
  resetUI,
  setupUIEventListeners,
  clearOtpInputs,
  updateProgress,
  showDownloadComplete,
};
