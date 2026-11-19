const test=require('node:test'),assert=require('node:assert/strict');
const game=require('../public/cs-gameres');
const match={id:'2123015155345963008',info:{match_results:[{team_name:'A',score:7},{team_name:'B',score:3}]},teams:[{team_name:'A',wins:7,player_data:[{player_id:'9007199254740993',player_name:'raw',kills:4,damage:600,death:2,rescue_members:3,kd:2,headshot_kill_rate:'25%'}]},{team_name:'B',wins:3,player_data:[{player_id:'2',player_name:'other',kills:1,damage:100,death:4,rescue_members:0,kd:.25}]}]};
test('GAMERES displays only the selected match, names by exact ID and rescues as assists',()=>{
 const result=game.model(match,new Map([['9007199254740993','A_PLAYER']]));assert.equal(result.id,match.id);assert.equal(result.teams[0].players[0].name,'A_PLAYER');assert.equal(result.teams[0].players[0].assists,3);assert.equal(result.teams[0].players[0].kda,2);assert.equal(result.teams[0].score,7);assert.equal(result.teams[1].score,3);assert.equal(match.teams[0].player_data[0].player_name,'raw');
});
test('GAMERES chooses an MVP within each team and supports manual change without taking another team player',()=>{
 const source=structuredClone(match);source.teams[0].player_data.push({player_id:'3',player_name:'top',kills:9,damage:1000,death:1,rescue_members:0,kd:9});
 const result=game.model(source);assert.equal(game.mvp(result.teams[0]).player_id,'3');assert.equal(game.mvp(result.teams[0],'9007199254740993').player_id,'9007199254740993');assert.equal(game.mvp(result.teams[1],'3').player_id,'2');assert.equal(game.decimal(.25),'0.25');assert.equal(game.decimal(null),'—');
});
