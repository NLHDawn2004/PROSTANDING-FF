/* Each supplied face is exposed separately so its original weight is preserved. */
(function(root){
  const entries=[
    ['gff-latin-bold','GFF Latin Bold','GFFLatinBold','GFF-Latin-Bold.ttf'],
    ['gff-latin-cdmedium','GFF Latin CdMedium','GFFLatinCdMedium','GFF-Latin-CdMedium.ttf'],
    ['gff-latin-light','GFF Latin Light','GFFLatinLight','GFF-Latin-Light.ttf'],
    ['gff-latin-medium','GFF Latin Medium','GFFLatinMedium','GFF-LATIN-MEDIUM.OTF'],
    ['gff-latin-regular','GFF Latin Regular','GFFLatinRegular','GFF-Latin-Regular.ttf'],
    ['gff-latin-thin','GFF Latin Thin','GFFLatinThin','GFF-LATIN-THIN.OTF'],
    ['gff-vn-black','GFF VN Black','GFFVNBlack','GFF-VN-Black.ttf'],
    ['gff-vn-extrabold','GFF VN ExtraBold','GFFVNExtraBold','GFF-VN-ExtraBold.ttf']
  ].map(([id,label,family,file])=>({id,label,family,file}));
  function face(role,selection={}){return entries.find(f=>f.id===selection?.[role]);}
  function family(role,selection={}){const f=face(role,selection);return f?`"${f.family}",Arial,sans-serif`:'Arial,sans-serif';}
  function weight(role,fallback,selection={}){return face(role,selection)?400:fallback;}
  function font(role,size,fallback=400,selection={}){return `${weight(role,fallback,selection)} ${size}px ${family(role,selection)}`;}
  async function load(selection={},doc=typeof document==='undefined'?null:document){
    const selected=[...new Set(['name','stats','title'].map(role=>face(role,selection)).filter(Boolean))];
    if(!selected.length)return;
    if(!doc?.fonts)throw new Error('Trình duyệt không hỗ trợ tải font.');
    await Promise.all(selected.map(async f=>{
      const loaded=await doc.fonts.load(`400 32px "${f.family}"`,'Đội ABC 0123456789');
      if(!loaded.length)throw new Error('Không tải được font '+f.label+'. Hãy tải lại trang.');
    }));
  }
  const api={entries,family,weight,font,load};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.RankingFonts=api;
})(typeof window!=='undefined'?window:globalThis);
