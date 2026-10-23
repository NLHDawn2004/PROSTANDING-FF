(function(root){
 'use strict';
 const normalize=name=>String(name||'').trim().normalize('NFC').toLocaleLowerCase('vi');
 function kind(team,s){if(!s.enabled)return null;if(normalize(s.champion)&&normalize(team.name)===normalize(s.champion))return 'gold';const threshold=Number(s.threshold);return s.threshold!==''&&Number.isFinite(threshold)&&threshold>=0&&Number.isFinite(Number(team.total))&&Number(team.total)>=threshold?'white':null;}
 const api={kind};if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.ChampionRush=api;
 let settings={enabled:false,threshold:70,champion:''};try{const saved=JSON.parse(localStorage.getItem('ff-champion-rush'));if(saved)settings={...settings,...saved};}catch{}
 const src=color=>'cpr-'+color+'.png';
 api.reserve=team=>kind(team,settings)?56:0;
 api.markup=team=>{const color=kind(team,settings);return color?`<img class="cpr-crown" src="${src(color)}" alt="${color==='gold'?'Nhà vô địch':'Đạt mốc Champion Rush'}">`:'';};
 api.drawName=async(ctx,team,name,x,y,width,loadImage,crownWidth=48,crownHeight=30)=>{
  const color=kind(team,settings),reserve=color?crownWidth+8:0;
  let size=Number(ctx.font.match(/([\d.]+)px/)?.[1]||24);
  while(size>10&&ctx.measureText(name).width>width-reserve){size--;ctx.font=ctx.font.replace(/[\d.]+px/,size+'px');}
  ctx.fillText(name,x,y);
  if(color){const img=await loadImage(src(color));ctx.drawImage(img,x+width-crownWidth,y-crownHeight/2,crownWidth,crownHeight);}
 };
 function init(){
  const host=document.querySelector('.ui-settings');if(!host)return;
  const panel=document.createElement('fieldset');panel.className='cpr-settings';
  panel.innerHTML='<legend>Champion Rush</legend><label><input id="cprEnabled" type="checkbox"> Kích hoạt Champion Rush</label><label>Mốc điểm CPR<input id="cprThreshold" type="number" min="0" step="1"></label><label>Nhà vô địch<input id="cprChampion" list="cprTeams" placeholder="Nhập tên đội vô địch"></label><datalist id="cprTeams"></datalist><small>Đạt mốc: vương miện trắng. Nhà vô địch: vương miện vàng. Vương miện hiện sau tên đội.</small><p id="cprStatus" role="status"></p>';
  host.querySelector('.ui-extras')?.before(panel);if(!panel.parentNode)host.appendChild(panel);
  const q=id=>panel.querySelector('#'+id);q('cprEnabled').checked=Boolean(settings.enabled);q('cprThreshold').value=settings.threshold;q('cprChampion').value=settings.champion;
  const update=()=>{const threshold=q('cprThreshold').value;if(threshold===''||!Number.isFinite(Number(threshold))||Number(threshold)<0){q('cprStatus').textContent='Nhập mốc điểm từ 0 trở lên.';return;}settings={enabled:q('cprEnabled').checked,threshold:Number(threshold),champion:q('cprChampion').value.trim()};try{localStorage.setItem('ff-champion-rush',JSON.stringify(settings));q('cprStatus').textContent='';}catch{q('cprStatus').textContent='Thiết lập chỉ được giữ trong phiên hiện tại.';}renderBoard();};
  ['cprEnabled','cprThreshold','cprChampion'].forEach(id=>q(id).addEventListener('input',update));
  q('cprChampion').addEventListener('focus',()=>{q('cprTeams').replaceChildren();sortedTeams().forEach(team=>{const option=document.createElement('option');option.value=team.name;q('cprTeams').appendChild(option);});});
  renderBoard();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);
