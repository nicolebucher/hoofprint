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
let LANG=(()=>{try{const v=localStorage.getItem('hoofprint.lang');if(v&&I18N[v])return v}catch(e){}return /^de\b/i.test(navigator.language||'')?'de':'en'})();
const LOC=I18N[LANG].locale;
function T(k,v){let s=I18N[LANG][k]??I18N.de[k]??k;if(v)for(const n in v)s=s.split('{'+n+'}').join(v[n]);return s}
const tr=(r,f)=>(LANG==='en'&&r[f+'_en'])||r[f];
const srcLabel=s=>s==='Beispiel'?T('example'):s==='Gezeichnet'?T('drawn'):s;
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

const FEAT={parking:1,water:1,gallop:1,inn:1,beach:1,shade:1,plakette:1};
const FEAT_ICON={parking:'<path d="M6 20V4h7a5 5 0 0 1 0 10H6"/>',water:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',gallop:'<path d="M3 17h18M5 13l4-4 4 3 6-6"/>',inn:'<path d="M5 3v8a3 3 0 0 0 6 0V3M8 11v10M17 3c-2 0-3 3-3 6s1 3 3 3v9"/>',beach:'<path d="M3 18c3-2 6 2 9 0s6 2 9 0M12 4a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7zM12 11v6"/>',shade:'<path d="M12 3l6 9h-3l4 6H5l4-6H6z M12 18v3"/>',plakette:'<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 12h8"/>'};
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
let local={deviceId:null,favorites:[],mine:[],myReviews:[],myPhotos:[],posts:[],routes:[],reviews:[],photos:[]};
try{const raw=localStorage.getItem(KEY)||localStorage.getItem('hufspur.v2');if(raw)local=Object.assign(local,JSON.parse(raw))}catch(e){}
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(local));return true}catch(e){return false}}
if(!local.deviceId){local.deviceId=uuid();saveLocal()}
/* Light spam brake on this device; the database enforces its own limit too. */
function throttle(){const now=Date.now();local.posts=local.posts.filter(t=>now-t<10*60e3);if(local.posts.length>=8)throw new Error(T('tooMuch'));local.posts.push(now);saveLocal()}

/* ---------- shared data: Supabase when configured, otherwise this browser ---------- */
const CFG=window.HOOFPRINT_CONFIG||window.HUFSPUR_CONFIG||{};
const sb=(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase)?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false}}):null;
const shared={routes:[],reviews:[],photos:[]};
const publicUrl=path=>`${CFG.supabaseUrl}/storage/v1/object/public/photos/${path}`;
function fail(error){if(!error)return;const m=String(error.message||error);if(/rate|too many/i.test(m))throw new Error(T('rateLimited'));throw new Error(T('saveFailed')+m)}
const backend=sb?{
 online:true,
 async load(){const [r,v,p]=await Promise.all([
   sb.from('routes').select('id,name,region,difficulty,surfaces,features,description,coords,source,created_at').order('created_at',{ascending:false}).limit(2000),
   sb.from('reviews').select('id,route_id,name,stars,text,created_at').order('created_at',{ascending:false}).limit(10000),
   sb.from('photos').select('id,route_id,path,created_at').order('created_at',{ascending:false}).limit(10000)]);
  for(const x of[r,v,p])if(x.error)throw x.error;
  shared.routes=r.data.map(x=>({id:x.id,name:x.name,region:x.region,difficulty:x.difficulty,surfaces:x.surfaces,features:x.features||[],desc:x.description,coords:x.coords,source:x.source,createdAt:x.created_at}));
  shared.reviews=v.data.map(x=>({id:x.id,routeId:x.route_id,name:x.name,stars:x.stars,text:x.text,date:x.created_at}));
  shared.photos=p.data.map(x=>({id:x.id,routeId:x.route_id,url:publicUrl(x.path)}))},
 async addRoute(r){const{error}=await sb.from('routes').insert({id:r.id,name:r.name,region:r.region,difficulty:r.difficulty,surfaces:r.surfaces,features:r.features,description:r.desc,coords:r.coords,source:r.source,device_id:local.deviceId});fail(error);shared.routes.unshift(r)},
 async addReview(v){const{error}=await sb.from('reviews').insert({id:v.id,route_id:v.routeId,name:v.name,stars:v.stars,text:v.text,device_id:local.deviceId});fail(error);shared.reviews.unshift(v)},
 async addPhoto(routeId,blob){const id=uuid(),path=`${routeId}/${id}.jpg`;const up=await sb.storage.from('photos').upload(path,blob,{contentType:'image/jpeg'});fail(up.error);
  const{error}=await sb.from('photos').insert({id,route_id:routeId,path,device_id:local.deviceId});fail(error);const p={id,routeId,url:publicUrl(path)};shared.photos.unshift(p);return p},
 async remove(kind,id){const{data,error}=await sb.rpc('delete_own',{kind,target:id,dev:local.deviceId});fail(error);if(!data)throw new Error(T('deleteOnlyDevice'));dropShared(kind,id)},
 async report(kind,id,reason){const{error}=await sb.from('reports').insert({kind,target_id:id,reason});fail(error)}
}:{
 online:false,
 async load(){shared.routes=local.routes;shared.reviews=local.reviews;shared.photos=local.photos},
 async addRoute(r){local.routes.unshift(r);if(!saveLocal()){local.routes.shift();throw new Error(T('storageFull'))}},
 async addReview(v){local.reviews.unshift(v);if(!saveLocal()){local.reviews.shift();throw new Error(T('storageFull'))}},
 async addPhoto(routeId,blob){const p={id:uuid(),routeId,url:await blobToDataURL(blob)};local.photos.unshift(p);if(!saveLocal()){local.photos.shift();throw new Error(T('photoStorageFull'))}return p},
 async remove(kind,id){dropShared(kind,id);saveLocal()},
 async report(){}
};
function dropShared(kind,id){const pick=a=>a.filter(x=>x.id!==id);
 if(kind==='route'){const keep=x=>x.routeId!==id;shared.routes=pick(shared.routes);shared.reviews=shared.reviews.filter(keep);shared.photos=shared.photos.filter(keep)}
 if(kind==='review')shared.reviews=pick(shared.reviews);if(kind==='photo')shared.photos=pick(shared.photos);
 if(!backend.online){local.routes=shared.routes;local.reviews=shared.reviews;local.photos=shared.photos}}
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
 map.on('moveend',()=>{if(ui.inView&&!ui.sel)renderPanel()});
 map.on('click',e=>{if(ui.draft)addDraftPoint(e.latlng)});
 const mq=matchMedia('(prefers-color-scheme: dark)');mq.addEventListener?.('change',styleRoutes);
}
function fitAll(){if(!map)return;const b=L.latLngBounds([]);allRoutes().forEach(r=>r.coords.forEach(p=>b.extend([p[0],p[1]])));if(b.isValid())map.fitBounds(b,{padding:[30,30],maxZoom:13})}
function drawRoutes(){if(!map)return;Object.values(routeLayers).forEach(g=>map.removeLayer(g));Object.values(startMarkers).forEach(m=>map.removeLayer(m));routeLayers={};startMarkers={};
 visibleList(true).forEach(r=>{const ll=r.coords.map(p=>[p[0],p[1]]);const casing=L.polyline(ll,{weight:8,opacity:.9,interactive:false});const ln=L.polyline(ll,{weight:4.5,opacity:1});const g=L.layerGroup([casing,ln]).addTo(map);g._c=casing;g._l=ln;ln.on('click',()=>select(r.id));ln.bindTooltip(r.name,{sticky:true});routeLayers[r.id]=g;
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

function renderPanel(){const p=$('#panel');if(ui.sel&&byId(ui.sel)){p.innerHTML=detailHTML(byId(ui.sel));bindDetail();return}
 const favN=local.favorites.filter(byId).length,mineN=allRoutes().filter(isMine).length;
 const list=visibleList();
 const body=ui.loading?`<div class="loading">${T('loading')}</div>`:ui.loadError?`<div class="empty"><strong>${T('loadFail')}</strong>${esc(ui.loadError)}<button class="btn" data-act="retry">${T('retry')}</button></div>`:list.length?list.map(cardHTML).join(''):emptyHTML();
 p.innerHTML=`<div class="tabs" role="tablist">
  <button class="tab" role="tab" data-tab="discover" aria-selected="${ui.tab==='discover'}">${T('tabDiscover')}</button>
  <button class="tab" role="tab" data-tab="fav" aria-selected="${ui.tab==='fav'}">${T('tabFav')}<span class="count">${favN}</span></button>
  <button class="tab" role="tab" data-tab="mine" aria-selected="${ui.tab==='mine'}">${T('tabMine')}<span class="count">${mineN}</span></button></div>
 <div class="filters">
  <label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="${T('searchPh')}" value="${esc(ui.q)}" aria-label="${T('searchLabel')}"></label>
  ${ui.q.trim().length>2?`<button class="linkbtn" id="geo" style="justify-self:start">${T('searchMap',{q:esc(ui.q.trim())})}</button>`:''}
  <div class="chips" aria-label="${T('difficulty')}">${['leicht','mittel','schwer'].map(d=>`<button class="chip" data-diff="${d}" aria-pressed="${ui.diff.has(d)}">${diffLabel(d)}</button>`).join('')}
   ${['parking','gallop','water','inn','beach'].map(f=>`<button class="chip" data-feat="${f}" aria-pressed="${ui.feats.has(f)}">${featLabel(f)}</button>`).join('')}</div>
  <div class="row"><label for="maxKm">${T('upTo')} <b id="maxKmV" style="color:var(--fg);font-variant-numeric:tabular-nums">${ui.maxKm<40?ui.maxKm+' km':T('any')}</b></label><input id="maxKm" type="range" min="5" max="40" step="1" value="${ui.maxKm}">
   <label>${T('sort')} <select id="sort"><option value="rating">${T('sortRating')}</option><option value="short">${T('sortShort')}</option><option value="long">${T('sortLong')}</option><option value="new">${T('sortNew')}</option></select></label>
   <label><input type="checkbox" id="inView" ${ui.inView?'checked':''}> ${T('inView')}</label></div>
 </div>
 <div class="list">${body}</div>`;
 $('#sort').value=ui.sort;bindList()}
function emptyHTML(){if(ui.tab==='fav')return`<div class="empty"><strong>${T('emptyFavT')}</strong>${T('emptyFav')}</div>`;
 if(ui.tab==='mine')return`<div class="empty"><strong>${T('emptyMineT')}</strong>${T('emptyMine')}<button class="btn primary" data-act="import">${T('import')}</button></div>`;
 return`<div class="empty"><strong>${T('emptyT')}</strong>${T('empty')}</div>`}
function cardHTML(r){const s=stats(r),a=avg(r),n=reviewsOf(r).length,ph=photosOf(r)[0];
 return`<button class="card" data-id="${esc(r.id)}">${ph?`<img class="thumb" src="${esc(ph.src)}" alt="" loading="lazy">`:`<div class="thumb"></div>`}
 <div style="min-width:0"><div class="src">${esc(srcLabel(r.source))}${isMine(r)?' · '+T('byYou'):''}${local.favorites.includes(r.id)?' · ♥':''}</div><h3>${esc(r.name)}</h3><div class="meta">${esc(r.region||T('noRegion'))}</div>
 <div class="stats"><span class="pill d-${esc(r.difficulty)}">${esc(diffLabel(r.difficulty))}</span><span>${fmtKm(s.km)} km</span><span>${fmtDur(s.hours)}</span>${s.hasE?`<span>↑ ${fmtInt(s.up)} m</span>`:''}<span>${n?`<span class="stars">${starStr(a)}</span> ${a.toLocaleString(LOC,{maximumFractionDigits:1})} (${n})`:T('unrated')}</span></div></div></button>`}
function bindList(){const p=$('#panel');
 p.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;renderPanel()});
 const q=$('#q');q.oninput=()=>{ui.q=q.value;const pos=q.selectionStart;renderPanel();drawRoutes();const n=$('#q');n.focus();n.setSelectionRange(pos,pos)};
 const geo=$('#geo');if(geo)geo.onclick=()=>geocode(ui.q.trim());
 p.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{const d=b.dataset.diff;ui.diff.has(d)?ui.diff.delete(d):ui.diff.add(d);renderPanel();drawRoutes()});
 p.querySelectorAll('[data-feat]').forEach(b=>b.onclick=()=>{const d=b.dataset.feat;ui.feats.has(d)?ui.feats.delete(d):ui.feats.add(d);renderPanel();drawRoutes()});
 $('#maxKm').oninput=e=>{ui.maxKm=+e.target.value;$('#maxKmV').textContent=ui.maxKm<40?ui.maxKm+' km':T('any')};
 $('#maxKm').onchange=()=>{renderPanel();drawRoutes()};
 $('#sort').onchange=e=>{ui.sort=e.target.value;renderPanel()};
 $('#inView').onchange=e=>{ui.inView=e.target.checked;renderPanel()};
 p.querySelectorAll('.card').forEach(c=>{c.onclick=()=>select(c.dataset.id);c.onmouseenter=()=>hoverRoute(c.dataset.id,true);c.onmouseleave=()=>hoverRoute(c.dataset.id,false)});
 p.querySelector('[data-act=import]')?.addEventListener('click',openImport);
 p.querySelector('[data-act=retry]')?.addEventListener('click',boot)}
function hoverRoute(id,on){const g=routeLayers[id];if(!g)return;g._l.setStyle({weight:on?7:4.5});if(on){g._c.bringToFront();g._l.bringToFront()}}
/* Place search via OpenStreetMap Nominatim, only on an explicit click */
async function geocode(q){if(!map)return;try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language='+LANG+'&q='+encodeURIComponent(q));const j=await r.json();
 if(!j.length){toast(T('placeNotFound'));return}const b=j[0].boundingbox.map(Number);map.fitBounds([[b[0],b[2]],[b[1],b[3]]],{maxZoom:13});ui.q='';ui.inView=true;renderPanel();drawRoutes()}catch(e){toast(T('placeDown'))}}

/* ---------- detail ---------- */
function select(id){if(ui.draft)return;ui.sel=id;ui.confirmDel=null;renderPanel();$('#panel').scrollTop=0;styleRoutes();const r=byId(id);if(map&&r){map.fitBounds(L.latLngBounds(r.coords.map(p=>[p[0],p[1]])),{padding:[40,40],maxZoom:15})}}
function back(){ui.sel=null;renderPanel();styleRoutes()}

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
function toGpx(r){return`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Hoofprint" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${esc(r.name)}</name><type>horse_riding</type><trkseg>\n${r.coords.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}">${p[2]!=null?`<ele>${p[2]}</ele>`:''}</trkpt>`).join('\n')}\n</trkseg></trk>\n</gpx>`}
/* ---------- modal helper ---------- */
function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="dialog" role="dialog" aria-modal="true">${html}</div>`;document.body.appendChild(m);
 const close=()=>{m.remove();document.removeEventListener('keydown',esc_)};function esc_(e){if(e.key==='Escape')close()}document.addEventListener('keydown',esc_);
 m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]'))close()});m.close=close;setTimeout(()=>m.querySelector('input,button,textarea')?.focus(),0);return m}


function detailHTML(r){const s=stats(r),rv=reviewsOf(r),a=avg(r),fav=local.favorites.includes(r.id),ph=photosOf(r);
 const surf=Object.entries(r.surfaces||{Unbekannt:100});const tot=surf.reduce((x,y)=>x+y[1],0)||1;const c0=r.coords[0];
 return`<div class="detail"><div class="dhead"><button class="btn ghost" id="back">${T('back')}</button><span class="sp"></span>
 <button class="btn fav" id="fav" aria-pressed="${fav}" title="${T('saveTitle')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>${fav?T('saved'):T('save')}</button>
 <button class="btn" id="gpx" title="${T('gpxTitle')}">GPX</button></div>
 <div class="dbody">
 <div class="dtitle"><div class="src">${esc(srcLabel(r.source))} · ${s.loop?T('loop'):T('oneway')}${isMine(r)?' · '+T('byYou'):''}</div><h2>${esc(r.name)}</h2><div class="meta">${esc(r.region||T('noRegion'))} · <span class="pill d-${esc(r.difficulty)}">${esc(diffLabel(r.difficulty))}</span> ${rv.length?` · <span class="stars">${starStr(a)}</span> ${a.toLocaleString(LOC,{maximumFractionDigits:1})}`:''}</div></div>
 <div class="kpis"><div class="kpi"><b>${fmtKm(s.km)}</b><span>${T('km')}</span></div><div class="kpi"><b>${fmtDur(s.hours)}</b><span>${T('duration')}</span></div><div class="kpi"><b>${s.hasE?fmtInt(s.up):'–'}</b><span>${T('up')}</span></div><div class="kpi"><b>${s.hasE?fmtInt(s.down):'–'}</b><span>${T('down')}</span></div></div>
 <section class="prof"><h4>${T('profile')}</h4>${profileSVG(s)}</section>
 <section><h4>${T('surface')}</h4><div class="surf">${surf.map(([k,v])=>`<span style="flex:${+v||1};background:${SURF_COL[k]||'#999'}" title="${esc(surfLabel(k))} ${Math.round(v/tot*100)} %"></span>`).join('')}</div>
  <div class="legend">${surf.map(([k,v])=>`<span><i style="background:${SURF_COL[k]||'#999'}"></i>${esc(surfLabel(k))} ${Math.round(v/tot*100)} %</span>`).join('')}</div></section>
 ${(r.features||[]).length?`<section><h4>${T('forRiders')}</h4><div class="feat">${r.features.filter(f=>FEAT[f]).map(f=>`<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${FEAT_ICON[f]}</svg>${featLabel(f)}</span>`).join('')}</div></section>`:''}
 ${r.desc?`<p class="desc">${esc(tr(r,'desc'))}</p>`:''}
 ${r.season?`<div class="note"><b>${T('season')}</b> ${esc(tr(r,'season'))}</div>`:''}
 <section><h4>${T('photos')} (${ph.length})</h4><div class="gallery">${ph.map(p=>`<button data-photo="${esc(p.src)}"><img src="${esc(p.src)}" alt="${T('photoOf',{name:esc(r.name)})}" loading="lazy">${p.example?`<span class="tag">${T('example').toUpperCase()}</span>`:''}</button>`).join('')}<label class="uploader" id="addPhoto" tabindex="0" role="button">${T('addPhoto')}</label></div></section>
 <section><h4>${T('reviews')}</h4><div class="reviews">
  <div class="rating-sum">${rv.length?`<b>${a.toLocaleString(LOC,{maximumFractionDigits:1})}</b><span class="stars" style="font-size:20px">${starStr(a)}</span><span style="color:var(--muted)">${rv.length} ${rv.length>1?T('reviewN'):T('review1')}</span>`:`<span style="color:var(--muted)">${T('noReviews')}</span>`}</div>
  <form class="revform" id="revform"><div class="starpick" id="starpick" role="radiogroup" aria-label="${T('stars')}">${[1,2,3,4,5].map(i=>`<button type="button" data-v="${i}" aria-label="${T('nStars',{n:i})}">★</button>`).join('')}</div>
   <input class="txt" id="revName" placeholder="${T('nickPh')}" maxlength="60"><textarea class="txt" id="revText" placeholder="${T('reviewPh')}" maxlength="600"></textarea>
   <label class="hp" aria-hidden="true">Website<input id="revWeb" tabindex="-1" autocomplete="off"></label>
   <div class="actions"><span class="err" id="revErr"></span><button class="btn primary" type="submit">${T('submitReview')}</button></div></form>
  ${rv.map(x=>`<div class="rev"><span class="stars">${starStr(x.stars)}</span> <span class="who">${esc(x.name||T('anon'))}</span> <span class="when">· ${new Date(x.date).toLocaleDateString(LOC,{month:'long',year:'numeric'})}${x.example?' · '+T('example'):''}</span><p>${esc(x.text)}</p>
   ${x.example?'':local.myReviews.includes(x.id)?`<button class="linkbtn" data-delrev="${esc(x.id)}">${T('deleteMyReview')}</button>`:backend.online?`<button class="linkbtn" data-report="review" data-target="${esc(x.id)}">${T('report')}</button>`:''}</div>`).join('')}
 </div></section>
 <section class="row">${isMine(r)?`<button class="btn" id="del">${ui.confirmDel===r.id?T('deleteConfirm'):T('deleteRoute')}</button>`:''}
  ${r.source!=='Beispiel'&&!isMine(r)&&backend.online?`<button class="linkbtn" data-report="route" data-target="${esc(r.id)}">${T('reportRoute')}</button>`:''}
  <a href="https://www.openstreetmap.org/?mlat=${c0[0]}&mlon=${c0[1]}#map=15/${c0[0]}/${c0[1]}" target="_blank" rel="noopener" style="color:var(--accent);font-size:13px">${T('osmStart')}</a></section>
 </div></div>`}
function bindDetail(){const r=byId(ui.sel);let stars=0;
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
 document.querySelectorAll('[data-delrev]').forEach(b=>b.onclick=async()=>{try{await backend.remove('review',b.dataset.delrev);local.myReviews=local.myReviews.filter(x=>x!==b.dataset.delrev);saveLocal();toast(T('reviewDeleted'));renderPanel()}catch(x){toast(x.message)}});
 document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>openReport(b.dataset.report,b.dataset.target));
 const del=$('#del');if(del)del.onclick=async()=>{if(ui.confirmDel!==r.id){ui.confirmDel=r.id;renderPanel();return}ui.confirmDel=null;
  try{await backend.remove('route',r.id);local.mine=local.mine.filter(x=>x!==r.id);local.favorites=local.favorites.filter(x=>x!==r.id);saveLocal();ui.sel=null;drawRoutes();renderPanel();toast(T('routeDeleted'))}catch(x){toast(x.message);renderPanel()}}}
$('#filePhoto').onchange=async e=>{const r=byId(ui.sel);if(!r)return;const files=[...e.target.files].slice(0,6);e.target.value='';let ok=0;toast(T('uploading'));
 for(const f of files){try{throttle();const blob=await shrink(f,1400,.8);const p=await backend.addPhoto(r.id,blob);local.myPhotos.push(p.id);ok++}catch(err){toast(err.message||T('imgUnreadable'));break}}
 saveLocal();if(ok){toast(ok>1?T('photosAdded',{n:ok}):T('photoAdded'));renderPanel()}};
function shrink(file,max,q){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onerror=()=>rej(new Error(T('imgUnreadable')));im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(b=>b?res(b):rej(new Error(T('imgShrinkFail'))),'image/jpeg',q)};im.src=url})}
function downloadGpx(r){const blob=new Blob([toGpx(r)],{type:'application/gpx+xml'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(r.name.replace(/[^\wäöüÄÖÜß\- ]+/g,'').trim()||'route')+'.gpx';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
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
function openSave(d){const s=stats({coords:d.coords});const surfOpts=['Waldweg','Feldweg','Wiesenpfad','Sandweg','Schotter','Asphalt','Strand','Almweg','Heidepfad'];
 const m=modal(`<h3>${T('saveRoute')}</h3><p>${d.coords.length} ${T('points')} · ${fmtKm(s.km)} km${s.hasE?` · ↑ ${fmtInt(s.up)} m`:' · '+T('noEleShort')} · ${s.loop?T('loop'):T('oneway')}</p>
 <label class="field">${T('name')}<input class="txt" id="sName" value="${esc(d.name)}" maxlength="80"></label>
 <div class="grid2"><label class="field">${T('region')}<input class="txt" id="sRegion" placeholder="${T('regionPh')}" maxlength="80"></label>
 <label class="field">${T('difficulty')}<select class="txt" id="sDiff"><option value="leicht">${diffLabel('leicht')}</option><option value="mittel" selected>${diffLabel('mittel')}</option><option value="schwer">${diffLabel('schwer')}</option></select></label></div>
 <div class="field">${T('ground')}<div class="checks">${surfOpts.map(o=>`<label><input type="checkbox" value="${o}" name="surf">${surfLabel(o)}</label>`).join('')}</div></div>
 <div class="field">${T('forRiders')}<div class="checks">${Object.keys(FEAT).map(k=>`<label><input type="checkbox" value="${k}" name="feat">${featLabel(k)}</label>`).join('')}</div></div>
 <label class="field">${T('description')}<textarea class="txt" id="sDesc" placeholder="${T('descPh')}" maxlength="800"></textarea></label>
 <label class="hp" aria-hidden="true">Website<input id="sWeb" tabindex="-1" autocomplete="off"></label>
 <p>${backend.online?T('saveNoteShared'):T('saveNoteLocal')}</p>
 <div class="err" id="sErr"></div><div class="actions"><button class="btn" data-close>${T('discard')}</button><button class="btn primary" id="sSave">${backend.online?T('publish'):T('store')}</button></div>`);
 $('#sSave',m).onclick=async e=>{if($('#sWeb',m).value){m.close();return}const sf=[...m.querySelectorAll('[name=surf]:checked')].map(x=>x.value);const surfaces={};sf.forEach(k=>surfaces[k]=Math.round(100/sf.length));
  const r={id:uuid(),name:$('#sName',m).value.trim().slice(0,80)||T('untitled'),region:$('#sRegion',m).value.trim().slice(0,80),difficulty:$('#sDiff',m).value,surfaces:sf.length?surfaces:{Unbekannt:100},features:[...m.querySelectorAll('[name=feat]:checked')].map(x=>x.value),desc:$('#sDesc',m).value.trim().slice(0,800),coords:d.coords,source:d.source,createdAt:new Date().toISOString()};
  e.target.disabled=true;try{throttle();await backend.addRoute(r);local.mine.push(r.id);saveLocal();m.close();ui.tab='mine';drawRoutes();select(r.id);toast(backend.online?T('published'):T('stored'))}catch(x){$('#sErr',m).textContent=x.message;e.target.disabled=false}}}

/* ---------- draw mode ---------- */
let draftLayer=null,draftMarkers=[];
function startDraw(){if(!map){toast(T('noMap'));return}if(ui.draft)return;ui.draft=[];ui.sel=null;renderPanel();styleRoutes();map.getContainer().classList.add('leaflet-crosshair');
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

/* ---------- start ---------- */
async function boot(){ui.loading=true;ui.loadError=null;renderPanel();
 try{await backend.load()}catch(e){ui.loadError=backend.online?T('dbDown'):String(e.message||e)}
 ui.loading=false;renderPanel();drawRoutes();fitAll()}
$('#btnImport').onclick=openImport;$('#btnDraw').onclick=startDraw;$('#btnAbout').onclick=openAbout;
/* static page text */
document.documentElement.lang=LANG;document.title=T('pageTitle');
document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=T(el.dataset.i18n));
document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.title=T(el.dataset.i18nTitle);if(el.hasAttribute('aria-label'))el.setAttribute('aria-label',el.title)});
const mode=$('#mode');mode.textContent=backend.online?T('modeShared'):T('modeLocal');mode.title=backend.online?T('modeSharedTitle'):T('modeLocalTitle');
const lb=$('#btnLang');lb.textContent=T('langSwitch');lb.title=T('langSwitchTitle');lb.onclick=()=>{try{localStorage.setItem('hoofprint.lang',LANG==='de'?'en':'de')}catch(e){}location.reload()};
try{initMap()}catch(e){console.error(e);$('#map').innerHTML=`<div class="maperr">${T('mapFail')}</div>`}
boot();
})();
