const board = document.querySelector('#board');
const shuffleButton = document.querySelector('#shuffleButton');

const SQRT3 = Math.sqrt(3);
const tileRadius = 50;
const edgeRadius = tileRadius * Math.cos(Math.PI / 6);
const horizontalStep = tileRadius * 1.5;
const verticalStep = tileRadius * SQRT3;
let resizeTimer = 0;

// The six edge centres are A-F clockwise. Every tile has the same three
// connections: B-D, C-E and F-A.
const pattern = [[1, 3], [2, 4], [5, 0]];

const edgePoints = Array.from({ length: 6 }, (_, index) => {
  const angle = (-30 + index * 60) * Math.PI / 180;
  return { x: Math.cos(angle) * edgeRadius, y: Math.sin(angle) * edgeRadius };
});

function hexPoints() {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (index * 60) * Math.PI / 180;
    return `${(Math.cos(angle) * tileRadius).toFixed(2)},${(Math.sin(angle) * tileRadius).toFixed(2)}`;
  }).join(' ');
}

function connectionPath([from, to]) {
  const a = edgePoints[from];
  const b = edgePoints[to];
  const distance = Math.min((to - from + 6) % 6, (from - to + 6) % 6);
  const arcRadius = distance === 1 ? tileRadius / 2 : tileRadius * 1.5;

  // Pick the circle centre outside the tile. This makes the minor arc bow
  // inward, matching the grooves on the physical tile.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const chord = Math.hypot(dx, dy);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const centreOffset = Math.sqrt(Math.max(0, arcRadius ** 2 - (chord / 2) ** 2));
  const perpendicular = { x: -dy / chord, y: dx / chord };
  const candidates = [1, -1].map(sign => ({
    x: mx + perpendicular.x * centreOffset * sign,
    y: my + perpendicular.y * centreOffset * sign,
  }));
  const centre = candidates.reduce((farther, candidate) =>
    Math.hypot(candidate.x, candidate.y) > Math.hypot(farther.x, farther.y) ? candidate : farther
  );

  const startAngle = Math.atan2(a.y - centre.y, a.x - centre.x);
  const endAngle = Math.atan2(b.y - centre.y, b.x - centre.x);
  const clockwiseDelta = (endAngle - startAngle + Math.PI * 2) % (Math.PI * 2);
  const sweep = clockwiseDelta <= Math.PI ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${arcRadius} ${arcRadius} 0 0 ${sweep} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function makeTile(q, r, index, centerX, centerY) {
  // Flat-top hexagonal axial layout. The centre spacing uses the face radius,
  // so neighbouring polygons meet edge-to-edge without overlapping.
  const x = centerX + horizontalStep * q;
  const y = centerY + verticalStep * (r + q / 2);
  const rotation = Math.floor(Math.random() * 6);
  const paths = pattern.map(connectionPath);
  return `
    <g class="tile" role="button" tabindex="0" aria-label="Tile ${index + 1}, ${rotation * 60} degrees" data-rotation="${rotation}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
      <g class="tile-rotator" style="transform:rotate(${rotation * 60}deg)">
        <polygon class="tile-face" points="${hexPoints()}" />
        <g class="pattern">
          ${paths.map(path => `<path class="track-shadow" d="${path}" />`).join('')}
          ${paths.map(path => `<path class="track-gap" d="${path}" />`).join('')}
        </g>
      </g>
    </g>`;
}

function renderBoard() {
  const bounds = board.getBoundingClientRect();
  const width = Math.max(320, Math.round(bounds.width || window.innerWidth));
  const height = Math.max(320, Math.round(bounds.height || window.innerHeight));
  const centerX = width / 2;
  const centerY = height / 2;
  const overflow = tileRadius * 2.4;
  const qMin = Math.floor((-overflow - centerX) / horizontalStep) - 1;
  const qMax = Math.ceil((width + overflow - centerX) / horizontalStep) + 1;
  const coordinates = [];

  for (let q = qMin; q <= qMax; q += 1) {
    const rMin = Math.floor((-overflow - centerY) / verticalStep - q / 2) - 1;
    const rMax = Math.ceil((height + overflow - centerY) / verticalStep - q / 2) + 1;
    for (let r = rMin; r <= rMax; r += 1) coordinates.push([q, r]);
  }

  board.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="group" aria-label="${coordinates.length} hexagonal tiles">
      ${coordinates.map(([q, r], index) => makeTile(q, r, index, centerX, centerY)).join('')}
    </svg>`;
}

function rotateTile(tile, direction = 1) {
  const current = Number(tile.dataset.rotation);
  const next = current + direction;
  tile.dataset.rotation = String(next);
  tile.querySelector('.tile-rotator').style.transform = `rotate(${next * 60}deg)`;
  tile.setAttribute('aria-label', `Tile, ${((next % 6) + 6) % 6 * 60} degrees`);
}

board.addEventListener('click', event => {
  const tile = event.target.closest('.tile');
  if (tile) rotateTile(tile, event.shiftKey ? -1 : 1);
});

board.addEventListener('keydown', event => {
  const tile = event.target.closest('.tile');
  if (!tile || !['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  rotateTile(tile, event.key === 'ArrowLeft' ? -1 : 1);
});

shuffleButton.addEventListener('click', () => {
  document.querySelectorAll('.tile').forEach(tile => rotateTile(tile, Math.floor(Math.random() * 6)));
});

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderBoard, 120);
});

renderBoard();
