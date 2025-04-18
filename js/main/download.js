const fs = require("fs");
const path = require("path");
const axios = require("axios");

let activeDownloads = new Map();
let isPaused = false;

async function downloadFileWithPause(url, filePath, event) {
  const downloadId = `${url}-${Date.now()}`;

  try {
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
      timeout: 30000,
    });

    const totalSize = parseInt(response.headers["content-length"], 10) || 0;
    let downloadedSize = 0;

    let startFrom = 0;
    if (fs.existsSync(filePath)) {
      const stats = await fs.promises.stat(filePath);
      startFrom = stats.size;
      if (startFrom > 0) {
        response.data.destroy();
        return downloadFileWithPause(url, filePath, event);
      }
    }

    const writer = fs.createWriteStream(filePath, {
      flags: startFrom > 0 ? "r+" : "w",
    });

    activeDownloads.set(downloadId, { response, writer });

    response.data.on("data", (chunk) => {
      if (isPaused) {
        response.data.pause();
        return;
      }

      downloadedSize += chunk.length;
      const progress =
        totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
      event.reply("download-progress", {
        filePath: path.relative(path.dirname(filePath), filePath),
        progress,
        downloadedSize,
        totalSize,
      });
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
      response.data.on("error", reject);
    });
  } finally {
    activeDownloads.delete(downloadId);
  }
}

function pauseDownloads() {
  isPaused = true;
  activeDownloads.forEach((download) => {
    if (download.response && download.response.data) {
      download.response.data.pause();
    }
  });
}

function resumeDownloads() {
  isPaused = false;
  activeDownloads.forEach((download) => {
    if (download.response && download.response.data) {
      download.response.data.resume();
    }
  });
}

function cancelDownloads() {
  isPaused = false;
  activeDownloads.forEach((download) => {
    if (download.response && download.response.data) {
      download.response.data.destroy();
    }
    if (download.writer) {
      download.writer.end();
    }
  });
  activeDownloads.clear();
}

module.exports = {
  downloadFileWithPause,
  pauseDownloads,
  resumeDownloads,
  cancelDownloads,
  isPaused,
};
