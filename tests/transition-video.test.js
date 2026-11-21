const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function viewer(kind='mvp'){
 let state={kind,version:'one',settings:{effect:'video',duration:3000,visible:true,onOpen:false,onUpdate:true,replay:''}},poll;
 const clips=[],urls=[],body=element();let count=0;
 function element(tag){const el={tag,style:{},children:[],append(...items){for(const item of items)item.parent=this;this.children.push(...items);},replaceChildren(){this.children=[];},remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);},decode:async()=>{},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();},animate(){return {finished:new Promise(()=>{}),cancel(){}};}};if(tag==='video'){el.duration=3.003;clips.push(el);}return el;}
 const frame=element('img');class Image{set src(value){this.onload();}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/broadcast-viewer.js'),'utf8'),{window:{},document:{body,getElementById:()=>frame,createElement:element},Image,location:{pathname:'/broadcast/test'},URL:{createObjectURL:()=> 'blob:'+(++count),revokeObjectURL:url=>urls.push(url)},setTimeout(fn,ms){if(ms===1500)poll=fn;return {fn,ms};},clearTimeout(){},fetch:async url=>url.includes('.json')?{ok:true,json:async()=>structuredClone(state)}:{ok:true,blob:async()=>({})}});
 const settle=()=>new Promise(r=>setImmediate(r));await settle();
 return {frame,clips,urls,async update(update){state={...state,...update,settings:{...state.settings,...update.settings}};await poll();await settle();},async ready(clip){clip.onloadedmetadata();await settle();}};
}
test('survival transition retains old image until video covers the screen, scales duration and cleans up',async()=>{
 for(const kind of ['mvp','booyah','h2h']){
  const ui=await viewer(kind);assert.equal(ui.frame.src,'blob:1');await ui.update({version:'two'});assert.equal(ui.clips.length,1);
  const clip=ui.clips[0];assert.equal(clip.muted,true);assert.match(clip.src,/transition.webm/);assert.equal(ui.frame.src,'blob:1');
  await ui.ready(clip);assert.ok(Math.abs(clip.playbackRate-1.001)<.0001);
  clip.currentTime=.5;clip.ontimeupdate();assert.equal(ui.frame.src,'blob:1');
  clip.currentTime=.9;clip.ontimeupdate();assert.equal(ui.frame.src,'blob:2');assert.ok(ui.urls.includes('blob:1'));
  clip.onended();assert.equal(clip.paused,true);assert.equal(ui.frame.style.visibility,'visible');
 }
});
test('Hide video survives polls, hides at coverage, and interruption does not let a stale callback hide Show',async()=>{
 const ui=await viewer();await ui.update({settings:{visible:false,duration:500}});const hide=ui.clips[0];assert.ok(hide);
 await ui.ready(hide);assert.ok(Math.abs(hide.playbackRate-6.006)<.0001);assert.equal(ui.frame.style.visibility,'visible');
 await ui.update({settings:{visible:false}});assert.equal(hide.paused,false);
 hide.currentTime=.9;hide.ontimeupdate();assert.equal(ui.frame.style.visibility,'hidden');
 await ui.update({settings:{visible:true}});const show=ui.clips[1];assert.equal(hide.paused,true);assert.ok(show);hide.onended();
 await ui.ready(show);show.currentTime=.9;show.ontimeupdate();show.onended();assert.equal(ui.frame.style.visibility,'visible');
});
test('video errors finish on the correct image; CS keeps its existing transition behavior',async()=>{
 const ui=await viewer();await ui.update({version:'two'});ui.clips[0].onerror();assert.equal(ui.frame.src,'blob:2');assert.equal(ui.frame.style.visibility,'visible');
 const {usesVideo}=require('../public/broadcast-viewer');for(const kind of ['cs-mvp','cs-summary','cs-gameres','standings'])assert.equal(usesVideo({kind,settings:{effect:'video'}}),false);
 const {settings}=require('../preview-settings');assert.equal(settings({effect:'video',duration:3000}).effect,'video');assert.throws(()=>settings({effect:'video',duration:100}),/500/);
});
