const ipc           = require('electron').ipcRenderer;
const buildTree     = require('../utils/treeManager').buildTree;
const FieldsManager = require('../utils/FieldsManager');
const ParserDB      = require('../utils/ParserDB');
const slug          = require('speakingurl');
const oReq          = require('../utils/dataRequest');

var openFile      = document.querySelector('.open-file');
var files         = document.getElementById('files');
var navFiles      = document.getElementById('page-files');
var filesPage     = document.getElementById('files-page-wrapper');
var navGeo        = document.getElementById('page-geo');
var geoPage       = document.getElementById('geo-page-wrapper');
var navTemplates  = document.getElementById('page-templates');
var templatesPage = document.getElementById('templates-page-wrapper');

var data        = [];
var openFileRes = [];
var openFileId  = '';
var manager;

var db = new ParserDB(null, false);

ipc.on('files', function(event, tree) {
  buildTree(tree, files, null, filesPage, navFiles, 0);
});

ipc.on('place-ready', function(event, msg) {
  console.log(msg);
});

ipc.on('try-template', function(event, template) {
  if (template.structure.length !== manager.fieldsMeta.length) {
    console.error('Data structure is different');
    return false;
  }

  for (var i = template.structure.length - 1; i >= 0; i--) {
    if (template.structure[i] !== manager.fieldsMeta[i]) {
      console.log('Structure does not match');
      return false;
    }
  };

  templatesPage.classList.remove('loading');
  resetCurrent(navFiles);
  files.classList.remove('open');
  manager = '';
  filesPage.innerHTML = '';

  manager = new FieldsManager(
    openFileId,
    template.rules,
    openFileRes.meta.fields,
    openFileRes.data,
    ipc,
    db
  );
});

ipc.on('file-data-ready', function(event, rules, templatesArr) {
  templatesPage.innerHTML = '';

  templatesArr.forEach(function(name) {
    var template = document.createElement('button');
    template.innerText = name;
    template.dataset.templateName = name;

    template.onclick = function(event) {
      ipc.send('get-template', event.target.dataset.templateName);
      templatesPage.classList.add('loading');
      return false;
    };

    templatesPage.appendChild(template);
  });

  filesPage.classList.remove('loading');
  filesPage.classList.add('current');
  manager = new FieldsManager(
    openFileId,
    rules,
    openFileRes.meta.fields,
    openFileRes.data,
    ipc,
    db
  );
});

ipc.on('geo-db-loaded', function(event) {
  manager.loadGeoData();
});

function processData(res, current, type) {
  data = res.data;
  openFile.innerText = openFileId = current.textContent;
  openFileRes = res;

  ipc.send('get-file-rules', current.textContent);
}

function resetCurrent(target) {
  if (target.classList.contains('current')) {
    if (target.id === 'page-files') {
      files.classList.toggle('open');
    }
    return;
  }

  var navItems = document.querySelectorAll('.nav-item');

  for (var i = navItems.length - 1; i >= 0; i--) {
    var wrapper = document.getElementById(navItems[i].dataset.target);

    if (navItems[i] === target) {
      wrapper.classList.add('current');
      navItems[i].classList.add('current');

      if (target.id === 'page-files') {
        files.classList.toggle('open');
      }
    } else {
      wrapper.classList.remove('current');
      navItems[i].classList.remove('current');

      if (target !== 'page-files') {
        files.classList.remove('open');
      }
    };

  };
}

navFiles.onclick = function(event) {
  resetCurrent(event.target);

  return false;
};

navGeo.onclick = function(event) {
  resetCurrent(event.target);

  if (manager && Object.keys(manager.cleaner.noGeo).length > 0) {
    geoPage.innerHTML = '';
    var noGeo = manager.cleaner.noGeo;
    var search = document.createElement('button');
    search.innerText = 'Search with Geonames API';
    geoPage.appendChild(search);
    console.log(noGeo);
    for (let name in noGeo) {
      var place = noGeo[name];

      var wrapper = document.createElement('div');
      var label   = document.createElement('span');
      var encoded = document.createElement('span');
      var lat     = document.createElement('input');
      var lon     = document.createElement('input');
      let save    = document.createElement('button');

      wrapper.id = save.value = slug(place.name);
      wrapper.dataset.name = place.name;
      wrapper.dataset.url = place.url;

      label.innerText = ' ' + place.name + ' ';
      lat.type        = lon.type = 'text';
      lat.className   = 'lat';
      lon.className   = 'lon';
      lat.placeholder = 'Latitude';
      lon.placeholder = 'Longitude';

      save.innerText = 'Save';

      save.onclick = (event) => {
        var field   = document.getElementById(event.target.value);
        var latVal  = field.querySelector('.lat').value;
        var lonVal  = field.querySelector('.lon').value;
        var nameVal = field.dataset.name;
        var urlVal  = field.dataset.url;

        if (latVal.length > 0 && !!Number(latVal) && lonVal.length > 0 && !!Number(lonVal)) {
          db.addGeo(nameVal, urlVal, Number(latVal), Number(lonVal));
          save.innerText = 'Saved';
          save.style.backgroundColor = '#24a77c';
        }
        return false;
      };

      wrapper.appendChild(label);
      wrapper.appendChild(encoded);
      wrapper.appendChild(lat);
      wrapper.appendChild(lon);
      wrapper.appendChild(save);
      geoPage.appendChild(wrapper);
    }

    search.onclick = function() {
      for (var key in noGeo) {
        var searchURL = noGeo[key].url;
        var url = 'http://api.geonames.org/searchJSON?q=' + searchURL + '&username=1cgonza';
        oReq(url, processGeo, noGeo[key].name);
      }
      return false;
    };

    function processGeo(data, name) {
      if (data.hasOwnProperty('geonames') && data.geonames.length > 0) {
        var field = document.getElementById(slug(name));
        var resGeo = data.geonames[0];
        field.querySelector('.lat').value = resGeo.lat;
        field.querySelector('.lon').value = resGeo.lng;
      }
    }

  }
  return false;
};

navTemplates.onclick = function(event) {
  resetCurrent(event.target);

  return false;
};
