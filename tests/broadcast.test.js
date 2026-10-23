const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createBroadcast}=require('../broadcast');
const {createFileStore}=require('../broadcast-store');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
test('preview requires authenticated publishing, gives token link and serves current PNG',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ff-preview-'));const handler=createBroadcast({store:createFileStore(directory)});const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://'+req.headers.host);if(!await handler(req,res,url,req.headers.authorization==='test')){res.writeHead(401);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base+'/api/broadcast/mvp',{method:'POST'})).status,401);
  assert.equal((await fetch(base+'/api/broadcast/mvp',{method:'POST',headers:{authorization:'test'},body:'bad'})).status,400);
  const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1920,16);png.writeUInt32BE(1080,20);
  const result=await fetch(base+'/api/broadcast/mvp',{method:'POST',headers:{authorization:'test'},body:png});assert.equal(result.status,200);const {url}=await result.json();
  assert.match(url,/^\/broadcast\/[a-f0-9]{48}$/);const page=await fetch(base+url);assert.equal(page.status,200);assert.match(await page.text(),/object-fit:contain/);
  const frame=await fetch(base+url+'.png');assert.equal(frame.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await frame.arrayBuffer()),png);
  const next=await fetch(base+'/api/broadcast/mvp',{method:'POST',headers:{authorization:'test'},body:png});assert.equal((await next.json()).url,url);
  const board=await fetch(base+'/api/broadcast/standings',{method:'POST',headers:{authorization:'test'},body:png});assert.equal(board.status,200);const boardUrl=(await board.json()).url;assert.notEqual(boardUrl,url);assert.equal((await fetch(base+boardUrl+'.png')).status,200);
 }finally{await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true});}
});
test('cold server reads same link, animation commands preserve image version and invalid controls reject',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ff-preview-'));
 const servers=[0,1].map(()=>{const handler=createBroadcast({store:createFileStore(directory)});return http.createServer(async(req,res)=>{const url=new URL(req.url,'http://'+req.headers.host);if(!await handler(req,res,url,true)){res.writeHead(404);res.end();}});});
 await Promise.all(servers.map(s=>new Promise(r=>s.listen(0,'127.0.0.1',r))));
 const urls=servers.map(s=>'http://127.0.0.1:'+s.address().port),post=(base,route,data,type='application/json')=>fetch(base+route,{method:'POST',headers:{'Content-Type':type},body:type==='application/json'?JSON.stringify(data):data});
 try{
  const png=Buffer.alloc(25);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1920,16);png.writeUInt32BE(1080,20);
  const first=await (await post(urls[0],'/api/broadcast/mvp',png,'image/png')).json();
  assert.equal((await fetch(urls[1]+first.url)).status,200);
  const command=await post(urls[1],'/api/broadcast/mvp/control',{effect:'left',duration:1200,visible:false,replay:'once'});assert.equal(command.status,200);assert.equal((await command.json()).url,first.url);
  const state=await (await fetch(urls[0]+first.url+'.json')).json();assert.equal(state.version,first.version);assert.equal(state.settings.visible,false);assert.equal(state.settings.effect,'left');
  const bad=await post(urls[1],'/api/broadcast/mvp/control',{effect:'arbitrary'});assert.equal(bad.status,400);
  const repeat=await (await post(urls[1],'/api/broadcast/mvp',png,'image/png')).json();assert.equal(repeat.version,first.version);assert.equal(repeat.settings.visible,false);
  png[24]=1;const updated=await (await post(urls[1],'/api/broadcast/mvp',png,'image/png')).json();assert.notEqual(updated.version,first.version);assert.equal(updated.url,first.url);
  assert.equal((await fetch(urls[0]+first.url+'.png?v='+first.version)).status,200);
  assert.equal((await fetch(urls[1]+first.url+'/viewer.js')).status,200);
 }finally{await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));await fs.rm(directory,{recursive:true,force:true});}
});
