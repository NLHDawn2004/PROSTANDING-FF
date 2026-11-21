const test=require('node:test'),assert=require('node:assert/strict');
const {defaults,settings}=require('../preview-settings');const {shouldAnimate,keyframes}=require('../public/broadcast-viewer');
test('animation settings validate and preserve unrelated choices',()=>{
 assert.equal(settings({effect:'zoom',duration:1500}).effect,'zoom');
 assert.equal(settings({visible:false},{...defaults,effect:'left'}).effect,'left');
 assert.throws(()=>settings({duration:0}));assert.throws(()=>settings({effect:'<script>'}));assert.throws(()=>settings({visible:'false'}));
 assert.equal(Object.keys(keyframes).length,8);
});
test('effects run only for selected events; polling same frame never repeats',()=>{
 assert.equal(shouldAnimate(defaults,{first:true}),true);
 assert.equal(shouldAnimate(defaults,{changed:false,replayed:false,shown:false,first:false}),false);
 assert.equal(shouldAnimate({...defaults,onUpdate:false},{changed:true,first:false}),false);
 assert.equal(shouldAnimate(defaults,{changed:true,first:false}),true);
 assert.equal(shouldAnimate({...defaults,visible:false},{replayed:true}),false);
 assert.equal(shouldAnimate(defaults,{replayed:true,first:false}),true);
 assert.equal(shouldAnimate({...defaults,effect:'none'},{first:true}),false);
});

test('broadcast entrance partitions every overlay into exact non-overlapping regions',()=>{
 const {regions,titlePixel}=require('../public/broadcast-viewer');
 for(const kind of ['cs-mvp','cs-summary','cs-gameres','mvp','booyah','h2h']){const rows=regions(kind);assert.equal(rows.reduce((n,r)=>n+r.w*r.h,0),1920*1080);for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}}
 assert.equal(titlePixel(200,200,237,250,94,255),true);assert.equal(titlePixel(200,700,237,250,94,255),false);assert.equal(titlePixel(900,300,10,10,10,255),false);
 assert.equal(settings({effect:'broadcast',titleFlash:true}).titleFlash,true);assert.throws(()=>settings({titleFlash:'yes'}));
});
