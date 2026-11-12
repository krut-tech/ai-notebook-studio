// Phone-to-computer scanning (WebRTC via PeerJS), project backup/restore, shortcuts and small feature toggles.
(()=>{
const $=id=>document.getElementById(id);
const fire=(el,t)=>el.dispatchEvent(new Event(t,{bubbles:true}));
const loaded={};
const loadScript=src=>loaded[src]||(loaded[src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>{delete loaded[src];rej(new Error('Could not load '+src))};document.head.append(s)}));
const PEER_JS='https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const QR_JS='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const MAX_BYTES=15*1024*1024;
const hash=location.hash.match(/^#phone=([A-Za-z0-9_-]{8,64})$/);
if(hash)phoneSide(hash[1]);else laptopSide();

function laptopSide(){
  loadScript('scan.js').catch(()=>{});
  const modal=$('phoneModal');let peer=null,peerId=null;
  const st=t=>{$('phoneStatus').textContent=t};
  function open(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');start()}
  function close(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
  $('phoneBtn').addEventListener('click',open);
  $('phoneDocBtn').addEventListener('click',open);
  $('copyLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('phoneLink').value);st('Link copied. Open it on your phone.')}catch(e){$('phoneLink').select()}});

  async function start(){
    st('Connecting to the free relay service…');
    try{
      await Promise.all([loadScript(PEER_JS),loadScript(QR_JS)]);
      if(!peerId)peerId=await newPeer();
      const url=location.origin+location.pathname+'#phone='+peerId;
      $('qr').replaceChildren();
      new QRCode($('qr'),{text:url,width:200,height:200,correctLevel:QRCode.CorrectLevel.M});
      $('phoneLink').value=url;
      st('Waiting for your phone… Scan the QR code with its camera app.');
    }catch(e){
      peer=null;peerId=null;
      st('Could not start phone scanning. It needs an internet connection. You can still use this device\'s camera or upload a photo.');
    }
  }
  function newPeer(){
    return new Promise((res,rej)=>{
      peer=new Peer();
      const timer=setTimeout(()=>rej(new Error('timeout')),12000);
      peer.on('open',id=>{clearTimeout(timer);res(id)});
      peer.on('error',e=>{clearTimeout(timer);if(!peerId)rej(e);else st('Connection problem ('+(e.type||'error')+'). Close this window and try again.')});
      peer.on('disconnected',()=>{try{peer.reconnect()}catch(e){}});
      peer.on('connection',c=>{
        c.on('open',()=>{st('Phone connected. Take a photo on your phone.');c.send({hello:true,script:$('script').value})});
        c.on('data',d=>receive(c,d));
        c.on('close',()=>st('Phone disconnected. Scan the QR code again to reconnect.'));
      });
    });
  }
  async function receive(c,d){
    try{
      const raw=d&&d.data;
      if(!d||!['sheet','doc'].includes(d.kind)||!(raw instanceof ArrayBuffer||ArrayBuffer.isView(raw)))throw new Error('bad message');
      const buf=raw instanceof ArrayBuffer?raw:raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
      if(buf.byteLength>MAX_BYTES||buf.byteLength<100)throw new Error('bad size');
      const mime=d.mime==='image/png'?'image/png':'image/jpeg',blob=new Blob([buf],{type:mime});
      st('Photo received. Processing…');
      if(d.kind==='sheet'){
        await loadSheet(new File([blob],'phone-sheet.jpg',{type:mime}));
        saveP();pstat();$('font').value='__mine';fire($('font'),'change');render();
        st('Handwriting sheet added to your profile. Send another sheet for more variety.');
        c.send({ack:true,text:'Sheet received and added to your profile.'});
      }else if(window.NBScan){
        // Document photo: clean it first, then read it. Check the cleaned page in the OCR tab.
        const text=(await window.NBScan.readBlobs([blob])).trim();
        if(!text)throw new Error('empty');
        const box=$('txt');box.value=(box.value.trim()?box.value.replace(/\s+$/,'')+'\n\n':'')+text;fire(box,'input');render();
        st('Text from your phone photo was added to the editor. Please check it for mistakes.');
        c.send({ack:true,text:'Document received. Text added on your computer.'});
      }else{
        const w=await Tesseract.createWorker('eng');
        let text='';
        try{text=(await w.recognize(blob)).data.text.trim()}finally{await w.terminate()}
        const box=$('txt');box.value=(box.value.trim()?box.value.replace(/\s+$/,'')+'\n':'')+text;fire(box,'input');render();
        st('Text from your phone photo was added to the editor. Please check it for OCR mistakes.');
        c.send({ack:true,text:'Document received. Text added on your computer.'});
      }
    }catch(e){
      st('Could not use that photo. Try again with better light.');
      try{c.send({ack:true,text:'Could not use that photo. Please try again.'})}catch(_){}
    }
  }

  // Backup and restore of all notebooks and the handwriting profile.
  $('backupAll').addEventListener('click',()=>{
    let profile=null;try{profile=JSON.parse(localStorage.getItem('nbs-prof')||'null')}catch(e){}
    const data={format:'ai-notebook-studio-backup',version:1,exportedAt:new Date().toISOString(),projects:readProjects(),profile};
    saveFile('ai-notebook-studio-backup.json',new Blob([JSON.stringify(data)],{type:'application/json'}));
  });
  $('restoreAll').addEventListener('change',async e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    try{
      if(f.size>50e6)throw new Error('too large');
      const d=JSON.parse(await f.text());
      if(!d||d.format!=='ai-notebook-studio-backup'||!Array.isArray(d.projects))throw new Error('invalid');
      const ok=d.projects.filter(p=>p&&typeof p.id==='string'&&typeof p.text==='string').map(p=>({id:p.id.slice(0,60),name:String(p.name||'My notebook').slice(0,80),text:p.text,details:p.details&&typeof p.details==='object'?p.details:{},settings:p.settings&&typeof p.settings==='object'?p.settings:{},updatedAt:Number(p.updatedAt)||Date.now()}));
      const ids=new Set(ok.map(p=>p.id));
      writeProjects([...ok,...readProjects().filter(p=>!ids.has(p.id))].slice(0,50));refreshProjectList();
      if(d.profile&&typeof d.profile==='object'){try{localStorage.setItem('nbs-prof',JSON.stringify(d.profile));await loadP();pstat();render()}catch(_){}}
      $('saveStatus').textContent='Backup restored ('+ok.length+' notebooks).';
    }catch(_){alert('That file is not a valid AI Notebook Studio backup.')}
  });

  $('hlToggle').addEventListener('change',()=>{render();scheduleSave()});
  $('searchable').addEventListener('change',scheduleSave);
  document.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();
    if(k==='s'){e.preventDefault();$('saveProject').click()}else if(k==='p'){e.preventDefault();$('pdf').click()}
  });
}

function phoneSide(id){
  document.body.classList.add('phone-mode');$('phoneView').hidden=false;
  const st=t=>{$('pvStatus').textContent=t},vid=$('pvVideo'),kind=$('pvKind'),stage=$('pvCam'),guide=$('pvGuide');
  let conn=null,stream=null,facing='environment';
  const SCRIPTS={latin:'English / Latin',hindi:'Hindi',gujarati:'Gujarati'};

  loadScript(PEER_JS).then(()=>{
    const peer=new Peer();
    peer.on('open',()=>{
      conn=peer.connect(id,{reliable:true});
      conn.on('open',()=>{st('Connected to your computer.');$('pvSend').disabled=false});
      conn.on('data',d=>{
        if(d&&d.hello)$('pvScript').textContent='Your computer expects a '+(SCRIPTS[d.script]||'')+' handwriting sheet.';
        if(d&&d.ack)st(String(d.text||'Done'));
      });
      conn.on('close',()=>{st('Disconnected from your computer. Scan the QR code again.');$('pvSend').disabled=true});
      conn.on('error',()=>st('Connection error. Scan the QR code again.'));
    });
    peer.on('error',e=>st('Could not connect ('+(e.type||'error')+'). Keep the page open on your computer, then scan the QR code again.'));
  }).catch(()=>st('Could not load the connection library. Check your internet connection.'));

  // Crop rectangle with the same 5:3 shape as the handwriting template, centred in the video frame.
  function cropRect(vw,vh){
    let w=vw*.88,h=w*3/5;if(h>vh*.88){h=vh*.88;w=h*5/3}
    return{x:(vw-w)/2,y:(vh-h)/2,w,h};
  }
  function layoutGuide(){
    if(!vid.videoWidth)return;
    stage.style.aspectRatio=vid.videoWidth+' / '+vid.videoHeight;
    const r=cropRect(vid.videoWidth,vid.videoHeight);
    guide.style.left=(r.x/vid.videoWidth*100)+'%';guide.style.top=(r.y/vid.videoHeight*100)+'%';
    guide.style.width=(r.w/vid.videoWidth*100)+'%';guide.style.height=(r.h/vid.videoHeight*100)+'%';
  }
  vid.addEventListener('loadedmetadata',layoutGuide);
  kind.addEventListener('change',()=>{guide.hidden=kind.value!=='sheet'});

  function stop(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}vid.srcObject=null}
  async function cam(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){st('Camera is not available in this browser. Use "Take photo with camera app" below.');return}
    stop();
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}}});
      vid.srcObject=stream;await vid.play();stage.hidden=false;$('pvStart').hidden=true;layoutGuide();
    }catch(e){st('Camera is blocked. Allow camera access in your browser, or use "Take photo with camera app" below.')}
  }
  $('pvStart').addEventListener('click',cam);
  $('pvSwitch').addEventListener('click',()=>{facing=facing==='environment'?'user':'environment';cam()});

  function send(blob){
    if(!conn||!conn.open){st('Not connected to your computer.');return}
    if(blob.size>MAX_BYTES){st('That photo is too large.');return}
    blob.arrayBuffer().then(buf=>{conn.send({kind:kind.value,mime:blob.type==='image/png'?'image/png':'image/jpeg',data:buf});st('Sent. Processing on your computer…')});
  }
  $('pvSend').addEventListener('click',()=>{
    if(!stream||!vid.videoWidth){st('Start the camera first.');return}
    const c=document.createElement('canvas'),vw=vid.videoWidth,vh=vid.videoHeight;
    if(kind.value==='sheet'){
      const r=cropRect(vw,vh);c.width=1300;c.height=780;
      c.getContext('2d').drawImage(vid,r.x,r.y,r.w,r.h,0,0,1300,780);
    }else{
      const k=Math.min(1,2200/Math.max(vw,vh));c.width=Math.round(vw*k);c.height=Math.round(vh*k);
      c.getContext('2d').drawImage(vid,0,0,c.width,c.height);
    }
    c.toBlob(b=>{if(b)send(b)},'image/jpeg',.92);
  });
  $('pvFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f&&/^image\//.test(f.type))send(f)});
  window.addEventListener('pagehide',stop);
}
})();
