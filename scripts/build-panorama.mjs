import {readFile, readdir, writeFile} from 'node:fs/promises';
import {studyPage, esc} from './study-shell.mjs';

const source = JSON.parse(await readFile('data/panorama-source.json', 'utf8'));
const flow = JSON.parse(await readFile('data/panorama-flow.json', 'utf8'));
const {books, groups} = JSON.parse(await readFile('assets/books.json', 'utf8'));
const guides = (await readFile('data/panorama-reading-guides.txt', 'utf8'))
  .trim().split(/\r?\n/).map(line => line.split('｜'));
const files = (await readdir('books')).filter(file => /^\d\d-.*\.html$/.test(file)).sort();
if (guides.length !== books.length || guides.some(fields => fields.length !== 2 || fields.some(field => !field))) {
  throw new Error('Each book requires a reading question and a guide');
}

const bookFiles = number => files.filter(file => file.startsWith(String(number).padStart(2, '0') + '-'));
const oldSlug = entry => 'panorama-' + String(entry.start).padStart(3, '0');
const supplemental = new Map([
  [1, ['panorama.html', 'panorama-about']], [5, ['panorama.html', 'panorama-about']],
  [9, ['panorama.html', 'panorama-about']], [199, ['panorama.html', 'panorama-about']],
  [11, ['overview.html', 'whole']], [13, ['overview.html', 'whole']], [201, ['overview.html', 'whole']],
  [115, ['prophets.html', 'group-core']], [227, ['epistles.html', 'group-core']],
  [320, ['preaching.html', 'spiritual-conflict']], [325, ['preaching.html', 'redemptive-history']],
  [331, ['preaching.html', 'preaching-reform']], [335, ['preaching.html', 'sermon-preparation']]
]);
const entryByStart = new Map(source.entries.map(entry => [entry.start, entry]));

function renderBlock(block, entry, index) {
  const id = 'panorama-text-' + entry.start + '-' + (index + 1);
  const text = block.kind === 'index' ? block.text.replace(/\s*\.{3,}\s*\d+\s*$/, '') : block.text;
  const tag = block.kind === 'heading' ? 'h4' : 'p';
  return `<${tag} id="${id}" data-source-block="${entry.start}:${index}" class="source-${block.kind}">${esc(text)}</${tag}>`;
}

function chapterParts(entry) {
  const blocks = flow[entry.start].map((block, index) => ({...block, index}));
  const reflection = blocks.findIndex(block => block.kind === 'reflection');
  const body = reflection < 0 ? blocks : blocks.slice(0, reflection);
  return {body, exercises: reflection < 0 ? [] : blocks.slice(reflection)};
}

function renderBlocks(entry, blocks) {
  return blocks.map(block => renderBlock(block, entry, block.index)).join('');
}

function collapsible(entry, blocks, label, id = '') {
  return `<details class="panorama-disclosure"${id ? ' id="' + id + '"' : ''}>
    <summary><span class="panorama-disclosure-label">${esc(label)}</span><span class="panorama-disclosure-icon" aria-hidden="true"></span></summary>
    <div class="panorama-prose">${renderBlocks(entry, blocks)}</div>
  </details>`;
}

function section(id, title, body) {
  return `<section class="chapter panorama-section" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
}

function addInside(html, id, markup, atStart = false) {
  const open = html.match(new RegExp('<section\\b[^>]*\\bid="' + id + '"[^>]*>'));
  if (!open) throw new Error('Missing target section ' + id);
  const start = open.index + open[0].length;
  if (atStart) {
    const headingEnd = html.indexOf('</h2>', start);
    if (headingEnd < 0) throw new Error('Missing heading in ' + id);
    const position = headingEnd + 5;
    return html.slice(0, position) + markup + html.slice(position);
  }
  // Existing reader anchors identify flat sections. The few descendants that
  // use sections in the overview are balanced here before inserting anything.
  const tags = /<\/?section\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 1;
  for (let match; (match = tags.exec(html));) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(0, match.index) + markup + html.slice(match.index);
  }
  throw new Error('Unclosed section ' + id);
}

for (const entry of source.entries.filter(entry => entry.book)) {
  const {body, exercises} = chapterParts(entry);
  const [question, prompt] = guides[entry.book - 1];
  const lead = body.slice(0, body[0]?.kind === 'heading' ? 2 : 1);
  const rest = body.slice(lead.length);
  const start = `<aside class="panorama-bridge" aria-labelledby="panorama-question" id="panorama-reading">
    <div class="panorama-kicker"><span aria-hidden="true">◇</span> 带着一个问题读</div>
    <h3 id="panorama-question">${esc(question)}</h3>
    <p>${esc(prompt)}</p>
    <div class="panorama-steps"><a href="#structure">看结构</a><a href="#panorama-continuation" data-open-reading>读全景解读</a>${exercises.length ? '<a href="#panorama-recall" data-open-reading>做默想</a>' : ''}</div>
  </aside>
  <div class="panorama-excerpt"><div class="panorama-byline">刘道顺 ·《新旧约圣经全景》</div><div class="panorama-prose">${renderBlocks(entry, lead)}</div></div>`;
  const continuation = `<div class="panorama-inline" id="panorama-continuation">
    ${collapsible(entry, rest, '沿着本卷结构，接着读刘道顺牧师的全景解读')}
    <a class="panorama-small-link" href="../${oldSlug(entry)}.html">连续阅读本篇 ↗</a>
  </div>`;
  const reflection = exercises.length ? `<div class="panorama-reflection" id="panorama-recall">
    <h3>用自己的话复述</h3><p>合上正文，先试着回答，再翻回经文。</p>
    ${collapsible(entry, exercises, '展开原书默想题')}
  </div>` : '';
  for (const file of bookFiles(entry.book)) {
    let html = await readFile('books/' + file, 'utf8');
    html = addInside(html, 'whole', start, true);
    html = addInside(html, 'structure', continuation);
    if (reflection) html = addInside(html, 'recall', reflection, true);
    await writeFile('books/' + file, html);
  }
}

function insertReading(entry, label = entry.title) {
  const blocks = flow[entry.start].map((block, index) => ({...block, index}));
  return collapsible(entry, blocks, label, 'panorama-reading-' + entry.start);
}

const contextualReadings = [
  ['overview.html', 'whole', [11,13,201]],
  ['study.html', 'whole', [11,13,201]],
  ['prophets.html', 'group-core', [115]],
  ['epistles.html', 'group-core', [227]]
];
for (const [file, id, entries] of contextualReadings) {
  let html = await readFile(file, 'utf8');
  html = addInside(html, id, `<aside class="panorama-inline"><div class="panorama-byline">刘道顺 ·《新旧约圣经全景》</div>${entries.map(start => insertReading(entryByStart.get(start))).join('')}</aside>`);
  await writeFile(file, html);
}

const sermonTopics = [
  [320, '属灵争战与传道', '从弗6:10–18读群体如何靠主站立，再比较作者怎样把属灵争战与教会见证相连。'],
  [325, '给经文找到救赎史的位置', '先问当时发生了什么，再追踪应许怎样延续，最后说明这段经文怎样指向基督。'],
  [331, '检视讲道把重心放在哪里', '用作者提出的问题检查一篇讲章的中心、经文依据，以及如何让会众听见福音。'],
  [335, '预备一篇可以讲清楚的讲章', '从选段、理解上下文到写出中心句，再用听众的处境检验应用是否具体。']
];
const sermon = sermonTopics.map(([start, title, prompt]) => {
  const [,id] = supplemental.get(start);
  return section(id, title, `<p class="panorama-deck">${esc(prompt)}</p>${insertReading(entryByStart.get(start), '读这篇讲道文章')}`);
}).join('');
await studyPage('preaching', '从研经到讲道', '用四篇文章练习解释经文、连接救赎历史与预备应用。', sermon);

const paths = [
  ['◈','从应许读到归回','创造、立约、王国、被掳与归回','overview.html#whole'],
  ['✦','从基督读到万民','耶稣的事工、受难、复活与教会见证','geography.html#galilee'],
  ['❧','从研经读到讲道','找准经文脉络，形成清楚的解释与应用','preaching.html']
];
const pathLinks = paths.map(([icon, title, caption, href]) =>
  `<a href="${href}"><span aria-hidden="true">${icon}</span><strong>${title}</strong><small>${caption}</small></a>`
).join('');
const readingIndex = groups.map(group => {
  const list = books.flatMap((book,index) => {
    if(book.group !== group.id) return [];
    return [`<li><a href="books/${bookFiles(index+1)[0]}#panorama-reading">${esc(book.name)}</a></li>`];
  }).join('');
  return `<article class="panorama-shelf-group"><h3>${esc(group.name)}</h3><ul>${list}</ul></article>`;
}).join('');
const hub = `<div class="panorama-hub-lead"><div><p class="panorama-deck">从一卷开始，也可以沿着应许、成全和见证读下去。</p>
  <div class="panorama-paths">${pathLinks}</div></div>
  <figure><img src="assets/geo/galilee.webp" width="960" height="320" decoding="async" alt="加利利湖岸的村落与渔船"></figure></div>`
  + section('panorama-shelf','选一卷开始读',`<div class="panorama-shelf">${readingIndex}</div>`)
  + section('panorama-about','关于这本书',`<p>本专题根据刘道顺牧师《新旧约圣经全景》编入各卷。书中的叙述跟随阅读进程安排，作者解读在对应位置署名。</p>
    ${[1,5,9,199].map(start => insertReading(entryByStart.get(start))).join('')}
    <a class="panorama-small-link" href="assets/panorama/original.pdf">下载原资料</a>`);
await studyPage('panorama', '新旧约全景', '从创造与应许，读到基督与新创造。', hub);

for (const [index, entry] of source.entries.entries()) {
  const blocks = flow[entry.start].map((block, blockIndex) => ({...block, index:blockIndex}));
  const alignment = entry.book
    ? ['books/' + bookFiles(entry.book)[0], 'panorama-reading']
    : supplemental.get(entry.start);
  // Preserve old chapter URLs and page bookmarks with continuous web text.
  const anchors = new Map();
  for (const {page} of entry.pages) {
    const at = blocks.findIndex(block => block.page >= page);
    const key = at < 0 ? blocks.length : at;
    anchors.set(key, (anchors.get(key) ?? '') + `<span class="panorama-bookmark" id="pdf-${page}" aria-hidden="true"></span>`);
  }
  const rendered = blocks.map((block, i) => (anchors.get(i) ?? '') + renderBlock(block, entry, i)).join('')
    + (anchors.get(blocks.length) ?? '');
  const previous = index ? `<a href="${oldSlug(source.entries[index - 1])}.html">← ${esc(source.entries[index - 1].title)}</a>` : '';
  const next = index < source.entries.length - 1
    ? `<a href="${oldSlug(source.entries[index + 1])}.html">${esc(source.entries[index + 1].title)} →</a>` : '';
  const paging = `<nav class="panorama-paging" aria-label="连续阅读">${previous}<a href="panorama.html">全书入口</a>${next}</nav>`;
  await studyPage(oldSlug(entry), entry.title, '刘道顺 ·《新旧约圣经全景》',
    section('panorama-continuous','连续阅读',`<p><a class="panorama-small-link" href="${alignment.join('#')}">进入相关精读 →</a></p>
    <div class="panorama-prose">${rendered}</div>`) + paging);
}
