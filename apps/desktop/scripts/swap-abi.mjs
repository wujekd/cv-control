// Swaps the better-sqlite3 native binary between Electron and Node ABIs.
// Usage: node scripts/swap-abi.mjs electron|node
// The hoisted copy in the root node_modules is shared with the plain-Node dev
// flow (dev:api, api tests), so packaging must restore the node ABI afterward.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const runtime = process.argv[2];
if (runtime !== "electron" && runtime !== "node") {
  console.error("usage: node scripts/swap-abi.mjs electron|node");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const packageDir = path.dirname(require.resolve("better-sqlite3/package.json"));
const prebuildInstall = require.resolve("prebuild-install/bin.js", { paths: [packageDir] });

const args = [prebuildInstall, "--runtime", runtime, "--arch", process.arch, "--force"];
if (runtime === "electron") {
  const electronVersion = require("electron/package.json").version;
  args.push("--target", electronVersion);
}

execFileSync(process.execPath, args, { cwd: packageDir, stdio: "inherit" });
console.log(`better-sqlite3 binary now targets ${runtime}`);
