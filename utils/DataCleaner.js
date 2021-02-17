var moment = require('moment-timezone');
const fuzz = require('fuzzball');

var Cleaner = function(data, manager) {
  this.data = data;
  this.manager = manager;
  this.validationFlag = false;
  this.noGeo = {};
  this.places = [];
};

Cleaner.prototype.clean = function(rules) {
  rules.range = this.validationFlag ? [0, this.data.length] : [0, 4];
  this.rules = rules;

  if (typeof rules.range === 'object') {
    var slice = this.sliceSample(rules.range[0], rules.range[1]);
    this.sampleData = JSON.parse(JSON.stringify(slice));
  } else {
    this.sampleData = this.data;
  }

  var sampleLength = this.sampleData.length;
  var i = sampleLength - 1;

  for (i; i >= 0; i--) {
    if (rules.remove.length > 0) {
      this.remove(i);
    }
    if (Object.keys(rules.rename).length > 0) {
      this.rename(i);
    }
    if (Object.keys(rules.merge).length > 0) {
      this.merge(i);
    }
    if (Object.keys(rules.validate).length > 0) {
      this.validate(i);
    }

    this.removeEmpty(i);
  }

  this.sampleData = this.sort(this.sampleData);
  this.validationFlag = false;

  return this.sampleData;
};

Cleaner.prototype.sliceSample = function(start, end) {
  return this.data.slice(start, end);
};

Cleaner.prototype.removeEmpty = function(i) {
  var obj = this.sampleData[i];

  for (var key in obj) {
    if (!obj[key]) {
      delete this.sampleData[i][key];
    }
  }
};

Cleaner.prototype.remove = function(i) {
  var n = this.rules.remove.length - 1;

  for (n; n >= 0; n--) {
    var key = this.rules.remove[n];
    delete this.sampleData[i][key];
  }
};

Cleaner.prototype.silentRemove = function(key) {
  for (var i = this.sampleData.length - 1; i >= 0; i--) {
    delete this.sampleData[i][key];
  }

  return this.sort(this.sampleData);
};

Cleaner.prototype.rename = function(i) {
  for (var key in this.rules.rename) {
    var newKey = this.rules.rename[key];
    this.sampleData[i][newKey] = typeof this.sampleData[i][key] === 'string' ? this.sampleData[i][key].trim() : this.sampleData[i][key];
    delete this.sampleData[i][key];
  }
};

Cleaner.prototype.merge = function(i) {
  for (var key in this.rules.merge) {
    var arr = this.rules.merge[key].fields;
    var type = this.rules.merge[key].type;

    var mergedData;
    var tempArr = [];

    for (var n = 0; n < arr.length; n++) {
      var d = this.sampleData[i][arr[n]];
      if (type === 'array' && tempArr.indexOf(d) >= 0) {
        delete this.sampleData[i][arr[n]];
        continue;
      }
      if (d) {
        tempArr.push(d);
      }

      delete this.sampleData[i][arr[n]];
    }

    /*----------  ARRAY  ----------*/
    if (type === 'array') {
      mergedData = tempArr;
    }
    /*----------  OBJECT  ----------*/
    else if (type === 'object') {
      console.log(tempArr)
      // tempArr = tempArr.map(function(date) {
      //   var numString = typeof date === 'number' ? date.toString() : date;
      //   var coerceDateNum = numString.length > 1 ? numString : '0' + numString;
      //   return coerceDateNum;
      // });

      // mergedData = tempArr.join('-');
    }
    /*----------  COMMA SEPARATED STRING  ----------*/
    else if (type === 'stringComma') {
      tempArr = tempArr.map(function(string) {
        if (typeof string !== 'string') {
          console.log('Row', i, 'is not a string, instead returned', string);
          return;
        }
        string = string.replace(' ,', ',');
        string = string.trim();
        return string;
      });
      mergedData = tempArr.join(',');
    }
    /*----------  SPACE SEPARATED STRING  ----------*/
    else if (type === 'stringSpace') {
      mergedData = tempArr.join(' ');
    }
    /*----------  Hyphen separated string  ----------*/
    else if (type === 'stringHyphen') {
      mergedData = tempArr.join('-');
    }

    this.sampleData[i][key] = mergedData;
  }
};

Cleaner.prototype.validate = function(i) {
  for (var key in this.rules.validate) {
    var validateAs = this.rules.validate[key];
    // dateCol, place

    if (validateAs === 'dateUTC' || validateAs === 'dateCol' || validateAs === 'dateMex') {
      // TODO: this is a mess
      var dateInput = this.sampleData[i][key].split('/');
      var date;
      var utcDate;

      dateInput = dateInput[2] + '-' + dateInput[1] + '-' + dateInput[0];

      // if (dateInput.indexOf('/') >= 0) {
      //   dateInput = new Date(dateInput);

      //   dateInput = new Date(
      //     Date.UTC(
      //       dateInput.getYear(),
      //       dateInput.getMonth(),
      //       dateInput.getDate(),
      //       dateInput.getHours(),
      //       dateInput.getMinutes(),
      //       dateInput.getSeconds()
      //     )
      //   );
      // } else if (dateInput.indexOf('-') > -1) {
      //   var dateArr = this.sampleData[i][key].split('-');
      //   dateArr = dateArr.map(function(dateVal) {
      //     var numString = typeof dateVal === 'number' ? dateVal.toString() : dateVal;
      //     var coerceDateNum = numString.length > 1 ? numString : '0' + numString;
      //     return coerceDateNum;
      //   });
      //   dateInput = dateArr.join('-');
      // }

      if (validateAs === 'dateUTC') {
        date = moment.tz(dateInput, 'UTC');
      }
      // Date TZ
      else if (validateAs === 'dateCol') {
        date = moment.tz(dateInput, 'America/Bogota');
      } else if (validateAs === 'dateMex') {
        date = moment.tz(dateInput, 'America/Mexico_City');
      }

      if (date.isValid()) {
        this.sampleData[i][key] = {
          human: date.format('MMMM D, YYYY, h:mm:ss a Z z'),
          unix: +date.format('X')
        };
      } else {
        console.error('Date on row', i, 'is not valid', date, this.sampleData[i][key]);
      }
    }
    /*----------  VALIDATE PLACE  ----------*/
    if (this.manager.geoDBLoaded) {
      if (validateAs === 'place' && this.sampleData[i][key]) {
        var name = this.sampleData[i][key];
        var trimName = name.replace(' ,', ',');
        trimName = trimName.trim().toLowerCase();

        // TODO
        // IMplement this sort of fuzz string check to avoid repeated
        // or misspelled place names

        if (this.places.indexOf(trimName) < 0) {
          this.places.push(trimName);
        } else {
          this.places.forEach(place => {
            let ratio = fuzz.ratio(place, trimName);
            if (ratio !== 100 && ratio > 90) {
              console.log({
                place: place,
                trimName: trimName
              });
            }
          });
        }

        var geo = this.manager.dbManager.getPlaceGeo(trimName);
        var placeObj = {};

        if (geo === null) {
          if (!this.noGeo.hasOwnProperty(trimName)) {
            this.noGeo[trimName] = {
              name: trimName,
              url: encodeURIComponent(trimName)
            };
          }
          placeObj.name = trimName;
          placeObj.lat = null;
          placeObj.lon = null;
        } else {
          placeObj.name = geo.name;
          placeObj.lat = geo.lat;
          placeObj.lon = geo.lon;
        }
        this.sampleData[i][key] = placeObj;
      }
    }
  }
};

Cleaner.prototype.runValidationOnSet = function(rules) {
  this.noGeo = {};
  this.validationFlag = true;

  return this.clean(rules);
};

Cleaner.prototype.sort = function(data) {
  for (var i = 0; i < data.length; i++) {
    var keys      = Object.keys(data[i]);
    var sortedObj = {};
    keys.sort(function(a, b) {
      a = a.toLowerCase();
      b = b.toLowerCase();
      if (a == b) {
        return 0;
      }
      return a < b ? -1 : 1;
    });

    keys.forEach(function(key) {
      sortedObj[key] = data[i][key];
    });
    data[i] = sortedObj;
  }

  return data;
};

module.exports = Cleaner;
