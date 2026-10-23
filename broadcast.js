const crypto=require('node:crypto');
function createBroadcast(){
 const channels=new Map(),tokens=new Map();
 const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);};
 return async function(req,res,url,authenticated=false){
  const write=url.pathname.match(/^\/api\/broadcast\/(mvp|h2h)$/);
  if(write&&req.method==='POST'&&authenticated){
   if(req.headers.origin&&req.headers.origin!==url.origin){send(res,403,'{"error":"Invalid origin"}');return true;}
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024){send(res,413,'{"error":"Image too large"}');return true;}chunks.push(chunk);}
   const data=Buffer.concat(chunks);
   if(data.length<24||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.readUInt32BE(16)!==1920||data.readUInt32BE(20)!==1080){send(res,400,'{"error":"Expected 1920x1080 PNG"}');return true;}
   let channel=channels.get(write[1]);if(!channel){channel={token:crypto.randomBytes(24).toString('hex')};channels.set(write[1],channel);tokens.set(channel.token,channel);}channel.data=data;
   send(res,200,JSON.stringify({url:'/broadcast/'+channel.token}));return true;
  }
  const view=url.pathname.match(/^\/broadcast\/([a-f0-9]{48})(\.png)?$/);
  if(!view||req.method!=='GET')return false;
  const channel=tokens.get(view[1]);if(!channel){send(res,404,'Preview unavailable','text/plain');return true;}
  if(view[2]){send(res,200,channel.data,'image/png');return true;}
  send(res,200,`<!doctype html><html><head><meta charset="utf-8"><title>FF Standings Preview</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}img{width:100%;height:100%;object-fit:contain;display:block}</style></head><body><img id="frame" src="${url.pathname}.png"><script>const frame=document.getElementById('frame');async function refresh(){try{const r=await fetch(location.pathname+'.png?t='+Date.now(),{cache:'no-store'});if(r.ok){const next=URL.createObjectURL(await r.blob());await new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=next});const old=frame.src;frame.src=next;if(old.startsWith('blob:'))URL.revokeObjectURL(old);}}catch{}setTimeout(refresh,1000)}refresh();</script></body></html>`,'text/html; charset=utf-8');return true;
 };
}
module.exports={createBroadcast};
