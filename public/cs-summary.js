(function(root){
 'use strict';
 const cs=typeof module!=='undefined'&&module.exports?require('./clash-squad'):root.ClashSquad;
 const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 const stat=v=>num(v)===null?'—':Number(v).toLocaleString('vi-VN',{maximumFractionDigits:2});
 function game(match){
  const scores=match.teams.map(t=>({team:t,score:num(t.wins)??num((match.info?.match_results||[]).find(r=>r.team_name===t.team_name)?.score)}));
  const known=scores.length===2&&scores.every(r=>r.score!==null);
  return {id:match.id,winner:known&&scores[0].score!==scores[1].score?scores.reduce((a,b)=>a.score>b.score?a:b).team:null,scores:scores.map(s=>s.score)};
 }
 function build(matches,names=new Map()){
  const unique=[...new Map(matches.map(m=>[m.id,m])).values()];
  const totals=cs.aggregate(unique);
  if(totals.teams.length>2)throw Error('SUMARY cần các trận của cùng hai đội. Hãy chọn riêng một Match ID.');
  const teams=totals.teams.map(t=>({...t,players:totals.players.filter(p=>p.team_name===t.team_name).map(p=>{
   const assists=p.rescue_members,kda=p.kd;
   const hs=p.headshots!==null&&p.kills>0?Math.round(p.headshots/p.kills*10000)/100+'%':p.headshot_kill_rate;
   return {...p,name:names.get(String(p.player_id))||p.player_name||'—',assists,kda,hs};
  })}));
  return {teams,games:unique.map(game)};
 }
 function groups(matches){
  const result=new Map();for(const match of matches){const names=match.teams.map(t=>String(t.team_name||'').trim()).sort(),key=JSON.stringify(names.map(n=>n.toUpperCase()));if(!result.has(key))result.set(key,{key,label:names.join(' — '),matches:[]});result.get(key).matches.push(match);}return [...result.values()];
 }
 const pageGames=(games,page=0)=>games.slice(Math.max(0,Number(page)||0)*3,Math.max(0,Number(page)||0)*3+3);
 const api={build,game,stat,groups,pageGames};if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.ClashSquadSummary=api;
})(typeof window!=='undefined'?window:globalThis);
