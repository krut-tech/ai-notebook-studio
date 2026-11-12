// Named personal handwriting profile (default name: Krut). Relabels the "My handwriting" font option and adds a one-click switch.
(()=>{
const $=id=>document.getElementById(id);
const KEY='nbs-profile-name';
const getName=()=>{try{return(localStorage.getItem(KEY)||'').trim()||'Krut'}catch(e){return'Krut'}};
const setName=v=>{try{localStorage.setItem(KEY,v)}catch(e){}};
const hw=document.querySelector('.pane[data-pane="handwriting"]'),nb=document.querySelector('.pane[data-pane="notebook"]');
if(!hw||!nb||!$('font'))return;

const lab=document.createElement('label');
lab.innerHTML='Profile name<input id="profName" type="text" maxlength="30" autocomplete="off">';
hw.querySelector('h3').after(lab);
$('profName').value=getName();

const row=document.createElement('div');row.className='acc';row.style.padding='10px 12px';
row.innerHTML='<b id="krutTitle"></b><p class="sub" id="krutSub"></p><button id="krutBtn" class="cta"></button>';
nb.prepend(row);

const hasProfile=()=>[...$('font').options].some(o=>o.value==='__mine');
function relabel(){
  const n=getName(),has=hasProfile(),on=$('font').value==='__mine';
  [...$('font').options].forEach(o=>{const t=n+' (my handwriting)';if(o.value==='__mine'&&o.textContent!==t)o.textContent=t});
  const set=(id,t)=>{const el=$(id);if(el.textContent!==t)el.textContent=t};
  set('krutTitle','Write in '+n+'\u2019s handwriting');
  set('krutSub',has?(on?'Your own handwriting is used for the preview and the PDF.':'Switch the whole notebook to your own handwriting.'):'This profile does not exist yet. Print the template, write on it, then scan it with your phone.');
  set('krutBtn',has?(on?'Using '+n+' \u2713':'Use '+n):'Create '+n+' profile');
}
$('krutBtn').addEventListener('click',()=>{
  if(hasProfile()){
    $('font').value='__mine';
    ['input','change'].forEach(t=>$('font').dispatchEvent(new Event(t,{bubbles:true})));
  }else{
    document.querySelector('.tab[data-group="side"][data-tab="handwriting"]').click();
    $('tpl').scrollIntoView({block:'center'});$('tpl').focus();
  }
  relabel();
});
$('profName').addEventListener('input',()=>{setName($('profName').value.trim()||'Krut');relabel()});
$('font').addEventListener('change',relabel);
new MutationObserver(relabel).observe($('font'),{childList:true,subtree:true});
setInterval(relabel,1500);
relabel();
})();
