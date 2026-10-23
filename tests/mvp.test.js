const test=require('node:test');
const assert=require('node:assert/strict');
const mvp=require('../public/mvp.js');
test('Player aggregation accepts MVP matches and leaves main matches alone',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require.resolve('../public/app.js'),'utf8');
 const fn=source.slice(source.indexOf('function buildPlayerData('),source.indexOf('function sortPlayers('));
 const context={getAllMatches:()=>{throw Error('MVP must not read main match data');},getTeamKey:t=>t.name,getPlayersFromTeam:t=>t.players,getPlayerKey:p=>p.id,createPlayer:p=>({kills:0,name:p.name}),getPlayerName:p=>p.name,addPlayerStats:(target,p)=>{target.kills+=p.kills;}};
 vm.createContext(context);vm.runInContext(fn,context);
 assert.equal(context.buildPlayerData(null,[]).length,0);
 const team={name:'A',players:[{id:'123',name:'P',kills:4}]};
 const result=context.buildPlayerData(null,[{teams:[team]},{teams:[team]}]);
 assert.equal(result.length,1);assert.equal(result[0].kills,8);
});
test('MVP normalizes its own match responses without shared standings state',()=>{
 const batches=[{requestedIds:['101'],data:{data:{team_stats:[{team_stats:[{team_name:'A'}]}]}}}];
 const matches=mvp.matchesFromResponses(batches,r=>r.data.team_stats);
 assert.equal(matches[0].matchId,'101');assert.equal(matches[0].teams[0].team_name,'A');
 assert.deepEqual(mvp.matchesFromResponses([],()=>[]),[]);
});
test('overwrite names match numeric and string IDs, retain stats and ranking',()=>{
 const names=mvp.parseNames('\uFEFF'+JSON.stringify({PlayerNameList:[{PlayerID:1662250707,PlayerNameOverwrite:'NVA.MĐẠTT'},{PlayerID:'1229061894',PlayerNameOverwrite:'NVA.TSANG'}]}));
 const p={playerId:'1662250707',name:'old',kills:15};
 assert.equal(mvp.displayName(p,names),'NVA.MĐẠTT');
 assert.equal(p.name,'old');assert.equal(p.kills,15);
 assert.equal(mvp.displayName({playerId:'missing',name:'original'},names),'original');
 assert.throws(()=>mvp.parseNames('{}'),/PlayerNameList/);
 assert.throws(()=>mvp.parseNames('{bad'));
 assert.throws(()=>mvp.parseNames('{"PlayerNameList":[{"PlayerID":1,"PlayerNameOverwrite":" "}]}'));
});
test('photo filenames match exact player IDs',()=>{
 assert.equal(mvp.photoId('123456789.PNG'),'123456789');
 assert.equal(mvp.photoId('123456789.jpg'),'123456789');
 assert.equal(mvp.photoId('123456789-copy.png'),null);
});
test('top three follow supplied Player order without changing data',()=>{
 const rows=[{playerId:'3',kills:9},{playerId:'2',kills:8},{playerId:'1',kills:7},{playerId:'4',kills:6}];
 assert.deepEqual(mvp.topThree(rows).map(p=>p.playerId),['3','2','1']);
 assert.equal(rows.length,4);
 assert.deepEqual(mvp.topThree([]),[]);
 assert.equal(mvp.topThree(rows.slice(0,1)).length,1);
});
test('missing stats are distinguished from zero',()=>{
 assert.equal(mvp.stat(undefined),'—');assert.equal(mvp.stat(null),'—');
 assert.equal(mvp.stat(0),'0');assert.equal(mvp.stat(9174),'9174');
});
