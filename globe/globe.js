/* eslint-env es6 */

let spinning;
let backgroundEl = document.querySelector('g#background');
let foregroundEl = document.querySelector('g#foreground');
let latInput = document.querySelector('input[name="lat"]');
let lngInput = document.querySelector('input[name="lng"]');

let workers = [];
for (var i = 0; i < 3; i++) {
  let worker = new Worker('globeworker.js');
  worker.onmessage = workerOnMessage;
  workers.push(worker);
}
let workersDone, nameIterator, defs, currentJob = 0;

let lat0, lng0;
let paths = new Map();

fetch('globe.json').then(function(response) {
  return response.json();
}).then(function(j) {
  for (let k of Object.keys(j)) {
    paths.set(k, j[k]);
  }
  for (var i = 0; i < workers.length; i++) {
    workers[i].postMessage({action: 'paths', paths});
  }
  goToRadians(
    latInput.value / 180 * Math.PI,
    lngInput.value / 180 * Math.PI
  );
}).catch(function(e) {
  console.error(e);
});

function workerOnMessage(message) {
  if (message.data.job != currentJob) {
    return;
  }
  defs.push(message.data);
  let next = nameIterator.next();
  if (next.done) {
    if (++workersDone == workers.length) {
      for (let {name, foregroundDef, backgroundDef} of defs) {
        make(name + '_bg', backgroundDef, backgroundEl);
        make(name + '_fg', foregroundDef, foregroundEl);
      }
      if (spinning) {
        if (lngInput.value == -180) {
          lngInput.value = 175;
        } else {
          lngInput.value -= 5;
        }
        requestAnimationFrame(animate);
      }
    }
  } else {
    this.postMessage({action: 'calculate', name: next.value, job: currentJob});
  }
}

function spin() {
  spinning = !spinning;
  requestAnimationFrame(animate);
}

function animate() {
  if (!spinning) {
    return;
  }
  goToRadians(lat0, lngInput.value / 180 * Math.PI);
}

function move() {
  goToRadians(
    latInput.value / 180 * Math.PI,
    lngInput.value / 180 * Math.PI
  );
}

function goToRadians(lat, lng) {
  lat0 = lat;
  lng0 = lng;
  while (lng0 > Math.PI) {
    lng0 -= Math.PI * 2;
  }
  while (lng0 < -Math.PI) {
    lng0 += Math.PI * 2;
  }
  if (nameIterator) {
    nameIterator.cancelled = true;
  }
  currentJob++;
  workersDone = 0;
  nameIterator = paths.keys();
  defs = [];
  for (var i = 0; i < workers.length; i++) {
    let next = nameIterator.next();
    if (!next.done) {
      workers[i].postMessage({action: 'position', lat0, lng0});
      workers[i].postMessage({action: 'calculate', name: next.value, job: currentJob});
    }
  }
}

function make(name, d, parent) {
  let pathEl = document.getElementById(name);
  if (!pathEl) {
    pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('id', name);
    parent.appendChild(pathEl);
  }
  pathEl.setAttribute('d', d);
}
