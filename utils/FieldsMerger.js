const slug = require('speakingurl');

var Merger = function(manager, id, options, rulesKey) {
  this.manager = manager;
  this.id = id;
  this.idName = 'merger-' + id;
  this.options = options;
  this.rulesKey = rulesKey;
  this.createRow();
};

Merger.prototype.createRow = function() {
  var dropzone   = document.createElement('div');
  var list       = document.createElement('ol');
  var getGeoWrap = document.createElement('span');
  var fields     = [];

  getGeoWrap.className = 'hidden';
  getGeoWrap.innerText = 'Get Geolocations';
  dropzone.id          = this.idName;
  dropzone.classList.add('dropzone', 'empty');

  /*======================================
  =            Existing Fields            =
  ======================================*/
  if (this.rulesKey) {
    var rules = this.manager.rules.merge[this.rulesKey];
    var innerFields = rules.fields;

    innerFields.forEach(function(fieldKey) {
      var field = this.manager.form.querySelector('[data-key="' + fieldKey + '"]');
      this.moveElement(field, this.manager.form, list);
      fields.push(fieldKey);
    }.bind(this));
  }
  /*=====  End of Existing Fields  ======*/

  /*=====================================
  =            New Key Input            =
  =====================================*/
  var newKey = document.createElement('input');
  var _saveValue = '';

  newKey.className = 'merge-new-key';
  if (this.rulesKey) {
    newKey.value = _saveValue = this.rulesKey;
    dropzone.classList.remove('empty');
  }

  newKey.onchange = function(event) {
    var value = event.target.value;
    this.manager.updateRulesObj('merge', _saveValue, null, false);
    this.manager.updateRulesObj('validate', _saveValue, null, false);

    this.manager.updateRulesObj('merge', value, {fields: fields, type: choose.value}, value.length > 0);
    this.manager.updateRulesObj('validate', value, validateAs.value, validateAs.value);

    _saveValue = value;

    this.manager.updateSample();

    return false;
  }.bind(this);

  dropzone.appendChild(newKey);
  /*=====  End of New Key Input  ======*/

  /*==================================
  =            Merge Type            =
  ==================================*/
  var choose = this.selectType();

  if (this.manager.rules.merge.hasOwnProperty(_saveValue)) {
    choose.value = this.manager.rules.merge[_saveValue].type;
  }

  choose.onchange = function(event) {
    var val = event.target.value;

    if (_saveValue.length > 0) {
      this.manager.rules.merge[_saveValue].type = val;
    }

    this.manager.updateSample();

    if (val === 'object') {
      var fields = dropzone.querySelectorAll('.new-key');

      for (var i = fields.length - 1; i >= 0; i--) {
        fields[i].style.display = 'inline-block';
      }
    }

    return false;
  }.bind(this);

  dropzone.appendChild(choose);
  /*=====  End of Merge Type  ======*/

  /*======================================
  =            Validate field            =
  ======================================*/
  function isPlaceField(type, getGeoWrap) {
    if (type === 'place') {
      getGeoWrap.classList.remove('hidden');
    }
  }
  var validateAs = this.manager.validateForm(_saveValue);

  if (this.manager.rules.validate.hasOwnProperty(_saveValue)) {
    var valType = this.manager.rules.validate[_saveValue];
    validateAs.value = valType;

    isPlaceField(valType, getGeoWrap);
  }

  validateAs.onchange = () => {
    let type = validateAs.value;
    isPlaceField(type, getGeoWrap);
    this.manager.updateRulesObj('validate', _saveValue, type, type);

    this.manager.updateSample();
    return false;
  };

  dropzone.appendChild(validateAs);
  /*=====  End of Validate field  ======*/

  /*=======================================
  =            Get Geolocation            =
  =======================================*/
  var getGeo   = document.createElement('input');
  getGeo.type  = 'checkbox';
  getGeo.value = 'getGeo';

  if (this.manager.rules.merge.hasOwnProperty(_saveValue)) {
    var geoChecked = !!this.manager.rules.merge[_saveValue].getGeo;
    getGeo.checked = this.manager.needsGeoDB = geoChecked;
  }

  getGeo.onclick = function(event) {
    var geoChecked = event.target.checked;
    this.manager.rules.merge[_saveValue].getGeo = geoChecked;
    this.manager.needsGeoDB = geoChecked;
    this.manager.updateSample();
  }.bind(this);

  getGeoWrap.appendChild(getGeo);
  dropzone.appendChild(getGeoWrap);
  /*=====  End of Get Geolocation  ======*/

  /*===================================
  =            Fields List            =
  ===================================*/
  list.className     = 'merging-fields';
  dropzone.appendChild(list);
  /*=====  End of Fields List  ======*/

  /*=====================================
  =            Delete Merger            =
  =====================================*/
  var del        = document.createElement('button');
  del.className      = 'delete-merger';
  del.innerText      = 'Delete';

  del.onclick = function(event) {
    var key = newKey.value;
    var fields = this.manager.rules.merge[key].fields;

    fields.forEach(function(fieldKey) {
      var field = list.querySelector('[data-key="' + fieldKey + '"]');
      this.moveElement(field, list, this.manager.form);
      field.classList.remove('on-drop-zone');
      field.dataset.parent = 'form';
    }.bind(this));

    var d = this.manager.cleaner.silentRemove(key);
    this.manager.updateSample(d);

    delete this.manager.rules.merge[key];
    if (this.manager.rules.validate.hasOwnProperty(key)) {
      delete this.manager.rules.validate[key];
    }

    this.manager.deleteMerger(this.id);
    this.manager.mergersContainer.removeChild(dropzone);
    this.manager.updateSample();
    return false;
  }.bind(this);

  dropzone.appendChild(del);
  /*=====  End of Delete Merger  ======*/

  /*=======================================
  =            Dropzone Events            =
  =======================================*/
  dropzone.ondragenter = function(event) {
    event.target.classList.add('active');
    return false;
  };

  dropzone.ondragover = function(event) {
    event.preventDefault();
    return false;
  };

  dropzone.ondragleave = function(event) {
    event.target.classList.remove('active');
    return false;
  };

  dropzone.ondrop = function(event) {
    event.preventDefault();
    event.target.classList.remove('active');
    newKey.className = choose.className = '';

    var element = this.manager.itemDragged;
    var parentId = element.dataset.parent;

    if (parentId === 'form' || parentId !== this.idName) {
      var parent = parentId === 'form' ? this.manager.form : document.querySelector('#' + parentId + ' ol');
      var changedKey = element.querySelector('.new-key').value;
      var keyName = changedKey.length > 0 ? changedKey : element.querySelector('.label').textContent;

      this.moveElement(element, parent, list);
      event.target.classList.remove('empty');
      fields.push(keyName);
    }

    return false;
  }.bind(this);
  /*=====  End of Dropzone Events  ======*/

  this.manager.mergersContainer.appendChild(dropzone);
};

Merger.prototype.moveElement = function(element, parent, target) {
  element.classList.add('on-drop-zone');
  element.dataset.parent = this.idName;

  element = parent.removeChild(element);
  target.appendChild(element);
};

Merger.prototype.selectType = function() {
  var mergeAs = document.createElement('select');
  mergeAs.className = 'merge-type';

  for (var key in this.options) {
    var op = document.createElement('option');
    op.value = key;
    op.innerText = this.options[key];
    mergeAs.appendChild(op);
  }

  return mergeAs;
};

module.exports = Merger;
