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

  // TODO: let me step through this...
  setupCanvas(box);
  renderPolygon(rawCoords, '#f008');
  renderPolygon(adjCoords, '#00f8');

  const error = Number(document.getElementById('error').value);
  if (Number.isNaN(error) || error <= 0 || error >= 0.5) {
    throw `error ${error} must be within (0, 0.5)`;
  }

  const result = computeArea(adjCoords, box, error);
  const area = result[0];
  const boxes = result[1];

  document.getElementById('successOutput').innerHTML = `Area is ${area}`;

  // Render the boxes covering the polygon one at a time:
  renderArea(boxes);
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


// TODO: some of these should probably have tolerances in case points are too
// close to being on an edge, etc.


function vector(ptA, ptB) {
  return [ptB[0] - ptA[0], ptB[1] - ptA[1]];
}


function crossZ(vA, vB) {
  return vA[0] * vB[1] - vA[1] * vB[0];
}


function isCross(czA, czB) {
  return czA * czB < 0;
}


/**
 * Determines if the line segments between (A, B) and between (P, Q) cross.
 */
function linesCross(ptA, ptB, ptP, ptQ) {
  // This works by computing the z-component of the cross-product between AB and
  // AP, and then between AB and AQ. If the sign differs, P and Q are on
  // opposite sides of the line between A and B. It then does the same for PQ
  // and A, B. If A and B are also on opposite sides of the line between P and
  // Q, then the line segments cross.

  //console.log(`linesCross ptA=${ptA}, ptB=${ptB}, ptP=${ptP}, ptQ=${ptQ}`);
  const ab = vector(ptA, ptB);
  const ap = vector(ptA, ptP);
  const aq = vector(ptA, ptQ);
  const zabp = crossZ(ab, ap);
  const zabq = crossZ(ab, aq);
  //console.log(`ab=${ab}, ap=${ap}, aq=${aq}, zabp=${zabp}, zabq=${zabq}`);
  if (!isCross(zabp, zabq)) {
    return false;
  }

  const pq = vector(ptP, ptQ);
  const pa = vector(ptP, ptA);
  const pb = vector(ptP, ptB);
  const zpqa = crossZ(pq, pa);
  const zpqb = crossZ(pq, pb);
  //console.log(`pq=${pq}, pa=${pa}, pb=${pb}, zpqa=${zpqa}, zpqb=${zpqb}`);
  return isCross(zpqa, zpqb);
}


/**
 * box is [minX, minY, maxX, maxY]
 */
function subdivide(box) {
  const minX = box[0];
  const minY = box[1];
  const maxX = box[2];
  const maxY = box[3];
  const dx = maxX - minX;
  const dy = maxY - minY;
  return [
    [minX, minY + dy / 2, minX + dx / 2, maxY],
    [minX + dx / 2, minY + dy / 2, maxX, maxY],
    [minX, minY, minX + dx / 2, minY + dy / 2],
    [minX + dx / 2, minY, maxX, minY + dy / 2]
  ];
}


function boxArea(box) {
  return (box[2] - box[0]) * (box[3] - box[1]);
}


/**
 * Determines if the box is inside the polygon, outside the polygon, or
 * intersects with it.
 * Returns 1 if it is inside, 0 if it is outside, and -1 if it intersects with
 * it.
 */
function assessBox(box, polygon, boundingBox) {
  // box is [minX, minY, maxX, maxY]
  // polygon is [[x, y], ...]
  // For each edge in polygon, we'll check if it crosses any edge in box.
  const minX = box[0];
  const minY = box[1];
  const maxX = box[2];
  const maxY = box[3];
  const p = [minX, maxY];
  const q = [maxX, maxY];
  const r = [maxX, minY];
  const s = [minX, minY];
  console.log(`p = ${p}, q = ${q}, r = ${r}, s = ${s}`);

  // First, we'll check if any of the box edges cross any edges of the polygon.
  // If so, we know it is an indeterminate box.
  for (var i = 0; i + 1 < polygon.length; ++i) {
    const ptA = polygon[i];
    const ptB = polygon[i + 1];
    // Check for each of the four edges of the box.
    if (linesCross(ptA, ptB, p, q)
        || linesCross(ptA, ptB, q, r)
        || linesCross(ptA, ptB, r, s)
        || linesCross(ptA, ptB, s, p)) {
      return -1;
    }
  }

  // At this point, the box does not overlap any edge of the polygon, so we need
  // to determine if the box is inside or outside the polygon. We may as well
  // determine this for any arbitrary point of the box, so we'll pick point p.
  // We will count the edges of the polygon a segment between p and a point
  // outside the bounding box cross.
  // We need to ensure this line segment does not intersect any vertices on the
  // polygon. We can detect this by checking if the crossZ value for the vertex
  // and the line segment is too small.
  // Pick an external point outside the bounding box.
  var extP = [boundingBox[2] + 1, boundingBox[3] + 1];
  // TODO: verify vector p -> extP does not cross a vertex in the polygon.
  // Count the edges crossed.
  var edges = 0;
  for (var i = 0; i + 1 < polygon.length; ++i) {
    if (linesCross(p, extP, polygon[i], polygon[i + 1])) {
      edges++;
    }
  }
  if (edges % 2 == 0) {
    // Crossed an even number of edges, so it is outside the polygon.
    return 0;
  }
  // Crossed an odd number of edges: inside the polygon.
  return 1;
}


function computeArea(polygon, boundingBox, maxError) {
  // First, we take the bounding box, and divide it into four quadrants. By
  // construction, the bounding box fully contains the polygon, but all four
  // quadrants will either intersect with the polygon or be fully outside the
  // polygon. And after this step, every subdivision will yield a box that is
  // either fully outside the polygon, fully inside it, or intersects with it.

  // We will iteratively take each box. If it is outside or inside, we are done.
  // If it is inside, it counts towards the area of the polygon. If it is
  // neither, it is subdivided further, and the area counts towards the error.
  // We will continue subdividing until the cumulative error is small enough.

  // First, seed the list of boxes to check by subdividing the bounding box.
  const boxes = subdivide(boundingBox);
  const boxesInPolygon = [];
  var area = 0;
  // Initially, all boxes are not yet assessed so they count as possible error.
  var error = boxes.reduce((acc, box) => acc + boxArea(box), 0);

  // The maximum possible error is the sum of those boxes we have not yet fully
  // assessed. If that is too large, we'll keep going.
  while (error > maxError * area) {
    const box = boxes.shift();
    error -= boxArea(box);
    console.log(`Assessing ${box}, error = ${error}, area = ${area}`);

    const assessment = assessBox(box, polygon, boundingBox);
    console.log(`Assessment = ${assessment}`);
    if (1 === assessment) {
      area += boxArea(box);
      boxesInPolygon.push(box);
    } else if (0 === assessment) {
      // Do nothing. The box is fully outside the polygon, so we can drop it.
    } else if (-1 === assessment) {
      // The box needs to be further subdivided.
      subdivide(box).forEach(b => {
          boxes.push(b);
          error += boxArea(b);
      });
    }
  }
  return [area, boxesInPolygon];
}


function renderArea(boxes) {
  // Render the first box.
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#00fc';

  const box = boxes.shift();
  console.log(`Filling ${box}`);
  ctx.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);

  document.getElementById('progress').innerHTML = `${boxes.length}...`;
  if (boxes.length > 0) {
    setTimeout(() => { renderArea(boxes); }, 10);
  }
}
