const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createBroadcast}=require('../broadcast');
test('preview requires authenticated publishing, gives token link and serves current PNG',async()=>{
 const handler=createBroadcast();const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://'+req.headers.host);if(!await handler(req,res,url,req.headers.authorization==='test')){res.writeHead(401);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base+'/api/broadcast/mvp',{method:'POST'})).status,401);
  assert.equal((await fetch(base+'/api/broadcast/mvp',{method:'POST',headers:{authorization:'test'},body:'bad'})).status,400);
  const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1920,16);png.writeUInt32BE(1080,20);
  const result=await fetch(base+'/api/broadcast/mvp',{method:'POST',headers:{authorization:'test'},body:png});assert.equal(result.status,200);const {url}=await result.json();
  assert.match(url,/^\/broadcast\/[a-f0-9]{48}$/);const page=await fetch(base+url);assert.equal(page.status,200);assert.match(await page.text(),/object-fit:contain/);
  const frame=await fetch(base+url+'.png');assert.equal(frame.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await frame.arrayBuffer()),png);
  const next=await fetch(base+'/api/broadcast/mvp',{method:'POST',headers:{authorization:'test'},body:png});assert.equal((await next.json()).url,url);
 }finally{await new Promise(r=>server.close(r));}
});
