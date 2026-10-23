const EFFECTS=['none','fade','left','right','up','zoom'];
const defaults={effect:'fade',duration:600,onOpen:true,onUpdate:true,visible:true,replay:''};
function settings(input={},previous=defaults){
 const out={...defaults,...previous};
 if(input.effect!==undefined){if(!EFFECTS.includes(input.effect))throw Error('Hiệu ứng không hợp lệ.');out.effect=input.effect;}
 if(input.duration!==undefined){if(!Number.isFinite(input.duration)||input.duration<100||input.duration>5000)throw Error('Thời gian phải từ 100 đến 5000 ms.');out.duration=Math.round(input.duration);}
 for(const key of ['onOpen','onUpdate','visible'])if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw Error('Thiết lập không hợp lệ.');out[key]=input[key];}
 if(input.replay!==undefined){if(typeof input.replay!=='string'||input.replay.length>80)throw Error('Lệnh phát lại không hợp lệ.');out.replay=input.replay;}
 return out;
}
module.exports={settings,defaults};
