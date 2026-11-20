const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createBroadcast}=require('../broadcast'),{createFileStore}=require('../broadcast-store');
test('one persistent program preview selects current source and freezes on pause across cold instances',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ff-program-'));let now=1000;
 const servers=[0,1].map(()=>{const handler=createBroadcast({store:createFileStore(directory),now:()=>now});return http.createServer(async(req,res)=>{if(!await handler(req,res,new URL(req.url,'http://'+req.headers.host),req.headers.authorization==='test')){res.writeHead(401);res.end();}});});
 await Promise.all(servers.map(s=>new Promise(r=>s.listen(0,'127.0.0.1',r))));const bases=servers.map(s=>'http://127.0.0.1:'+s.address().port);
 const control=(body,base=bases[0])=>fetch(base+'/api/broadcast/cs-overlay/program',{method:'POST',headers:{authorization:'test','Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await fetch(bases[0]+'/api/broadcast/cs-overlay/program',{method:'POST',body:'{}'})).status,401);
  assert.equal((await control({action:'start',interval:90000})).status,400);
  const images=[];
  for(const [i,kind] of ['cs-mvp','cs-summary','cs-gameres'].entries()){
   const png=Buffer.alloc(25);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1920,16);png.writeUInt32BE(1080,20);png[24]=i;images.push(png);
   assert.equal((await fetch(bases[0]+'/api/broadcast/'+kind,{method:'POST',headers:{authorization:'test'},body:png})).status,200);
   await fetch(bases[0]+'/api/broadcast/'+kind+'/control',{method:'POST',headers:{authorization:'test'},body:JSON.stringify({visible:false,effect:'broadcast',duration:4000})});
  }
  const start=await control({action:'start',interval:90000});assert.equal(start.status,200);const {url}=await start.json();
  const read=async()=>{const r=await fetch(bases[1]+url+'.json');assert.equal(r.status,200);return r.json();};
  let state=await read();assert.equal(state.kind,'cs-mvp');assert.equal(state.settings.visible,true);assert.equal(state.settings.duration,4000);const firstVersion=state.version;
  now=91000;state=await read();assert.equal(state.kind,'cs-summary');assert.notEqual(state.version,firstVersion);
  assert.deepEqual(Buffer.from(await (await fetch(bases[1]+url+'.png?v='+state.version)).arrayBuffer()),images[1]);
  assert.deepEqual(Buffer.from(await (await fetch(bases[1]+url+'.png?v='+firstVersion)).arrayBuffer()),images[0]);
  now=121000;const paused=await control({action:'pause'},bases[1]);assert.equal((await paused.json()).url,url);
  now=999000;state=await read();assert.equal(state.kind,'cs-summary');assert.equal(state.program.running,false);assert.equal(state.program.remaining,60000);
  const updated=Buffer.from(images[1]);updated[24]=8;
  await fetch(bases[0]+'/api/broadcast/cs-summary',{method:'POST',headers:{authorization:'test'},body:updated});
  state=await read();assert.equal(state.kind,'cs-summary');assert.equal(state.program.running,false);
  assert.deepEqual(Buffer.from(await (await fetch(bases[1]+url+'.png?v='+state.version)).arrayBuffer()),updated);
  assert.equal((await control({action:'resume'})).status,200);now+=60000;state=await read();assert.equal(state.kind,'cs-gameres');assert.equal(state.program.finished,true);
  assert.equal((await fetch(bases[0]+url)).status,200);assert.equal((await fetch(bases[0]+url+'/viewer.js')).status,200);
  assert.equal((await fetch(bases[0]+url+'.png?v=cs-mvp-bad')).status,404);
  assert.equal((await control({action:'start',interval:0})).status,400);
  assert.equal((await fetch(bases[0]+'/api/broadcast/cs-overlay/program',{headers:{authorization:'test'}})).status,200);
  assert.equal((await fetch(bases[0]+'/api/broadcast/cs-overlay/program',{method:'POST',headers:{authorization:'test',origin:'https://invalid.example'},body:JSON.stringify({action:'pause'})})).status,403);
 }finally{await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));await fs.rm(directory,{recursive:true,force:true});}
});
