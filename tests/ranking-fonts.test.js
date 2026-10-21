const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../public/ranking-fonts.js');
test('custom fonts are independent by role and invalid choices use the default',()=>{
  assert.ok(fs.existsSync(file),'Font selection is not implemented');
  const fonts=require(file),selection={name:'gff-latin-regular',stats:'gff-latin-bold',title:'gff-vn-black'};
  assert.match(fonts.font('name',30,700,selection),/^400 30px "GFFLatinRegular"/);
  assert.match(fonts.font('stats',36,900,selection),/^400 36px "GFFLatinBold"/);
  assert.match(fonts.font('title',46,900,selection),/^400 46px "GFFVNBlack"/);
  assert.equal(fonts.font('name',30,700,{name:'invalid'}),'700 30px Arial,sans-serif');
});
test('FN and FFPT PNG drawing use the selected name, score and title fonts',async()=>{
  assert.ok(fs.existsSync(file),'Font selection is not implemented');
  const selection={name:'gff-latin-regular',stats:'gff-latin-bold',title:'gff-vn-black'};
  const calls=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(){},measureText:()=>({width:10}),fillText(text){calls.push({text,font:this.font})}};
  const team={name:'ĐỘI VIỆT NAM',total:123,kills:87,booyah:3};
  for(const [module,titleCount] of [['standing-fn.js',1],['standing-ffpt.js',1]]){
    calls.length=0;
    await require('../public/'+module).draw(ctx,[team],async()=>({width:10,height:10}),()=>'',{fonts:selection},'GIẢI ĐẤU');
    assert.match(calls[titleCount].font,/GFFLatinRegular/);
    assert.match(calls[titleCount+1].font,/GFFLatinBold/);
    if(titleCount)assert.match(calls[0].font,/GFFVNBlack/);
  }
});
test('font loading fails explicitly when a selected font cannot be loaded',async()=>{
  assert.ok(fs.existsSync(file),'Font selection is not implemented');
  const fonts=require(file);
  await assert.rejects(fonts.load({name:'gff-latin-regular'},{fonts:{load:async()=>[]}}),/font/i);
});
