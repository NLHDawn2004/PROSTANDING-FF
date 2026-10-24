const test=require('node:test'),assert=require('node:assert/strict');
const {selection}=require('../public/title-fonts');const fonts=require('../public/ranking-fonts');
test('title font selection supports eight GFF fonts and preserves per-template default',()=>{
 for(const font of fonts.entries)assert.equal(fonts.family('title',selection(font.id)),`"${font.family}",Arial,sans-serif`);
 assert.equal(selection('').title,'');assert.equal(selection('','gff-vn-black').title,'gff-vn-black');assert.equal(selection('invalid').title,'');
});
