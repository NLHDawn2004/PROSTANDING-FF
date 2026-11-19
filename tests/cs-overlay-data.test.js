const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../public/cs-overlay-data'),cs=require('../public/clash-squad'),summary=require('../public/cs-summary');
const ids=['2123015155345963008','2123018319864444928','2123025296627775488','2123030464350042112'];
const fixture={match_info:ids.map(match_id=>({match_id,mode:15})),team_stats:ids.map((match_id,i)=>({match_id,team_stats:[{team_name:'A'+i,player_data:[]},{team_name:'B'+i,player_data:[]}]}))};
test('shared overlay fetch accepts four different matchups, preserves IDs and requests Player data once',async()=>{
 const calls=[];const matches=await data.load(ids.join(','),async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,data:{status:'success',data:fixture}})};});
 assert.equal(calls.length,1);assert.deepEqual(calls[0].body.match_ids,ids);assert.equal(matches.length,4);assert.equal(summary.groups(matches).length,4);
 assert.throws(()=>cs.ids('invalid'));assert.deepEqual(summary.pageGames(matches,1).map(m=>m.id),[ids[3]]);
});
test('shared overlay fetch rejects missing matches instead of duplicating the first result',async()=>{
 await assert.rejects(()=>data.load(ids.join(','),async()=>({ok:true,json:async()=>({ok:true,data:{status:'success',data:{...fixture,team_stats:fixture.team_stats.slice(0,3)}}})})),/2123030464350042112/);
});

test('shared loader batches more than eight IDs and never returns partial data after a later failure',async()=>{
 const many=Array.from({length:9},(_,i)=>'21230151553459630'+String(i).padStart(2,'0')),calls=[];
 const fetcher=async(url,options)=>{const ids=JSON.parse(options.body).match_ids;calls.push(ids);return {ok:true,json:async()=>({ok:true,data:{status:'success',data:{match_info:ids.map(match_id=>({match_id,mode:15})),team_stats:ids.map(match_id=>({match_id,team_stats:[{team_name:'A',player_data:[]}]}))}}})};};
 assert.equal((await data.load(many.join(','),fetcher)).length,9);assert.deepEqual(calls.map(c=>c.length),[8,1]);
 let count=0;await assert.rejects(()=>data.load(many.join(','),async(...args)=>++count===2?{ok:false,json:async()=>({error:'Failed batch'})}:fetcher(...args)),/Failed batch/);
});
