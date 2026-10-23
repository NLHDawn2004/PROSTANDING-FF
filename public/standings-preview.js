(function(){
 const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
 const actions=document.createElement('div');actions.className='standings-preview-actions';actions.style.cssText='padding:16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center';
 const label=document.createElement('span');label.textContent='Phát bảng điểm sang OBS/vMix';actions.appendChild(label);document.querySelector('.ui-stage').appendChild(actions);
 const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Không tải được ảnh bảng điểm.'));img.src=src;});
 BroadcastPreview.mount('standings',canvas,label,async()=>{
  const teams=sortedTeams().slice(0,rankingActiveId==='standing-ffpt'?15:12);
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1920,1080);
  await rankingDrawPNG(ctx,teams,loadImage);
 });
 window.StandingsPreview={refresh(){BroadcastPreview.update('standings');}};
})();
