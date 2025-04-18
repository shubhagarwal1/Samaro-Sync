const { ipcRenderer } = require("electron");
const { state, setState } = require("./state");
const config = require("./config");

// Event emitter for UI updates
const EventEmitter = require("events");
const eventEmitter = new EventEmitter();

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (payload.medias && typeof payload.medias === "object") {
    const result = [];
    for (const [folderName, files] of Object.entries(payload.medias)) {
      for (const [url, filename] of Object.entries(files)) {
        result.push({ url, filename, foldername: folderName });
      }
    }
    return result;
  }
  return [];
};

const validatePayload = (payload) => {
  return (
    Array.isArray(payload) &&
    payload.length > 0 &&
    payload.every((item) => item.url && item.filename && item.foldername)
  );
};

const showOtpScreen = () => {
  const otpScreen = document.getElementById("otpScreen");
  const downloadScreen = document.getElementById("downloadScreen");

  if (otpScreen && downloadScreen) {
    otpScreen.classList.remove("hidden");
    downloadScreen.classList.add("hidden");

    // Reset OTP inputs
    const otpInputs = document.querySelectorAll(".otp-input");
    otpInputs.forEach((input) => {
      input.value = "";
      input.classList.remove("error");
    });

    // Clear OTP log
    const otpLogArea = document.getElementById("otpProcessingLog");
    if (otpLogArea) {
      otpLogArea.innerHTML = "";
    }

    // Focus first OTP input
    if (otpInputs.length > 0) {
      otpInputs[0].focus();
    }
  }
};

const showDownloadScreen = () => {
  document.getElementById("otpScreen").classList.add("hidden");
  document.getElementById("downloadScreen").classList.remove("hidden");
};

const fetchPayload = async (otp) => {
  // Validate OTP format
  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    eventEmitter.emit("otpLog", "Please enter a valid 6-digit OTP", "error");
    eventEmitter.emit("clearOtpInputs");
    return null;
  }

  const url = `${config.baseUrl}?otp=${otp}`;
  eventEmitter.emit("otpLog", "Validating OTP...", "info");

  try {
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (payload["error"]) {
      eventEmitter.emit("otpLog", `${payload["error"]}`, "error");
      eventEmitter.emit("clearOtpInputs");
      return null;
    }

    const normalizedPayload = normalizePayload(payload);
    setState({
      currentPayload: normalizedPayload,
      downloadReqId: payload.download_req_id,
    });

    if (!validatePayload(normalizedPayload)) {
      throw new Error("Invalid payload structure");
    }

    eventEmitter.emit(
      "otpLog",
      `OTP validated successfully! Found ${normalizedPayload.length} items to download.`,
      "success"
    );

    // Return payload with file count
    return {
      ...payload,
      fileCount: normalizedPayload.length,
    };
  } catch (error) {
    eventEmitter.emit("otpLog", `${error.message}`, "error");
    eventEmitter.emit("clearOtpInputs");
    return null;
  }
};

const notifyBackend = async (status, errorMessage = "") => {
  if (!state.downloadReqId) return;

  // Use the correct backend URL
  const url = config.baseUrl;

  try {
    const requestBody = {
      reqId: state.downloadReqId,
      status: status,
    };

    // Only add error field if there's an error message
    if (status === 1 && errorMessage) {
      requestBody.error = errorMessage;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    eventEmitter.emit(
      "log",
      `Successfully notified backend about download status: ${status}`,
      "success"
    );
  } catch (error) {
    eventEmitter.emit(
      "log",
      `Failed to notify backend: ${error.message}`,
      "error"
    );
  }
};

module.exports = {
  fetchPayload,
  notifyBackend,
  normalizePayload,
  validatePayload,
  eventEmitter,
  showOtpScreen,
  showDownloadScreen,
};
