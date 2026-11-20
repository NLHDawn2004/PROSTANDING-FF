const test=require('node:test'),assert=require('node:assert/strict');
const {parseDuration}=require('../public/overlay-program-client');
test('duration accepts one minutes/seconds field including the requested 1 minute 30 seconds',()=>{
 for(const text of ['01:30','1:30','1 phút 30s','1 phút 30 giây','90s','90'])assert.equal(parseDuration(text),90000,text);
 assert.equal(parseDuration('2 phút'),120000);assert.equal(parseDuration('60:00'),3600000);
 for(const text of ['', '0:00','1:90','-1','abc','1:30oops','61:00','1.5','1 phút -30s'])assert.throws(()=>parseDuration(text),text);
});
test('reopening controls does not overwrite program frames with empty overlays before Match IDs load',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),window={};let exports=0;
 const controls=new Map(),panel={querySelector(selector){if(!controls.has(selector))controls.set(selector,{type:selector.includes('duration')?'number':'checkbox',setAttribute(){}});return controls.get(selector);}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/broadcast-client.js'),'utf8'),{window,document:{createElement:()=>panel},localStorage:{getItem:key=>key.includes('enabled')?'true':'{}'},crypto:{subtle:{digest:()=>new Promise(()=>{})}}});
 const anchor={disabled:true,after(){}},canvas={toBlob(callback){exports++;callback({size:1,arrayBuffer:async()=>new ArrayBuffer(1)});}};
 window.BroadcastPreview.mount('cs-mvp',canvas,anchor);window.BroadcastPreview.update('cs-mvp');assert.equal(exports,0);
 anchor.disabled=false;window.BroadcastPreview.update('cs-mvp');assert.equal(exports,1);
});
