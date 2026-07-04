import { app, BrowserWindow } from "electron";
import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.CV_DEV_SERVER_URL;

// Without this, userData lands under the npm package name (@cv-control/desktop).
app.setName("CV Control");

let server: Server | null = null;

async function startEmbeddedApi(): Promise<string> {
  // Paths must be set before the api module loads, because openDatabase and
  // the tectonic cache resolve them at call time from process.env.
  process.env.CV_CONTROL_DB_PATH = path.join(app.getPath("userData"), "cv-control.sqlite");
  process.env.TECTONIC_CACHE_DIR = path.join(app.getPath("userData"), "tectonic-cache");

  const { createApp } = await import("@cv-control/api/app");
  const api = createApp();

  return new Promise((resolve, reject) => {
    server = api.listen(0, "127.0.0.1");
    server.once("listening", () => {
      const address = server?.address();
      if (address && typeof address === "object") {
        resolve(`http://127.0.0.1:${address.port}/api`);
      } else {
        reject(new Error("Embedded API did not report a port."));
      }
    });
    server.once("error", reject);
  });
}

async function createWindow() {
  // In dev mode the browser workflow's servers (dev:api on 4000, dev:web on
  // 5173) are reused, so nothing is embedded and the renderer falls back to
  // localhost:4000.
  const apiUrl = devServerUrl ? null : await startEmbeddedApi();

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      additionalArguments: apiUrl ? [`--cv-api-url=${apiUrl}`] : []
    }
  });

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
  } else {
    await window.loadFile(path.join(process.resourcesPath, "web", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  server?.close();
  app.quit();
});
