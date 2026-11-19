import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {studyPage,esc} from './study-shell.mjs';
const source=JSON.parse(await readFile('data/panorama-source.json','utf8'));
const {books}=JSON.parse(await readFile('assets/books.json','utf8'));
const names=await readdir('books');
const target=i=>names.find(n=>n.startsWith(String(i).padStart(2,'0')+'-'));
const groups=[['整体与导论',e=>!e.book&&e.start<320],['旧约39卷',e=>e.book&&e.book<=39],['新约27卷',e=>e.book>39],['讲道附录',e=>e.start>=320]];
const pageUrl=e=>'panorama-'+String(e.start).padStart(3,'0')+'.html';
const allMenu=groups.map(([name,test])=>'<details class="toc-branch" open><summary>'+name+'</summary>'+source.entries.filter(test).map(e=>'<a href="'+pageUrl(e)+'">'+esc(e.title)+'</a>').join('')+'</details>').join('');
const paragraph=text=>text.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean).map(t=>'<p>'+esc(t.replace(/\n/g,''))+'</p>').join('');
for(const [index,entry] of source.entries.entries()){
 const b=entry.book?books[entry.book-1]:null;
 let body='<section class="chapter" id="reading-context"><h2>放回整本圣经读</h2><p>刘道顺牧师《新旧约圣经全景》 · PDF第'+entry.start+'—'+entry.end+'页。</p>';
 if(b) body+='<div class="panorama-lenses"><article><h3>本卷的整全位置</h3><p>'+esc(b.whole)+'</p></article><article><h3>圣约与基督</h3><p>'+esc(b.christ)+'</p></article></div><p><a href="books/'+target(entry.book)+'">返回本站逐卷精读 →</a></p>';
 body+='<p>下方为上传资料的文字提取。经文引注、用词和作者释读请与原版及圣经上下文对照。</p><p><a href="assets/panorama/original.pdf#page='+entry.start+'">查看原版对应页 ↗</a></p></section>';
 if(entry.questions.length)body+='<section class="chapter" id="source-recall"><h2>原书默想 · 先尝试复述</h2><ol>'+entry.questions.map(q=>'<li>'+esc(q)+'</li>').join('')+'</ol></section>';
 body+=entry.pages.map(({page,text})=>'<section class="chapter source-page" id="pdf-'+page+'"><h2>PDF第'+page+'页</h2>'+paragraph(text)+'</section>').join('');
 body+='<nav class="panorama-paging" aria-label="资料连续阅读">'+(index?'<a href="'+pageUrl(source.entries[index-1])+'">← '+esc(source.entries[index-1].title)+'</a>':'')+'<a href="panorama.html">全书目录</a>'+(index+1<source.entries.length?'<a href="'+pageUrl(source.entries[index+1])+'">'+esc(source.entries[index+1].title)+' →</a>':'')+'</nav>';
 const slug=pageUrl(entry).replace('.html','');
 await studyPage(slug,entry.title,'刘道顺牧师《新旧约圣经全景》 · 对照阅读',body);
 let html=await readFile(pageUrl(entry),'utf8');
 html=html.replace('<nav id="bookToc" class="book-toc" aria-label="分层学习目录">','<nav id="bookToc" class="book-toc" aria-label="分层学习目录"><details class="toc-branch" data-source-nav><summary>整本资料</summary>'+allMenu+'</details>');
 await writeFile(pageUrl(entry),html);
}
const overview='<section class="chapter" id="panorama-guide"><h2>从全景进入每一卷</h2><p>《新旧约圣经全景》把各卷放回救赎历史，追问神所作的事、人的回应，以及应许怎样在基督里成全。先读本卷整体位置，再阅读作者原文和默想题，最后回到经文核对。</p><ol class="panorama-flow"><li>整体脉络</li><li>本卷处境</li><li>作者论证</li><li>经文核对</li><li>复述与回应</li></ol><p>339页全部按实际正文起点归入79个阅读单元，包含封面、推荐、目录、序言、66卷和附录。</p><a href="assets/panorama/original.pdf">打开完整原版PDF</a></section>'+groups.map(([name,test],i)=>'<section class="chapter" id="panorama-group-'+i+'"><h2>'+name+'</h2><div class="panorama-index">'+source.entries.filter(test).map(e=>'<article><h3><a href="'+pageUrl(e)+'">'+esc(e.title)+'</a></h3><p>PDF '+e.start+'—'+e.end+'页</p></article>').join('')+'</div></section>').join('');
await studyPage('panorama','新旧约全景 · 整本对照阅读','刘道顺牧师 · 339页完整资料与66卷学习相连',overview);
for(const entry of source.entries.filter(e=>e.book)){
 for(const f of names.filter(n=>n.startsWith(String(entry.book).padStart(2,'0')+'-'))){
  let html=await readFile('books/'+f,'utf8');
  const box='<section class="chapter" id="panorama-reading"><h2>延伸阅读 · 刘道顺牧师全景</h2><p>结合本卷处境与论证，读原书对应章节及默想题。</p><p><a href="../'+pageUrl(entry)+'">本卷全景 · PDF '+entry.start+'—'+entry.end+'页 →</a></p></section>';
  html=html.replace('<section id="recall"',box+'<section id="recall"').replace('</nav><div class="book-side-foot">','<a href="#panorama-reading">全景资料与默想</a></nav><div class="book-side-foot">');
  await writeFile('books/'+f,html);
 }
}

const relatedTopics = {
  'overview.html': [11,13,201],
  'study.html': [11,13,201],
  'prophets.html': [115],
  'epistles.html': [227],
  'gospels.html': [203,208,212,217],
  'jesus-life.html': [203,208,212,217],
  'nt-history.html': [222],
  'kings-chronicles.html': [65,71,74,78],
  'study-paths.html': [13,325,331,335]
};
for (const [file, starts] of Object.entries(relatedTopics)) {
  let html=await readFile(file,'utf8');
  html=html.replace(/<section class="chapter" id="panorama-topic">[\s\S]*?<\/section>/g,'');
  const section='<section class="chapter" id="panorama-topic"><h2>新旧约全景 · 连着读</h2><ul>'+starts.map(start=>{
    const entry=source.entries.find(e=>e.start===start);
    return '<li><a href="'+pageUrl(entry)+'">'+esc(entry.title)+' · PDF '+entry.start+'—'+entry.end+'页</a></li>';
  }).join('')+'</ul><p><a href="panorama.html">全部资料与讲道附录 →</a></p></section>';
  html=html.replace('</main>',section+'</main>');
  await writeFile(file,html);
}
