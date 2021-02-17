const {app, BrowserWindow, ipcMain} = require('electron');
const url = require('url');
const path = require('path');
const main = require('./main');
const client = require('electron-connect').client;

let win;

function setup() {
  win = new BrowserWindow({width: 1300, height: 900});
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'browser/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.on('closed', () => {
    win = null;
  });

  client.create(win, () => {
    main(win, ipcMain);
  });
}

app.on('ready', setup);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  if (win === null) {
    setup();
  }
});
