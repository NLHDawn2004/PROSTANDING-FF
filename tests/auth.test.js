const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAuth,hashPassword}=require('../auth');
test('signed sessions survive another server instance and reject tampering, expiry and changed passwords',()=>{
 let now=0;const accounts={tester:hashPassword('pw')},secret='a'.repeat(64);
 const first=createAuth(accounts,()=>now,secret),second=createAuth(accounts,()=>now,secret);
 const token=first.login('tester','pw');assert.equal(second.user(token),'tester');
 assert.equal(second.user(token+'x'),null);
 const changed=createAuth({tester:hashPassword('new')},()=>now,secret);assert.equal(changed.user(token),null);
 now=12*60*60*1000;assert.equal(second.user(token),null);
});
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

test('Render HTTPS login checks the public origin and issues a secure cookie', async t => {
 const previousRender = process.env.RENDER;
 const previousAccounts = process.env.AUTH_ACCOUNTS_JSON;
 process.env.RENDER = 'true';
 process.env.AUTH_ACCOUNTS_JSON = JSON.stringify({tester: hashPassword('pw')});
 t.after(() => {
  if (previousRender === undefined) delete process.env.RENDER;
  else process.env.RENDER = previousRender;
  if (previousAccounts === undefined) delete process.env.AUTH_ACCOUNTS_JSON;
  else process.env.AUTH_ACCOUNTS_JSON = previousAccounts;
 });

 const server = require('../server');
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 t.after(() => new Promise(resolve => server.close(resolve)));
 const {request} = require('node:http');
 const endpoint = 'http://127.0.0.1:' + server.address().port + '/api/login';
 const host = 'prostanding-test.onrender.com';
 const login = origin => new Promise((resolve, reject) => {
  const req = request(endpoint, {
   method: 'POST',
   headers: {Host: host, Origin: origin},
  }, res => {
   res.resume();
   res.on('end', () => resolve(res));
   res.on('error', reject);
  });
  req.on('error', reject);
  req.end(JSON.stringify({username: 'tester', password: 'pw'}));
 });

 assert.equal((await login('https://example.org')).statusCode, 403);
 const response = await login('https://' + host);
 assert.equal(response.statusCode, 200);
 assert.match(response.headers['set-cookie'][0], /; Secure(?:;|$)/);
});
