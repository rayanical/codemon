import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    {
      name: "react-py-init-once",
      enforce: "pre",
      // A worker-ref change triggers the library effect twice while loading.
      // Guard initialization per worker to avoid concurrent Pyodide runtimes.
      transform(source, id) {
        if (!id.includes("/react-py/dist/hooks/usePython.js")) return;
        return source
          .replace(
            "var workerRef = useRef();",
            "var workerRef = useRef(); var initializedWorkerRef = useRef();",
          )
          .replace(
            "if (workerRef.current && !isReady) {",
            "if (workerRef.current && !isReady && initializedWorkerRef.current !== workerRef.current) { initializedWorkerRef.current = workerRef.current;",
          );
      },
    },
    {
      name: "react-py-dev-worker",
      apply: "serve",
      // react-py's worker combines ESM imports with importScripts. Bundle it
      // into a classic worker for development, matching Vite's production build.
      configureServer(server) {
        const worker = buildSync({
          entryPoints: [
            require.resolve("react-py/dist/workers/python-worker.js"),
          ],
          bundle: true,
          write: false,
          format: "iife",
          platform: "browser",
        }).outputFiles[0].text;
        server.middlewares.use("/react-py-worker.js", (_req, res) => {
          res.setHeader("Content-Type", "text/javascript");
          res.end(worker);
        });
      },
      transform(source, id) {
        if (id.includes("/react-py/dist/hooks/usePython.js")) {
          return source.replace(
            "new Worker(new URL('../workers/python-worker', import.meta.url))",
            "new Worker('/react-py-worker.js')",
          );
        }
      },
    },
    react(),
  ],
  server: { strictPort: true },
  optimizeDeps: { exclude: ["react-py"] },
});
