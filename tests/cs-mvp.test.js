const test=require('node:test'),assert=require('node:assert/strict');
const mvp=require('../public/cs-mvp');
test('CS MVP resolves the selected player and aggregates exact player IDs',()=>{
 const matches=[{id:'1',teams:[{team_name:'A',player_data:[{player_id:'6537554481',player_name:'P',kills:6,damage:1000,death:0,headshot_kill_rate:'50.50%'}]}]},{id:'2',teams:[{team_name:'A',player_data:[{player_id:'6537554481',player_name:'P',kills:4,damage:2000,death:2}]}]}];
 const rows=mvp.roster([...matches,matches[0]]);assert.equal(rows.length,1);assert.equal(rows[0].kills,10);assert.equal(rows[0].kd,5);assert.equal(rows[0].assists,null);assert.equal(rows[0].hs,null);
 assert.equal(mvp.chosen(rows,''),null);assert.equal(mvp.chosen(rows,'absent'),null);assert.equal(mvp.chosen(rows,rows[0].key),rows[0]);
 assert.equal(mvp.roster([matches[0]])[0].hs,'50.50%');
});
test('CS MVP calculates cumulative HS only from real headshot counts and preserves zero',()=>{
 const make=(id,kills,headshots)=>({id,teams:[{player_data:[{player_id:'1',player_name:'P',kills,damage:0,death:0,assists:0,rescue_members:0,headshots}]}]});
 const player=mvp.roster([make('1',3,1),make('2',5,3)])[0];
 assert.equal(player.hs,'50%');assert.equal(player.kd,8);assert.equal(player.assists,0);assert.equal(mvp.stat(null),'—');assert.equal(mvp.stat(0),'0');
});
test('CS MVP draws the six requested stats within the supplied frame and replaces the example logo',()=>{
 const text=[],images=[],rects=[],ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},clearRect(){},measureText(s){return {width:s.length*20};},fillText(...args){text.push(args);},drawImage(...args){images.push(args);},fillRect(...args){rects.push(args);}};
 mvp.draw(ctx,{frame:{},portrait:{width:500,height:900},logo:{width:100,height:100},player:{name:'WLF_GIAVAN',kills:6,damage:10000,assists:null,hs:'50.50%',kd:6,death:0},font:'Arial'});
 for(const value of ['10000','50.50%','—','WLF_GIAVAN'])assert.ok(text.some(t=>t[0]===value),value);
 assert.ok(!text.some(t=>['ELIMS','DMG','ASSISTS','HS','K/D','DEATH'].includes(t[0])),'Labels already exist in the supplied frame'); assert.ok(images.length>=4);assert.ok(rects.some(r=>r[0]===734&&r[1]===891));
 assert.ok(text.every(t=>t[1]>=138&&t[1]<=1812&&t[2]>=540&&t[2]<=982));
});

test('overlay still loads the new frame and stats when portrait or logo fails',async()=>{
 const frame={name:'frame'};
 const assets=await mvp.artwork(Promise.resolve(frame),'broken-photo','broken-logo',async()=>{throw Error('missing image');});
 assert.equal(assets.frame,frame);assert.equal(assets.portrait,null);assert.equal(assets.logo,null);assert.equal(assets.warnings.length,2);
 await assert.rejects(()=>mvp.artwork(Promise.reject(Error('frame missing')),null,null,async()=>{}),/frame missing/);
});

test('fetch selects the first Player automatically and allows a manual override until the next fetch',()=>{
 const rows=[{key:'ID:1'},{key:'ID:2'}];
 assert.equal(mvp.selection(rows,'',true),'ID:1');
 assert.equal(mvp.selection(rows,'ID:2',false),'ID:2');
 assert.equal(mvp.selection(rows,'ID:2',true),'ID:1');
 assert.equal(mvp.selection([], 'ID:2',true),'');
});

test('MVP ASSISTS uses cumulative rescue_members instead of the unrelated assists field',()=>{
 const make=(id,rescue)=>({id,teams:[{player_data:[{player_id:'1',player_name:'P',kills:2,death:1,damage:100,rescue_members:rescue,assists:99}]}]});
 assert.equal(mvp.roster([make('1',2),make('2',3)])[0].assists,5);
 assert.equal(mvp.roster([make('1',0)])[0].assists,0);
 assert.equal(mvp.roster([make('1',undefined)])[0].assists,null);
});

test('short logos match exact team first, then player prefix, with explicit override available',()=>{
 const normalize=s=>String(s||'').replace(/\.png$/i,'').replace(/[^a-z0-9]/gi,'').toUpperCase(),keys=['SOK','LLE','ASB','WLF'];
 assert.equal(mvp.logoKey({team_name:'WLF'},keys,normalize),'WLF');
 assert.equal(mvp.logoKey({team_name:'Squad 1',name:'WLF_GIAVAN'},keys,normalize),'WLF');
 assert.equal(mvp.logoKey({team_name:'Squad 1',name:'ASB.Player'},keys,normalize),'ASB');
 assert.equal(mvp.logoKey({team_name:'Squad 1',name:'WLFOTHER'},keys,normalize),'');
 assert.equal(mvp.logoKey({team_name:'WLF'},keys,normalize,'SOK'),'SOK');
 assert.equal(mvp.logoKey({team_name:'ASB'},keys,normalize,'deleted'),'ASB');
});
