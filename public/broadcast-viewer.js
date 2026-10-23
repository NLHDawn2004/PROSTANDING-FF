(function(root){
 const keyframes={none:null,fade:[{opacity:0},{opacity:1}],left:[{opacity:0,transform:'translateX(-7%)'},{opacity:1,transform:'translateX(0)'}],right:[{opacity:0,transform:'translateX(7%)'},{opacity:1,transform:'translateX(0)'}],up:[{opacity:0,transform:'translateY(7%)'},{opacity:1,transform:'translateY(0)'}],zoom:[{opacity:0,transform:'scale(.92)'},{opacity:1,transform:'scale(1)'}]};
 function shouldAnimate(settings,{first,changed,replayed,shown}){return settings.visible&&settings.effect!=='none'&&(replayed||shown||(first?settings.onOpen:changed&&settings.onUpdate));}
 if(typeof module!=='undefined'&&module.exports){module.exports={keyframes,shouldAnimate};return;}
 const frame=document.getElementById('frame');let version=null,replay=null,visible=false,first=true,objectURL=null,animation=null;
 async function refresh(){
  try{
   const response=await fetch(location.pathname+'.json',{cache:'no-store'});if(!response.ok)throw Error();
   const state=await response.json(),s=state.settings,changed=state.version!==version;
   if(!state.version){frame.style.visibility='hidden';return;}
   if(changed){
    const imageResponse=await fetch(location.pathname+'.png?v='+encodeURIComponent(state.version),{cache:'no-store'});if(!imageResponse.ok)throw Error();
    const next=URL.createObjectURL(await imageResponse.blob());
    try{await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=next;});}catch(error){URL.revokeObjectURL(next);throw error;}
    frame.src=next;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=next;
   }
   const run=shouldAnimate(s,{first,changed,replayed:replay!==null&&replay!==s.replay,shown:!first&&!visible&&s.visible});
   frame.style.visibility=s.visible?'visible':'hidden';
   if(!s.visible&&animation){animation.cancel();animation=null;}
   if(run&&keyframes[s.effect]){if(animation)animation.cancel();animation=frame.animate(keyframes[s.effect],{duration:s.duration,easing:'cubic-bezier(.2,.7,.2,1)'});}
   version=state.version;replay=s.replay;visible=s.visible;first=false;
  }catch{/* Keep the last complete frame while reconnecting. */}
  finally{setTimeout(refresh,1500);}
 }
 refresh();
})(typeof window!=='undefined'?window:globalThis);
