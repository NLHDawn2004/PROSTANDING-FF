const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function viewer(kind,effect='broadcast',initialVisible=true){
 let state={kind,version:'one',settings:{effect,duration:4000,visible:initialVisible,onOpen:false,onUpdate:false,titleFlash:false,replay:''}},poll;
 const animations=[];
 function element(){return {style:{},children:[],append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},decode:async()=>{},animate(frames,options){let finish;const motion={frames,options,finished:new Promise(resolve=>{finish=resolve;}),cancelled:false,cancel(){this.cancelled=true;finish();},finish(){finish();}};animations.push(motion);return motion;}};}
 const frame=element(),body=element();class Image{set src(value){this.onload();}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/broadcast-viewer.js'),'utf8'),{window:{},document:{body,getElementById:()=>frame,createElement:element},Image,location:{pathname:'/broadcast/test'},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout(fn){poll=fn;},fetch:async url=>url.includes('.json')?{ok:true,json:async()=>structuredClone(state)}:{ok:true,blob:async()=>({})}});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));await settle();
 return {frame,animations,parts:body.children[0].children[0],async update(visible){state.settings.visible=visible;await poll();await settle();},async finish(){animations.forEach(a=>a.finish());await settle();}};
}
test('Hide reverses Esports for every CS overlay, lasts the selected duration and survives polling',async()=>{
 for(const kind of ['cs-mvp','cs-summary','cs-gameres']){
  const ui=await viewer(kind);await ui.update(false);
  assert.ok(ui.animations.length>2,'Hide must animate '+kind);
  assert.ok(ui.parts.children.length>0);assert.equal(ui.frame.style.visibility,'hidden');
  assert.ok(ui.animations.every(a=>a.options.direction==='reverse'));
  assert.equal(Math.max(...ui.animations.map(a=>a.options.duration+(a.options.delay||0))),4000);
  await ui.update(false);assert.ok(ui.animations.every(a=>!a.cancelled),'polling must preserve the exit');
  await ui.finish();assert.equal(ui.frame.style.visibility,'hidden');assert.equal(ui.parts.children.length,0);
 }
});
test('Hide reverses basic effects; showing again cancels exit without leaving a hidden frame',async()=>{
 for(const effect of ['fade','left','right','up','zoom']){
  const ui=await viewer('cs-mvp',effect);await ui.update(false);assert.equal(ui.animations.length,1);
  assert.equal(ui.animations[0].options.direction,'reverse');assert.equal(ui.animations[0].options.duration,4000);
  assert.equal(ui.frame.style.visibility,'visible');await ui.update(true);assert.equal(ui.animations[0].cancelled,true);
  await ui.finish();assert.equal(ui.frame.style.visibility,'visible');
  await ui.update(false);await ui.finish();assert.equal(ui.frame.style.visibility,'hidden');
 }
});
test('hidden previews never play an exit on load; none hides immediately and survival previews stay unchanged',async()=>{
 const hidden=await viewer('cs-mvp','broadcast',false);assert.equal(hidden.animations.length,0);assert.equal(hidden.frame.style.visibility,'hidden');
 for(const [kind,effect] of [['cs-mvp','none'],['mvp','fade']]){const ui=await viewer(kind,effect);await ui.update(false);assert.equal(ui.animations.length,0);assert.equal(ui.frame.style.visibility,'hidden');}
});
test('Show interrupts Esports exit and stale completion cannot hide the new entrance',async()=>{
 const ui=await viewer('cs-summary');await ui.update(false);const exit=[...ui.animations];assert.ok(exit.length>0);
 await ui.update(true);assert.ok(exit.every(a=>a.cancelled));assert.ok(ui.parts.children.length>0);
 await ui.finish();assert.equal(ui.frame.style.visibility,'visible');assert.equal(ui.parts.children.length,0);
});
