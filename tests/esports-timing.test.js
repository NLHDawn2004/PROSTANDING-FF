const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');
function element(){return {style:{},children:[],append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(){},decode:async()=>{}};}
async function entrance(kind,duration){
 const frame=element(),body=element(),animations=[];
 const document={body,getElementById:()=>frame,createElement:()=>{const el=element();el.animate=(frames,options)=>{animations.push({el,frames,options});return {finished:new Promise(()=>{}),cancel(){}};};return el;}};
 class Image{set src(value){this.onload();}}
 vm.runInNewContext(source('broadcast-viewer.js'),{document,window:{},Image,location:{pathname:'/broadcast/test'},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout(){},fetch:async url=>url.includes('.json')?{ok:true,json:async()=>({kind,version:'one',settings:{effect:'broadcast',duration,visible:true,onOpen:true,titleFlash:false}})}:{ok:true,blob:async()=>({})}});
 await new Promise(resolve=>setImmediate(resolve));return animations;
}
test('Esports entrance uses the complete requested duration for every overlay and dark green/yellow sweeps',async()=>{
 for(const kind of ['cs-mvp','cs-summary','cs-gameres'])for(const duration of [100,600,1200,4000,5000]){
  const animations=await entrance(kind,duration);assert.ok(animations.length>2);
  const end=Math.max(...animations.map(a=>a.options.duration+(a.options.delay||0)));
  assert.ok(Math.abs(end-duration)<.001,kind+': requested '+duration+'ms, got '+end+'ms');
  assert.deepEqual(animations.filter(a=>a.el.style.background).map(a=>a.el.style.background),['#006400','#effb58']);
 }
});
function controls(saved){
 const inputs=new Map(),buttons=new Map(),status={},output={replaceChildren(){},append(){}},sent=[];
 const panel={querySelector(selector){if(selector==='.preview-status')return status;if(selector==='.preview-link')return output;
  const setting=selector.match(/data-setting="([^"]+)"/);if(setting){if(!inputs.has(setting[1]))inputs.set(setting[1],{type:setting[1]==='duration'?'number':['onOpen','onUpdate','titleFlash'].includes(setting[1])?'checkbox':'select'});return inputs.get(setting[1]);}
  const action=selector.match(/data-action="([^"]+)"/)[1];if(!buttons.has(action))buttons.set(action,{setAttribute(){}});return buttons.get(action);}};
 const stored=new Map([['ff-preview-cs-mvp',JSON.stringify(saved)]]),window={};
 vm.runInNewContext(source('broadcast-client.js'),{window,document:{createElement:()=>panel},localStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)},crypto:{randomUUID:()=> 'replay'},location:{origin:'http://localhost'},URL,fetch:(url,options)=>{sent.push({url,...options});return new Promise(()=>{});}});
 window.BroadcastPreview.mount('cs-mvp',{}, {after(){} });return {inputs,buttons,stored,sent};
}
test('saved 600ms is respected and editing duration before Show sends the latest value',()=>{
 const ui=controls({effect:'broadcast',duration:600});assert.equal(Number(ui.inputs.get('duration').value),600);
 const input=ui.inputs.get('duration');input.value='4000';assert.equal(typeof input.oninput,'function');input.oninput();
 ui.buttons.get('show').onclick();assert.equal(JSON.parse(ui.sent[0].body).duration,4000);
 assert.equal(JSON.parse(ui.stored.get('ff-preview-cs-mvp')).duration,4000);
});
