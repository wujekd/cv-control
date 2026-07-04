import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/main.mjs",
  // Native module stays external and is packaged by electron-builder;
  // electron is provided by the runtime.
  external: ["electron", "better-sqlite3"],
  define: { "process.env.NODE_ENV": '"production"' },
  // CJS deps (express and friends) call require() for node builtins, which the
  // ESM output can't satisfy without a real require in scope.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"
  }
});

mkdirSync("dist", { recursive: true });
copyFileSync("src/preload.cjs", "dist/preload.cjs");
console.log("desktop build complete");
