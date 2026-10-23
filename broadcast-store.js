const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
function createFileStore(directory=path.join(__dirname,'.broadcast')){
 async function read(name){try{return await fs.readFile(path.join(directory,name));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async function write(name,data){await fs.mkdir(directory,{recursive:true});const temp=path.join(directory,name+'.'+crypto.randomUUID()+'.tmp');await fs.writeFile(temp,data);await fs.rename(temp,path.join(directory,name));}
 let secret;
 return {async secret(){if(secret)return secret;await fs.mkdir(directory,{recursive:true});try{await fs.writeFile(path.join(directory,'secret'),crypto.randomBytes(32).toString('hex'),{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}return secret=await fs.readFile(path.join(directory,'secret'),'utf8');},async get(token){const data=await read(token+'.json');return data?JSON.parse(data):null;},async set(token,state){await write(token+'.json',JSON.stringify(state));},async image(token,version){return read(token+'-'+version+'.png');},async putImage(token,version,data){await write(token+'-'+version+'.png',data);},async removeImage(token,version){await fs.unlink(path.join(directory,token+'-'+version+'.png')).catch(()=>{});}};
}
function createBlobStore(){
 const sdk=()=>require('@vercel/blob');
 const name=(token,suffix)=>'preview/'+token+'/'+suffix;
 async function read(file){const result=await sdk().get(file,{access:'private',useCache:false});return result?.stream?Buffer.from(await new Response(result.stream).arrayBuffer()):null;}
 return {async secret(){if(!process.env.SESSION_SECRET)throw Error('Thiếu SESSION_SECRET.');return process.env.SESSION_SECRET;},async get(token){const data=await read(name(token,'state.json'));return data?JSON.parse(data):null;},async set(token,state){await sdk().put(name(token,'state.json'),JSON.stringify(state),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:0});},async image(token,version){return read(name(token,version+'.png'));},async putImage(token,version,data){await sdk().put(name(token,version+'.png'),data,{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'image/png',cacheControlMaxAge:0});},async removeImage(token,version){await sdk().del(name(token,version+'.png'));}};
}
module.exports={createFileStore,createBlobStore};
