const test=require('node:test'),assert=require('node:assert/strict');
const summary=require('../public/cs-summary');
const match=(id,scoreA=6,scoreB=2)=>({id,info:{match_results:[{team_name:'A',score:scoreA},{team_name:'B',score:scoreB}]},teams:[{team_name:'A',wins:scoreA,losses:scoreB,player_data:[{player_id:'9007199254740993',player_name:'raw',kills:3,death:1,damage:500,knock_down:4,rescue_members:2,headshot_kill_rate:'33.33%'}]},{team_name:'B',wins:scoreB,losses:scoreA,player_data:[{player_id:'2',player_name:'B',kills:2,death:3,damage:200,rescue_members:0}]}]});
test('summary keeps one winner per unique Match ID in input order, never picks the kill leader',()=>{
 const a=match('1',2,6),b=match('2');a.teams[0].kills=100;
 const result=summary.build([a,b,a],new Map());assert.equal(result.games.length,2);assert.equal(result.games[0].winner.team_name,'B');assert.equal(result.games[1].winner.team_name,'A');
 assert.equal(summary.build([match('draw',3,3)]).games[0].winner,null);
});
test('summary uses Player totals, exact overwrite names, rescue assists, knockdowns and KD displayed as KDA',()=>{
 const result=summary.build([match('1'),match('2')],new Map([['9007199254740993','A_NEW']]));
 const p=result.teams.find(t=>t.team_name==='A').players[0];assert.equal(p.name,'A_NEW');assert.equal(p.kills,6);assert.equal(p.damage,1000);assert.equal(p.assists,4);assert.equal(p.kda,3);assert.equal(p.knock_down,8);assert.equal(p.hs,null);
 assert.equal(summary.build([match('1')]).teams[0].players[0].hs,'33.33%');
 assert.equal(summary.build([match('1'),match('2'),match('3'),match('4')]).games.length,4);
});
