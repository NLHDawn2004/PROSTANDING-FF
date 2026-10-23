/* FFPT positions are shared by browser preview and PNG export. */
(function(root){
  const fontTools=typeof module!=='undefined'&&module.exports?require('./ranking-fonts.js'):root.RankingFonts;
  const defaults={firstY:600,stepY:72,fontSize:30,nameSize:30,logo:262,name:320,total:680,kills:786,booyah:885,rightY:382,rightStep:81,rightLogo:1109,rightName:1160,rightTotal:1515,rightKills:1620,rightBooyah:1718,championY:375,championLogo:365,championName:545,championStatsY:498,championTotal:274,championKills:545,championBooyah:817,titleX:960,titleY:232};
  function position(index,coords={}){
    const c={...defaults,...coords};
    if(index===0)return {y:c.championY,statsY:c.championStatsY,logo:c.championLogo,logoSize:124,name:c.championName,nameWidth:Math.max(40,920-c.championName),nameSize:46,fontSize:c.fontSize+8,total:c.championTotal,kills:c.championKills,booyah:c.championBooyah,color:'#000000'};
    const right=index>=7,y=right?c.rightY+(index-7)*c.rightStep:c.firstY+(index-1)*c.stepY;
    const name=right?c.rightName:c.name,total=right?c.rightTotal:c.total;
    return {y,statsY:y,logo:right?c.rightLogo:c.logo,logoSize:50,name,nameWidth:Math.max(40,total-65-name),nameSize:c.nameSize,fontSize:c.fontSize,total,kills:right?c.rightKills:c.kills,booyah:right?c.rightBooyah:c.booyah,color:'#ffffff'};
  }
  function fitName(ctx,text,size,width,weight=400,selection={},role='name'){
    ctx.font=fontTools.font(role,size,weight,selection);
    while(size>10&&ctx.measureText(text).width>width){size--;ctx.font=fontTools.font(role,size,weight,selection);}
    return size;
  }
  async function draw(ctx,teams,loadImage,logoFor,coords={},title=''){
    const c={...defaults,...coords};
    ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle='#101010';
    fitName(ctx,String(title),46,1500,900,c.fonts,'title');ctx.fillText(String(title),c.titleX,c.titleY);
    for(let i=0;i<Math.min(15,teams.length);i++){
      const t=teams[i],p=position(i,c),logo=logoFor(t);
      if(logo){try{const im=await loadImage(logo),ratio=Math.min(p.logoSize/im.width,p.logoSize/im.height);ctx.drawImage(im,p.logo-im.width*ratio/2,p.y-im.height*ratio/2,im.width*ratio,im.height*ratio);}catch(e){console.warn('Không tải được logo',e);}}
      ctx.textAlign='left';ctx.fillStyle=p.color;fitName(ctx,String(t.name||''),p.nameSize,p.nameWidth,400,c.fonts);if(root.ChampionRush)await root.ChampionRush.drawName(ctx,t,String(t.name||''),p.name,p.y,p.nameWidth,loadImage,i===0?120:48,i===0?75:30);else ctx.fillText(String(t.name||''),p.name,p.y);
      ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font=fontTools.font('stats',p.fontSize,400,c.fonts);
      for(const key of ['total','kills','booyah']){
        const value=String(t[key]??0);ctx.fillText(i===0&&key==='booyah'?value.padStart(2,'0'):value,p[key],p.statsY);
      }
    }
  }
  const api={defaults,position,fitName,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.StandingFFPT=api;
})(typeof window!=='undefined'?window:globalThis);
