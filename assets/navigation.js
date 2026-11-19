/* Heading-derived navigation keeps links in step with the current document. */
(() => {
  const toc = document.querySelector('#bookToc, #tocTree');
  if (toc) {
    const headings = [...document.querySelectorAll('main h2,main h3,main h4')]
      .filter(h => !h.closest('.creed-paragraphs,.live-event,.harmony-index'));
    const tree = document.createElement('div');
    const sourceNav=toc.querySelector('[data-source-nav]')?.cloneNode(true);
    if(sourceNav)tree.append(sourceNav);
    const stack = [{level:1, container:tree}];
    headings.forEach((heading,index) => {
      const level = Number(heading.tagName.slice(1));
      const parentSection = heading.closest('section[id], article[id]');
      const id = heading.id || (level === 2 && parentSection?.id) || 'reading-heading-' + index;
      if (!heading.id && id !== parentSection?.id) heading.id=id;
      while (stack.length > 1 && stack.at(-1).level >= level) stack.pop();
      const detail = document.createElement('details');
      detail.className='toc-branch';
      detail.dataset.headingLevel=String(level - 1);
      const summary = document.createElement('summary');
      summary.textContent=heading.textContent.trim();
      const link = document.createElement('a');
      link.href='#'+id;
      link.textContent='阅读本节 →';
      detail.append(summary,link);
      stack.at(-1).container.append(detail);
      stack.push({level,container:detail});
    });
    if (headings.length) toc.replaceChildren(tree);
    const controls=document.createElement('div');
    controls.className='toc-v2-tools';
    const input=document.createElement('input');
    input.type='search';input.placeholder='搜索本页目录';input.setAttribute('aria-label','筛选本页目录');
    const buttons=document.createElement('div');
    const details=[...toc.querySelectorAll('details')];
    for(const d of details)if(!d.dataset.headingLevel)d.dataset.headingLevel=String(1+[...ancestors(d)].length);
    function* ancestors(element){let p=element.parentElement;while(p&&p!==toc){if(p.tagName==='DETAILS')yield p;p=p.parentElement;}}
    for (const [label,depth] of [['一级',0],['二级',1],['三级',2],['全开',99]]) {
      const button=document.createElement('button');
      button.type='button';button.textContent=label;
      button.addEventListener('click',()=> {
        input.value='';
        for(const d of details){d.hidden=false;d.open=Number(d.dataset.headingLevel || 1)<=depth;}
      });
      buttons.append(button);
    }
    input.addEventListener('input',()=>{
      const query=input.value.trim().toLowerCase();
      for(const d of [...details].reverse()){
        const found=!query||d.textContent.toLowerCase().includes(query);
        d.hidden=!found;
        if(query&&found)d.open=true;
      }
    });
    controls.append(input,buttons);toc.before(controls);
    for(const d of details)d.open=false;
  }

  const prefix=location.pathname.includes('/books/')?'../':'';
  const dock=document.createElement('details');
  dock.className='travel-dock';
  const toggle=document.createElement('summary');
  toggle.textContent='⌘';toggle.setAttribute('aria-label','展开页面导航');
  dock.append(toggle);
  const commands=[
    ['←','返回上一页',()=>history.back()],
    ['→','前进下一页',()=>history.forward()],
    ['↑','到页面顶部',()=>window.scrollTo({top:0,behavior:'instant'})],
    ['↓','到页面底部',()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})],
    ['⌂','返回66卷主页',()=>location.href=prefix+'index.html'],
    ['✎','主题与笔记',()=>document.querySelector('.experience-button')?.click()]
  ];
  const actions=document.createElement('div');
  for(const [icon,title,run] of commands){
    const button=document.createElement('button');button.type='button';
    button.textContent=icon;button.title=title;button.setAttribute('aria-label',title);
    button.addEventListener('click',()=>{dock.open=false;run();});
    actions.append(button);
  }
  dock.append(actions);document.body.append(dock);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')dock.open=false});
  document.addEventListener('click',e=>{if(!dock.contains(e.target))dock.open=false});
})();
/* The reading cue expands its matching section before the browser jumps. */
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-open-reading]');
  if (!link) return;
  const disclosure = document.getElementById(link.hash.slice(1))?.querySelector('.panorama-disclosure');
  if (disclosure) disclosure.open = true;
});
