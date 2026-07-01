/**
 * preload.js
 * ----------
 * Context-isolated bridge between the Electron main process and the renderer.
 *
 * Exposes a single, minimal, audited API surface on ``window.electpynasa``
 * so the renderer cannot accidentally touch Node APIs directly.
 *
 * Every method is a thin promise-returning wrapper around
 * ``ipcRenderer.invoke``. No event emitters, no synchronous IPC, no
 * passthrough of native objects — except ``childProcess.spawn`` which is
 * required to stream Python pipeline output line-by-line.
 */

const { contextBridge, ipcRenderer } = require('electron');
const { spawn } = require('child_process');
const process = require('process');

contextBridge.exposeInMainWorld('electpynasa', {
    /**
     * Open a native file-picker dialog and return the selected path
     * (or null if cancelled).
     * @param {Object} [options]
     * @param {Array<{name: string, extensions: string[]}>} [options.filters]
     * @param {string} [options.title]
     * @returns {Promise<string|null>}
     */
    selectFile: (options) => ipcRenderer.invoke('dialog:openFile', options || {}),

    /**
     * Resolve the Python interpreter to use.
     * @returns {Promise<string>}
     */
    resolvePython: () => ipcRenderer.invoke('env:resolvePython'),

    /**
     * Resolve a script path under scripts/.
     * @param {string} scriptRelativePath  e.g. 'ghs_stretch_grayscale.py'
     * @returns {Promise<string>}
     */
    resolveScript: (scriptRelativePath) =>
        ipcRenderer.invoke('env:resolveScript', scriptRelativePath),

    /**
     * Return the PYTHONPATH that should be set when spawning Python scripts.
     * @returns {Promise<string>}
     */
    pythonPath: () => ipcRenderer.invoke('env:pythonPath'),

    /**
     * Spawned-process facade. Exposed so the renderer can stream pipeline
     * stdout line-by-line in real time. Only `spawn` is exposed — `exec`,
     * `execFile`, and `fork` are intentionally omitted to keep the attack
     * surface minimal.
     */
    childProcess: { spawn },

    /**
     * Process facade (for `process.env` / `process.platform` only).
     */
    process: {
        env: process.env,
        platform: process.platform,
    },
});
