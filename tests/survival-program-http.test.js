const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createBroadcast}=require('../broadcast'),{createFileStore}=require('../broadcast-store');
test('survival and CS program links, clocks and source frames are isolated',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ff-br-program-'));let now=0;const handler=createBroadcast({store:createFileStore(dir),now:()=>now});
 const server=http.createServer(async(req,res)=>{if(!await handler(req,res,new URL(req.url,'http://'+req.headers.host),req.headers.authorization==='test')){res.writeHead(401);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(route,data)=>fetch(base+'/api/broadcast/'+route,{method:'POST',headers:{authorization:'test'},body:Buffer.isBuffer(data)?data:JSON.stringify(data)});
 try{
  assert.equal((await fetch(base+'/api/broadcast/br-overlay/program',{method:'POST',body:'{}'})).status,401);
  for(const [i,kind] of ['mvp','booyah','h2h','cs-mvp','cs-gameres','cs-summary'].entries()){const png=Buffer.alloc(25);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1920,16);png.writeUInt32BE(1080,20);png[24]=i;assert.equal((await post(kind,png)).status,200);}
  const br=await (await post('br-overlay/program',{action:'start',interval:90000})).json(),cs=await (await post('cs-overlay/program',{action:'start',interval:90000})).json();assert.notEqual(br.url,cs.url);
  const read=async link=>(await fetch(base+link+'.json')).json();now=91000;let b=await read(br.url);assert.equal(b.kind,'booyah');assert.equal((await read(cs.url)).kind,'cs-gameres');
  const image=Buffer.from(await (await fetch(base+br.url+'.png?v='+b.version)).arrayBuffer());assert.equal(image[24],1);
  const foreign=await read(cs.url);assert.equal((await fetch(base+br.url+'.png?v='+foreign.version)).status,404);
  await post('br-overlay/program',{action:'pause'});now=250000;assert.equal((await read(br.url)).kind,'booyah');assert.equal((await read(cs.url)).kind,'cs-summary');
  await post('br-overlay/program',{action:'resume'});now+=89000;b=await read(br.url);assert.equal(b.kind,'h2h');assert.equal(b.program.finished,true);
 }finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
