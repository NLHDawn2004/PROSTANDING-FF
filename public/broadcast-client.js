(function(){
 const channels=new Map();
 window.BroadcastPreview={mount(kind,canvas,anchor,prepare){
  const button=document.createElement('button');button.type='button';button.textContent='Preview';anchor.after(button);
  const output=document.createElement('div');output.style.cssText='width:100%;overflow-wrap:anywhere';button.after(output);
  const channel={enabled:false,canvas,output,pending:false,dirty:false};channels.set(kind,channel);
  async function publish(){
   if(channel.pending){channel.dirty=true;return;}channel.pending=true;
   try{do{channel.dirty=false;if(prepare)await prepare();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Không tạo được ảnh Preview.');const response=await fetch('/api/broadcast/'+kind,{method:'POST',headers:{'Content-Type':'image/png'},body:blob});if(!response.ok)throw Error('Không cập nhật được Preview. Hãy kiểm tra đăng nhập.');const result=await response.json();channel.url=new URL(result.url,location.origin).href;}while(channel.dirty);
    output.replaceChildren();const link=document.createElement('a');link.href=channel.url;link.target='_blank';link.rel='noopener';link.textContent=channel.url;output.append('Link OBS/vMix (1920 × 1080): ',link);
   }catch(error){output.textContent=error.message;}finally{channel.pending=false;}
  }
  channel.publish=publish;
  button.onclick=async()=>{button.disabled=true;channel.enabled=true;await publish();button.disabled=false;if(channel.url)window.open(channel.url,'_blank','noopener');};
 },update(kind){const channel=channels.get(kind);if(channel?.enabled)channel.publish();}};
})();
