const { contextBridge } = require("electron");

const apiUrlArg = process.argv.find((item) => item.startsWith("--cv-api-url="));
if (apiUrlArg) {
  contextBridge.exposeInMainWorld(
    "__CV_CONTROL_API_URL__",
    apiUrlArg.slice("--cv-api-url=".length)
  );
}
