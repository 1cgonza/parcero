function sortObj(data) {
  var keys = Object.keys(data);
  var sorted = {};

  keys.sort((a, b) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a == b) {
      return 0;
    }
    return a < b ? -1 : 1;
  });

  keys.forEach(name => {
    sorted[name] = data[name];
  });

  return sorted;
}

function createFile(data, name, container) {
  data = typeof data === 'string' ? data : JSON.stringify(data);
  var blob = new Blob([data], {type: 'text/json'});
  var url = window.URL.createObjectURL(blob);
  var p = document.createElement('p');
  var a = document.createElement('a');
  var fileName = name + '.json';

  a.textContent = fileName;
  a.href = url;
  a.download = fileName;
  p.appendChild(a);
  container.appendChild(p);
}

module.exports = {
  sortObj: sortObj,
  createFile: createFile
};
