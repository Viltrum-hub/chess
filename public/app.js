import {Chess} from './chess.js';
const MODULE_BASE=new URL('.',import.meta.url),ASSET_BASE=new URL('assets/',MODULE_BASE).href,HOSTED_CLOUD=MODULE_BASE.hostname.endsWith('.chatgpt.site');
const $=s=>document.querySelector(s),game=new Chess(),names={p:'peón',n:'caballo',b:'alfil',r:'torre',q:'dama',k:'rey'},levels=[['Principiante','Explorador','▂'],['Intermedio','Estratega','▂▄'],['Avanzado','Táctico','▂▄▆'],['Experto','Desafío máximo','▂▄▆█']],themes=[['Violeta','#bcb0d1','#514465'],['Nogal','#e8d8bd','#9a7253'],['Océano','#bed5e6','#3a617b'],['Obsidiana','#c2c3c8','#555762'],['Cyber','#739fac','#25384b'],['Sakura','#e4c8cb','#865563'],['Amatista','#a99ac2','#211732'],['Halloween','#b7a087','#29232e']];
let level=0,human='w',flipped=false,selected=null,legal=[],busy=false,worker=null,request=0,sound=true,pieceStyle='halloween',opponentStyle='amethyst',theme=7;
let cloud={mode:'loading',user:null,inventory:[],revision:0,signature:null,pending:null,saving:false,error:null},cloudTimer;
try{let s=JSON.parse(localStorage.getItem('nocturne')||'null');if(s){if(s.pgn)game.loadPgn(s.pgn);level=s.level??0;human=s.human||'w';flipped=human==='b';theme=s.theme??0;pieceStyle=s.pieceStyle||'halloween';opponentStyle=s.opponentStyle||'amethyst';sound=s.sound??true}}catch{}
function save(){try{localStorage.setItem(cloud.user?'nocturne:'+cloud.user.id:'nocturne',JSON.stringify(snapshot()))}catch{}queueCloudSave();}
const shapes={p:'<circle cx="30" cy="16" r="7"/><path d="M25 24h10l-2 13 7 9H20l7-9z"/>',r:'<path d="M17 12h7v7h5v-7h5v7h5v-7h5v15l-7 5 2 14H21l2-14-6-5z"/>',n:'<path d="M19 46l3-12 15-11-10 3-7 8-8-6 10-17 13-4-1 7c14 4 15 15 12 32z"/><circle cx="29" cy="19" r="1.6" fill="currentColor"/>',b:'<path d="M30 7c-6 6-12 11-12 17 0 5 4 8 9 8l-4 8-6 6h26l-6-6-4-8c5 0 9-3 9-8 0-6-6-11-12-17z"/><path d="M32 12l-7 12" fill="none"/>',q:'<path d="M17 20l8 8 5-14 6 14 8-8-7 22H23z"/><circle cx="15" cy="16" r="3"/><circle cx="30" cy="10" r="3"/><circle cx="46" cy="16" r="3"/><path d="M22 42h16l4 5H18z"/>',k:'<path d="M30 6v13m-6-8h12" fill="none" stroke-width="4"/><path d="M30 22c-10-9-19 1-10 10l5 7-5 7h20l-5-7 5-7c9-9 0-19-10-10z"/>'};
const geom={p:'<circle cx="30" cy="19" r="9"/><path d="M25 32h10l7 14H18z"/>',n:'<path d="M17 46V28l15-19 13 10-11 7 9 20z"/><circle cx="34" cy="18" r="2"/>',b:'<path d="M30 7l13 16-13 12-13-12zM25 36h10l8 10H17z"/>',r:'<path d="M17 10h8v8h10v-8h8v18H17zM23 30h14v16H23z"/>',q:'<path d="M15 13l10 10 5-16 5 16 10-10-7 24H22zM22 40h16l5 6H17z"/>',k:'<path d="M30 5v15m-7-8h14" fill="none" stroke-width="4"/><path d="M20 25h20l-5 12 8 9H17l8-9z"/>'};
const themedShapes={
cyber:{p:'<path d="M24 10h12l6 10-12 9-12-9zM26 30h8l8 16H18z"/><path d="M22 19h16M26 37h8" fill="none"/>',r:'<path d="M16 10h8v9h12v-9h8v21l-7 5 3 10H20l3-10-7-5z"/><path d="M23 27h14M28 32v9" fill="none"/>',n:'<path d="M16 46l5-15 16-10-10 1-8 10-7-6L25 9l14-3-2 9 9 8-4 23z"/><path d="M29 15h6M32 29l-6 11" fill="none"/>',b:'<path d="M30 6l13 15-6 11-4 5 10 9H17l10-9-4-5-6-11z"/><path d="M30 12v14M25 24l5 5 5-5" fill="none"/>',q:'<path d="M13 13l12 11 5-17 5 17 12-11-8 27H21zM21 43h18l5 5H16z"/><path d="M23 32h14" fill="none"/>',k:'<path d="M30 5v14m-7-8h14" fill="none"/><path d="M20 22h20l6 11-11 8 7 6H18l7-6-11-8z"/><path d="M25 31h10M30 26v11" fill="none"/>'},
cosmic:{p:'<circle cx="30" cy="19" r="9"/><ellipse cx="30" cy="20" rx="17" ry="4" fill="none" transform="rotate(-25 30 20)"/><path d="M26 32h8l7 14H19z"/>',r:'<path d="M20 16h20l-3 30H23z"/><ellipse cx="30" cy="15" rx="14" ry="5"/><ellipse cx="30" cy="29" rx="17" ry="4" fill="none"/><path d="M30 4v7" fill="none"/>',n:'<path d="M18 46l5-16 16-11-12 3-8 9-8-6L25 9l12-3-1 9c15 4 17 20 9 31z"/><path d="M17 36c-14-4 0-13 22-13 18 0 20 8 7 12" fill="none"/>',b:'<path d="M30 6l11 17-11 14-11-14zM25 37h10l7 9H18z"/><ellipse cx="30" cy="24" rx="20" ry="5" fill="none" transform="rotate(-25 30 24)"/>',q:'<path d="M15 21l10 8 5-13 5 13 10-8-7 21H22zM22 42h16l5 5H17z"/><circle cx="30" cy="10" r="5"/><ellipse cx="30" cy="10" rx="11" ry="3" fill="none"/>',k:'<circle cx="30" cy="17" r="10"/><path d="M30 2v6m-4-3h8M25 29h10l7 17H18z"/><ellipse cx="30" cy="19" rx="18" ry="4" fill="none"/>'},
samurai:{p:'<path d="M20 17l10-8 10 8-3 10H23zM25 30h10l6 16H19z"/><path d="M19 19h22M26 23h8M23 36h14M21 41h18" fill="none"/>',r:'<path d="M17 20h26l-5 9H22zM22 29h16v17H22zM13 17l17-9 17 9z"/><path d="M17 34h26M25 40h10" fill="none"/>',n:'<path d="M18 46l5-14 14-10-10 2-9 9-7-7 13-16 14-3-1 9c17 5 17 20 8 30z"/><path d="M23 11l-5-6m20 5 6-5M26 35h17M24 41h19" fill="none"/>',b:'<path d="M30 6l9 15-9 12-9-12zM24 34h12l8 12H16z"/><path d="M18 10l24 33M42 10L18 43" fill="none"/>',q:'<path d="M18 23l-6-15 13 11 5-13 5 13L48 8l-6 15-6 16H24zM22 41h16l7 6H15z"/><path d="M24 29h12M24 34h12" fill="none"/>',k:'<path d="M20 26l-8-18 14 11h8L48 8l-8 18-5 8 8 12H17l8-12z"/><path d="M30 8v12M24 27h12M24 39h12" fill="none"/>'}}
const collections=[{id:'classic',name:'Heritage',tag:'CLÁSICA',theme:1,desc:'Marfil, nogal y las siluetas de siempre.'},{id:'modern',name:'Monolith',tag:'GEOMETRÍA',theme:3,desc:'Líneas depuradas. Una presencia rotunda.'},{id:'mono',name:'Type Club',tag:'MINIMAL',theme:0,desc:'Cada pieza, una letra. Todo bajo control.'},{id:'cyber',name:'Neon District',tag:'CYBERPUNK',theme:4,desc:'Armaduras angulares y energía de neón.'},{id:'cosmic',name:'Orbit',tag:'CÓSMICA',theme:2,desc:'Planetas, anillos y estrategia sin límites.'},{id:'samurai',name:'Shogun',tag:'SAMURÁI',theme:5,desc:'Kabutos, pagodas y disciplina en cada jugada.'},{id:'amethyst',name:'Amethyst Royale',tag:'CRISTAL · COLECCIÓN SIGNATURE',theme:6,desc:'Cristal violeta, plata tallada y un tablero de obsidiana.',raster:true},{id:'halloween',name:'Midnight Coven',tag:'EDICIÓN EXCLUSIVA · HALLOWEEN',theme:7,desc:'Calabazas de ámbar, corceles espectrales y torres encantadas.',raster:true}];
let pieceSerial=0;
function piece(p,style=p.color===human?pieceStyle:opponentStyle){
  if(style==='amethyst'||style==='halloween'){
    const index={k:[0,0],q:[1,0],b:[2,0],n:[0,1],r:[1,1],p:[2,1]}[p.type];
    const col=index[0],row=index[1]+(p.color==='b'?2:0);
    return `<svg class="piece rendered-piece" viewBox="${col} ${row} 1 1" aria-hidden="true"><image href="${ASSET_BASE}${style==='amethyst'?'amethyst':'halloween'}-atlas.webp" width="3" height="4" preserveAspectRatio="none"/></svg>`;
  }
  const id='pc'+(++pieceSerial),white=p.color==='w';
  const materials={classic:[['#fff9e9','#e4d5b6','#a68e68'],['#6a617a','#332c40','#17131f']],modern:[['#edf3ff','#b6c4da','#74839f'],['#69788d','#2c3748','#111b2a']],mono:[['#f3eaff','#c9aedf','#806693'],['#8a729f','#3a284c','#1b1028']],cyber:[['#e0ffff','#76d4df','#287a92'],['#b58bff','#4b397c','#211b3c']],cosmic:[['#f1f8ff','#b2ccea','#5b7dba'],['#6c87c4','#2e426c','#141f3f']],samurai:[['#fff3dc','#ddbf91','#9e7650'],['#b87985','#602e42','#2a1526']]};
  const [hi,mid,low]=(materials[style]||materials.classic)[white?0:1];
  const turned={
    p:'<path d="M25 23Q23 28 27 31L25 38Q24 41 20 43Q19 46 30 47Q41 46 40 43Q36 41 35 38L33 31Q37 28 35 23Z"/><ellipse cx="30" cy="24" rx="8" ry="2.5"/><circle cx="30" cy="15" r="8.5"/>',
    r:'<path d="M21 24Q23 29 24 32L23 39Q22 41 19 43L20 46H40L41 43Q38 41 37 39L36 32Q37 29 39 24Z"/><ellipse cx="30" cy="25" rx="11" ry="3"/><path d="M18 9h7v7h5V9h6v7h6V9h4v15Q32 30 18 24Z"/><ellipse cx="30" cy="25" rx="11" ry="2" fill="none"/>',
    b:'<path d="M26 28Q27 33 24 38L20 43Q20 47 30 47Q40 47 40 43L36 38Q33 33 34 28Z"/><ellipse cx="30" cy="29" rx="9" ry="3"/><path d="M30 6C23 12 19 17 20 22Q21 29 30 29Q39 29 40 22C41 17 37 12 30 6Z"/><path d="M33 12l-6 9" fill="none" stroke="'+low+'" stroke-width="1.8"/><circle cx="30" cy="6" r="2.3"/>',
    q:'<path d="M25 28Q27 33 23 39L19 44Q19 47 30 47Q41 47 41 44L37 39Q33 33 35 28Z"/><ellipse cx="30" cy="29" rx="10" ry="3"/><path d="M17 15l9 7 4-12 5 12 9-7-7 13Q30 32 23 28Z"/><circle cx="17" cy="14" r="2.5"/><circle cx="30" cy="9" r="3"/><circle cx="44" cy="14" r="2.5"/>',
    k:'<path d="M25 28Q27 33 23 39L19 44Q19 47 30 47Q41 47 41 44L37 39Q33 33 35 28Z"/><ellipse cx="30" cy="29" rx="10" ry="3"/><path d="M30 19C18 11 15 23 24 28Q30 31 36 28C45 23 42 11 30 19Z"/><path d="M28 5h4v5h5v4h-5v5h-4v-5h-5v-4h5Z"/>',
    n:shapes.n
  };
  const body=style==='mono'?'<rect x="16" y="10" width="28" height="35" rx="6"/>':(themedShapes[style]||(style==='modern'?geom:turned))[p.type];
  const edge=white?low:'#100b1c';
  return `<svg class="piece sculpted" viewBox="0 0 66 66" aria-hidden="true"><defs><linearGradient id="${id}body" x1="0" x2="1"><stop stop-color="${low}"/><stop offset=".18" stop-color="${mid}"/><stop offset=".34" stop-color="${hi}"/><stop offset=".48" stop-color="${mid}"/><stop offset=".78" stop-color="${low}"/><stop offset="1" stop-color="${mid}"/></linearGradient><linearGradient id="${id}edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${mid}"/><stop offset="1" stop-color="${edge}"/></linearGradient><radialGradient id="${id}top" cx=".32" cy=".25" r=".8"><stop stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/></radialGradient></defs><ellipse cx="35" cy="59" rx="23" ry="4.2" fill="#05020b" opacity=".32"/><g transform="translate(2 1)"><path d="M12 49Q30 42 48 49V54Q48 59 30 59Q12 59 12 54Z" fill="url(#${id}edge)"/><ellipse cx="30" cy="49" rx="18" ry="5.4" fill="url(#${id}top)" stroke="${hi}" stroke-opacity=".25" stroke-width=".6"/><g transform="translate(2.1 2.5)" fill="${edge}" stroke="${edge}" stroke-width="1" stroke-linejoin="round">${body}</g><g fill="url(#${id}body)" stroke="${low}" stroke-width=".65" stroke-linecap="round" stroke-linejoin="round" style="color:${edge}">${body}</g><ellipse cx="30" cy="46" rx="13.5" ry="3.6" fill="url(#${id}top)"/><path d="M16.5 46v2Q30 54 43.5 48v-2" fill="url(#${id}body)"/><path d="M16 51Q28 55 42 52" fill="none" stroke="${hi}" stroke-opacity=".45" stroke-width=".7"/>${style==='mono'?`<text x="30" y="35" text-anchor="middle" font-family="Georgia" font-size="24" fill="${white?low:hi}" style="paint-order:stroke" stroke="${edge}" stroke-width=".25">${{k:'R',q:'D',r:'T',b:'A',n:'C',p:'P'}[p.type]}</text>`:''}</g></svg>`;
}
function render(){let history=game.history({verbose:true}),last=history.at(-1);$('#board').innerHTML='';for(let y=0;y<8;y++)for(let x=0;x<8;x++){let file=flipped?7-x:x,rank=flipped?y:7-y,sq='abcdefgh'[file]+(rank+1),p=game.get(sq),b=document.createElement('button');b.className='square'+((file+rank)%2===0?' dark':'')+(p?' occupied':'')+(selected===sq?' selected':'')+(legal.some(m=>m.to===sq)?' legal':'')+(last&&(last.from===sq||last.to===sq)?' last':'')+(p?.type==='k'&&p.color===game.turn()&&game.isCheck()?' check':'');b.setAttribute('aria-label',sq+(p?' '+names[p.type]+' '+(p.color==='w'?'blanco':'negro'):' vacía'));b.innerHTML=(p?piece(p):'')+(x===0?`<span class="coord">${rank+1}</span>`:'')+(y===7?`<span class="coord file">${'abcdefgh'[file]}</span>`:'');b.onclick=()=>clickSquare(sq);$('#board').append(b)}let status=game.isCheckmate()?(game.turn()===human?'Jaque mate. La IA gana.':'¡Jaque mate! Ganaste.'):game.isStalemate()?'Tablas por ahogado.':game.isThreefoldRepetition()?'Tablas por repetición.':game.isInsufficientMaterial()?'Tablas: material insuficiente.':game.isDraw()?'Tablas por la regla de 50 movimientos.':busy?'La IA está pensando…':game.turn()===human?'Tu turno'+(game.isCheck()?'. ¡Estás en jaque!':'. Elige tu jugada.'):'Turno de la IA.';$('#status').textContent=status;$('#position').textContent=game.isGameOver()?'Partida terminada':game.isCheck()?'Jaque al rey':history.length?'Partida en curso':'Posición inicial';$('#aiBadge').textContent=busy?'PENSANDO…':game.isGameOver()?'FINAL':'LISTA';$('#opponent').textContent=levels[level].slice(0,2).join(' · ');$('#youColor').textContent='· '+(human==='w'?'Blancas':'Negras');$('#undo').disabled=!history.length;$('#moves').innerHTML=history.length?Array.from({length:Math.ceil(history.length/2)},(_,i)=>`<div class="move"><span>${i+1}.</span><span>${history[i*2].san}</span><span>${history[i*2+1]?.san||'—'}</span></div>`).join(''):'<div class="empty"><b>♙</b>Una partida por escribir.<br>Tu primera jugada empieza aquí.</div>';$('#moves').scrollTop=$('#moves').scrollHeight;let v={p:1,n:3,b:3,r:5,q:9,k:0},material=game.board().flat().filter(Boolean).reduce((a,p)=>a+v[p.type]*(p.color==='w'?1:-1),0);$('#balance').style.width=Math.min(95,Math.max(5,50+material*3))+'%';$('#material').textContent=material?`${material>0?'Blancas':'Negras'} +${Math.abs(material)} en material`:'Material equilibrado';save()}
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
function controls(){ $('#levels').innerHTML=levels.map((l,i)=>`<button class="level ${level===i?'active':''}" data-level="${i}" aria-pressed="${level===i}"><span class="bars">${l[2]}</span><span><strong>${l[0]}</strong><small>${l[1]}</small></span><span class="check">${level===i?'✓':''}</span></button>`).join('');document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{level=+b.dataset.level;controls();if(busy)think();render()});$('#themes').innerHTML=themes.map((t,i)=>`<button class="swatch ${i===theme?'active':''}" style="--a:${t[1]};--b:${t[2]}" data-theme="${i}" aria-label="Tablero ${t[0]}" aria-pressed="${i===theme}"></button>`).join('');document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{theme=+b.dataset.theme;controls();render()});document.documentElement.style.setProperty('--light',themes[theme][1]);document.documentElement.style.setProperty('--dark',themes[theme][2]);$('#themeName').textContent=themes[theme][0];$('#pieces').value=pieceStyle;$('#pieces').querySelectorAll('option').forEach(o=>o.disabled=cloud.mode==='ready'&&!cloud.inventory.includes(o.value));document.body.dataset.skin=pieceStyle;document.body.dataset.board=String(theme);document.querySelectorAll('[data-skin-id]').forEach(b=>b.classList.toggle('active',b.dataset.skinId===pieceStyle))}
$('#pieces').onchange=e=>{pieceStyle=e.target.value;controls();render()};$('#side').value=human;$('#new').onclick=()=>{if(game.history().length&&!game.isGameOver()){show('¿Empezar una nueva partida?','<p>La partida actual se reemplazará. Puedes cambiar tu color antes de empezar.</p><button class="primary" id="confirmNew">Empezar nueva partida ↗</button>');$('#confirmNew').onclick=()=>{$('#modal').close();newGame()}}else newGame()};function newGame(){if(cloud.mode==='loading')return;cancel();game.reset();human=$('#side').value;flipped=human==='b';selected=null;legal=[];render();think()}
$('#undo').onclick=()=>{cancel();game.undo();if(game.turn()!==human&&game.history().length)game.undo();selected=null;legal=[];render();think()};$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=()=>{sound=!sound;$('#sound span').textContent='Sonido: '+(sound?'sí':'no');$('#sound').setAttribute('aria-pressed',String(sound));save();beep()};$('#help').onclick=()=>show('Tu próxima jugada empieza aquí.','<p>Toca una pieza y después una casilla marcada para moverla. Tu objetivo es dar jaque mate al rey rival.</p><p>Incluye enroque, captura al paso y elección de pieza al coronar. Puedes deshacer tu último turno o girar el tablero.</p><p>Los cuatro niveles aumentan la profundidad de búsqueda de la IA; no representan una clasificación Elo. Cambia el estilo cuando quieras. El color elegido se aplica al empezar una nueva partida.</p><p>La partida y tus temas se guardan automáticamente en este navegador.</p>');$('#closeModal').onclick=()=>$('#modal').close();controls();render();

function skinGallery(){let current=pieceStyle;show('Tu colección. Tu identidad.',`<p class="gallery-sub">Ocho colecciones. Piezas y tablero a juego. Tu skin se aplica solo a tu ejército.</p><div class="skin-grid">${collections.map(c=>{let preview=piece({type:'n',color:human},c.id)+piece({type:'k',color:human},c.id)+piece({type:'p',color:human},c.id);return `<button class="skin-card ${c.id==='halloween'?'seasonal':''} ${current===c.id?'active':''}" data-skin-id="${c.id}" ${cloud.mode==='ready'&&!cloud.inventory.includes(c.id)?'disabled':''} style="--preview-light:${themes[c.theme][1]};--preview-dark:${themes[c.theme][2]}"><span class="skin-preview">${preview}</span><span class="skin-info"><small>${c.tag}</small><strong>${c.name}</strong><span>${c.desc}</span><b>${cloud.mode==='ready'&&!cloud.inventory.includes(c.id)?'BLOQUEADA EN TU CUENTA':current===c.id?'✓ EQUIPADA EN TU LADO':'EQUIPAR EN TU LADO ↗'}</b></span></button>`}).join('')}</div><p class="gallery-foot">${cloud.mode==='local'?'Tu skin y tu partida se guardan en este navegador. Todas las colecciones están disponibles para probar.':'Tu ejército tiene su propia skin. La colección y tu selección se guardan en tu cuenta.'}</p>`);$('#modal').classList.add('gallery');document.querySelectorAll('[data-skin-id]').forEach(b=>b.onclick=()=>{let c=collections.find(c=>c.id===b.dataset.skinId);pieceStyle=c.id;theme=c.theme;controls();render();$('#modal').close()})}
for(let id of ['openSkins','heroSkins','roomSkins','panelSkins','seasonSkins'])$('#'+id).onclick=skinGallery;
$('#modal').addEventListener('close',()=>$('#modal').classList.remove('gallery'));

$('#sound span').textContent='Sonido: '+(sound?'sí':'no');$('#sound').setAttribute('aria-pressed',String(sound));

$('#collectionStatus').onclick=accountModal;
function snapshot(){return {pgn:game.pgn(),level,human,theme,pieceStyle,opponentStyle,sound};}
function updateCloudUI(){
 const note=$('#collectionStatus'),footer=$('#saveStatus');
 const label=cloud.mode==='local'?'GitHub Pages · guardado en este navegador':cloud.mode==='loading'?'Conectando tu colección…':cloud.mode==='ready'?(cloud.saving?'Guardando en tu cuenta…':'Colección sincronizada · '+cloud.inventory.length+'/8 skins'):cloud.mode==='conflict'?'Cambios en otro dispositivo · revisar':cloud.mode==='signin'?'Inicia sesión para sincronizar':'Sin conexión · guardado local';
 if(note)note.textContent=label+' ↗';if(footer)footer.textContent=label;
 $('#accountButton').textContent=cloud.user?(cloud.user.isOwner?'Mi cuenta · Creador':'Mi cuenta'):'Mi cuenta';
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
