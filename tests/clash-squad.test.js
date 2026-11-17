const test=require('node:test'),assert=require('node:assert/strict');
const cs=require('../public/clash-squad');
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
