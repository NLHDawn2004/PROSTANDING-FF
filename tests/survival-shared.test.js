const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../public/survival-shared');
const ids=Array.from({length:10},(_,i)=>String(2114705178512504832n+BigInt(i)));
test('shared survival fetch deduplicates exact IDs, batches by eight and supplies one response set for every tab',async()=>{
 const calls=[];const result=await load(ids.join(', ')+', '+ids[0],async requested=>{calls.push(requested);return {requestedIds:requested,data:requested.map(match_id=>({match_id,team_stats:[{team_name:'A'}]}))};},data=>data);
 assert.deepEqual(calls.map(c=>c.length),[8,2]);assert.deepEqual(result.ids,ids);assert.deepEqual(result.matches.map(m=>m.matchId),ids);assert.equal(result.responses.length,2);
});
test('shared survival fetch rejects missing, wrong and failed batches without returning partial data',async()=>{
 await assert.rejects(load(ids.join(','),async requested=>{if(requested.length===2)throw Error('network');return {data:requested.map(match_id=>({match_id,team_stats:[]}))};},d=>d),/network/);
 for(const groups of [[],[{match_id:ids[1],team_stats:[]}],[{match_id:ids[0],team_stats:[]},{match_id:ids[0],team_stats:[]}]])await assert.rejects(load(ids[0],async()=>({data:groups}),d=>d));
 for(const text of ['', 'bad','2114705178512504832e0'])await assert.rejects(load(text,async()=>{throw Error('must not fetch');},d=>d),/Match ID/);
});
