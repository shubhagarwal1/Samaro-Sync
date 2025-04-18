const { ipcRenderer } = require("electron");
const path = require("path");

// Application state
const state = {
  isDownloading: false,
  isPaused: false,
  isComplete: false,
  isCancelled: false,
  currentPayload: null,
  downloadPath: null,
  downloadReqId: null,
  stats: { files: 0, size: 0 },
  isShowingCompleteUI: false,
};

// State management functions
const getState = () => ({ ...state });

const setState = (newState) => {
  Object.assign(state, newState);
};

const resetState = () => {
  state.stats = { files: 0, size: 0 };
  state.isDownloading = false;
  state.isPaused = false;
  state.isComplete = false;
  state.isCancelled = false;
  state.currentPayload = null;
  state.downloadPath = null;
  state.downloadReqId = null;
  state.isShowingCompleteUI = false;
};

const updateStats = (newStats) => {
  state.stats = newStats;
};

module.exports = {
  state,
  getState,
  setState,
  resetState,
  updateStats,
};
