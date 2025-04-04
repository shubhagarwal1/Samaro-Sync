// renderer.js
const { ipcRenderer } = require('electron');
const path = require('path');

// State
const state = {
    isDownloading: false,
    isPaused: false,
    isCancelled: false,
    currentPayload: null,
    zip_file_name: null,
    downloadPath: null,
    downloadReqId: null,
    stats: { files: 0, size: 0 }
};

// DOM Elements
const elements = {
    urlInput: document.getElementById('payloadUrlInput'),
    fetchBtn: document.getElementById('fetchPayloadBtn'),
    processBtn: document.getElementById('processPayloadBtn'),
    logArea: document.getElementById('processingLog'),
    treeArea: document.getElementById('directoryTree'),
    fileCount: document.getElementById('totalFiles'),
    sizeCount: document.getElementById('totalSize'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    cancelBtn: document.getElementById('cancelBtn')
};

// Initialize
function init() {
    resetState();
    setupEventListeners();
}

function setupEventListeners() {
    elements.fetchBtn.addEventListener('click', fetchPayload);
    elements.processBtn.addEventListener('click', processPayload);
    elements.pauseBtn.addEventListener('click', pauseDownloads);
    elements.resumeBtn.addEventListener('click', resumeDownloads);
    elements.cancelBtn.addEventListener('click', cancelDownloads);

    // IPC Handlers
    ipcRenderer.on('selected-directory', handleDirectorySelected);
    ipcRenderer.on('download-progress', updateDownloadProgress);
    ipcRenderer.on('file-download-complete', updateFileStats);
    ipcRenderer.on('display-directory-tree', showDirectoryTree);
    ipcRenderer.on('processing-error', handleError);
}

// Main Functions
async function fetchPayload() {
    const url = elements.urlInput.value.trim();
    if (!url) {
        log('Please enter a valid URL', 'error');
        return;
    }

    resetState();
    log(`Fetching payload from: ${url}`, 'info');

    try {
        const response = await fetch(url);
        const payload = await response.json();
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        if (payload['data']) {
            log(`Error fetching payload: ${payload['data']}`, 'error');
        }
        
        state.currentPayload = normalizePayload(payload);
        state.downloadReqId = payload.download_req_id; // Store the request ID
        state.zip_file_name = payload.zip_file_name; // Store the request ID
        
        if (!validatePayload(state.currentPayload)) {
            throw new Error('Invalid payload structure');
        }

        log(`Successfully fetched payload with ${state.currentPayload.length} items`, 'success');
        toggleElement(elements.processBtn, false);
    } catch (error) {
        log(`Failed to fetch payload: ${error.message}`, 'error');
    }
}

async function notifyBackend(status, errorMessage = '') {
    if (!state.downloadReqId) return;

    const url = `http://127.0.0.1:9600/pybackend/public/download-ready/`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reqId: state.downloadReqId, status: status, error: errorMessage })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        log(`Successfully notified backend about download status: ${status}`, 'success');
    } catch (error) {
        log(`Failed to notify backend: ${error.message}`, 'error');
    }
}

function processPayload() {
    if (!state.currentPayload) {
        log('No payload loaded', 'error');
        return;
    }

    const folderName = state.zip_file_name || 'downloads';
    console.log(`Folder name: ${folderName}`); // Debugging
    log(`Preparing to download to folder: ${folderName}`, 'info');
    console.log(`Download path: ${state.downloadPath}`); // Debugging
    // state.downloadPath = path.join(state.downloadPath, folderName); 
    ipcRenderer.send('select-download-directory');
}


function handleDirectorySelected(event, path) {
    state.downloadPath = path;
    state.isDownloading = true;
    state.isCancelled = false;
    state.isPaused = false;

    log(`Download directory: ${path}`, 'info');
    updateButtonStates();
    ipcRenderer.send('process-payload', state.currentPayload, path);
}

// Download Control Functions
function pauseDownloads() {
    state.isPaused = true;
    ipcRenderer.send('pause-downloads');
    log('Downloads paused', 'warning');
    updateButtonStates();
}

function resumeDownloads() {
    state.isPaused = false;
    ipcRenderer.send('resume-downloads', state.currentPayload, state.downloadPath);
    log('Downloads resumed', 'success');
    updateButtonStates();
}

function cancelDownloads() {
    state.isCancelled = true;
    state.isPaused = false;
    ipcRenderer.send('cancel-downloads');
    log('Downloads cancelled', 'error');
    updateButtonStates();
}

// UI Update Functions
function updateDownloadProgress(event, { filePath, progress }) {
    log(`Downloading ${filePath}: ${progress}%`, 'info');
}

function updateFileStats(event, { filePath, size }) {
    // Update stats only if it's a new file or the file has been completed
    if (!state.stats[filePath]) {
        state.stats[filePath] = { size: 0, completed: false }; // Track individual files
    }

    if (!state.stats[filePath].completed) {
        state.stats[filePath].size = size; // Update file size
        state.stats[filePath].completed = true; // Mark this file as completed
        state.stats.files++;
        state.stats.size += size;

        // Update the total stats display
        updateStatsDisplay();
        log(`Downloaded: ${filePath}`, 'success');
    }
}

function updateDownloadProgress(event, { filePath, progress, downloadedSize, totalSize }) {
    // Prevent updating stats for the same file while downloading
    if (state.stats[filePath] && state.stats[filePath].completed) {
        return; // Don't update stats if the file is already completed
    }

    log(`Downloading ${filePath}: ${progress}%`, 'info');
}


function showDirectoryTree(event, tree) {
    elements.treeArea.innerHTML = `<pre>${tree}</pre>`;
    log('All downloads completed!', 'success');
    toggleElement(elements.processBtn, false);
    notifyBackend(0); // 0 means success
}

function handleError(event, message) {
    log(message, 'error');
    state.isDownloading = false;
    updateButtonStates();
    notifyBackend(1, message); // 1 means failure
}

// Helper Functions
function normalizePayload(payload) {
    if (Array.isArray(payload)) return payload;

    if (payload.medias && typeof payload.medias === 'object') {
        const result = [];
        for (const [folderName, files] of Object.entries(payload.medias)) {
            for (const [url, filename] of Object.entries(files)) {
                result.push({ url, filename, foldername: folderName });
            }
        }
        return result;
    }
    return [];
}

function validatePayload(payload) {
    return Array.isArray(payload) && payload.length > 0 && payload.every(item => item.url && item.filename && item.foldername);
}

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = { error: 'text-red-600', success: 'text-green-600', warning: 'text-yellow-600', info: 'text-gray-700' };

    const entry = document.createElement('div');
    entry.innerHTML = `<span class="${colors[type]}">[${timestamp}] ${message}</span>`;
    elements.logArea.appendChild(entry);
    elements.logArea.scrollTop = elements.logArea.scrollHeight;
}

function resetState() {
    state.stats = { files: 0, size: 0 };
    state.isDownloading = false;
    state.isPaused = false;
    state.isCancelled = false;

    updateStatsDisplay();
    elements.logArea.innerHTML = '<p class="text-gray-500">Processing logs will appear here...</p>';
    elements.treeArea.innerHTML = '<p class="text-gray-500">Directory structure will be displayed here...</p>';
    toggleElement(elements.processBtn, true);
}

function updateStatsDisplay() {
    elements.fileCount.textContent = state.stats.files;
    const sizeInMB = state.stats.size / (1024 * 1024);
    elements.sizeCount.textContent = sizeInMB < 1 
        ? `${(state.stats.size / 1024).toFixed(2)} KB` 
        : `${sizeInMB.toFixed(2)} MB`;
}

function updateButtonStates() {
    toggleElement(elements.pauseBtn, !state.isDownloading || state.isPaused);
    toggleElement(elements.resumeBtn, !state.isDownloading || !state.isPaused);
    toggleElement(elements.processBtn, state.isDownloading);
    toggleElement(elements.cancelBtn, !state.isDownloading);
}

function toggleElement(element, disabled) {
    element.disabled = disabled;
}

// Initialize the app
init();
