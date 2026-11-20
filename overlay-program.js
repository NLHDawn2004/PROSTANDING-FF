const kinds=['cs-mvp','cs-gameres','cs-summary'];
function snapshot(program,now=Date.now()){
 const elapsed=Math.min(program.interval*2,program.elapsed+(program.running?Math.max(0,now-program.startedAt):0));
 const index=Math.min(2,Math.floor(elapsed/program.interval)),finished=index===2;
 return {index,kind:kinds[index],interval:program.interval,elapsed,remaining:finished?0:program.interval-elapsed%program.interval,running:program.running&&!finished,finished};
}
function command(previous,input,now=Date.now()){
 if(input.action==='start'){
  if(!Number.isInteger(input.interval)||input.interval<1000||input.interval>3600000)throw Error('Thời gian phải từ 1 giây đến 60 phút.');
  return {interval:input.interval,elapsed:0,startedAt:now,running:true,run:require('node:crypto').randomUUID()};
 }
 if(!['pause','resume'].includes(input.action))throw Error('Lệnh chuyển overlay không hợp lệ.');
 if(!previous)throw Error('Chưa bắt đầu chuyển overlay.');
 const current=snapshot(previous,now);
 if(input.action==='pause')return {...previous,elapsed:current.elapsed,startedAt:now,running:false};
 if(current.running||current.finished)return previous;
 return {...previous,elapsed:current.elapsed,startedAt:now,running:true};
}
module.exports={kinds,snapshot,command};
