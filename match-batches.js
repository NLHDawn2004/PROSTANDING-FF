function merge(kind, responses, playerCounts=[]) {
  const data={};
  if(kind==='match_data') {
    for(const response of responses) for(const [key, rows] of Object.entries(response.data||{})) {
      if(Array.isArray(rows)) (data[key] ||= []).push(...rows);
    }
  } else {
    const fields=kind==='skill'?['active_skills','passive_skills','pet_skills','loadout_skills']:['weapon_stats'];
    const counts=['time','use_times','pick_times','kills','damage','headshots','shoots','hits'];
    const rates=['pick_rate','hit_rate','on_target','headshot_rate','headshot_accuracy_rate'];
    for(const field of fields) {
      const grouped=new Map();
      responses.forEach(response=>{
        for(const row of response.data?.[field]||[]) {
          const key=kind==='skill'?String(row.skill_id):JSON.stringify([row.weapon_id,row.weapon||row.name||'']);
          if(!grouped.has(key)) grouped.set(key,[]);
          grouped.get(key).push(row);
        }
      });
      data[field]=[...grouped.values()].map(rows=>{
        const row={...rows[0]};
        for(const field of counts) row[field]=rows.every(r=>r[field]!=null&&Number.isFinite(Number(r[field])))?rows.reduce((s,r)=>s+Number(r[field]),0):null;
        for(const field of rates) row[field]=null;
        const players=playerCounts.reduce((a,b)=>a+b,0);
        if(kind==='skill'&&players>0&&playerCounts.every(n=>n>0)&&row.pick_times!=null) row.pick_rate=100*row.pick_times/players;
        if(row.shoots>0&&row.hits!=null) row.hit_rate=row.on_target=100*row.hits/row.shoots;
        if(row.hits>0&&row.headshots!=null) row.headshot_rate=row.headshot_accuracy_rate=100*row.headshots/row.hits;
        row.match_id=rows.flatMap(r=>r.match_id||[]);
        return row;
      });
    }
  }
  return {status:'success',code:0,msg:'',data};
}
async function requestBatches(ids,kind,request) {
  ids=[...new Set(ids)];
  if(ids.length<=8)return request(ids,kind);
  const responses=[],players=[];
  for(let i=0;i<ids.length;i+=8) {
    const batch=ids.slice(i,i+8),result=await request(batch,kind);
    if(result.response?.status!=='success')throw new Error(result.response?.msg||'Không thể tải đủ các lượt Match ID.');
    responses.push(result.response);
    if(kind==='skill') {
      const matches=await request(batch,'match_data');
      if(matches.response?.status!=='success')throw new Error('Không lấy được số người chơi để tính tỷ lệ chọn.');
      const info=matches.response.data?.match_info||[];
      players.push(info.length===batch.length?info.reduce((s,m)=>s+Number(m.number_of_player||0),0):0);
    }
  }
  return {payload:{match_ids:ids},response:merge(kind,responses,players)};
}
module.exports={merge,requestBatches};
