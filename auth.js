const crypto=require('crypto');
const TTL=12*60*60*1000;
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')};}
function createAuth(accounts,clock=Date.now,secret=null){
 const sessions=new Map();
 const signature=body=>crypto.createHmac('sha256',secret).update(body).digest('base64url');
 return {
  login(name,password){
   const record=Object.hasOwn(accounts,name)?accounts[name]:null;
   const hash=crypto.scryptSync(password,record?.salt||'invalid-user',64);
   if(!record||!crypto.timingSafeEqual(hash,Buffer.from(record.hash,'hex')))return null;
   if(secret){const body=Buffer.from(JSON.stringify({name,expires:clock()+TTL,version:crypto.createHash('sha256').update(record.hash).digest('hex'),nonce:crypto.randomBytes(16).toString('hex')})).toString('base64url');return body+'.'+signature(body);}
   for(const [key,session] of sessions)if(session.expires<=clock())sessions.delete(key);
   const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{name,expires:clock()+TTL});return token;
  },
  user(token){
   if(secret){try{const [body,sig,...rest]=String(token||'').split('.');if(rest.length||!body||!sig)return null;const expected=Buffer.from(signature(body));const actual=Buffer.from(sig);if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))return null;const session=JSON.parse(Buffer.from(body,'base64url'));if(session.expires<=clock()||!Object.hasOwn(accounts,session.name)||crypto.createHash('sha256').update(accounts[session.name].hash).digest('hex')!==session.version)return null;return session.name;}catch{return null;}}
   const session=sessions.get(token);if(!session)return null;if(session.expires<=clock()){sessions.delete(token);return null;}return session.name;},
  logout(token){sessions.delete(token);}
 };
}
function middleware(accounts){
 if(process.env.VERCEL&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw new Error('Cần cấu hình SESSION_SECRET tối thiểu 32 ký tự.');
 const auth=createAuth(accounts,Date.now,process.env.SESSION_SECRET),attempts=new Map();
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 return async(req,res,url)=>{
  res.setHeader('Cache-Control','no-store');
  const secure=process.env.VERCEL||req.socket.encrypted?'; Secure':'';
  const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ff_session='))?.slice(11);
  const user=auth.user(token);
  if(req.method==='POST'&&['/api/login','/api/logout'].includes(url.pathname)){
   if(req.headers.origin&&req.headers.origin!==url.origin){json(res,403,{ok:false,error:'Yêu cầu không hợp lệ.'});return true;}
   if(url.pathname==='/api/logout'){auth.logout(token);res.setHeader('Set-Cookie','ff_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+secure);json(res,200,{ok:true});return true;}
   const key=req.socket.remoteAddress,now=Date.now();
   for(const [k,v] of attempts)if(v.until<=now)attempts.delete(k);
   const attempt=attempts.get(key)||{count:0,until:now+60000};
   if(attempt.count>=10){json(res,429,{ok:false,error:'Bạn thử quá nhiều lần. Vui lòng chờ một phút.'});return true;}
   let body='',tooLarge=false;for await(const chunk of req){body+=chunk;if(body.length>4096){tooLarge=true;break;}}
   let input;try{input=JSON.parse(body);}catch{input={};}
   if(tooLarge||typeof input.username!=='string'||typeof input.password!=='string'){json(res,400,{ok:false,error:'Vui lòng nhập tài khoản và mật khẩu.'});return true;}
   const session=auth.login(input.username.trim(),input.password);
   if(!session){attempt.count++;attempts.set(key,attempt);json(res,401,{ok:false,error:'Tài khoản hoặc mật khẩu không đúng.'});return true;}
   attempts.delete(key);res.setHeader('Set-Cookie',`ff_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`);json(res,200,{ok:true});return true;
  }
  if(url.pathname==='/login'&&req.method==='GET'){
   if(user){res.writeHead(302,{Location:'/'});res.end();}else{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(require('fs').readFileSync(require('path').join(__dirname,'login.html')));}return true;
  }
  if(!user){if(url.pathname.startsWith('/api/'))json(res,401,{ok:false,error:'Vui lòng đăng nhập để tiếp tục.'});else{res.writeHead(302,{Location:'/login'});res.end();}return true;}
  return false;
 };
}
module.exports={hashPassword,createAuth,middleware};

