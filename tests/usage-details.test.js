const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../public/usage-details.js');
test('skill totals retain all four categories and distinguish missing use count from zero',()=>{
  assert.ok(fs.existsSync(file),'Usage statistics are not implemented');
  const api=require(file),rows=api.normalize('skill',{data:{active_skills:[{skill_id:4006,name:'Skyler',skill:'Riptide Rhythm',time:46,pick_times:11,pick_rate:22.92},{skill_id:4406,name:'Xayne',skill:'Xtreme Encounter',time:0,pick_times:1,pick_rate:2.08}],passive_skills:[{skill_id:506,name:'Nikita',skill:'Firearms Expert',pick_times:22,pick_rate:45.83}],pet_skills:[{skill_id:1315000023,name:'Arvon',skill:'Dinoculars',pick_times:40,pick_rate:83.33}],loadout_skills:[{skill_id:500000004,skill:'Tactical Market',pick_times:25,pick_rate:52.08}]}});
  assert.equal(rows.length,5);assert.equal(rows[0].uses,46);assert.equal(rows[1].uses,0);
  assert.equal(rows[2].uses,null);assert.equal(rows[2].pickRate,45.83);
  assert.deepEqual(rows.map(r=>r.type),['active','active','passive','pet','loadout']);
});
test('weapon fields do not invent missing shots, hits or picks from percentages',()=>{
  assert.ok(fs.existsSync(file),'Usage statistics are not implemented');
  const api=require(file),rows=api.normalize('weapon',{data:{weapon_stats:[{weapon_id:89,weapon:'AC80',kills:16,damage:8286,headshots:4,on_target:'30.06%',headshot_accuracy_rate:'3.74%'},{weapon_id:0,weapon:'AC80-SUM',kills:18,damage:9000}]}});
  assert.equal(rows[0].shots,null);assert.equal(rows[0].hits,null);assert.equal(rows[0].picks,null);assert.equal(rows[0].hitRate,30.06);
  assert.equal(rows[0].headshotRate,3.74);assert.equal(rows[1].isGroupTotal,true);
});
test('the full deduplicated Match ID set is sent once without losing large-ID precision',async()=>{
  assert.ok(fs.existsSync(file),'Usage statistics are not implemented');
  const api=require(file),calls=[];
  const ids=['2102383425744447488','2102388193493690368','2102393848069793792','2102399161024030724'];
  const data=await api.request('skill',[...ids,ids[0]],async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,data:{status:'success',data:{active_skills:[]}}})};});
  assert.equal(calls.length,1);assert.deepEqual(calls[0].body.match_ids,ids);assert.equal(calls[0].url,'/api/match-skills');assert.equal(data.status,'success');
});
test('failed API calls stay errors rather than appearing as empty statistics',async()=>{
  assert.ok(fs.existsSync(file),'Usage statistics are not implemented');
  await assert.rejects(require(file).request('weapon',['2102383425744447488'],async()=>({ok:false,json:async()=>({error:'Match Stats unavailable'})})),/unavailable/);
});
