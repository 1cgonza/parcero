const fs   = require('fs');
const path = require('path');
const XlSX = require('xlsx');
const csv  = require('papaparse');
const oReq = require('./dataRequest.js');

function getTree(dir, cb) {
  var tree = [];

  fs.readdir(dir, (err, list) => {
    if (err) {
      return cb(err);
    }

    list = list.filter(item => {
      return item !== '.DS_Store' && item.charAt(0) !== '~';
    });

    var itemsLeft = list.length;

    if (!itemsLeft) {
      cb(null, null);
    };

    list.forEach(file => {
      file = path.resolve(dir, file);

      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          getTree(file, (err, res) => {
            if (res) {
              tree.push({
                name: path.basename(file),
                type: 'folder',
                children: res
              });
            }

            if (!--itemsLeft) {
              cb(null, tree);
            }
          });
        } else {
          tree.push({
            name: path.basename(file),
            type: 'file',
            path: file,
            ext: path.extname(file)
          });

          if (!--itemsLeft) {
            cb(null, tree);
          }
        }
      });
    });
  });
}

function buildTree(tree, main, parent, wrapper, navItem) {
  parent = parent || main;

  tree.forEach(ele => {
    if (ele.type === 'folder' && ele.children.length > 0) {
      var parentLi = document.createElement('li');
      var span     = document.createElement('span');
      var ul       = document.createElement('ul');

      parentLi.className = 'folder-wrapper';
      span.innerText     = ele.name;
      span.className     = 'folder';
      ul.className       = 'children';

      parentLi.appendChild(span);
      parentLi.appendChild(ul);
      parent.appendChild(parentLi);
      buildTree(ele.children, main, ul, wrapper, navItem);
    } else {
      var li = document.createElement('li');
      li.innerText = ele.name;
      li.classList.add('file', 'ext-' + ele.ext.substr(1));

      li.onclick = (event) => {
        wrapper.innerHTML = '';
        wrapper.classList.add('loading');
        main.classList.remove('open');
        navItem.classList.remove('current');

        if (ele.ext === '.csv' || ele.ext === '.txt') {
          parseCSV(ele.path, ele, li, true);
        } else if (ele.ext === '.json') {
          oReq(ele.path, data => {
            var csvFromJson = csv.unparse(data);
            parseCSV(csvFromJson, ele, li, false);
          });
        } else {
          console.error('Can\'t process the file ' + ele.name + ', the only supported formats are .csv or .txt');
        }

        return false;
      };

      parent.appendChild(li);
    }
  });

  function parseCSV(url, ele, li, download) {
    csv.parse(url, {
      download: download,
      header: true,
      dynamicTyping: true,
      error: (err, file, input, reason) => {
        console.log(err, file, input, reason);
      },
      complete: (results) => {
        processData(results, li, ele.ext.substr(1));
      }
    });
  }
}

module.exports = {
  getTree: getTree,
  buildTree: buildTree
};
