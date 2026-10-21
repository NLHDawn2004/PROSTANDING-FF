const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAuth,hashPassword}=require('../auth');
test('passwords are hashed and invalid credentials cannot create a session',()=>{
 const record=hashPassword('test-password');
 assert.notEqual(record.hash,'test-password');
 const auth=createAuth({tester:record});
 assert.equal(auth.login('tester','wrong'),null);
 assert.equal(auth.login('missing','test-password'),null);
 const token=auth.login('tester','test-password');
 assert.equal(auth.user(token),'tester');assert.equal(auth.user('forged'),null);
 auth.logout(token);assert.equal(auth.user(token),null);
});
test('sessions expire after twelve hours',()=>{
 let now=0;const auth=createAuth({tester:hashPassword('pw')},()=>now);
 const token=auth.login('tester','pw');now=12*60*60*1000;
 assert.equal(auth.user(token),null);
});
test('HTTP gate protects pages and APIs; login, cookie and logout work',async()=>{
 const http=require('node:http'),{middleware}=require('../auth');
 const gate=middleware({tester:hashPassword('pw')});
 const server=http.createServer(async(req,res)=>{if(await gate(req,res,new URL(req.url,'http://localhost')))return;res.end('protected');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base,{redirect:'manual'})).status,302);
  assert.equal((await fetch(base+'/api/match',{method:'POST'})).status,401);
  assert.equal((await fetch(base+'/accounts.json',{redirect:'manual'})).status,302);
  const login=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({username:'tester',password:'pw'})});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
  const headers={Cookie:cookie.split(';')[0]};
  assert.equal(await (await fetch(base,{headers})).text(),'protected');
  assert.equal((await fetch(base+'/api/logout',{method:'POST',headers})).status,200);
  assert.equal((await fetch(base+'/api/match',{headers})).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
