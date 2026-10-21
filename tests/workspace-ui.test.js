const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../public/workspace-ui.js');
test('board fits narrow screens without clipping and uses its actual 16:9 height',()=>{
  assert.ok(fs.existsSync(file),'Responsive workspace is not implemented');
  const {boardLayout}=require(file);
  const mobile=boardLayout(300,800,false);
  assert.ok(mobile.scale*1920<=268);
  assert.equal(mobile.height,183);
  const desktop=boardLayout(1000,900,false);
  assert.ok(desktop.scale*1920<=968);
  assert.equal(desktop.height,577);
});
test('fullscreen board fits both axes and never enlarges the original artwork',()=>{
  assert.ok(fs.existsSync(file),'Responsive workspace is not implemented');
  const {boardLayout}=require(file);
  const fit=boardLayout(1920,600,true);
  assert.ok(fit.height<=600);assert.ok(fit.scale*1920<=1888);
  assert.equal(boardLayout(3000,2000,false).scale,1);
});
