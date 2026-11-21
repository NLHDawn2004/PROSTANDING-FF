const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function mount(kind,saved={}){
 const fields=new Map(),stored=new Map([['ff-preview-'+kind,JSON.stringify(saved)]]),window={};
 const panel={querySelector(selector){if(!fields.has(selector))fields.set(selector,{type:selector.includes('duration')?'number':selector.includes('effect')?'select':'checkbox',textContent:'',prepend(option){this.option=option;},setAttribute(){}});return fields.get(selector);}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/broadcast-client.js'),'utf8'),{window,document:{createElement:tag=>tag==='fieldset'?panel:{}},localStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)}});
 window.BroadcastPreview.mount(kind,{}, {after(){}});return {fields,stored};
}
test('all three survival overlays select the supplied video once, preserve subsequent choices, and leave CS alone',()=>{
 for(const kind of ['mvp','booyah','h2h']){
  const ui=mount(kind);assert.equal(ui.fields.get('[data-setting="effect"]').value,'video');assert.equal(Number(ui.fields.get('[data-setting="duration"]').value),3000);
  const saved=JSON.parse(ui.stored.get('ff-preview-'+kind));assert.equal(saved.videoPreset,1);
  const later=mount(kind,{...saved,effect:'broadcast'});assert.equal(later.fields.get('[data-setting="effect"]').value,'broadcast');
 }
 const cs=mount('cs-mvp');assert.equal(cs.fields.get('[data-setting="effect"]').value,'broadcast');assert.equal(cs.fields.get('[data-setting="effect"]').option,undefined);
});
test('video duration field rejects unsupported speeds and applies a valid time immediately',()=>{
 const ui=mount('mvp',{duration:100}),input=ui.fields.get('[data-setting="duration"]');assert.equal(Number(input.value),500);assert.equal(input.min,'500');
 input.value='100';input.oninput();assert.match(ui.fields.get('.preview-status').textContent,/500/);
 input.value='4000';input.oninput();assert.equal(JSON.parse(ui.stored.get('ff-preview-mvp')).duration,4000);
});
