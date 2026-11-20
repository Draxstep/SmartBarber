module.exports = {
  globDirectory: "dist",
  globPatterns: [
    "index.html",
    "backoffice.html",
    "offline.html",
    "styleguide.html",
    "manifest.json",
    "assets/*.{css,js}",
    "icons/*.png"
  ],
  globIgnores: [
    "lib/**/*",
    "sw.js",
    "sw-propio.js",
    "workbox-*.js"
  ],
  swSrc: "public/sw-propio.js",
  swDest: "dist/sw.js"
};
