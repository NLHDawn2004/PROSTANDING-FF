/* Shared coordinates for the on-screen board and the 1920 x 1080 PNG. */
(function(root){
  const fontTools=typeof module!=='undefined'&&module.exports?require('./ranking-fonts.js'):root.RankingFonts;
  const defaults={firstY:418,stepY:109,fontSize:36,nameSize:27,logo:280,name:347,booyah:576,kills:710,total:844,rightLogo:1138,rightName:1205,rightBooyah:1434,rightKills:1568,rightTotal:1702,titleX:1203,titleY:278,titleSize:44,titleWidth:300,titleHeight:56,titleAngle:-2.5};
  function position(index,coords={}){
    const c={...defaults,...coords},right=index>=6;
    return {y:c.firstY+(index%6)*c.stepY,logo:right?c.rightLogo:c.logo,name:right?c.rightName:c.name,booyah:right?c.rightBooyah:c.booyah,kills:right?c.rightKills:c.kills,total:right?c.rightTotal:c.total,nameWidth:Math.max(40,(right?c.rightBooyah:c.booyah)-66-(right?c.rightName:c.name))};
  }
  function titleLayout(ctx,title,coords={}){
    const c={...defaults,...coords},lines=String(title).replace(/\r\n?/g,'\n').split('\n');let size=c.titleSize;
    ctx.font=fontTools.font('title',size,900,c.fonts);
    while(size>1&&(Math.max(...lines.map(line=>ctx.measureText(line).width))>c.titleWidth||size*1.08*lines.length>c.titleHeight)){size--;ctx.font=fontTools.font('title',size,900,c.fonts);}
    return {x:c.titleX,y:c.titleY,size,width:c.titleWidth,lines,lineHeight:size*1.08,angle:c.titleAngle};
  }
  async function draw(ctx,teams,loadImage,logoFor,coords={},title=''){
    const c={...defaults,...coords};
    if(String(title).trim()){
      const p=titleLayout(ctx,title,c);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle*Math.PI/180);
      ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle='#213465';
      p.lines.forEach((line,i)=>ctx.fillText(line,0,(i-(p.lines.length-1)/2)*p.lineHeight));ctx.restore();
    }
    for(let i=0;i<Math.min(12,teams.length);i++){
      const t=teams[i],p=position(i,c),logo=logoFor(t);
      if(logo){try{const im=await loadImage(logo),ratio=Math.min(66/im.width,66/im.height);ctx.drawImage(im,p.logo-im.width*ratio/2,p.y-im.height*ratio/2,im.width*ratio,im.height*ratio);}catch(e){console.warn('Không tải được logo',e);}}
      ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle='#ffffff';
      let size=c.nameSize;ctx.font=fontTools.font('name',size,700,c.fonts);
      const name=String(t.name||'');
      while(size>10&&ctx.measureText(name).width>p.nameWidth){size--;ctx.font=fontTools.font('name',size,700,c.fonts);}
      ctx.fillText(name,p.name,p.y);
      ctx.textAlign='center';ctx.fillStyle='#09204f';ctx.font=fontTools.font('stats',c.fontSize,900,c.fonts);
      for(const k of ['booyah','kills','total'])ctx.fillText(String(t[k]??0),p[k],p.y);
    }
  }
  const api={defaults,position,titleLayout,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.StandingFN=api;
})(typeof window!=='undefined'?window:globalThis);
