(function(root){
 function parseDuration(text){
  text=String(text).trim().toLowerCase();let seconds;
  const clock=text.match(/^(\d{1,2}):([0-5]\d)$/),units=text.match(/^(?:(\d+)\s*(?:phút|p|min)\s*)?(?:(\d+)\s*(?:giây|s))?$/);
  if(clock)seconds=Number(clock[1])*60+Number(clock[2]);
  else if(/^\d+$/.test(text))seconds=Number(text);
  else if(units&&(units[1]||units[2]))seconds=Number(units[1]||0)*60+Number(units[2]||0);
  if(!Number.isInteger(seconds)||seconds<1||seconds>3600)throw Error('Nhập thời gian từ 1 giây đến 60 phút, ví dụ 01:30 hoặc 1 phút 30s.');
  return seconds*1000;
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={parseDuration};return;}
 function mount(config){
 const {host:shared,id,endpoint,kinds,labels,downloads}=config;if(!shared)return;
 const storageKey=id==='cs'?'ff-overlay-program-duration':'ff-'+id+'-overlay-program-duration';
 const panel=document.createElement('fieldset');panel.className='preview-controls overlay-program';
 panel.innerHTML='<legend>Điều khiển OVERLAY · Preview chung</legend><p>MVP → GAMERES → SUMARY</p><div class="preview-options"><label>Thời gian mỗi overlay (phút:giây)<input id="overlayProgramDuration" type="text" value="01:30" placeholder="01:30" aria-describedby="overlayProgramHelp"></label></div><div class="preview-buttons"><button type="button" data-program="start">Bắt đầu từ MVP</button><button type="button" data-program="preview">Mở Preview chung</button><button type="button" data-program="pause" disabled>Dừng chuyển</button><button type="button" data-program="resume" disabled>Tiếp tục chuyển</button></div><p class="program-status" role="status" aria-live="polite">Lấy dữ liệu dùng chung, rồi bấm Bắt đầu từ MVP.</p><div class="preview-link"></div><small id="overlayProgramHelp">Ví dụ 01:30 = 1 phút 30 giây. Sau SUMARY sẽ giữ nguyên màn hình. Dừng chuyển giữ overlay hiện tại; Tiếp tục dùng thời gian còn lại. Lịch vẫn chạy khi đóng trang điều khiển. Thiết lập thời gian mới áp dụng khi bấm Bắt đầu từ MVP.</small>';
 panel.querySelector('p').textContent=kinds.map(kind=>labels[kind]).join(' → ');
 const help=panel.querySelector('small'),durationInput=panel.querySelector('input');help.id=id+'OverlayProgramHelp';durationInput.id=id+'OverlayProgramDuration';durationInput.setAttribute('aria-describedby',help.id);help.textContent=help.textContent.replace('SUMARY',labels[kinds.at(-1)]);
 shared.append(panel);
 const button=name=>panel.querySelector('[data-program="'+name+'"]'),input=panel.querySelector('input'),status=panel.querySelector('.program-status'),output=panel.querySelector('.preview-link');
 let current=null,received=0,busy=false,error='',url=null,requestId=0;
 try{const saved=localStorage.getItem(storageKey);if(saved){parseDuration(saved);input.value=saved;}}catch{}
 input.oninput=()=>{try{parseDuration(input.value);localStorage.setItem(storageKey,input.value);}catch{}};
 function display(){
  button('start').disabled=button('preview').disabled=busy;
  button('pause').disabled=busy||!current?.running;button('resume').disabled=busy||!current||current.running||current.finished;
  if(error){status.textContent=error;return;}if(busy){status.textContent='Đang đồng bộ OVERLAY...';return;}if(!current)return;
  const remaining=Math.max(0,Math.ceil((current.remaining-(current.running?Date.now()-received:0))/1000));
  const time=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
  status.textContent='Đang hiện '+labels[current.kind]+' · '+(current.finished?'Đã hoàn tất · Giữ '+labels[kinds.at(-1)]:current.running?'Chuyển sau '+time:'Đã dừng chuyển · Còn '+time);
 }
 async function request(action,interval){
  const id=++requestId;
  const response=await fetch('/api/broadcast/'+endpoint+'/program',action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,interval})}:{cache:'no-store'});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Không kết nối được Preview chung.');
  if(id!==requestId)return url;
  error='';current=result.program;received=Date.now();url=new URL(result.url,location.origin).href;
  output.replaceChildren();const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.textContent=url;output.append('Link OBS/vMix · 1920 × 1080: ',link);display();return url;
 }
 async function act(action){
  if(busy)return;busy=true;error='';display();
  try{
   let interval;if(action==='start'){
    interval=parseDuration(input.value);
    if(downloads.some(id=>!document.getElementById(id)||document.getElementById(id).disabled))throw Error('Hãy lấy dữ liệu dùng chung và chờ '+kinds.map(kind=>labels[kind]).join(', ')+' cập nhật xong trước khi bắt đầu.');
    await Promise.all(kinds.map(kind=>root.BroadcastPreview.sync(kind)));
   }
   await request(action,interval);
  }catch(e){error=e.message;}finally{busy=false;display();}
 }
 for(const action of ['start','pause','resume'])button(action).onclick=()=>act(action);
 button('preview').onclick=async()=>{
  if(busy)return;const popup=window.open('about:blank','_blank');busy=true;error='';display();
  try{await request();if(popup){popup.opener=null;popup.location.href=url;}}catch(e){error=e.message;if(popup)popup.close();}finally{busy=false;display();}
 };
 request().catch(()=>{});setInterval(display,1000);setInterval(()=>{if(current&&!busy)request().catch(e=>{error=e.message;display();});},5000);
 }
 root.OverlayProgram={mount};
 mount({host:document.getElementById('csSharedInputs'),id:'cs',endpoint:'cs-overlay',kinds:['cs-mvp','cs-gameres','cs-summary'],labels:{'cs-mvp':'MVP','cs-gameres':'GAMERES','cs-summary':'SUMARY'},downloads:['csmDownload','grDownload','cssDownload']});
})(typeof window!=='undefined'?window:globalThis);
