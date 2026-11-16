const $ = id => document.getElementById(id);
const sceneField = $('geo-scene');
const placeField = $('geo-place');
const providerField = $('geo-provider');
const online = $('geo-online');
const layer = $('geo-layer');
const status = $('geo-status');

const osm = '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>';
const providers = {
  osm: {
    name: 'OpenStreetMap',
    tile: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    credit: osm
  },
  carto: {
    name: 'CARTO',
    tile: (z, x, y) => `https://basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
    credit: osm + ' · <a href="https://carto.com/attribution/">© CARTO</a>'
  },
  topo: {
    name: 'OpenTopoMap',
    tile: (z, x, y) => `https://a.tile.opentopomap.org/${z}/${x}/${y}.png`,
    credit: osm + ' · SRTM · <a href="https://opentopomap.org/">© OpenTopoMap (CC BY-SA)</a>'
  }
};

let scenes = [];
let zoom = 7;
let generation = 0;
let resizeTimer;
let lastSize = '';
let cancelTiles = () => {};
const sourceKeys = ['carto', 'topo', 'osm'];
const currentScene = () => scenes.find(scene => scene.id === sceneField.value);
const currentPlace = () => currentScene()?.places[Number(placeField.value)];

function setPlace(sceneId, index = 0) {
  const scene = scenes.find(item => item.id === sceneId);
  if (!scene) return;
  sceneField.value = scene.id;
  placeField.replaceChildren(...scene.places.map(([name], i) => new Option(name, i)));
  placeField.value = scene.places[index] ? String(index) : '0';
  updateLocation();
}

function updateLocation() {
  const place = currentPlace();
  if (!place) return;
  const [name, lat, lon] = place;
  $('geo-location').textContent = `${name} · ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
  $('geo-local').href = '#' + sceneField.value;
  $('geo-osm').href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=9/${lat}/${lon}`;
  $('geo-google').href = `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lon}`;
  $('geo-esri').href = `https://www.arcgis.com/home/webmap/viewer.html?webmap=10df2279f9684e4a9f6a7f08febac2a9&center=${lon},${lat}&level=9`;
  if (!online.hidden) void drawMap();
}

function stopMap(message) {
  generation++;
  cancelTiles();
  layer.replaceChildren();
  online.hidden = true;
  $('geo-close').hidden = true;
  $('geo-load').hidden = false;
  status.textContent = message;
}

function centerPixels(lat, lon) {
  const world = 256 * 2 ** zoom;
  const radians = lat * Math.PI / 180;
  return [(lon + 180) / 360 * world, (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * world];
}

function loadTile(url, left, top) {
  const image = new Image(256, 256);
  image.alt = '';
  image.style.left = left + 'px';
  image.style.top = top + 'px';
  image.decoding = 'async';
  const done = new Promise(resolve => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = url;
  return {image, done};
}

async function drawMap() {
  const location = currentPlace();
  if (!location) return;
  const request = ++generation;
  cancelTiles();
  layer.replaceChildren();
  $('geo-credit').textContent = '';
  $('geo-zoom').value = zoom;
  $('geo-minus').disabled = zoom <= 4;
  $('geo-plus').disabled = zoom >= 12;
  const [, lat, lon] = location;
  const [cx, cy] = centerPixels(lat, lon);
  const {clientWidth: width, clientHeight: height} = $('geo-tiles');
  lastSize = width + 'x' + height;
  const left = cx - width / 2;
  const top = cy - height / 2;
  const requested = providerField.value;
  const order = [requested, ...sourceKeys.filter(key => key !== requested)];

  for (const key of order) {
    if (request !== generation) return;
    const provider = providers[key];
    status.textContent = `正在加载 ${provider.name}…`;
    const tiles = [];
    for (let y = Math.floor(top / 256); y < Math.ceil((top + height) / 256); y++) {
      for (let x = Math.floor(left / 256); x < Math.ceil((left + width) / 256); x++) {
        tiles.push(loadTile(provider.tile(zoom, x, y), x * 256 - left, y * 256 - top));
      }
    }
    let expire;
    let interrupt;
    const deadline = new Promise(resolve => {
      interrupt = () => resolve(false);
      expire = setTimeout(interrupt, 3400);
    });
    cancelTiles = () => {
      interrupt();
      for (const {image} of tiles) {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute('src');
      }
    };
    const loaded = await Promise.race([
      Promise.all(tiles.map(tile => tile.done)).then(results => results.every(Boolean)),
      deadline
    ]);
    clearTimeout(expire);
    if (request !== generation) return;
    if (!loaded) {
      cancelTiles();
      continue;
    }
    cancelTiles = () => {};
    layer.replaceChildren(...tiles.map(tile => tile.image));
    $('geo-credit').innerHTML = provider.credit;
    providerField.value = key;
    status.textContent = key === requested ? `已加载 ${provider.name}` : `已自动换用 ${provider.name}`;
    return;
  }
  stopMap('三个实时底图暂时无法连接。可继续读本站示意，也可换源后重试。');
}

$('geo-load').disabled = true;
$('geo-load').addEventListener('click', () => {
  online.hidden = false;
  $('geo-load').hidden = true;
  $('geo-close').hidden = false;
  void drawMap();
});
$('geo-close').addEventListener('click', () => {
  stopMap('已收起实时底图。本站示意一直可读。');
  $('geo-load').focus();
});
sceneField.addEventListener('change', () => setPlace(sceneField.value));
placeField.addEventListener('change', updateLocation);
providerField.addEventListener('change', () => { if (!online.hidden) void drawMap(); });
$('geo-minus').addEventListener('click', () => { zoom--; void drawMap(); });
$('geo-plus').addEventListener('click', () => { zoom++; void drawMap(); });
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  if (online.hidden) return;
  resizeTimer = setTimeout(() => {
    const {clientWidth, clientHeight} = $('geo-tiles');
    if (!online.hidden && clientWidth + 'x' + clientHeight !== lastSize) void drawMap();
  }, 160);
}).observe($('geo-tiles'));

document.querySelectorAll('[data-geo-stop]').forEach(link => {
  link.addEventListener('click', () => {
    const [scene, place] = link.dataset.geoStop.split(':');
    setPlace(scene, Number(place));
  });
});

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const chapterObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    chapterObserver.unobserve(entry.target);
    if (reduced.matches || document.documentElement.dataset.motion === 'off') continue;
    entry.target.querySelector('.geo-path')?.animate(
      [{opacity: .15, strokeDashoffset: .15}, {opacity: 1, strokeDashoffset: 0}],
      {duration: 650, easing: 'ease-out'}
    );
  }
}, {threshold: .15});
document.querySelectorAll('.geo-chapter').forEach(chapter => chapterObserver.observe(chapter));

fetch('assets/geo/scenes.json').then(response => {
  if (!response.ok) throw new Error('场景索引加载失败');
  return response.json();
}).then(data => {
  scenes = data;
  const requested = new URLSearchParams(location.search).get('scene');
  const initial = scenes.find(scene => scene.id === requested) || scenes[0];
  setPlace(initial.id);
  $('geo-load').disabled = false;
}).catch(() => {
  status.textContent = '场景索引暂未载入。可继续读本站图解，或使用下面的地图链接。';
});
