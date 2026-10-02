(function(){
"use strict";
/* ---------- utilities ---------- */
const $ = (s,el=document)=>el.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtKm = km => km.toLocaleString(LOC,{maximumFractionDigits:1,minimumFractionDigits:1});
const fmtInt = n => Math.round(n).toLocaleString(LOC);
function fmtDur(h){const m=Math.round(h*60);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')} h`}
function haversine(a,b){const R=6371,toR=Math.PI/180,dLat=(b[0]-a[0])*toR,dLng=(b[1]-a[1])*toR;const s=Math.sin(dLat/2)**2+Math.cos(a[0]*toR)*Math.cos(b[0]*toR)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function hexRgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
const I18N=window.HOOFPRINT_I18N;
let LANG=(()=>{try{const v=localStorage.getItem('hoofprint.lang');if(v&&I18N[v])return v}catch(e){}/* no saved choice: the first supported language in the browser's preference list (German phones and browsers in DE/AT/CH get German) */
 for(const l of (navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''])){const k=String(l).slice(0,2).toLowerCase();if(I18N[k])return k}return 'en'})();
const LOC=I18N[LANG].locale;
function T(k,v){let s=I18N[LANG][k]??I18N.de[k]??k;if(v)for(const n in v)s=s.split('{'+n+'}').join(v[n]);return s}
const tr=(r,f)=>(LANG==='en'&&r[f+'_en'])||r[f];
const srcLabel=s=>s==='Beispiel'?T('example'):s==='Gezeichnet'?T('drawn'):s==='Aufgezeichnet'?T('recorded'):s;
const diffLabel=d=>T('d_'+d);
const featLabel=f=>T('feat_'+f);
const surfLabel=k=>I18N[LANG]['s_'+k]||k;
let toastT;function toast(msg){let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)}
function rng(seed){let s=seed>>>0||1;return()=>{s=Math.imul(s^(s>>>15),2246822507)+0x9e3779b9>>>0;s^=s>>>13;return(s>>>0)/4294967296}}

/* ---------- seed geometry ---------- */
function loop(c,rKm,s,eleBase,eleAmp,n=180){const pts=[];for(let i=0;i<=n;i++){const t=i/n*Math.PI*2;const r=rKm*(1+.2*Math.sin(3*t+s)+.09*Math.sin(7*t+2*s)+.04*Math.sin(13*t+s*3));const lat=c[0]+r/111*Math.sin(t);const lng=c[1]+r/(111*Math.cos(c[0]*Math.PI/180))*Math.cos(t);const e=eleBase+eleAmp*(.5+.5*Math.sin(2*t+s))+eleAmp*.18*Math.sin(9*t+s)+eleAmp*.06*Math.sin(23*t);pts.push([+lat.toFixed(6),+lng.toFixed(6),Math.round(e)])}return pts}
function line(a,b,s,eleBase,eleAmp,n=160){const pts=[];const dx=b[1]-a[1],dy=b[0]-a[0];const len=Math.hypot(dx,dy);for(let i=0;i<=n;i++){const t=i/n;const w=(.006*Math.sin(t*Math.PI*3+s)+.002*Math.sin(t*Math.PI*11+s))*Math.sin(t*Math.PI);const lat=a[0]+dy*t+(dx/len)*w;const lng=a[1]+dx*t-(dy/len)*w;pts.push([+lat.toFixed(6),+lng.toFixed(6),Math.round(eleBase+eleAmp*(.5+.5*Math.sin(t*9+s)))])}return pts}

/* Seed photos: illustrated placeholders so the gallery has something to show */
function scene(seed,kind){const r=rng(seed);const sky=kind==='beach'?['#9cc7e6','#e8f1f6']:kind==='alp'?['#7fb0dc','#d9ebf7']:['#a9cbe0','#f0e9d4'];const hills=kind==='heath'?['#9a6b9e','#7c5a84','#5d7a46']:kind==='beach'?['#e9d9a8','#d8c48a','#4f88b5']:kind==='alp'?['#8ea7b8','#6f9a5a','#4f7d3d']:['#7da36a','#5f8a50','#3f6b37'];let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="${60+r()*180}" cy="${50+r()*30}" r="18" fill="#fff6d8" opacity=".9"/>`;
if(kind==='alp'){s+=`<path d="M0 170 L${60+r()*30} ${70+r()*20} L140 160 L${200+r()*30} ${60+r()*20} L300 165 V300 H0Z" fill="#a9b9c6"/><path d="M${60+20} 95 l-12 18 h24z" fill="#fff" opacity=".8"/>`}
hills.forEach((c,i)=>{const y=150+i*40+r()*15;let d=`M0 ${y}`;for(let x=0;x<=300;x+=30)d+=` Q${x+15} ${y-20+r()*30} ${x+30} ${y-5+r()*12}`;s+=`<path d="${d} V300 H0Z" fill="${c}"/>`});
if(kind==='forest'||kind==='heath'||kind==='alp'){for(let i=0;i<9;i++){const x=r()*300,y=200+r()*60,h=30+r()*40;s+=`<path d="M${x} ${y} l${h*.28} ${h} h-${h*.56}z" fill="#2f5a33" opacity=".9" transform="translate(0 -${h})"/>`}}
s+=`<path d="M150 300 C${140+r()*20} 260 ${120+r()*60} 230 ${150+r()*30} 205" stroke="#d9c8a0" stroke-width="10" fill="none" opacity=".85" stroke-linecap="round"/>`;
// horse silhouette with rider, simplified
const hx=110+r()*70,hy=232;s+=`<g transform="translate(${hx} ${hy}) scale(.9)" fill="#3a2a20"><ellipse cx="0" cy="0" rx="22" ry="10"/><path d="M16 -6 L30 -24 L36 -22 L28 -2Z"/><rect x="-18" y="4" width="4" height="22"/><rect x="-10" y="5" width="4" height="21"/><rect x="8" y="5" width="4" height="21"/><rect x="15" y="4" width="4" height="22"/><path d="M-22 -2 q-10 6 -8 20 l3 0 q0 -12 7 -16z"/><circle cx="-2" cy="-26" r="5"/><path d="M-6 -21 h8 l2 14 h-12z"/></g>`;
return'data:image/svg+xml,'+encodeURIComponent(s+'</svg>')}

const FEAT={parking:1,water:1,gallop:1,inn:1,beach:1,shade:1,stream:1,road:1,plakette:1};
const FEAT_ICON={parking:'<path d="M6 20V4h7a5 5 0 0 1 0 10H6"/>',water:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',gallop:'<path d="M3 17h18M5 13l4-4 4 3 6-6"/>',inn:'<path d="M5 3v8a3 3 0 0 0 6 0V3M8 11v10M17 3c-2 0-3 3-3 6s1 3 3 3v9"/>',beach:'<path d="M3 18c3-2 6 2 9 0s6 2 9 0M12 4a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7zM12 11v6"/>',shade:'<path d="M12 3l6 9h-3l4 6H5l4-6H6z M12 18v3"/>',plakette:'<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 12h8"/>',stream:'<path d="M3 15c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0M3 19c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0M7 11V5M17 11V5"/>',road:'<path d="M4 3l3 18M20 3l-3 18M12 4v3M12 10.5v3M12 17v3"/>'};
const SURF_COL={Sandweg:'#d8b56a',Heidepfad:'#9a6b9e',Waldweg:'#4f7d45',Feldweg:'#b8a26a',Wiesenpfad:'#8cbf5a',Schotter:'#9aa0a6',Asphalt:'#5c6670',Strand:'#e6cf8f',Almweg:'#7aa35c',Unbekannt:'#a6aea0'};

const SEED=[
 {id:'s-heide',season_en:'Year-round; during heather bloom (Aug–Sep) busy with walkers, so set off early.',desc_en:'Easy loop on soft sand tracks through the heath with views over juniper groves. A farm café with hitching rail and water trough waits at the end.',name:'Heideblüten-Runde',region:'Lüneburger Heide · Niedersachsen',coords:loop([53.205,9.965],1.9,1,72,48),difficulty:'leicht',surfaces:{Sandweg:52,Heidepfad:26,Waldweg:16,Asphalt:6},features:['parking','water','inn','plakette'],season:'Ganzjährig; zur Heideblüte (Aug–Sep) viele Fußgänger, früh losreiten.',desc:'Gemütliche Runde über weiche Sandwege durch die Heide, mit Blick über Wacholderhaine. Am Ende wartet ein Hofcafé mit Anbindebalken und Tränke.',kind:'heath',reviews:[{name:'Anja mit Fjordpferd Mika',stars:5,text:'Perfekt für junge Pferde, fast nur weicher Boden. Parkplatz für 4 Hänger.',date:'2026-08-24'},{name:'Tom',stars:4,text:'Schön, aber am Wochenende voll mit Kutschen.',date:'2026-07-12'}]},
 {id:'s-eifel',season_en:'April to October; the steep sections are slippery after rain.',desc_en:'Demanding ride with long climbs around a volcanic crater lake. Needs good fitness and sure-footed horses; the top rewards you with a wide view over the crater lakes.',name:'Maarblick-Trail',region:'Vulkaneifel · Rheinland-Pfalz',coords:loop([50.205,6.84],2.5,2.3,410,190),difficulty:'schwer',surfaces:{Waldweg:44,Schotter:28,Wiesenpfad:20,Asphalt:8},features:['parking','water','shade'],season:'April bis Oktober; nach Regen sind die Steilstücke rutschig.',desc:'Anspruchsvolle Tour mit langen Anstiegen rund um ein Maar. Gute Kondition und trittsichere Pferde nötig, oben belohnt ein weiter Blick über die Kraterseen.',kind:'forest',reviews:[{name:'Lisa & Trakehner Cash',stars:5,text:'Konditionstraining deluxe. Wasser an der Hälfte der Strecke.',date:'2026-09-03'}]},
 {id:'s-usedom',season_en:'Beach riding is only allowed outside the bathing season (usually 1 Oct to 30 Apr). Start and finish are at different car parks.',desc_en:'Ride along the waterline on firm, wet sand, ideal for a gallop. Back through the coastal forest.',name:'Ostsee-Strandritt',region:'Usedom · Mecklenburg-Vorpommern',coords:line([54.095,13.875],[54.012,14.048],0.7,3,9),difficulty:'mittel',surfaces:{Strand:64,Waldweg:22,Sandweg:14},features:['beach','parking','gallop'],season:'Strandreiten nur außerhalb der Badesaison erlaubt (meist 1. Okt bis 30. Apr). Streckenführung: Anfang und Ende liegen an verschiedenen Parkplätzen.',desc:'Strecke am Spülsaum entlang mit festem, nassem Sand, ideal zum Galoppieren. Zurück durch den Küstenwald.',kind:'beach',reviews:[{name:'Mareike',stars:5,text:'Bei Ebbe-ähnlich niedrigem Wasserstand traumhaft. Unbedingt Saison beachten!',date:'2026-03-29'},{name:'Jens & Haflinger Bruno',stars:4,text:'Der Wald-Rückweg ist teils sehr tiefer Sand.',date:'2025-11-15'}]},
 {id:'s-schorf',season_en:'Year-round; mind hunting seasons in autumn.',desc_en:'Long, flat loop through pine forest with several signposted gallop stretches on wide sand tracks.',name:'Schorfheide Kiefernpfad',region:'Schorfheide · Brandenburg',coords:loop([52.965,13.66],3.0,4.1,62,26),difficulty:'mittel',surfaces:{Sandweg:48,Waldweg:38,Feldweg:14},features:['gallop','shade','parking'],season:'Ganzjährig; im Herbst Jagdzeiten beachten.',desc:'Lange, flache Runde durch Kiefernwald mit mehreren ausgeschilderten Galoppstrecken auf breiten Sandwegen.',kind:'forest',reviews:[{name:'Paula',stars:4,text:'Breite Wege, kaum Verkehr. Bremsen im Sommer heftig.',date:'2026-06-30'}]},
 {id:'s-allgaeu',season_en:'June to September; please close pasture gates.',desc_en:'Mountain ride on alpine tracks with two places to stop for food. Many pasture gates, so horses should be used to cows.',name:'Allgäuer Almen-Tour',region:'Oberallgäu · Bayern',coords:loop([47.565,10.29],2.2,5.5,820,330),difficulty:'schwer',surfaces:{Almweg:46,Schotter:32,Wiesenpfad:14,Asphalt:8},features:['inn','water'],season:'Juni bis September; Weidetore bitte schließen.',desc:'Bergtour über Almwege mit zwei Einkehrmöglichkeiten. Viele Weidetore, Pferde sollten Kühe gewohnt sein.',kind:'alp',reviews:[{name:'Vroni',stars:5,text:'Die Kässpatzen auf der Alm sind den Aufstieg wert.',date:'2026-08-09'},{name:'Kerstin & Noriker Lotte',stars:3,text:'Schotterpassagen lang, Hufschutz empfehlenswert.',date:'2026-07-21'}]},
 {id:'s-taunus',season_en:'Year-round.',desc_en:'Short after-work loop through stream valleys and orchard meadows. Good for novice riders and horses in training.',name:'Taunus Wiesental-Runde',region:'Hochtaunus · Hessen',coords:loop([50.255,8.45],1.5,6.2,330,110),difficulty:'leicht',surfaces:{Wiesenpfad:34,Feldweg:30,Waldweg:28,Asphalt:8},features:['parking','water','shade'],season:'Ganzjährig.',desc:'Kurze Feierabendrunde durch Bachtäler und Streuobstwiesen. Gut für Reitanfänger und Pferde in Aufbau.',kind:'meadow',reviews:[]}
];
SEED.forEach((r,i)=>{r.source='Beispiel';r.createdAt='2026-0'+(i+1)+'-01';r.seedPhotos=[scene(i*7+3,r.kind),scene(i*7+11,r.kind)]});

/* ---------- this device (favourites, own posts, device id) ---------- */
const KEY='hoofprint.v1';
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
let local={deviceId:null,favorites:[],mine:[],myReviews:[],myPhotos:[],myRides:[],log:[],horses:{},posts:[],routes:[],reviews:[],photos:[],rides:[]};
try{const raw=localStorage.getItem(KEY)||localStorage.getItem('hufspur.v2');if(raw)local=Object.assign(local,JSON.parse(raw))}catch(e){}
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(local));return true}catch(e){return false}}
if(!local.deviceId){local.deviceId=uuid();saveLocal()}
/* Light spam brake on this device; the database enforces its own limit too. */
function throttle(){const now=Date.now();local.posts=local.posts.filter(t=>now-t<10*60e3);if(local.posts.length>=8)throw new Error(T('tooMuch'));local.posts.push(now);saveLocal()}

/* ---------- shared data: Supabase when configured, otherwise this browser ---------- */
const CFG=window.HOOFPRINT_CONFIG||window.HUFSPUR_CONFIG||{};
const sb=(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase)?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false}}):null;
const shared={routes:[],reviews:[],photos:[],rides:[]};
const publicUrl=path=>`${CFG.supabaseUrl}/storage/v1/object/public/photos/${path}`;
function fail(error){if(!error)return;const m=String(error.message||error);if(/rate|too many/i.test(m))throw new Error(T('rateLimited'));if(error.code==='PGRST202'||/could not find the function|schema cache/i.test(m))throw new Error(T('dbUpdateNeeded'));throw new Error(T('saveFailed')+m)}
const backend=sb?{
 online:true,
 async load(){const [r,v,p]=await Promise.all([
   sb.from('routes').select('id,name,region,difficulty,surfaces,features,description,coords,source,created_at').order('created_at',{ascending:false}).limit(2000),
   sb.from('reviews').select('id,route_id,name,stars,text,created_at').order('created_at',{ascending:false}).limit(10000),
   sb.from('photos').select('id,route_id,path,created_at').order('created_at',{ascending:false}).limit(10000)]);
  for(const x of[r,v,p])if(x.error)throw x.error;
  shared.routes=r.data.map(x=>({id:x.id,name:x.name,region:x.region,difficulty:x.difficulty,surfaces:x.surfaces,features:x.features||[],desc:x.description,coords:x.coords,source:x.source,createdAt:x.created_at}));
  shared.reviews=v.data.map(x=>({id:x.id,routeId:x.route_id,name:x.name,stars:x.stars,text:x.text,date:x.created_at}));
  shared.photos=p.data.map(x=>({id:x.id,routeId:x.route_id,url:publicUrl(x.path)}));
  /* rides come from a later database update, so a missing table must not break the page */
  const d=await sb.from('rides').select('id,route_id,name,horse,ridden_on,conditions,note,created_at').order('ridden_on',{ascending:false}).order('created_at',{ascending:false}).limit(10000);
  backend.ridesReady=!d.error;shared.rides=d.error?[]:d.data.map(x=>({id:x.id,routeId:x.route_id,name:x.name,horse:x.horse,date:x.ridden_on,conditions:x.conditions||[],note:x.note}))},
 ridesReady:false,
 async addRide(v){const{error}=await sb.from('rides').insert({id:v.id,route_id:v.routeId,name:v.name,horse:v.horse,ridden_on:v.date,conditions:v.conditions,note:v.note,device_id:local.deviceId});if(error&&/rides|relation|schema cache/i.test(error.message||''))throw new Error(T('dbUpdateNeeded'));fail(error);shared.rides.unshift(v)},
 async addRoute(r){const{error}=await sb.from('routes').insert({id:r.id,name:r.name,region:r.region,difficulty:r.difficulty,surfaces:r.surfaces,features:r.features,description:r.desc,coords:r.coords,source:r.source,device_id:local.deviceId});fail(error);shared.routes.unshift(r)},
 async addReview(v){const{error}=await sb.from('reviews').insert({id:v.id,route_id:v.routeId,name:v.name,stars:v.stars,text:v.text,device_id:local.deviceId});fail(error);shared.reviews.unshift(v)},
 async addPhoto(routeId,blob){const id=uuid(),path=`${routeId}/${id}.jpg`;const up=await sb.storage.from('photos').upload(path,blob,{contentType:'image/jpeg'});fail(up.error);
  const{error}=await sb.from('photos').insert({id,route_id:routeId,path,device_id:local.deviceId});fail(error);const p={id,routeId,url:publicUrl(path)};shared.photos.unshift(p);return p},
 async remove(kind,id){const{data,error}=await sb.rpc('delete_own',{kind,target:id,dev:local.deviceId});fail(error);if(!data)throw new Error(T('deleteOnlyDevice'));dropShared(kind,id)},
 async updateRoute(id,f){const{data,error}=await sb.rpc('update_own_route',{target:id,dev:local.deviceId,p:{name:f.name,region:f.region,difficulty:f.difficulty,surfaces:f.surfaces,features:f.features,description:f.desc}});fail(error);if(!data)throw new Error(T('editOnlyDevice'));Object.assign(shared.routes.find(x=>x.id===id)||{},f)},
 async updateReview(id,f){const{data,error}=await sb.rpc('update_own_review',{target:id,dev:local.deviceId,p_name:f.name,p_stars:f.stars,p_text:f.text});fail(error);if(!data)throw new Error(T('editOnlyDevice'));Object.assign(shared.reviews.find(x=>x.id===id)||{},f)},
 async report(kind,id,reason){const{error}=await sb.from('reports').insert({kind,target_id:id,reason});fail(error)}
}:{
 online:false,
 async load(){shared.routes=local.routes;shared.reviews=local.reviews;shared.photos=local.photos;shared.rides=local.rides},
 ridesReady:true,
 async addRide(v){local.rides.unshift(v);if(!saveLocal()){local.rides.shift();throw new Error(T('storageFull'))}},
 async addRoute(r){local.routes.unshift(r);if(!saveLocal()){local.routes.shift();throw new Error(T('storageFull'))}},
 async addReview(v){local.reviews.unshift(v);if(!saveLocal()){local.reviews.shift();throw new Error(T('storageFull'))}},
 async addPhoto(routeId,blob){const p={id:uuid(),routeId,url:await blobToDataURL(blob)};local.photos.unshift(p);if(!saveLocal()){local.photos.shift();throw new Error(T('photoStorageFull'))}return p},
 async remove(kind,id){dropShared(kind,id);saveLocal()},
 async updateRoute(id,f){Object.assign(local.routes.find(x=>x.id===id)||{},f);saveLocal()},
 async updateReview(id,f){Object.assign(local.reviews.find(x=>x.id===id)||{},f);saveLocal()},
 async report(){}
};
function dropShared(kind,id){const pick=a=>a.filter(x=>x.id!==id);
 if(kind==='route'){const keep=x=>x.routeId!==id;shared.routes=pick(shared.routes);shared.reviews=shared.reviews.filter(keep);shared.photos=shared.photos.filter(keep);shared.rides=shared.rides.filter(keep)}
 if(kind==='review')shared.reviews=pick(shared.reviews);if(kind==='photo')shared.photos=pick(shared.photos);if(kind==='ride')shared.rides=pick(shared.rides);
 if(!backend.online){local.routes=shared.routes;local.reviews=shared.reviews;local.photos=shared.photos;local.rides=shared.rides}}
function blobToDataURL(b){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b)})}

/* ---------- route model ---------- */
function stats(r){if(r._s)return r._s;let km=0,up=0,down=0,minE=Infinity,maxE=-Infinity,hasE=false;const prof=[];let lastE=null;
 for(let i=0;i<r.coords.length;i++){const p=r.coords[i];if(i)km+=haversine(r.coords[i-1],p);const e=p[2];if(e!=null&&!isNaN(e)){hasE=true;if(lastE!=null){const d=e-lastE;if(d>0)up+=d;else down-=d}lastE=e;minE=Math.min(minE,e);maxE=Math.max(maxE,e)}prof.push([km,e])}
 const loopish=r.coords.length>2&&haversine(r.coords[0],r.coords[r.coords.length-1])<.3;
 return r._s={km,up,down,minE,maxE,hasE,prof,hours:km/7+up/600,loop:loopish}}
const showExamples=CFG.showExamples!==false;
const allRoutes=()=>[...shared.routes,...(showExamples?SEED:[])];
const byId=id=>allRoutes().find(r=>r.id===id);
const isMine=r=>local.mine.includes(r.id);
const reviewsOf=r=>[...shared.reviews.filter(x=>x.routeId===r.id),...(r.reviews||[]).map(x=>({...x,example:true}))];
const photosOf=r=>[...shared.photos.filter(x=>x.routeId===r.id).map(p=>({...p,src:p.url})),...(r.seedPhotos||[]).map(src=>({src,example:true}))];
function avg(r){const rv=reviewsOf(r);return rv.length?rv.reduce((a,b)=>a+b.stars,0)/rv.length:0}
function starStr(v){const f=Math.round(v);return'★'.repeat(f)+'☆'.repeat(5-f)}

/* ---------- state ---------- */
const ui={tab:'discover',q:'',diff:new Set(),feats:new Set(),maxKm:40,sort:'rating',inView:false,sel:null,draft:null,loading:true,loadError:null};

/* ---------- map ---------- */
let map=null,routeLayers={},startMarkers={};
const HORSESHOE='<svg viewBox="0 0 24 24"><path d="M8 4.5C5.8 6 5 8.6 5.4 11.4c.5 3.4 3 5.4 6.6 5.4s6.1-2 6.6-5.4C19 8.6 18.2 6 16 4.5"/></svg>';
function initMap(){
 if(typeof L==='undefined'){$('#map').innerHTML=`<div class="maperr">${T('mapFail')}</div>`;return}
 map=L.map('map',{zoomControl:false,minZoom:4,maxZoom:18}).setView([51.2,10.4],6);
 const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">'+T('attrOsm')+'</a>'});
 const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), © '+T('attrOsm')});
 const riding=L.tileLayer('https://tile.waymarkedtrails.org/riding/{z}/{x}/{y}.png',{maxZoom:18,opacity:.9,attribution:T('attrRiding')+' © <a href="https://riding.waymarkedtrails.org">Waymarked Trails</a>'});
 osm.addTo(map);riding.addTo(map);
 L.control.layers({[T('layerStreet')]:osm,[T('layerTopo')]:topo},{[T('layerRiding')]:riding},{position:'topright',collapsed:true}).addTo(map);
 L.control.zoom({position:'topright'}).addTo(map);
 L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
 initPoi();
 map.on('moveend',()=>{if(ui.inView&&!ui.sel)renderPanel()});
 map.on('click',e=>{if(ui.draft)addDraftPoint(e.latlng)});
 const mq=matchMedia('(prefers-color-scheme: dark)');mq.addEventListener?.('change',styleRoutes);
}
/* Optional map layers from OpenStreetMap (Overpass API), each switched on by its own button:
   "Bierpause" (places to eat) and riding stations. OSM tagging varies, so each layer queries several tag combinations. */
/* /osm/… are same-site proxies set up in vercel.json; some browsers and networks block the OSM servers directly */
const VIA_SITE=/^https?:/.test(location.protocol);
const OVERPASS=[...(VIA_SITE?['api/osm?service=overpass&','osm/overpass?']:[]),'https://overpass-api.de/api/interpreter?','https://overpass.private.coffee/api/interpreter?','https://overpass.kumi.systems/api/interpreter?'];
const POI_MINZOOM=12;
const APP_VERSION=(document.querySelector('script[src*="app.js"]')?.src.match(/v=([^&]+)/)||[])[1]||'dev';
const POI_DEFS={
 food:{icon:'🍽️',query:bb=>`nwr["amenity"~"^(restaurant|fast_food|cafe|biergarten|pub|ice_cream)$"](${bb});nwr["shop"="kiosk"](${bb});nwr["tourism"~"^(hotel|guest_house|alpine_hut)$"]["name"~"gasthaus|gasthof|wirtshaus|restaurant|einkehr|krug|schänke|schenke|baude",i](${bb});`,
  kind:t=>({restaurant:'restaurant',fast_food:'fast_food',cafe:'cafe',biergarten:'biergarten',pub:'pub',ice_cream:'ice_cream'})[t.amenity]||(t.shop==='kiosk'?'kiosk':'inn'),
  icons:{restaurant:'🍽️',fast_food:'🥨',cafe:'☕',biergarten:'🍺',pub:'🍺',ice_cream:'🍦',kiosk:'🥤',inn:'🍽️'}},
 stations:{icon:'🐴',query:bb=>`nwr["leisure"="horse_riding"](${bb});nwr["tourism"]["name"~"wanderreit|reiterhof|pferdehof|reitstation|reiterpension",i](${bb});nwr["tourism"]["horse"~"^(yes|designated)$"](${bb});`,
  kind:t=>/wanderreit/i.test(t.name||'')?'station':t.leisure==='horse_riding'?'stable':(t.tourism?'lodging':'stable'),
  icons:{station:'🐴',stable:'🐎',lodging:'🛏️'}}};
const poi={};
function initPoi(){const box=L.DomUtil.create('div','poictl');L.DomEvent.disableClickPropagation(box);L.DomEvent.disableScrollPropagation(box);
 Object.entries(POI_DEFS).forEach(([key,def])=>{const P=poi[key]={key,def,on:false,layer:L.layerGroup().addTo(map),seen:{},timer:null,busy:false,again:false};
  const w=document.createElement('div');w.className='poiitem';w.innerHTML=`<label class="poibtn" title="${T(key+'Title')}"><input type="checkbox"><span class="poiic">${ICON[key]||def.icon}</span><span>${T(key)}</span><b class="cnt" hidden></b></label><div class="poihint" role="status" hidden></div>`;
  P.btn=w.querySelector('label');P.box=w.querySelector('input');P.cnt=w.querySelector('.cnt');P.hint=w.querySelector('.poihint');P.box.onchange=()=>togglePoi(P);box.appendChild(w)});
 new (L.Control.extend({onAdd:()=>box}))({position:'topleft'}).addTo(map);
 map.on('moveend',()=>Object.values(poi).forEach(P=>{if(P.on){clearTimeout(P.timer);P.timer=setTimeout(()=>loadPoi(P),400)}}));
 delete local.food;delete local.poi}
function poiHint(P,txt,n){P.hint.textContent=txt||'';P.hint.hidden=!txt;P.cnt.textContent=n||'';P.cnt.hidden=!n}
/* nothing is searched until someone ticks the box; the choice is not remembered between visits */
function togglePoi(P){P.on=P.box.checked;P.btn.classList.toggle('on',P.on);
 if(P.on)loadPoi(P);else{P.layer.clearLayers();P.seen={};poiHint(P,'');P.btn.title=T(P.key+'Title')}}
/* Ask all servers at once and take the first good answer; public Overpass servers are often busy */
async function overpass(q){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),18000);
 try{return await Promise.any(OVERPASS.map(async url=>{const r=await fetch(url+'data='+encodeURIComponent(q),{signal:ctl.signal});if(!r.ok){let d='';try{d=(await r.json()).error||''}catch(e){}throw new Error(url.split('?')[0].replace(/^https:\/\//,'')+' '+r.status+(d?' '+d:''))}const j=await r.json();if(!Array.isArray(j.elements))throw new Error(url+' bad');return j}))}
 finally{clearTimeout(t);ctl.abort()}}
/* Fallback when every Overpass server fails: OpenStreetMap's Nominatim search, limited to the map view.
   Nominatim allows about one request per second, so the searches run one after another. */
const NOMI_SEARCH={food:[['amenity','restaurant'],['amenity','fast_food'],['amenity','cafe'],['amenity','biergarten'],['amenity','pub'],['q','kiosk'],['q','Gasthaus'],['q','Gasthof']],
 stations:[['q','Wanderreitstation'],['q','Reiterhof'],['q','Reitstall'],['q','Pferdehof'],['q','Reitanlage'],['q','riding']]};
async function nomiFetch(qs){let last;for(const base of [...(VIA_SITE?['api/osm?service=nominatim&','osm/nominatim?']:[]),'https://nominatim.openstreetmap.org/search?']){
 try{const r=await fetch(base+qs);if(r.ok&&/json/.test(r.headers.get('content-type')||''))return r;last=new Error('HTTP '+r.status)}catch(e){last=e}}throw last}
async function nominatimPoi(P,b){const vb=[b.getWest(),b.getNorth(),b.getEast(),b.getSouth()].map(x=>x.toFixed(4)).join(','),out=[];let ok=0,last;
 for(const [k,v] of NOMI_SEARCH[P.key]){if(!P.on)break;
  try{const r=await nomiFetch(`format=jsonv2&extratags=1&bounded=1&limit=40&accept-language=${LANG}&viewbox=${vb}&${k}=${encodeURIComponent(v)}`);
   const a=await r.json();ok++;
   a.forEach(x=>{const tags={...(x.extratags||{}),name:x.name||undefined};tags[x.category]=x.type;out.push({type:x.osm_type,id:x.osm_id,lat:+x.lat,lon:+x.lon,tags})})}catch(e){last=e}
  await new Promise(res=>setTimeout(res,1100))}
 if(!ok)throw new Error('Nominatim: '+(last?.message||String(last||'?')));
 /* keep only plausible hits for the station search, which is name based */
 const keep=P.key==='stations'?out.filter(e=>e.tags.leisure==='horse_riding'||/reit|pferd|horse|riding/i.test(e.tags.name||'')):out;
 return{elements:keep}}
async function loadPoi(P){if(!P.on)return;if(P.busy){P.again=true;return}
 if(map.getZoom()<POI_MINZOOM){poiHint(P,T('poiZoom'));return}
 const b=map.getBounds().pad(.1),bb=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()].map(x=>x.toFixed(4)).join(',');
 P.busy=true;P.btn.classList.add('busy');poiHint(P,T('poiLoading'));
 try{let j;try{j=await overpass(`[out:json][timeout:20];(${P.def.query(bb)});out center 300;`)}
  catch(e){console.warn('Overpass',e);P.err='Overpass: '+((e.errors||[e]).map(x=>x.message||x.name).join(', '));poiHint(P,T('poiFallback'));j=await nominatimPoi(P,b)}
  if(!P.on)return;
  j.elements.forEach(e=>{const id=e.type+e.id;if(P.seen[id])return;const la=e.lat??e.center?.lat,lo=e.lon??e.center?.lon;if(la==null)return;P.seen[id]=1;
   const t=e.tags||{},k=P.def.kind(t),label=T(P.key+'_'+k),web=t.website||t['contact:website'],tel=t.phone||t['contact:phone'];
   const m=L.marker([la,lo],{icon:L.divIcon({className:'',html:`<div class="poipin ${P.key}">${P.def.icons[k]||P.def.icon}</div>`,iconSize:[26,26],iconAnchor:[13,13]}),title:t.name||label,keyboard:false});
   m.bindPopup(`<b>${esc(t.name||label)}</b><br><span class="muted">${esc(label)}</span>${t.opening_hours?`<br>${T('poiHours')}: ${esc(t.opening_hours)}`:''}${tel?`<br><a href="tel:${esc(tel.replace(/[^+\d]/g,''))}">${esc(tel)}</a>`:''}${web?`<br><a href="${esc(/^https?:/.test(web)?web:'https://'+web)}" target="_blank" rel="noopener">${T('poiWeb')}</a>`:''}<br><a href="https://www.openstreetmap.org/${e.type}/${e.id}" target="_blank" rel="noopener">${T('poiOsm')}</a>`);
   m.addTo(P.layer)});
  const n=P.layer.getLayers().length;poiHint(P,n?'':T(P.key+'None'),n);P.btn.title=n?T(n===1?P.key+'N1':P.key+'N',{n}):T(P.key+'Title')}
 catch(e){console.warn('POI',e);poiHint(P,T('poiDown')+' ('+(P.err||'')+(e.message?' / '+e.message:'')+')')}
 finally{P.busy=false;P.btn.classList.remove('busy');if(P.again){P.again=false;loadPoi(P)}}}
function fitAll(){if(!map)return;const b=L.latLngBounds([]);allRoutes().forEach(r=>r.coords.forEach(p=>b.extend([p[0],p[1]])));if(b.isValid())map.fitBounds(b,{padding:[30,30],maxZoom:13,animate:false})}
function drawRoutes(){if(!map)return;Object.values(routeLayers).forEach(g=>map.removeLayer(g));Object.values(startMarkers).forEach(m=>map.removeLayer(m));routeLayers={};startMarkers={};
 (ui.sel&&byId(ui.sel)?[byId(ui.sel)]:visibleList(true)).forEach(r=>{const ll=r.coords.map(p=>[p[0],p[1]]);const casing=L.polyline(ll,{weight:8,opacity:.9,interactive:false});const ln=L.polyline(ll,{weight:4.5,opacity:1});const g=L.layerGroup([casing,ln]).addTo(map);g._c=casing;g._l=ln;ln.on('click',()=>select(r.id));ln.bindTooltip(r.name,{sticky:true});routeLayers[r.id]=g;
  const m=L.marker(ll[0],{icon:L.divIcon({className:'',html:`<div class="pin">${HORSESHOE}</div>`,iconSize:[28,28],iconAnchor:[14,30]}),title:r.name,keyboard:true}).addTo(map);m.on('click',()=>select(r.id));startMarkers[r.id]=m});
 styleRoutes()}
function styleRoutes(){const rc=cssVar('--route'),rs=cssVar('--route-sel'),cs=cssVar('--route-case');Object.entries(routeLayers).forEach(([id,g])=>{const sel=id===ui.sel;g._c.setStyle({color:cs,weight:sel?10:8});g._l.setStyle({color:sel?rs:rc,weight:sel?6:4.5,opacity:ui.sel&&!sel?.55:1});if(sel){g._c.bringToFront();g._l.bringToFront()}});Object.entries(startMarkers).forEach(([id,m])=>{const el=m.getElement()?.querySelector('.pin');if(el)el.classList.toggle('sel',id===ui.sel)})}

/* ---------- list ---------- */
function visibleList(ignoreTab){let rs=allRoutes();
 if(!ignoreTab){if(ui.tab==='fav')rs=rs.filter(r=>local.favorites.includes(r.id));if(ui.tab==='mine')rs=rs.filter(isMine)}
 const q=ui.q.trim().toLowerCase();if(q)rs=rs.filter(r=>(r.name+' '+(r.region||'')+' '+(r.desc||'')+' '+(r.desc_en||'')).toLowerCase().includes(q));
 if(ui.diff.size)rs=rs.filter(r=>ui.diff.has(r.difficulty));
 if(ui.feats.size)rs=rs.filter(r=>[...ui.feats].every(f=>(r.features||[]).includes(f)));
 if(ui.maxKm<40)rs=rs.filter(r=>stats(r).km<=ui.maxKm);
 if(!ignoreTab&&ui.inView&&map){const b=map.getBounds();rs=rs.filter(r=>r.coords.some(p=>b.contains([p[0],p[1]])))}
 const cmp={rating:(a,b)=>avg(b)-avg(a),short:(a,b)=>stats(a).km-stats(b).km,long:(a,b)=>stats(b).km-stats(a).km,new:(a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))}[ui.sort];
 return rs.sort(cmp)}

const ICON={
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
 filter:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
 pin:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
 near:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>',
 car:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14M4 17v-4l2-5h12l2 5v4M7 17v2M17 17v2"/><circle cx="8" cy="13.5" r=".6"/><circle cx="16" cy="13.5" r=".6"/></svg>',
 check:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
 food:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v8a2 2 0 0 0 2 2M11 3v8a2 2 0 0 1-2 2v8M9 3v6M17 3c-2 0-3 3-3 6s1 3 3 3v9"/></svg>',
 stations:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/></svg>',
 x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
function activeFilterCount(){return ui.diff.size+ui.feats.size+(ui.maxKm<40?1:0)+(ui.inView?1:0)}
function listTitle(){return ui.tab==='fav'?T('tabFav'):ui.tab==='mine'?T('tabMine'):ui.place&&ui.inView?T('routesNear',{place:esc(ui.place)}):T('navExplore')}
function renderPanel(){const p=$('#panel');if(ui.sel&&byId(ui.sel)){p.innerHTML=detailHTML(byId(ui.sel));bindDetail();return}
 const list=visibleList(),n=activeFilterCount();
 const body=ui.loading?`<div class="loading">${T('loading')}</div>`:ui.loadError?`<div class="empty"><strong>${T('loadFail')}</strong>${esc(ui.loadError)}<button class="btn" data-act="retry">${T('retry')}</button></div>`:list.length?list.map(cardHTML).join(''):emptyHTML();
 const chips=[...[...ui.diff].map(d=>['diff',d,diffLabel(d)]),...[...ui.feats].map(f=>['feat',f,featLabel(f)]),...(ui.maxKm<40?[['km','',T('upTo')+' '+ui.maxKm+' km']]:[]),...(ui.inView?[['view','',T('inView')]]:[])];
 p.innerHTML=`<div class="exhead">
  <div class="exrow"><h2>${listTitle()}</h2><span class="muted">${ui.loading?'':T(list.length===1?'nRoute':'nRoutes',{n:list.length})}</span></div>
  ${ui.place&&ui.tab==='discover'?`<button class="linkbtn" id="clearPlace">${T('showAllRegions')}</button>`:''}
  <div class="exsearch"><label class="search">${ICON.search}<input id="q" type="search" placeholder="${T('searchPh')}" value="${esc(ui.q)}" aria-label="${T('searchLabel')}"></label>
   <button class="btn" id="btnFilter" aria-label="${T('filters')}">${ICON.filter}<span>${T('filters')}</span>${n?`<b class="badge">${n}</b>`:''}</button></div>
  ${ui.q.trim().length>2?`<button class="linkbtn" id="geo">${ICON.pin} ${T('searchMap',{q:esc(ui.q.trim())})}</button>`:''}
  ${chips.length?`<div class="chips active">${chips.map(([k,v,l])=>`<button class="chip on" data-rm="${k}" data-v="${esc(v)}" title="${T('removeFilter')}">${esc(l)} ${ICON.x}</button>`).join('')}</div>`:''}
 </div>
 <div class="list">${body}</div>`;
 bindList()}
function emptyHTML(){if(ui.tab==='fav')return`<div class="empty"><strong>${T('emptyFavT')}</strong>${T('emptyFav')}<a class="btn" href="#/explore">${T('navExplore')}</a></div>`;
 if(ui.tab==='mine')return`<div class="empty"><strong>${T('emptyMineT')}</strong>${T('emptyMine')}<button class="btn primary" data-act="add">${T('addRoute')}</button></div>`;
 return`<div class="empty"><strong>${T('emptyT')}</strong>${T('empty')}${activeFilterCount()||ui.q?`<button class="btn" data-act="reset">${T('resetFilters')}</button>`:''}</div>`}
const innBadge=r=>(r.features||[]).includes('inn')?`<span class="innbadge" title="${esc(featLabel('inn'))}" aria-label="${esc(featLabel('inn'))}">🍺</span>`:'';
function cardHTML(r){const s=stats(r),a=avg(r),n=reviewsOf(r).length,ph=photosOf(r)[0];
 return`<a class="card" href="#/route/${encodeURIComponent(r.id)}" data-id="${esc(r.id)}">${ph?`<img class="thumb" src="${esc(ph.src)}" alt="" loading="lazy">`:`<div class="thumb"></div>`}
 <div style="min-width:0"><div class="src">${esc(srcLabel(r.source))}${isMine(r)?' · '+T('byYou'):''}${local.favorites.includes(r.id)?' · ♥':''}</div><h3>${esc(r.name)}</h3><div class="meta">${esc(r.region||T('noRegion'))}</div>
 <div class="stats"><span class="pill d-${esc(r.difficulty)}">${esc(diffLabel(r.difficulty))}</span><span>${fmtKm(s.km)} km</span><span>${fmtDur(s.hours)}</span>${s.hasE?`<span>↑ ${fmtInt(s.up)} m</span>`:''}<span>${n?`<span class="stars">${starStr(a)}</span> ${a.toLocaleString(LOC,{maximumFractionDigits:1})} (${n})`:T('unrated')}</span>${innBadge(r)}</div></div></a>`}
function bindList(){const p=$('#panel');
 const q=$('#q');q.oninput=()=>{ui.q=q.value;const pos=q.selectionStart;renderPanel();drawRoutes();const n=$('#q');n.focus();n.setSelectionRange(pos,pos)};
 const geo=$('#geo');if(geo)geo.onclick=()=>{const v=ui.q.trim();ui.q='';findPlace(v)};
 $('#btnFilter').onclick=openFilters;
 $('#clearPlace')?.addEventListener('click',()=>{ui.place=null;ui.inView=false;renderPanel();drawRoutes();fitAll()});
 p.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const k=b.dataset.rm,v=b.dataset.v;if(k==='diff')ui.diff.delete(v);if(k==='feat')ui.feats.delete(v);if(k==='km')ui.maxKm=40;if(k==='view'){ui.inView=false;ui.place=null}renderPanel();drawRoutes()});
 p.querySelectorAll('.card').forEach(c=>{c.onmouseenter=()=>hoverRoute(c.dataset.id,true);c.onmouseleave=()=>hoverRoute(c.dataset.id,false)});
 p.querySelector('[data-act=add]')?.addEventListener('click',openAdd);
 p.querySelector('[data-act=reset]')?.addEventListener('click',()=>{resetFilters();ui.q='';renderPanel();drawRoutes()});
 p.querySelector('[data-act=retry]')?.addEventListener('click',boot)}
function resetFilters(){ui.diff.clear();ui.feats.clear();ui.maxKm=40;ui.inView=false;ui.place=null}
function hoverRoute(id,on){const g=routeLayers[id];if(!g)return;g._l.setStyle({weight:on?7:4.5});if(on){g._c.bringToFront();g._l.bringToFront()}}

/* Filter sheet: all filters in one place, applied live */
function openFilters(){const m=modal(`<h3>${T('filters')}</h3>
 <div class="field">${T('difficulty')}<div class="chips">${['leicht','mittel','schwer'].map(d=>`<button class="chip" data-diff="${d}" aria-pressed="${ui.diff.has(d)}">${diffLabel(d)}</button>`).join('')}</div></div>
 <div class="field">${T('forRiders')}<div class="chips">${['parking','gallop','water','inn','beach','shade','stream','road'].map(f=>`<button class="chip" data-feat="${f}" aria-pressed="${ui.feats.has(f)}">${featLabel(f)}</button>`).join('')}</div></div>
 <div class="field"><span>${T('maxLength')}: <b id="fKmV" style="color:var(--fg)">${ui.maxKm<40?ui.maxKm+' km':T('any')}</b></span><input id="fKm" type="range" min="5" max="40" step="1" value="${ui.maxKm}" style="accent-color:var(--accent)"></div>
 <label class="field">${T('sort')}<select class="txt" id="fSort"><option value="rating">${T('sortRating')}</option><option value="short">${T('sortShort')}</option><option value="long">${T('sortLong')}</option><option value="new">${T('sortNew')}</option></select></label>
 <label class="checks"><label><input type="checkbox" id="fView" ${ui.inView?'checked':''}> ${T('inView')}</label></label>
 <div class="actions spread"><button class="btn ghost" id="fReset">${T('resetFilters')}</button><button class="btn primary" id="fShow"></button></div>`);
 const upd=()=>{const n=visibleList().length;$('#fShow',m).textContent=T(n===1?'showNRoute':'showNRoutes',{n});renderPanel();drawRoutes()};
 $('#fSort',m).value=ui.sort;
 m.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{const d=b.dataset.diff;ui.diff.has(d)?ui.diff.delete(d):ui.diff.add(d);b.setAttribute('aria-pressed',ui.diff.has(d));upd()});
 m.querySelectorAll('[data-feat]').forEach(b=>b.onclick=()=>{const f=b.dataset.feat;ui.feats.has(f)?ui.feats.delete(f):ui.feats.add(f);b.setAttribute('aria-pressed',ui.feats.has(f));upd()});
 $('#fKm',m).oninput=e=>{ui.maxKm=+e.target.value;$('#fKmV',m).textContent=ui.maxKm<40?ui.maxKm+' km':T('any');upd()};
 $('#fSort',m).onchange=e=>{ui.sort=e.target.value;upd()};
 $('#fView',m).onchange=e=>{ui.inView=e.target.checked;if(!ui.inView)ui.place=null;upd()};
 $('#fReset',m).onclick=()=>{resetFilters();m.close();renderPanel();drawRoutes();openFilters()};
 $('#fShow',m).onclick=()=>m.close();upd()}

/* Place search via OpenStreetMap Nominatim; matching route regions are used first */
async function findPlace(q){q=q.trim();if(!q)return;map?.invalidateSize();
 const hits=allRoutes().filter(r=>((r.region||'')+' '+r.name).toLowerCase().includes(q.toLowerCase()));
 if(hits.length){ui.place=q;ui.inView=true;if(map){const b=L.latLngBounds([]);hits.forEach(r=>r.coords.forEach(p=>b.extend([p[0],p[1]])));map.fitBounds(b,{padding:[40,40],maxZoom:12,animate:false})}renderPanel();drawRoutes();return}
 if(!map)return;try{const r=await nomiFetch('format=json&limit=1&accept-language='+LANG+'&q='+encodeURIComponent(q));const j=await r.json();
  if(!j.length){toast(T('placeNotFound'));return}const b=j[0].boundingbox.map(Number);map.fitBounds([[b[0],b[2]],[b[1],b[3]]],{maxZoom:11,animate:false});
  ui.place=j[0].display_name.split(',')[0];ui.inView=true;renderPanel();drawRoutes()}catch(e){toast(T('placeDown'))}}

/* ---------- detail ---------- */
function select(id){if(ui.draft)return;location.hash='#/route/'+encodeURIComponent(id)}
function showRoute(id){ui.sel=id;ui.confirmDel=null;renderPanel();$('#panel').scrollTop=0;drawRoutes();const r=byId(id);if(map&&r){map.fitBounds(L.latLngBounds(r.coords.map(p=>[p[0],p[1]])),{padding:[40,40],maxZoom:15})}}
function back(){location.hash=ui.lastList||'#/explore'}

function profileSVG(s){if(!s.hasE)return`<p class="note">${T('noEle')}</p>`;
 const W=600,H=150,pl=40,pr=8,pt=10,pb=22;const pts=s.prof.filter(p=>p[1]!=null);const lo=Math.floor((s.minE-10)/10)*10,hi=Math.ceil((s.maxE+10)/10)*10;
 const x=d=>pl+(d/s.km)*(W-pl-pr),y=e=>pt+(1-(e-lo)/(hi-lo))*(H-pt-pb);
 const d=pts.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(1)+' '+y(p[1]).toFixed(1)).join(' ');
 const step=s.km>20?5:s.km>8?2:1;let ticks='';for(let k=0;k<=s.km+1e-6;k+=step)ticks+=`<text x="${x(k)}" y="${H-6}" text-anchor="middle">${k} km</text><line x1="${x(k)}" x2="${x(k)}" y1="${pt}" y2="${H-pb}" stroke="var(--line)" stroke-dasharray="2 3"/>`;
 return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T('profileAria',{a:fmtInt(s.minE),b:fmtInt(s.maxE)})}" style="font:11px var(--f-body);fill:var(--muted)">
 <defs><linearGradient id="pg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".03"/></linearGradient></defs>
 ${ticks}<text x="${pl-6}" y="${y(hi)+4}" text-anchor="end">${hi} m</text><text x="${pl-6}" y="${y(lo)}" text-anchor="end">${lo} m</text>
 <line x1="${pl}" x2="${W-pr}" y1="${H-pb}" y2="${H-pb}" stroke="var(--line)"/>
 <path d="${d} L${x(pts[pts.length-1][0])} ${H-pb} L${x(0)} ${H-pb}Z" fill="url(#pg)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/></svg>`}
function lightbox(src){const d=document.createElement('div');d.className='lightbox';d.innerHTML=`<img src="${src}" alt="${T('photo')}">`;d.onclick=()=>d.remove();document.addEventListener('keydown',function k(e){if(e.key==='Escape'){d.remove();document.removeEventListener('keydown',k)}});document.body.appendChild(d)}
function toGpx(r){return`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Hoofprints" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${esc(r.name)}</name><type>horse_riding</type><trkseg>\n${r.coords.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}">${p[2]!=null?`<ele>${p[2]}</ele>`:''}</trkpt>`).join('\n')}\n</trkseg></trk>\n</gpx>`}
/* ---------- modal helper ---------- */
function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="dialog" role="dialog" aria-modal="true">${html}</div>`;document.body.appendChild(m);
 const close=()=>{m.remove();document.removeEventListener('keydown',esc_)};function esc_(e){if(e.key==='Escape')close()}document.addEventListener('keydown',esc_);
 m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]'))close()});m.close=close;setTimeout(()=>m.querySelector('input,button,textarea')?.focus(),0);return m}


/* Energy estimate (just for fun). Distance is split into a typical gait mix; the horse carries itself, rider and ~10 kg tack.
   Horse: net cost per kg and km by gait plus lifting work for the climb at ~25 % efficiency.
   Rider: MET values for horse riding (walk 3.8, trot 5.8, canter 7.3) x body weight x time. */
const GAITS=[{k:'walk',share:.6,kmh:6,horse:.30,met:3.8},{k:'trot',share:.35,kmh:12,horse:.45,met:5.8},{k:'canter',share:.05,kmh:20,horse:.60,met:7.3}];
const HORSE_TYPES=[['ePony',350],['eThoroughbred',480],['eWarmblood',600],['eDraft',800]];
const HAY_KCAL=1900,BEER_KCAL=215,TACK_KG=10;
function energy(s,horseKg,riderKg){const mass=horseKg+riderKg+TACK_KG;let horse=0,rider=0;
 GAITS.forEach(g=>{const km=s.km*g.share;horse+=mass*g.horse*km;rider+=g.met*riderKg*km/g.kmh});
 const climb=s.hasE?mass*9.81*s.up/.25/4184:0;horse+=climb;rider+=s.hasE?riderKg*9.81*s.up/.25/4184*.15:0;
 return{horse:Math.round(horse/50)*50,rider:Math.round(rider/10)*10}}
function energyHTML(s){const hk=local.horseKg||600,rk=local.riderKg||70,e=energy(s,hk,rk);
 return`<section class="energy"><h4>${T('energy')}</h4>
 <div class="ekpis"><div class="ekpi"><span class="eic">${T('eHorseKg')}</span><b id="eHorse">${fmtInt(e.horse)} kcal</b><span id="eHay">${T('eHay',{n:(e.horse/HAY_KCAL).toLocaleString(LOC,{maximumFractionDigits:1})})}</span></div>
 <div class="ekpi"><span class="eic">${T('eRiderKg')}</span><b id="eRider">${fmtInt(e.rider)} kcal</b><span id="eBeer">${T('eBeer',{n:(e.rider/BEER_KCAL).toLocaleString(LOC,{maximumFractionDigits:1})})}</span></div></div>
 <label class="eslider"><span>${T('eHorseKg')}</span><input type="range" id="eHk" min="200" max="900" step="10" value="${hk}"><b id="eHkV">${hk} kg</b></label>
 <div class="chips eqp">${HORSE_TYPES.map(([k,v])=>`<button class="chip" data-hk="${v}" aria-pressed="${hk===v}" title="~${v} kg">${T(k)}</button>`).join('')}</div>
 <label class="eslider"><span>${T('eRiderKg')}</span><input type="range" id="eRk" min="30" max="130" step="1" value="${rk}"><b id="eRkV">${rk} kg</b></label>
 <p class="muted small">${T('eNote')}</p></section>`}
function bindEnergy(s){const hk=$('#eHk'),rk=$('#eRk');if(!hk)return;
 const upd=()=>{local.horseKg=+hk.value;local.riderKg=+rk.value;saveLocal();const e=energy(s,+hk.value,+rk.value);
  $('#eHkV').textContent=hk.value+' kg';document.querySelectorAll('[data-hk]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.hk===hk.value));$('#eRkV').textContent=rk.value+' kg';$('#eHorse').textContent=fmtInt(e.horse)+' kcal';$('#eRider').textContent=fmtInt(e.rider)+' kcal';
  $('#eHay').textContent=T('eHay',{n:(e.horse/HAY_KCAL).toLocaleString(LOC,{maximumFractionDigits:1})});$('#eBeer').textContent=T('eBeer',{n:(e.rider/BEER_KCAL).toLocaleString(LOC,{maximumFractionDigits:1})})};
 hk.oninput=upd;rk.oninput=upd;document.querySelectorAll('[data-hk]').forEach(b=>b.onclick=()=>{hk.value=b.dataset.hk;upd()})}
/* "Geritten!": riders log that they rode a route, with horse and current trail conditions */
const CONDS={dry:'☀️',muddy:'💧',highwater:'🌊',overgrown:'🌿',blocked:'⛔',mowed:'🌾'};
const ridesOf=r=>shared.rides.filter(x=>x.routeId===r.id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
function ago(d){const days=Math.round((new Date(new Date().toDateString())-new Date(d+'T00:00'))/864e5);
 if(days<=0)return T('today');if(days===1)return T('yesterday');if(days<14)return T('daysAgo',{n:days});if(days<60)return T('weeksAgo',{n:Math.round(days/7)});
 return new Date(d+'T00:00').toLocaleDateString(LOC,{month:'long',year:'numeric'})}
function rideLine(x){return`<div class="ride"><div><b>${esc(x.name||T('anonRider'))}</b>${x.horse?` ${T('withHorse',{horse:esc(x.horse)})}`:''} <span class="muted">· ${ago(x.date)}</span></div>
 ${x.conditions.length?`<div class="conds">${x.conditions.filter(c=>CONDS[c]).map(c=>`<span>${CONDS[c]} ${T('cond_'+c)}</span>`).join('')}</div>`:''}${x.note?`<p>${esc(x.note)}</p>`:''}
 ${local.myRides.includes(x.id)?`<button class="linkbtn" data-delride="${esc(x.id)}">${T('deleteMyRide')}</button>`:backend.online?`<button class="linkbtn" data-report="ride" data-target="${esc(x.id)}">${T('report')}</button>`:''}</div>`}
function ridesHTML(r){if(!backend.ridesReady)return'';const rs=ridesOf(r),all=ui.allRides===r.id;
 return`<section class="rides"><div class="ridehead"><button class="btn primary big" id="rodeIt">${ICON.check}${T('rodeIt')}</button>
 <span class="muted">${rs.length?T(rs.length===1?'ridden1':'riddenN',{n:rs.length})+' · '+T('lastRidden',{when:ago(rs[0].date)}):T('noRidesYet')}</span></div>
 ${rs.length?`<h4>${T('recentRides')}</h4>${(all?rs:rs.slice(0,3)).map(rideLine).join('')}${rs.length>3&&!all?`<button class="linkbtn" id="allRides">${T('showAllRides',{n:rs.length})}</button>`:''}`:''}</section>`}
function openRode(r){const today=new Date().toISOString().slice(0,10),picked=new Set();let stars=0;
 const m=modal(`<h3>${T('rodeTitle',{name:esc(r.name)})}</h3>
 <div class="row2"><label class="field">${T('rideDate')}<input class="txt" type="date" id="rdDate" value="${today}" max="${today}"></label>
 <label class="field">${T('horseName')}<input class="txt" id="rdHorse" maxlength="40" value="${esc(local.lastHorse||'')}" placeholder="${T('horsePh')}"></label></div>
 <label class="field">${T('yourName')}<input class="txt" id="rdName" maxlength="60" value="${esc(local.lastName||'')}" placeholder="${T('nickPh')}"></label>
 <div class="field">${T('rideStars')}<div class="starpick" id="rdStars" role="radiogroup" aria-label="${T('stars')}">${[1,2,3,4,5].map(i=>`<button type="button" data-v="${i}" aria-label="${T('nStars',{n:i})}">★</button>`).join('')}</div></div>
 <div class="field">${T('trailNow')}<div class="chips">${Object.entries(CONDS).map(([k,i])=>`<button type="button" class="chip" data-cond="${k}" aria-pressed="false">${i} ${T('cond_'+k)}</button>`).join('')}</div></div>
 <label class="field">${T('rideNote')}<textarea class="txt" id="rdNote" maxlength="300" placeholder="${T('rideNotePh')}"></textarea></label>
 <label class="hp" aria-hidden="true">Website<input id="rdWeb" tabindex="-1" autocomplete="off"></label>
 <div class="err" id="rdErr"></div><div class="actions"><button class="btn" data-close>${T('cancel')}</button><button class="btn primary" id="rdSave">${T('rideSave')}</button></div>`);
 m.querySelectorAll('[data-cond]').forEach(b=>b.onclick=()=>{const k=b.dataset.cond;picked.has(k)?picked.delete(k):picked.add(k);
  if(k==='dry'&&picked.has('dry'))picked.delete('muddy');if(k==='muddy'&&picked.has('muddy'))picked.delete('dry');
  m.querySelectorAll('[data-cond]').forEach(x=>x.setAttribute('aria-pressed',picked.has(x.dataset.cond)))});
 m.querySelectorAll('#rdStars button').forEach(b=>b.onclick=()=>{const v=+b.dataset.v;stars=stars===v?0:v;m.querySelectorAll('#rdStars button').forEach(x=>x.classList.toggle('on',+x.dataset.v<=stars))});
 $('#rdSave',m).onclick=async e=>{if($('#rdWeb',m).value)return;const date=$('#rdDate',m).value||today;if(date>today){$('#rdErr',m).textContent=T('rideFuture');return}
  e.target.disabled=true;
  try{throttle();const v={id:uuid(),routeId:r.id,date,name:$('#rdName',m).value.trim().slice(0,60),horse:$('#rdHorse',m).value.trim().slice(0,40),conditions:[...picked],note:$('#rdNote',m).value.trim().slice(0,300)};
   await backend.addRide(v);local.myRides.push(v.id);local.lastHorse=v.horse;local.lastName=v.name;logRide(r,v.date,v.horse,v.id);
   /* stars given here also count as a normal review, with the note as its text */
   if(stars){const rv={id:uuid(),routeId:r.id,name:v.name||T('anon'),stars,text:v.note,date:new Date().toISOString()};try{await backend.addReview(rv);local.myReviews.push(rv.id);saveLocal()}catch(x){toast(x.message)}}
   m.close();toast(T('rideThanks'));renderPanel()}
  catch(x){$('#rdErr',m).textContent=x.message;e.target.disabled=false}}}
/* "Meine Hoofprints": personal ride statistics, kept on this device (a login can sync them later) */
function logRide(r,date,horse,id){const s=stats(r);if(horse&&!local.horses[horse])local.horses[horse]=local.horseKg||600;
 local.log=local.log.filter(x=>x.id!==id);local.log.unshift({id,routeId:r.id,name:r.name,date,km:+s.km.toFixed(2),up:Math.round(s.up||0),hasE:s.hasE,hours:+s.hours.toFixed(2),horse:horse||''});saveLocal()}
function logEnergy(x){const kg=(x.horse&&local.horses[x.horse])||local.horseKg||600;return energy({km:x.km,up:x.up,hasE:x.hasE},kg,local.riderKg||70)}
function renderHoofprints(){const per=ui.hpPer||'month',now=new Date(),ym=now.toISOString().slice(0,7),y=ym.slice(0,4);
 const inPer=x=>per==='all'||(per==='year'?x.date.startsWith(y):x.date.startsWith(ym));
 const L=local.log.filter(inPer),sum=k=>L.reduce((a,x)=>a+(x[k]||0),0),en=L.map(logEnergy),eh=en.reduce((a,e)=>a+e.horse,0),er=en.reduce((a,e)=>a+e.rider,0);
 const months=[...Array(12)].map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  return{k,label:d.toLocaleDateString(LOC,{month:'short'}),km:local.log.filter(x=>x.date.startsWith(k)).reduce((a,x)=>a+x.km,0)}});
 const max=Math.max(...months.map(m=>m.km),1);
 const horses=[...new Set(local.log.map(x=>x.horse).filter(Boolean))].map(h=>({h,n:local.log.filter(x=>x.horse===h).length,km:local.log.filter(x=>x.horse===h).reduce((a,x)=>a+x.km,0)})).sort((a,b)=>b.km-a.km);
 const nf=n=>n.toLocaleString(LOC,{maximumFractionDigits:1});
 $('#home').innerHTML=`<section class="hp-page"><h2>${T('myHoofprints')}</h2>
 <div class="seg" role="tablist">${[['month',T('perMonth')],['year',T('perYear')],['all',T('perAll')]].map(([k,l])=>`<button role="tab" aria-selected="${per===k}" data-per="${k}">${l}</button>`).join('')}</div>
 ${local.log.length?`<h3 class="first">${T('hpRoute')}</h3><div class="hpkpis">
  <div class="kpi"><b>${L.length}</b><span>${T('hpRides')}</span></div><div class="kpi"><b>${nf(sum('km'))}</b><span>${T('km')}</span></div>
  <div class="kpi"><b>${fmtInt(sum('up'))} m</b><span>${T('hpClimb')}</span></div><div class="kpi"><b>${fmtDur(sum('hours'))}</b><span>${T('hpTime')}</span></div>
  </div>
 <h3>${T('energy')}</h3><div class="ekpis"><div class="ekpi"><span class="eic">${T('eHorseKg')}</span><b>${fmtInt(eh)} kcal</b><span>${T('eHay',{n:nf(eh/HAY_KCAL)})}</span></div><div class="ekpi"><span class="eic">${T('eRiderKg')}</span><b>${fmtInt(er)} kcal</b><span>${T('eBeer',{n:nf(er/BEER_KCAL)})}</span></div></div>
 <h3>${T('kmPerMonth')}</h3><div class="bars" role="img" aria-label="${T('kmPerMonth')}">${months.map(m=>`<div class="bar" tabindex="0" title="${m.label}: ${nf(m.km)} km"><span class="bv">${m.km?nf(m.km):''}</span><i style="height:${Math.max(m.km/max*85,m.km?2:0)}%"></i><span class="bl">${m.label}</span></div>`).join('')}</div>
 ${horses.length?`<h3>${T('myHorses')}</h3><div class="horses">${horses.map(x=>`<div class="horse"><b>${esc(x.h)}</b><span class="muted">${T(x.n===1?'ridden1':'riddenN',{n:x.n})} · ${nf(x.km)} km</span>
  <label>${T('weight')} <input type="number" min="150" max="1100" step="10" value="${local.horses[x.h]||600}" data-horse="${esc(x.h)}"> kg</label></div>`).join('')}</div>`:''}
 <h3>${T('hpLastRides')}</h3><div class="hplist">${local.log.slice(0,30).map(x=>`<div class="hprow"><a href="#/route/${encodeURIComponent(x.routeId)}">${esc(x.name)}</a><span class="muted">${new Date(x.date+'T00:00').toLocaleDateString(LOC)}${x.horse?' · '+esc(x.horse):''} · ${nf(x.km)} km</span><button class="linkbtn" data-unlog="${esc(x.id)}">${T('hpRemove')}</button></div>`).join('')}</div>`
 :`<div class="empty"><strong>${T('hpEmptyT')}</strong>${T('hpEmpty')}<a class="btn primary" href="#/explore">${T('navExplore')}</a></div>`}
 <p class="muted small">${T('hpLocalNote')}</p></section>${footHTML()}`;
 bindFoot();
 $('#home').querySelectorAll('[data-per]').forEach(b=>b.onclick=()=>{ui.hpPer=b.dataset.per;renderHoofprints()});
 $('#home').querySelectorAll('[data-horse]').forEach(i=>i.onchange=()=>{const v=Math.min(1100,Math.max(150,+i.value||600));local.horses[i.dataset.horse]=v;saveLocal();renderHoofprints()});
 $('#home').querySelectorAll('[data-unlog]').forEach(b=>b.onclick=()=>{local.log=local.log.filter(x=>x.id!==b.dataset.unlog);saveLocal();renderHoofprints()})}
/* ---------- "Route folgen": live position on the route, distance left, warning when off the route ---------- */
const isApple=/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)&&'ontouchend' in document;
const startNavUrl=c=>isApple?`https://maps.apple.com/?daddr=${c[0]},${c[1]}`:`https://www.google.com/maps/dir/?api=1&destination=${c[0]},${c[1]}`;
let nav=null;
/* nearest point on the route: local flat projection is precise enough at these distances */
function snap(r,ll,hintKm){const s=stats(r),P=r.coords,k=Math.cos(ll[0]*Math.PI/180),xy=p=>[(p[1]-ll[1])*111.32*k,(p[0]-ll[0])*110.57];let best=null;
 for(let i=1;i<P.length;i++){const a=xy(P[i-1]),b=xy(P[i]),dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;const t=L2?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/L2)):0;
  const px=a[0]+t*dx,py=a[1]+t*dy,d=Math.hypot(px,py),along=s.prof[i-1][0]+t*(s.prof[i][0]-s.prof[i-1][0]);
  /* on loops start and end meet: prefer the candidate close to where we were */
  const score=d+(hintKm!=null?Math.max(0,Math.abs(along-hintKm)-1)*.05:0);if(!best||score<best.score)best={d,along,score}}
 return best}
function startFollow(r){if(!navigator.geolocation){toast(T('noGeo'));return}if(nav)stopFollow();if(rec){toast(T('recRunning'));return}
 nav={r,watch:null,me:null,follow:true,along:null,off:false,lock:null,acc:null};
 document.body.classList.add('navmode');setTimeout(()=>map.invalidateSize(),50);const bar=document.createElement('div');bar.className='recbar navbar';bar.id='navbar';$('.mapwrap').appendChild(bar);L.DomEvent.disableClickPropagation(bar);
 map.on('dragstart',navDrag);renderNav();
 navigator.wakeLock?.request('screen').then(l=>{if(nav)nav.lock=l}).catch(()=>{});
 nav.watch=navigator.geolocation.watchPosition(p=>{if(!nav)return;const c=p.coords,ll=[c.latitude,c.longitude];nav.acc=c.accuracy;
   const sn=snap(nav.r,ll,nav.along);const offNow=sn.d*1000>Math.max(40,Math.min(c.accuracy||0,80))+15;
   if(!offNow)nav.along=sn.along;nav.dist=sn.d*1000;
   if(offNow&&!nav.off){navigator.vibrate?.([200,100,200])}nav.off=offNow;
   if(!nav.me)nav.me=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[18,18],iconAnchor:[9,9]}),interactive:false}).addTo(map);else nav.me.setLatLng(ll);
   if(nav.follow)map.setView(ll,Math.max(map.getZoom(),15),{animate:true});renderNav()},
  e=>{if(e.code===1){toast(T('geoDenied'));stopFollow()}},{enableHighAccuracy:true,maximumAge:3000,timeout:20000})}
function navDrag(){if(nav&&nav.follow){nav.follow=false;renderNav()}}
function renderNav(){const b=$('#navbar');if(!b||!nav)return;const tot=stats(nav.r).km,done=nav.along??0,left=Math.max(0,tot-done);
 b.innerHTML=`<div class="recstats"><div><b>${nav.along==null?'–':fmtKm(left)}</b><span>${T('kmLeft')}</span></div><div><b>${nav.along==null?'–':fmtKm(done)}</b><span>${T('kmDone')}</span></div><div><b>${nav.along==null?'–':Math.round(done/tot*100)+' %'}</b><span>${T('progress')}</span></div></div>
 <div class="rechint ${nav.off?'navoff':''}">${nav.me==null?T('navLocating'):nav.off&&nav.along==null?T('navFar',{km:fmtKm(nav.dist/1000)}):nav.off?(nav.dist<1000?T('navOff',{m:fmtInt(Math.round(nav.dist/10)*10)}):T('navOffKm',{km:fmtKm(nav.dist/1000)})):T('navOn')}</div>
 <div class="recbtns">${nav.follow?'':`<button class="btn" id="nCenter">${T('navCenter')}</button>`}<button class="btn ghost" id="nStop">${T('navStop')}</button></div>`;
 $('#nStop').onclick=stopFollow;$('#nCenter')?.addEventListener('click',()=>{nav.follow=true;if(nav.me)map.setView(nav.me.getLatLng(),Math.max(map.getZoom(),15));renderNav()})}
function stopFollow(){if(!nav)return;if(nav.watch!=null)navigator.geolocation.clearWatch(nav.watch);nav.lock?.release?.().catch(()=>{});if(nav.me)map.removeLayer(nav.me);map.off('dragstart',navDrag);$('#navbar')?.remove();nav=null;document.body.classList.remove('navmode');setTimeout(()=>map.invalidateSize(),50)}
document.addEventListener('visibilitychange',()=>{if(nav&&document.visibilityState==='visible')navigator.wakeLock?.request('screen').then(l=>{if(nav)nav.lock=l}).catch(()=>{})});
function detailHTML(r){const s=stats(r),rv=reviewsOf(r),a=avg(r),fav=local.favorites.includes(r.id),ph=photosOf(r);
 const surf=Object.entries(r.surfaces||{Unbekannt:100});const tot=surf.reduce((x,y)=>x+y[1],0)||1;const c0=r.coords[0];
 return`<div class="detail"><div class="dhead"><button class="btn ghost" id="back">${T('back')}</button><span class="sp"></span>
 <button class="btn fav" id="fav" aria-pressed="${fav}" title="${T('saveTitle')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>${fav?T('saved'):T('save')}</button>
 <button class="btn" id="share" title="${T('shareTitle')}" aria-label="${T('share')}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg><span class="lbl">${T('share')}</span></button><button class="btn" id="gpx" title="${T('gpxTitle')}">GPX</button></div>
 <div class="dbody">
 <div class="dtitle"><div class="src">${esc(srcLabel(r.source))} · ${s.loop?T('loop'):T('oneway')}${isMine(r)?' · '+T('byYou'):''}</div><h2>${esc(r.name)}</h2><div class="meta">${esc(r.region||T('noRegion'))} · <span class="pill d-${esc(r.difficulty)}">${esc(diffLabel(r.difficulty))}</span> ${rv.length?` · <span class="stars">${starStr(a)}</span> ${a.toLocaleString(LOC,{maximumFractionDigits:1})}`:''}</div></div>
 <div class="navrow"><button class="btn primary" id="follow"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3 3 10.5l7.5 3 3 7.5z"/></svg>${T('followRoute')}</button><a class="btn" id="toStart" href="${startNavUrl(c0)}" target="_blank" rel="noopener">${ICON.car}${T('toStart')}</a></div>
 <div class="kpis"><div class="kpi"><b>${fmtKm(s.km)}</b><span>${T('km')}</span></div><div class="kpi"><b>${fmtDur(s.hours)}</b><span>${T('duration')}</span></div><div class="kpi"><b>${s.hasE?fmtInt(s.up):'–'}</b><span>${T('up')}</span></div><div class="kpi"><b>${s.hasE?fmtInt(s.down):'–'}</b><span>${T('down')}</span></div></div>
 ${ridesHTML(r)}
 <section class="prof"><h4>${T('profile')}</h4>${profileSVG(s)}</section>
 <section><h4>${T('surface')}</h4><div class="surf">${surf.map(([k,v])=>`<span style="flex:${+v||1};background:${SURF_COL[k]||'#999'}" title="${esc(surfLabel(k))} ${Math.round(v/tot*100)} %"></span>`).join('')}</div>
  <div class="legend">${surf.map(([k,v])=>`<span><i style="background:${SURF_COL[k]||'#999'}"></i>${esc(surfLabel(k))} ${Math.round(v/tot*100)} %</span>`).join('')}</div></section>
 ${(r.features||[]).length?`<section><h4>${T('forRiders')}</h4><div class="feat">${r.features.filter(f=>FEAT[f]).map(f=>`<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${FEAT_ICON[f]}</svg>${featLabel(f)}</span>`).join('')}</div></section>`:''}
 ${r.desc?`<p class="desc">${esc(tr(r,'desc'))}</p>`:''}
 ${r.season?`<div class="note"><b>${T('season')}</b> ${esc(tr(r,'season'))}</div>`:''}
 <section><h4>${T('photos')} (${ph.length})</h4><div class="gallery">${ph.map(p=>`<button data-photo="${esc(p.src)}"><img src="${esc(p.src)}" alt="${T('photoOf',{name:esc(r.name)})}" loading="lazy">${p.example?`<span class="tag">${T('example').toUpperCase()}</span>`:''}</button>`).join('')}<label class="uploader" id="addPhoto" tabindex="0" role="button">${T('addPhoto')}</label></div></section>
 ${energyHTML(s)}
 <section><h4>${T('reviews')}</h4><div class="reviews">
  <div class="rating-sum">${rv.length?`<b>${a.toLocaleString(LOC,{maximumFractionDigits:1})}</b><span class="stars" style="font-size:20px">${starStr(a)}</span><span style="color:var(--muted)">${rv.length} ${rv.length>1?T('reviewN'):T('review1')}</span>`:`<span style="color:var(--muted)">${T('noReviews')}</span>`}</div>
  <form class="revform" id="revform"><div class="starpick" id="starpick" role="radiogroup" aria-label="${T('stars')}">${[1,2,3,4,5].map(i=>`<button type="button" data-v="${i}" aria-label="${T('nStars',{n:i})}">★</button>`).join('')}</div>
   <input class="txt" id="revName" placeholder="${T('nickPh')}" maxlength="60"><textarea class="txt" id="revText" placeholder="${T('reviewPh')}" maxlength="600"></textarea>
   <label class="hp" aria-hidden="true">Website<input id="revWeb" tabindex="-1" autocomplete="off"></label>
   <div class="actions"><span class="err" id="revErr"></span><button class="btn primary" type="submit">${T('submitReview')}</button></div></form>
  ${rv.map(x=>`<div class="rev"><span class="stars">${starStr(x.stars)}</span> <span class="who">${esc(x.name||T('anon'))}</span> <span class="when">· ${new Date(x.date).toLocaleDateString(LOC,{month:'long',year:'numeric'})}${x.example?' · '+T('example'):''}</span><p>${esc(x.text)}</p>
   ${x.example?'':local.myReviews.includes(x.id)?`<button class="linkbtn" data-editrev="${esc(x.id)}">${T('editMyReview')}</button> · <button class="linkbtn" data-delrev="${esc(x.id)}">${T('deleteMyReview')}</button>`:backend.online?`<button class="linkbtn" data-report="review" data-target="${esc(x.id)}">${T('report')}</button>`:''}</div>`).join('')}
 </div></section>
 <section class="row">${isMine(r)?`<button class="btn primary" id="edit">${T('edit')}</button><button class="btn" id="del">${ui.confirmDel===r.id?T('deleteConfirm'):T('deleteRoute')}</button>`:''}
  ${r.source!=='Beispiel'&&!isMine(r)&&backend.online?`<button class="linkbtn" data-report="route" data-target="${esc(r.id)}">${T('reportRoute')}</button>`:''}
  <a href="https://www.openstreetmap.org/?mlat=${c0[0]}&mlon=${c0[1]}#map=15/${c0[0]}/${c0[1]}" target="_blank" rel="noopener" style="color:var(--accent);font-size:13px">${T('osmStart')}</a></section>
 </div></div>`}
/* Share a route link: the phone's share sheet where available, otherwise copy the link */
async function shareRoute(r){const url=location.origin+location.pathname+'#/route/'+encodeURIComponent(r.id),s=stats(r);
 const text=T('shareText',{name:r.name,km:fmtKm(s.km)});
 if(navigator.share&&/^https?:/.test(location.protocol)){try{await navigator.share({title:r.name,text,url});return}catch(e){if(e.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(url);toast(T('linkCopied'))}catch(e){modal(`<h3>${T('share')}</h3><p>${T('copyThis')}</p><textarea class="txt copybox" readonly>${esc(url)}</textarea><div class="actions"><button class="btn primary" data-close>${T('close')}</button></div>`).querySelector('textarea').select()}}
function bindDetail(){const r=byId(ui.sel);let stars=0;bindEnergy(stats(r));
 $('#rodeIt')?.addEventListener('click',()=>openRode(r));$('#allRides')?.addEventListener('click',()=>{ui.allRides=r.id;renderPanel()});
 document.querySelectorAll('[data-delride]').forEach(b=>b.onclick=async()=>{try{await backend.remove('ride',b.dataset.delride);local.myRides=local.myRides.filter(x=>x!==b.dataset.delride);saveLocal();toast(T('rideDeleted'));renderPanel()}catch(x){toast(x.message)}});
 $('#share').onclick=()=>shareRoute(r);$('#follow').onclick=()=>startFollow(r);
 $('#back').onclick=back;
 $('#fav').onclick=()=>{const i=local.favorites.indexOf(r.id);i>=0?local.favorites.splice(i,1):local.favorites.push(r.id);saveLocal();toast(i>=0?T('favRemoved'):T('favAdded'));renderPanel()};
 $('#gpx').onclick=()=>downloadGpx(r);
 const addP=$('#addPhoto');addP.onclick=()=>$('#filePhoto').click();addP.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#filePhoto').click()}};
 document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>lightbox(b.dataset.photo));
 const sp=$('#starpick');sp.querySelectorAll('button').forEach(b=>b.onclick=()=>{stars=+b.dataset.v;sp.querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.v<=stars))});
 $('#revform').onsubmit=async e=>{e.preventDefault();const err=$('#revErr');if(!stars){err.textContent=T('needStars');return}
  if($('#revWeb').value){err.textContent='';return}
  const btn=e.submitter||$('#revform button[type=submit]');btn.disabled=true;
  try{throttle();const v={id:uuid(),routeId:r.id,name:$('#revName').value.trim().slice(0,60)||T('anon'),stars,text:$('#revText').value.trim().slice(0,600),date:new Date().toISOString()};
   await backend.addReview(v);local.myReviews.push(v.id);saveLocal();toast(T('thanksReview'));renderPanel()}catch(x){err.textContent=x.message;btn.disabled=false}};
 $('#edit')?.addEventListener('click',()=>openSave(r,r));
 document.querySelectorAll('[data-editrev]').forEach(b=>b.onclick=()=>openEditReview(reviewsOf(r).find(x=>x.id===b.dataset.editrev)));
 document.querySelectorAll('[data-delrev]').forEach(b=>b.onclick=async()=>{try{await backend.remove('review',b.dataset.delrev);local.myReviews=local.myReviews.filter(x=>x!==b.dataset.delrev);saveLocal();toast(T('reviewDeleted'));renderPanel()}catch(x){toast(x.message)}});
 document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>openReport(b.dataset.report,b.dataset.target));
 const del=$('#del');if(del)del.onclick=async()=>{if(ui.confirmDel!==r.id){ui.confirmDel=r.id;renderPanel();return}ui.confirmDel=null;
  try{await backend.remove('route',r.id);local.mine=local.mine.filter(x=>x!==r.id);local.favorites=local.favorites.filter(x=>x!==r.id);saveLocal();drawRoutes();location.hash='#/mine';toast(T('routeDeleted'))}catch(x){toast(x.message);renderPanel()}}}
$('#filePhoto').onchange=async e=>{const r=byId(ui.sel);if(!r)return;const files=[...e.target.files].slice(0,6);e.target.value='';let ok=0;toast(T('uploading'));
 for(const f of files){try{throttle();const blob=await shrink(f,1400,.8);const p=await backend.addPhoto(r.id,blob);local.myPhotos.push(p.id);ok++}catch(err){toast(err.message||T('imgUnreadable'));break}}
 saveLocal();if(ok){toast(ok>1?T('photosAdded',{n:ok}):T('photoAdded'));renderPanel()}};
function shrink(file,max,q){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onerror=()=>rej(new Error(T('imgUnreadable')));im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(b=>b?res(b):rej(new Error(T('imgShrinkFail'))),'image/jpeg',q)};im.src=url})}
function downloadGpx(r){const blob=new Blob([toGpx(r)],{type:'application/gpx+xml'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(r.name.replace(/[^\wäöüÄÖÜß\- ]+/g,'').trim()||'route')+'.gpx';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function openEditReview(v){if(!v)return;let stars=v.stars;
 const m=modal(`<h3>${T('editReview')}</h3><div class="starpick" id="eStars">${[1,2,3,4,5].map(i=>`<button type="button" data-v="${i}" class="${i<=stars?'on':''}" aria-label="${T('nStars',{n:i})}">★</button>`).join('')}</div>
 <input class="txt" id="eName" maxlength="60" value="${esc(v.name||'')}" placeholder="${T('nickPh')}"><textarea class="txt" id="eText" maxlength="600" placeholder="${T('reviewPh')}">${esc(v.text||'')}</textarea>
 <div class="err" id="eErr"></div><div class="actions"><button class="btn" data-close>${T('cancel')}</button><button class="btn primary" id="eSave">${T('saveChanges')}</button></div>`);
 m.querySelectorAll('#eStars button').forEach(b=>b.onclick=()=>{stars=+b.dataset.v;m.querySelectorAll('#eStars button').forEach(x=>x.classList.toggle('on',+x.dataset.v<=stars))});
 $('#eSave',m).onclick=async e=>{e.target.disabled=true;try{await backend.updateReview(v.id,{name:$('#eName',m).value.trim().slice(0,60)||T('anon'),stars,text:$('#eText',m).value.trim().slice(0,600)});m.close();renderPanel();toast(T('changesSaved'))}catch(x){$('#eErr',m).textContent=x.message;e.target.disabled=false}}}
function openReport(kind,id){const m=modal(`<h3>${kind==='route'?T('reportTitleRoute'):T('reportTitleReview')}</h3><p>${T('reportText')}</p>
 <select class="txt" id="rReason">${['rSpam','rAbuse','rDanger','rWrong'].map(k=>`<option value="${k}">${T(k)}</option>`).join('')}</select>
 <div class="actions"><button class="btn" data-close>${T('cancel')}</button><button class="btn primary" id="rSend">${T('report')}</button></div>`);
 $('#rSend',m).onclick=async()=>{try{throttle();await backend.report(kind,id,$('#rReason',m).value);m.close();toast(T('reportThanks'))}catch(x){toast(x.message)}}}

/* ---------- import ---------- */
function parseRoute(text,fname){const low=fname.toLowerCase();let name=fname.replace(/\.[^.]+$/,''),pts=[];
 if(low.endsWith('.json')||low.endsWith('.geojson')||/^\s*\{/.test(text)){const j=JSON.parse(text);const lines=[];
  (function walk(o){if(!o)return;if(o.type==='FeatureCollection')o.features.forEach(walk);else if(o.type==='Feature'){if(o.properties?.name)name=o.properties.name;walk(o.geometry)}else if(o.type==='LineString')lines.push(o.coordinates);else if(o.type==='MultiLineString')o.coordinates.forEach(c=>lines.push(c));else if(o.type==='GeometryCollection')o.geometries.forEach(walk)})(j);
  lines.forEach(l=>l.forEach(c=>pts.push([c[1],c[0],c[2]!=null?c[2]:null])))}
 else{const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error(T('badXml'));
  const nm=doc.querySelector('trk > name, rte > name, metadata > name, Document > name, Placemark > name');if(nm&&nm.textContent.trim())name=nm.textContent.trim();
  const tp=[...doc.getElementsByTagName('trkpt')];const rp=tp.length?tp:[...doc.getElementsByTagName('rtept')];
  if(rp.length)rp.forEach(p=>{const e=p.getElementsByTagName('ele')[0];pts.push([+p.getAttribute('lat'),+p.getAttribute('lon'),e?+e.textContent:null])});
  else{const coordsEls=[...doc.getElementsByTagName('coordinates')];const gx=[...doc.getElementsByTagNameNS('*','coord')];
   if(gx.length)gx.forEach(c=>{const a=c.textContent.trim().split(/\s+/).map(Number);pts.push([a[1],a[0],a[2]??null])});
   else coordsEls.forEach(c=>{if(c.parentNode&&/Point/.test(c.parentNode.nodeName))return;c.textContent.trim().split(/\s+/).forEach(t=>{const a=t.split(',').map(Number);if(a.length>=2)pts.push([a[1],a[0],a.length>2?a[2]:null])})})}}
 pts=pts.filter(p=>isFinite(p[0])&&isFinite(p[1])&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180);
 if(pts.length<2)throw new Error(T('noTrack'));
 if(pts.every(p=>!p[2]))pts.forEach(p=>p[2]=null);
 if(pts.length>900){const k=pts.length/900;const out=[];for(let i=0;i<900;i++)out.push(pts[Math.floor(i*k)]);out.push(pts[pts.length-1]);pts=out}
 pts=pts.map(p=>[+p[0].toFixed(6),+p[1].toFixed(6),p[2]==null?null:Math.round(p[2])]);
 return{name,coords:pts}}
function openImport(){const m=modal(`<h3>${T('import')}</h3><p>${T('importText')}</p>
 <label class="drop" id="drop" tabindex="0"><b>${T('dropHere')}</b><span style="color:var(--muted);font-size:14px">.gpx · .kml · .geojson</span><div class="srcs"><span>Komoot</span><span>Strava</span><span>Garmin</span><span>Equilab</span><span>Outdooractive</span></div></label>
 <div class="err" id="impErr"></div><div class="actions"><button class="btn" data-close>${T('cancel')}</button></div>`);
 const drop=$('#drop',m),inp=$('#fileRoute');
 const handle=f=>{if(f.size>15e6){$('#impErr',m).textContent=T('tooBig');return}const fr=new FileReader();fr.onload=()=>{try{const parsed=parseRoute(fr.result,f.name);m.close();openSave({...parsed,source:'Import ('+f.name.split('.').pop().toUpperCase()+')'})}catch(err){$('#impErr',m).textContent=err.message||T('fileUnreadable')}};fr.readAsText(f)};
 drop.onclick=e=>{e.preventDefault();inp.click()};drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click()}};
 inp.onchange=()=>{if(inp.files[0])handle(inp.files[0]);inp.value=''};
 drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');
 drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');const f=e.dataTransfer.files[0];if(f)handle(f)}}
function openSave(d,existing){const s=stats({coords:d.coords});const ex=existing||{};const surfOpts=['Waldweg','Feldweg','Wiesenpfad','Sandweg','Schotter','Asphalt','Strand','Almweg','Heidepfad'];
 const m=modal(`<h3>${existing?T('editRoute'):T('saveRoute')}</h3><p>${d.coords.length} ${T('points')} · ${fmtKm(s.km)} km${s.hasE?` · ↑ ${fmtInt(s.up)} m`:' · '+T('noEleShort')} · ${s.loop?T('loop'):T('oneway')}</p>
 <label class="field">${T('name')}<input class="txt" id="sName" value="${esc(d.name)}" maxlength="80"></label>
 <div class="grid2"><label class="field">${T('region')}<input class="txt" id="sRegion" placeholder="${T('regionPh')}" maxlength="80" value="${esc(ex.region||'')}"></label>
 <label class="field">${T('difficulty')}<select class="txt" id="sDiff">${['leicht','mittel','schwer'].map(v=>`<option value="${v}" ${(ex.difficulty||'mittel')===v?'selected':''}>${diffLabel(v)}</option>`).join('')}</select></label></div>
 <div class="field">${T('ground')}<div class="checks">${surfOpts.map(o=>`<label><input type="checkbox" value="${o}" name="surf" ${ex.surfaces&&ex.surfaces[o]?'checked':''}>${surfLabel(o)}</label>`).join('')}</div></div>
 <div class="field">${T('forRiders')}<div class="checks">${Object.keys(FEAT).map(k=>`<label><input type="checkbox" value="${k}" name="feat" ${(ex.features||[]).includes(k)?'checked':''}>${featLabel(k)}</label>`).join('')}</div></div>
 <label class="field">${T('description')}<textarea class="txt" id="sDesc" placeholder="${T('descPh')}" maxlength="800">${esc(ex.desc||'')}</textarea></label>
 <label class="hp" aria-hidden="true">Website<input id="sWeb" tabindex="-1" autocomplete="off"></label>
 ${existing?'':`<p>${backend.online?T('saveNoteShared'):T('saveNoteLocal')}</p>`}
 <div class="err" id="sErr"></div><div class="actions"><button class="btn" data-close>${T('discard')}</button><button class="btn primary" id="sSave">${existing?T('saveChanges'):backend.online?T('publish'):T('store')}</button></div>`);
 $('#sSave',m).onclick=async e=>{if($('#sWeb',m).value){m.close();return}const sf=[...m.querySelectorAll('[name=surf]:checked')].map(x=>x.value);const surfaces={};sf.forEach(k=>surfaces[k]=Math.round(100/sf.length));
  const r={id:uuid(),name:$('#sName',m).value.trim().slice(0,80)||T('untitled'),region:$('#sRegion',m).value.trim().slice(0,80),difficulty:$('#sDiff',m).value,surfaces:sf.length?surfaces:{Unbekannt:100},features:[...m.querySelectorAll('[name=feat]:checked')].map(x=>x.value),desc:$('#sDesc',m).value.trim().slice(0,800),coords:d.coords,source:d.source,createdAt:new Date().toISOString()};
  e.target.disabled=true;if(existing){try{const f={name:r.name,region:r.region,difficulty:r.difficulty,surfaces:r.surfaces,features:r.features,desc:r.desc};await backend.updateRoute(existing.id,f);m.close();drawRoutes();renderPanel();toast(T('changesSaved'))}catch(x){$('#sErr',m).textContent=x.message;e.target.disabled=false}return}
  try{throttle();await backend.addRoute(r);local.mine.push(r.id);if(r.source==='Aufgezeichnet')logRide(r,new Date().toISOString().slice(0,10),local.lastHorse||'',r.id);saveLocal();m.close();drawRoutes();select(r.id);toast(backend.online?T('published'):T('stored'))}catch(x){$('#sErr',m).textContent=x.message;e.target.disabled=false}}}

/* ---------- draw mode ---------- */
let draftLayer=null,draftMarkers=[];
function startDraw(){if(rec)return;if(!map){toast(T('noMap'));return}map.invalidateSize();if(ui.draft)return;ui.draft=[];ui.sel=null;renderPanel();styleRoutes();map.getContainer().classList.add('leaflet-crosshair');
 const bar=document.createElement('div');bar.className='drawbar';bar.id='drawbar';$('.mapwrap').appendChild(bar);updateDraw();toast(T('drawHint'))}
function addDraftPoint(ll){ui.draft.push([+ll.lat.toFixed(6),+ll.lng.toFixed(6),null]);updateDraw()}
function updateDraw(){const d=ui.draft;if(draftLayer)map.removeLayer(draftLayer);draftMarkers.forEach(m=>map.removeLayer(m));draftMarkers=[];
 draftLayer=L.polyline(d.map(p=>[p[0],p[1]]),{color:cssVar('--route-sel'),weight:4,dashArray:'6 6',interactive:false}).addTo(map);
 d.forEach(p=>draftMarkers.push(L.marker([p[0],p[1]],{icon:L.divIcon({className:'',html:'<div class="vtx"></div>',iconSize:[12,12],iconAnchor:[6,6]}),interactive:false}).addTo(map)));
 const km=d.length>1?stats({coords:d}).km:0;
 $('#drawbar').innerHTML=`<span>${T('points')} <b>${d.length}</b> · <b>${fmtKm(km)} km</b></span><button class="btn" id="dUndo" ${d.length?'':'disabled'}>${T('undo')}</button><button class="btn" id="dClose" ${d.length>2?'':'disabled'} title="${T('closeLoopTitle')}">${T('closeLoop')}</button><button class="btn" id="dCancel">${T('cancel')}</button><button class="btn primary" id="dDone" ${d.length>1?'':'disabled'}>${T('done')}</button>`;
 $('#dUndo').onclick=e=>{L.DomEvent.stop(e);d.pop();updateDraw()};$('#dClose').onclick=e=>{L.DomEvent.stop(e);d.push([...d[0]]);updateDraw()};
 $('#dCancel').onclick=e=>{L.DomEvent.stop(e);endDraw()};$('#dDone').onclick=e=>{L.DomEvent.stop(e);const coords=d.slice();endDraw();openSave({name:T('newRoute'),coords,source:'Gezeichnet'})};
 L.DomEvent.disableClickPropagation($('#drawbar'))}
function endDraw(){ui.draft=null;if(draftLayer)map.removeLayer(draftLayer);draftMarkers.forEach(m=>map.removeLayer(m));draftMarkers=[];draftLayer=null;$('#drawbar')?.remove();map.getContainer().classList.remove('leaflet-crosshair')}

/* ---------- about ---------- */
function openAbout(){modal(`<h3>${T('about')}</h3><p>${backend.online?T('aboutShared'):T('aboutLocal')}</p>
 <div class="about"><ul><li>${T('aboutFav')}</li><li>${T('aboutTrails')}</li>${showExamples?`<li>${T('aboutExamples')}</li>`:''}<li>${T('aboutDraw')}</li></ul></div>
 <p style="font-size:12px">${T('deviceId')}: <code>${esc(local.deviceId.slice(0,8))}…</code></p>
 <div class="actions"><button class="btn primary" data-close>${T('ok')}</button></div>`)}


/* ---------- record a ride with the phone's GPS (page must stay open, screen on) ---------- */
let rec=null;
function openRecord(){if(!navigator.geolocation){toast(T('noGeo'));return}
 if(view!=='explore'){location.hash='#/explore';setTimeout(openRecord,200);return}
 if(rec||ui.draft||!map)return;
 rec={pts:[],start:null,elapsed:0,running:false,watch:null,lock:null,line:L.polyline([],{color:cssVar('--route-sel'),weight:5,interactive:false}).addTo(map),me:null};
 const bar=document.createElement('div');bar.className='recbar';bar.id='recbar';$('.mapwrap').appendChild(bar);L.DomEvent.disableClickPropagation(bar);renderRec()}
function recKm(){return rec.pts.length>1?stats({coords:rec.pts}).km:0}
function recTime(){const ms=rec.elapsed+(rec.running?Date.now()-rec.start:0),m=Math.floor(ms/60000);return`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`}
function renderRec(){const b=$('#recbar');if(!b||!rec)return;
 b.innerHTML=`<div class="recstats"><div><b>${recTime()}</b><span>${T('recTime')}</span></div><div><b>${fmtKm(recKm())}</b><span>km</span></div><div><b>${rec.pts.length}</b><span>${T('points')}</span></div></div>
 ${rec.running?`<div class="rechint"><span class="recdot"></span>${T('recRunning')}</div>`:`<div class="rechint">${rec.pts.length?T('recPaused'):T('recIntro')}</div>`}
 <div class="recbtns">${rec.running?`<button class="btn" id="rPause">${T('recPause')}</button>`:`<button class="btn primary" id="rGo">${rec.pts.length?T('recResume'):T('recStart')}</button>`}
 ${rec.pts.length>1&&!rec.running?`<button class="btn primary" id="rDone">${T('recFinish')}</button>`:''}<button class="btn ghost" id="rCancel">${T('cancel')}</button></div>`;
 $('#rGo')?.addEventListener('click',recGo);$('#rPause')?.addEventListener('click',recPause);
 $('#rDone')?.addEventListener('click',()=>{const coords=rec.pts.slice();recStop();openSave({name:T('recName',{date:new Date().toLocaleDateString(LOC)}),coords,source:'Aufgezeichnet'})});
 $('#rCancel').onclick=()=>{if(rec.pts.length>1&&!b.dataset.sure){b.dataset.sure=1;$('#rCancel').textContent=T('recDiscard');return}recStop()}}
async function recGo(){rec.running=true;rec.start=Date.now();
 try{rec.lock=await navigator.wakeLock?.request('screen')}catch(e){}
 rec.watch=navigator.geolocation.watchPosition(p=>{const c=p.coords;if(c.accuracy>35)return;
   const pt=[+c.latitude.toFixed(6),+c.longitude.toFixed(6),c.altitude!=null?Math.round(c.altitude):null];const last=rec.pts[rec.pts.length-1];
   if(!last||haversine(last,pt)>.006){rec.pts.push(pt);rec.line.addLatLng([pt[0],pt[1]]);local.recording=rec.pts;saveLocal()}
   if(!rec.me)rec.me=L.marker([pt[0],pt[1]],{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[18,18],iconAnchor:[9,9]}),interactive:false}).addTo(map);else rec.me.setLatLng([pt[0],pt[1]]);
   map.setView([pt[0],pt[1]],Math.max(map.getZoom(),15));renderRec()},
  e=>{toast(e.code===1?T('geoDenied'):T('noGeo'));recPause()},{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
 rec.tick=setInterval(renderRec,10000);renderRec()}
function recPause(){if(!rec)return;if(rec.running){rec.elapsed+=Date.now()-rec.start}rec.running=false;if(rec.watch!=null)navigator.geolocation.clearWatch(rec.watch);rec.watch=null;clearInterval(rec.tick);rec.lock?.release?.().catch(()=>{});rec.lock=null;renderRec()}
function recStop(){if(!rec)return;recPause();map.removeLayer(rec.line);if(rec.me)map.removeLayer(rec.me);$('#recbar')?.remove();rec=null;delete local.recording;saveLocal()}
document.addEventListener('visibilitychange',async()=>{if(rec?.running&&document.visibilityState==='visible'){try{rec.lock=await navigator.wakeLock?.request('screen')}catch(e){}}});
/* A recording interrupted by a closed tab can still be saved next time */
function offerRecovery(){const pts=local.recording;if(!pts||pts.length<2)return;
 const m=modal(`<h3>${T('recRecoverT')}</h3><p>${T('recRecover',{n:pts.length,km:fmtKm(stats({coords:pts}).km)})}</p><div class="actions"><button class="btn" id="rvNo">${T('recDiscard')}</button><button class="btn primary" id="rvYes">${T('store')}</button></div>`);
 $('#rvNo',m).onclick=()=>{delete local.recording;saveLocal();m.close()};
 $('#rvYes',m).onclick=()=>{delete local.recording;saveLocal();m.close();openSave({name:T('recName',{date:new Date().toLocaleDateString(LOC)}),coords:pts,source:'Aufgezeichnet'})}}

/* ---------- home ---------- */
// Decorative contour lines behind the hero, like a topographic map.
const TOPO=`<svg class="topo" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M1034 90C1034 94 1030 98 1026 101C1023 104 1017 105 1013 107C1010 109 1007 110 1005 113C1002 116 1002 120 999 123C996 126 992 130 987 132C983 133 977 133 972 133C968 132 963 130 958 128C954 126 950 124 946 121C943 118 940 115 939 111C938 107 939 103 940 99C940 96 942 93 942 90C942 87 940 84 939 80C938 77 935 71 936 67C937 63 940 59 944 56C948 54 954 54 959 54C964 53 969 54 974 55C978 55 982 54 986 54C991 55 995 55 999 56C1003 57 1007 60 1010 62C1014 64 1016 67 1020 70C1023 72 1027 75 1030 78C1032 82 1035 86 1034 90ZM1087 90C1085 97 1076 105 1069 111C1062 117 1051 119 1045 123C1038 128 1035 131 1031 137C1027 143 1025 152 1019 159C1013 165 1004 173 995 175C986 178 974 177 965 175C955 173 946 169 937 165C929 161 920 157 914 151C908 145 903 138 901 131C899 124 901 115 902 108C902 102 905 96 904 90C902 84 897 78 894 70C892 62 887 51 889 43C892 36 899 27 908 23C916 19 929 19 939 19C949 18 959 20 967 20C976 20 984 18 993 19C1001 19 1011 19 1019 22C1027 24 1034 29 1041 34C1048 38 1054 43 1060 49C1067 54 1076 60 1080 66C1085 73 1089 83 1087 90ZM1137 90C1134 101 1119 112 1109 120C1099 128 1084 132 1075 139C1067 146 1064 153 1059 163C1053 173 1051 188 1041 197C1032 207 1017 217 1003 220C989 223 972 220 957 217C943 214 929 207 917 201C904 195 891 188 883 180C874 171 867 160 864 149C862 139 866 127 866 117C865 107 867 100 863 90C860 80 850 70 846 58C842 47 837 30 841 19C846 7 859 -4 873 -9C886 -15 906 -13 921 -14C935 -15 948 -13 961 -14C974 -14 986 -18 999 -18C1012 -18 1027 -17 1039 -13C1051 -9 1061 -2 1072 5C1083 12 1092 19 1102 27C1112 35 1125 44 1131 54C1137 65 1141 79 1137 90ZM1185 90C1179 104 1159 118 1146 129C1133 140 1115 144 1106 155C1097 165 1096 177 1089 191C1082 205 1078 226 1065 239C1052 251 1031 262 1011 265C992 268 969 263 950 258C931 253 913 244 897 236C881 227 864 219 853 207C842 196 834 181 830 167C827 153 831 138 830 125C828 112 826 103 820 90C814 77 798 62 793 46C789 30 784 8 792 -7C799 -21 821 -34 839 -40C858 -47 883 -44 903 -45C922 -46 938 -46 955 -47C973 -49 989 -54 1006 -55C1023 -55 1043 -53 1059 -48C1075 -43 1089 -33 1103 -24C1118 -15 1132 -6 1145 5C1158 16 1175 28 1182 42C1189 57 1191 76 1185 90ZM1230 90C1221 108 1195 123 1180 137C1165 151 1148 157 1138 171C1128 185 1131 203 1122 222C1114 240 1107 267 1090 282C1072 297 1044 308 1020 310C995 313 966 304 943 297C919 290 897 280 878 269C858 259 838 248 825 233C811 219 803 200 798 184C793 167 798 149 794 134C790 118 783 107 774 90C764 73 743 53 738 33C732 13 731 -15 742 -32C754 -49 783 -62 807 -69C831 -76 862 -73 886 -75C910 -76 928 -78 949 -81C970 -84 991 -92 1013 -92C1034 -93 1059 -90 1079 -83C1099 -77 1117 -64 1135 -53C1153 -42 1172 -31 1188 -17C1204 -3 1226 13 1233 31C1239 49 1239 72 1230 90ZM1272 90C1260 111 1230 128 1213 145C1196 161 1181 170 1172 189C1163 207 1168 232 1159 255C1149 278 1137 310 1115 327C1093 343 1057 353 1027 354C998 355 964 343 936 334C908 326 883 314 860 301C836 288 813 275 798 258C782 241 774 219 767 200C760 180 763 161 756 143C749 124 736 111 723 90C710 69 683 44 679 19C674 -5 677 -38 693 -57C710 -77 748 -89 778 -97C807 -104 842 -100 870 -103C898 -106 918 -110 943 -115C968 -120 994 -130 1020 -131C1046 -132 1075 -127 1099 -119C1124 -111 1145 -96 1167 -83C1189 -70 1213 -57 1232 -40C1251 -23 1275 -2 1282 19C1288 41 1283 69 1272 90ZM1310 90C1296 114 1262 133 1245 152C1229 172 1218 185 1210 208C1202 231 1209 264 1198 291C1187 319 1169 355 1141 373C1114 390 1070 397 1035 396C1000 396 962 380 930 369C898 359 869 346 842 331C816 317 790 302 772 282C754 263 745 237 736 216C727 194 728 173 716 152C705 131 684 115 667 90C651 65 621 33 617 5C614 -24 624 -60 647 -81C669 -103 716 -114 751 -122C785 -130 823 -125 854 -130C885 -135 908 -144 937 -150C966 -157 996 -170 1027 -171C1057 -171 1091 -165 1120 -155C1149 -145 1174 -128 1200 -113C1226 -97 1255 -82 1276 -62C1298 -42 1323 -17 1329 8C1334 33 1324 66 1310 90ZM1346 90C1330 117 1294 137 1278 160C1263 183 1257 201 1251 229C1244 258 1254 298 1240 330C1226 361 1200 401 1168 418C1135 436 1083 439 1042 436C1002 433 960 415 924 402C888 389 855 376 826 360C796 344 767 327 747 305C727 284 717 255 705 231C693 208 689 186 673 162C657 139 627 119 607 90C588 61 556 23 555 -10C554 -42 574 -82 602 -104C631 -127 687 -136 726 -144C766 -153 805 -150 839 -157C873 -164 898 -178 930 -187C963 -196 999 -210 1034 -211C1069 -212 1107 -202 1140 -191C1174 -180 1203 -161 1233 -143C1262 -125 1297 -108 1320 -85C1344 -61 1369 -32 1374 -2C1378 27 1362 63 1346 90ZM1379 90C1362 120 1327 141 1313 168C1299 195 1301 219 1296 253C1291 286 1301 336 1284 371C1267 406 1232 446 1193 463C1154 480 1095 478 1049 472C1003 467 958 446 918 432C879 418 843 405 810 388C777 371 745 351 722 328C700 304 689 274 673 248C657 222 647 200 626 173C604 147 565 123 543 90C521 57 490 11 493 -24C496 -60 526 -102 562 -125C597 -149 660 -155 704 -165C747 -175 787 -174 824 -184C860 -194 887 -214 923 -225C960 -237 1002 -252 1042 -253C1081 -253 1124 -240 1161 -227C1198 -214 1232 -194 1265 -174C1299 -154 1338 -134 1364 -107C1389 -80 1414 -45 1416 -12C1419 20 1397 60 1379 90ZM1411 90C1394 123 1361 146 1351 177C1340 208 1350 239 1346 278C1343 318 1351 375 1330 413C1308 451 1263 490 1217 506C1172 521 1105 513 1055 506C1004 498 957 476 913 460C870 445 830 433 794 415C759 397 724 375 698 350C672 325 659 293 639 265C618 238 601 215 574 185C547 156 499 127 475 90C452 53 424 0 432 -39C440 -78 483 -120 525 -144C567 -168 636 -173 683 -184C730 -195 769 -198 808 -211C847 -225 876 -251 916 -265C956 -279 1005 -295 1049 -295C1093 -294 1140 -279 1182 -264C1223 -248 1261 -226 1299 -204C1336 -182 1380 -159 1406 -129C1432 -99 1455 -58 1456 -22C1457 15 1429 57 1411 90ZM232 470C232 474 230 478 229 481C227 485 226 489 223 492C220 495 216 498 212 500C208 501 202 500 197 500C193 500 189 499 185 499C181 500 179 502 174 503C170 505 164 508 158 508C153 508 146 507 143 504C139 502 137 497 135 493C134 489 135 485 134 481C134 477 134 473 134 470C134 467 135 463 137 460C139 457 142 454 144 452C147 449 149 447 152 444C154 441 156 437 159 434C163 431 168 427 172 427C177 426 183 427 187 429C192 431 195 436 198 439C201 441 203 444 206 446C210 448 215 448 218 450C222 452 227 455 229 459C231 462 232 466 232 470ZM283 470C283 478 280 485 277 493C274 500 271 508 265 514C259 519 251 525 242 527C234 530 222 529 214 529C205 529 198 527 191 529C183 531 177 536 168 540C158 543 145 549 135 549C125 549 112 545 105 539C98 533 95 523 93 515C90 507 91 498 91 491C90 484 88 477 89 470C90 463 91 456 95 450C98 444 104 439 109 433C113 428 117 423 122 417C127 411 131 402 138 396C145 390 155 384 164 383C174 382 186 386 194 391C203 395 208 404 215 409C221 414 226 417 233 421C241 424 251 425 259 429C267 434 275 440 279 447C283 453 284 462 283 470ZM334 470C333 482 329 493 324 504C319 515 315 526 306 535C297 543 283 550 271 554C258 557 242 555 229 556C217 557 208 556 196 560C185 564 175 574 160 580C146 585 126 593 110 592C95 591 78 582 68 573C59 564 56 548 52 536C49 524 50 512 49 501C47 490 45 480 45 470C46 460 49 449 53 440C58 431 66 424 73 415C79 406 84 398 91 388C98 378 104 364 115 356C126 348 142 340 157 340C171 340 188 348 201 354C213 361 221 374 231 380C241 387 250 390 262 395C273 399 290 401 302 407C313 414 325 424 331 435C336 445 335 458 334 470ZM384 470C382 485 377 501 370 515C364 529 357 544 345 555C333 565 314 574 297 578C281 583 260 580 244 583C229 585 218 587 202 594C187 601 172 616 152 623C133 630 105 639 85 636C65 633 45 619 33 606C21 592 19 571 15 555C11 539 10 524 8 510C6 496 1 483 2 470C3 457 6 443 12 430C17 418 28 408 36 396C44 384 49 371 58 358C68 344 77 326 92 316C107 306 130 297 149 298C168 299 190 312 207 321C223 330 233 345 247 352C261 360 275 362 291 367C308 373 331 375 347 384C362 393 376 408 383 422C389 437 386 455 384 470ZM433 470C430 489 424 508 415 525C407 543 398 561 382 574C367 587 343 596 323 602C302 608 279 605 260 610C241 615 228 621 209 631C190 641 169 662 144 670C119 679 84 686 60 681C36 675 13 655 -1 637C-14 619 -15 593 -20 573C-25 553 -27 537 -31 519C-34 502 -41 486 -41 470C-41 454 -36 436 -30 421C-23 405 -12 392 -3 376C6 360 12 343 24 326C36 309 48 285 68 274C88 263 118 256 142 258C166 261 192 278 212 289C233 300 245 316 263 324C282 332 301 332 323 338C344 344 375 348 393 360C412 372 428 392 434 410C441 429 436 451 433 470ZM480 470C476 493 469 515 459 535C448 556 437 578 418 592C399 607 371 617 347 624C324 632 298 630 276 638C254 646 240 658 216 672C193 685 165 712 135 721C105 729 62 734 34 725C7 716 -17 688 -32 666C-46 643 -47 613 -53 590C-59 567 -64 548 -69 528C-74 509 -84 490 -84 470C-85 450 -79 430 -72 411C-65 392 -53 375 -43 356C-33 336 -27 313 -12 292C2 272 20 245 44 233C69 221 106 216 135 221C164 225 194 248 218 260C242 272 257 288 280 295C303 303 329 301 356 307C383 314 420 320 442 336C463 351 478 376 485 398C491 421 484 447 480 470Z"/></svg>`;
function newRoutes(){return allRoutes().slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,3)}
function topRoutes(){return allRoutes().filter(r=>reviewsOf(r).length).slice().sort((a,b)=>(avg(b)*Math.min(reviewsOf(b).length,3))-(avg(a)*Math.min(reviewsOf(a).length,3))||String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,6)}
function tileHTML(r){const s=stats(r),a=avg(r),n=reviewsOf(r).length,ph=photosOf(r)[0];
 return`<a class="tile" href="#/route/${encodeURIComponent(r.id)}">${ph?`<img src="${esc(ph.src)}" alt="" loading="lazy">`:'<div class="ph"></div>'}
 <div class="tbody"><div class="tmeta"><span class="pill d-${esc(r.difficulty)}">${esc(diffLabel(r.difficulty))}</span>${n?`<span class="stars">★ ${a.toLocaleString(LOC,{maximumFractionDigits:1})}</span><span class="muted">(${n})</span>`:''}${innBadge(r)}</div>
 <h4>${esc(r.name)}</h4><div class="muted">${esc(r.region||T('noRegion'))}</div><div class="tstats">${fmtKm(s.km)} km · ${fmtDur(s.hours)}${s.hasE?` · ↑ ${fmtInt(s.up)} m`:''}</div></div></a>`}
function renderHome(){const regions=[...new Set(allRoutes().map(r=>(r.region||'').split('·')[0].trim()).filter(Boolean))].sort();
 const quick=[['leicht',T('qEasy')],['gallop',T('qGallop')],['beach',T('qBeach')],['inn',T('qInn')]];
 $('#home').innerHTML=`<section class="hero">${TOPO}<div class="heroin">
  <h2>${T('heroTitle')}</h2><p>${T('heroText')}</p>
  <form id="regionForm" class="regionbox" role="search"><span class="ic">${ICON.pin}</span><input id="regionInput" list="regionList" autocomplete="off" placeholder="${T('regionInputPh')}" aria-label="${T('regionInputLabel')}"><button class="btn primary big" type="submit">${T('findRoutes')}</button></form>
  <datalist id="regionList">${regions.map(r=>`<option value="${esc(r)}">`).join('')}</datalist>
  <div class="herobtns"><button class="linkbtn strong" id="nearMe">${ICON.near} ${T('nearMe')}</button><a class="linkbtn strong" href="#/explore">${T('browseMap')} →</a></div>
  <div class="quick"><span class="muted">${T('popular')}</span>${quick.map(([k,l])=>`<a class="chip" href="#/explore?f=${k}">${l}</a>`).join('')}</div>
 </div></section>
 <section class="hsec"><div class="sechead"><h3>${T('newRoutes')}</h3><a href="#/explore?sort=new">${T('allRoutes')} →</a></div>
  <div class="topgrid">${ui.loading?`<p class="muted">${T('loading')}</p>`:newRoutes().length?newRoutes().map(tileHTML).join(''):`<div class="empty homeempty"><strong>${T('noRoutesYetT')}</strong>${T('noRoutesYet')}<button class="btn primary" data-act="add">${T('addRoute')}</button></div>`}</div></section>
 ${!ui.loading&&topRoutes().length?`<section class="hsec"><div class="sechead"><h3>${T('topRoutes')}</h3><a href="#/explore">${T('allRoutes')} →</a></div>
  <div class="topgrid">${topRoutes().map(tileHTML).join('')}</div></section>`:''}
 <section class="hsec how"><h3>${T('howTitle')}</h3><ol>
  <li><b>${T('how1t')}</b><span>${T('how1')}</span></li><li><b>${T('how2t')}</b><span>${T('how2')}</span></li><li><b>${T('how3t')}</b><span>${T('how3')}</span></li></ol>
  <button class="btn primary" data-act="add">${T('addRoute')}</button></section>
 ${footHTML()}`;
 $('#regionForm').onsubmit=e=>{e.preventDefault();const v=$('#regionInput').value.trim();location.hash=v?'#/explore?region='+encodeURIComponent(v):'#/explore'};
 $('#nearMe').onclick=nearMe;
 $('#home').querySelectorAll('[data-act=add]').forEach(b=>b.onclick=openAdd);
 bindFoot()}
function renderLegal(kind){const L=window.HOOFPRINT_LEGAL||{};
 $('#home').innerHTML=`<article class="legal"><a class="linkbtn strong" href="#/">← ${T('navHome')}</a>${LANG==='de'?'':`<p class="muted">${T('legalGermanOnly')}</p>`}${L[kind]||''}</article>${footHTML()}`;bindFoot()}
const footHTML=()=>`<footer class="foot"><span>Hoofprints</span><a class="linkbtn" href="#/impressum">${T('imprint')}</a><a class="linkbtn" href="#/datenschutz">${T('privacy')}</a><button class="linkbtn" data-act="lang">${T('langName')}</button><button class="linkbtn" data-act="about">${T('about')}</button></footer>`;
function bindFoot(){$('#home').querySelector('.foot [data-act=lang]').onclick=switchLang;$('#home').querySelector('.foot [data-act=about]').onclick=openAbout}
function nearMe(){if(!navigator.geolocation){toast(T('noGeo'));return}toast(T('locating'));
 navigator.geolocation.getCurrentPosition(p=>{location.hash='#/explore?near='+p.coords.latitude.toFixed(4)+','+p.coords.longitude.toFixed(4)},()=>toast(T('noGeo')),{timeout:10000,maximumAge:300000})}

/* ---------- add route chooser ---------- */
function openAdd(){const m=modal(`<h3>${T('addRoute')}</h3><p>${T('addText')}</p>
 <div class="choices"><button class="choice" id="cImport"><b>${T('import')}</b><span>${T('importShort')}</span></button>
 <button class="choice" id="cDraw"><b>${T('draw')}</b><span>${T('drawShort')}</span></button>
 <button class="choice" id="cRec"><b>${T('record')}</b><span>${T('recordShort')}</span></button></div>
 <div class="actions"><button class="btn" data-close>${T('cancel')}</button></div>`);
 $('#cImport',m).onclick=()=>{m.close();openImport()};
 $('#cRec',m).onclick=()=>{m.close();openRecord()};
 $('#cDraw',m).onclick=()=>{m.close();if(view!=='explore'){location.hash='#/explore';setTimeout(startDraw,150)}else startDraw()}}

/* ---------- menu ---------- */
function openMenu(){const favN=local.favorites.filter(byId).length,mineN=allRoutes().filter(isMine).length;
 const d=document.createElement('div');d.className='drawer-bg';d.innerHTML=`<nav class="drawer" aria-label="${T('menu')}">
  <div class="dhd"><b>${T('menu')}</b><button class="btn ghost" data-close aria-label="${T('close')}">${ICON.x}</button></div>
  <a href="#/">${T('navHome')}</a><a href="#/explore">${T('navExplore')}</a>
  <a href="#/hoofprints">${T('myHoofprints')}<span class="count">${local.log.length}</span></a><a href="#/saved">${T('tabFav')}<span class="count">${favN}</span></a><a href="#/mine">${T('tabMine')}<span class="count">${mineN}</span></a>
  <hr><button data-act="import">${T('import')}</button><button data-act="draw">${T('draw')}</button><button data-act="rec">${T('record')}</button>
  <hr><button data-act="lang">${T('langName')}</button><button data-act="about">${T('about')}</button><a href="#/impressum">${T('imprint')}</a><a href="#/datenschutz">${T('privacy')}</a>
  <div class="dfoot"><span class="muted">Version ${APP_VERSION}</span> <span class="mode">${backend.online?T('modeShared'):T('modeLocal')}</span> <span class="muted">${backend.online?T('modeSharedTitle'):T('modeLocalTitle')}</span></div></nav>`;
 document.body.appendChild(d);const close=()=>{d.remove();document.removeEventListener('keydown',k)};function k(e){if(e.key==='Escape')close()}document.addEventListener('keydown',k);
 d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-close],a'))close()});
 d.querySelector('[data-act=import]').onclick=()=>{close();openImport()};
 d.querySelector('[data-act=draw]').onclick=()=>{close();if(view!=='explore'){location.hash='#/explore';setTimeout(startDraw,150)}else startDraw()};
 d.querySelector('[data-act=rec]').onclick=()=>{close();openRecord()};
 d.querySelector('[data-act=lang]').onclick=switchLang;d.querySelector('[data-act=about]').onclick=()=>{close();openAbout()};
 setTimeout(()=>d.querySelector('a')?.focus(),0)}
function switchLang(){try{localStorage.setItem('hoofprint.lang',LANG==='de'?'en':'de')}catch(e){}location.reload()}

/* ---------- pages: #/  #/explore  #/saved  #/mine  #/route/<id> ---------- */
let view=null,mapReady=false;
function showView(v){view=v;$('#home').hidden=!['home','hoofprints','legal'].includes(v);$('#explore').hidden=v!=='explore';
 document.querySelectorAll('.topnav a').forEach(a=>a.classList.toggle('on',a.dataset.view===v||(a.dataset.view==='saved'&&ui.tab==='fav'&&v==='explore')));
 if(v==='explore'){if(!mapReady){mapReady=true;try{initMap()}catch(e){console.error(e);$('#map').innerHTML=`<div class="maperr">${T('mapFail')}</div>`}drawRoutes();fitAll()}else if(map)map.invalidateSize()}}
function router(){if(ui.draft)endDraw();if(nav&&!location.hash.startsWith('#/route/'+encodeURIComponent(nav.r.id)))stopFollow();if(rec&&!location.hash.startsWith('#/explore'))recPause();
 const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),parts=path.split('/'),params=new URLSearchParams(qs||'');
 if(!parts[0]){showView('home');renderHome();window.scrollTo(0,0);return}
 if(parts[0]==='hoofprints'){showView('hoofprints');renderHoofprints();window.scrollTo(0,0);return}
 if(parts[0]==='impressum'||parts[0]==='datenschutz'){showView('legal');renderLegal(parts[0]);window.scrollTo(0,0);return}
 if(parts[0]==='route'){showView('explore');showRoute(decodeURIComponent(parts[1]||''));return}
 ui.sel=null;ui.tab={saved:'fav',mine:'mine'}[parts[0]]||'discover';
 const fresh=location.hash!==ui.lastList;ui.lastList=location.hash;
 if(fresh&&(ui.tab!=='discover'||params.has('f')||params.has('region')||params.has('near'))){resetFilters();ui.q=''}
 if(fresh&&params.get('sort'))ui.sort=params.get('sort');
 const f=params.get('f');if(fresh&&f){if(['leicht','mittel','schwer'].includes(f))ui.diff.add(f);else if(FEAT[f])ui.feats.add(f)}
 showView('explore');renderPanel();drawRoutes();styleRoutes();
 if(fresh){const region=params.get('region'),near=params.get('near');
  if(region)findPlace(region);
  else if(near&&map){map.invalidateSize();const [la,lo]=near.split(',').map(Number);map.setView([la,lo],10,{animate:false});ui.place=T('yourLocation');ui.inView=true;renderPanel();drawRoutes()}
  else if(f)fitVisible()}}
function fitVisible(){if(!map)return;const b=L.latLngBounds([]);visibleList(true).forEach(r=>r.coords.forEach(p=>b.extend([p[0],p[1]])));if(b.isValid())map.fitBounds(b,{padding:[30,30],maxZoom:13,animate:false})}

/* ---------- start ---------- */
async function boot(){ui.loading=true;ui.loadError=null;if(view==='home')renderHome();else if(view==='explore')renderPanel();
 try{await backend.load()}catch(e){ui.loadError=backend.online?T('dbDown'):String(e.message||e)}
 ui.loading=false;if(view==='home')renderHome();else if(view!=='explore'){}else{renderPanel();drawRoutes();if(!ui.sel&&!ui.place)fitAll();else if(ui.sel)showRoute(ui.sel)}}
/* static page text */
document.documentElement.lang=LANG;document.title=T('pageTitle');
document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=T(el.dataset.i18n));
document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.title=T(el.dataset.i18nTitle);if(el.hasAttribute('aria-label'))el.setAttribute('aria-label',el.title)});
$('#btnAdd').onclick=openAdd;$('#btnMenu').onclick=openMenu;
window.addEventListener('hashchange',router);
router();boot();setTimeout(offerRecovery,600);
})();
