(function(root){
 'use strict';
 function winner(match){const teams=match?.teams||[],hasBooyah=teams.some(t=>t.booyah!==null&&t.booyah!==undefined&&t.booyah!=='');const winners=teams.filter(t=>hasBooyah?Number(t.booyah)===1:Number(t.match_rank)===1);if(winners.length!==1)throw Error(winners.length?'Trận có nhiều đội được đánh dấu BOOYAH; cần kiểm tra dữ liệu.':'Chưa có đội BOOYAH trong dữ liệu trận này.');return winners[0];}
 const numeric=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))?Number(n):null;
 const stats=p=>[p.kills,p.damage,p.knock_down??p.knockdown,p.assists].map(numeric);
 function matchTime(match){
  const s=match.source||{},info=s.match_info||{};const value=s.match_time??s.start_time??s.match_start_time??s.start_timestamp??s.timestamp??info.match_time??info.start_time;
  if(value===null||value===undefined||value==='')return 'Chưa có thời gian';
  if(typeof value==='string'&&/^\d{1,2}:\d{2}(:\d{2})?$/.test(value))return value;
  const number=Number(value);if(Number.isFinite(number)&&number<946684800)return 'Chưa có thời gian';const date=Number.isFinite(number)?new Date(number<1e12?number*1000:number):new Date(value);
  return Number.isNaN(date.getTime())?'Chưa có thời gian':new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
 }
 const matchLabel=m=>`${m.matchId} · ${matchTime(m)} · Trận ${m.gameNumber}`;
 const api={winner,stats,matchLabel};if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.BooyahTeam=api;
 const host=document.createElement('section');host.className='booyah-team';host.innerHTML='<h2>MVP đội BOOYAH</h2><p>Chọn một trận đã tải ở mục Match ID cho MVP. Hiển thị thông số của bốn tuyển thủ đội thắng trong riêng trận đó.</p><label>Chọn Match ID · thời gian · số trận<select id="booyahMatch"></select></label><div class="booyah-actions"><button id="booyahUpdate" type="button">Cập nhật đội BOOYAH</button><button id="booyahDownload" type="button" disabled>Xuất BOOYAH PNG</button></div><p id="booyahStatus" role="status" aria-live="polite"></p><div id="booyahRoster"></div><canvas id="booyahCanvas" width="1920" height="1080" aria-label="Thông số bốn tuyển thủ đội BOOYAH"></canvas>';
 host.id='booyahTab';host.classList.add('tab-content');document.querySelector('.workspace').appendChild(host);
 const tab=document.createElement('button');tab.type='button';tab.className='tab';tab.dataset.tab='booyah';tab.textContent='MVP đội BOOYAH';document.querySelector('.workspace-tabs').appendChild(tab);
 const editSource=document.createElement('button');editSource.type='button';editSource.textContent='Quản lý ảnh và tên tuyển thủ trong tab MVP';editSource.onclick=()=>document.querySelector('.workspace-tabs [data-tab="mvp"]').click();host.querySelector('h2').after(editSource);
 const matchControls=document.createElement('div');matchControls.innerHTML='<label>Match ID cho đội BOOYAH<input id="booyahIds" placeholder="Nhập Match ID, ngăn cách bằng dấu phẩy"></label><button id="booyahFetch" type="button">Lấy đội BOOYAH</button><p id="booyahFetchStatus" role="status" aria-live="polite"></p>';editSource.before(matchControls);
 host.querySelector(':scope > p').textContent='Nhập Match ID riêng cho đội BOOYAH, rồi chọn trận để xem thông số bốn tuyển thủ đội thắng.';
 let booyahMatches=[],loading=false;
 const q=id=>host.querySelector('#'+id),canvas=q('booyahCanvas'),ctx=canvas.getContext('2d');let revision=0,ready=false,lastSignature='';
 const image=src=>new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Không tải được ảnh BOOYAH.'));img.src=src;});
 const background=image('booyah-team-template.png');background.catch(()=>{});
 const titleFonts=TitleFonts.mount('booyah',host,render,{fallback:'gff-vn-black'});
 const status=text=>{q('booyahStatus').textContent=text;};
 BroadcastPreview.mount('booyah',canvas,q('booyahDownload'));
 function fit(text,x,y,width,size,color,isTitle=false){ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';do{ctx.font=isTitle?titleFonts.font(size--):RankingFonts.font('name',size--,900,{name:'gff-vn-black'});}while(size>9&&ctx.measureText(String(text)).width>width);ctx.fillText(String(text),x,y);}
 async function render(){
  const token=++revision;ready=false;q('booyahDownload').disabled=true;
  const matches=booyahMatches,signature=matches.map(m=>m.matchId+':'+m.gameNumber+':'+matchTime(m)).join('|');
  if(signature!==lastSignature){const previous=q('booyahMatch').value;q('booyahMatch').replaceChildren();matches.forEach((match,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=matchLabel(match);q('booyahMatch').appendChild(option);});if([...q('booyahMatch').options].some(o=>o.value===previous))q('booyahMatch').value=previous;lastSignature=signature;}
  const match=matches[Number(q('booyahMatch').value)];q('booyahRoster').replaceChildren();
  try{
   await titleFonts.load();await RankingFonts.load({name:'gff-vn-black'});const bg=await background;if(token!==revision)return;
   ctx.clearRect(0,0,1920,1080);ctx.drawImage(bg,0,0,1920,1080);
   const positions=[{x:269,y:314,nameY:614,statsX:600,statsY:433},{x:1045,y:314,nameY:614,statsX:1376,statsY:433},{x:269,y:704,nameY:1004,statsX:600,statsY:823},{x:1052,y:704,nameY:1004,statsX:1383,statsY:823}];
   for(const p of positions){ctx.fillStyle='#f267fc';ctx.fillRect(p.x+12,p.nameY-13,205,27);}
   if(!match){status('Chưa có trận. Nhập Match ID và bấm Lấy đội BOOYAH trong tab này.');BroadcastPreview.update('booyah');return;}
   fit(titleFonts.text().trim()||'TRẬN '+match.gameNumber,1289,254,300,38,'#17305c',true);
   let team;try{team=winner(match);}catch(error){status(error.message);BroadcastPreview.update('booyah');return;}
   const players=getPlayersFromTeam(team).slice(0,4);
   const [portraits,logo]=await Promise.all([Promise.all(players.map(p=>{const src=MVP.photoFor(p.player_id);return src?image(src).catch(()=>null):null;})),(async()=>{const src=rankingTeamLogo({name:team.team_name||String(team.team_id||''),key:getTeamKey(team)});return src?image(src).catch(()=>null):null;})()]);
   if(token!==revision)return;
   for(let i=0;i<players.length;i++){
    const p=positions[i],player=players[i],name=MVP.nameFor(player),portrait=portraits[i];
    if(portrait){ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,230,284);ctx.clip();const scale=Math.min(230/portrait.width,284/portrait.height),w=portrait.width*scale,h=portrait.height*scale;ctx.drawImage(portrait,p.x+(230-w)/2,p.y+284-h,w,h);ctx.restore();}else fit('Chưa có ảnh',p.x+115,p.y+130,210,21,'#fff');
    if(logo){const scale=Math.min(46/logo.width,46/logo.height);ctx.drawImage(logo,p.x+3,p.y+3,logo.width*scale,logo.height*scale);}
    fit(name,p.x+115,p.nameY,200,23,'#172c56');
    const values=stats(player);[[p.statsX,p.statsY],[p.statsX+208,p.statsY],[p.statsX,p.statsY+121],[p.statsX+208,p.statsY+121]].forEach(([x,y],j)=>fit(MVP.stat(values[j]),x,y,j%2?176:166,47,'#fff'));
    const row=document.createElement('p');row.textContent=`${name} · ID ${player.player_id??'—'} · ELIMS ${MVP.stat(values[0])} · DAMAGE ${MVP.stat(values[1])} · KNOCKDOWN ${MVP.stat(values[2])} · ASSISTS ${MVP.stat(values[3])}`;q('booyahRoster').appendChild(row);
   }
   status(`${team.team_name||team.team_id||'Đội BOOYAH'} · Trận ${match.gameNumber} · ${players.length} tuyển thủ.`+(portraits.some(p=>!p)?' Có tuyển thủ chưa có ảnh; thêm ảnh theo ID trong tab MVP.':'')+(getPlayersFromTeam(team).length>4?' Chỉ hiển thị 4 tuyển thủ đầu tiên trong đội.':''));
   ready=players.length>0&&!loading;q('booyahDownload').disabled=!ready;BroadcastPreview.update('booyah');
  }catch(error){if(token===revision)status(error.message);}
 }
 api.refresh=render;q('booyahMatch').onchange=render;q('booyahUpdate').onclick=render;
 q('booyahFetch').onclick=async()=>{
  if(loading)return;
  try{
   const ids=parseMatchIds(q('booyahIds').value);validateMatchIds(ids);loading=true;ready=false;q('booyahFetch').disabled=true;q('booyahDownload').disabled=true;
   const batches=splitIntoBatches(ids,8),responses=[];
   for(let i=0;i<batches.length;i++){
    q('booyahFetchStatus').textContent=`Đang tải đội BOOYAH · nhóm ${i+1}/${batches.length}...`;
    const response=await fetch('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match_ids:batches[i]})});const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.error||'Không lấy được dữ liệu trận.');
    if(result.data?.status&&result.data.status!=='success')throw Error(result.data.msg||'Match Stats báo lỗi.');
    responses.push({requestedIds:batches[i],data:result.data});
   }
   booyahMatches=MVP.matchesFromResponses(responses,getTeamGroups);q('booyahFetchStatus').textContent=`Đã tải ${booyahMatches.length} trận cho đội BOOYAH.`;
  }catch(error){q('booyahFetchStatus').textContent=error.message+' Dữ liệu BOOYAH trước đó được giữ nguyên.';}
  finally{loading=false;q('booyahFetch').disabled=false;await render();}
 };
 q('booyahIds').addEventListener('keydown',event=>{if(event.key==='Enter')q('booyahFetch').click();});
 q('booyahDownload').onclick=()=>{if(!ready)return;canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BOOYAH-team-tran-'+(booyahMatches[Number(q('booyahMatch').value)]?.gameNumber||'')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},'image/png');};render();
})(typeof window!=='undefined'?window:globalThis);
