/* Native SVG and requestAnimationFrame: no animation library or external requests. */
const host = document.querySelector('#motionMount') || document.querySelector('#timeline') || document.querySelector('main');
if (host) {
  const panel = document.createElement('section');
  panel.className = 'atlas-motion';
  panel.id = 'animated-atlas';
  panel.setAttribute('aria-label', '动画历史学习台');
  panel.innerHTML = `
    <div class="motion-heading"><div><p class="motion-kicker">EXPLORE THE STORY · 动态历史图谱</p><h2>让年代、王国与地点一起动起来</h2></div></div>
    <p>拖动年代游标，看南北王国的兴衰。地图为方位示意，路线不代表精确行程；列王共治时会同时显示多位名字。</p>
    <div class="motion-controls"><button type="button" id="atlasPlay" aria-pressed="false">▶ 播放历史</button><button type="button" id="atlasReset">↺ 回到分裂</button><output id="atlasYear" for="atlasYearRange">主前 931 年</output></div>
    <label class="motion-range-label" for="atlasYearRange">历史游标 · 可用键盘方向键微调</label><input id="atlasYearRange" class="motion-range" type="range" min="0" max="473" step="1" value="0" aria-valuetext="主前931年">
    <div class="motion-ticks"><span>前931 分裂</span><span>前722 北亡</span><span>前586 南亡</span><span>前458 以斯拉</span></div>
    <div class="motion-kingdoms"><div class="motion-north"><span>北国 · 以色列</span><strong id="atlasNorth"></strong><div class="motion-track"><i id="northLife"></i></div></div><div class="motion-south"><span>南国 · 犹大</span><strong id="atlasSouth"></strong><div class="motion-track"><i id="southLife"></i></div></div></div>
    <div class="motion-event"><span id="atlasEventDate"></span><h3 id="atlasEventTitle"></h3><p id="atlasEventDetail"></p></div>
    <div class="motion-events" role="group" aria-label="跳至关键事件"></div>
    <div class="motion-map-head"><h3>帝国之间，应许没有中断</h3><div role="group" aria-label="选择历史路线"><button type="button" class="route-button" data-route="exile" aria-pressed="true">↗ 被掳方向</button><button type="button" class="route-button" data-route="return" aria-pressed="false">↙ 归回方向</button><button type="button" id="routeReplay">重播路线</button></div></div>
    <svg class="motion-map" viewBox="0 0 900 360" role="img" aria-labelledby="motionMapTitle motionMapDesc"><title id="motionMapTitle">犹大、巴比伦与波斯区域方向图</title><desc id="motionMapDesc">路线示意从耶路撒冷绕经北方到巴比伦，或反向归回。图形非比例，不复原古代精确疆界。</desc><defs><linearGradient id="atlasLand" x2="1" y2="1"><stop stop-color="#f1ead7"/><stop offset="1" stop-color="#dfebdf"/></linearGradient></defs><rect width="900" height="360" rx="24" fill="url(#atlasLand)"/><path d="M0 0H260L225 90 195 150 180 280 100 360H0Z" fill="#b3d5da"/><path d="M265 277Q305 80 470 76T738 205" fill="none" stroke="#c8b882" stroke-width="38" opacity=".35"/><g fill="#254c49" font-family="sans-serif" font-size="20"><text x="45" y="105">地中海</text><text x="62" y="303">埃及</text><text x="215" y="213">耶路撒冷</text><text x="322" y="70">叙利亚</text><text x="565" y="73">亚述</text><text x="651" y="236">巴比伦</text><text x="771" y="291">波斯</text><text x="385" y="306" font-size="17" opacity=".7">阿拉伯旷野</text></g><path id="atlasRoute" d="M275 230Q310 100 442 105T690 205" fill="none" stroke="#b25c43" stroke-width="4" stroke-linecap="round"/><circle cx="275" cy="230" r="7" fill="#294f4b"/><circle cx="690" cy="205" r="7" fill="#294f4b"/><circle id="atlasTraveler" r="9" fill="#ad7540" stroke="#fffdf8" stroke-width="4"/><text x="25" y="339" fill="#486560" font-size="14" font-family="sans-serif">古代近东方位示意 · 非比例地图 · 不复原精确路线</text></svg>
    <p><a href="geography.html?scene=exile#live-map">⌖ 对照本站图解与今日地图 →</a></p><p id="routeCaption" class="motion-caption"></p><p class="motion-caption">年代采用常见近似重建，部分共治与即位年代有争议；点击事件读具体说明。尊重“减少动态效果”设置，动画默认不自动播放。</p>`;
  host.prepend(panel);

  const milestones = [
    [931,'王国分裂','罗波安与耶罗波安一世：政治分裂伴随敬拜中心分裂（王上12）。'],
    [722,'北国灭亡','亚述攻陷撒马利亚；常见纪年为前722/721年（王下17）。'],
    [586,'耶路撒冷与圣殿被毁','巴比伦毁殿、掳走百姓；前587/586年有不同纪年（王下25）。'],
    [538,'古列准许归回','波斯的诏令为归回开路，归回分批发生；不是犹大立即获得政治独立（拉1）。'],
    [516,'第二圣殿完成','常记前516/515年；重建圣殿恢复敬拜，仍盼望更完全的成全（拉6）。'],
    [458,'以斯拉教导律法','按传统纪年定位以斯拉使命；另有年代方案，不能与经文明说等同（拉7）。']
  ];
  const north=[['耶罗波安一世',931,910],['拿答',910,909],['巴沙',909,886],['以拉',886,885],['心利',885,885],['暗利',885,874],['亚哈',874,853],['亚哈谢',853,852],['约兰',852,841],['耶户',841,814],['约哈斯',814,798],['约阿施',798,782],['耶罗波安二世',793,753],['撒迦利雅',753,752],['沙龙',752,752],['米拿现',752,742],['比加辖',742,740],['比加',752,732],['何细亚',732,722]];
  const south=[['罗波安',931,913],['亚比央',913,911],['亚撒',911,870],['约沙法',873,848],['约兰',853,841],['亚哈谢',841,841],['亚他利雅',841,835],['约阿施',835,796],['亚玛谢',796,767],['乌西雅',792,740],['约坦',750,732],['亚哈斯',735,715],['希西家',729,686],['玛拿西',697,642],['亚们',642,640],['约西亚',640,609],['约哈斯',609,609],['约雅敬',609,598],['约雅斤',598,597],['西底家',597,586]];
  const $ = selector=>panel.querySelector(selector);
  const range=$('#atlasYearRange');
  const play=$('#atlasPlay');
  let running=false, frame=0, lastTime=0, elapsed=0, mapFrame=0, reverse=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  $('.motion-events').innerHTML=milestones.map(([year,title])=>`<button type="button" data-year="${year}" aria-pressed="false"><b>前${year}</b><span>${title}</span></button>`).join('');
  function stop(){running=false;cancelAnimationFrame(frame);play.textContent='▶ 播放历史';play.setAttribute('aria-pressed','false');lastTime=0;elapsed=0;}
  function monarchs(data,year,fall,after){return year<=fall?after:data.filter(([,start,end])=>year<=start&&year>=end).map(([name])=>name).join(' / ')||'纪年衔接期';}
  function update(){
    const year=931-Number(range.value);range.setAttribute('aria-valuetext',`主前${year}年`);$('#atlasYear').value=`主前 ${year} 年`;
    $('#atlasNorth').textContent=monarchs(north,year,722,'王国已亡 · 亚述统治');
    $('#atlasSouth').textContent=monarchs(south,year,586,year<=538?'波斯时期 · 归回群体':'亡国被掳 · 巴比伦时期');
    $('#northLife').style.transform=`scaleX(${Math.max(0,(year-722)/209)})`;
    $('#southLife').style.transform=`scaleX(${Math.max(0,(year-586)/345)})`;
    const event=[...milestones].reverse().find(([date])=>year<=date)||milestones[0];
    $('#atlasEventDate').textContent=`最近的历史节点 · 前${event[0]}`;$('#atlasEventTitle').textContent=event[1];$('#atlasEventDetail').textContent=event[2];
    panel.querySelectorAll('[data-year]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.year)===event[0])));
  }
  function tick(now){if(!running)return;if(lastTime)elapsed+=Math.min(now-lastTime,100);lastTime=now;if(elapsed>=60){range.value=Math.min(473,Number(range.value)+Math.floor(elapsed/60));elapsed%=60;update();}if(Number(range.value)>=473){stop();return;}frame=requestAnimationFrame(tick);}
  play.addEventListener('click',()=>{if(running){stop();return;}if(Number(range.value)>=473)range.value=0;running=true;play.textContent='Ⅱ 暂停历史';play.setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);});
  range.addEventListener('input',()=>{stop();update();});$('#atlasReset').addEventListener('click',()=>{stop();range.value=0;update();});
  panel.querySelectorAll('[data-year]').forEach(button=>button.addEventListener('click',()=>{stop();range.value=931-Number(button.dataset.year);update();}));
  const path=$('#atlasRoute'),traveler=$('#atlasTraveler');const length=path.getTotalLength();
  function move(t){const point=path.getPointAtLength((reverse?1-t:t)*length);traveler.setAttribute('cx',point.x);traveler.setAttribute('cy',point.y);}
  function replay(){cancelAnimationFrame(mapFrame);path.style.stroke=reverse?'#367c6c':'#b25c43';$('#routeCaption').textContent=reverse?'归回方向：巴比伦 → 耶路撒冷。波斯帝国下的归回使余民重建敬拜，尚未实现末世完全的安息。':'被掳方向：耶路撒冷 → 巴比伦。图示南国被掳方向；北国人口迁往亚述的路线并未画入。';if(reduced.matches){move(1);return;}let start;function animate(now){start??=now;const t=Math.min(1,(now-start)/2600);move(t);if(t<1)mapFrame=requestAnimationFrame(animate);}mapFrame=requestAnimationFrame(animate);}
  panel.querySelectorAll('[data-route]').forEach(button=>button.addEventListener('click',()=>{reverse=button.dataset.route==='return';panel.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));replay();}));
  $('#routeReplay').addEventListener('click',replay);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelAnimationFrame(mapFrame);}});
  reduced.addEventListener('change',()=>{stop();cancelAnimationFrame(mapFrame);move(1);});
  update();move(0);$('#routeCaption').textContent='选择“被掳方向”或“归回方向”，播放区域路线。地图为方位示意。';
}
