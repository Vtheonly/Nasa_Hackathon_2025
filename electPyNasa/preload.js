// preload.js
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  // You can expose specific Node.js modules to the renderer process here if needed,
  // but with contextIsolation: false, it's not strictly necessary for this example.
});