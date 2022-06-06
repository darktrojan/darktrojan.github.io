/* eslint-env es6 */

let lat0, lng0, c_lat0, s_lat0, paths;

var onmessage = function(message) {
	switch (message.data.action) {
	case 'paths':
		paths = message.data.paths;
		return;
	case 'position':
		lat0 = message.data.lat0;
		lng0 = message.data.lng0;
		c_lat0 = Math.cos(lat0);
		s_lat0 = Math.sin(lat0);
		return;
	case 'calculate':
		calculate(message.data.name, message.data.job);
		return;
	}
};

function project(lat, lng) {
	let c_lat = Math.cos(lat);
	let s_lat = Math.sin(lat);
	let d_lng = lng - lng0;

	let x = c_lat * Math.sin(d_lng);
	let y = c_lat0 * s_lat - s_lat0 * c_lat * Math.cos(d_lng);
	let z = s_lat0 * s_lat + c_lat0 * c_lat * Math.cos(d_lng);
	return [x, y, z < 0];
}

function calculate(name, job) {
	let parts = paths.get(name);
	let foregroundDef = '';
	let backgroundDef = '';

	for (let part of parts) {
		let path = [];
		let previousIsBackground = null;
		let crossed = false;

		let backgroundPoints = [];
		let foregroundParts = [];

		for (let [lat, lng] of part) {
			let [x, y, isBackground] = project(lat, lng);
			if (previousIsBackground !== null && previousIsBackground != isBackground) {
				if (previousIsBackground) {
					backgroundPoints.push(path);
				} else {
					foregroundParts.push(path);
				}
				path = [];
				crossed = true;
			}
			previousIsBackground = isBackground;
			path.push(Math.trunc(x * 1000 + 1000) + ',' + Math.trunc(y * -1000 + 1000));
		}

		if (previousIsBackground) {
			backgroundPoints.push(path);
		} else {
			foregroundParts.push(path);
		}

		if (backgroundPoints.length > 0) {
			if (!crossed) {
				backgroundDef += ('M' + backgroundPoints[0].join('L') + 'Z');
			} else {
				let backgroundstr = backgroundPoints[0].join('L');
				let first, arc;
				for (let part of backgroundPoints.slice(1)) {
					first = part[0];
					arc = ' A 1000,1000 0 0 0 ' + first;
					backgroundstr = backgroundstr + arc + 'L' + part.join('L');
				}

				first = backgroundPoints[0][0];
				arc = ' A 1000,1000 0 0 0 ' + first;
				backgroundDef += ('M' + backgroundstr + arc + 'Z');
			}
		}

		if (foregroundParts.length > 0) {
			if (!crossed) {
				foregroundDef += ('M' + foregroundParts[0].join('L') + 'Z');
			} else {
				let foregroundstr = foregroundParts[0].join('L');
				let first, arc;
				for (let part of foregroundParts.slice(1)) {
					first = part[0];
					arc = ' A 1000,1000 0 0 1 ' + first;
					foregroundstr = foregroundstr + arc + 'L' + part.join('L');
				}

				first = foregroundParts[0][0];
				arc = ' A 1000,1000 0 0 1 ' + first;
				foregroundDef += ('M' + foregroundstr + arc + 'Z');
			}
		}
	}

	postMessage({name, foregroundDef, backgroundDef, job});
}
