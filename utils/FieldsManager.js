const path      = require('path');
const Merger    = require('./FieldsMerger');
const Cleaner   = require('./DataCleaner');
const Prism     = require('prismjs');
const Dialogs   = require('dialogs');

var Manager = function(file, rules, fieldsMeta, data, ipc, dbManager) {
  this.file       = file;
  this.rules      = rules;
  this.fieldsMeta = fieldsMeta;
  this.ipc        = ipc;
  this.dbManager  = dbManager;

  this.container   = document.getElementById('files-page-wrapper');
  this.geoDBLoaded = false;
  this.needsGeoDB  = false;
  this.itemDragged;

  this.cleaner = new Cleaner(data, this);

  this.initSave();
  this.initValidate();
  this.initExport();
  this.initSaveTemplate();
  this.initFields(fieldsMeta);
  this.initMergers();
  this.initSample();
};

/*----------  Save  ----------*/
Manager.prototype.initSave = function() {
  var save = document.createElement('button');
  save.innerText = 'Save';
  save.onclick = function() {
    this.ipc.send('save-rules', this.file, this.rules);
    return false;
  }.bind(this);

  this.container.appendChild(save);
};

/*----------  Validate  ----------*/
Manager.prototype.initValidate = function() {
  var validate = document.createElement('button');
  validate.innerText = 'Validate';
  validate.onclick = function() {
    if (this.needsGeoDB && !this.geoDBLoaded) {
      this.dbManager.initGeoDB(function() {
        this.geoDBLoaded = true;
        this.validateSet();
      }.bind(this));
    } else {
      this.validateSet();
    };

    return false;
  }.bind(this);

  this.container.appendChild(validate);
};

Manager.prototype.validateSet = function() {
  var set = this.cleaner.runValidationOnSet(this.rules);
  this.updateSample();
  console.log('Validation test complete');
};

Manager.prototype.validateForm = function(key) {
  var options = [
    {key: 'dateUTC', text: 'Date UTC'},
    {key: 'dateCol', text: 'Date TZ -5'},
    {key: 'dateMex', text: 'Date Mexico'},
    {key: 'place', text: 'Place'}
  ];
  var validateAs = document.createElement('select');
  var none = document.createElement('option');

  validateAs.className = 'validate-as';
  none.value = '';
  none.innerText = 'Select one to validate field';
  validateAs.appendChild(none);

  options.forEach(function(option) {
    var validateOption = document.createElement('option');
    validateOption.innerText = option.text;
    validateOption.value = option.key;
    validateAs.appendChild(validateOption);
  });

  if (this.rules.validate.hasOwnProperty(key)) {
    validateAs.value = this.rules.validate[key];
  }

  return validateAs;
};

/*----------  Export  ----------*/
Manager.prototype.initExport = function() {
  var btn = document.createElement('button');
  btn.innerText = 'Export JSON';

  btn.onclick = function() {
    var set = this.cleaner.runValidationOnSet(this.rules);
    this.createFile(set);
    return false;
  }.bind(this);

  this.container.appendChild(btn);
};

Manager.prototype.createFile = function(data) {
  data = typeof data === 'string' ? data : JSON.stringify(data);

  var blob     = new Blob([data], {type: 'text/json'});
  var url      = window.URL.createObjectURL(blob);
  var a        = document.createElement('a');
  var fileName = path.parse(this.file).name + '.json';

  a.textContent = a.download = fileName;
  a.href = url;
  a.click();
};

/*----------  Save Template  ----------*/
Manager.prototype.initSaveTemplate = function() {
  var btn = document.createElement('button');
  btn.innerText = 'Save as Template';

  btn.onclick = function() {
    let dialogs = Dialogs();
    dialogs.prompt('Template name:', '', templateName => {
      if (templateName) {
        ipc.send('save-as-template', templateName, this.fieldsMeta, this.rules);
      } else {
        console.log('template not saved');
      }
    });

    return false;
  }.bind(this);

  this.container.appendChild(btn);
};

/*----------  Fields  ----------*/
Manager.prototype.initFields = function(fields) {
  this.form = document.createElement('ul');
  this.form.className = 'fields';

  fields.forEach(function(field) {
    var wrapper    = document.createElement('li');
    var label      = document.createElement('span');
    var validateAs = this.validateForm(field);
    var br         = document.createElement('br');

    label.className = 'label';
    label.innerText = field;

    /*----------  Wrapper  ----------*/
    wrapper.draggable   = true;
    wrapper.dataset.key = field;
    wrapper.className   = 'field';
    wrapper.ondragstart = function(event) {
      var target = event.target;

      if (!target.classList.contains('on-drop-zone')) {
        target.dataset.parent = 'form';
      }

      this.itemDragged = event.target;
    }.bind(this);

    /*----------  New Key  ----------*/
    var input       = document.createElement('input');
    input.type      = 'text';
    input.className = 'new-key';
    input.name      = field;

    if (this.rules.rename.hasOwnProperty(field)) {
      input.value = this.rules.rename[field];
    }

    input.onchange  = function(event) {
      var value = event.target.value;
      this.updateRulesObj('rename', event.target.name, value, value.length > 0);
      this.updateSample();

      return false;
    }.bind(this);

    /*----------  Include Checkbox  ----------*/
    var include = document.createElement('input');
    include.type = 'checkbox';
    include.value = field;

    include.checked = this.rules.remove.indexOf(field) < 0;
    includeUpdateDisplay(include.checked);

    include.onchange = includeCheckboxEvent.bind(this);

    function includeCheckboxEvent(event) {
      var value = event.target.value;
      var checked = event.target.checked;

      includeUpdateDisplay(checked);
      this.updateRulesArr('remove', value, !checked);
      this.updateSample();

      return false;
    }

    function includeUpdateDisplay(checked) {
      if (!checked) {
        wrapper.classList.add('inactive');
        wrapper.draggable = false;
      } else {
        wrapper.classList.remove('inactive');
        wrapper.draggable = true;
      }
    }

    /*----------  Validate As  ----------*/
    validateAs.onchange = function() {
      this.updateRulesObj('validate', input.name, validateAs.value, validateAs.value);

      return false;
    }.bind(this);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(include);
    wrapper.appendChild(validateAs);
    wrapper.appendChild(br);
    this.form.appendChild(wrapper);

  }.bind(this));

  this.container.appendChild(this.form);
};

/*----------  Sample  ----------*/
Manager.prototype.initSample = function() {
  var codeWrapper = document.createElement('pre');
  this.sample = document.createElement('code');
  var toggle = document.createElement('button');

  codeWrapper.classList.add('language-js', 'sample-data', 'preview-changed');

  toggle.className = 'toggle-data';
  toggle.innerText = 'Export Preview';

  toggle.onclick = function(event) {
    event.target.classList.toggle('active');
    this.sample.classList.toggle('preview-changed');

    if (event.target.classList.contains('active')) {
      var range = this.rules.range;
      var sampleData = this.cleaner.sliceSample(range[0], range[1]);
      event.target.innerText = 'Raw Preview';
      sampleData = this.cleaner.sort(sampleData);

      var code = Prism.highlight(JSON.stringify(sampleData, null, 2), Prism.languages.javascript);
      this.sample.innerHTML = code;
    } else {
      event.target.innerText = 'Export Preview';
      this.updateSample();
    }
    return false;
  }.bind(this);

  this.container.appendChild(toggle);
  codeWrapper.appendChild(this.sample);
  this.container.appendChild(codeWrapper);
  this.updateSample();
};

Manager.prototype.updateSample = function(sample) {
  sample = sample || this.cleaner.clean(this.rules);

  var code = Prism.highlight(JSON.stringify(sample, null, 2), Prism.languages.javascript);
  this.sample.innerHTML = code;
};

/*----------  Mergers  ----------*/
Manager.prototype.initMergers = function() {
  this.mergersContainer = document.createElement('div');
  this.mergers = {};
  var mergerIds = 0;
  var mergingOptions = {
    stringComma: 'Comma separated string',
    stringSpace: 'Space separated string',
    stringHyphen: 'Hyphen separated string',
    array: 'Array',
    object: 'Object'
  };

  var addMerger = document.createElement('button');
  addMerger.innerText = '+ merge fileds';

  var currentMergers = Object.keys(this.rules.merge);
  if (currentMergers.length > 0) {
    currentMergers.forEach(function(key) {
      var id = ++mergerIds;
      this.mergers[id] = new Merger(this, id, mergingOptions, key);
    }.bind(this));
  }

  addMerger.onclick = function() {
    var id = ++mergerIds;
    this.mergers[id] = new Merger(this, id, mergingOptions);
    return false;
  }.bind(this);

  this.mergersContainer.appendChild(addMerger);
  this.container.appendChild(this.mergersContainer);
};

Manager.prototype.deleteMerger = function(id) {
  delete this.mergers[id];
};

/*----------  UTILS  ----------*/
Manager.prototype.updateRulesArr = function(type, value, bool) {
  if (bool) {
    this.rules[type].push(value);
  } else {
    var valueI = this.rules[type].indexOf(value);
    if (valueI > -1) {
      this.rules[type].splice(valueI, 1);
    }
  }
};

Manager.prototype.updateRulesObj = function(type, key, value, bool) {
  if (bool) {
    this.rules[type][key] = value;
  } else {
    if (this.rules[type].hasOwnProperty(key)) {
      delete this.rules[type][key];
    }
  }
};

module.exports = Manager;
