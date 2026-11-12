// Page scanner: clean photos/scanned PDFs (shadow removal, double-page split, ink isolation),
// then read them line by line. Handwriting uses an in-browser AI model (English only); printed text uses Tesseract.
(()=>{
const $=id=>document.getElementById(id);
const pane=document.querySelector('.pane[data-pane="ocr"]');
if(!pane)return;

const box=document.createElement('div');box.className='acc';box.style.padding='12px';
box.innerHTML=`<b>Scan handwritten pages</b>
<p class="sub">Choose photos of your notebook pages (or import a scanned PDF). Pages are cleaned first so you can check them, then read line by line. Handwriting reading works for English only and always needs a quick review.</p>
<label class="filebtn">Choose page photos<input id="scanFiles" type="file" accept="image/*" multiple hidden></label>
<label>Reading method<select id="scanEngine"><option value="trocr">Handwriting (AI model, English)</option><option value="tess">Printed text (Tesseract)</option></select></label>
<label>Ink sensitivity <output id="scanThrOut">165</output><input id="scanThr" type="range" min="110" max="215" value="165"></label>
<label class="check"><input id="scanSplit" type="checkbox" checked> Split double-page photos</label>
<div id="scanPrev" class="thumbs"></div>
<button id="scanRun" class="cta" disabled>Read text from pages</button>
<p class="sub" id="scanNote" aria-live="polite"></p>`;
pane.querySelector('h3').after(box);
// Mixed English+Hindi+Gujarati recognition produces random characters on English pages, so default to English.
if($('ocrLanguage'))$('ocrLanguage').value='eng';

let raw=[],cleaned=[],busy=false,pipe=null,timer=null;
const note=t=>{$('scanNote').textContent=t};
const ctx2=c=>c.getContext('2d',{willReadFrequently:true});
function crop(c,x,y,w,h){
  x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));w=Math.min(c.width-x,Math.round(w));h=Math.min(c.height-y,Math.round(h));
  const o=document.createElement('canvas');o.width=Math.max(1,w);o.height=Math.max(1,h);ctx2(o).drawImage(c,x,y,w,h,0,0,w,h);return o;
}
async function toCanvas(file){
  const bmp=await createImageBitmap(file,{imageOrientation:'from-image'});
  const k=Math.min(1,2200/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');
  c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);ctx2(c).drawImage(bmp,0,0,c.width,c.height);
  if(bmp.close)bmp.close();return c;
}
async function pdfCanvases(f){
  const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise,out=[];
  for(const p of selectedPages(pdf.numPages)){
    note('Rendering PDF page '+p+'…');
    const pg=await pdf.getPage(p),base=pg.getViewport({scale:1}),k=Math.min(3,2200/Math.max(base.width,base.height)),vp=pg.getViewport({scale:k}),c=document.createElement('canvas');
    c.width=Math.round(vp.width);c.height=Math.round(vp.height);
    const x=ctx2(c);x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
    await pg.render({canvasContext:x,viewport:vp}).promise;out.push(c);
  }
  return out;
}

// Remove shadows and paper tint, then keep only dark ink (ruled lines and pink margins are lighter, so they drop out).
function clean(src,thr){
  const w=src.width,h=src.height,px=ctx2(src).getImageData(0,0,w,h).data,g=new Uint8ClampedArray(w*h);
  for(let i=0,j=0;i<g.length;i++,j+=4)g[i]=.3*px[j]+.59*px[j+1]+.11*px[j+2];
  const B=24,gw=Math.ceil(w/B),gh=Math.ceil(h/B),bg=new Float32Array(gw*gh);
  for(let y=0;y<h;y++){const by=(y/B)|0;for(let x=0;x<w;x++){const k=by*gw+((x/B)|0),v=g[y*w+x];if(v>bg[k])bg[k]=v}}
  const sm=new Float32Array(gw*gh);
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){let s=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if(yy>=0&&yy<gh&&xx>=0&&xx<gw){s+=bg[yy*gw+xx];n++}}sm[y*gw+x]=s/n}
  const out=document.createElement('canvas');out.width=w;out.height=h;
  const ox=ctx2(out),im=ox.createImageData(w,h),o=im.data;
  for(let y=0;y<h;y++){
    const fy=Math.min(gh-1,Math.max(0,y/B-.5)),y0=fy|0,y1=Math.min(gh-1,y0+1),ty=fy-y0;
    for(let x=0;x<w;x++){
      const fx=Math.min(gw-1,Math.max(0,x/B-.5)),x0=fx|0,x1=Math.min(gw-1,x0+1),tx=fx-x0;
      const b=(sm[y0*gw+x0]*(1-tx)+sm[y0*gw+x1]*tx)*(1-ty)+(sm[y1*gw+x0]*(1-tx)+sm[y1*gw+x1]*tx)*ty;
      const v=Math.min(255,g[y*w+x]/Math.max(b,60)*255),i=(y*w+x)*4,c=v<thr?0:255;
      o[i]=o[i+1]=o[i+2]=c;o[i+3]=255;
    }
  }
  ox.putImageData(im,0,0);return out;
}
function inkProfile(c){
  const w=c.width,h=c.height,d=ctx2(c).getImageData(0,0,w,h).data,cols=new Float32Array(w),rows=new Float32Array(h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4]===0){cols[x]++;rows[y]++}
  return{cols,rows,d};
}
function splitSpread(c){
  if(c.width/c.height<1.25)return[c];
  const w=c.width,{cols}=inkProfile(c);let best=Math.round(w/2),bv=1e18;const win=20;
  for(let x=Math.round(w*.4);x<=Math.round(w*.6);x++){let s=0;for(let k=-win;k<=win;k++)s+=cols[Math.min(w-1,Math.max(0,x+k))];if(s<bv){bv=s;best=x}}
  return[crop(c,0,0,best,c.height),crop(c,best,0,w-best,c.height)];
}
function cropInk(c){
  const{cols,rows}=inkProfile(c);
  const lim=(a,n)=>{let lo=0,hi=a.length-1;while(lo<hi&&a[lo]<n)lo++;while(hi>lo&&a[hi]<n)hi--;return[lo,hi]};
  const[x0,x1]=lim(cols,3),[y0,y1]=lim(rows,6),m=14;
  return crop(c,x0-m,y0-m,x1-x0+2*m,y1-y0+2*m);
}

// Find text lines from the row ink profile. Very tall blocks are treated as diagrams/tables and skipped.
function segLines(c){
  const w=c.width,h=c.height,d=ctx2(c).getImageData(0,0,w,h).data,rows=new Float32Array(h);
  for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x+=2)if(d[(y*w+x)*4]===0)n++;rows[y]=n}
  const s=new Float32Array(h);
  for(let y=0;y<h;y++){let a=0,n=0;for(let k=-2;k<=2;k++){const yy=y+k;if(yy>=0&&yy<h){a+=rows[yy];n++}}s[y]=a/n}
  let mx=0;for(let y=0;y<h;y++)if(s[y]>mx)mx=s[y];
  const thr=Math.max(2,mx*.07);let bands=[],st=-1;
  for(let y=0;y<h;y++){if(s[y]>thr){if(st<0)st=y}else if(st>=0){bands.push([st,y-1]);st=-1}}
  if(st>=0)bands.push([st,h-1]);
  bands=bands.filter(b=>b[1]-b[0]>=8);
  if(!bands.length)return[];
  const hs=bands.map(b=>b[1]-b[0]).sort((a,b)=>a-b),med=hs[hs.length>>1],out=[];
  for(const[a,b]of bands){
    const bh=b-a,n=Math.round(bh/med);
    if(bh>med*5){out.push({fig:true,a,b});continue}
    if(n<2){out.push({a,b});continue}
    let prev=a;
    for(let i=1;i<n;i++){
      const t=a+bh*i/n;let m=Math.round(t),mv=1e18;
      for(let y=Math.round(t-med*.35);y<=Math.round(t+med*.35);y++){if(y>a&&y<b&&s[y]<mv){mv=s[y];m=y}}
      out.push({a:prev,b:m});prev=m+1;
    }
    out.push({a:prev,b});
  }
  return out;
}
function lineCanvas(page,sg){
  const w=page.width,d=ctx2(page).getImageData(0,sg.a,w,sg.b-sg.a+1).data,hh=sg.b-sg.a+1;
  let x0=w,x1=-1;
  for(let y=0;y<hh;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4]===0){if(x<x0)x0=x;if(x>x1)x1=x}
  if(x1-x0<15)return null;
  const cw=x1-x0+1,o=document.createElement('canvas');o.width=cw+24;o.height=hh+16;
  const x=ctx2(o);x.fillStyle='#fff';x.fillRect(0,0,o.width,o.height);x.drawImage(page,x0,sg.a,cw,hh,12,8,cw,hh);return o;
}

async function getPipe(){
  if(pipe)return pipe;
  const T=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  T.env.allowLocalModels=false;
  let err=null;
  for(const id of ['Xenova/trocr-small-handwritten','Xenova/trocr-base-handwritten']){
    try{
      pipe=await T.pipeline('image-to-text',id,{progress_callback:p=>{if(p&&p.status==='progress')note('Downloading handwriting model… '+Math.round(p.progress)+'% (first time only, then it works offline)')}});
      return pipe;
    }catch(e){err=e}
  }
  throw err||new Error('model');
}
async function readPages(pages,engine){
  const segs=pages.map(segLines),total=segs.flat().filter(s=>!s.fig).length,out=[];
  let worker=null,pl=null,done=0;
  if(engine==='trocr')pl=await getPipe();
  else{worker=await Tesseract.createWorker('eng');await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'})}
  try{
    for(let p=0;p<pages.length;p++){
      const lines=[];
      if(engine==='tess'){
        note('Reading page '+(p+1)+' of '+pages.length+'…');
        const r=await worker.recognize(pages[p]);
        lines.push(...r.data.text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean));
      }else{
        for(const sg of segs[p]){
          if(sg.fig){lines.push('[diagram]');continue}
          const c=lineCanvas(pages[p],sg);if(!c)continue;
          note('Reading line '+(++done)+' of '+total+' (page '+(p+1)+' of '+pages.length+')…');
          const r=await pl(c.toDataURL('image/png'));
          const t=((r&&r[0]&&r[0].generated_text)||'').trim();if(t)lines.push(t);
        }
      }
      out.push(lines.join('\n'));
    }
  }finally{if(worker)await worker.terminate()}
  return out.join('\n\n');
}

function show(){
  const wrap=$('scanPrev');wrap.replaceChildren();
  cleaned.forEach((c,i)=>{
    const d=document.createElement('div');d.className='thumb';d.style.width='140px';
    const im=document.createElement('img');im.src=c.toDataURL('image/jpeg',.6);im.alt='Cleaned page '+(i+1);
    const s=document.createElement('span');s.textContent='Page '+(i+1);d.append(im,s);wrap.append(d);
  });
  $('scanRun').disabled=!cleaned.length;
}
async function prepare(){
  note('Cleaning pages…');cleaned=[];
  const thr=+$('scanThr').value;
  for(const r of raw){
    const cl=clean(r,thr),parts=$('scanSplit').checked?splitSpread(cl):[cl];
    for(const p of parts)cleaned.push(cropInk(p));
    await new Promise(res=>setTimeout(res));
  }
  show();
  note(cleaned.length+' page(s) ready. Check that the writing is clear black on white (adjust Ink sensitivity if not), then press Read text.');
}
async function run(){
  if(busy||!cleaned.length)return;
  busy=true;$('scanRun').disabled=true;
  try{
    const t=await readPages(cleaned,$('scanEngine').value);
    if(!t.trim()){note('No readable text was found. Try another Ink sensitivity or the other reading method.');return}
    const ed=$('txt');ed.value=(ed.value.trim()?ed.value.replace(/\s+$/,'')+'\n\n':'')+t;
    ed.dispatchEvent(new Event('input',{bubbles:true}));render();
    note('Done. The text was added to the editor. Handwriting reading is never perfect: compare it with your photos and fix mistakes before exporting. Lines marked [diagram] were skipped.');
  }catch(e){
    note($('scanEngine').value==='trocr'?'The handwriting model could not run (it needs internet the first time and a recent browser). Try "Printed text" or type the text yourself.':'Reading failed. Try again with a clearer photo.');
  }finally{busy=false;$('scanRun').disabled=!cleaned.length}
}

$('scanFiles').addEventListener('change',async e=>{
  const fs=[...e.target.files];e.target.value='';if(!fs.length)return;
  try{raw=[];for(const f of fs)raw.push(await toCanvas(f));await prepare()}catch(err){note('One of these images could not be opened.')}
});
$('scanThr').addEventListener('input',()=>{
  $('scanThrOut').textContent=$('scanThr').value;clearTimeout(timer);
  timer=setTimeout(()=>{if(raw.length)prepare()},300);
});
$('scanSplit').addEventListener('change',()=>{if(raw.length)prepare()});
$('scanRun').addEventListener('click',run);

// Scanned PDFs (no text layer) go through the same clean-then-read flow instead of blind OCR.
document.addEventListener('change',async e=>{
  const el=e.target;if(!el||el.id!=='file'||!el.files[0]||!/\.pdf$/i.test(el.files[0].name))return;
  e.stopPropagation();
  const f=el.files[0];el.value='';
  const noteEl=$('note');noteEl.textContent='Reading PDF…';
  try{
    const ls=await pdfText(f),t=blocks(ls);
    if(t.replace(/\s/g,'').length>=20){
      $('txt').value=t;noteEl.textContent='Imported '+ls.length+' lines. Fix anything in the text box, then export.';render();return;
    }
    document.querySelector('.tab[data-group="mid"][data-tab="ocr"]').click();
    raw=await pdfCanvases(f);await prepare();
    noteEl.textContent='This PDF has no text layer. Its pages were cleaned in the OCR tab: check them, then press Read text.';
  }catch(err){noteEl.textContent='This PDF could not be read.'}
},true);

window.NBScan={async readBlobs(blobs){raw=[];for(const b of blobs)raw.push(await toCanvas(b));await prepare();return readPages(cleaned,$('scanEngine').value)}};
})();
