const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dirTree = require('directory-tree');

let mainWindow;
let activeDownloads = new Map();  // Declare activeDownloads to track ongoing downloads
let isPaused = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.webContents.openDevTools();
    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Directory Selection
ipcMain.on('select-download-directory', (event) => {
    dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
    }).then(result => {
        if (!result.canceled) {
            event.reply('selected-directory', result.filePaths[0]);
        }
    }).catch(err => {
        event.reply('processing-error', `Directory selection failed: ${err.message}`);
    });
});

// Payload Processing
// ipcMain.on('process-payload', async (event, payload, basePath) => {
//     try {
//         if (!fs.existsSync(basePath)) {
//             fs.mkdirSync(basePath, { recursive: true });
//         }
//         await processPayloadWithResume(event, payload, basePath);
//     } catch (error) {
//         event.reply('processing-error', `Processing failed: ${error.message}`);
//     }
// });

// Modify the processPayloadWithResume function
async function processPayloadWithResume(event, payload, basePath) {
    try {
        for (const item of payload) {
            try {
                if (isPaused) {
                    await new Promise(resolve => {
                        const interval = setInterval(() => {
                            if (!isPaused) {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 500);
                    });
                }

                const folderPath = item.foldername ? path.join(basePath, item.foldername.trim()) : basePath;
                console.log(`Creating folder: ${folderPath}`);

                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                const filePath = path.join(folderPath, item.filename);
                
                if (fs.existsSync(filePath)) {
                    const stats = await fs.promises.stat(filePath);
                    if (stats.size > 0) {
                        // File already exists and has a size > 0, consider it complete
                        event.reply('file-download-complete', {
                            filePath: path.relative(basePath, filePath),
                            size: stats.size
                        });
                        continue; // Skip this file since it's already downloaded
                    }
                }

                await downloadFileWithPause(item.url, filePath, event);
                
            } catch (error) {
                if (error.message !== 'Download cancelled') {
                    event.reply('processing-error', `Failed to process ${item.filename}: ${error.message}`);
                    throw error; // Re-throw to trigger the catch block below
                }
            }
        }

        if (!isPaused) {
            const tree = generateDirectoryTree(basePath);
            event.reply('display-directory-tree', tree);
            event.reply('downloads-complete');
        }
    } catch (error) {
        event.reply('processing-error', `Processing failed: ${error.message}`);
        throw error;
    }
}

// Helper function for file download
async function downloadFileWithPause(url, filePath, event) {
    const downloadId = `${url}-${Date.now()}`;
    
    try {
        const response = await axios({
            method: 'get',
            url,
            responseType: 'stream',
            timeout: 30000
        });

        const totalSize = parseInt(response.headers['content-length'], 10) || 0;
        let downloadedSize = 0;

        // Check for existing partial download
        let startFrom = 0;
        if (fs.existsSync(filePath)) {
            const stats = await fs.promises.stat(filePath);
            startFrom = stats.size;
            if (startFrom > 0) {
                response.data.destroy(); // Close the previous stream
                return downloadFileWithPause(url, filePath, event); // Retry with resume headers
            }
        }

        const writer = fs.createWriteStream(filePath, {
            flags: startFrom > 0 ? 'r+' : 'w'
        });

        // Store active download for pause/resume
        activeDownloads.set(downloadId, { response, writer });

        response.data.on('data', (chunk) => {
            if (isPaused) {
                response.data.pause();
                return;
            }
            
            downloadedSize += chunk.length;
            const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
            event.reply('download-progress', {
                filePath: path.relative(path.dirname(filePath), filePath),
                progress,
                downloadedSize,
                totalSize
            });
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });

    } finally {
        activeDownloads.delete(downloadId);
    }
}

// Generate directory tree
function generateDirectoryTree(rootPath) {
    const tree = dirTree(rootPath, {
        normalizePath: true,
        exclude: /node_modules|\.git/
    });

    function formatTree(node, depth = 0, isLast = false) {
        const indent = ' '.repeat(depth * 4);
        let result = `${indent}${depth > 0 ? (isLast ? '└── ' : '├── ') : ''}${node.name}\n`;
        
        if (node.children) {
            node.children.forEach((child, i) => {
                result += formatTree(child, depth + 1, i === node.children.length - 1);
            });
        }
        return result;
    }

    return formatTree(tree);
}

// ipc fucntions
ipcMain.on('pause-downloads', () => {
    isPaused = true;
    activeDownloads.forEach(download => {
        if (download.response && download.response.data) {
            download.response.data.pause(); // Pause the download stream
        }
    });
});

ipcMain.on('resume-downloads', (event, payload, basePath) => {
    isPaused = false;
    activeDownloads.forEach(download => {
        if (download.response && download.response.data) {
            download.response.data.resume(); // Resume the download stream
        }
    });
    processPayloadWithResume(event, payload, basePath);
});

ipcMain.on('cancel-downloads', () => {
    isPaused = false;
    activeDownloads.forEach(download => {
        if (download.response && download.response.data) {
            download.response.data.destroy(); // Cancel the download
        }
        if (download.writer) {
            download.writer.end(); // Close the file writer
        }
    });
    activeDownloads.clear();
});


// Create the parent folder first
ipcMain.on('create-parent-folder', (event, parentFolderPath) => {
    try {
        console.log(`Creating parent folder at: ${parentFolderPath}`); // Debugging
        
        // Ensure the parent folder exists
        if (!fs.existsSync(parentFolderPath)) {
            fs.mkdirSync(parentFolderPath, { recursive: true });
            console.log(`Parent folder created at: ${parentFolderPath}`);
        }

        // Now, proceed with the payload processing
        event.reply('parent-folder-created', parentFolderPath);
    } catch (error) {
        event.reply('processing-error', `Failed to create parent folder: ${error.message}`);
    }
});

// Process the payload after the parent folder is created
ipcMain.on('process-payload', async (event, payload, basePath) => {
    try {
        console.log(`Base path for downloading files: ${basePath}`);
        
        // Now, process each file inside the parent folder
        await processPayloadWithResume(event, payload, basePath);
    } catch (error) {
        event.reply('processing-error', `Processing failed: ${error.message}`);
    }
});
