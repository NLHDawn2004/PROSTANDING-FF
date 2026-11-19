(function(root){
 'use strict';
 const cs=typeof module!=='undefined'&&module.exports?require('./clash-squad'):root.ClashSquad;
 async function load(text,fetcher=fetch,onProgress=()=>{}){
  const ids=cs.ids(text),matches=[];
  for(let i=0;i<ids.length;i+=8){
   const batch=ids.slice(i,i+8);onProgress(i,ids.length);
   const response=await fetcher('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match_ids:batch})});
   let result;try{result=await response.json();}catch{throw Error('Máy chủ không trả dữ liệu. Kiểm tra đăng nhập.');}
   if(!response.ok||!result.ok||result.data?.status!=='success')throw Error(result.error||result.data?.msg||'Không tải được dữ liệu trận.');
   for(const id of batch){
    const raw=result.data.data;
    if(!raw?.team_stats?.some(g=>String(g.match_id)===id))throw Error('Thiếu dữ liệu Match ID '+id+'. Dữ liệu trước đó được giữ nguyên.');
    matches.push({...cs.extract(raw,id),raw:result.data,errors:[]});
   }
  }
  return matches;
 }
 const api={load};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClashOverlayData=api;
})(typeof window!=='undefined'?window:globalThis);
