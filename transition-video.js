const fs=require('node:fs/promises'),path=require('node:path');
async function serveTransition(req,res){
 const data=await fs.readFile(path.join(__dirname,'public/survival-transition.webm')),size=data.length;
 const headers={'Content-Type':'video/webm','Accept-Ranges':'bytes','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'};
 if(req.headers.range){
  const match=req.headers.range.match(/^bytes=(\d*)-(\d*)$/);let start=NaN,end=NaN;
  if(match&&(match[1]||match[2])){start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{...headers,'Content-Range':'bytes */'+size});res.end();return;}
  res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return;
 }
 res.writeHead(200,{...headers,'Content-Length':size});res.end(data);
}
module.exports={serveTransition};
