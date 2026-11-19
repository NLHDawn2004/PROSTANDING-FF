(function(root){
 'use strict';
 const api=root.ClashSquadSummary,cs=root.ClashSquad,overlay=document.querySelector('#csMvp');
 const mvp=document.createElement('section');mvp.id='csMvpContent';mvp.className='cs-mvp';
 for(const node of [...overlay.children].slice(1))mvp.append(node);
 const nav=document.createElement('nav');nav.className='cs-sections';nav.setAttribute('aria-label','Overlay Tử chiến');
 const mvpTab=document.createElement('button'),summaryTab=document.createElement('button');mvpTab.type=summaryTab.type='button';mvpTab.textContent='MVP';summaryTab.textContent='SUMARY';nav.append(mvpTab,summaryTab);
 const host=document.createElement('section');host.id='csSummary';host.className='cs-mvp';host.hidden=true;overlay.append(nav,mvp,host);
 function tab(summary){host.hidden=!summary;mvp.hidden=summary;mvpTab.setAttribute('aria-pressed',String(!summary));summaryTab.setAttribute('aria-pressed',String(summary));if(summary)render();else root.ClashSquadMVP.refresh();}
 mvpTab.onclick=()=>tab(false);summaryTab.onclick=()=>tab(true);
 host.innerHTML='<h2>SUMARY</h2><p>Dữ liệu nhận từ ô Match ID dùng chung. Chọn cặp đấu để cộng dồn đúng hai đội; mỗi ô bên phải là một trận.</p><form class="cs-fetch"><label>Match ID cho SUMARY<textarea id="cssIds" rows="2" placeholder="Nhập tối đa 3 Match ID, ngăn cách bằng dấu phẩy"></textarea></label><button id="cssFetch" type="submit">Lấy SUMARY</button></form><div class="cs-filters"><label>Cặp đấu<select id="cssGroup"></select></label><label>Kết quả bên phải<select id="cssPage"></select></label><label>Phạm vi bảng thông số<select id="cssScope"></select></label><label>Font chữ<select id="cssFont"></select></label></div><div class="cs-mvp-actions"><button id="cssNames" type="button">Nhập PlayerNameOverwrite</button><button id="cssLogos" type="button">Thêm logo theo tên file</button><button id="cssUpdate" type="button">Cập nhật SUMARY</button><button id="cssDownload" type="button" disabled>Xuất SUMARY PNG</button><button id="cssReset" type="button">Khôi phục SUMARY</button></div><p id="cssStatus" role="status" aria-live="polite"></p><p class="cs-note">Tên và logo dùng chung với MVP. Thông số lấy như Bảng tổng: ELIMS, DEATHS, Cứu đồng đội, K/D, DAMAGE và KNOCKDOWN. Cột KDA hiển thị K/D. Mỗi đội hiển thị tối đa 4 tuyển thủ. Trận hòa hoặc thiếu tỷ số sẽ hiện Chưa xác định.</p><canvas id="cssCanvas" width="1920" height="1080" aria-label="Match Summary Tử chiến"></canvas>';
 const q=id=>host.querySelector('#'+id),canvas=q('cssCanvas'),ctx=canvas.getContext('2d');let matches=[],busy=false,ready=false,revision=0;
 const image=src=>new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(Error('Không tải được ảnh.')),8000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(Error('Không tải được ảnh.'));};img.src=src;});
 const frame=image('cs-summary-template.png');frame.catch(()=>{});
 for(const face of RankingFonts.entries)q('cssFont').append(new Option(face.label,face.id));q('cssFont').value='gff-vn-black';
 function controls(){for(const id of ['cssIds','cssFetch','cssScope','cssGroup','cssPage','cssFont','cssUpdate','cssReset','cssNames','cssLogos'])q(id).disabled=busy;q('cssDownload').disabled=busy||!ready;host.querySelectorAll('.preview-controls button').forEach(b=>b.disabled=busy||!ready);}
 const status=text=>{q('cssStatus').textContent=text;};
 async function render(){
  const token=++revision;ready=false;controls();
  try{
   const group=api.groups(matches).find(g=>g.key===q('cssGroup').value),selected=(group?.matches||[]).filter(m=>!q('cssScope').value||m.id===q('cssScope').value),model=api.build(selected,root.ClashSquadMVP.nameMap()),games=api.pageGames(model.games,q('cssPage').value);
   const fonts={name:q('cssFont').value};try{await RankingFonts.load(fonts);}catch{fonts.name='';}
   const logos=await Promise.all(games.map(async g=>{if(!g.winner)return null;const team=model.teams.find(t=>t.team_name===g.winner.team_name)||g.winner;const src=await root.ClashSquadMVP.logoFor(team);return src?image(src).catch(()=>null):null;}));
   const bg=await frame;if(token!==revision)return;
   ctx.clearRect(0,0,1920,1080);ctx.drawImage(bg,0,0,1920,1080);
   function text(value,x,y,width,size,color='#000',align='center'){value=String(value??'—');ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';do{ctx.font=RankingFonts.font('name',size--,800,fonts);}while(ctx.measureText(value).width>width&&size>10);ctx.fillText(value,x,y);}
   const xs=[448,580,717,840,974,1154];
   for(let t=0;t<2;t++){
    const team=model.teams[t],ys=t?[786,855,924,992]:[395,464,533,602];
    for(let i=0;i<4;i++){const p=team?.players[i];if(!p)continue;const y=ys[i];text(p.name,155,y,235,31,'#000','left');const values=[api.stat(p.kills),api.stat(p.death),api.stat(p.assists),api.stat(p.kda),api.stat(p.damage),api.stat(p.knock_down)];values.forEach((value,c)=>text(value,xs[c],y,c===4?180:120,31));}
   }
   for(let i=0;i<3;i++){
    const game=games[i],y=257+i*262;if(!game)continue;
    if(logos[i]){const logo=logos[i],scale=Math.min(450/logo.width,164/logo.height),w=logo.width*scale,h=logo.height*scale;ctx.drawImage(logo,1565-w/2,y+100-h/2,w,h);}
    text('TRẬN '+(Number(q('cssPage').value||0)*3+i+1)+' · '+game.id,1565,y+20,470,20,'#fff');
    text(game.winner?.team_name||'Chưa xác định',1680,y+208,268,36,'#fff');
    text(game.scores.map(api.stat).join(' : '),1418,y+208,180,32,'#fff');
   }
   ready=selected.length>0;controls();status(selected.length?'Đã cập nhật '+selected.length+' trận · '+model.teams.map(t=>t.team_name).join(' — ')+(games.some((g,i)=>g.winner&&!logos[i])?' · Một số đội chưa có logo.':''):'Nhập Match ID để bắt đầu.');BroadcastPreview.update('cs-summary');
  }catch(error){if(token===revision){status(error.message);controls();}}
 }
 function pages(){const group=api.groups(matches).find(g=>g.key===q('cssGroup').value),count=q('cssScope').value?1:(group?.matches.length||0);q('cssPage').replaceChildren();for(let i=0;i<Math.ceil(count/3);i++)q('cssPage').append(new Option('Trận '+(i*3+1)+'–'+Math.min(count,i*3+3),String(i)));}
 function scopes(){const group=api.groups(matches).find(g=>g.key===q('cssGroup').value);q('cssScope').replaceChildren(new Option('Cộng dồn cặp đấu đã chọn',''));for(const match of group?.matches||[])q('cssScope').append(new Option(match.id,match.id));pages();}
 api.setMatches=async next=>{matches=next;q('cssIds').value=next.map(m=>m.id).join(', ');q('cssGroup').replaceChildren();for(const group of api.groups(matches))q('cssGroup').append(new Option(group.label+' · '+group.matches.length+' trận',group.key));scopes();busy=false;await render();if(!ready)throw Error(q('cssStatus').textContent);};
 api.refresh=render;BroadcastPreview.mount('cs-summary',canvas,q('cssDownload'),async()=>{if(busy)throw Error('Đang cập nhật SUMARY.');});
 q('cssNames').onclick=()=>document.querySelector('#csmNames').click();q('cssLogos').onclick=()=>document.querySelector('#csmLogos').click();
 q('cssGroup').onchange=()=>{scopes();render();};q('cssScope').onchange=()=>{pages();render();};q('cssPage').onchange=q('cssFont').onchange=q('cssUpdate').onclick=render;
 q('cssDownload').onclick=()=>{if(!ready||busy)return;canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SUMARY-tu-chien.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},'image/png');};
 q('cssReset').onclick=()=>{matches=[];q('cssGroup').replaceChildren();q('cssPage').replaceChildren();q('cssIds').value='';q('cssScope').replaceChildren();q('cssFont').value='gff-vn-black';render();};
 const common=document.createElement('form');common.className='cs-fetch';common.innerHTML='<label>Match ID dùng chung · MVP và SUMARY<textarea id="overlayMatchIds" rows="2" placeholder="Nhập các Match ID, ngăn cách bằng dấu phẩy"></textarea></label><button type="submit">Lấy dữ liệu cho MVP và SUMARY</button>';
 const commonStatus=document.createElement('p');commonStatus.setAttribute('role','status');commonStatus.setAttribute('aria-live','polite');commonStatus.textContent='Nhập Match ID ở đây để cập nhật cả hai tab.';nav.before(common,commonStatus);
 mvp.querySelector('form').hidden=true;host.querySelector('form').hidden=true;
 mvp.querySelector('h2 + p').textContent='MVP nhận dữ liệu từ ô Match ID dùng chung phía trên. Tự chọn người đầu bảng Player; bạn có thể đổi người.';
 let loading=false;
 common.onsubmit=async event=>{event.preventDefault();if(loading)return;loading=true;common.querySelector('button').disabled=true;common.querySelector('textarea').disabled=true;
  try{
   const next=await root.ClashOverlayData.load(common.querySelector('textarea').value,fetch,(loaded,total)=>{commonStatus.textContent='Đang tải dữ liệu '+loaded+'/'+total+' trận...';});
   const results=[];for(const apply of [()=>root.ClashSquadMVP.setMatches(next),()=>api.setMatches(next)]){try{await apply();results.push({status:'fulfilled'});}catch(reason){results.push({status:'rejected',reason});}}
   const errors=results.flatMap((r,i)=>r.status==='rejected'?[(i?'SUMARY':'MVP')+': '+r.reason.message]:[]);
   commonStatus.textContent='Đã tải '+next.length+' trận · '+api.groups(next).length+' cặp đấu. '+(errors.length?errors.join(' | '):'Đã cập nhật ảnh MVP và SUMARY.');
  }catch(error){commonStatus.textContent=error.message;}finally{loading=false;common.querySelector('button').disabled=false;common.querySelector('textarea').disabled=false;}
 };
 tab(false);render();
})(window);
