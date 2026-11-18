(function(root){
 'use strict';
 function ids(text){const list=[...new Set(String(text).split(/[\s,;]+/).filter(Boolean))];if(!list.length||list.some(id=>!/^\d{10,25}$/.test(id)))throw Error('Nhập Match ID gồm 10–25 chữ số, cách nhau bằng dấu phẩy.');return list;}
 const columns=rows=>[...new Set(rows.flatMap(row=>Object.keys(row||{})))];
 const display=value=>value===null||value===undefined||value===''?'—':typeof value==='object'?JSON.stringify(value):String(value);
 function extract(data,id){
  const info=(data?.match_info||[]).find(m=>String(m.match_id)===id)||data?.match_info?.[0]||{};
  if(Number(info.mode)===1)throw Error('Match '+id+' là Sinh tồn. Hãy mở chế độ Sinh tồn.');
  const group=(data?.team_stats||[]).find(g=>String(g.match_id)===id)||data?.team_stats?.[0];
  if(!Array.isArray(group?.team_stats)||!group.team_stats.length)throw Error('Match '+id+' chưa có dữ liệu đội.');
  const teams=group.team_stats,players=teams.flatMap(t=>(Array.isArray(t.player_data)?t.player_data:[]).map(p=>({...p,team_name:p.team_name||t.team_name})));
  return {id,info,teams,players};
 }
 async function request(endpoint,matchId,fetcher){
  const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match_ids:[matchId]})});
  let result;try{result=await response.json();}catch{throw Error('Máy chủ không trả JSON. Hãy kiểm tra đăng nhập.');}
  if(!response.ok||!result.ok)throw Error(result.error||'HTTP '+response.status);
  if(result.data?.status&&result.data.status!=='success')throw Error(result.data.msg||'Match Stats chưa có dữ liệu.');
  return result.data;
 }
 async function loadMatch(id,fetcher=fetch){
  const raw=await request('/api/match',id,fetcher),match=extract(raw.data,id);
  const results=await Promise.allSettled([request('/api/match-skills',id,fetcher),request('/api/match-weapons',id,fetcher)]);
  return {...match,raw,skills:results[0].status==='fulfilled'?results[0].value:null,weapons:results[1].status==='fulfilled'?results[1].value:null,errors:results.flatMap((r,i)=>r.status==='rejected'?[(i?'Vũ khí':'Kỹ năng')+': '+r.reason.message]:[])};
 }
 const counterFields=['kills','death','damage','knock_down','rescue_members','wins','losses','assists','headshots'];
 const numberOrNull=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 function sum(rows,key){const values=rows.map(r=>numberOrNull(r[key]));return values.length&&values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null;}
 function nested(rows,field){const groups=new Map();for(const row of rows)for(const item of row[field]||[]){const key=String(item.weapon_id??item.skill_id??'')+'|'+String(item.weapon??item.skill??item.name??'');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}return [...groups.values()].map(items=>{const result={...items[0]};for(const key of columns(items)){if(['kills','damage','headshots','shoots','hits','time','rounds','pick_times','ban_times'].includes(key))result[key]=sum(items,key);else if(/rate|accuracy|percent/i.test(key)&&items.length>1)result[key]=null;}return result;});}
 function aggregate(matches,teamName=''){
  const teamGroups=new Map(),playerGroups=new Map(),seen=new Set();
  for(const match of matches){if(seen.has(match.id))continue;seen.add(match.id);for(const team of match.teams){if(teamName&&String(team.team_name)!==teamName)continue;
   const key=String(team.team_name||team.team_id||'').trim().toUpperCase(),players=team.player_data||[];
   const enriched={...team};for(const field of ['death','knock_down','rescue_members','assists','headshots'])if(numberOrNull(enriched[field])===null)enriched[field]=sum(players,field);
   if(!teamGroups.has(key))teamGroups.set(key,[]);teamGroups.get(key).push(enriched);
   for(const player of players){const id=String(player.player_id??'').trim(),playerKey=id&&id!=='0'&&id!=='-1'?'ID:'+id:'NAME:'+key+'|'+String(player.player_name);if(!playerGroups.has(playerKey))playerGroups.set(playerKey,[]);playerGroups.get(playerKey).push({...player,team_name:player.team_name||team.team_name});}
  }}
  function totals(rows,isTeam){const last=rows[rows.length-1],result=isTeam?{team_name:last.team_name,games:rows.length}:{player_id:last.player_id,player_name:last.player_name,team_name:[...new Set(rows.map(r=>r.team_name))].join(' / '),games:rows.length};
   if(isTeam){const known=rows.every(r=>numberOrNull(r.wins)!==null&&numberOrNull(r.losses)!==null);result.games_won=known?rows.filter(r=>Number(r.wins)>Number(r.losses)).length:null;result.games_lost=known?rows.filter(r=>Number(r.wins)<Number(r.losses)).length:null;result.games_drawn=known?rows.filter(r=>Number(r.wins)===Number(r.losses)).length:null;result.win_rate=known?Math.round(result.games_won/rows.length*10000)/100+'%':null;}
   for(const field of counterFields)if(isTeam||!['wins','losses'].includes(field))result[field]=sum(rows,field);
   if(isTeam)result.round_difference=result.wins===null||result.losses===null?null:result.wins-result.losses;
   result.kd=result.kills===null||result.death===null?null:Math.round(result.kills/(result.death||1)*100)/100;
   result.headshot_kill_rate=rows.length===1?last.headshot_kill_rate??null:null;
   for(const field of ['weapon','active_skills','passive_skills','pet_skills','loadout_skills'])result[field]=nested(rows,field);
   return result;
  }
  const teams=[...teamGroups.values()].map(rows=>totals(rows,true)).sort((a,b)=>(b.games_won||0)-(a.games_won||0)||(b.round_difference||0)-(a.round_difference||0)||(b.kills||0)-(a.kills||0)||(b.damage||0)-(a.damage||0));
  const players=[...playerGroups.values()].map(rows=>totals(rows,false)).sort((a,b)=>(b.kills||0)-(a.kills||0)||(b.damage||0)-(a.damage||0)||(a.death||0)-(b.death||0));
  return {teams:teams.map((row,i)=>({match_rank:i+1,...row})),players:players.map((row,i)=>({match_rank:i+1,...row}))};
 }
 function perGame(rows){return rows.map(row=>{const result={...row};for(const key of counterFields)if(key in result)result[key]=result[key]===null?null:Math.round(result[key]/row.games*100)/100;return result;});}
 function aggregateWeapons(matches){
  const seen=new Set(),rows=[];
  for(const match of matches){
   if(seen.has(match.id))continue;seen.add(match.id);
   for(const team of match.teams){
    if(Array.isArray(team.weapon)&&team.weapon.length)rows.push(team);
    else rows.push(...(team.player_data||[]));
   }
  }
  return nested(rows,'weapon').sort((a,b)=>(b.kills||0)-(a.kills||0)||(b.damage||0)-(a.damage||0));
 }
 const api={ids,columns,display,extract,loadMatch,aggregate,aggregateWeapons,perGame};if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.ClashSquad=api;
 const labels={games:'Số trận',games_won:'Trận thắng',games_lost:'Trận thua',games_drawn:'Trận hòa',win_rate:'Tỷ lệ thắng',round_difference:'Hiệu số vòng',match_id:'Match ID',mode:'Mã chế độ',form:'Hình thức (form)',match_name:'Tên trận',number_of_team:'Số đội',number_of_player:'Số tuyển thủ',match_results:'Kết quả',match_rank:'Thứ hạng',team_id:'ID đội',team_name:'Đội',match_ids:'Các trận',player_id:'ID tuyển thủ',player_name:'Tuyển thủ',kills:'ELIMS',death:'DEATHS',kd:'K/D',damage:'DAMAGE',knock_down:'KNOCKDOWN',headshot_kill_rate:'Tỷ lệ hạ gục headshot',rescue_members:'Cứu đồng đội',w_l:'Tỷ số thắng–thua',wins:'Vòng thắng',losses:'Vòng thua',weapon:'Vũ khí',weapon_id:'ID vũ khí',active_skills:'Kỹ năng chủ động',passive_skills:'Kỹ năng bị động',pet_skills:'Kỹ năng thú cưng',loadout_skills:'Loadout',player_data:'Chi tiết tuyển thủ',teammate_list:'Danh sách ID tuyển thủ',pos_change:'Thay đổi vị trí',skill:'Kỹ năng',time:'time (API)',rounds:'rounds (API)',info:'Thông tin',score:'Điểm',pick_times:'Lượt chọn (API)',pick_rate:'Tỷ lệ chọn (API)',ban_times:'Lượt cấm (API)',ban_rate:'Tỷ lệ cấm (API)'};
 const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 const panel=el('section',undefined,'cs-panel');panel.id='clashSquad';panel.hidden=true;
 panel.innerHTML='<h1>Tử chiến · Match Stats</h1><p>Thông số trận, đội, tuyển thủ, vũ khí và kỹ năng. Dữ liệu Tử chiến độc lập với các công cụ Sinh tồn.</p><form class="cs-fetch"><label>Match ID Tử chiến<textarea id="csIds" rows="2" placeholder="2121570587261974528"></textarea></label><button id="csFetch" type="submit">Lấy dữ liệu Tử chiến</button><button id="csExport" type="button" disabled>Tải toàn bộ JSON</button></form><p id="csStatus" role="status" aria-live="polite">Nhập Match ID để bắt đầu.</p><div class="cs-filters"><label>Trận<select id="csMatch"></select></label><label>Đội<select id="csTeam"></select></label><label>Tìm tuyển thủ / ID<input id="csSearch" placeholder="Tên hoặc ID tuyển thủ"></label></div><div id="csScore"></div><nav id="csSections" class="cs-sections" aria-label="Thống kê Tử chiến"></nav><div id="csContent"></div>';
 document.querySelector('.app-shell').appendChild(panel);
 const mode=el('div',undefined,'game-mode-switch');mode.setAttribute('role','group');mode.setAttribute('aria-label','Chọn chế độ');
 const survival=el('button','Sinh tồn'),clash=el('button','Tử chiến');survival.type=clash.type='button';mode.append(survival,clash);document.querySelector('.workspace-tabs').before(mode);
 function setMode(isClash){document.body.classList.toggle('clash-active',isClash);panel.hidden=!isClash;survival.setAttribute('aria-pressed',String(!isClash));clash.setAttribute('aria-pressed',String(isClash));if(!isClash&&typeof resizeBoard==='function')resizeBoard();}
 survival.onclick=()=>setMode(false);clash.onclick=()=>setMode(true);setMode(false);
 const q=id=>panel.querySelector('#'+id);let matches=[],active='overview',busy=false;
 const views=[['overview','Bảng tổng'],['teams','Đội tuyển'],['players','Người chơi'],['weapons','Vũ khí'],['skills','Kỹ năng trang bị'],['total','Tổng số'],['average','Trung bình'],['raw','Dữ liệu đầy đủ']];
 for(const [id,title] of views){const button=el('button',title);button.type='button';button.dataset.view=id;button.onclick=()=>{active=id;render();};q('csSections').appendChild(button);}
 function cell(value){
  const td=el('td');if(value&&typeof value==='object'){const details=el('details'),summary=el('summary',Array.isArray(value)?value.length+' mục':'Xem chi tiết');details.append(summary);if(Array.isArray(value)&&value.every(v=>v&&typeof v==='object'&&!Array.isArray(v)))details.append(table(value));else details.append(el('pre',JSON.stringify(value,null,2)));td.append(details);}else td.textContent=display(value);return td;
 }
 function table(rows){if(!Array.isArray(rows))return el('pre',JSON.stringify(rows,null,2));if(!rows.length)return el('p','API không cung cấp dữ liệu cho mục này.','cs-empty');if(!rows.every(v=>v&&typeof v==='object'))return el('pre',JSON.stringify(rows,null,2));const wrapper=el('div',undefined,'cs-table-scroll'),t=el('table'),head=el('thead'),tr=el('tr'),keys=columns(rows);for(const key of keys){const th=el('th',labels[key]||key);th.title=key;tr.append(th);}head.append(tr);t.append(head);const body=el('tbody');for(const row of rows){const tr=el('tr');for(const key of keys)tr.append(cell(row[key]));body.append(tr);}t.append(body);wrapper.append(t);return wrapper;}
 function block(host,title,data){const section=el('section',undefined,'cs-block');section.append(el('h3',title),table(data));host.append(section);}
 function filteredTeams(match){return match.teams.filter(t=>!q('csTeam').value||String(t.team_name)===q('csTeam').value);}
 function renderCombined(selected,content){
  const totals=aggregate(selected,q('csTeam').value),search=q('csSearch').value.toLocaleLowerCase();
  const players=totals.players.filter(p=>!search||String(p.player_name).toLocaleLowerCase().includes(search)||String(p.player_id).includes(search));
  const card=el('section',undefined,'cs-score');card.append(el('strong','Tổng cộng '+selected.length+' trận'),el('p',totals.teams.length+' đội · '+totals.players.length+' tuyển thủ'));q('csScore').append(card);
  content.append(el('p','Cộng dồn theo đội và ID tuyển thủ. K/D = tổng ELIMS / tổng DEATHS (DEATHS = 0 dùng ELIMS). Tỷ lệ thắng tính từ số trận thắng. Tỷ lệ headshot thiếu số đếm gốc hiển thị —; xem tỷ lệ từng trận bằng bộ lọc Trận.','cs-note'));
  if(['overview','teams','total','average'].includes(active))block(content,active==='average'?'Thông số đội trung bình mỗi trận':'Bảng xếp hạng đội cộng dồn',active==='average'?perGame(totals.teams):totals.teams);
  if(['overview','players','total','average'].includes(active))block(content,active==='average'?'Thông số tuyển thủ trung bình mỗi trận':'Bảng xếp hạng tuyển thủ cộng dồn',active==='average'?perGame(players):players);
  if(active==='weapons'||active==='skills'){
   if(active==='skills')content.append(el('p','Kỹ năng trang bị được gộp theo tên và loại. Trường time được cộng theo giá trị API, không diễn giải thành thời lượng hay lượt Pick. Chưa có dữ liệu Ban/Pick.','cs-note'));
   const fields=active==='weapons'?['weapon']:['active_skills','passive_skills','pet_skills','loadout_skills'];
   for(const team of totals.teams)for(const field of fields)if(team[field].length)block(content,team.team_name+' · '+labels[field]+' cộng dồn',team[field]);
   for(const player of players)for(const field of fields)if(player[field].length)block(content,player.player_name+' · '+labels[field]+' cộng dồn',player[field]);
   content.append(el('p','Các dòng vũ khí có hậu tố -SUM là nhóm tổng do API cung cấp; không cộng nhóm tổng với các biến thể.','cs-note'));
   for(const match of selected)for(const error of match.errors)content.append(el('p',match.id+': '+error,'cs-note'));
  }
 }
 function render(){
  q('csSections').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===active)));
  const selected=matches.filter(m=>!q('csMatch').value||m.id===q('csMatch').value),content=q('csContent');content.replaceChildren();q('csScore').replaceChildren();
  q('csTeam').disabled=q('csSearch').disabled=active==='weapons';
  if(active==='weapons'&&selected.length){
   const card=el('section',undefined,'cs-score');card.append(el('strong','Tổng cộng '+selected.length+' trận'));q('csScore').append(card);
   content.append(el('p','Cộng dồn vũ khí của tất cả đội trong các trận đã chọn. Mỗi loại vũ khí hiển thị một dòng.','cs-note'));
   block(content,'Vũ khí cộng dồn',aggregateWeapons(selected));
   content.append(el('p','Các dòng có hậu tố -SUM là nhóm tổng do API cung cấp, được giữ riêng với các biến thể để tránh cộng trùng.','cs-note'));
   for(const match of selected)for(const error of match.errors)content.append(el('p',match.id+': '+error,'cs-note'));
   return;
  }
  if(selected.length&&!q('csMatch').value&&active!=='raw'){renderCombined(selected,content);return;}
  for(const match of selected){
   const score=el('section',undefined,'cs-score');score.append(el('strong','Match '+match.id));const results=match.info.match_results||[];score.append(el('p',results.map(t=>`${t.team_name}: ${display(t.score)}`).join('   —   ')||'Chưa có tỷ số.'));q('csScore').append(score);
   const host=el('section',undefined,'cs-match-section');host.append(el('h2','Match '+match.id));content.append(host);const teams=filteredTeams(match);
   const summary=()=>{const details=el('details');details.append(el('summary','Thông tin trận và mọi trường API'),el('pre',JSON.stringify(match.info,null,2)));host.append(details);};
   if(active==='overview'){block(host,'Thông tin trận',[match.info]);block(host,'Kết quả hai đội',teams.map(t=>({team_name:t.team_name,w_l:t.w_l,wins:t.wins,losses:t.losses,kills:t.kills,damage:t.damage,headshot_kill_rate:t.headshot_kill_rate,rescue_members:t.rescue_members})));}
   if(active==='teams')block(host,'Tất cả thông số đội',teams);
   if(active==='players'){const search=q('csSearch').value.toLocaleLowerCase();block(host,'Tất cả thông số tuyển thủ',match.players.filter(p=>(!q('csTeam').value||p.team_name===q('csTeam').value)&&(!search||String(p.player_name).toLocaleLowerCase().includes(search)||String(p.player_id).includes(search))));}
   if(active==='weapons'||active==='skills'){
    if(active==='skills')host.append(el('p','Đây là kỹ năng trang bị/thống kê kỹ năng từ API. Chưa có dữ liệu Ban hoặc thứ tự Ban/Pick. time là tên trường gốc; không mặc định hiểu là thời lượng hay số lượt chọn.','cs-note'));
    for(const team of teams){const fields=active==='weapons'?['weapon']:['active_skills','passive_skills','pet_skills','loadout_skills'];for(const field of fields)if(team[field]!==undefined)block(host,team.team_name+' · '+labels[field],team[field]);for(const player of team.player_data||[]){for(const field of fields)if(player[field]!==undefined)block(host,player.player_name+' · '+labels[field],player[field]);}}
    if(!q('csTeam').value){const extra=active==='weapons'?match.weapons:match.skills;if(extra){host.append(el('h3','Thống kê bổ sung toàn trận'));for(const [key,data] of Object.entries(extra.data||{}))block(host,labels[key]||key,data);}}
    match.errors.forEach(error=>host.append(el('p',error,'cs-note')));
   }
   if(active==='total'||active==='average'){host.append(el('p','Số liệu do Match Stats cung cấp cho trận này; không tự cộng các tỷ lệ phần trăm giữa các trận.','cs-note'));const rows=match.raw.data?.[active==='total'?'total_stats':'average_stats']||[];block(host,active==='total'?'Tổng số':'Trung bình',q('csTeam').value?rows.filter(r=>r.team_name===q('csTeam').value):rows);}
   if(active==='raw'){summary();host.append(el('h3','Toàn bộ dữ liệu gốc'));host.append(el('pre',JSON.stringify({match:match.raw,skills:match.skills,weapons:match.weapons,errors:match.errors},null,2)));}
  }
  if(!selected.length)content.append(el('p','Chưa có dữ liệu. Nhập Match ID Tử chiến và bấm Lấy dữ liệu.','cs-empty'));
 }
 function updateFilters(){const oldMatch=q('csMatch').value,oldTeam=q('csTeam').value;q('csMatch').replaceChildren(new Option('Tất cả trận',''));for(const m of matches)q('csMatch').append(new Option(m.id,m.id));if(matches.some(m=>m.id===oldMatch))q('csMatch').value=oldMatch;q('csTeam').replaceChildren(new Option('Tất cả đội',''));const names=[...new Set(matches.filter(m=>!q('csMatch').value||m.id===q('csMatch').value).flatMap(m=>m.teams.map(t=>String(t.team_name))))];for(const name of names)q('csTeam').append(new Option(name,name));if(names.includes(oldTeam))q('csTeam').value=oldTeam;}
 q('csMatch').onchange=()=>{updateFilters();render();};q('csTeam').onchange=render;q('csSearch').oninput=render;
 panel.querySelector('form').onsubmit=async event=>{event.preventDefault();if(busy)return;try{const matchIds=ids(q('csIds').value);busy=true;q('csFetch').disabled=true;const next=[];for(let i=0;i<matchIds.length;i++){q('csStatus').textContent=`Đang lấy Tử chiến ${i+1}/${matchIds.length} · ${matchIds[i]}...`;next.push(await loadMatch(matchIds[i]));}matches=next;updateFilters();render();q('csExport').disabled=false;const errors=matches.flatMap(m=>m.errors.map(e=>m.id+': '+e));q('csStatus').textContent=`Đã tải ${matches.length} trận · ${matches.reduce((n,m)=>n+m.players.length,0)} lượt tuyển thủ.`+(errors.length?' Một số thống kê bổ sung chưa tải được: '+errors.join(' | '):'');}catch(error){q('csStatus').textContent=error.message+' Dữ liệu trước đó được giữ nguyên.';}finally{busy=false;q('csFetch').disabled=false;}};
 q('csExport').onclick=()=>{const blob=new Blob([JSON.stringify({mode:'clash-squad',matches},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='tu-chien-matchstats.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};render();
})(typeof window!=='undefined'?window:globalThis);
