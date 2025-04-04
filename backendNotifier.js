// backendNotifier.js
const fetch = require('node-fetch');

async function notifyBackend(status, errorMessage, downloadReqId) {
    const url = `http://127.0.0.1:9600/pybackend/public/download-ready/`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reqId: downloadReqId,
                status: status,
                error: errorMessage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log(`Successfully notified backend about download status: ${status}`);
    } catch (error) {
        console.error(`Failed to notify backend: ${error.message}`);
    }
}

module.exports = { notifyBackend };
