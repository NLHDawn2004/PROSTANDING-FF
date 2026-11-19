(function(root){
 'use strict';
 const cs=typeof module!=='undefined'&&module.exports?require('./clash-squad'):root.ClashSquad;
 const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 const stat=v=>num(v)===null?'—':String(Math.round(Number(v)*100)/100);
 function roster(matches){return cs.aggregate(matches).players.map(p=>{
  const id=String(p.player_id??'').trim(),key=id&&id!=='0'&&id!=='-1'?'ID:'+id:'NAME:'+p.team_name+'|'+p.player_name;
  let hs=p.headshot_kill_rate??null;
  if(p.headshots!==null&&p.kills>0)hs=Math.round(p.headshots/p.kills*10000)/100+'%';
  return {...p,key,name:p.player_name,hs};
 });}
 const chosen=(rows,key)=>rows.find(p=>p.key===key)||null;
 function draw(ctx,{frame,portrait,logo,player,font='"GFFVNBlack",Arial,sans-serif'}){
  ctx.clearRect(0,0,1920,1080);ctx.drawImage(frame,0,0,1920,1080);
  if(portrait&&player){ctx.save();ctx.beginPath();ctx.rect(680,115,555,867);ctx.clip();const scale=Math.min(555/portrait.width,867/portrait.height),w=portrait.width*scale,h=portrait.height*scale;ctx.drawImage(portrait,957.5-w/2,982-h,w,h);ctx.restore();}
  ctx.drawImage(frame,730,887,460,95,730,887,460,95);
  ctx.fillStyle='#12acb1';ctx.fillRect(734,891,108,87);
  if(logo&&player){const scale=Math.min(98/logo.width,78/logo.height),w=logo.width*scale,h=logo.height*scale;ctx.drawImage(logo,788-w/2,934-h/2,w,h);}
  function text(value,x,y,width,size,color){ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';do{ctx.font=`400 ${size--}px ${font}`;}while(ctx.measureText(value).width>width&&size>10);ctx.fillText(value,x,y);}
  for(const [label,key,y] of [['ELIMS','kills',635],['DMG','damage',743],['ASSISTS','assists',851]]){text(player?stat(player[key]):'—',455,y,155,44,'#fff');}
  for(const [label,value,x,y] of [['HS',player?.hs,1452,600],['K/D',player?stat(player.kd):null,1699,600],['DEATH',player?stat(player.death):null,1567,829]]){text(value===null||value===undefined?'—':String(value),x,y+73,208,44,'#fff');}
  text(player?.name||'CHỌN TUYỂN THỦ',1010,936,320,42,'#fff');
 }
 async function artwork(frame,photoSrc,logoSrc,loader){
  const warnings=[];
  const safe=async(src,label)=>{if(!src)return null;try{return await loader(src);}catch{warnings.push(label);return null;}};
  const [bg,portrait,logo]=await Promise.all([frame,safe(photoSrc,'Không đọc được ảnh tuyển thủ'),safe(logoSrc,'Không đọc được logo đội')]);
  return {frame:bg,portrait,logo,warnings};
 }
 const selection=(rows,previous,automatic=false)=>automatic?(rows[0]?.key||''):(chosen(rows,previous)?previous:'');
 const api={roster,chosen,stat,draw,artwork,selection};if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.ClashSquadMVP=api;
 const host=document.querySelector('#csMvp');
 host.innerHTML='<h1>OVERLAY TỬ CHIẾN</h1><h2>MVP</h2><p>Nhập Match ID riêng. MVP tự lấy người đứng đầu bảng Player (ELIMS → DAMAGE → DEATHS ít hơn); bạn có thể chọn lại tuyển thủ.</p><form class="cs-fetch"><label>Match ID cho MVP Tử chiến<textarea id="csmIds" rows="2" placeholder="Nhập Match ID, cách nhau bằng dấu phẩy"></textarea></label><button id="csmFetch" type="submit">Lấy dữ liệu MVP</button></form><div class="cs-filters"><label>Trận<select id="csmMatch"></select></label><label>Chọn tuyển thủ MVP<select id="csmPlayer"></select></label><label>Font chữ<select id="csmFont"></select></label></div><label>Ảnh tuyển thủ theo ID<input id="csmPhotos" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><small>Ảnh đặt tên theo ID, ví dụ 6537554481.png. Có thể dùng ảnh đã nhập ở MVP Sinh tồn.</small><label>PlayerNameOverwrite.json<input id="csmNames" type="file" accept=".json,application/json"></label><div class="cs-mvp-actions"><button id="csmUpdate" type="button">Cập nhật MVP</button><button id="csmDownload" type="button" disabled>Xuất MVP PNG</button><button id="csmReset" type="button">Khôi phục mặc định</button></div><p id="csmStatus" role="status" aria-live="polite"></p><p class="cs-note">ASSISTS chỉ hiển thị khi dữ liệu trận cung cấp. HS cộng dồn chỉ tính khi có số headshot gốc; không cộng hoặc lấy trung bình các tỷ lệ giữa các trận. K/D = tổng ELIMS / tổng DEATHS; DEATHS = 0 dùng ELIMS.</p><canvas id="csmCanvas" width="1920" height="1080" aria-label="MVP Tử chiến"></canvas>';
 const q=id=>host.querySelector('#'+id),canvas=q('csmCanvas'),ctx=canvas.getContext('2d'),photos=new Map();let matches=[],names=new Map(),rows=[],busy=false,ready=false,revision=0;
 const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>reject(Error('Ảnh tải quá lâu.')),8000);image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(Error('Không đọc được ảnh MVP.'));};image.src=src;});
 const frame=loadImage('cs-mvp-template.png');frame.catch(()=>{});
 const status=text=>{q('csmStatus').textContent=text;};
 for(const face of RankingFonts.entries)q('csmFont').append(new Option(face.label,face.id));
 try{q('csmFont').value=localStorage.getItem('ff-csm-font')||'gff-vn-black';const text=localStorage.getItem('ff-csm-names');if(text)names=MVP.parseNames(text);}catch{}
 if(!q('csmFont').value)q('csmFont').value='gff-vn-black';
 const dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('ff-cs-mvp-portraits',1);req.onupgradeneeded=()=>req.result.createObjectStore('photos');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 function remember(id,file){if(photos.has(id))URL.revokeObjectURL(photos.get(id));photos.set(id,URL.createObjectURL(file));}
 const restore=dbPromise.then(db=>new Promise((resolve,reject)=>{const req=db.transaction('photos').objectStore('photos').openCursor();req.onsuccess=()=>{const cursor=req.result;if(!cursor){resolve();return;}remember(cursor.key,cursor.value);cursor.continue();};req.onerror=()=>reject(req.error);}));restore.catch(()=>{});
 function changePhoto(db,id,file){return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 function controls(){for(const id of ['csmIds','csmMatch','csmPlayer','csmPhotos','csmNames','csmFont','csmUpdate'])q(id).disabled=busy;q('csmDownload').disabled=!ready||busy;host.querySelectorAll('.preview-controls button').forEach(b=>b.disabled=!ready||busy);q('csmFetch').disabled=busy;q('csmReset').disabled=busy;}
 function playerOptions(automatic=false){const old=q('csmPlayer').value;rows=roster(matches.filter(m=>!q('csmMatch').value||m.id===q('csmMatch').value));q('csmPlayer').replaceChildren(new Option('— Chọn tuyển thủ MVP —',''));for(const p of rows)q('csmPlayer').append(new Option((names.get(String(p.player_id))||p.name)+' · '+p.team_name+' · ID '+(p.player_id??'—'),p.key));q('csmPlayer').value=selection(rows,old,automatic);}
 async function render(){
  const token=++revision;ready=false;controls();
  try{
   await restore.catch(()=>{});const fonts={name:q('csmFont').value};let fontWarning='';try{await RankingFonts.load(fonts);}catch{fonts.name='';fontWarning=' · Không tải được font, đang dùng Arial.';}
   const selected=chosen(rows,q('csmPlayer').value),player=selected?{...selected,name:names.get(String(selected.player_id))||selected.name}:null;
   const src=player?(photos.get(String(player.player_id))||MVP.photoFor(player.player_id)):null;
   const logoSrc=player&&typeof rankingTeamLogo==='function'?rankingTeamLogo({name:player.team_name,key:player.team_name}):null;
   const {frame:bg,portrait,logo,warnings}=await artwork(frame,src,logoSrc,loadImage);
   if(token!==revision)return;
   draw(ctx,{frame:bg,portrait,logo,player,font:RankingFonts.family('name',fonts)});
   ready=Boolean(player);controls();
   status(player?player.name+' · ID '+(player.player_id??'—')+' · '+player.games+' trận'+(!portrait?' · Chưa có ảnh tuyển thủ.':''):matches.length?'Đã tải '+rows.length+' tuyển thủ. Chọn người trong ô Chọn tuyển thủ MVP để cập nhật ảnh.':'Nhập Match ID để bắt đầu.');if(warnings.length||fontWarning)status(q('csmStatus').textContent+(warnings.length?' · '+warnings.join(' · '):'')+fontWarning);
   BroadcastPreview.update('cs-mvp');
  }catch(error){if(token===revision){status(error.message);controls();}}
 }
 api.refresh=render;
 BroadcastPreview.mount('cs-mvp',canvas,q('csmDownload'),async()=>{if(busy)throw Error('Chờ cập nhật MVP xong.');});
 host.querySelector('form').onsubmit=async event=>{event.preventDefault();if(busy)return;try{const ids=cs.ids(q('csmIds').value);busy=true;ready=false;controls();const next=[];for(let i=0;i<ids.length;i++){status('Đang tải MVP '+(i+1)+'/'+ids.length+' · '+ids[i]);next.push(await cs.loadMatch(ids[i]));}matches=next;const old=q('csmMatch').value;q('csmMatch').replaceChildren(new Option('Tất cả trận · cộng dồn',''));for(const match of matches)q('csmMatch').append(new Option(match.id,match.id));if(matches.some(m=>m.id===old))q('csmMatch').value=old;playerOptions(true);busy=false;await render();}catch(error){status(error.message+' Dữ liệu trước đó được giữ nguyên.');}finally{busy=false;controls();}};
 q('csmMatch').onchange=()=>{playerOptions(true);render();};q('csmPlayer').onchange=render;q('csmUpdate').onclick=()=>{playerOptions();render();};
 q('csmFont').onchange=()=>{try{localStorage.setItem('ff-csm-font',q('csmFont').value);}catch{}render();};
 q('csmNames').onchange=async()=>{const file=q('csmNames').files[0];q('csmNames').value='';if(!file)return;try{const text=await file.text(),next=MVP.parseNames(text);names=next;try{localStorage.setItem('ff-csm-names',text);}catch{}playerOptions();await render();}catch(error){status(error.message);}};
 q('csmPhotos').onchange=async()=>{const files=[...q('csmPhotos').files];q('csmPhotos').value='';if(busy||!files.length)return;busy=true;controls();let added=0,skipped=0;try{const db=await dbPromise;await restore;for(const file of files){const id=MVP.photoId(file.name);if(!id||!/^image\/(png|jpeg|webp)$/.test(file.type)){skipped++;continue;}await changePhoto(db,id,file);remember(id,file);added++;}busy=false;await render();status('Đã lưu '+added+' ảnh'+(skipped?' · Bỏ qua '+skipped+' tệp không hợp lệ.':'.'));}catch(error){status('Không lưu được ảnh: '+error.message);}finally{busy=false;controls();}};
 q('csmDownload').onclick=()=>{if(!ready||busy)return;canvas.toBlob(blob=>{if(!blob){status('Không tạo được PNG.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MVP-tu-chien.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},'image/png');};
 q('csmReset').onclick=async()=>{if(busy||!confirm('Khôi phục MVP Tử chiến? Xóa Match ID, tên ghi đè và ảnh riêng của tab này.'))return;busy=true;ready=false;controls();try{await restore.catch(()=>{});const db=await dbPromise;await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});photos.forEach(url=>URL.revokeObjectURL(url));photos.clear();matches=[];names=new Map();rows=[];q('csmIds').value='';q('csmMatch').replaceChildren();q('csmPlayer').replaceChildren(new Option('— Chọn tuyển thủ MVP —',''));q('csmFont').value='gff-vn-black';try{localStorage.removeItem('ff-csm-font');localStorage.removeItem('ff-csm-names');}catch{}busy=false;await render();}catch(error){status('Không khôi phục được: '+error.message);}finally{busy=false;controls();}};
 playerOptions();render();
})(typeof window!=='undefined'?window:globalThis);
