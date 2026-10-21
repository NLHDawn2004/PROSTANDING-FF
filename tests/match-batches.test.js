const {test}=require('node:test');
const assert=require('node:assert/strict');
const {merge,requestBatches}=require('../match-batches');
test('unlimited scope splits into at most eight IDs and deduplicates',async()=>{
 const ids=Array.from({length:25},(_,i)=>String(2102383425744447488n+BigInt(i))),calls=[];
 const result=await requestBatches([...ids,ids[0]],'match_data',async(batch)=>{calls.push(batch);return {response:{status:'success',data:{match_info:batch.map(match_id=>({match_id}))}}}});
 assert.deepEqual(calls.map(b=>b.length),[8,8,8,1]);assert.equal(result.response.data.match_info.length,25);
});
test('skill counts add and rates use all player appearances including absent skills',()=>{
 const result=merge('skill',[{data:{active_skills:[{skill_id:1,time:10,pick_times:2,pick_rate:50}]}},{data:{active_skills:[]}}],[4,6]);
 assert.equal(result.data.active_skills[0].time,10);assert.equal(result.data.active_skills[0].pick_rate,20);
});
test('weapon totals retain variants and never average percentages with missing denominators',()=>{
 const response={data:{weapon_stats:[{weapon_id:0,weapon:'A-SUM',kills:3,on_target:'30%'},{weapon_id:0,weapon:'B-SUM',kills:2}]}};
 const rows=merge('weapon',[response,response]).data.weapon_stats;
 assert.equal(rows.length,2);assert.equal(rows[0].kills,6);assert.equal(rows[0].on_target,null);assert.equal(rows[0].shoots,null);
});
test('batch failure rejects instead of returning partial totals',async()=>{
 await assert.rejects(requestBatches(Array.from({length:9},(_,i)=>String(i)),'weapon',async()=>({response:{status:'error',msg:'failed'}})),/failed/);
});
