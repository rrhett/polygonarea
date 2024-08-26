document.addEventListener('DOMContentLoaded', function() {
    // todo: Hookup event listeners to dom
    document.getElementById('compute')
        .addEventListener('click', function() {
          try {
            computePolygon();
          } catch (e) {
            err(e);
            throw e;
          }
        });
}, false);

function err(msg) {
  document.getElementById('errorOutput').innerHTML = msg;
}

function reset() {
  err('');
}

function computePolygon() {
  reset();
  // Read in the measurements from 'data'
  // Compute the polygon vertex coordinates
  // Read in the error
  // Construct grid
  // Continually subdivide grid using largest cell at a time until the total
  // error is less than the percent of the computed polygon so far.

  const input = document.getElementById('data').value.trim().split(/\s+/);
  if (input.length % 2 == 1) {
    throw 'Need a distance for every heading.';
  }
  if (input.length < 6) {
    throw 'Need at least three bearings.';
  }

  const headingDistances = toHeadingDistances(input);
  console.log(`headingDistances = ${headingDistances}`);
  const vectors = toVectors(headingDistances);
  console.log(`vectors = ${vectors}`);

  const rawCoords = vectorsToCoords(vectors);
  console.log(`rawCoords = ${rawCoords}`);

  const adjCoords = adjustCoords(rawCoords);
  console.log(`adjCoords = ${adjCoords}`);

  const box = getBoundingBox(rawCoords, adjCoords);

  setupCanvas(box);
  renderPolygon(rawCoords, '#f008');
  renderPolygon(adjCoords, '#00f8');
}

/**
 * Translates an input of [heading, distance, ...] as strings to
 * [[heading, distance], ...] as numbers.
 */
function toHeadingDistances(input) {
  // Basically just converts the input to pairs, where the first element is
  // heading, the second is distance.
  return input.reduce((acc, curr, index) => {
      if (index % 2 === 0) {
          // Validate this is a heading.
          const heading = Number(curr);
          if (!Number.isInteger(heading) || heading < 0 || heading > 359) {
            throw `${curr} is not a valid heading (0 .. 359)`;
          }
          acc.push([curr]);
      } else {
          const dist = Number(curr);
          if (!Number.isFinite(dist) || dist <= 0) {
            throw `${dist} is not a valid distance, must be > 0`;
          }
          acc[acc.length - 1].push(curr);
      }
      return acc;
  }, []);
}

/**
 * Translates [[heading, distance], ...] as numbers to
 * [[dx, dy], ...] as numbers (these are vectors).
 */
function toVectors(headingDistances) {
  // Note: as these are input as compass headings, we need to first convert
  // these to standard mathematical angles:
  // 0 -> pi/2, 90 -> 0, 180 -> 3pi/2, 270 -> pi
  return headingDistances.map((hd) => {
        const heading = hd[0];
        const dist = hd[1];
        var angleDegrees = 90 - heading;
        var posDegrees = (angleDegrees + 360) % 360;
        const radians = posDegrees * Math.PI / 180;
        return [dist * Math.cos(radians), dist * Math.sin(radians)];
      });
}

/**
 * Given a set of vectors, return the list of coordinates obtained by following
 * those vectors, starting from (0, 0).
 */
function vectorsToCoords(vectors) {
  return vectors.reduce((acc, curr, index) => {
      const prevCoord = acc[index];
      acc.push([prevCoord[0] + curr[0], prevCoord[1] + curr[1]]);
      return acc;
      }, [[0, 0]]);
}


/**
 * Given a set of raw coordinates, nudge them all as needed so final coordinate
 * matches first coordinate.
 */
function adjustCoords(rawCoords) {
  const last = rawCoords[rawCoords.length - 1];
  console.log(`last = ${last}`);
  // This is the total delta I need to move.
  const dx = rawCoords[0][0] - last[0];
  const dy = rawCoords[0][1] - last[1];
  console.log(`dx, dy = ${dx}, ${dy}`);
  // Each coordinate gets shifted by index / n * delta.
  const n = rawCoords.length - 1;
  return rawCoords.map(
      (c, index) => [c[0] + dx * index / n, c[1] + dy * index / n]);
}


function getBoundingBox(rawCoords, adjCoords) {
  // I need to find the min and max x and y coordinates across all coordinates.
  const coords = rawCoords.concat(adjCoords);
  const x = coords.map(c => c[0]);
  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const y = coords.map(c => c[1]);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);

  return [minX, minY, maxX, maxY];
}


function setupCanvas(box) {
  console.log(`box = ${box}`);
  const minX = box[0];
  const minY = box[1];
  const maxX = box[2];
  const maxY = box[3];
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  // Shift the origin to the bottom left to obtain standard Cartesian
  // coordinates.
  ctx.translate(0,canvas.height);
  ctx.scale(1,-1);

  // Next, we have minX, minY, maxX, maxY, all of which we need to ensure is
  // visible on the canvas.
  // First let's get the max delta:
  const maxDimension = Math.max(maxX - minX, maxY - minY);
  console.log(`maxDimension = ${maxDimension}`);
  // Width and height are 500px by default.
  // I need to scale this to be maxDimension x maxDimension.
  // My scale factor needs to be calculated so 500 / s = maxDimension.
  const scaleFactor = 500 / maxDimension;
  console.log(`scaleFactor = ${scaleFactor}`);
  ctx.lineWidth = 2 / scaleFactor;

  // Now we scale the canvas so it will cover the full needed dimensions.
  ctx.scale(scaleFactor, scaleFactor);

  // Finally, we need to shift the origin so all of the box is on screen.
  ctx.translate(-minX, -minY);

  console.log(`canvas translated to ${-minX}, ${-minY}`);
}

/**
 * Renders the polygon expressed by coords with a color border.
 */
function renderPolygon(coords, color) {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = color;

  console.log(`beginPath with color ${color}`);
  ctx.beginPath();
  coords.forEach(c => { console.log(`lineTo(${c[0]}, ${c[1]})`); ctx.lineTo(c[0], c[1]); });
  ctx.stroke();
}
