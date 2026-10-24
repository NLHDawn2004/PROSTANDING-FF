(function(root){
 const fontTools=typeof module!=='undefined'&&module.exports?require('./ranking-fonts'):root.RankingFonts;
 function selection(id,fallback=''){const chosen=fontTools.entries.some(f=>f.id===id)?id:fallback;return {title:chosen};}
 if(typeof module!=='undefined'&&module.exports){module.exports={selection};return;}
 root.TitleFonts={mount(key,host,changed,{input=null,fallback=''}={}){
  const group=document.createElement('div');group.className='title-font-options';group.style.cssText='display:grid;gap:8px;min-width:200px';
  if(!input){const label=document.createElement('label');label.textContent='Tiêu đề giải';input=document.createElement('input');input.type='text';input.maxLength=100;input.placeholder=key==='booyah'?'Để trống để hiện TRẬN theo trận đã chọn':'Nhập tiêu đề giải';label.appendChild(input);group.appendChild(label);try{input.value=localStorage.getItem('ff-title-'+key)||'';}catch{}input.addEventListener('input',()=>{try{localStorage.setItem('ff-title-'+key,input.value);}catch{}changed();});}
  const label=document.createElement('label');label.textContent='Font tiêu đề giải';const select=document.createElement('select');select.setAttribute('aria-label','Font tiêu đề giải '+key);const option=document.createElement('option');option.value='';option.textContent='Mặc định';select.appendChild(option);fontTools.entries.forEach(font=>{const item=document.createElement('option');item.value=font.id;item.textContent=font.label;select.appendChild(item);});label.appendChild(select);group.appendChild(label);host.insertBefore(group,host.querySelector(':scope > canvas'));
  try{select.value=localStorage.getItem('ff-title-font-'+key)||'';}catch{}
  select.onchange=()=>{try{localStorage.setItem('ff-title-font-'+key,select.value);}catch{}changed();};
  return {text:()=>input.value,font:(size,weight=900)=>fontTools.font('title',size,weight,selection(select.value,fallback)),load:()=>fontTools.load(selection(select.value,fallback)),reset(){select.value='';input.value='';try{localStorage.removeItem('ff-title-font-'+key);localStorage.removeItem('ff-title-'+key);}catch{}}};
 }};
})(typeof window!=='undefined'?window:globalThis);
