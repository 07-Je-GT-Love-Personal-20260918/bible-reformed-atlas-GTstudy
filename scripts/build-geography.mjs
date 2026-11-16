import {readFile, writeFile} from 'node:fs/promises';
import {esc, studyPage} from './study-shell.mjs';

const scenes = JSON.parse((await readFile('data/geo-scenes.json', 'utf8')).replace(/^\uFEFF/, ''));
const land = JSON.parse(await readFile('data/geo-land.json', 'utf8'));
const escape = esc;
const sceneOptions = scenes.map(s => `<option value="${s.id}">${s.icon} ${s.title}</option>`).join('');

function diagram(scene) {
  const lats = scene.places.map(([,lat]) => lat);
  const lons = scene.places.map(([, ,lon]) => lon);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const midLon = (Math.max(...lons) + Math.min(...lons)) / 2;
  const correction = Math.cos(midLat * Math.PI / 180);
  const scale = Math.min(440 / Math.max(.5, lonSpan * correction), 154 / Math.max(.5, latSpan));
  const project = (lon, lat) => [290 + (lon - midLon) * scale * correction, 133 - (lat - midLat) * scale];
  const dots = scene.places.map(([name, lat, lon]) => [name, ...project(lon, lat)]);
  const coast = land.map(polygon => polygon.map(ring =>
    'M' + ring.map(([lon,lat]) => project(lon,lat).map(n=>n.toFixed(1)).join(',')).join('L') + 'Z'
  ).join('')).join('');
  const line = dots.map(([,x,y]) => `${x},${y}`).join(' ');
  return `<svg class="geo-diagram" viewBox="0 0 580 265" role="img" aria-label="${escape(scene.title)}，按现代坐标排列的经文地点示意">
    <defs><pattern id="grid-${scene.id}" width="29" height="29" patternUnits="userSpaceOnUse"><path d="M29 0H0V29" fill="none" stroke="currentColor" stroke-opacity=".13"/></pattern></defs>
    <path d="${coast}" fill="var(--geo-land)" fill-rule="evenodd"/>
    <rect width="580" height="265" rx="14" fill="url(#grid-${scene.id})"/>
    <text x="22" y="35" class="geo-compass">↑ 北</text>
    <text x="516" y="244" class="geo-compass">东 →</text>
    <polyline class="geo-path" pathLength="1" points="${line}" fill="none" stroke="var(--scene)" stroke-width="4" stroke-linejoin="round" stroke-dasharray=".015 .01"/>
    ${dots.map(([,x,y],i) => `<g><circle cx="${x}" cy="${y}" r="13" fill="var(--scene)"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="white" font-size="14" font-weight="700">${i+1}</text></g>`).join('')}
  </svg>`;
}

const chapters = scenes.map((s) => `
<section class="chapter geo-chapter" id="${s.id}" style="--scene:${s.color}">
  <h2><span aria-hidden="true">${s.icon}</span> ${s.title}</h2>
  <p class="geo-era">${s.era}</p>
  <div class="geo-detail-grid">
    <figure class="geo-figure">${diagram(s)}
      <figcaption>区域与选点示意。箭线串联经文场景，古代路线与国界未绘。</figcaption>
      <ol class="geo-stops">${s.places.map(([name], j) => `<li><a href="#live-map" data-geo-stop="${s.id}:${j}">${escape(name)}</a></li>`).join('')}</ol>
    </figure>
    <dl class="geo-lenses">
      <div><dt>▸ 故事</dt><dd><p>${escape(s.story)}</p></dd></div>
      <div><dt>⌖ 地理与文化</dt><dd><p>${escape(s.culture)}</p></dd></div>
      <div><dt>✦ 圣约与成全</dt><dd><p>${escape(s.covenant)}</p></dd></div>
    </dl>
  </div>
  <p class="reference">${escape(s.refs)} · <a href="${s.read}">进入专题精读 →</a></p>
  <details class="geo-recall"><summary>复述练习 · ${escape(s.question)}</summary><p>${escape(s.answer)}</p></details>
</section>`).join('');

const body = `
<section class="chapter" id="geo-start">
  <h2>循着六个场景读全书</h2>
  <div class="geo-hero">
    <div><p>先用地点记住故事，再问地理和文化怎样影响人物的选择，最后用经文解释神如何守约。</p>
    <ol class="geo-timeline">${scenes.map(s=>`<li style="--scene:${s.color}"><a href="#${s.id}"><span aria-hidden="true">${s.icon}</span><strong>${s.title}</strong><small>${s.era}</small></a></li>`).join('')}</ol>
    </div>
    <figure class="geo-hero-image"><img src="assets/geo/galilee.webp" width="960" height="320" alt="加利利湖边的木船、渔网与村落示意" decoding="async"><figcaption>加利利湖的渔业场景 · 想象复原</figcaption></figure>
  </div>
</section>
<section class="chapter geo-live" id="live-map">
  <h2>对照现代地图</h2>
  <p>现代地名和边界随底图显示。先读下方站内示意，再开启实时底图查看今日地形与距离。</p>
  <div class="geo-fields">
    <label>读哪个场景<select id="geo-scene">${sceneOptions}</select></label>
    <label>看哪个地点<select id="geo-place">${scenes[0].places.map(([name],i)=>`<option value="${i}">${name}</option>`).join('')}</select></label>
    <label>实时底图来源<select id="geo-provider"><option value="carto">CARTO 浅色地理</option><option value="osm">OpenStreetMap 街道</option><option value="topo">OpenTopoMap 地形</option></select></label>
  </div>
  <div class="geo-map-summary"><p id="geo-location">哈兰 · 36.86°N, 39.03°E</p><a id="geo-local" href="#promise">查看本站示意 ↓</a></div>
  <div class="geo-actions"><button type="button" id="geo-load">加载实时底图</button><button type="button" id="geo-close" hidden>收起底图</button></div>
  <p id="geo-status" role="status">底图会在点击后联网。下方六幅站内示意不调用地图服务。</p>
  <div class="geo-online" id="geo-online" hidden>
    <div class="geo-tiles" id="geo-tiles" role="img" aria-label="现代地理底图"><div id="geo-layer" aria-hidden="true"></div><span class="geo-pin" aria-hidden="true">⌖</span></div>
    <div class="geo-actions" aria-label="地图缩放"><button type="button" id="geo-minus" aria-label="缩小地图">−</button><output id="geo-zoom">7</output><button type="button" id="geo-plus" aria-label="放大地图">＋</button></div>
    <p id="geo-credit" class="geo-credit"></p>
  </div>
  <div class="geo-external"><a id="geo-osm" href="https://www.openstreetmap.org/?mlat=36.86&amp;mlon=39.03#map=9/36.86/39.03" target="_blank" rel="noopener">OpenStreetMap ↗</a><a id="geo-google" href="https://www.google.com/maps/search/?api=1&amp;query=36.86%2C39.03" target="_blank" rel="noopener">Google Maps ↗</a><a id="geo-esri" href="https://www.arcgis.com/apps/instant/basic/index.html?appid=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener">Esri World Imagery ↗</a></div>
</section>
${chapters}
<section class="chapter" id="geo-compare">
  <h2>同一片土地，三个读法</h2>
  <div class="geo-compare">${[
    ['⌖ 地理','哈兰、迦南、埃及','寄居与饥荒解释迁徙的压力。先看人从哪里来，向哪里去。'],
    ['♜ 历史','亚述、巴比伦、波斯','区分北国陷落、犹大被掳和波斯治下归回。三次权力变动对应不同经文处境。'],
    ['✦ 神学','西奈、耶路撒冷、万民','把拯救、立约、基督成全与普世见证连起来。具体地点承载故事，经文解释故事的意义。']
  ].map(([h,loc,desc])=>`<article><h3>${h}</h3><strong>${loc}</strong><p>${desc}</p></article>`).join('')}</div>
  <h3>三次帝国变动怎么区分</h3>
  <div class="table-wrap geo-table" tabindex="0" role="region" aria-label="亚述、巴比伦和波斯对照表">
    <table><thead><tr><th scope="col">时期与地点</th><th scope="col">历史事件</th><th scope="col">读经抓手</th></tr></thead>
    <tbody><tr><th scope="row">亚述 · 撒马利亚<br>约前722/721</th><td>北国首都陷落</td><td>王下17 · 背约与驱逐</td></tr>
    <tr><th scope="row">巴比伦 · 耶路撒冷<br>约前587/586</th><td>犹大城破，圣殿毁坏</td><td>王下25；耶29 · 被掳中的生活</td></tr>
    <tr><th scope="row">波斯 · 巴比伦与耶路撒冷<br>前539以后</th><td>帝国易手，归回与重建开始</td><td>拉1、6；来8 · 归回与新约盼望</td></tr></tbody></table>
  </div>
  <h3>读图到释经的流程</h3>
  <ol class="geo-process"><li>找地点</li><li>排事件</li><li>查文化</li><li>读上下文</li><li>用自己的话复述</li></ol>
</section>
<section class="chapter" id="geo-video">
  <h2>一分钟复习 · 从迁徙到万民</h2>
  <video class="geo-video" controls preload="none" playsinline poster="assets/geo/galilee.webp" width="960" height="540" aria-label="带中文图解与字幕的六幕地理故事">
    <source src="assets/geo/story.mp4" type="video/mp4">
    <track kind="captions" label="中文说明" srclang="zh" src="assets/geo/story.vtt">
    <a href="assets/geo/story.mp4">打开复习视频</a>
  </video>
  <details class="geo-recall"><summary>阅读视频讲解稿</summary><ol>${scenes.map(s=>`<li><b>${s.title}</b><p>${escape(s.story)}</p></li>`).join('')}</ol></details>
</section>
<section class="chapter" id="geo-sources">
  <h2>原文与历史资料</h2>
  <p>地名旁的坐标用于今日定位。区域、事件纪年和争议地点的判断以相应经文与标注为准。</p>
  <ul>
    <li>站内海岸轮廓 · <a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth 公共领域资料</a></li>
    <li>历史背景 · <a href="https://www.metmuseum.org/exhibitions/listings/2014/assyria-to-iberia">大都会艺术博物馆：从亚述到伊比利亚</a> · <a href="https://www.metmuseum.org/essays/the-achaemenid-persian-empire-550-330-b-c">阿契美尼德波斯帝国</a> · <a href="https://www.metmuseum.org/essays/trade-between-the-romans-and-the-empires-of-asia">罗马与亚洲的贸易</a></li>
    <li>三份普世信经 · <a href="creeds.html">干净阅读与背诵</a> · <a href="overview.html#creeds">三份信经深度对比</a></li>
    <li>CCI 三项联合信条原文 · <a href="https://ccifellowship.org/books/book-of-praise/confessions/heidelberg-catechism">海德堡要理问答</a> · <a href="https://www.ccifellowship.org/index.php/books/book-of-praise/confessions/the-belgic-confession">比利时信条</a> · <a href="https://ccifellowship.org/books/book-of-praise/confessions/canons-of-dort">多特信经</a> · <a href="overview.html#confession-guide">本站条文导读</a></li>
  </ul>
</section>`;

await studyPage('geography', '圣经地理、历史与文化', '从列祖迁徙到使徒入罗马。六幅站内图、三种实时底图、一条救赎故事线。', body);
await writeFile('assets/geo/scenes.json', JSON.stringify(scenes.map(({id,title,places})=>({id,title,places}))));
