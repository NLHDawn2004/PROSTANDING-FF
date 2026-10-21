/* Match Stats supplies totals for the complete ID scope, including its rates. */
(function(root){
  const groups=[['active_skills','active','Chủ động'],['passive_skills','passive','Bị động'],['pet_skills','pet','Thú cưng'],['loadout_skills','loadout','Loadout']];
  const pending=new WeakMap();
  function value(...values){
    for(const item of values){
      if(item===null||item===undefined||typeof item==='boolean'||String(item).trim()==='')continue;
      const text=String(item).trim().replace(/%$/,'');
      if(!/^\d+(?:\.\d+)?$/.test(text))continue;
      const n=Number(text);if(Number.isFinite(n))return n;
    }
    return null;
  }
  function normalize(kind,response){
    const data=response?.data||{};
    if(kind==='skill')return groups.flatMap(([field,type,label])=>(Array.isArray(data[field])?data[field]:[]).map(row=>({
      type,label,id:String(row.skill_id??''),character:String(row.name||''),name:String(row.skill||row.skill_name||''),uses:value(row.time,row.use_times),picks:value(row.pick_times),pickRate:value(row.pick_rate)
    })));
    return (Array.isArray(data.weapon_stats)?data.weapon_stats:[]).map(row=>({
      id:String(row.weapon_id??''),name:String(row.weapon||row.name||''),kills:value(row.kills),damage:value(row.damage),headshots:value(row.headshots),shots:value(row.shoots),hits:value(row.hits),hitRate:value(row.hit_rate,row.on_target),headshotRate:value(row.headshot_rate,row.headshot_accuracy_rate),picks:value(row.pick_times),pickRate:value(row.pick_rate),isGroupTotal:/-SUM$/i.test(String(row.weapon||row.name||''))
    }));
  }
  function idsOf(ids){return [...new Set(ids.map(id=>String(id).trim()).filter(Boolean))];}
  function keyOf(kind,ids){return kind+':'+idsOf(ids).sort().join(',');}
  async function request(kind,ids,fetcher=fetch){
    if(!['skill','weapon'].includes(kind))throw new Error('Loại thống kê không hợp lệ.');
    const matchIds=idsOf(ids);
    if(!matchIds.length||matchIds.some(id=>!/^\d{10,25}$/.test(id)))throw new Error('Thống kê này cần Match ID thật; bảng nhập từ ảnh chưa có dữ liệu kỹ năng/vũ khí.');
    const response=await fetcher(kind==='skill'?'/api/match-skills':'/api/match-weapons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match_ids:matchIds})});
    let result;try{result=await response.json();}catch(e){throw new Error('Máy chủ chưa hỗ trợ thống kê mới. Hãy khởi động lại tool.');}
    if(!response.ok||!result.ok)throw new Error(result.error||'Không thể tải thống kê Match Stats.');
    if(result.data?.status&&result.data.status!=='success')throw new Error(result.data.msg||'Match Stats chưa cung cấp dữ liệu cho phạm vi này.');
    return result.data;
  }
  function escape(text){return String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function number(n,percent=false){return n===null?'<span class="usage-missing" title="API không cung cấp">—</span>':escape(n.toLocaleString('vi-VN',{maximumFractionDigits:2}))+(percent?'%':'');}
  function table(kind,rows){
    const headers=kind==='skill'?['Nhóm','ID kỹ năng','Nhân vật / thú cưng','Tên kỹ năng','Lần kích hoạt','Lượt chọn','Tỷ lệ chọn']:['ID vũ khí','Tên súng / vũ khí','Số lần bắn','Số lần trúng','Hạ gục','Sát thương','Headshot','Tỷ lệ trúng','Tỷ lệ headshot','Lượt chọn','Tỷ lệ chọn'];
    const body=rows.map(row=>{
      const values=kind==='skill'?[escape(row.label),escape(row.id)||'—',escape(row.character)||'—',escape(row.name)||'—',number(row.uses),number(row.picks),number(row.pickRate,true)]:[escape(row.id)||'—',(escape(row.name)||'Chưa có tên')+(row.isGroupTotal?' <small class="usage-group-tag">Tổng nhóm</small>':''),number(row.shots),number(row.hits),number(row.kills),number(row.damage),number(row.headshots),number(row.hitRate,true),number(row.headshotRate,true),number(row.picks),number(row.pickRate,true)];
      return '<tr>'+values.map(text=>'<td>'+text+'</td>').join('')+'</tr>';
    }).join('');
    return '<div class="usage-table-scroll"><table class="detail-table usage-table"><thead><tr>'+headers.map(text=>'<th>'+text+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  }
  function paint(opts,entry,ids,key){
    const {container,kind}=opts,rows=normalize(kind,entry.response);
    let type='all';
    const draw=()=>{
      const filtered=rows.filter(row=>kind!=='skill'||type==='all'||row.type===type).sort((a,b)=>kind==='skill'?(b.uses??-1)-(a.uses??-1)||(b.picks??-1)-(a.picks??-1):Number(a.isGroupTotal)-Number(b.isGroupTotal)||(b.kills??-1)-(a.kills??-1));
      const uses=rows.filter(row=>row.type==='active'&&row.uses!==null).reduce((sum,row)=>sum+row.uses,0);
      const hasUses=rows.some(row=>row.type==='active'&&row.uses!==null);
      container.innerHTML='<div class="usage-heading"><div><h3>'+ (kind==='skill'?'Kỹ năng nhân vật':'Vũ khí & bắn súng')+'</h3><p>Tổng hợp '+ids.length+' Match ID · '+rows.length+' '+(kind==='skill'?'kỹ năng':'dòng vũ khí')+'</p></div><button type="button" class="mini-btn usage-reload">Tải lại từ Match Stats</button></div>'+
        (kind==='skill'?'<div class="usage-summary">Tổng lần kích hoạt kỹ năng chủ động: <strong>'+(hasUses?number(uses):'—')+'</strong></div><label class="usage-filter">Nhóm kỹ năng <select aria-label="Nhóm kỹ năng"><option value="all">Tất cả</option>'+groups.map(([,id,label])=>'<option value="'+id+'"'+(type===id?' selected':'')+'>'+label+'</option>').join('')+'</select></label>':'')+
        '<p class="usage-note">Tool tự chia tối đa 8 Match ID mỗi lượt và cộng dồn số liệu. Tỷ lệ không cộng phần trăm; dấu — nghĩa là API không cung cấp hoặc thiếu dữ liệu gốc để tính tỷ lệ tổng hợp.</p>'+
        (kind==='skill'?'<p class="usage-note">Kỹ năng bị động, thú cưng và loadout có thể chỉ có lượt chọn, không có số lần kích hoạt.</p>':'<p class="usage-note">Một số trận BR không trả số lần bắn, số lần trúng hoặc lượt chọn vũ khí. Dòng “Tổng nhóm” do API gộp các biến thể súng, có thể trùng phạm vi với các dòng chi tiết.</p>')+
        (filtered.length?table(kind,filtered):'<div class="empty-state">Không có dữ liệu trong phạm vi đã chọn.</div>');
      container.querySelector('.usage-reload').onclick=()=>{delete opts.state.usageCache[key];render(opts);};
      const select=container.querySelector('.usage-filter select');if(select)select.onchange=()=>{type=select.value;draw();};
    };
    draw();
  }
  async function render(opts){
    const {container,state,kind}=opts;if(!container)return;
    const ids=idsOf((state.detailGame==='overall'?opts.matches:opts.matches.filter(m=>m.gameNumber<=opts.targetGame)).map(m=>m.matchId));
    const key=keyOf(kind,ids);container.dataset.usageKey=key;
    if(!state.usageCache||typeof state.usageCache!=='object'||Array.isArray(state.usageCache))state.usageCache={};
    const cache=state.usageCache,entry=cache[key];
    if(entry?.kind===kind&&Array.isArray(entry.matchIds)&&keyOf(kind,entry.matchIds)===key&&entry.response?.status==='success'){paint(opts,entry,ids,key);return;}
    container.innerHTML='<div class="usage-loading" role="status">Đang tải và tổng hợp '+ids.length+' Match ID từ Match Stats...</div>';
    if(!pending.has(cache))pending.set(cache,new Map());
    const map=pending.get(cache);
    try{
      if(!map.has(key))map.set(key,request(kind,ids));
      const response=await map.get(key),result={kind,matchIds:ids,response};cache[key]=result;
      if(container.isConnected&&container.dataset.usageKey===key)paint(opts,result,ids,key);
    }catch(error){
      if(container.isConnected&&container.dataset.usageKey===key){container.innerHTML='<div class="usage-error" role="alert">'+escape(error.message)+'</div><button type="button" class="mini-btn usage-retry">Thử lại</button>';container.querySelector('.usage-retry').onclick=()=>render(opts);}
    }finally{map.delete(key);}
  }
  const api={normalize,request,keyOf,render};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UsageDetails=api;
})(typeof window!=='undefined'?window:globalThis);
