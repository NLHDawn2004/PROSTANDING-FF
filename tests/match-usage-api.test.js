const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function client(){
  const calls=[],source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
  const code=source.slice(0,source.indexOf('const accounts ='))+'\n;({requestMatchStats})';
  const api=vm.runInNewContext(code,{require:require('module').createRequire(path.join(__dirname,'../server.js')),process,Buffer,URL,URLSearchParams,AbortSignal,__dirname:path.join(__dirname,'..'),console:{log(){}},fetch:async(url,options={})=>{
    calls.push({url,options});return options.method==='POST'?{ok:true,status:200,text:async()=>'{"status":"success","data":{}}'}:{headers:{getSetCookie:()=>[]}};
  }});
  return {api,calls};
}
test('usage client calls the skill endpoint with the entire exact ID set and signed payload',async()=>{
  const {api,calls}=client(),ids=['2102383425744447488','2102388193493690368'];
  await api.requestMatchStats(ids,'skill');
  assert.equal(calls[1].url,'https://matchstats.sea.ffesports.com/api/match_stats/skill');
  const body=JSON.parse(calls[1].options.body);assert.deepEqual(body.match_ids,ids);assert.match(body._sign,/^[a-f0-9]{32}$/);
});
test('usage client rejects endpoints outside the three supported Match Stats methods',async()=>{
  const {api,calls}=client();await assert.rejects(api.requestMatchStats(['2102383425744447488'],'https://example.com'),/không hợp lệ/);assert.equal(calls.length,0);
});

