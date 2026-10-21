(()=>{
 const original=window.fetch.bind(window);
 window.fetch=async(...args)=>{const response=await original(...args);if(response.status===401&&new URL(typeof args[0]==='string'?args[0]:args[0].url,location.href).origin===location.origin)location.replace('/login');return response;};
 const button=document.createElement('button');button.textContent='Đăng xuất';button.type='button';
 button.style.cssText='position:fixed;bottom:18px;right:18px;z-index:9999;background:white;border:1px solid #cbd5e1;border-radius:9px;padding:10px 16px;color:#334155;cursor:pointer;box-shadow:0 3px 12px #0001';
 button.onclick=async()=>{button.disabled=true;try{const response=await original('/api/logout',{method:'POST'});if(response.ok)location.replace('/login');else throw Error();}catch{button.disabled=false;alert('Không thể đăng xuất. Vui lòng thử lại.');}};
 document.body.appendChild(button);
})();
