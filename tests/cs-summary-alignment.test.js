const test=require('node:test'),assert=require('node:assert/strict'),layout=require('../public/cs-summary-layout');
function render(format='bo5'){
 const texts=[],images=[],fills=[];const ctx={clearRect(){},fillRect(...a){fills.push(a);},drawImage(...a){images.push(a);},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},measureText(value){return {width:String(value).length*15,actualBoundingBoxAscent:this.textBaseline==='alphabetic'?36:8,actualBoundingBoxDescent:this.textBaseline==='alphabetic'?0:28};},fillText(value,x,y){texts.push({value,x,y,font:this.font,baseline:this.textBaseline});}};
 const logos=[{width:100,height:100},{width:200,height:100}],model={teams:[{team_name:'LLE',players:[{name:'PLAYER',kills:2,death:1,assists:3,kda:2,damage:9226,knock_down:4}]},{team_name:'TEAM TWO',players:[]}],games:[]};
 layout.draw(ctx,{format,frame:{},model,games:[],teamLogos:logos,font:(_,size)=>'400 '+size+'px Arial'});return {texts,images,fills,logos};
}
test('BO5 team names share the visible vertical center of their logos and stay in a separate name area',()=>{
 const {texts,images,logos}=render();for(const [i,name] of ['LLE','TEAM TWO'].entries()){
  const text=texts.find(t=>t.value===name),image=images.find(a=>a[0]===logos[i]),logoCenter=image[2]+image[4]/2;
  assert.equal(text.baseline,'alphabetic');assert.equal(text.y-18,logoCenter,'visible glyph center must match logo center');
  assert.equal(text.x,300);assert.ok(image[1]+image[3]<=216,'logo must end before the name area');
 }
});
test('BO5 redraws the title and all column labels in the exact GFF VN Black family',()=>{
 const {texts,fills}=render();assert.ok(texts.some(t=>t.value==='MATCH SUMMARY'));
 for(const label of ['ELIMS','DEATH','ASSIST','KDA','DAMAGE','KNOCKDOWN'])assert.equal(texts.filter(t=>t.value===label).length,2,label);
 assert.ok(texts.every(t=>t.font.includes('"GFFVNBlack"')));
 assert.ok(fills.some(r=>r[0]===112&&r[1]===262&&r[2]===1163&&r[3]===88));
 assert.ok(texts.some(t=>t.value==='9226'));
 const bo3=render('bo3');assert.ok(!bo3.texts.some(t=>t.value==='MATCH SUMMARY'));assert.ok(bo3.texts.every(t=>t.font.includes('Arial')));
});
