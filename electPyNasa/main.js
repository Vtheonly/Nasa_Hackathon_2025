const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 850,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // We'll create this small file
            nodeIntegration: true,
            contextIsolation: false, // Required for `require` in renderer
        },
        title: "electPyNasa Image Processor",
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Handle file selection dialog
ipcMain.handle('select-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['tif', 'tiff', 'fits'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (canceled) {
        return;
    } else {
        return filePaths[0];
    }
});