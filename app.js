const $=id=>document.getElementById(id),S=2;let W=794,H=1123,zoom=1,currentProject='';
let pages=[],token=0,timer,dl=null;
const rng=s=>()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
const opts=()=>({font:$('font').value,mine:$('font').value==='__mine',ink:$('ink').value,paper:$('paper').value,pc:$('pc').value,fs:+$('fs').value,lh:+$('lh').value,jit:+$('jit').value,scan:$('scan').checked,gray:$('gray').checked,noise:+$('noise').value,uq:$('uq').checked,hdr:[['Name',$('hn').value],['Roll',$('hr').value],['Subject',$('hs').value],['Date',$('hd').value]].filter(a=>a[1].trim()),ml:$('marginPreset')?.value==='wide'?112:$('marginPreset')?.value==='narrow'?55:84,mr:$('marginPreset')?.value==='wide'?80:$('marginPreset')?.value==='narrow'?35:50,mt:80,mb:60});
const fnt=o=>`${o.fs}px "${o.font}", cursive, sans-serif`;
const COLS=13,ROWS=6,CW=100,CH=130,BASEF=.72,gl={};
const SCRIPT_CHARS={
 latin:Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!-()=+:/;'%"),
 hindi:Array.from("अआइईउऊऋएऐओऔकखगघचछजझटठडढतथदधनपफबभमयरलवशषसह०१२३४५६७८९।"),
 gujarati:Array.from("અઆઇઈઉઊઋએઐઓઔકખગઘચછજઝટઠડઢતથદધનપફબભમયરલવશષસહ૦૧૨૩૪૫૬૭૮૯।")
};
const scriptChars=()=>SCRIPT_CHARS[$('script')?.value||'latin']||SCRIPT_CHARS.latin;
const segments=t=>{try{return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(t)].map(x=>x.segment)}catch(e){return [...t]}};

const START=/^(q(uestion|ue)?\.?\s*\d*[.:)\-]|ans(wer)?\.?\s*[:.\-)]|प्रश्न|उत्तर|\d{1,3}[.)]\s|\(?[a-d]\)\s|[•*-]\s)/i,QST=/^(q(uestion|ue)?\.?\s*\d|प्रश्न|\d{1,3}[.)]\s)/i;
const gScale=o=>o.fs*1.25/CH;
const canGlyph=t=>segments(t).every(c=>gl[c]&&gl[c].length);
function wordW(m,t,o){return o.mine&&canGlyph(t)?segments(t).reduce((a,c)=>a+gl[c][0].w*gScale(o),0):m.measureText(t).width}
const spW=(m,o)=>o.mine?o.fs*.32:m.measureText(' ').width;

function layout(m,text,o){
  const maxW=W-o.ml-o.mr,sp=spW(m,o),out=[];
  for(const para of text.replace(/\r/g,'').split('\n')){
    if(!para.trim()){out.push([]);continue}
    const first=out.length;let cur=[],w=0;
    for(const t of para.split(/\s+/).filter(Boolean)){
      const ww=wordW(m,t,o);
      if(cur.length&&w+sp+ww>maxW){out.push(cur);cur=[];w=0}
      cur.push({t,w:ww});w+=(cur.length>1?sp:0)+ww;
    }
    out.push(cur);out[first].q=QST.test(para.trim());
  }
  return out;
}

function drawPaper(x,o){
  x.fillStyle=o.pc;x.fillRect(0,0,W,H);x.lineWidth=1;
  if(o.paper==='graph'){
    x.strokeStyle='rgba(60,120,180,.3)';
    for(let i=0;i<=W;i+=20){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
    for(let j=0;j<=H;j+=20){x.beginPath();x.moveTo(0,j);x.lineTo(W,j);x.stroke()}
  }else if(o.paper==='dotted'){
    x.fillStyle='rgba(60,100,160,.45)';
    for(let i=12;i<W;i+=20)for(let j=12;j<H;j+=20){x.beginPath();x.arc(i,j,1,0,Math.PI*2);x.fill()}
  }else if(o.paper!=='plain'&&o.paper!=='custom'){
    x.strokeStyle='rgba(70,120,190,.4)';
    for(let y=o.mt+o.lh;y<H-o.mb+o.lh;y+=o.lh){
      x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke();
      if(o.paper==='double'){x.beginPath();x.moveTo(0,y+4);x.lineTo(W,y+4);x.stroke()}
    }
    x.strokeStyle='rgba(200,60,60,.55)';
    for(const dx of [16,20]){x.beginPath();x.moveTo(o.ml-dx,0);x.lineTo(o.ml-dx,H);x.stroke()}
  }
}

function drawGlyphs(x,t,o,R){
  let px=0;const s=gScale(o);
  for(const ch of t){
    const v=gl[ch],g=v[Math.floor(R()*v.length)],k=s*(1+(R()-.5)*o.jit*.02);
    if(g.ti!==o.ink){const c=document.createElement('canvas');c.width=g.c.width;c.height=g.c.height;const q=c.getContext('2d');q.fillStyle=o.ink;q.fillRect(0,0,c.width,c.height);q.globalCompositeOperation='destination-in';q.drawImage(g.c,0,0);g.t=c;g.ti=o.ink}
    x.drawImage(g.t,px,(g.dy-g.c.height)*k+(R()-.5)*o.jit*.5,g.c.width*k,g.c.height*k);
    px+=g.w*k;
  }
}

function drawHeader(x,o,n){
  const hv=k=>(o.hdr.find(a=>a[0]===k)||['',''])[1];
  x.save();
  x.strokeStyle='rgba(200,60,60,.6)';x.lineWidth=1.2;
  x.beginPath();x.moveTo(0,o.mt);x.lineTo(W,o.mt);x.stroke();
  x.lineWidth=.8;x.beginPath();x.moveTo(W-195,36);x.lineTo(W-40,36);x.moveTo(W-195,64);x.lineTo(W-40,64);x.stroke();
  x.fillStyle='rgba(200,60,60,.85)';x.font='13px Figtree, sans-serif';
  x.fillText('Date',W-232,34);x.fillText('Page',W-232,62);
  x.restore();
  x.save();x.globalAlpha=.88;x.fillStyle=o.ink;x.font=`22px "${o.font}", cursive`;
  x.fillText(hv('Date'),W-190,32);x.fillText(String(n),W-190,60);
  const l1=[hv('Name')&&'Name: '+hv('Name'),hv('Roll')&&'Roll: '+hv('Roll')].filter(Boolean).join('    ');
  x.fillText(l1,o.ml,34);x.fillText(hv('Subject'),o.ml,62);
  x.restore();
}

function drawPage(lines,o,R,n){
  const c=document.createElement('canvas');c.width=W*S;c.height=H*S;
  const x=c.getContext('2d');x.scale(S,S);drawPaper(x,o);drawHeader(x,o,n);
  x.font=fnt(o);x.fillStyle=o.ink;x.textBaseline='alphabetic';
  const sp=spW(x,o),j=o.jit;
  lines.forEach((ln,i)=>{
    let px=o.ml+(R()-.5)*j,base=o.mt+(i+1)*o.lh-7,sx=px;
    for(const w of ln){
      x.save();
      x.translate(px,base+(R()-.5)*j*.7);
      x.rotate((R()-.5)*j*.012);
      x.globalAlpha=.82+R()*.18;
      if(o.mine&&canGlyph(w.t))drawGlyphs(x,w.t,o,R);else x.fillText(w.t,0,0);
      x.restore();
      px+=w.w+sp*(1+(R()-.5)*j*.06);
    }
    if(ln.q&&o.uq&&ln.length){x.save();x.globalAlpha=.75;x.strokeStyle=o.ink;x.lineWidth=1.4;x.beginPath();x.moveTo(sx,base+5);x.lineTo(px-sp,base+5+(R()-.5)*2);x.stroke();x.restore()}
  });
  return c;
}

function scanify(src,o,R){
  const c=document.createElement('canvas');c.width=W*S;c.height=H*S;
  const x=c.getContext('2d');
  x.fillStyle='#d4d3cf';x.fillRect(0,0,c.width,c.height);
  x.save();x.translate(c.width/2+(R()-.5)*14,c.height/2+(R()-.5)*14);
  x.rotate((R()-.5)*0.018);x.scale(.975,.975);
  x.shadowColor='rgba(0,0,0,.4)';x.shadowBlur=24;x.shadowOffsetY=4;
  x.drawImage(src,-c.width/2,-c.height/2);x.restore();
  const g=x.createLinearGradient(0,0,c.width,0);
  g.addColorStop(0,'rgba(0,0,0,.10)');g.addColorStop(.25,'rgba(0,0,0,0)');g.addColorStop(.8,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.06)');
  x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
  const im=x.getImageData(0,0,c.width,c.height),d=im.data,k=1.08,nz=o.noise*2;
  for(let i=0;i<d.length;i+=4){
    let r=d[i],gr=d[i+1],b=d[i+2];
    if(o.gray){r=gr=b=.3*r+.59*gr+.11*b}
    const n=(Math.random()-.5)*nz;
    d[i]=(r-128)*k+128+n;d[i+1]=(gr-128)*k+128+n;d[i+2]=(b-128)*k+128+n;
  }
  x.putImageData(im,0,0);return c;
}

async function loadSheet(file){
  const img=await createImageBitmap(file),c=document.createElement('canvas');c.width=COLS*CW;c.height=ROWS*CH;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);
  scriptChars().forEach((ch,i)=>{
    const cx=i%COLS*CW,cy=Math.floor(i/COLS)*CH,ix=cx+10,iy=cy+26,iw=CW-20,ih=CH-30,d=x.getImageData(ix,iy,iw,ih).data;
    let x0=iw,x1=-1,y0=ih,y1=-1;
    for(let y=0;y<ih;y++)for(let a=0;a<iw;a++){const k=(y*iw+a)*4;if(.3*d[k]+.59*d[k+1]+.11*d[k+2]<130){if(a<x0)x0=a;if(a>x1)x1=a;if(y<y0)y0=y;if(y>y1)y1=y}}
    if(x1<0)return;
    const w=x1-x0+1,h=y1-y0+1,g=document.createElement('canvas');g.width=w;g.height=h;
    const q=g.getContext('2d'),im=q.createImageData(w,h);
    for(let y=0;y<h;y++)for(let a=0;a<w;a++){const k=((y+y0)*iw+a+x0)*4,l=.3*d[k]+.59*d[k+1]+.11*d[k+2];im.data[(y*w+a)*4+3]=Math.max(0,Math.min(255,(175-l)*3))}
    q.putImageData(im,0,0);
    (gl[ch]=gl[ch]||[]).push({c:g,w:w+8,dy:(y1+1+iy-cy)-CH*BASEF});
  });
}
const saveP=()=>{try{localStorage.setItem('nbs-prof',JSON.stringify(Object.fromEntries(Object.entries(gl).map(([k,v])=>[k,v.map(g=>({u:g.c.toDataURL(),w:g.w,dy:g.dy}))]))))}catch(e){}};
async function loadP(){try{const s=JSON.parse(localStorage.getItem('nbs-prof')||'null');if(!s)return;for(const k in s)gl[k]=await Promise.all(s[k].map(async o=>{const im=new Image();im.src=o.u;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return{c,w:o.w,dy:o.dy}}))}catch(e){}}
function pstat(){
  const n=Object.keys(gl).length,v=Math.max(0,...Object.values(gl).map(a=>a.length)),has=[...$('font').options].some(o=>o.value==='__mine');
  $('pnote').textContent=n?n+' characters captured, up to '+v+' variants each. Only English letters, digits and basic punctuation are covered; other scripts use the selected font.':'No profile yet.';
  if(n&&!has)$('font').add(new Option('My handwriting','__mine'));
  if(!n){[...$('font').options].forEach(o=>{if(o.value==='__mine')o.remove()});if($('font').value==='__mine')$('font').value='Caveat'}
}
function saveFile(name,blob){
  if(dl)dl.save({filename:name,data:blob}).catch(e=>{if(e&&e.code!=='declined')alert('The file could not be saved.')});
  else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()}
}

pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
function selectedPages(total){
 const raw=$('pageRange')?.value.trim();
 if(!raw)return Array.from({length:total},(_,i)=>i+1);
 const match=raw.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
 if(!match)return Array.from({length:total},(_,i)=>i+1);
 const first=Math.max(1,Math.min(total,Number(match[1])));
 const last=Math.max(first,Math.min(total,Number(match[2]||match[1])));
 return Array.from({length:last-first+1},(_,i)=>first+i);
}
async function pdfText(f){
 const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise,lines=[];
 for(const p of selectedPages(pdf.numPages)){
  const tc=await(await pdf.getPage(p)).getTextContent(),rows=[];
  for(const it of tc.items){if(!it.str.trim())continue;const y=Math.round(it.transform[5]/3);let r=rows.find(r=>Math.abs(r.y-y)<=1);if(!r)rows.push(r={y,a:[]});r.a.push(it)}
  rows.sort((a,b)=>b.y-a.y).forEach(r=>lines.push(r.a.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim()));
 }
 return lines;
}
async function ocrPdf(f){
 const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise,out=[];
 $('note').textContent='Loading OCR engine and language data (first time only)…';
 const w=await Tesseract.createWorker($('ocrLanguage')?.value||'eng+hin+guj');
 try{
  for(const p of selectedPages(pdf.numPages)){
   $('note').textContent='OCR: page '+p+' of '+pdf.numPages+'…';
   const pg=await pdf.getPage(p),vp=pg.getViewport({scale:2}),c=document.createElement('canvas');
   c.width=vp.width;c.height=vp.height;
   await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
   const r=await w.recognize(c);out.push(...r.data.text.split('\\n').map(s=>s.trim()));
  }
  return out;
 }finally{await w.terminate()}
}
function blocks(lines){
  const out=[];
  for(const l of lines){if(!l)continue;if(!out.length||START.test(l))out.push(l);else out[out.length-1]+=' '+l}
  return out.map(b=>QST.test(b)?'\n'+b:b).join('\n').trim();
}

async function render(){
  const my=++token,o=opts(),text=$('txt').value;
  try{await document.fonts.load(fnt(o),text.slice(0,200)||'A')}catch(e){}
  if(my!==token)return;
  const m=document.createElement('canvas').getContext('2d');m.font=fnt(o);
  const lines=layout(m,text,o),per=Math.max(1,Math.floor((H-o.mt-o.mb)/o.lh)),R=rng(42);
  pages=[];
  for(let i=0;i<Math.max(1,lines.length);i+=per){
    const p=drawPage(lines.slice(i,i+per),o,R,pages.length+1);
    pages.push(o.scan?scanify(p,o,R):p);
  }
  $('pages').replaceChildren(...pages);
  $('count').textContent=pages.length+(pages.length===1?' page':' pages');
}
const later=()=>{clearTimeout(timer);timer=setTimeout(render,350)};
['txt','font','ink','paper','pc','fs','lh','jit','scan','gray','noise','hn','hr','hs','hd','uq','script'].forEach(id=>$(id).addEventListener('input',later));

$('file').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;$('note').textContent='';
  if(/\.pdf$/i.test(f.name)){
    $('note').textContent='Reading PDF…';
    try{
      let ls=await pdfText(f),t=blocks(ls);
      if(t.replace(/\s/g,'').length<20){
        try{ls=await ocrPdf(f);t=blocks(ls);$('note').textContent='OCR finished. OCR can make mistakes, so please check the text below.'}
        catch(err){t='';$('note').textContent='This looks like a scanned PDF and OCR could not run. Check your internet connection and try again.'}
      }else $('note').textContent='Imported '+ls.length+' lines. Fix anything in the text box, then export.';
      if(t)$('txt').value=t;
    }catch(err){$('note').textContent='This PDF could not be read.'}
  }else $('txt').value=await f.text();
  e.target.value='';render();
});
$('imgFile').addEventListener('change',async e=>{
 const f=e.target.files[0];if(!f)return;
 $('note').textContent='Loading OCR engine…';
 let worker;
 try{
  worker=await Tesseract.createWorker($('ocrLanguage').value,1,{logger:m=>{if(m.status)$('note').textContent=m.status+(m.progress?' · '+Math.round(m.progress*100)+'%':'')}});
  const result=await worker.recognize(f);
  $('txt').value=result.data.text.trim();rememberHistory?.();render();$('note').textContent='Image OCR complete. Review and correct the extracted text before exporting.';
 }catch(err){$('note').textContent='Image OCR failed. Try a clearer image or another OCR language.'}
 finally{if(worker)await worker.terminate();e.target.value=''}
});
$('ffile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const name='Custom'+Date.now(),ff=new FontFace(name,await f.arrayBuffer());
    await ff.load();document.fonts.add(ff);
    $('font').add(new Option('Mine: '+f.name.replace(/\.\w+$/,''),name));$('font').value=name;render();
  }catch(err){alert('This font file could not be loaded. Try a .ttf or .otf file.')}
});
$('tpl').onclick=()=>{
  const c=document.createElement('canvas');c.width=COLS*CW;c.height=ROWS*CH;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#bbb';x.fillStyle='#999';x.font='14px sans-serif';
  scriptChars().forEach((ch,i)=>{const cx=i%COLS*CW,cy=Math.floor(i/COLS)*CH;x.strokeRect(cx+.5,cy+.5,CW,CH);x.fillText(ch,cx+6,cy+17);x.beginPath();x.moveTo(cx+8,cy+CH*BASEF);x.lineTo(cx+CW-8,cy+CH*BASEF);x.stroke()});
  c.toBlob(b=>saveFile('handwriting-template-'+$('script').value+'.png',b));
};
$('sheet').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{await loadSheet(f);saveP();pstat();$('font').value='__mine';render()}catch(err){alert('That image could not be read. Upload a photo or scan of the filled template.')}
  e.target.value='';
});
$('clr').onclick=()=>{for(const k in gl)delete gl[k];try{localStorage.removeItem('nbs-prof')}catch(e){}pstat();render()};
$('pdf').addEventListener('click',()=>{
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),q=+$('q').value;
  pages.forEach((c,i)=>{if(i)doc.addPage();doc.addImage(c.toDataURL('image/jpeg',q),'JPEG',0,0,210,297,undefined,'FAST')});
  saveFile('notebook.pdf',doc.output('blob'));
});
loadP().then(()=>{pstat();render()});


// Camera-based handwriting capture. Camera access requires HTTPS or localhost.
let cameraStream=null,cameraFacing='environment';
const cameraModal=$('cameraModal'),cameraVideo=$('cameraVideo');
function stopCamera(){
  if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}
  cameraVideo.srcObject=null;
}
async function startCamera(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    $('cameraNote').textContent='Camera access is unavailable. Open this app on HTTPS or localhost, or upload a photo instead.';return;
  }
  stopCamera();
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:cameraFacing},width:{ideal:1920},height:{ideal:1080}}});
    cameraVideo.srcObject=cameraStream;
    await cameraVideo.play();
    $('cameraNote').textContent='Keep the full template inside the guide, use bright even light, avoid shadows and hold the phone parallel to the page.';
  }catch(err){
    $('cameraNote').textContent=err.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in browser settings, or upload a photo.':'Could not start the camera. Check that another app is not using it, then try again or upload a photo.';
  }
}
function showCamera(){
  cameraModal.classList.add('open');cameraModal.setAttribute('aria-hidden','false');startCamera();
}
function hideCamera(){
  stopCamera();cameraModal.classList.remove('open');cameraModal.setAttribute('aria-hidden','true');
}
$('camera').addEventListener('click',showCamera);
$('closeCamera').addEventListener('click',hideCamera);
cameraModal.addEventListener('click',e=>{if(e.target===cameraModal)hideCamera()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&cameraModal.classList.contains('open'))hideCamera()});
$('switchCamera').addEventListener('click',async()=>{cameraFacing=cameraFacing==='environment'?'user':'environment';await startCamera()});
$('capture').addEventListener('click',()=>{
  if(!cameraStream||!cameraVideo.videoWidth){$('cameraNote').textContent='Camera is not ready yet. Wait a moment and try again.';return;}
  const c=document.createElement('canvas');c.width=1300;c.height=780;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  // Crop the centred guide area so desk/background pixels do not enter the glyph grid.
  const sx=cameraVideo.videoWidth*.09,sy=cameraVideo.videoHeight*.16,sw=cameraVideo.videoWidth*.82,sh=cameraVideo.videoHeight*.68;
  ctx.drawImage(cameraVideo,sx,sy,sw,sh,0,0,c.width,c.height);
  c.toBlob(async blob=>{
    if(!blob){$('cameraNote').textContent='Could not capture this image. Please try again.';return;}
    try{
      const file=new File([blob],'camera-handwriting-sheet.jpg',{type:'image/jpeg'});
      await loadSheet(file);
      saveP();pstat();$('font').value='__mine';render();
      const profileName=prompt('Give your handwriting profile a name:','My handwriting');
      if(profileName&&profileName.trim())try{localStorage.setItem('nbs-profile-name',profileName.trim())}catch(e){}
      $('cameraNote').textContent='Handwriting sample captured. Review the profile status and preview; add another sheet if you want more character variations.';
      hideCamera();
    }catch(err){$('cameraNote').textContent='The image could not be processed. Retake the photo with the complete template visible and better lighting.';}
  },'image/jpeg',.94);
});
window.addEventListener('pagehide',stopCamera);

// Keep numeric controls readable while adjusting.
[['fs','fsOut',' px'],['lh','lhOut',' px'],['jit','jitOut',''],['noise','noiseOut','']].forEach(([id,out,suffix])=>{
  const el=$(id),target=$(out);const update=()=>target.textContent=el.value+suffix;el.addEventListener('input',update);update();
});
$('newNotebook').addEventListener('click',()=>{
  if(!confirm('Start a new notebook? Export or copy your current text first if you need it.'))return;
  $('txt').value='';['hn','hr','hs'].forEach(id=>$(id).value='');$('note').textContent='New notebook started.';render();
});


// Project persistence, history, layout controls and offline study helpers.
const PROJECTS_KEY='nbs-projects-v1';
let history=[],historyIndex=-1,historyTimer=null,saveTimer=null;
function readProjects(){try{return JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]')}catch(e){return[]}}
function writeProjects(items){try{localStorage.setItem(PROJECTS_KEY,JSON.stringify(items))}catch(e){$('saveStatus').textContent='Storage is full. Export your work or remove old projects.'}}
function snapshot(){return {id:currentProject||('nb-'+Date.now()),name:currentProject?((readProjects().find(p=>p.id===currentProject)||{}).name||'My notebook'):'My notebook',text:$('txt').value,details:{name:$('hn').value,roll:$('hr').value,subject:$('hs').value,date:$('hd').value},settings:{font:$('font').value,ink:$('ink').value,paper:$('paper').value,pc:$('pc').value,fs:$('fs').value,lh:$('lh').value,jit:$('jit').value,scan:$('scan').checked,gray:$('gray').checked,noise:$('noise').value,uq:$('uq').checked,paperSize:$('paperSize').value,orientation:$('orientation').value,marginPreset:$('marginPreset').value,footerMode:$('footerMode').value},updatedAt:Date.now()}}
function saveProject(show=true){
  const p=snapshot(),all=readProjects(),idx=all.findIndex(x=>x.id===p.id);
  if(idx>=0){p.name=all[idx].name;all[idx]=p}else{currentProject=p.id;all.unshift(p)}
  writeProjects(all.slice(0,50));refreshProjectList();if(show)$('saveStatus').textContent='Saved on this device · '+new Date().toLocaleTimeString();
}
function scheduleSave(){clearTimeout(saveTimer);$('saveStatus').textContent='Saving…';saveTimer=setTimeout(()=>saveProject(false),650)}
function refreshProjectList(){
 const all=readProjects(),sel=$('projectList'),old=sel.value;sel.replaceChildren(new Option(all.length?'Choose a saved notebook':'No saved projects yet',''));
 all.forEach(p=>sel.add(new Option(p.name+' · '+new Date(p.updatedAt).toLocaleDateString(),p.id)));
 if(all.some(p=>p.id===old))sel.value=old;
}
function loadProject(id){
 const p=readProjects().find(x=>x.id===id);if(!p)return;
 currentProject=p.id;$('txt').value=p.text||'';
 const d=p.details||{};[['hn','name'],['hr','roll'],['hs','subject'],['hd','date']].forEach(([id,k])=>$(id).value=d[k]||'');
 const s=p.settings||{};Object.entries(s).forEach(([k,v])=>{const el=$(k);if(el){if(el.type==='checkbox')el.checked=!!v;else el.value=v}});
 updatePageDimensions();render();$('saveStatus').textContent='Opened '+p.name;
}
function rememberHistory(){
 const value=$('txt').value;if(history[historyIndex]===value)return;
 history=history.slice(0,historyIndex+1);history.push(value);if(history.length>60)history.shift();historyIndex=history.length-1;
}
function applyHistory(i){if(i<0||i>=history.length)return;historyIndex=i;$('txt').value=history[i];render();scheduleSave()}
function renderThumbs(){
 const wrap=$('thumbs');if(!wrap)return;wrap.hidden=!$('showThumbs').checked;wrap.replaceChildren();
 if(wrap.hidden)return;
 pages.forEach((p,i)=>{const b=document.createElement('button');b.className='thumb';const img=document.createElement('img');img.src=p.toDataURL('image/jpeg',.65);img.alt='Page '+(i+1);const label=document.createElement('span');label.textContent='Page '+(i+1);b.append(img,label);b.onclick=()=>p.scrollIntoView({behavior:'smooth',block:'center'});wrap.append(b)});
}
function updatePageDimensions(){
 const sizes={a4:[794,1123],a5:[559,794],letter:[816,1056],legal:[816,1344]};
 let [w,h]=sizes[$('paperSize').value]||sizes.a4;if($('orientation').value==='landscape')[w,h]=[h,w];W=w;H=h;
}
function runStudyTool(){
 const text=$('txt').value.trim();if(!text){$('note').textContent='Add or import some text first.';return}
 const mode=$('writingAction').value;let result=text;
 const sentences=text.split(/(?<=[.!?।])\s+/).filter(Boolean);
 if(mode==='clean')result=text.split('\n').map(s=>s.trim().replace(/[ \t]+/g,' ')).join('\n').replace(/\n{3,}/g,'\n\n');
 if(mode==='summary')result=sentences.slice(0,Math.max(3,Math.ceil(sentences.length*.3))).join(' ');
 if(mode==='points')result=sentences.filter(s=>/\b(is|are|means|defined|important|because|therefore|include|consist)\b|है|हैं|महत्वपूर्ण|કારણ|છે|મહત્વપૂર્ણ/i.test(s)).map(s=>'• '+s).join('\n')||sentences.slice(0,5).map(s=>'• '+s).join('\n');
 if(mode==='outline'){const lines=text.split('\n').filter(Boolean);result=lines.map((s,i)=>(/^\s*(chapter|unit|topic|प्रश्न|પ્રશ્ન)/i.test(s)?'## ':'• ')+s).join('\n')}
 if(mode==='qa'){const lines=text.split('\n').filter(Boolean);result=lines.map((s,i)=>/^\s*(answer|उत्तर|જવાબ)/i.test(s)?'   '+s:(/^\s*(question|प्रश्न|પ્રશ્ન)/i.test(s)?'\n'+s:(i===0?'Question: '+s:'Answer: '+s))).join('\n')}
 $('txt').value=result;rememberHistory();render();scheduleSave();$('note').textContent='Applied offline '+$('writingAction').selectedOptions[0].text.toLowerCase()+'. Check the result before exporting.';
}
$('saveProject').addEventListener('click',()=>{const name=prompt('Notebook name:',(readProjects().find(p=>p.id===currentProject)||{}).name||'My notebook');if(name&&name.trim()){if(!currentProject)currentProject='nb-'+Date.now();saveProject(true);const all=readProjects();const p=all.find(x=>x.id===currentProject);if(p){p.name=name.trim();writeProjects(all);refreshProjectList()}}});
$('projectList').addEventListener('change',e=>loadProject(e.target.value));
$('duplicateProject').addEventListener('click',()=>{const p=snapshot();p.id='nb-'+Date.now();p.name=(readProjects().find(x=>x.id===currentProject)?.name||'Notebook')+' copy';currentProject=p.id;const all=readProjects();all.unshift(p);writeProjects(all);refreshProjectList();$('saveStatus').textContent='Notebook duplicated.'});
$('deleteProject').addEventListener('click',()=>{if(!currentProject)return alert('Save or select a notebook first.');if(!confirm('Delete this saved notebook from this browser?'))return;writeProjects(readProjects().filter(p=>p.id!==currentProject));currentProject='';refreshProjectList();$('saveStatus').textContent='Saved notebook deleted.'});
$('runWritingTool').addEventListener('click',runStudyTool);
$('undo').addEventListener('click',()=>applyHistory(historyIndex-1));
$('redo').addEventListener('click',()=>applyHistory(historyIndex+1));
$('zoomIn').addEventListener('click',()=>{zoom=Math.min(1.4,zoom+.1);render()});
$('zoomOut').addEventListener('click',()=>{zoom=Math.max(.5,zoom-.1);render()});
$('showThumbs').addEventListener('change',renderThumbs);
$('exportPng').addEventListener('click',()=>{if(!pages.length)return;pages[0].toBlob(b=>saveFile('notebook-page-1.png',b),'image/png')});
['paperSize','orientation','marginPreset','footerMode'].forEach(id=>$(id).addEventListener('change',()=>{updatePageDimensions();render();scheduleSave()}));
$('txt').addEventListener('input',()=>{clearTimeout(historyTimer);historyTimer=setTimeout(()=>{rememberHistory();scheduleSave()},500)});
['hn','hr','hs','hd','font','ink','paper','pc','fs','lh','jit','scan','gray','noise','uq'].forEach(id=>$(id).addEventListener('change',scheduleSave));
$('newNotebook').addEventListener('click',()=>{
 if($('txt').value.trim())saveProject(false);
 currentProject='';$('txt').value='';['hn','hr','hs','hd'].forEach(id=>$(id).value='');rememberHistory();render();$('saveStatus').textContent='New unsaved notebook';
});
updatePageDimensions();rememberHistory();refreshProjectList();

$('exportProfile').addEventListener('click',()=>{
 const data={format:'ai-notebook-studio-profile',version:1,script:$('script').value,glyphs:Object.fromEntries(Object.entries(gl).map(([k,arr])=>[k,arr.map(g=>({image:g.c.toDataURL('image/png'),w:g.w,dy:g.dy}))]))};
 const blob=new Blob([JSON.stringify(data)],{type:'application/json'});saveFile('my-handwriting-profile.json',blob);
});
$('importProfile').addEventListener('change',async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
  const data=JSON.parse(await f.text());if(data.format!=='ai-notebook-studio-profile'||!data.glyphs)throw new Error('Invalid profile');
  for(const [key,arr] of Object.entries(data.glyphs)){
   gl[key]=[];
   for(const item of arr){const im=new Image();im.src=item.image;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);gl[key].push({c,w:item.w,dy:item.dy})}
  }
  saveP();pstat();$('font').value='__mine';render();$('note').textContent='Handwriting profile imported.';
 }catch(err){$('note').textContent='Could not import this handwriting profile. Check that it is a valid exported profile.'}
 finally{e.target.value=''}
});
