const test=require('node:test'),assert=require('node:assert/strict');
const {defaults,settings}=require('../preview-settings');const {shouldAnimate,keyframes}=require('../public/broadcast-viewer');
test('animation settings validate and preserve unrelated choices',()=>{
 assert.equal(settings({effect:'zoom',duration:1500}).effect,'zoom');
 assert.equal(settings({visible:false},{...defaults,effect:'left'}).effect,'left');
 assert.throws(()=>settings({duration:0}));assert.throws(()=>settings({effect:'<script>'}));assert.throws(()=>settings({visible:'false'}));
 assert.equal(Object.keys(keyframes).length,6);
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
