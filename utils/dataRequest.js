function oRequest(url, cb, pass) {
  var oReq = new XMLHttpRequest();
  oReq.overrideMimeType('application/json');
  oReq.open('GET', url, true);

  oReq.onload = () => {
    cb(JSON.parse(oReq.responseText), pass);
  };

  oReq.onerror = (event) => {
    console.error('Error loading file', event);
  };

  oReq.send(null);
}

module.exports = oRequest;
