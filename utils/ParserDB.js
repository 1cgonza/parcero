const Loki = require('lokijs');
const fs = require('fs');
const path = require('path');
const slug = require('speakingurl');

module.exports = class ParserDB {
  constructor(dbReadyCb, autoload) {
    if (autoload) {
      this.initDB('parser', './db/parser.json', 'files', () => {
        dbReadyCb();
      });
    }
  }

  initDB(key, dbPath, collection, cb) {
    this[key] = new Loki(dbPath, {
      autoload: true,
      autoloadCallback: () => {
        this[key].current = this[key].getCollection(collection);

        if (this[key].current === null) {
          this[key].current = this[key].addCollection(collection);
          this[key].save();
        }

        if (key === 'parser') {
          this.parser.templates = this.parser.getCollection('templates');

          if (this.parser.templates === null) {
            this.parser.templates = this.parser.addCollection('templates');
            this.parser.templates.insert({
              name: '__savedTemplates',
              list: []
            });
            this.parser.save();
          }
        }

        if (cb) {
          cb();
        }
      }
    });
  }

  saveRules(name, rules) {
    this.workingFile.rules = rules;
    this.parser.current.update(this.workingFile);
    this.parser.save();
    // var file = this.currentDB.findOneUnindexed('name', name);

    // if (file === null) {
    //   file = this.currentDB.insert({name: name, rules: rules});
    // } else {
    //   file.rules = rules;
    // }
    // this.db.save();
  }

  getFileRules(name) {
    var file = this.parser.current.findOneUnindexed('name', name);

    if (file === null) {
      file = this.parser.current.insert({
        name: name,
        rules: {
          range: [0, 4],
          remove: [],
          rename: {},
          merge: {},
          validate: {}
        }
      });
      this.parser.save();
    }

    this.workingFile = file;

    return file.rules;
  }

  initGeoDB(cb) {
    this.initDB('geo', './db/geo.json', 'places', () => {
      if (cb) {
        cb();
      }
    });
  }

  getPlaceGeo(name) {
    var placeId = slug(name);
    var geo = this.geo.current.findOneUnindexed('id', placeId);

    return geo;
  }

  addGeo(name, url, lat, lon) {
    this.geo.current.insert({
      id: slug(name),
      name: name,
      url: url,
      lat: lat,
      lon: lon
    });
    this.geo.save();
    console.log('Saved', name, 'on Database');
  }

  saveAsTemplate(name, structure, rules) {
    var template = this.parser.templates.findOneUnindexed('name', name);

    if (template === null) {
      template = this.parser.templates.insert({
        name: name,
        structure: structure,
        rules: rules
      });

      var savedTemplates = this.parser.templates.findOneUnindexed('name', '__savedTemplates');
      savedTemplates.list.push(name);

      this.parser.templates.update(savedTemplates);

      this.parser.save();
    }
  }

  findRepeated() {
    // TODO: implement this based in this quick usecase

    // for (var i = 0; i < d.length; i++) {
    //   var place = d[i];
    //   var compare = db.geo.current.find({'$and': [{id: place.id}, {'$loki': {'$ne': place['$loki']} }]});
    //   if (compare.length > 0) {
    //     compare.forEach(function(deleteMe) {
    //       db.geo.current.remove(deleteMe);
    //     });
    //     console.log(place, compare);
    //     break;
    //   }
    // }
    // db.geo.save();
  }
}
