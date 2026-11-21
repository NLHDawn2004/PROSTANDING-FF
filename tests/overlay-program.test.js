const test=require('node:test'),assert=require('node:assert/strict');
const {command,snapshot,kinds}=require('../overlay-program');
test('survival program uses exactly MVP, BOOYAH, HEAD TO HEAD and keeps independent CS timing',()=>{
 const sequence=require('../overlay-program').survivalKinds;
 assert.deepEqual(sequence,['mvp','booyah','h2h']);
 const br=command(null,{action:'start',interval:90000},1000,sequence),cs=command(null,{action:'start',interval:90000},1000);
 assert.equal(snapshot(br,1000).kind,'mvp');assert.equal(snapshot(br,91000).kind,'booyah');assert.equal(snapshot(br,181000).kind,'h2h');assert.equal(snapshot(br,999999).finished,true);
 assert.equal(snapshot(cs,91000).kind,'cs-gameres');assert.equal(snapshot(cs,181000).kind,'cs-summary');
 const paused=command(br,{action:'pause'},121000);assert.equal(snapshot(paused,999999).kind,'booyah');assert.equal(snapshot(paused,999999).remaining,60000);
 const resumed=command(paused,{action:'resume'},1000000);assert.equal(snapshot(resumed,1060000).kind,'h2h');
});
test('program advances MVP, GAMERES, SUMARY then holds the last overlay',()=>{
 const p=command(null,{action:'start',interval:90000},1000);
 for(const [time,index] of [[1000,0],[90999,0],[91000,1],[181000,2],[900000,2]])assert.equal(snapshot(p,time).index,index);
 assert.equal(snapshot(p,181000).finished,true);assert.deepEqual(kinds,['cs-mvp','cs-gameres','cs-summary']);
});
test('pause freezes current overlay and resume preserves remaining dwell time even after long delays',()=>{
 let p=command(null,{action:'start',interval:90000},1000);p=command(p,{action:'pause'},121000);
 assert.equal(snapshot(p,900000).index,1);assert.equal(snapshot(p,900000).remaining,60000);
 p=command(p,{action:'pause'},900000);assert.equal(snapshot(p,900000).remaining,60000);
 p=command(p,{action:'resume'},1000000);assert.equal(snapshot(p,1059999).index,1);assert.equal(snapshot(p,1060000).index,2);
 p=command(p,{action:'resume'},1060001);assert.equal(snapshot(p,1060001).index,2);
});
test('commands validate intervals, do not reset a running resume and restart begins at MVP',()=>{
 for(const interval of [0,-1,NaN,Infinity,'90000',3600001])assert.throws(()=>command(null,{action:'start',interval},0));
 assert.throws(()=>command(null,{action:'resume'},0));assert.throws(()=>command(null,{action:'hack'},0));
 let p=command(null,{action:'start',interval:1000},0);p=command(p,{action:'resume'},1500);assert.equal(snapshot(p,1600).index,1);
 p=command(p,{action:'start',interval:90000},100000);assert.equal(snapshot(p,100000).index,0);
});
