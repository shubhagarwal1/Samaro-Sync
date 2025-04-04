// downloadManager.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

let activeDownloads = new Map();
let isPaused = false;

function setDownloadPaused(state) {
    isPaused = state;
}

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

module.exports = { setDownloadPaused, downloadFileWithPause };
