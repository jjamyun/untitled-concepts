
async function resetSeen(){
  if(navLocked) return;
  navLocked=true;
  const end=document.querySelector('#endCard');
  end?.classList.remove('end-animate');
  end?.classList.add('end-out');
  await sleep(1400);
  end?.classList.remove('end-out');
  await resetSeenImmediate();
  navLocked=false;
  setTimeout(()=>prefetchAdjacent(),50);
}


let navLocked=false;
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function topicById(id){return TOPICS.find(t=>t.id===id)}
async function animateCard(direction, work){
  if(navLocked) return;
  navLocked=true;
  const card=document.querySelector('#card');
  const nav=document.querySelector('.nav-actions');
  const out=direction==='next'?'anim-out-left':'anim-out-right';
  const inn=direction==='next'?'anim-in-right':'anim-in-left';
  card.classList.remove('anim-out-left','anim-out-right','anim-in-left','anim-in-right');
  nav?.classList.remove('nav-fade-out','nav-fade-in');

  const ghost=card.cloneNode(true);
  const rect=card.getBoundingClientRect();
  ghost.id='transitionGhost';
  ghost.style.position='fixed';
  ghost.style.left=rect.left+'px';
  ghost.style.top=rect.top+'px';
  ghost.style.width=rect.width+'px';
  ghost.style.height=rect.height+'px';
  ghost.style.margin='0';
  ghost.style.zIndex='50';
  ghost.style.pointerEvents='none';
  document.body.appendChild(ghost);

  card.style.visibility='hidden';
  const workPromise=Promise.resolve().then(work);

  ghost.classList.add(out);
  nav?.classList.add('nav-fade-out');
  await Promise.all([sleep(2000),workPromise]);

  ghost.remove();
  nav?.classList.remove('nav-fade-out');

  card.style.visibility='';
  void card.offsetWidth;
  card.classList.add(inn);
  nav?.classList.add('nav-fade-in');

  // Navigation stays locked until BOTH incoming card and nav fade are complete.
  await sleep(1250);
  card.classList.remove(inn);
  nav?.classList.remove('nav-fade-in');
  navLocked=false;
}
async function renderLibraryFixed(tab='all'){
  const rows=await getAll();
  const merged=rows.map(r=>({record:r,topic:topicById(r.id)}))
    .filter(x=>x.topic && (tab!=='saved' || x.record.saved))
    .sort((a,b)=>a.topic.title.localeCompare(b.topic.title,undefined,{sensitivity:'base'}));
  const items=merged.map(x=>`<button class="library-row library-topic" data-topic-id="${x.topic.id}">
    <b>${x.topic.title}</b>${x.record.saved?'<span aria-label="saved">★</span>':''}
  </button>`).join('');
  document.querySelector('#sheet').classList.add('library-open');
  openSheet(`<h1>Library</h1>
    <div class="library-tabs">
      <button class="library-tab ${tab==='all'?'active':''}" data-lib-tab="all">All</button>
      <button class="library-tab ${tab==='saved'?'active':''}" data-lib-tab="saved">Saved</button>
    </div>
    <div class="library-list">${items || '<p>No subjects here yet.</p>'}</div>`);
  document.querySelectorAll('[data-lib-tab]').forEach(b=>b.onclick=()=>renderLibraryFixed(b.dataset.libTab));
  document.querySelectorAll('.library-topic').forEach(b=>b.onclick=async()=>{
    const t=topicById(b.dataset.topicId); if(!t)return;
    document.querySelector('#sheet').close();
    await showTopic(t,false);
  });
}
function animateEndCard(){
 const e=document.querySelector('#endCard');
 e.classList.remove('end-animate'); void e.offsetWidth; e.classList.add('end-animate');
}


function detailParagraphs(text){
  if(!text) return '';
  const clean = String(text).trim();
  let parts = clean.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean);
  if(parts.length < 2){
    const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean];
    parts=[]; let buf=[];
    for(const s of sentences){
      buf.push(s.trim());
      if(buf.length>=3){ parts.push(buf.join(' ')); buf=[]; }
    }
    if(buf.length) parts.push(buf.join(' '));
  }
  return parts.map(p=>`<p>${p}</p>`).join('');
}

let TOPICS=[],current=null,currentWiki=null,currentImages=[],session=[],sessionIndex=-1,libraryTab='all';const $=s=>document.querySelector(s);const dbp=new Promise((resolve,reject)=>{const r=indexedDB.open('field-note',1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('history'))db.createObjectStore('history',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});async function getAll(){const db=await dbp;return new Promise((res,rej)=>{const r=db.transaction('history').objectStore('history').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}async function getRec(id){const db=await dbp;return new Promise(res=>{const r=db.transaction('history').objectStore('history').get(id);r.onsuccess=()=>res(r.result)})}async function putRec(rec){const db=await dbp;return new Promise((res,rej)=>{const r=db.transaction('history','readwrite').objectStore('history').put(rec);r.onsuccess=res;r.onerror=()=>rej(r.error)})}async function markSeen(t){let r=await getRec(t.id)||{id:t.id,title:t.title,saved:false,timesViewed:0};r.title=t.title;if(!r.firstSeen)r.firstSeen=new Date().toISOString();r.lastSeen=new Date().toISOString();r.timesViewed=(r.timesViewed||0)+1;await putRec(r)}async function toggleSave(e){e?.stopPropagation();let r=await getRec(current.id)||{id:current.id,title:current.title,timesViewed:1,firstSeen:new Date().toISOString()};r.saved=!r.saved;await putRec(r);await updateBookmark()}async function updateBookmark(){const r=await getRec(current.id),b=$('#bookmarkBtn');b.classList.toggle('saved',!!r?.saved);b.setAttribute('aria-pressed',String(!!r?.saved))}
async function wikiHtml(t){const r=await fetch('https://en.wikipedia.org/w/rest.php/v1/page/'+encodeURIComponent(t.wikiTitle)+'/html');if(!r.ok)throw Error();return r.text()}
async function wiki(t){const r=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(t.wikiTitle));if(!r.ok)throw Error();return r.json()}async function wikiLong(t){const p=new URLSearchParams({action:'query',prop:'extracts',explaintext:'1',exsectionformat:'plain',redirects:'1',titles:t.wikiTitle,format:'json',origin:'*'});const r=await fetch('https://en.wikipedia.org/w/api.php?'+p),j=await r.json();return Object.values(j.query?.pages||{})[0]?.extract||''}async function commons(q,limit=12){const p=new URLSearchParams({action:'query',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:String(limit),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:String(window.matchMedia('(max-width:600px)').matches?900:1400),format:'json',origin:'*'});const r=await fetch('https://commons.wikimedia.org/w/api.php?'+p),j=await r.json();return Object.values(j.query?.pages||{}).filter(x=>x.imageinfo?.[0]?.thumburl).map(x=>{const i=x.imageinfo[0],m=i.extmetadata||{};return{url:i.thumburl,artist:(m.Artist?.value||'Wikimedia Commons').replace(/<[^>]*>/g,''),license:m.LicenseShortName?.value||''}})}function categoryLabel(t){const parts=t.category.split('·').map(x=>x.trim()).filter(Boolean);return parts.length>1?`${parts[0]} / ${parts.slice(1).join(' · ')}`:`${parts[0]} / Reference`}function setHero(im){if(!im)return;$('#hero').classList.add('image-loading');$('#hero').src=im.url;$('#hero').onload=()=>$('#hero').classList.remove('image-loading');$('#hero').alt=current.title;$('#imageCredit').textContent=[im.artist,im.license].filter(Boolean).join(' · ')}async function showTopic(t,{mark=true}={}){current=t;currentWiki=null;currentImages=[];$('#endCard').classList.add('hidden');$('#card').classList.remove('hidden');$('.nav-actions').classList.remove('hidden');$('#headerCategory').textContent=categoryLabel(t);$('#region').textContent=t.region;$('#era').textContent=t.era;$('#title').textContent=t.title;$('#desc').textContent='Loading…';$('#hero').removeAttribute('src');$('#imageCredit').textContent='';if(mark)await markSeen(t);await updateBookmark();updateNav();wiki(t).then(w=>{if(current?.id!==t.id)return;currentWiki=w;$('#desc').textContent=w.extract||w.description||'Tap More to explore this subject.';if(w.thumbnail?.source&&!$('#hero').src)setHero({url:w.thumbnail.source,artist:'Wikipedia / Wikimedia',license:''})}).catch(()=>{if(current?.id===t.id)$('#desc').textContent='Could not reach Wikipedia. Check your connection.'});commons(t.commonsSearch,2).then(imgs=>{if(current?.id!==t.id)return;currentImages=imgs;if(imgs[0])setHero(imgs[0])}).catch(()=>{})}function updateNav(){$('#prevBtn').disabled=sessionIndex<=0}async function nextTopic(){if(sessionIndex<session.length-1){sessionIndex++;return showTopic(session[sessionIndex],{mark:false})}const seen=new Set((await getAll()).filter(x=>x.firstSeen).map(x=>x.id)),left=TOPICS.filter(t=>!seen.has(t.id));if(!left.length){$('#card').classList.add('hidden');$('.nav-actions').classList.add('hidden');$('#endCard').classList.remove('hidden');animateEndCard();return}const t=left[Math.floor(Math.random()*left.length)];session.push(t);sessionIndex=session.length-1;await showTopic(t)}async function prevTopic(){if(sessionIndex<=0)return;sessionIndex--;await showTopic(session[sessionIndex],{mark:false})}function openSheet(html){const sh=$('#sheet');if(!html.includes('<h1>Library</h1>'))sh.classList.remove('library-open');$('#sheetContent').innerHTML=html;sh.showModal()}function expandedHeader(t){return `<h1>${t.title}</h1><div class="sheet-kicker">${categoryLabel(t)}</div><div class="detail-meta">${t.region} — ${t.era}</div>`}
function cleanWikiHtml(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('style,script,nav,aside,figure,table,.mw-editsection,.toc,.vector-toc,.navbox,.vertical-navbox,.infobox,.sidebar,.metadata,.hatnote,.shortdescription,.sistersitebox,.authority-control,.reflist,.references,.mw-references-wrap,sup.reference,ol.references,ul.gallery,.thumb,.portal,.noprint').forEach(n=>n.remove());
  doc.querySelectorAll('a').forEach(a=>a.replaceWith(document.createTextNode(a.textContent||'')));
  const out=document.createElement('div');out.className='detail-copy wiki-article';
  const content=doc.querySelector('body')||doc;
  let count=0;
  for(const el of content.querySelectorAll('h2,h3,h4,p')){
    const txt=(el.textContent||'').replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim();
    if(!txt)continue;
    if(/^((see also|references|external links|further reading|notes|bibliography|sources|contents?)\b)/i.test(txt))break;
    if(el.matches('p')&&txt.length<35)continue;
    const node=document.createElement(el.tagName.toLowerCase());node.textContent=txt;out.appendChild(node);
    if(el.matches('p'))count++;
    if(count>=14)break;
  }
  return out.innerHTML;
}
async function showDetails(){
  openSheet(`${expandedHeader(current)}<div class="detail-copy"><p>Loading expanded context…</p></div>`);
  let rendered='';
  try{rendered=cleanWikiHtml(await wikiHtml(current))}catch{}
  if(!rendered){let long='';try{long=await wikiLong(current)}catch{};if(!long)long=currentWiki?.extract||'';rendered=detailParagraphs(long)}
  const copy=$('#sheetContent').querySelector('.detail-copy');if(copy)copy.innerHTML=rendered
}
async function showImages(){openSheet(`${expandedHeader(current)}<p>Loading images…</p>`);let imgs=currentImages;if(imgs.length<8)try{imgs=await commons(current.commonsSearch,16);currentImages=imgs}catch{};$('#sheetContent').innerHTML=`${expandedHeader(current)}<div class="gallery">${imgs.map(i=>`<figure><img src="${i.url}" loading="lazy" alt=""><figcaption>${[i.artist,i.license].filter(Boolean).join(' · ')}</figcaption></figure>`).join('')}</div>`}
async function showLibrary(){openSheet(`<h1 class="library-title">Library</h1><div class="tabs"><button class="tab active" data-tab="all">All</button><button class="tab" data-tab="saved">Saved</button></div><div id="libraryList" class="library-list"></div>`);document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>renderLibrary(b.dataset.tab));await renderLibrary('all')}async function openLibraryTopic(id){const t=TOPICS.find(x=>x.id===id);if(!t)return;$('#sheet').close();let idx=session.findIndex(x=>x.id===id);if(idx<0){session.push(t);idx=session.length-1}sessionIndex=idx;await showTopic(t,{mark:false})}async function resetSeenImmediate(){const rows=await getAll();for(const r of rows){delete r.firstSeen;delete r.lastSeen;r.timesViewed=0;await putRec(r)}session=[];sessionIndex=-1;await nextTopic()}
function setupGestures(){let sx=0,sy=0;const el=$('#card');el.addEventListener('legacy-touchstart',e=>{sx=e.changedTouches[0].clientX;sy=e.changedTouches[0].clientY},{passive:true});el.addEventListener('legacy-touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3){dx<0?nextTopic():prevTopic()}},{passive:true});document.addEventListener('legacy-keydown',e=>{if($('#sheet').open)return;if(e.key==='ArrowRight')nextTopic();if(e.key==='ArrowLeft')prevTopic()})}
async function init(){TOPICS=await fetch('topics.json',{cache:'no-store'}).then(r=>r.json());$('#nextBtn').onclick=()=>animateCard('next',nextTopic);$('#prevBtn').onclick=()=>animateCard('prev',prevTopic);$('#bookmarkBtn').onclick=toggleSave;$('#detailsBtn').onclick=showDetails;$('#heroButton').onclick=e=>{if(!e.target.closest('#bookmarkBtn'))showImages()};$('#libraryBtn').onclick=()=>renderLibraryFixed('all');$('#reviewBtn').onclick=()=>renderLibraryFixed('all');$('#resetBtn').onclick=resetSeen;$('#closeSheet').onclick=()=>$('#sheet').close();setupGestures();await nextTopic();if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js')}init();


// v13 unified physical navigation inputs.
// Capture phase ensures keyboard arrows use the same animated controller even if older
// handlers exist later in the file.
window.addEventListener('legacy-keydown',e=>{
  if(e.defaultPrevented || navLocked) return;
  const tag=(document.activeElement?.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select') return;
  if(e.key==='ArrowRight'){
    e.preventDefault(); e.stopImmediatePropagation();
    if(typeof nextTopic==='function') animateCard('next',nextTopic);
    else if(typeof reroll==='function') animateCard('next',reroll);
  }else if(e.key==='ArrowLeft'){
    e.preventDefault(); e.stopImmediatePropagation();
    if(typeof prevTopic==='function') animateCard('prev',prevTopic);
  }
},true);

// Independent swipe recognizer on the main viewer. Horizontal gestures use the same
// transition path as buttons and keyboard.
let v13TouchX=null,v13TouchY=null;
document.addEventListener('legacy-touchstart',e=>{
  if(!e.touches?.length || !document.querySelector('#sheet')?.open){
    const t=e.touches?.[0]; if(t){v13TouchX=t.clientX;v13TouchY=t.clientY;}
  }
},{passive:true});
document.addEventListener('legacy-touchend',e=>{
  if(v13TouchX===null || navLocked || document.querySelector('#sheet')?.open){v13TouchX=v13TouchY=null;return}
  const t=e.changedTouches?.[0]; if(!t){v13TouchX=v13TouchY=null;return}
  const dx=t.clientX-v13TouchX,dy=t.clientY-v13TouchY;
  v13TouchX=v13TouchY=null;
  if(Math.abs(dx)<55 || Math.abs(dx)<Math.abs(dy)*1.25) return;
  if(dx<0){
    if(typeof nextTopic==='function') animateCard('next',nextTopic);
    else if(typeof reroll==='function') animateCard('next',reroll);
  }else{
    if(typeof prevTopic==='function') animateCard('prev',prevTopic);
  }
},{passive:true});


// RELEASE: single authoritative keyboard + touch navigation controller.
(function installReleaseNavigation(){
  let sx=null,sy=null;
  const sheet=()=>document.querySelector('#sheet');
  window.addEventListener('keydown',e=>{
    if(navLocked || sheet()?.open || e.defaultPrevented) return;
    const tag=(document.activeElement?.tagName||'').toLowerCase();
    if(['input','textarea','select'].includes(tag)) return;
    if(e.key==='ArrowRight'){
      e.preventDefault();
      animateCard('next',nextTopic);
    }else if(e.key==='ArrowLeft' && sessionIndex>0){
      e.preventDefault();
      animateCard('prev',prevTopic);
    }
  },{capture:true});

  document.addEventListener('touchstart',e=>{
    if(navLocked || sheet()?.open || e.touches.length!==1){sx=sy=null;return}
    sx=e.touches[0].clientX; sy=e.touches[0].clientY;
  },{passive:true});

  document.addEventListener('touchend',e=>{
    if(sx===null || navLocked || sheet()?.open){sx=sy=null;return}
    const t=e.changedTouches?.[0];
    if(!t){sx=sy=null;return}
    const dx=t.clientX-sx,dy=t.clientY-sy;
    sx=sy=null;
    if(Math.abs(dx)<55 || Math.abs(dx)<Math.abs(dy)*1.25) return;
    if(dx<0) animateCard('next',nextTopic);
    else if(sessionIndex>0) animateCard('prev',prevTopic);
  },{passive:true});
})();


const heroPrefetchCache=new Map();
async function prefetchHeroFor(t){
  if(!t || heroPrefetchCache.has(t.id)) return;
  try{
    let imgs=await commons(t.commonsSearch,1);if(!imgs.length&&t.sourceTopic)imgs=await commons(t.sourceTopic,1);
    if(imgs[0]?.url){
      heroPrefetchCache.set(t.id,imgs[0].url);
      const im=new Image(); im.decoding='async'; im.src=imgs[0].url;
    }
  }catch(_){}
}
async function prefetchAdjacent(){
  const prev=sessionIndex>0?session[sessionIndex-1]:null;
  if(prev) prefetchHeroFor(prev);
  const seen=new Set((await getAll()).filter(x=>x.firstSeen).map(x=>x.id));
  const candidate=TOPICS.find(t=>!seen.has(t.id));
  if(candidate) prefetchHeroFor(candidate);
}
