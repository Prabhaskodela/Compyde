import { defineConfig } from "vite";
export default defineConfig({
  base: "/Compyde/",
  plugins: [{
    name: "omit-unused-cpp-precompiled-header",
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName.includes("stdc__.h.pch")) delete bundle[fileName];
      }
    },
  }],
});

