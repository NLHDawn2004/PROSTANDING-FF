(function(root){
 async function load(text,request,groupsOf,progress=()=>{}){
  const ids=[...new Set(String(text).split(/[\s,;]+/).filter(Boolean))];
  if(!ids.length||ids.some(id=>!/^\d{16,22}$/.test(id)))throw Error('Match ID không hợp lệ. Nhập ID đầy đủ, ngăn cách bằng dấu phẩy.');
  const responses=[],matches=[];
  for(let start=0;start<ids.length;start+=8){
   const batch=ids.slice(start,start+8);progress(start,ids.length);const response=await request(batch,start/8,Math.ceil(ids.length/8)),groups=groupsOf(response.data);
   if(groups.length!==batch.length)throw Error('Thiếu hoặc trùng dữ liệu Match ID. Dữ liệu trước đó được giữ nguyên.');
   const found=groups.map((g,i)=>String(g.match_id||batch[i]));
   if(new Set(found).size!==batch.length||batch.some(id=>!found.includes(id)))throw Error('API trả về Match ID khác yêu cầu.');
   responses.push(response);for(const id of batch){const group=groups[found.indexOf(id)];matches.push({matchId:id,gameNumber:matches.length+1,source:group,teams:Array.isArray(group.team_stats)?group.team_stats:[]});}
  }
  progress(ids.length,ids.length);return {ids,responses,matches};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={load};return;}
 const host=document.querySelector('.control-panel');host.id='survivalSharedInputs';host.classList.add('survival-shared-inputs');
 const heading=document.createElement('h2');heading.textContent='Dữ liệu dùng chung · Sinh tồn';host.prepend(heading);
 document.getElementById('fetchBtn').textContent='Lấy dữ liệu Sinh tồn';
 const assets=document.createElement('div');assets.className='cs-shared-assets';host.append(assets);
 const names=document.getElementById('mvpNamesFile').parentElement.parentElement,photo=document.getElementById('mvpPhotos').parentElement,help=photo.nextElementSibling;
 const photos=document.createElement('div');photos.append(photo,help);assets.append(names,photos);
 const logos=document.createElement('div'),label=document.createElement('label'),picker=document.createElement('input'),logoStatus=document.createElement('p');label.textContent='Logo đội theo tên file';picker.type='file';picker.accept='image/png,image/jpeg,image/webp';picker.multiple=true;label.append(picker);logos.append(label,logoStatus);assets.append(logos);
 picker.onchange=async()=>{const files=[...picker.files];picker.value='';try{await rankingBulkLogoImport(files);logoStatus.textContent=document.getElementById('rankingBulkLogoStatus').textContent;await Promise.all([root.MVP.refresh(),root.BooyahTeam.refresh(),root.H2H.refresh()]);}catch(e){logoStatus.textContent=e.message;}};
 const oldNames=document.getElementById('mvpNamesFile').onchange;document.getElementById('mvpNamesFile').onchange=async()=>{await oldNames();render();};
 const oldClear=document.getElementById('mvpClearNames').onclick;document.getElementById('mvpClearNames').onclick=()=>{oldClear();render();};
 document.getElementById('mvpMatchIds').parentElement.parentElement.hidden=true;
 document.getElementById('booyahIds').parentElement.parentElement.hidden=true;
 document.getElementById('h2hIds').parentElement.hidden=true;document.getElementById('h2hFetch').hidden=true;
 document.querySelector('#mvpTab .mvp-controls > p').textContent='Dùng Match ID chung phía trên. MVP cộng dồn và chọn top 3 người chơi; ảnh và tên dùng chung.';
 document.querySelector('#booyahTab > button').hidden=true;
 document.querySelector('#booyahTab > p').textContent='Chọn một trận từ dữ liệu dùng chung để xem bốn tuyển thủ đội BOOYAH.';
 let busy=false;
 root.SurvivalShared={async load(text){
  if(busy)return;busy=true;const button=document.getElementById('fetchBtn'),input=document.getElementById('matchId');button.disabled=input.disabled=true;
  try{
   const data=await load(text,requestBatch,getTeamGroups,(done,total)=>setStatus('Đang tải dữ liệu dùng chung '+done+'/'+total+' trận...'));
   state.responses=data.responses;state.matchIds=data.ids;state.usageCache={};state.detailGame='overall';state.detailTab='team';rebuildStandings();
   const results=await Promise.allSettled([root.MVP.setMatches(data.matches),root.BooyahTeam.setMatches(data.matches),root.H2H.setMatches(data.matches)]);
   const errors=results.flatMap((r,i)=>r.status==='rejected'?[['MVP','BOOYAH','HEAD TO HEAD'][i]+': '+r.reason.message]:[]);
   setStatus('Đã cập nhật '+data.ids.length+' trận cho Bảng điểm, MVP, BOOYAH và HEAD TO HEAD.'+(errors.length?' '+errors.join(' | '):''),errors.length?'error':'success');
  }catch(e){setStatus(e.message+' Dữ liệu đã tải trước đó được giữ nguyên.','error');}finally{busy=false;button.disabled=input.disabled=false;button.textContent='Lấy dữ liệu Sinh tồn';}
 }};
 root.OverlayProgram.mount({host,id:'br',endpoint:'br-overlay',kinds:['mvp','booyah','h2h'],labels:{mvp:'MVP',booyah:'BOOYAH STATS',h2h:'HEAD TO HEAD'},downloads:['mvpDownload','booyahDownload','h2hExport']});
})(typeof window!=='undefined'?window:globalThis);
