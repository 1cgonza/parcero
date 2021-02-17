const getTree = require('../utils/treeManager').getTree;
const ParserDB = require('../utils/ParserDB');
let webContents;
let db;

var main = function(browserWindow, ipcMain) {
  db = new ParserDB(function() {
    webContents = browserWindow.webContents;

    webContents.on('did-finish-load', init);
    ipcMain.on('get-place', getPlace);
    ipcMain.on('get-file-rules', getFileRules);
    ipcMain.on('save-rules', function(event, file, rules) {
      db.saveRules(file, rules);
    });
    ipcMain.on('save-as-template', function(event, name, structure, rules) {
      db.saveAsTemplate(name, structure, rules);
    });

    ipcMain.on('get-template', function(event, name) {
      var template = db.parser.templates.findOneUnindexed('name', name);
      webContents.send('try-template', template);
    });
  }, true);

};

function init() {
  webContents.openDevTools();

  getTree('./data', function(err, tree) {
    if (err) {
      throw err;
    }

    webContents.send('files', tree);
  });
}

function getFileRules(event, name) {
  var rules = db.getFileRules(name);
  var savedTemplates = db.parser.templates.findOneUnindexed('name', '__savedTemplates');

  webContents.send('file-data-ready', rules, savedTemplates.list);
}

function getPlace(event, place) {
  function cb(data) {
    webContents.send('place-ready', data);
  }

  if (dbManager.geoLoaded) {
    dbManager.getCoords(place, cb);
  } else {
    dbManager.initGeo(function() {
      dbManager.getCoords(place, cb);
    });
  }
}

module.exports = main;
