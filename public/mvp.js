(function(root){
 'use strict';
 const photoId=name=>/^\d+\.(png|jpe?g|webp)$/i.test(name)?name.replace(/\.[^.]+$/,''):null;
 const topThree=players=>players.slice(0,3);
 const stat=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':String(Math.round(Number(value)));
 function parseNames(text){
  const data=JSON.parse(text.replace(/^\uFEFF/,''));
  if(!Array.isArray(data?.PlayerNameList))throw new Error('Tệp phải có danh sách PlayerNameList.');
  const names=new Map();
  for(const row of data.PlayerNameList){
   const id=String(row?.PlayerID??'').trim(),name=typeof row?.PlayerNameOverwrite==='string'?row.PlayerNameOverwrite.trim():'';
   if(/^\d+$/.test(id)&&name)names.set(id,name);
  }
  if(!names.size)throw new Error('Không có PlayerID và PlayerNameOverwrite hợp lệ trong tệp.');
  return names;
 }
 const displayName=(player,names)=>names.get(String(player.playerId).trim())||player.name;
 function matchesFromResponses(responses,groupsOf){const matches=[];for(const batch of responses)groupsOf(batch.data).forEach((group,i)=>matches.push({gameNumber:matches.length+1,matchId:String(group.match_id||batch.requestedIds[i]||''),teams:Array.isArray(group.team_stats)?group.team_stats:[]}));return matches;}
 const api={photoId,topThree,stat,parseNames,displayName,matchesFromResponses};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
 root.MVP=api;
 const photos=new Map();let revision=0,ready=false,mvpMatches=[],loading=false;
 const section=document.createElement('section');section.className='mvp-panel';
 section.innerHTML=`<details id="mvpDetails"><summary>MVP · Top 3 người chơi</summary><div class="mvp-controls"><p>Nhập Match ID và bấm Lấy điểm ở đầu trang. MVP lấy top 3 theo mục Player, cộng dồn các trận đã tải.</p><label>Tiêu đề giải <input id="mvpTitle" maxlength="100" placeholder="VÒNG BẢNG - NGÀY 3"></label><label class="mvp-photo-label">Thêm ảnh tuyển thủ theo ID <input id="mvpPhotos" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><small>Ví dụ: 123456789.png. Chọn nhiều ảnh cùng lúc; ảnh PNG nền trong suốt sẽ cho kết quả đẹp nhất. Kho ảnh được lưu trong trình duyệt.</small><div><button id="mvpRefresh" type="button">Cập nhật MVP</button> <button id="mvpDownload" type="button" disabled>Xuất MVP PNG</button></div><p id="mvpStatus" role="status" aria-live="polite"></p><div id="mvpPlayers"></div></div><canvas id="mvpCanvas" width="1920" height="1080" aria-label="Xem trước top 3 MVP"></canvas></details>`;
 section.id='mvpTab';section.classList.add('tab-content');
 document.querySelector('.workspace').appendChild(section);
 section.querySelector('details').open=true;
 const tab=document.createElement('button');tab.className='tab';tab.type='button';tab.dataset.tab='mvp';tab.textContent='MVP';document.querySelector('.workspace-tabs').appendChild(tab);
 document.querySelectorAll('.workspace-tabs .tab').forEach(button=>{button.onclick=()=>{
  document.querySelectorAll('.workspace-tabs .tab').forEach(item=>item.classList.toggle('active',item===button));
  document.querySelectorAll('.workspace > .tab-content').forEach(item=>item.classList.toggle('active',item.id===button.dataset.tab+'Tab'));
  document.body.classList.toggle('mvp-active',button.dataset.tab==='mvp');
  if(button.dataset.tab==='templates')renderTemplates();
  if(button.dataset.tab==='designer')resizeBoard();
  if(button.dataset.tab==='mvp')render();
 };});
 section.querySelector('.mvp-controls > p').textContent='Nhập Match ID riêng cho MVP. Top 3 được xếp theo ELIMS, DAMAGE, ASSIST; nhiều ID sẽ cộng dồn.';
 const matchControls=document.createElement('div');matchControls.innerHTML='<label>Match ID cho MVP <input id="mvpMatchIds" placeholder="Nhập Match ID, ngăn cách bằng dấu phẩy"></label><button id="mvpFetch" type="button">Lấy MVP</button><p id="mvpFetchStatus" role="status" aria-live="polite"></p>';
 section.querySelector('.mvp-controls > p').after(matchControls);
 let names=new Map();
 const nameControls=document.createElement('div');
 nameControls.innerHTML='<label>Nhập PlayerNameOverwrite.json <input id="mvpNamesFile" type="file" accept=".json,application/json"></label><p id="mvpNamesStatus" role="status" aria-live="polite"></p><button id="mvpClearNames" type="button">Xóa tên ghi đè</button>';
 section.querySelector('.mvp-photo-label').before(nameControls);
 const q=id=>section.querySelector('#'+id),canvas=q('mvpCanvas'),ctx=canvas.getContext('2d');
 try{const saved=localStorage.getItem('ff-mvp-names');if(saved)names=parseNames(saved);}catch{}
 const nameStatus=()=>{q('mvpNamesStatus').textContent=names.size?`Đã lưu ${names.size} tên. MVP dùng PlayerNameOverwrite theo PlayerID; ID không có trong tệp sẽ giữ tên từ trận đấu.`:'Chưa nhập tệp tên. MVP đang dùng tên từ trận đấu.';};
 nameStatus();
 q('mvpNamesFile').onchange=async()=>{
  const file=q('mvpNamesFile').files[0];q('mvpNamesFile').value='';if(!file)return;resetButton.disabled=true;
  try{const text=await file.text(),parsed=parseNames(text);names=parsed;let saved=true;try{localStorage.setItem('ff-mvp-names',JSON.stringify({PlayerNameList:[...names].map(([PlayerID,PlayerNameOverwrite])=>({PlayerID,PlayerNameOverwrite}))}));}catch{saved=false;}await render();nameStatus();if(!saved)q('mvpNamesStatus').textContent+=' Không lưu được vào trình duyệt; hãy nhập lại khi mở trang lần sau.';}
  catch(error){q('mvpNamesStatus').textContent='Không nhập được tệp: '+error.message+' Danh sách tên hiện tại được giữ nguyên.';}finally{resetButton.disabled=loading;}
 };
 q('mvpClearNames').onclick=()=>{names=new Map();try{localStorage.removeItem('ff-mvp-names');}catch{}nameStatus();render();};
 BroadcastPreview.mount('mvp',canvas,q('mvpDownload'));
 const message=text=>{q('mvpStatus').textContent=text;};
 const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Không đọc được ảnh MVP.'));img.src=src;});
 const dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('ff-mvp-portraits',1);req.onupgradeneeded=()=>req.result.createObjectStore('photos');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 function savePhoto(db,id,file){return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 function remember(id,file){if(photos.has(id))URL.revokeObjectURL(photos.get(id));photos.set(id,URL.createObjectURL(file));}
 const restore=dbPromise.then(db=>new Promise((resolve,reject)=>{const req=db.transaction('photos').objectStore('photos').openCursor();req.onsuccess=()=>{const cursor=req.result;if(!cursor){resolve();return;}remember(cursor.key,cursor.value);cursor.continue();};req.onerror=()=>reject(req.error);}));
 restore.catch(()=>message('Không mở được kho ảnh đã lưu. Có thể chọn ảnh để dùng trong phiên này.'));
 const background=loadImage('mvp-template.png');background.catch(()=>{});
 function textFit(text,x,y,width,size,color,weight=800){ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';do{ctx.font=`${weight} ${size--}px Arial`; }while(ctx.measureText(text).width>width&&size>10);ctx.fillText(text,x,y);}
 async function render(){
  const token=++revision;ready=false;q('mvpDownload').disabled=true;
  try{
   const players=topThree(sortPlayers(buildPlayerData(null,mvpMatches))).map(p=>({...p,name:displayName(p,names)}));
   const [bg,portraits]=await Promise.all([background,Promise.all(players.map(p=>photos.has(p.playerId)?loadImage(photos.get(p.playerId)).catch(()=>null):null))]);
   if(token!==revision)return;
   ctx.clearRect(0,0,1920,1080);ctx.drawImage(bg,0,0,1920,1080);
   textFit(q('mvpTitle').value,1112,260,350,32,'#10234e');
   const positions=[{x:311,w:407,top:330,nameY:855,statsY:902,color:'#7d087b'},{x:784,w:390,top:350,nameY:853,statsY:899,color:'#152e87'},{x:1225,w:389,top:350,nameY:853,statsY:899,color:'#152e87'}];
   q('mvpPlayers').replaceChildren();
   positions.forEach((pos,i)=>{
    const p=players[i];
    ctx.fillStyle=pos.color;ctx.fillRect(pos.x,pos.statsY,pos.w,110);
    if(!p)return;
    const image=portraits[i];
    if(image){ctx.save();ctx.beginPath();ctx.rect(pos.x,pos.top,pos.w,478);ctx.clip();const scale=Math.min(pos.w/image.width,478/image.height);const w=image.width*scale,h=image.height*scale;ctx.drawImage(image,pos.x+(pos.w-w)/2,828-h,w,h);ctx.restore();}
    else textFit('Chưa có ảnh',pos.x+pos.w/2,590,pos.w-30,28,'#ffffff');
    textFit(p.name,pos.x+pos.w/2,pos.nameY,pos.w-40,36,'#152e57');
    ['ELIMS','DAMAGE','ASSIST'].forEach((label,j)=>{const x=pos.x+pos.w*(j+.5)/3;textFit(label,x,pos.statsY+23,pos.w/3-10,22,'#fff');textFit(stat(p[['kills','damage','assists'][j]]),x,pos.statsY+72,pos.w/3-12,47,'#f6ff73');});
    const row=document.createElement('p');row.textContent=`#${i+1} · ${p.name} · ID: ${p.playerId||'API không cung cấp'} · ELIMS ${stat(p.kills)} · DAMAGE ${stat(p.damage)} · ASSIST ${stat(p.assists)}`;q('mvpPlayers').appendChild(row);
   });
   const missing=players.filter((p,i)=>!portraits[i]);
   message(!players.length?'Chưa có người chơi. Hãy nhập Match ID trong tab MVP và bấm Lấy MVP.':`Top ${players.length} người chơi từ ${mvpMatches.length} trận MVP.`+(missing.length?` Thiếu ảnh của ${missing.map(p=>p.name).join(', ')}. Chọn ảnh có tên trùng ID bên dưới.`:''));
   BroadcastPreview.update('mvp');
   ready=players.length>0&&!loading;q('mvpDownload').disabled=!ready;
  }catch(error){if(token===revision)message(error.message);}
 }
 api.refresh=()=>{if(q('mvpDetails').open)render();else{ready=false;q('mvpDownload').disabled=true;}};
 q('mvpDetails').addEventListener('toggle',()=>{if(q('mvpDetails').open)render();});
 q('mvpRefresh').onclick=render;
 const resetButton=document.createElement('button');resetButton.id='mvpReset';resetButton.type='button';resetButton.textContent='Khôi phục mặc định';q('mvpDownload').after(resetButton);
 resetButton.onclick=async()=>{
  if(loading||resetButton.disabled)return;
  if(!window.confirm('Khôi phục mặc định MVP? Sẽ xóa Match ID, kết quả MVP, tiêu đề, toàn bộ ảnh tuyển thủ và tên ghi đè đã lưu của MVP.'))return;
  const controls=[...section.querySelectorAll('button,input')];controls.forEach(control=>{control.disabled=true;});
  const errors=[];
  try{
   await restore.catch(()=>{});
   try{const db=await dbPromise;await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}catch{errors.push('Không xóa được kho ảnh đã lưu trong trình duyệt.');}
   for(const key of ['ff-mvp-title','ff-mvp-names'])try{localStorage.removeItem(key);}catch{errors.push('Không xóa được tùy chỉnh đã lưu trong trình duyệt.');}
   revision++;ready=false;mvpMatches=[];names=new Map();
   photos.forEach(url=>URL.revokeObjectURL(url));photos.clear();
   for(const id of ['mvpMatchIds','mvpTitle','mvpPhotos','mvpNamesFile'])q(id).value='';
   q('mvpFetchStatus').textContent='';nameStatus();await render();
   message(errors.length?'Đã reset phiên MVP hiện tại. '+errors.join(' '):'Đã khôi phục mặc định MVP. Nhập Match ID mới để bắt đầu.');
  }finally{controls.forEach(control=>{control.disabled=false;});q('mvpDownload').disabled=!ready;}
 };
 q('mvpFetch').onclick=async()=>{
  if(loading)return;
  try{
   const ids=parseMatchIds(q('mvpMatchIds').value);validateMatchIds(ids);
   loading=true;ready=false;q('mvpFetch').disabled=true;q('mvpDownload').disabled=true;resetButton.disabled=true;
   const batches=splitIntoBatches(ids,8),responses=[];
   for(let i=0;i<batches.length;i++){
    q('mvpFetchStatus').textContent=`Đang lấy MVP · nhóm ${i+1}/${batches.length}...`;
    const response=await fetch('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match_ids:batches[i]})});
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||'Không lấy được dữ liệu MVP.');
    if(result.data?.status&&result.data.status!=='success')throw new Error(result.data.msg||'Match Stats báo lỗi.');
    responses.push({requestedIds:batches[i],data:result.data});
   }
   mvpMatches=matchesFromResponses(responses,getTeamGroups);
   q('mvpFetchStatus').textContent=`Đã tải ${mvpMatches.length} trận cho MVP.`;
  }catch(error){q('mvpFetchStatus').textContent=error.message+' Dữ liệu MVP đã tải trước đó được giữ nguyên.';}
  finally{loading=false;q('mvpFetch').disabled=false;resetButton.disabled=false;await render();}
 };
 q('mvpMatchIds').addEventListener('keydown',event=>{if(event.key==='Enter')q('mvpFetch').click();});
 q('mvpTitle').addEventListener('input',()=>{try{localStorage.setItem('ff-mvp-title',q('mvpTitle').value);}catch{}render();});
 try{q('mvpTitle').value=localStorage.getItem('ff-mvp-title')||'';}catch{}
 q('mvpPhotos').onchange=async()=>{
  resetButton.disabled=true;const files=Array.from(q('mvpPhotos').files);q('mvpPhotos').value='';let count=0;const rejected=[];let persistent=true;
  for(const file of files){const id=photoId(file.name);if(!id){rejected.push(file.name);continue;}try{const url=URL.createObjectURL(file);try{await loadImage(url);}finally{URL.revokeObjectURL(url);}remember(id,file);count++;try{await savePhoto(await dbPromise,id,file);}catch{persistent=false;}}catch{rejected.push(file.name);}}
  await render();message(q('mvpStatus').textContent+` Đã thêm ${count} ảnh.`+(rejected.length?` Bỏ qua tệp sai tên hoặc không đọc được: ${rejected.join(', ')}.`:'')+(!persistent?' Không lưu được kho ảnh; ảnh chỉ dùng trong phiên này.':''));resetButton.disabled=loading;
 };
 q('mvpDownload').onclick=()=>{if(!ready)return;canvas.toBlob(blob=>{if(!blob){message('Không tạo được PNG.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='MVP-top-3.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},'image/png');};
 restore.then(()=>api.refresh()).catch(()=>{});
})(typeof window!=='undefined'?window:globalThis);
