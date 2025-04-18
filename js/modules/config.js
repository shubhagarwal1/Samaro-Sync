const env = process.env.NODE_ENV || "dev";

const config = {
  dev: {
    baseUrl: "http://127.0.0.1:9600/pybackend/public/download-via-otp/",
  },
  uat: {
    baseUrl: "https://uat.samaro.app/pybackend/public/download-via-otp/",
  },
  production: {
    baseUrl: "https://events.samaro.ai/pybackend/public/download-via-otp/",
  },
};

module.exports = config[env] || config.development;
