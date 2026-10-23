(function(){
 const channels=new Map(),defaults={effect:'fade',duration:600,onOpen:true,onUpdate:true,visible:true,replay:''};
 const labels={standings:'Bảng điểm',mvp:'MVP',h2h:'So sánh đội'};
 window.BroadcastPreview={mount(kind,canvas,anchor,prepare){
  const panel=document.createElement('fieldset');panel.className='preview-controls';
  panel.innerHTML=`<legend>Preview · ${labels[kind]}</legend><div class="preview-buttons"><button type="button" data-action="open">Preview</button><button type="button" data-action="replay">Phát lại animation</button><button type="button" data-action="visibility">Ẩn Preview</button><button type="button" data-action="sync">Đồng bộ ngay</button></div><div class="preview-options"><label>Animation<select data-setting="effect"><option value="none">Không hiệu ứng</option><option value="fade">Mờ dần</option><option value="left">Trượt từ trái</option><option value="right">Trượt từ phải</option><option value="up">Trượt lên</option><option value="zoom">Phóng nhẹ</option></select></label><label>Thời gian (ms)<input type="number" min="100" max="5000" step="100" data-setting="duration"></label><label><input type="checkbox" data-setting="onOpen"> Khi mở Preview</label><label><input type="checkbox" data-setting="onUpdate"> Khi dữ liệu đổi</label></div><p class="preview-status" role="status" aria-live="polite"></p><div class="preview-link"></div><small>Giữ trang điều khiển mở để tự đồng bộ. PNG tải xuống là ảnh tĩnh.</small>`;
  anchor.after(panel);
  const status=panel.querySelector('.preview-status'),output=panel.querySelector('.preview-link');
  const button=action=>panel.querySelector('[data-action="'+action+'"]');
  let saved={};try{saved=JSON.parse(localStorage.getItem('ff-preview-'+kind)||'{}');}catch{}
  const channel={enabled:false,pending:null,dirty:false,controlDirty:false,lastHash:null,url:null,settings:{...defaults,...saved},retry:null};try{channel.enabled=localStorage.getItem('ff-preview-enabled-'+kind)==='true';}catch{}channels.set(kind,channel);
  for(const key of ['effect','duration','onOpen','onUpdate']){const input=panel.querySelector('[data-setting="'+key+'"]');if(input.type==='checkbox')input.checked=channel.settings[key];else input.value=channel.settings[key];input.onchange=()=>{const value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;if(key==='duration'&&(!Number.isFinite(value)||value<100||value>5000)){status.textContent='Thời gian phải từ 100 đến 5000 ms.';return;}channel.settings[key]=value;save();channel.controlDirty=true;if(channel.enabled)publish();};}
  function save(){try{localStorage.setItem('ff-preview-'+kind,JSON.stringify(channel.settings));}catch{}}
  function showLink(){if(!channel.url)return;output.replaceChildren();const link=document.createElement('a');link.href=channel.url;link.target='_blank';link.rel='noopener';link.textContent=channel.url;output.append('Link OBS/vMix · 1920 × 1080: ',link);}
  async function send(suffix,body,type){const response=await fetch('/api/broadcast/'+kind+suffix,{method:'POST',headers:{'Content-Type':type},body});let result;try{result=await response.json();}catch{throw Error('Không gửi được Preview. Kiểm tra kết nối và đăng nhập.');}if(!response.ok)throw Error(result.error||'Không gửi được Preview.');channel.url=new URL(result.url,location.origin).href;return result;}
  function publish(){
   if(channel.pending)return channel.pending;
   channel.pending=(async()=>{
    try{
     status.textContent='Đang đồng bộ...';
     do{
      if(channel.controlDirty){channel.controlDirty=false;try{await send('/control',JSON.stringify(channel.settings),'application/json');}catch(error){channel.controlDirty=true;throw error;}}
      if(channel.dirty){channel.dirty=false;try{
       if(prepare)await prepare();
       const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Không tạo được ảnh Preview.');if(blob.size>4*1024*1024)throw Error('Ảnh Preview vượt 4 MB. Hãy giảm kích thước ảnh nền hoặc ảnh tuyển thủ.');
       const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
       if(hash!==channel.lastHash){await send('',blob,'image/png');channel.lastHash=hash;}
      }catch(error){channel.dirty=true;throw error;}}
     }while(channel.dirty||channel.controlDirty);
     if(channel.retry){clearTimeout(channel.retry);channel.retry=null;}showLink();status.textContent='Đã đồng bộ · '+new Date().toLocaleTimeString('vi-VN');
    }catch(error){status.textContent=error.message+' Đang chờ thử lại.';if(!channel.retry)channel.retry=setTimeout(()=>{channel.retry=null;publish();},5000);}
    finally{channel.pending=null;}
   })();return channel.pending;
  }
  channel.update=()=>{if(channel.enabled){channel.dirty=true;publish();}};
  async function activate(){channel.enabled=true;try{localStorage.setItem('ff-preview-enabled-'+kind,'true');}catch{}channel.dirty=true;channel.controlDirty=true;await publish();}
  button('open').onclick=async()=>{button('open').disabled=true;const popup=window.open('about:blank','_blank');try{await activate();if(channel.url&&popup){popup.opener=null;popup.location.href=channel.url;}else if(popup)popup.close();}finally{button('open').disabled=false;}};
  button('replay').onclick=()=>{channel.settings.replay=crypto.randomUUID();save();channel.controlDirty=true;if(!channel.enabled)activate();else publish();};
  function visibilityLabel(){button('visibility').textContent=channel.settings.visible?'Ẩn Preview':'Hiện Preview';}visibilityLabel();
  button('visibility').onclick=()=>{channel.settings.visible=!channel.settings.visible;visibilityLabel();save();channel.controlDirty=true;if(!channel.enabled)activate();else publish();};
  button('sync').onclick=()=>{channel.lastHash=null;activate();};
 },update(kind){channels.get(kind)?.update();}};
})();
