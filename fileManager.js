// fileManager.js
const fs = require('fs');
const path = require('path');

async function ensureDirectoryExists(basePath) {
    if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
    }
}

async function checkAndGetFileStats(filePath) {
    if (fs.existsSync(filePath)) {
        const stats = await fs.promises.stat(filePath);
        return stats;
    }
    return null;
}

module.exports = { ensureDirectoryExists, checkAndGetFileStats };
