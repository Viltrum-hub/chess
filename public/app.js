import {pieceAtlases} from './piece-atlases.js';
import {Chess} from './chess.js';
const MODULE_BASE=new URL('.',document.querySelector('script[type="module"][src*="app.js"]').src),ASSET_BASE=new URL('assets/',MODULE_BASE).href,HOSTED_CLOUD=MODULE_BASE.hostname.endsWith('.chatgpt.site');
const $=s=>document.querySelector(s),game=new Chess(),names={p:'peón',n:'caballo',b:'alfil',r:'torre',q:'reina',k:'rey'},levels=[['Principiante','Explorador','▂'],['Intermedio','Estratega','▂▄'],['Avanzado','Táctico','▂▄▆'],['Experto','Desafío máximo','▂▄▆█']],themes=[['Violeta','#bcb0d1','#514465'],['Nogal','#e8d8bd','#9a7253'],['Océano','#bed5e6','#3a617b'],['Obsidiana','#c2c3c8','#555762'],['Cyber','#739fac','#25384b'],['Sakura','#e4c8cb','#865563'],['Amatista','#a99ac2','#211732'],['Halloween','#b7a087','#29232e']];
let level=0,human='w',flipped=false,selected=null,legal=[],busy=false,worker=null,request=0,sound=true,pieceStyle='cyber',opponentStyle='amethyst',theme=7;
let cloud={mode:'loading',user:null,inventory:[],revision:0,signature:null,pending:null,saving:false,error:null},cloudTimer;
let pieceLabels=true;try{pieceLabels=localStorage.getItem('nocturne-piece-labels')!=='off';document.body.dataset.pieceLabels=String(pieceLabels)}catch{}
try{let s=JSON.parse(localStorage.getItem('nocturne')||'null');if(s){if(s.pgn)game.loadPgn(s.pgn);level=s.level??0;human=s.human||'w';flipped=human==='b';theme=s.theme??0;pieceStyle=s.pieceStyle||'halloween';opponentStyle=s.opponentStyle||'amethyst';sound=s.sound??true}}catch{}
function save(){try{localStorage.setItem(cloud.user?'nocturne:'+cloud.user.id:'nocturne',JSON.stringify(snapshot()))}catch{}queueCloudSave();}
const collections=[{id:'classic',name:'Heritage',tag:'CLÁSICA',theme:1,desc:'Cerámica marfil, oro y grafito. Clásicos con volumen.'},{id:'modern',name:'Monolith',tag:'GEOMETRÍA',theme:3,desc:'Titanio pulido. Un acabado frío de metal macizo.'},{id:'mono',name:'Type Club',tag:'CROMO',theme:0,desc:'Armadura cromada y reflejos de acero.'},{id:'cyber',name:'Neon District',tag:'CYBERPUNK',theme:4,desc:'Armaduras angulares y energía de neón.'},{id:'cosmic',name:'Orbit',tag:'CÓSMICA',theme:2,desc:'Cristal azul, platino y reflejos de otra órbita.'},{id:'samurai',name:'Shogun',tag:'BRONCE',theme:5,desc:'Armadura de bronce y energía en tonos de fuego.'},{id:'amethyst',name:'Amethyst Royale',tag:'CRISTAL · COLECCIÓN SIGNATURE',theme:6,desc:'Cristal amatista tallado y estructura de platino.',raster:true},{id:'halloween',name:'Midnight Coven',tag:'EDICIÓN EXCLUSIVA · HALLOWEEN',theme:7,desc:'Hueso, obsidiana y peones de calabaza iluminados.',raster:true}];
// The source renders share an atlas; each sprite has its own measured bounds.
// Material variants retain the same recognizable geometry within a family.
const renderSkins={classic:['titanium',''],modern:['titanium','steel'],mono:['mecha','chrome'],cyber:['mecha',''],cosmic:['prism','orbit'],samurai:['mecha','bronze'],amethyst:['prism',''],halloween:['coven','']};
let pieceSerial=0;
function piece(p,style=p.color===human?pieceStyle:opponentStyle){
 const [family,finish]=renderSkins[style]||renderSkins.cyber;
 const atlas=pieceAtlases[family],index={k:0,q:1,b:2,n:3,r:4,p:5}[p.type]+(p.color==='b'?6:0);
 const [x,y,width,height]=atlas.bounds[index],clip='sprite'+(++pieceSerial);
 return `<svg class="piece rendered-piece finish-${finish||'original'}" viewBox="${x} ${y} ${width} ${height}" aria-hidden="true"><defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><image href="${ASSET_BASE}${family}-v2.webp" width="${atlas.width}" height="${atlas.height}" clip-path="url(#${clip})"/></svg>`;
}
function render(){let history=game.history({verbose:true}),last=history.at(-1);$('#board').innerHTML='';for(let y=0;y<8;y++)for(let x=0;x<8;x++){let file=flipped?7-x:x,rank=flipped?y:7-y,sq='abcdefgh'[file]+(rank+1),p=game.get(sq),b=document.createElement('button');b.className='square'+((file+rank)%2===0?' dark':'')+(p?' occupied':'')+(selected===sq?' selected':'')+(legal.some(m=>m.to===sq)?' legal':'')+(last&&(last.from===sq||last.to===sq)?' last':'')+(p?.type==='k'&&p.color===game.turn()&&game.isCheck()?' check':'');if(p){b.dataset.piece=p.type;b.dataset.color=p.color;b.title=names[p.type].charAt(0).toUpperCase()+names[p.type].slice(1)+' · '+sq;}b.setAttribute('aria-label',sq+(p?' '+names[p.type]+' '+(p.color==='w'?'blanco':'negro'):' vacía'));b.innerHTML=(p?piece(p)+`<span class="piece-mark" aria-hidden="true">${{k:'R',q:'D',b:'A',n:'C',r:'T',p:'P'}[p.type]}</span>`:'')+(x===0?`<span class="coord">${rank+1}</span>`:'')+(y===7?`<span class="coord file">${'abcdefgh'[file]}</span>`:'');b.onclick=()=>clickSquare(sq);$('#board').append(b)}let status=game.isCheckmate()?(game.turn()===human?'Jaque mate. La IA gana.':'¡Jaque mate! Ganaste.'):game.isStalemate()?'Tablas por ahogado.':game.isThreefoldRepetition()?'Tablas por repetición.':game.isInsufficientMaterial()?'Tablas: material insuficiente.':game.isDraw()?'Tablas por la regla de 50 movimientos.':busy?'La IA está pensando…':game.turn()===human?'Tu turno'+(game.isCheck()?'. ¡Estás en jaque!':'. Elige tu jugada.'):'Turno de la IA.';$('#status').textContent=status;$('#position').textContent=game.isGameOver()?'Partida terminada':game.isCheck()?'Jaque al rey':history.length?'Partida en curso':'Posición inicial';$('#aiBadge').textContent=busy?'PENSANDO…':game.isGameOver()?'FINAL':'LISTA';$('#opponent').textContent=levels[level].slice(0,2).join(' · ');$('#youColor').textContent='· '+(human==='w'?'Blancas':'Negras');$('#undo').disabled=!history.length;$('#moves').innerHTML=history.length?Array.from({length:Math.ceil(history.length/2)},(_,i)=>`<div class="move"><span>${i+1}.</span><span>${history[i*2].san}</span><span>${history[i*2+1]?.san||'—'}</span></div>`).join(''):'<div class="empty"><b>♙</b>Una partida por escribir.<br>Tu primera jugada empieza aquí.</div>';$('#moves').scrollTop=$('#moves').scrollHeight;let v={p:1,n:3,b:3,r:5,q:9,k:0},material=game.board().flat().filter(Boolean).reduce((a,p)=>a+v[p.type]*(p.color==='w'?1:-1),0);$('#balance').style.width=Math.min(95,Math.max(5,50+material*3))+'%';$('#material').textContent=material?`${material>0?'Blancas':'Negras'} +${Math.abs(material)} en material`:'Material equilibrado';$('#moveCount').textContent=String(history.length);$('#armyColor').textContent=human==='w'?'○':'●';$('#selectedPieceInfo').textContent=selected?(names[game.get(selected).type].charAt(0).toUpperCase()+names[game.get(selected).type].slice(1)+' · '+selected+' · Elige una casilla marcada.'):'Selecciona una pieza para ver sus movimientos.';save()}
let audioContext;
function unlockAudio(){
  if(!sound)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioContext??=new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}
}
function beep(kind='move'){
  if(!sound)return;unlockAudio();const c=audioContext;if(!c||c.state!=='running')return;
  const now=c.currentTime;
  function tone(freq,start,duration,volume,type='sine',end=freq){const o=c.createOscillator(),a=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),start+duration);a.gain.setValueAtTime(.001,start);a.gain.exponentialRampToValueAtTime(volume,start+.005);a.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(a);a.connect(c.destination);o.start(start);o.stop(start+duration+.02)}
  function tap(start,heavy=false){const duration=heavy?.14:.09,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/(c.sampleRate*.017));const n=c.createBufferSource(),filter=c.createBiquadFilter(),a=c.createGain();n.buffer=buffer;filter.type='lowpass';filter.frequency.value=heavy?1600:2400;a.gain.value=heavy?.2:.12;n.connect(filter);filter.connect(a);a.connect(c.destination);n.start(start);tone(heavy?180:320,start,duration,heavy?.13:.08,'sine',heavy?65:120)}
  if(kind==='mate'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,now+i*.09,.32,.065));return}
  if(kind==='check'){tap(now);tone(659.25,now+.07,.18,.055);tone(880,now+.18,.23,.05);return}
  if(kind==='capture'){tap(now,true);tap(now+.065);return}
  if(kind==='castle'){tap(now);tap(now+.12);return}
  if(kind==='promotion'){tap(now);[523.25,659.25,1046.5].forEach((f,i)=>tone(f,now+.07+i*.09,.25,.05));return}
  tap(now);
}
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('keydown',unlockAudio);

function play(m){let move;try{move=game.move(m)}catch{return}selected=null;legal=[];beep(game.isCheckmate()?'mate':game.isCheck()?'check':move.promotion?'promotion':move.captured?'capture':/[kq]/.test(move.flags)?'castle':'move');render();think()}
function clickSquare(sq){if(cloud.mode==='loading'||busy||game.isGameOver()||game.turn()!==human)return;let options=legal.filter(m=>m.to===sq);if(selected&&options.length){if(options.some(m=>m.promotion)){promotion(selected,sq);return}play({from:selected,to:sq});return}let p=game.get(sq);selected=p?.color===human?sq:null;legal=selected?game.moves({square:selected,verbose:true}):[];render()}
function cancel(){request++;worker?.terminate();worker=null;busy=false}
function think(){if(game.isGameOver()||game.turn()===human)return;cancel();busy=true;render();let id=request;worker=new Worker(new URL('engine.js',MODULE_BASE),{type:'module'});worker.onmessage=({data})=>{if(data.id!==request)return;worker.terminate();worker=null;busy=false;if(data.move)play(data.move);else{render();show('No se pudo calcular la jugada','Vuelve a intentar con Nueva partida.')}};worker.onerror=()=>{cancel();render();show('Motor no disponible','Recarga la página para volver a iniciar el motor de ajedrez.')};worker.postMessage({id,pgn:game.pgn(),level})}
function show(title,html){$('#modalTitle').textContent=title;$('#modalContent').innerHTML=html;$('#closeModal').hidden=false;$('#modal').showModal()}
function promotion(from,to){show('Corona tu peón','<p>Elige la pieza en la que se convertirá.</p><div class="promotion">'+['q','r','b','n'].map(p=>`<button data-promote="${p}" aria-label="${names[p]}">${piece({type:p,color:human})}</button>`).join('')+'</div>');$('#closeModal').hidden=true;document.querySelectorAll('[data-promote]').forEach(b=>b.onclick=()=>{$('#modal').close();play({from,to,promotion:b.dataset.promote})})}
function controls(){ $('#levels').innerHTML=levels.map((l,i)=>`<button class="level ${level===i?'active':''}" data-level="${i}" aria-pressed="${level===i}"><span class="bars">${l[2]}</span><span><strong>${l[0]}</strong><small>${l[1]}</small></span><span class="check">${level===i?'✓':''}</span></button>`).join('');document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{level=+b.dataset.level;controls();if(busy)think();render()});$('#themes').innerHTML=themes.map((t,i)=>`<button class="swatch ${i===theme?'active':''}" style="--a:${t[1]};--b:${t[2]}" data-theme="${i}" aria-label="Tablero ${t[0]}" aria-pressed="${i===theme}"></button>`).join('');document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{theme=+b.dataset.theme;controls();render()});document.documentElement.style.setProperty('--light',themes[theme][1]);document.documentElement.style.setProperty('--dark',themes[theme][2]);$('#equippedName').textContent=collections.find(c=>c.id===pieceStyle)?.name||'Tu colección';$('#themeName').textContent=themes[theme][0];$('#pieces').value=pieceStyle;$('#pieces').querySelectorAll('option').forEach(o=>o.disabled=cloud.mode==='ready'&&!cloud.inventory.includes(o.value));document.body.dataset.skin=pieceStyle;document.body.dataset.board=String(theme);document.querySelectorAll('[data-skin-id]').forEach(b=>b.classList.toggle('active',b.dataset.skinId===pieceStyle))}
$('#pieces').onchange=e=>{pieceStyle=e.target.value;controls();render()};$('#side').value=human;$('#new').onclick=()=>{if(game.history().length&&!game.isGameOver()){show('¿Empezar una nueva partida?','<p>La partida actual se reemplazará. Puedes cambiar tu color antes de empezar.</p><button class="primary" id="confirmNew">Empezar nueva partida ↗</button>');$('#confirmNew').onclick=()=>{$('#modal').close();newGame()}}else newGame()};function newGame(){if(cloud.mode==='loading')return;cancel();game.reset();human=$('#side').value;flipped=human==='b';selected=null;legal=[];render();think()}
$('#undo').onclick=()=>{cancel();game.undo();if(game.turn()!==human&&game.history().length)game.undo();selected=null;legal=[];render();think()};$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=()=>{sound=!sound;$('#sound span').textContent='Sonido: '+(sound?'sí':'no');$('#sound').setAttribute('aria-pressed',String(sound));save();beep()};$('#help').onclick=()=>show('Tu próxima jugada empieza aquí.','<p>Toca una pieza y después una casilla marcada para moverla. Tu objetivo es dar jaque mate al rey rival.</p><p>Incluye enroque, captura al paso y elección de pieza al coronar. Puedes deshacer tu último turno o girar el tablero.</p><p>Los cuatro niveles aumentan la profundidad de búsqueda de la IA; no representan una clasificación Elo. Cambia el estilo cuando quieras. El color elegido se aplica al empezar una nueva partida.</p><p>La partida y tus temas se guardan automáticamente en este navegador.</p>');$('#closeModal').onclick=()=>$('#modal').close();controls();render();

function skinGallery(){let current=pieceStyle;show('Tu colección. Tu identidad.',`<p class="gallery-sub">Ocho colecciones. Piezas y tablero a juego. Tu skin se aplica solo a tu ejército.</p><div class="skin-grid">${collections.map(c=>{let preview=piece({type:'n',color:human},c.id)+piece({type:'k',color:human},c.id)+piece({type:'p',color:human},c.id);return `<button class="skin-card ${c.id==='halloween'?'seasonal':''} ${current===c.id?'active':''}" data-skin-id="${c.id}" ${cloud.mode==='ready'&&!cloud.inventory.includes(c.id)?'disabled':''} style="--preview-light:${themes[c.theme][1]};--preview-dark:${themes[c.theme][2]}"><span class="skin-preview">${preview}</span><span class="skin-info"><small>${c.tag}</small><strong>${c.name}</strong><span>${c.desc}</span><b>${cloud.mode==='ready'&&!cloud.inventory.includes(c.id)?'BLOQUEADA EN TU CUENTA':current===c.id?'✓ EQUIPADA EN TU LADO':'EQUIPAR EN TU LADO ↗'}</b></span></button>`}).join('')}</div><p class="gallery-foot">${cloud.mode==='local'?'Tu skin y tu partida se guardan en este navegador. Todas las colecciones están disponibles para probar.':'Tu ejército tiene su propia skin. La colección y tu selección se guardan en tu cuenta.'}</p>`);$('#modal').classList.add('gallery');document.querySelectorAll('[data-skin-id]').forEach(b=>b.onclick=()=>{let c=collections.find(c=>c.id===b.dataset.skinId);pieceStyle=c.id;theme=c.theme;controls();render();$('#modal').close()})}
for(let id of ['openSkins','roomSkins','panelSkins','seasonSkins'])$('#'+id).onclick=skinGallery;
$('#modal').addEventListener('close',()=>$('#modal').classList.remove('gallery','piece-guide'));

$('#sound span').textContent='Sonido: '+(sound?'sí':'no');$('#sound').setAttribute('aria-pressed',String(sound));

$('#collectionStatus').onclick=accountModal;
function snapshot(){return {pgn:game.pgn(),level,human,theme,pieceStyle,opponentStyle,sound};}
function updateCloudUI(){
 const note=$('#collectionNote'),footer=$('#saveStatus');
 const label=cloud.mode==='local'?'GitHub Pages · guardado en este navegador':cloud.mode==='loading'?'Conectando tu colección…':cloud.mode==='ready'?(cloud.saving?'Guardando en tu cuenta…':'Colección sincronizada · '+cloud.inventory.length+'/8 skins'):cloud.mode==='conflict'?'Cambios en otro dispositivo · revisar':cloud.mode==='signin'?'Inicia sesión para sincronizar':'Sin conexión · guardado local';
 if(note)note.textContent=label;if(footer)footer.textContent=label;
 $('#accountLabel').textContent=cloud.user?(cloud.user.isOwner?'Mi cuenta · Creador':'Mi cuenta'):'Mi cuenta';
}
function queueCloudSave(){
 if(cloud.mode!=='ready')return;
 const json=JSON.stringify(snapshot());if(json===cloud.signature)return;
 cloud.pending=json;clearTimeout(cloudTimer);cloudTimer=setTimeout(flushCloudSave,650);updateCloudUI();
}
async function flushCloudSave(){
 if(cloud.saving||cloud.mode!=='ready'||!cloud.pending)return;
 cloud.saving=true;updateCloudUI();
 try{while(cloud.pending&&cloud.mode==='ready'){
   const json=cloud.pending;cloud.pending=null;
   const response=await fetch('/api/profile',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:JSON.parse(json),revision:cloud.revision})});
   const data=await response.json();
   if(!response.ok){cloud.pending=cloud.pending||json;cloud.mode=response.status===409?'conflict':response.status===401?'signin':'offline';throw new Error(data.error||'No se pudo guardar.');}
   cloud.revision=data.revision;cloud.signature=json;cloud.updatedAt=data.updatedAt;
 }}catch(error){cloud.error=error.message;if(cloud.mode==='ready')cloud.mode='offline';}
 finally{cloud.saving=false;updateCloudUI();}
}
async function syncAccount(){
 if(!HOSTED_CLOUD){cancel();cloud.mode='local';cloud.inventory=collections.map(c=>c.id);controls();render();updateCloudUI();think();return;}
 cancel();cloud.mode='loading';updateCloudUI();
 try{
  const response=await fetch('/api/profile',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();if(!response.ok){cloud.mode=response.status===401?'signin':'offline';throw new Error(data.error||'No se pudo abrir tu colección.');}
  cloud.user=data.user;cloud.inventory=data.inventory;cloud.revision=data.revision;cloud.updatedAt=data.updatedAt;
  let state=data.preferences;
  if(!state){try{state=JSON.parse(localStorage.getItem('nocturne:'+data.user.id)||'null')}catch{}}
  if(!state&&data.user.isOwner)state=snapshot();
  if(!state)state={pgn:'',level:0,human:'w',theme:1,pieceStyle:'classic',opponentStyle:'amethyst',sound:true};
  game.reset();if(state.pgn)game.loadPgn(state.pgn);
  level=state.level;human=state.human;theme=state.theme;pieceStyle=cloud.inventory.includes(state.pieceStyle)?state.pieceStyle:'classic';opponentStyle='amethyst';sound=state.sound;
  flipped=human==='b';selected=null;legal=[];$('#side').value=human;
  cloud.signature=data.preferences?JSON.stringify(snapshot()):null;cloud.mode='ready';cloud.error=null;
  controls();render();$('#sound span').textContent='Sonido: '+(sound?'sí':'no');$('#sound').setAttribute('aria-pressed',String(sound));
 }catch(error){cloud.error=error.message;if(cloud.mode==='loading')cloud.mode='offline';}
 finally{updateCloudUI();think();}
}
function escaped(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function accountModal(){
 if(cloud.mode==='local'){show('Tu colección en GitHub','<p>Puedes jugar contra la IA y usar las ocho colecciones, incluida Halloween, directamente aquí.</p><p>La partida, el tablero, tus piezas y el sonido se guardan en este navegador.</p><p>El inventario por cuenta y la sincronización entre dispositivos pertenecen a la versión con servidor; GitHub Pages funciona en modo local.</p><a class="primary" href="https://nocturne-chess.viltrum2026.chatgpt.site/" target="_blank" rel="noopener">Abrir versión con cuenta ↗</a>');return;}
 let body;
 if(cloud.user){
  body=`<div class="account-summary"><span class="account-avatar">♛</span><div><strong>${escaped(cloud.user.name)}</strong><small>${cloud.user.isOwner?'CUENTA CREADORA · COLECCIÓN COMPLETA':'MIEMBRO DEL CLUB'}</small></div></div><p><strong>${cloud.inventory.length} de 8 skins</strong> en tu inventario personal.</p><div class="owned-list">${collections.map(c=>`<span class="${cloud.inventory.includes(c.id)?'owned':'locked'}">${cloud.inventory.includes(c.id)?'✓':'◇'} ${escaped(c.name)}</span>`).join('')}</div><p>Se guardan tu partida, tu skin, el tablero, la dificultad y el sonido. Puedes retomarlos al entrar con esta cuenta desde otro dispositivo.</p>`;
  if(cloud.mode==='ready')body+='<p class="sync-success">● Tu colección está conectada y protegida.</p>';
  else body+=`<p role="status">${escaped(cloud.error||'Conectando…')}</p><button class="primary" id="retryCloud">${cloud.mode==='conflict'?'Cargar cambios del otro dispositivo':'Reintentar sincronización'}</button>`;
  body+='<a class="account-signout" href="/signout-with-chatgpt?return_to=%2F" target="_top">Cerrar sesión ↗</a>';
 }else{
  body='<p>Accede a tu colección personal para guardar tus skins y continuar tu partida desde cualquier dispositivo.</p>';
  if(cloud.mode==='signin')body+='<a class="primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">Entrar con mi cuenta ↗</a>';
  else body+='<p role="status">'+escaped(cloud.error||'Conectando tu cuenta…')+'</p><button class="primary" id="retryCloud">Volver a conectar</button>';
 }
 show('Mi colección personal',body);
 const retry=$('#retryCloud');if(retry)retry.onclick=()=>{$('#modal').close();if(cloud.user&&cloud.pending&&cloud.mode!=='conflict'){cloud.mode='ready';flushCloudSave()}else syncAccount()};
 const signout=$('.account-signout');if(signout)signout.onclick=()=>{clearTimeout(cloudTimer);localStorage.removeItem('nocturne');localStorage.removeItem('nocturne:'+cloud.user.id)};
}
$('#accountButton').onclick=accountModal;
window.addEventListener('online',()=>{if(cloud.user&&cloud.mode==='offline'&&cloud.pending){cloud.mode='ready';flushCloudSave()}});

syncAccount();

function panelTab(name){
  const setup=name==='setup';$('#setupPanel').hidden=!setup;$('#movesPanel').hidden=setup;
  for(const [id,active] of [['setupTab',setup],['movesTab',!setup]]){$('#'+id).classList.toggle('active',active);$('#'+id).setAttribute('aria-selected',String(active));}
  $('#navPlay').classList.toggle('active',setup);$('#navHistory').classList.toggle('active',!setup);
}
$('#setupTab').onclick=()=>panelTab('setup');$('#movesTab').onclick=()=>panelTab('moves');
$('#navPlay').onclick=()=>{panelTab('setup');$('#play').scrollIntoView({block:'start',behavior:'smooth'})};
$('#navHistory').onclick=()=>{panelTab('moves');$('#movesPanel').scrollIntoView({block:'nearest'})};
$('#backToSetup').onclick=()=>panelTab('setup');
$('#navBots').onclick=()=>{panelTab('setup');$('#levels').scrollIntoView({block:'nearest'});$('#levels button').focus()};
$('#navAppearance').onclick=()=>{panelTab('setup');$('#appearancePanel').open=true;$('#appearancePanel').scrollIntoView({block:'nearest'})};
$('#collapseNav').onclick=()=>{const compact=document.body.classList.toggle('nav-compact');$('#collapseNav').setAttribute('aria-expanded',String(!compact))};
$('#pieceLabels').setAttribute('aria-pressed',String(pieceLabels));
$('#pieceLabels').onclick=()=>{pieceLabels=!pieceLabels;document.body.dataset.pieceLabels=String(pieceLabels);$('#pieceLabels').setAttribute('aria-pressed',String(pieceLabels));try{localStorage.setItem('nocturne-piece-labels',pieceLabels?'on':'off')}catch{}};
function pieceGuide(){
 const entries=[['k','Rey','R','Cruz y corona. La pieza más alta.'],['q','Reina / Dama','D','Corona con puntas. Más alta que el alfil.'],['b','Alfil','A','Mitra con hendidura. Perfil estrecho.'],['n','Caballo','C','Cabeza de caballo. Perfil curvo.'],['r','Torre','T','Almenas. Cuerpo bajo y ancho.'],['p','Peón','P','Cabeza redonda. La pieza más pequeña.']];
 show('Reconoce tu ejército',`<p>Tu colección: <strong>${collections.find(c=>c.id===pieceStyle)?.name||'Heritage'}</strong>. Cada tipo conserva una silueta y una proporción distintas.</p><div class="piece-guide-grid">${entries.map(([type,name,letter,desc])=>`<div class="piece-guide-card">${piece({type,color:human})}<strong>${name}<b>${letter}</b></strong><small>${desc}</small></div>`).join('')}</div><p>Puedes mostrar u ocultar las iniciales con el botón <strong>Aa</strong> debajo del tablero.</p>`);
 $('#modal').classList.add('piece-guide');
}
$('#pieceGuide').onclick=pieceGuide;$('#guideShortcut').onclick=pieceGuide;
