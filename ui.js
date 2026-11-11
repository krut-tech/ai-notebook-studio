(()=>{
const $=id=>document.getElementById(id),Q=(s,r=document)=>[...r.querySelectorAll(s)];
const fire=(el,types)=>types.forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})));
function setVal(id,v){const el=$(id);if(el){el.value=v;fire(el,['input','change'])}}

function showTab(g,n){
  Q('.tab[data-group="'+g+'"]').forEach(b=>{const on=b.dataset.tab===n;b.classList.toggle('active',on);b.setAttribute('aria-selected',on)});
  Q('.pane[data-group="'+g+'"]').forEach(p=>{p.hidden=p.dataset.pane!==n});
}
Q('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.group,b.dataset.tab)));

let lastFocus=null;
function openModal(id){lastFocus=document.activeElement;const m=$(id);m.classList.add('open');m.setAttribute('aria-hidden','false');const f=m.querySelector('select,button');if(f)f.focus()}
function closeModal(m){m.classList.remove('open');m.setAttribute('aria-hidden','true');if(lastFocus&&lastFocus.focus)lastFocus.focus()}
Q('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal'))));
$('projectsModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal(e.currentTarget)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('projectsModal').classList.contains('open'))closeModal($('projectsModal'))});

const nav={
  workspace:()=>{showTab('mid','write');$('txt').focus()},
  projects:()=>openModal('projectsModal'),
  templates:()=>{showTab('side','notebook');$('paperChips').scrollIntoView({block:'center'})},
  handwriting:()=>showTab('side','handwriting'),
  ai:()=>showTab('mid','ai'),
  import:()=>showTab('mid','import'),
  settings:()=>{showTab('side','notebook');$('exportAcc').open=true;$('exportAcc').scrollIntoView({block:'center'})}
};
Q('[data-nav]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();const k=a.dataset.nav;if(nav[k])nav[k]();
  Q('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===k));
}));

$('search').addEventListener('input',()=>{
  const q=$('search').value.trim().toLowerCase();if(q&&!$('projectsModal').classList.contains('open'))openModal('projectsModal');
  Q('option',$('projectList')).forEach((o,i)=>{o.hidden=i>0&&!!q&&!o.textContent.toLowerCase().includes(q)});
});

Q('.chip[data-for]').forEach(c=>c.addEventListener('click',()=>{setVal(c.dataset.for,c.dataset.value);sync()}));
let gen='clean';
Q('[data-gen]').forEach(c=>c.addEventListener('click',()=>{gen=c.dataset.gen;Q('[data-gen]').forEach(x=>x.classList.toggle('active',x===c))}));
$('gen').addEventListener('click',()=>{
  const t=$('txt'),topic=$('topic').value.trim();
  if(!t.value.trim()){$('note').textContent='Add or import some notes first. Writing notes from a topic needs an AI provider, which is not connected.';return}
  if(topic&&!t.value.startsWith(topic))t.value=topic+'\n'+t.value;
  $('writingAction').value=gen==='clean2'?'clean':gen;
  $('runWritingTool').click();
});

$('footerCheck').addEventListener('change',e=>setVal('footerMode',e.target.checked?'page':'none'));
$('headerToggle').addEventListener('change',()=>{sync();render();scheduleSave()});
$('viewPreview').addEventListener('click',()=>{$('showThumbs').checked=false;fire($('showThumbs'),['change']);sync()});
$('viewThumbs').addEventListener('click',()=>{$('showThumbs').checked=true;fire($('showThumbs'),['change']);sync()});

const pgs=()=>Q('canvas',$('pages'));
function cur(){const mid=$('stage').getBoundingClientRect(),c=mid.top+mid.height/2;let best=0,bd=1e9;pgs().forEach((p,i)=>{const r=p.getBoundingClientRect(),d=Math.abs(r.top+r.height/2-c);if(d<bd){bd=d;best=i}});return best}
function go(i){const l=pgs();if(l[i])l[i].scrollIntoView({behavior:'smooth',block:'center'})}
$('prevPage').addEventListener('click',()=>go(Math.max(0,cur()-1)));
$('nextPage').addEventListener('click',()=>go(Math.min(pgs().length-1,cur()+1)));
function pageLabel(){const n=pgs().length;$('pageOf').textContent=n?'Page '+(cur()+1)+' of '+n:'No pages'}
$('stage').addEventListener('scroll',pageLabel,{passive:true});

function stats(){
  const w=($('txt').value.match(/\S+/g)||[]).length,n=parseInt($('count').textContent,10)||0;
  $('wordStat').textContent=w;$('wordStat2').textContent=w;$('estStat').textContent=n||'\u2013';$('pageStat').textContent=n||'\u2013';
}
function zoomLabel(){const m=($('pageMeta').textContent||'').match(/\d+%/);$('zoomLabel').textContent=m?m[0]:'100%'}
function storage(){
  let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);n+=(k.length+(localStorage.getItem(k)||'').length)*2}}catch(e){}
  const mb=n/1048576;$('storeText').textContent='Local storage \u00b7 '+mb.toFixed(1)+' MB used';$('storeBar').style.width=Math.min(100,mb/5*100)+'%';
}
function sync(){
  Q('.chip[data-for]').forEach(c=>c.classList.toggle('active',$(c.dataset.for).value===c.dataset.value));
  $('footerCheck').checked=$('footerMode').value==='page';
  $('hdrFields').hidden=!$('headerToggle').checked;
  $('viewPreview').classList.toggle('active',!$('showThumbs').checked);$('viewThumbs').classList.toggle('active',$('showThumbs').checked);
  const sel=$('projectList');$('projName').textContent=sel.value?(sel.selectedOptions[0].textContent.split(' \u00b7 ')[0]):'Untitled notebook';
  $('avatar').textContent=($('hn').value.trim()[0]||'N').toUpperCase();
  zoomLabel();stats();storage();
}
new MutationObserver(()=>{pageLabel();stats()}).observe($('pages'),{childList:true});
new MutationObserver(zoomLabel).observe($('pageMeta'),{childList:true,characterData:true,subtree:true});
$('txt').addEventListener('input',stats);
$('projectList').addEventListener('change',()=>setTimeout(()=>{sync();closeModal($('projectsModal'))},0));
$('newNotebook').addEventListener('click',()=>setTimeout(sync,0));
setInterval(sync,1500);
sync();pageLabel();
})();
