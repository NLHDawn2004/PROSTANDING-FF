const test=require('node:test'),assert=require('node:assert/strict');
const h=require('../public/h2h.js');
test('team totals use player assists and fallback stats across actual appearances',()=>{
 const matches=[{teams:[{team_name:'A',kills:10,damage:100,players:[{assists:2,headshots:3}]}]},{teams:[{team_name:'A',players:[{kills:4,damage:40,assists:6,headshots:1}]},{team_name:'B',kills:5,damage:60,assists:2,headshots:0}]}];
 const teams=h.aggregate(matches,t=>t.players||[]);
 assert.equal(teams[0].games,2);assert.equal(teams[0].kills,14);assert.equal(teams[0].assists,8);
 assert.equal(h.value(teams[0],'kills','average'),7);assert.equal(h.value(teams[1],'kills','average'),5);
 assert.equal(h.value(teams[0],'headshots','total'),4);
});
test('missing stats stay unknown and zero remains valid',()=>{
 const teams=h.aggregate([{teams:[{team_name:'A',kills:0},{team_name:'B'}]}],()=>[]);
 assert.equal(teams[0].kills,0);assert.equal(teams[0].damage,null);assert.equal(teams[1].kills,null);
 assert.equal(h.share(0,0),.5);assert.equal(h.share(3,1),.75);assert.equal(h.share(null,1),.5);
});
