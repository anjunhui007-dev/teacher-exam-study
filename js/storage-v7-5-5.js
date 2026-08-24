(() => {
'use strict';
const LARGE_KEYS=new Set(['tes_curriculum_v5','tes_curriculum_tables_v1']);
const DB_NAME='teacher_exam_study_v755', STORE='kv';
const nativeGet=Storage.prototype.getItem, nativeSet=Storage.prototype.setItem, nativeRemove=Storage.prototype.removeItem;
const mem=new Map(), pending=new Set();
let db=null;
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'))})}
function idbGet(key){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error)})}
function idbPut(key,val){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(val,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'))})}
function idbDel(key){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
function track(p){pending.add(p);p.finally(()=>pending.delete(p));return p}
async function init(){
 db=await openDB();
 for(const key of LARGE_KEYS){let val=await idbGet(key);if(val==null){const legacy=nativeGet.call(localStorage,key);if(legacy!=null){val=legacy;await idbPut(key,legacy)}}if(val!=null)mem.set(key,String(val));try{nativeRemove.call(localStorage,key)}catch{}}
 const proto=Storage.prototype;
 proto.getItem=function(key){if(this===localStorage&&LARGE_KEYS.has(String(key)))return mem.has(String(key))?mem.get(String(key)):null;return nativeGet.call(this,key)};
 proto.setItem=function(key,value){if(this===localStorage&&LARGE_KEYS.has(String(key))){const k=String(key),v=String(value);mem.set(k,v);track(idbPut(k,v));return}return nativeSet.call(this,key,value)};
 proto.removeItem=function(key){if(this===localStorage&&LARGE_KEYS.has(String(key))){const k=String(key);mem.delete(k);track(idbDel(k));return}return nativeRemove.call(this,key)};
}
window.TESLargeStore={ready:init().catch(err=>{console.error('TES large storage init failed',err);throw err}),flush:async()=>{while(pending.size)await Promise.allSettled([...pending])},keys:[...LARGE_KEYS],backend:'IndexedDB'};
})();