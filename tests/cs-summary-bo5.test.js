const test=require('node:test'),assert=require('node:assert/strict');
const summary=require('../public/cs-summary');
test('all five maps contribute to the same BO3 totals, overwrite names, rescue assists and K/D',()=>{
 const matches=Array.from({length:5},(_,i)=>({id:String(i+1),teams:[{team_name:'A',wins:7,player_data:[{player_id:'9007199254740993',player_name:'raw',kills:i+1,death:1,rescue_members:2,damage:(i+1)*100,knock_down:4}]},{team_name:'B',wins:i,player_data:[]}]}));
 const result=summary.build(matches,new Map([['9007199254740993','OVERWRITE']])),p=result.teams.find(t=>t.team_name==='A').players[0];
 assert.equal(p.name,'OVERWRITE');assert.equal(p.kills,15);assert.equal(p.death,5);assert.equal(p.assists,10);assert.equal(p.damage,1500);assert.equal(p.knock_down,20);assert.equal(p.kda,3);assert.equal(result.games.length,5);
});
test('BO3 and BO5 page games in original order without losing the fourth and fifth maps',()=>{
 const games=Array.from({length:7},(_,i)=>({id:String(i+1)}));
 assert.deepEqual(summary.pageGames(games,0,5).map(g=>g.id),['1','2','3','4','5']);
 assert.deepEqual(summary.pageGames(games,1,5).map(g=>g.id),['6','7']);
 assert.deepEqual(summary.pageGames(games,0).map(g=>g.id),['1','2','3']);
 assert.deepEqual(summary.pageGames(games,1).map(g=>g.id),['4','5','6']);
});
test('BO5 draws five winners and uses the same six player stats as BO3, clearing all sample placeholders',()=>{
 const layout=require('../public/cs-summary-layout'),texts=[],images=[],fills=[];
 const ctx={clearRect(){},drawImage(...a){images.push(a);},fillRect(...a){fills.push(a);},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},measureText(text){return {width:String(text).length*15,actualBoundingBoxAscent:20,actualBoundingBoxDescent:5};},fillText(...a){texts.push(a);}};
 const p={name:'EXACT_NAME',kills:11,death:7,assists:3,kda:1.57,damage:12345,knock_down:19,headshots:999};
 const teams=[{team_name:'ALPHA',players:[p]},{team_name:'BETA',players:[p]}],games=Array.from({length:5},(_,i)=>({winner:teams[i%2],scores:[i+1,i+2]})),logo={width:100,height:100};
 layout.draw(ctx,{format:'bo5',frame:{},model:{teams,games},games,logos:Array(5).fill(logo),teamLogos:[logo,logo],font:(_,size)=>size+'px Arial',displayTeam:name=>name});
 assert.equal(texts.filter(t=>t[0].includes(' : ')).length,5);assert.ok(texts.some(t=>t[0]==='5 : 6'));
 assert.ok(texts.some(t=>t[0]==='KNOCKDOWN'));assert.equal(texts.filter(t=>t[0]==='19').length,2);assert.ok(!texts.some(t=>t[0]==='999'));
 assert.ok(texts.some(t=>t[0]==='1.57'));assert.ok(!texts.some(t=>t[0].includes('AAAA')||t[0].includes('BBBB')||t[0].includes('PICK')));
 assert.ok(fills.some(r=>r[0]===112&&r[1]===262));assert.ok(fills.some(r=>r[0]===1048&&r[1]===653));
 assert.equal(images.length,8);assert.ok(texts.every(t=>t[1]>=0&&t[1]<=1920&&t[2]>=0&&t[2]<=1080));
 texts.length=0;layout.draw(ctx,{format:'bo3',frame:{},model:{teams,games},games,logos:[],teamLogos:[],font:(_,size)=>size+'px Arial',displayTeam:name=>name});assert.equal(texts.filter(t=>t[0].includes(' : ')).length,3);
});
