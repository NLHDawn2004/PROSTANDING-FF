const test=require('node:test'),assert=require('node:assert/strict');
const b=require('../public/booyah-team');
test('winner is rank one or explicit booyah, never highest total',()=>{
 const team={team_name:'Winner',match_rank:'1'};assert.equal(b.winner({teams:[{team_name:'Loser',match_rank:2,total_score:100},team]}),team);
 assert.equal(b.winner({teams:[{booyah:1}]}).booyah,1);
 assert.throws(()=>b.winner({teams:[{match_rank:2}]}),/BOOYAH/);
 assert.throws(()=>b.winner({teams:[{booyah:1},{booyah:1}]}),/nhiều/);
});
test('explicit BOOYAH wins over match_rank including duplicate rank-one teams',()=>{
 const actual={team_name:'Winner',match_rank:3,booyah:1};
 assert.equal(b.winner({teams:[{match_rank:1,booyah:0},actual]}),actual);
 assert.equal(b.winner({teams:[{match_rank:1,booyah:0},{...actual,match_rank:1}]}).team_name,'Winner');
 assert.throws(()=>b.winner({teams:[{match_rank:1,booyah:0}]}),/BOOYAH/);
});
test('dropdown places game number after time and never invents a time',()=>{
 assert.equal(b.matchLabel({matchId:'123',gameNumber:2,source:{match_time:'20:30'}}),'123 · 20:30 · Trận 2');
 assert.equal(b.matchLabel({matchId:'456',gameNumber:3,source:{}}),'456 · Chưa có thời gian · Trận 3');
});
test('player stats use only selected match and preserve missing/zero',()=>{
 assert.deepEqual(b.stats({kills:5,damage:1000,knock_down:7,assists:0}),[5,1000,7,0]);
 assert.deepEqual(b.stats({}),[null,null,null,null]);
});
