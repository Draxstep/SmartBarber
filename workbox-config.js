export default {
  globDirectory: "public",
  globPatterns: [
    "index.html",
    "backoffice.html",
    "offline.html",
    "manifest.json",
    "css/*.css",
    "js/**/*.js",
    "icons/*.png"
  ],
  globIgnores: [
    "lib/**/*",
    "sw.js",
    "sw-propio.js"
  ],
  swSrc: "public/sw-propio.js",
  swDest: "public/sw.js"
};
