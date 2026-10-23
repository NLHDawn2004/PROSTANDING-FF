(function(root){
 'use strict';
 const numeric=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 const fields=['kills','damage','assists','headshots'];
 function aggregate(matches,playersOf){
  const map=new Map();
  for(const match of matches)for(const team of match.teams){
   const name=String(team.team_name||team.team_id||'UNKNOWN').trim(),key=name.toUpperCase();
   if(!map.has(key))map.set(key,{key,name,games:0,kills:0,damage:0,assists:0,headshots:0});
   const target=map.get(key);target.games++;
   for(const field of fields){
    let n=numeric(team[field]??(field==='kills'?team.killing_score:undefined));
    if(n===null){const players=playersOf(team),values=players.map(p=>numeric(p[field]));if(values.length&&values.every(v=>v!==null))n=values.reduce((a,b)=>a+b,0);}
    target[field]=target[field]===null||n===null?null:target[field]+n;
   }
  }
  return [...map.values()];
 }
 const value=(team,field,mode)=>team[field]===null?null:team[field]/(mode==='average'?team.games:1);
 const share=(a,b)=>a===null||b===null||a+b<=0?.5:a/(a+b);
 const api={aggregate,value,share};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.H2H=api;
 let teams=[],revision=0,ready=false,busy=false;
 const section=document.createElement('section');section.id='h2hTab';section.className='tab-content h2h-panel';
 section.innerHTML='<h2>So sánh đội</h2><div class="h2h-controls"><label>Match ID cho so sánh<input id="h2hIds" placeholder="Nhập Match ID, ngăn cách bằng dấu phẩy"></label><button id="h2hFetch" type="button">Lấy dữ liệu</button><label>Đội bên trái<select id="h2hLeft"></select></label><label>Đội bên phải<select id="h2hRight"></select></label><label>Thông số<select id="h2hMode"><option value="total">Tổng số</option><option value="average">Trung bình mỗi trận (AVG.)</option></select></label><button id="h2hDraw" type="button">Cập nhật</button><button id="h2hExport" type="button" disabled>Xuất PNG</button><button id="h2hReset" type="button">Khôi phục mặc định</button><small>Logo được lấy từ kho logo đội hiện có. Trung bình = tổng chỉ số / số trận đội tham gia. Dấu — nghĩa là thiếu dữ liệu.</small><p id="h2hStatus" role="status" aria-live="polite"></p></div><canvas id="h2hCanvas" width="1920" height="1080" aria-label="Xem trước so sánh hai đội"></canvas>';
 document.querySelector('.workspace').appendChild(section);
 const tab=document.createElement('button');tab.type='button';tab.className='tab';tab.dataset.tab='h2h';tab.textContent='So sánh đội';document.querySelector('.workspace-tabs').appendChild(tab);
 const q=id=>section.querySelector('#'+id),canvas=q('h2hCanvas'),ctx=canvas.getContext('2d');
 BroadcastPreview.mount('h2h',canvas,q('h2hExport'));
 const status=text=>{q('h2hStatus').textContent=text;};
 const image=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Không tải được ảnh nền so sánh.'));img.src=src;});
 const background=image('h2h-template.png');background.catch(()=>{});
 function text(str,x,y,width,size,color){ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';do{ctx.font=`900 ${size--}px Arial`;}while(ctx.measureText(str).width>width&&size>10);ctx.fillText(str,x,y);}
 const format=n=>n===null?'—':String(Math.round(n*100)/100);
 async function render(){
  const token=++revision;ready=false;q('h2hExport').disabled=true;
  try{
   const left=teams.find(t=>t.key===q('h2hLeft').value),right=teams.find(t=>t.key===q('h2hRight').value);
   const selected=left&&right&&left!==right?[left,right]:[];
   const [bg,logos]=await Promise.all([background,Promise.all(selected.map(t=>{const src=rankingTeamLogo(t);return src?image(src).catch(()=>null):null;}))]);
   if(token!==revision)return;
   ctx.clearRect(0,0,1920,1080);ctx.drawImage(bg,0,0,1920,1080);
   if(!selected.length){BroadcastPreview.update('h2h');status(teams.length?'Hãy chọn hai đội khác nhau.':'Nhập Match ID để tải danh sách đội.');return;}
   selected.forEach((team,i)=>{const x=i?1535:392,logo=logos[i];if(logo){const scale=Math.min(355/logo.width,530/logo.height);ctx.drawImage(logo,x-logo.width*scale/2,630-logo.height*scale/2,logo.width*scale,logo.height*scale);}else text('Chưa có logo',x,635,350,30,'#fff');text(team.name,x,958,350,35,'#102650');});
   const mode=q('h2hMode').value;
   fields.forEach((field,i)=>{
    const y=435+i*137,a=value(left,field,mode),b=value(right,field,mode),ratio=share(a,b);
    ctx.fillStyle='#152c79';ctx.fillRect(800,y-53,322,45);
    text((mode==='average'?'AVG. ':'')+['ELIMS','DAMAGE','ASSISTS','HEADSHOT'][i],960,y-30,470,31,'#fff');
    ctx.save();ctx.beginPath();ctx.roundRect(666,y,590,58,6);ctx.clip();ctx.fillStyle='#f063fc';ctx.fillRect(666,y,590*ratio,58);ctx.fillStyle='#58f2fc';ctx.fillRect(666+590*ratio,y,590*(1-ratio),58);ctx.restore();
    text(format(a),775,y+30,200,38,'#102650');text(format(b),1145,y+30,200,38,'#102650');
   });
   BroadcastPreview.update('h2h');
   ready=!busy;q('h2hExport').disabled=!ready;
   status(`${left.name}: ${left.games} trận · ${right.name}: ${right.games} trận.`+(logos.some(l=>!l)?' Thiếu logo: thêm ảnh trong kho logo ở tab Bảng điểm rồi bấm Cập nhật.':''));
  }catch(error){if(token===revision)status(error.message);}
 }
 document.querySelectorAll('.workspace-tabs .tab').forEach(button=>{button.onclick=()=>{
  const name=button.dataset.tab;
  document.querySelectorAll('.workspace-tabs .tab').forEach(item=>item.classList.toggle('active',item===button));
  document.querySelectorAll('.workspace > .tab-content').forEach(item=>item.classList.toggle('active',item.id===name+'Tab'));
  document.body.classList.toggle('mvp-active',name==='mvp'||name==='h2h');
  if(name==='templates')renderTemplates();if(name==='designer')resizeBoard();if(name==='mvp')MVP.refresh();if(name==='h2h')render();
 };});
 q('h2hFetch').onclick=async()=>{
  if(busy)return;
  try{
   const ids=parseMatchIds(q('h2hIds').value);validateMatchIds(ids);busy=true;q('h2hFetch').disabled=true;q('h2hReset').disabled=true;q('h2hExport').disabled=true;
   const responses=[],batches=splitIntoBatches(ids,8);
   for(let i=0;i<batches.length;i++){
    status(`Đang tải nhóm ${i+1}/${batches.length}...`);
    const response=await fetch('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match_ids:batches[i]})}),result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.error||'Không lấy được dữ liệu.');
    if(result.data?.status&&result.data.status!=='success')throw Error(result.data.msg||'Match Stats báo lỗi.');
    responses.push({requestedIds:batches[i],data:result.data});
   }
   teams=aggregate(MVP.matchesFromResponses(responses,getTeamGroups),getPlayersFromTeam);
   for(const id of ['h2hLeft','h2hRight']){q(id).replaceChildren();teams.forEach(team=>{const option=document.createElement('option');option.value=team.key;option.textContent=team.name;q(id).appendChild(option);});}
   if(teams.length>1)q('h2hRight').selectedIndex=1;
   busy=false;await render();
  }catch(error){status(error.message+' Dữ liệu so sánh trước đó được giữ nguyên.');}
  finally{busy=false;q('h2hFetch').disabled=false;q('h2hReset').disabled=false;q('h2hExport').disabled=!ready;}
 };
 for(const id of ['h2hLeft','h2hRight','h2hMode'])q(id).onchange=render;
 q('h2hIds').onkeydown=event=>{if(event.key==='Enter')q('h2hFetch').click();};q('h2hDraw').onclick=render;
 q('h2hExport').onclick=()=>{if(!ready||busy)return;canvas.toBlob(blob=>{if(!blob){status('Không tạo được PNG.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='TEAM-HEAD-TO-HEAD.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},'image/png');};
 q('h2hReset').onclick=()=>{if(busy||!confirm('Xóa Match ID và dữ liệu so sánh, đưa tab này về mặc định?'))return;teams=[];q('h2hIds').value='';q('h2hLeft').replaceChildren();q('h2hRight').replaceChildren();q('h2hMode').value='total';render();};
})(typeof window!=='undefined'?window:globalThis);
