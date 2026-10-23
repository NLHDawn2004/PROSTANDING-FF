const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {settings,defaults}=require('./preview-settings');
const {createFileStore,createBlobStore}=require('./broadcast-store');
function createBroadcast(options={}){
 const store=options.store||(process.env.VERCEL?createBlobStore():createFileStore());
 const locks=new Map();
 const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);};
 async function tokenFor(kind){return crypto.createHmac('sha256',await store.secret()).update('preview-v2:'+kind).digest('hex').slice(0,48);}
 async function exclusive(key,fn){const previous=locks.get(key)||Promise.resolve();const task=previous.catch(()=>{}).then(fn);locks.set(key,task);try{return await task;}finally{if(locks.get(key)===task)locks.delete(key);}}
 async function body(req,max){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('Dữ liệu vượt giới hạn tải lên.');chunks.push(chunk);}return Buffer.concat(chunks);}
 const viewer=()=>fs.readFileSync(path.join(__dirname,'public/broadcast-viewer.js'));
 return async function(req,res,url,authenticated=false){
  const write=url.pathname.match(/^\/api\/broadcast\/(mvp|h2h|standings)(\/control)?$/);
  if(write&&req.method==='POST'&&authenticated){
   if(req.headers.origin&&req.headers.origin!==url.origin){send(res,403,'{"error":"Invalid origin"}');return true;}
   try{
    const token=await tokenFor(write[1]),data=await body(req,write[2]?4096:4*1024*1024);
    const result=await exclusive(token,async()=>{
     let state=await store.get(token)||{settings:{...defaults},version:null,recent:[]};let stale=[];
     if(write[2])state.settings=settings(JSON.parse(data.toString()),state.settings);
     else{
      if(data.length<24||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.readUInt32BE(16)!==1920||data.readUInt32BE(20)!==1080)throw Error('Expected 1920x1080 PNG');
      const version=crypto.createHash('sha256').update(data).digest('hex');
      if(version!==state.version){await store.putImage(token,version,data);state.version=version;const versions=[version,...(state.recent||[]).filter(v=>v!==version)];state.recent=versions.slice(0,3);stale=versions.slice(3);}
     }
     state.updatedAt=Date.now();await store.set(token,state);for(const version of stale)await store.removeImage(token,version).catch(()=>{});return state;
    });
    send(res,200,JSON.stringify({url:'/broadcast/'+token,settings:result.settings,version:result.version}));
   }catch(error){send(res,/Expected|hợp lệ|Thời gian|giới hạn|JSON/.test(error.message)?400:503,JSON.stringify({error:error.message}));}
   return true;
  }
  const view=url.pathname.match(/^\/broadcast\/([a-f0-9]{48})(\.png|\.json|\/viewer\.js)?$/);
  if(!view||req.method!=='GET')return false;
  try{
   const state=await store.get(view[1]);if(!state){send(res,404,'Preview unavailable','text/plain');return true;}
   if(view[2]==='/viewer.js'){send(res,200,viewer(),'text/javascript');return true;}
   if(view[2]==='.json'){send(res,200,JSON.stringify({version:state.version,settings:state.settings}));return true;}
   if(view[2]==='.png'){
    const requested=url.searchParams.get('v')||state.version;if(!requested||!state.recent.includes(requested)){send(res,404,'Frame unavailable','text/plain');return true;}
    const data=await store.image(view[1],requested);if(!data){send(res,404,'Frame unavailable','text/plain');return true;}send(res,200,data,'image/png');return true;
   }
   send(res,200,`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FF Standings Preview</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}img{width:100%;height:100%;object-fit:contain;display:block;visibility:hidden}</style></head><body><img id="frame" alt=""><script src="${url.pathname}/viewer.js"></script></body></html>`,'text/html; charset=utf-8');
  }catch{send(res,503,'Preview temporarily unavailable','text/plain');}return true;
 };
}
module.exports={createBroadcast};
