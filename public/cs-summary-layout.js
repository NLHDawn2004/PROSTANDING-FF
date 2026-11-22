(function(root){
 const summary=typeof module!=='undefined'&&module.exports?require('./cs-summary'):root.ClashSquadSummary;
 const layouts={bo3:{slots:3,template:'cs-summary-template.png',rows:[[395,464,533,602],[786,855,924,992]],top:257,step:262,tagY:210,logoY:100,logoW:190,logoH:130,nameX:1693,nameW:268,nameSize:36,scoreSize:44},bo5:{slots:5,template:'cs-summary-bo5-template.png',rows:[[394,462,529,597],[784,852,919,987]],top:259,step:154,tagY:116,logoY:52,logoW:130,logoH:80,nameX:1710,nameW:202,nameSize:30,scoreSize:40}};
 const get=format=>layouts[format]||layouts.bo3;
 function draw(ctx,{format='bo3',frame,model,games,logos=[],teamLogos=[],font,displayTeam=name=>name}){
  const layout=get(format),bo5=layout===layouts.bo5;
  ctx.clearRect(0,0,1920,1080);ctx.drawImage(frame,0,0,1920,1080);
  function text(value,x,y,width,size,color='#000',align='center',visualCenter=false){
   value=String(value??'—');ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';do{ctx.font=font('name',size--,800);}while(ctx.measureText(value).width>width&&size>10);
   if(visualCenter){const m=ctx.measureText(value);if(Number.isFinite(m.actualBoundingBoxAscent)&&Number.isFinite(m.actualBoundingBoxDescent)){ctx.textBaseline='alphabetic';y+=(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;}}ctx.fillText(value,x,y);
  }
  const xs=[448,580,717,840,974,1154];
  for(let t=0;t<2;t++){
   const team=model.teams[t],hy=t?653:263;
   if(bo5){const top=t?653:262;ctx.fillStyle='#fff54e';ctx.fillRect(112,top,278,88);ctx.fillRect(1048,top,227,88);text('TOTAL',1154,top+30,218,29);text('KNOCKDOWN',1154,top+59,218,29);}
   if(team){const logo=teamLogos[t];if(logo){const scale=Math.min(70/logo.width,70/logo.height),w=logo.width*scale,h=logo.height*scale;ctx.drawImage(logo,160-w/2,hy+43-h/2,w,h);}text(displayTeam(team.team_name),280,hy+43,176,50,'#116175','center',true);}
   for(let i=0;i<4;i++){
    const p=team?.players[i];if(!p)continue;const y=layout.rows[t][i];text(p.name,155,y,235,31,'#000','left');
    [summary.stat(p.kills),summary.stat(p.death),summary.stat(p.assists),summary.stat(p.kda).replace(',','.'),summary.stat(p.damage).replace(/\./g,''),summary.stat(p.knock_down)].forEach((value,c)=>text(value,xs[c],y,c===4?180:120,31));
   }
  }
  for(let i=0;i<layout.slots;i++){
   const game=games[i],y=layout.top+i*layout.step;
   if(bo5){ctx.fillStyle='#650000';ctx.beginPath();ctx.moveTo(1603,y+97);ctx.lineTo(1817,y+97);ctx.lineTo(1808,y+135);ctx.lineTo(1603,y+135);ctx.closePath();ctx.fill();}
   if(!game)continue;
   if(logos[i]){const logo=logos[i],scale=Math.min(layout.logoW/logo.width,layout.logoH/logo.height),w=logo.width*scale,h=logo.height*scale;ctx.drawImage(logo,1565-w/2,y+layout.logoY-h/2,w,h);}
   text(game.winner?displayTeam(game.winner.team_name):'Chưa xác định',layout.nameX,y+layout.tagY,layout.nameW,layout.nameSize,'#fff','center',true);
   text(game.scores.map(summary.stat).join(' : '),1420,y+layout.tagY,205,layout.scoreSize,'#fff');
  }
 }
 const api={get,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CsSummaryLayout=api;
})(typeof window!=='undefined'?window:globalThis);
