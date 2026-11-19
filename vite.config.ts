import { defineConfig } from "vite";
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [
    swc.vite({
      tsconfigFile: false,
      jsc: {
        target: "es2022",
        parser: {
          syntax: "typescript",
          tsx: true,
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          react: {
            runtime: "automatic",
            development: false,
          },
        },
      },
    }),
  ],
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: "0.0.0.0",
    port: 8111,
    strictPort: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 8111,
  },
});
