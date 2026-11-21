(function(root){
 const keyframes={none:null,fade:[{opacity:0},{opacity:1}],left:[{opacity:0,transform:'translateX(-7%)'},{opacity:1,transform:'translateX(0)'}],right:[{opacity:0,transform:'translateX(7%)'},{opacity:1,transform:'translateX(0)'}],up:[{opacity:0,transform:'translateY(7%)'},{opacity:1,transform:'translateY(0)'}],zoom:[{opacity:0,transform:'scale(.92)'},{opacity:1,transform:'scale(1)'}],broadcast:null};
 function shouldAnimate(settings,{first,changed,replayed,shown}){return settings.visible&&settings.effect!=='none'&&(replayed||shown||(first?settings.onOpen:changed&&settings.onUpdate));}
 function regions(kind){
  const rect=(x,y,w,h,direction)=>({x,y,w,h,direction});
  if(kind==='mvp')return [rect(0,0,1920,310,'up'),rect(0,310,755,770,'left'),rect(755,310,445,770,'zoom'),rect(1200,310,720,770,'right')];
  if(kind==='booyah')return [rect(0,0,1920,305,'up'),rect(0,305,960,387,'left'),rect(960,305,960,387,'right'),rect(0,692,960,388,'left'),rect(960,692,960,388,'right')];
  if(kind==='h2h')return [rect(0,0,1920,300,'up'),rect(0,300,640,780,'left'),rect(640,300,640,780,'zoom'),rect(1280,300,640,780,'right')];
  if(kind==='cs-mvp')return [rect(0,0,1920,300,'up'),rect(550,300,760,690,'zoom'),rect(0,300,550,690,'left'),rect(1310,300,610,690,'right'),rect(0,990,1920,90,'up')];
  if(kind==='cs-summary')return [rect(0,0,1920,260,'up'),rect(0,260,1300,390,'left'),rect(0,650,1300,430,'left'),rect(1300,260,620,820,'right')];
  if(kind==='cs-gameres')return [rect(0,0,1920,196,'up'),rect(0,196,790,390,'left'),rect(790,196,360,390,'zoom'),rect(1150,196,770,390,'right'),rect(0,586,960,494,'left'),rect(960,586,960,494,'right')];
  return [rect(0,0,1920,1080,'zoom')];
 }
 const titlePixel=(x,y,r,g,b,a)=>x>=130&&x<1815&&y>=130&&y<500&&a>0&&Math.abs(r-237)<18&&Math.abs(g-250)<18&&Math.abs(b-94)<22;
 if(typeof module!=='undefined'&&module.exports){module.exports={keyframes,shouldAnimate,regions,titlePixel};return;}
 const frame=document.getElementById('frame');let version=null,replay=null,visible=false,first=true,objectURL=null,motions=[],generation=0,flash=null,flashVersion=null,lastState=null;
 const stage=document.createElement('div');Object.assign(stage.style,{position:'absolute',left:'50%',top:'50%',width:'min(100vw,177.777778vh)',height:'min(56.25vw,100vh)',transform:'translate(-50%,-50%)',pointerEvents:'none'});document.body.append(stage);
 const parts=document.createElement('div');Object.assign(parts.style,{position:'absolute',inset:'0',overflow:'hidden'});stage.append(parts);
 const title=document.createElement('canvas');title.width=1920;title.height=1080;Object.assign(title.style,{position:'absolute',inset:'0',width:'100%',height:'100%',opacity:'0'});stage.append(title);
 function cancel(){generation++;for(const m of motions)m.cancel();motions=[];parts.replaceChildren();}
 function stopFlash(){if(flash)flash.cancel();flash=null;title.style.opacity='0';}
 function titleMask(){
  const ctx=title.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,1920,1080);ctx.drawImage(frame,0,0,1920,1080);const pixels=ctx.getImageData(0,0,1920,1080),d=pixels.data;
  for(let y=0;y<1080;y++)for(let x=0;x<1920;x++){const i=(y*1920+x)*4;if(titlePixel(x,y,d[i],d[i+1],d[i+2],d[i+3]))d[i]=d[i+1]=d[i+2]=255;else d[i+3]=0;}ctx.putImageData(pixels,0,0);
 }
 function updateFlash(state){
  if(!state.settings.visible||state.kind!=='cs-mvp'||!state.settings.titleFlash){stopFlash();return;}
  if(flashVersion!==state.version){titleMask();flashVersion=state.version;}
  if(!flash)flash=title.animate([{opacity:0,offset:0},{opacity:1,offset:.08},{opacity:0,offset:.17},{opacity:0,offset:1}],{duration:3200,iterations:Infinity,easing:'ease-in-out'});
 }
 function entrance(state,hiding=false){
  cancel();const token=generation,duration=state.settings.duration;
  const timing=(length,delay)=>({duration:length,delay:hiding?Math.max(0,duration-delay-length):delay,direction:hiding?'reverse':'normal'});
  frame.style.visibility='hidden';
  const rows=regions(state.kind);
  rows.forEach((r,i)=>{
   const region=document.createElement('div');Object.assign(region.style,{position:'absolute',left:r.x/19.2+'%',top:r.y/10.8+'%',width:r.w/19.2+'%',height:r.h/10.8+'%',overflow:'hidden'});
   const img=document.createElement('img');img.src=frame.src;img.alt='';Object.assign(img.style,{position:'absolute',width:1920/r.w*100+'%',height:1080/r.h*100+'%',left:-r.x/r.w*100+'%',top:-r.y/r.h*100+'%',visibility:'visible',maxWidth:'none',objectFit:'fill'});region.append(img);parts.append(region);
   const transform=r.direction==='left'?'translateX(-18%)':r.direction==='right'?'translateX(18%)':r.direction==='up'?'translateY(15%)':'scale(1.12)';
   motions.push(region.animate([{opacity:0,transform,filter:'blur(8px)'},{opacity:1,transform:'translate(0,0) scale(1)',filter:'blur(0)'}],{...timing(duration*.55,duration*(.35+i*.1/Math.max(1,rows.length-1))),fill:'both',easing:'cubic-bezier(.16,1,.3,1)'}));
  });
  for(let i=0;i<2;i++){const strip=document.createElement('div');Object.assign(strip.style,{position:'absolute',inset:'-15% -25%',background:i?'#effb58':'#006400',transform:'translateX(-150%) skewX(-18deg)'});parts.append(strip);motions.push(strip.animate([{transform:'translateX(-150%) skewX(-18deg)',opacity:1},{transform:'translateX(150%) skewX(-18deg)',opacity:1}],{...timing(duration*.65,i*duration*.06),fill:'none',easing:'cubic-bezier(.5,0,.2,1)'}));}
  Promise.allSettled(motions.map(m=>m.finished)).then(()=>{if(token!==generation)return;parts.replaceChildren();motions=[];frame.style.visibility=lastState?.settings.visible?'visible':'hidden';});
 }
 function exit(state){
  stopFlash();
  if(state.settings.effect==='broadcast'){entrance(state,true);return;}
  cancel();const token=generation;frame.style.visibility='visible';
  const motion=frame.animate(keyframes[state.settings.effect],{duration:state.settings.duration,direction:'reverse',fill:'both',easing:'cubic-bezier(.2,.7,.2,1)'});motions.push(motion);
  motion.finished.then(()=>{if(token!==generation)return;frame.style.visibility='hidden';motion.cancel();motions=[];},()=>{});
 }
 async function refresh(){
  try{
   const response=await fetch(location.pathname+'.json',{cache:'no-store'});if(!response.ok)throw Error();const state=await response.json(),s=state.settings,changed=state.version!==version;
   if(!state.version){frame.style.visibility='hidden';cancel();stopFlash();return;}
   if(changed){const imageResponse=await fetch(location.pathname+'.png?v='+encodeURIComponent(state.version),{cache:'no-store'});if(!imageResponse.ok)throw Error();const next=URL.createObjectURL(await imageResponse.blob());try{await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=next;});}catch(error){URL.revokeObjectURL(next);throw error;}frame.src=next;await frame.decode();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=next;}
   const replayed=replay!==null&&replay!==s.replay,run=shouldAnimate(s,{first,changed,replayed,shown:!first&&!visible&&s.visible});lastState=state;
   if(!s.visible){
    stopFlash();
    if(!first&&visible&&['cs-mvp','cs-summary','cs-gameres','mvp','booyah','h2h'].includes(state.kind)&&s.effect!=='none')exit(state);
    else if(first||visible||!motions.length){cancel();frame.style.visibility='hidden';}
   }
   else{
    if(run){stopFlash();if(s.effect==='broadcast')entrance(state);else{cancel();frame.style.visibility='visible';if(keyframes[s.effect])motions.push(frame.animate(keyframes[s.effect],{duration:s.duration,easing:'cubic-bezier(.2,.7,.2,1)'}));}}
    else if(!visible||!motions.length){if(!visible)cancel();frame.style.visibility='visible';}
    updateFlash(state);
   }
   version=state.version;replay=s.replay;visible=s.visible;first=false;
  }catch{/* Preserve the last complete frame while reconnecting. */}
  finally{setTimeout(refresh,1500);}
 }
 refresh();
})(typeof window!=='undefined'?window:globalThis);
