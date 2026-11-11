const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const data={},local={},listeners={},tabs=[],images=new Map(),grants=new Set();
 const area=store=>({async get(keys){return keys===null?{...store}:Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in store).map(k=>[k,store[k]]));},async set(v){Object.assign(store,v);},async remove(keys){for(const k of Array.isArray(keys)?keys:[keys])delete store[k];}});
 const chrome={storage:{session:area(data),local:area(local)},permissions:{async contains({origins}){return origins.every(o=>grants.has(o));},async remove({origins}){origins.forEach(o=>grants.delete(o));},request:()=>new Promise(()=>{}),onAdded:{addListener(fn){listeners.added=fn;}}},runtime:{getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener(fn){listeners.message=fn;}},onInstalled:{addListener(){}},async sendMessage(m){return new Promise(resolve=>{if(!listeners.message(m,{url:'chrome-extension://test/popup.html'},resolve))resolve({ok:false});});}},tabs:{async create(v){tabs.push(v);return {id:42,...v};},async query(){return [{id:1,url:'https://reference.example/'}];},async get(){throw Error('gone');},onRemoved:{addListener(){}},onUpdated:{addListener(){}}},scripting:{async getRegisteredContentScripts(){return [];},async unregisterContentScripts(){}},declarativeNetRequest:{async getSessionRules(){return [];},async updateSessionRules(){}}};
 const imageStore={async keys(){return [...images.keys()];},async get(id){return images.get(id);},async has(id){return images.has(id);},async save(id,blob,cssWidth){images.set(id,{blob,cssWidth,createdAt:Date.now()});},async remove(id){images.delete(id);}};
 const worker={chrome,URL,Set,ParityImageStore:imageStore};vm.createContext(worker);
 worker.importScripts=(...names)=>names.filter(n=>n!=='image-store.js').forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),worker));
 vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),worker);
 const elements=new Map();function element(){return {value:'',hidden:false,disabled:false,files:[],children:[],listeners:{},classList:{add(){}},addEventListener(e,fn){this.listeners[e]=fn;},replaceChildren(){this.children=[];},appendChild(v){this.children.push(v);},focus(){},select(){}};}
 const doc={querySelector(k){if(!elements.has(k))elements.set(k,element());return elements.get(k);},createElement:element};
 doc.querySelector('#reference-kind').value='website';
 const popup={chrome,URL,crypto:{randomUUID:()=> 'handoff-test'},ParityImageStore:imageStore,document:doc,window:{close(){}},createImageBitmap:async()=>({width:800,height:600,close(){}})};
 for(const name of ['settings-data.js','site-access.js','popup.js'])vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),popup,{filename:name});
 return {data,chrome,listeners,tabs,images,grants,doc,async review(kind='website'){await settle();doc.querySelector('#reference-kind').value=kind;doc.querySelector('#reference-url').value='https://reference.example/';doc.querySelector('#replica-url').value='https://implementation.example/';if(kind==='image'){doc.querySelector('#reference-image').files=[{name:'demo.png',type:'image/png',size:100}];doc.querySelector('#reference-css-width').value='800';}await doc.querySelector('#compare-form').listeners.submit({preventDefault(){}});},async approve(){for(const o of ['https://reference.example/*','https://implementation.example/*'])grants.add(o);listeners.added?.({origins:[...grants]});await settle();await settle();}};
}
test('background opens the reviewed comparison when the permission sheet destroys the popup',async()=>{
 const f=fixture();await f.review();
 // The permission promise never resumes, just as when Chrome destroys the popup.
 void f.doc.querySelector('#confirm-access').listeners.click();await settle();
 assert.equal(f.tabs.length,0);
 await f.approve();
 assert.equal(f.tabs.length,1,'approved launch must survive loss of popup continuation');
 assert.match(f.tabs[0].url,/compare.html\?id=handoff-test$/);
 await f.approve();assert.equal(f.tabs.length,1,'duplicate permission events must not open extra tabs');
});
test('already-approved origins launch once, without waiting for another permission event',async()=>{
 const f=fixture();await f.review();f.grants.add('https://reference.example/*');f.grants.add('https://implementation.example/*');
 void f.doc.querySelector('#confirm-access').listeners.click();await settle();await settle();assert.equal(f.tabs.length,1);
});
test('denied permission cancels launch data and does not open a comparison',async()=>{
 const f=fixture();await f.review();f.chrome.permissions.request=async()=>false;
 await f.doc.querySelector('#confirm-access').listeners.click();await settle();
 assert.equal(f.tabs.length,0);assert.equal(f.data['comparison_handoff-test'],undefined);
 await f.review();assert.equal(f.doc.querySelector('#confirm-access').disabled,false);
 f.chrome.permissions.request=()=>new Promise(()=>{});
 void f.doc.querySelector('#confirm-access').listeners.click();await settle();await f.approve();
 assert.equal(f.tabs.length,1,'a denied request must remain retryable');
});
test('image comparisons persist the image before the popup can be destroyed',async()=>{
 const f=fixture();await f.review('image');void f.doc.querySelector('#confirm-access').listeners.click();await settle();
 await f.approve();assert.equal(f.tabs.length,1);assert(f.images.has('handoff-test'));
});
test('prepared but unconfirmed reviews never launch on unrelated permission events',async()=>{
 const f=fixture();await f.review();await f.approve();assert.equal(f.tabs.length,0);
});
