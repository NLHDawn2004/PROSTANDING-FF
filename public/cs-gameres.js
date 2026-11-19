(function(root){
 'use strict';
 const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 const decimal=v=>num(v)===null?'—':String(Math.round(Number(v)*100)/100);
 function model(match,names=new Map()){
  if(!match||match.teams?.length!==2)throw Error('GAMERES cần một trận Tử chiến có hai đội.');
  return {id:match.id,teams:match.teams.map(t=>({...t,score:num(t.wins)??num((match.info?.match_results||[]).find(r=>r.team_name===t.team_name)?.score),players:(t.player_data||[]).map(p=>{
   const kills=num(p.kills),death=num(p.death);return {...p,name:names.get(String(p.player_id))||p.player_name||'—',kills,death,damage:num(p.damage),assists:num(p.rescue_members),kda:num(p.kd)??(kills===null||death===null?null:Math.round(kills/(death||1)*100)/100),hs:p.headshot_kill_rate??null};
  }).sort((a,b)=>(b.kills||0)-(a.kills||0)||(b.damage||0)-(a.damage||0))}))};
 }
 const mvp=(team,id='')=>team.players.find(p=>String(p.player_id)===String(id))||team.players[0]||null;
 const api={model,mvp,decimal};if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.ClashGameRes=api;
 const host=document.createElement('section');host.id='csGameRes';host.className='cs-mvp';host.hidden=true;
 host.innerHTML='<h2>GAMERES · Thông số từng trận</h2><p>Dữ liệu nhận từ khu vực dùng chung. Chọn một Match ID để xem riêng trận đó.</p><div class="cs-filters"><label>Match ID<select id="grMatch"></select></label><label>Số trận hiển thị<input id="grNumber" type="number" min="1" max="999" value="1"></label><label>MVP đội bên trái<select id="grLeft"></select></label><label>MVP đội bên phải<select id="grRight"></select></label><label>Font chữ<select id="grFont"></select></label></div><div class="cs-mvp-actions"><button id="grUpdate" type="button">Cập nhật GAMERES</button><button id="grDownload" type="button" disabled>Xuất GAMERES PNG</button></div><p id="grStatus" role="status" aria-live="polite"></p><small>ASSISTS = Cứu đồng đội. KDA hiển thị K/D dùng dấu chấm. Tên, logo và ảnh theo ID dùng chung. Bốn tuyển thủ mỗi đội; thông số không được cộng dồn giữa các trận.</small><canvas id="grCanvas" width="1920" height="1080" aria-label="GAMERES từng trận"></canvas>';
 const q=id=>host.querySelector('#'+id),canvas=q('grCanvas'),ctx=canvas.getContext('2d');let matches=[],revision=0,ready=false;
 const image=src=>new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(Error('Không tải được ảnh.')),8000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(Error('Không tải được ảnh.'));};img.src=src;});
 const frame=image('cs-gameres-template.png');frame.catch(()=>{});
 for(const face of RankingFonts.entries)q('grFont').append(new Option(face.label,face.id));q('grFont').value='gff-vn-black';
 function controls(){q('grDownload').disabled=!ready;host.querySelectorAll('.preview-controls button').forEach(b=>b.disabled=!ready);}
 function playerOptions(){const match=matches.find(m=>m.id===q('grMatch').value),result=match?model(match,ClashSquadMVP.nameMap()):null;for(let i=0;i<2;i++){const input=q(i?'grRight':'grLeft'),previous=input.value;input.replaceChildren(new Option('Tự chọn người đứng đầu đội',''));for(const p of result?.teams[i].players||[])input.append(new Option(p.name+' · ID '+p.player_id,String(p.player_id)));if([...input.options].some(o=>o.value===previous))input.value=previous;}}
 async function render(){
  const token=++revision;ready=false;controls();
  try{
   const match=matches.find(m=>m.id===q('grMatch').value),data=match?model(match,ClashSquadMVP.nameMap()):null,fonts={name:q('grFont').value};try{await RankingFonts.load(fonts);}catch{fonts.name='';}
   const players=data?data.teams.map((team,i)=>mvp(team,q(i?'grRight':'grLeft').value)):[];
   const safe=async src=>src?image(src).catch(()=>null):null;
   const [bg,logos,portraits]=await Promise.all([frame,Promise.all((data?.teams||[]).map(async t=>safe(await ClashSquadMVP.logoFor(t)))),Promise.all(players.map(p=>safe(p?ClashSquadMVP.photoFor(p.player_id):null)))]);
   if(token!==revision)return;ctx.clearRect(0,0,1920,1080);ctx.drawImage(bg,0,0,1920,1080);
   function text(value,x,y,width,size,color='#000',align='center'){value=String(value??'—');ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';do{ctx.font=RankingFonts.font('name',size--,800,fonts);}while(ctx.measureText(value).width>width&&size>10);const m=ctx.measureText(value);ctx.fillText(value,x,y+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);}
   const fit=(img,x,y,w,h)=>{if(!img)return;const scale=Math.min(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);};
   ctx.clearRect(850,78,205,88);text('TRẬN '+(q('grNumber').value||'1'),960,126,260,70,'#f4111a');
   for(let side=0;side<2;side++){
    const team=data?.teams[side],p=players[side],name=team?(ClashSquadSummary.teamName?.(team.team_name)||team.team_name):'—';
    fit(logos[side],side?1682:110,78,128,100);text(name,side?1510:440,130,330,54,'#fff');text(team?decimal(team.score):'—',side?1183:737,131,100,86,'#effb58');
    const portrait=portraits[side];if(portrait){const w=300,h=274,scale=Math.min(w/portrait.width,h/portrait.height),dw=portrait.width*scale,dh=portrait.height*scale;ctx.drawImage(portrait,(side?1680:310)-dw/2,470-dh,dw,dh);}
    const x=side?1180:744;for(const [value,y] of [[p?decimal(p.kills):'—',283],[p?decimal(p.damage):'—',355],[p?decimal(p.assists):'—',427],[p?decimal(p.kda):'—',499]])text(value,x,y,142,42,'#fff',side?'left':'right');
    text(p?.name||'—',side?1646:275,512,355,38,'#fff');
    text(name,side?1710:204,649,180,58,'#116175');
    const labels=side?['HEADSHOT','KDA','ASSISTS','DMG','ELIMS']:['ELIMS','DMG','ASSISTS','KDA','HEADSHOT'],xs=side?[1068,1198,1310,1430,1534]:[385,490,607,721,855];
    labels.forEach((label,j)=>text(label,xs[j],647,label==='HEADSHOT'?165:110,27));
    for(let i=0;i<4;i++){const row=team?.players[i];if(!row)continue;const y=749+i*73;const values=side?[row.hs??'—',decimal(row.kda),decimal(row.assists),decimal(row.damage),decimal(row.kills)]:[decimal(row.kills),decimal(row.damage),decimal(row.assists),decimal(row.kda),row.hs??'—'];text(row.name,side?1694:232,y,218,31);values.forEach((v,j)=>text(v,xs[j],y,labels[j]==='HEADSHOT'?165:110,31));}
   }
   ready=Boolean(data);controls();q('grStatus').textContent=data?'Đã cập nhật riêng Match '+data.id+' · '+data.teams.map(t=>t.team_name).join(' — ')+(portraits.some(p=>!p)?' · Có tuyển thủ MVP chưa có ảnh theo ID.':''):'Nhập Match ID ở khu vực dữ liệu dùng chung để bắt đầu.';BroadcastPreview.update('cs-gameres');
  }catch(error){if(token===revision){q('grStatus').textContent=error.message;controls();}}
 }
 api.setMatches=async next=>{matches=next;const old=q('grMatch').value;q('grMatch').replaceChildren();for(let i=0;i<matches.length;i++)q('grMatch').append(new Option('Trận '+(i+1)+' · '+matches[i].id,matches[i].id));if(matches.some(m=>m.id===old))q('grMatch').value=old;q('grNumber').value=String(Math.max(1,matches.findIndex(m=>m.id===q('grMatch').value)+1));playerOptions();await render();if(!ready)throw Error(q('grStatus').textContent);};
 api.refresh=()=>{playerOptions();return render();};
 q('grMatch').onchange=()=>{q('grNumber').value=String(matches.findIndex(m=>m.id===q('grMatch').value)+1);q('grLeft').value=q('grRight').value='';playerOptions();render();};q('grLeft').onchange=q('grRight').onchange=q('grNumber').oninput=q('grFont').onchange=q('grUpdate').onclick=render;
 q('grDownload').onclick=()=>{if(!ready)return;canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='GAMERES-'+q('grMatch').value+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},'image/png');};
 BroadcastPreview.mount('cs-gameres',canvas,q('grDownload'));
 ClashSquadSummary.registerTab('gameres','GAMERES',host,api.refresh);render();
})(typeof window!=='undefined'?window:globalThis);
