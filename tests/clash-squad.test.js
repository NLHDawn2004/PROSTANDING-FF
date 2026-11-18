const test=require('node:test'),assert=require('node:assert/strict');
const cs=require('../public/clash-squad');
test('cumulative totals merge players by ID and recalculate KD rather than sum rates',()=>{
 const matches=[{id:'1',teams:[{team_name:'A',wins:6,losses:2,kills:4,damage:1000,player_data:[{player_id:1,player_name:'P',kills:4,death:0,damage:1000,knock_down:5,rescue_members:1,kd:4,headshot_kill_rate:'50%'}]}]},{id:'2',teams:[{team_name:'A',wins:3,losses:6,kills:3,damage:700,player_data:[{player_id:1,player_name:'P2',kills:3,death:2,damage:700,knock_down:4,rescue_members:2,kd:1.5,headshot_kill_rate:'33%'}]}]}];
 const result=cs.aggregate(matches);assert.equal(result.teams.length,1);assert.equal(result.teams[0].games,2);assert.equal(result.teams[0].games_won,1);assert.equal(result.teams[0].games_lost,1);assert.equal(result.teams[0].wins,9);assert.equal(result.teams[0].losses,8);assert.equal(result.players[0].kills,7);assert.equal(result.players[0].death,2);assert.equal(result.players[0].kd,3.5);assert.equal(result.players[0].headshot_kill_rate,null);assert.equal(result.players[0].player_name,'P2');assert.equal(cs.perGame(result.players)[0].damage,850);
 assert.equal(cs.aggregate([...matches,matches[0]]).teams[0].games,2);
});
test('exact Match IDs are validated and deduplicated as strings',()=>{
 assert.deepEqual(cs.ids('2121570587261974528, 2121570587261974528\n2121570587261974529'),['2121570587261974528','2121570587261974529']);
 assert.throws(()=>cs.ids('abc'));assert.throws(()=>cs.ids(''));
});
test('extract retains real CS fields, score, deaths and unknown nested data',()=>{
 const data={match_info:[{match_id:'2121570587261974528',mode:15,match_results:[{team_name:'A',score:6}]}],team_stats:[{match_id:'2121570587261974528',team_stats:[{team_name:'A',wins:6,losses:0,player_data:[{player_id:42,death:0,kd:10,weapon:[{weapon:'AK',damage:90}],future_field:7}]}]}]};
 const match=cs.extract(data,'2121570587261974528');assert.equal(match.info.mode,15);assert.equal(match.players[0].death,0);assert.equal(match.players[0].future_field,7);assert.equal(match.players[0].weapon[0].damage,90);assert.equal(match.info.match_results[0].score,6);
 assert.throws(()=>cs.extract({...data,match_info:[{mode:1}]},'2121570587261974528'),/Sinh tồn/);
});
test('all columns are exposed and missing data differs from zero',()=>{
 assert.deepEqual(cs.columns([{kills:0},{death:2,extra:9}]),['kills','death','extra']);
 assert.equal(cs.display(null),'—');assert.equal(cs.display(0),'0');
});
test('supplemental endpoint failures preserve mandatory match and exact IDs',async()=>{
 const id='2121570587261974528',calls=[];
 const fetcher=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(url!=='/api/match')return {ok:false,status:503,json:async()=>({ok:false,error:'Unavailable'})};return {ok:true,json:async()=>({ok:true,data:{status:'success',data:{match_info:[{match_id:id,mode:15}],team_stats:[{match_id:id,team_stats:[{team_name:'A',player_data:[{player_name:'P',death:0}]}]}]}}})};};
 const result=await cs.loadMatch(id,fetcher);assert.equal(result.players.length,1);assert.equal(result.errors.length,2);assert.equal(result.skills,null);assert.equal(result.weapons,null);calls.forEach(call=>assert.deepEqual(call.body.match_ids,[id]));
});

test('weapon totals combine all teams and matches once without counting player or supplemental copies',()=>{
 const gun=(weapon,kills,damage)=>({weapon_id:weapon==='AK'?6:0,weapon,kills,damage});
 const a={id:'1',teams:[{team_name:'A',weapon:[gun('AK',2,100),gun('AK-SUM',4,200)],player_data:[{weapon:[gun('AK',2,100)]}]},{team_name:'B',weapon:[gun('AK',3,150)],player_data:[]}],weapons:{data:{weapon:[gun('AK',5,250)]}}};
 const b={id:'2',teams:[{team_name:'C',player_data:[{weapon:[gun('AK',1,50)]},{weapon:[gun('AK',2,75)]}]}]};
 const result=cs.aggregateWeapons([a,b,a]);
 assert.equal(result.length,2);
 assert.deepEqual(result.find(r=>r.weapon==='AK'),gun('AK',8,375));
 assert.deepEqual(result.find(r=>r.weapon==='AK-SUM'),gun('AK-SUM',4,200));
 assert.deepEqual(cs.aggregateWeapons([]),[]);
});
test('weapon totals preserve missing counters instead of reporting a partial total as complete',()=>{
 const result=cs.aggregateWeapons([{id:'1',teams:[{weapon:[{weapon:'AK',kills:0,damage:10}]},{weapon:[{weapon:'AK',damage:20}]}]}]);
 assert.equal(result[0].kills,null);assert.equal(result[0].damage,30);
});

test('skills combine all teams and matches and estimate selection per player appearance, not time',()=>{
 const skill=(name,time)=>({skill:name,time});
 const a={id:'1',teams:[{active_skills:[skill('A',99),skill('B',3)],player_data:[{player_id:'1',active_skills:[skill('A',50),skill('A',49)]},{player_id:'2',active_skills:[skill('B',3)]}]},{active_skills:[skill('A',2)],player_data:[{player_id:'3',active_skills:[skill('A',2)]},{player_id:'4',active_skills:[]}]}]};
 const b={id:'2',teams:[{player_data:[{player_id:'1',active_skills:[skill('A',7)]},{player_id:'2',active_skills:[]}]}]};
 const result=cs.aggregateSkills([a,b,a]).active_skills;
 assert.equal(result.length,2);
 const row=result.find(s=>s.skill==='A');assert.equal(row.time,108);assert.equal(row.equipped_appearances,3);assert.equal(row.player_appearances,6);assert.equal(row.estimated_pick_rate,'50%');
 assert.equal(result.find(s=>s.skill==='B').estimated_pick_rate,'16.67%');
});
test('skills retain categories and report unknown rates if player skill data is incomplete',()=>{
 const result=cs.aggregateSkills([{id:'1',teams:[{active_skills:[{skill:'A',time:8}],passive_skills:[{skill:'A',time:2}],player_data:[{active_skills:[{skill:'A',time:1}]},{}]}]}]);
 assert.equal(result.active_skills[0].time,8);assert.equal(result.active_skills[0].estimated_pick_rate,null);assert.equal(result.active_skills[0].equipped_appearances,null);
 assert.equal(result.passive_skills[0].time,2);assert.equal(result.passive_skills[0].estimated_pick_rate,null);
 assert.deepEqual(result.pet_skills,[]);assert.deepEqual(cs.aggregateSkills([]).active_skills,[]);
});
test('skills do not report a full selection rate when player records are missing',()=>{
 const result=cs.aggregateSkills([{id:'1',info:{number_of_player:8},teams:[{player_data:[{player_id:'1',active_skills:[{skill:'A',time:1}]}]}]}]);
 assert.equal(result.active_skills[0].estimated_pick_rate,null);
});
