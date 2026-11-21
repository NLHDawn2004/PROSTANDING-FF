const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createBroadcast}=require('../broadcast'),{createFileStore}=require('../broadcast-store');
test('preview video supports byte ranges and requires a valid survival preview link',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ff-video-')),handler=createBroadcast({store:createFileStore(dir)});
 const server=http.createServer(async(req,res)=>{if(!await handler(req,res,new URL(req.url,'http://'+req.headers.host),true)){res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1920,16);png.writeUInt32BE(1080,20);
  const publish=async kind=>(await (await fetch(base+'/api/broadcast/'+kind,{method:'POST',body:png})).json()).url;
  const url=await publish('mvp'),asset=await fs.readFile(path.join(__dirname,'../public/survival-transition.webm'));
  const response=await fetch(base+url+'/transition.webm',{headers:{Range:'bytes=0-255'}});assert.equal(response.status,206);assert.match(response.headers.get('content-type'),/video\/webm/);assert.equal(response.headers.get('content-range'),'bytes 0-255/'+asset.length);assert.deepEqual(Buffer.from(await response.arrayBuffer()),asset.subarray(0,256));
  const suffix=await fetch(base+url+'/transition.webm',{headers:{Range:'bytes=-32'}});assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),asset.subarray(-32));
  assert.equal((await fetch(base+url+'/transition.webm',{headers:{Range:'bytes=999999999-'}})).status,416);
  assert.equal((await fetch(base+url+'/transition.webm')).status,200);
  const cs=await publish('cs-mvp');assert.equal((await fetch(base+cs+'/transition.webm')).status,404);
  assert.equal((await fetch(base+'/broadcast/'+ '0'.repeat(48)+'/transition.webm')).status,404);
 }finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
