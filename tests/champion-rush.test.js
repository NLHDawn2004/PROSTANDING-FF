const test=require('node:test'),assert=require('node:assert/strict');
const cpr=require('../public/champion-rush.js');
test('threshold is inclusive and champion has gold priority',()=>{
 const settings={enabled:true,threshold:70,champion:' Team A '};
 assert.equal(cpr.kind({name:'B',total:69},settings),null);
 assert.equal(cpr.kind({name:'B',total:70},settings),'white');
 assert.equal(cpr.kind({name:'team a',total:70},settings),'gold');
 assert.equal(cpr.kind({name:'team a',total:5},settings),'gold');
 assert.equal(cpr.kind({name:'B',total:100},{...settings,enabled:false}),null);
 assert.equal(cpr.kind({name:'B',total:100},{...settings,threshold:''}),null);
});
