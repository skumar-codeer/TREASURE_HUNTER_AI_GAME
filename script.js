/* ===================================================================
   Treasure Hunter AI — Ultimate Edition v5.0
   Multi-Algorithm · Terrain Engine · Compare Mode · Power-Ups · Leaderboard
   =================================================================== */

// ── Cell Types ──
const CELL_EMPTY=0, CELL_AGENT=1, CELL_TREASURE=2, CELL_TRAP=3,
      CELL_OBSTACLE=4, CELL_MUD=5, CELL_ICE=6, CELL_POWERUP=7;

const ASSETS = {
  [CELL_AGENT]:   'assets/agent.png',
  [CELL_TREASURE]:'assets/treasure.png',
  [CELL_TRAP]:    'assets/trap.png',
  [CELL_OBSTACLE]:'assets/obstacle.png'
};

const TERRAIN_COST = { [CELL_EMPTY]:1, [CELL_MUD]:3, [CELL_ICE]:1, [CELL_POWERUP]:1, [CELL_AGENT]:1, [CELL_TREASURE]:1 };

const DIFFICULTY = {
  easy:    {rows:8, cols:8, traps:4,  obstacles:8,  mud:0,  ice:0, powerups:0, fog:false, lives:1, label:'EASY'},
  medium:  {rows:10,cols:10,traps:6,  obstacles:14, mud:4,  ice:3, powerups:2, fog:false, lives:1, label:'MEDIUM'},
  hard:    {rows:12,cols:12,traps:10, obstacles:20, mud:6,  ice:4, powerups:3, fog:false, lives:2, label:'HARD'},
  extreme: {rows:15,cols:15,traps:14, obstacles:30, mud:8,  ice:6, powerups:4, fog:true,  lives:3, label:'EXTREME'},
};

const ALGORITHMS = {
  astar:    { label:'A*', color:'var(--astar)',    visitClass:'visited',          pathClass:'path' },
  bfs:      { label:'BFS',color:'var(--bfs)',      visitClass:'visited-bfs',      pathClass:'path-bfs' },
  dijkstra: { label:'DIJ',color:'var(--dijkstra)', visitClass:'visited-dijkstra', pathClass:'path-dijkstra' },
  greedy:   { label:'GRD',color:'var(--greedy)',   visitClass:'visited-greedy',   pathClass:'path-greedy' },
};

// ── State ──
let grid=[], rows, cols, numTraps, numObst, numMud, numIce, numPowerups, fogEnabled;
let agentPos={r:0,c:0}, goalPos={r:0,c:0};
let moves=0, timerStart=null, timerInterval=null, elapsedSec=0;
let gameActive=false, mode=null, aiRunning=false, nodesExplored=0;
let difficulty='easy', fogRevealed=new Set(), aiTimers=[], aiSpeed=1;
let lives=1, maxLives=1, trapPositions=[], selectedAlgo='astar';
let activePowerup=null;
let iceSliding=false;

// ── DOM ──
const $=id=>document.getElementById(id);
const gridEl=$('grid'), msgEl=$('game-message');
const movesEl=$('moves-value'), timerEl=$('timer-value'), scoreEl=$('score-value'), nodesEl=$('nodes-value'), livesEl=$('lives-value');
const healthRingFg=$('hr-fg');
const splashScreen=$('splash-screen'), gameScreen=$('game-screen'), endScreen=$('end-screen');
const compareScreen=$('compare-screen');
const modeBadge=$('mode-badge'), diffBadge=$('diff-badge'), algoBadge=$('algo-badge');
const compassNeedle=$('compass-needle'), compassDist=$('compass-dist'), compassWrap=$('compass-wrap');
const btnAISolve=$('btn-ai-solve'), btnSpeed=$('btn-speed');

// ── Audio ──
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let audioCtx=null;
function ensureAudio(){if(!audioCtx)audioCtx=new AudioCtx()}
function tone(f,d,t='sine',v=.1){try{ensureAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch(e){}}
function sfxMove(){tone(480,.05,'square',.035)}
function sfxMud(){tone(180,.15,'triangle',.06)}
function sfxIce(){tone(900,.08,'sine',.04)}
function sfxTrap(){tone(130,.4,'sawtooth',.1)}
function sfxWin(){tone(523,.12);setTimeout(()=>tone(659,.12),110);setTimeout(()=>tone(784,.15,'sine',.13),220);setTimeout(()=>tone(1047,.3,'sine',.12),380);setTimeout(()=>tone(1320,.4,'sine',.09),520)}
function sfxLoseLife(){tone(240,.25,'triangle',.08)}
function sfxExplore(){tone(600,.03,'sine',.018)}
function sfxPath(){tone(800,.035,'triangle',.03)}
function sfxPowerup(){tone(800,.1);setTimeout(()=>tone(1000,.1),100);setTimeout(()=>tone(1200,.15),200)}
function sfxReveal(){tone(1100,.025,'sine',.02)}

// ── Particles (background) ──
const pCan=$('particles-canvas'), pCtx=pCan.getContext('2d');
let pts=[];
function resP(){pCan.width=innerWidth;pCan.height=innerHeight}
function initP(n){pts=[];for(let i=0;i<n;i++)pts.push({x:Math.random()*pCan.width,y:Math.random()*pCan.height,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.3+.3,a:Math.random()*.2+.03,hue:Math.random()<.6?185:Math.random()<.5?260:45})}
function drawP(){
  pCtx.clearRect(0,0,pCan.width,pCan.height);
  for(const p of pts){
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0)p.x=pCan.width;if(p.x>pCan.width)p.x=0;
    if(p.y<0)p.y=pCan.height;if(p.y>pCan.height)p.y=0;
    pCtx.beginPath();pCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
    pCtx.fillStyle=`hsla(${p.hue},100%,70%,${p.a})`;pCtx.fill();
  }
  pCtx.lineWidth=.4;
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
    if(dx*dx+dy*dy<14000){
      pCtx.strokeStyle=`hsla(${pts[i].hue},100%,70%,0.03)`;
      pCtx.beginPath();pCtx.moveTo(pts[i].x,pts[i].y);pCtx.lineTo(pts[j].x,pts[j].y);pCtx.stroke();
    }
  }
  requestAnimationFrame(drawP);
}
addEventListener('resize',resP);resP();initP(55);drawP();

// ── FX Burst (win/collect particle burst) ──
function fxBurst(el, color='#00f5ff', count=10) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  const container = $('fx-container');
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className='fx-particle';
    const angle = (i/count)*Math.PI*2, dist=40+Math.random()*40;
    p.style.cssText=`left:${cx}px;top:${cy}px;width:${4+Math.random()*4}px;height:${4+Math.random()*4}px;background:${color};--fx-dx:${Math.cos(angle)*dist}px;--fx-dy:${Math.sin(angle)*dist}px;`;
    container.appendChild(p);
    setTimeout(()=>p.remove(), 900);
  }
}

// ── Leaderboard ──
function getLB(){try{return JSON.parse(localStorage.getItem('th_lb_v2')||'[]')}catch{return[]}}
function saveLB(lb){try{localStorage.setItem('th_lb_v2',JSON.stringify(lb))}catch{}}
function addScore(score, diff, algoOrMode){
  const lb=getLB();
  lb.push({score,diff,algo:algoOrMode,date:Date.now()});
  lb.sort((a,b)=>b.score-a.score);
  lb.splice(8);
  saveLB(lb);
  return lb[0].score===score && lb.filter(x=>x.score===score).length===1;
}
function renderLB(){
  const lb=getLB(), el=$('lb-entries');
  if(!el)return;
  if(!lb.length){el.innerHTML='<span style="font-family:var(--mono);font-size:.6rem;color:var(--t3)">No scores yet. Be the first!</span>';return}
  el.innerHTML=lb.slice(0,5).map((e,i)=>`
    <div class="lb-row">
      <span class="lb-rank">${['🥇','🥈','🥉','4.','5.'][i]}</span>
      <span class="lb-name">${e.diff?.toUpperCase()||'?'} · ${e.algo||'?'}</span>
      <span class="lb-score">${e.score}</span>
    </div>`).join('');
}

// ── Splash ──
document.querySelectorAll('.diff-card').forEach(c=>{
  c.addEventListener('click',()=>{
    document.querySelectorAll('.diff-card').forEach(x=>x.classList.remove('selected'));
    c.classList.add('selected');difficulty=c.dataset.diff;
  });
});
document.querySelectorAll('.algo-card').forEach(c=>{
  c.addEventListener('click',()=>{
    document.querySelectorAll('.algo-card').forEach(x=>x.classList.remove('selected'));
    c.classList.add('selected');selectedAlgo=c.dataset.algo;
  });
});

$('splash-player').addEventListener('click',()=>launchGame('player'));
$('splash-ai').addEventListener('click',()=>launchGame('ai'));
$('splash-compare').addEventListener('click',()=>launchCompare());
renderLB();

function launchGame(m){
  ensureAudio();
  const cfg=DIFFICULTY[difficulty];
  rows=cfg.rows;cols=cfg.cols;numTraps=cfg.traps;numObst=cfg.obstacles;
  numMud=cfg.mud;numIce=cfg.ice;numPowerups=cfg.powerups;
  fogEnabled=cfg.fog;maxLives=cfg.lives;lives=maxLives;mode=m;
  aiSpeed=1;btnSpeed.classList.remove('fast');
  modeBadge.textContent=m==='player'?'PLAYER':'AI';
  modeBadge.classList.toggle('ai',m!=='player');
  diffBadge.textContent=cfg.label;
  const aInfo=ALGORITHMS[selectedAlgo];
  algoBadge.textContent=aInfo.label;
  btnAISolve.style.display=m==='ai'?'none':'';
  compassWrap.style.display=m==='player'?'':'none';
  $('h-lives-wrap').style.display=maxLives>1?'':'none';
  splashScreen.classList.add('hide-out');
  setTimeout(()=>{splashScreen.classList.add('hidden');gameScreen.classList.remove('hidden');startRound()},350);
}

// ── Grid Generation ──
function generateGrid(){
  let att=0;
  do{
    grid=[];trapPositions=[];
    for(let r=0;r<rows;r++){grid[r]=[];for(let c=0;c<cols;c++)grid[r][c]=CELL_EMPTY;}
    agentPos={r:randInt(0,rows-1),c:randInt(0,1)};
    grid[agentPos.r][agentPos.c]=CELL_AGENT;
    goalPos={r:randInt(0,rows-1),c:randInt(cols-2,cols-1)};
    grid[goalPos.r][goalPos.c]=CELL_TREASURE;
    placeRandom(CELL_OBSTACLE,numObst);
    placeRandom(CELL_TRAP,numTraps);
    placeRandom(CELL_MUD,numMud);
    placeRandom(CELL_ICE,numIce);
    placeRandom(CELL_POWERUP,numPowerups);
    att++;
  }while(!hasPath(agentPos,goalPos)&&att<300);
  if(att>=300){
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)
      if([CELL_OBSTACLE,CELL_TRAP,CELL_MUD,CELL_ICE].includes(grid[r][c]))grid[r][c]=CELL_EMPTY;
  }
  trapPositions=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(grid[r][c]===CELL_TRAP)trapPositions.push({r,c});
  fogRevealed=new Set();if(fogEnabled)revealAround(agentPos.r,agentPos.c,2);
  activePowerup=null;
  $('powerup-hud').style.display='none';
}

function placeRandom(type,n){let p=0,t=0;while(p<n&&t<n*30){const r=randInt(0,rows-1),c=randInt(0,cols-1);if(grid[r][c]===CELL_EMPTY){grid[r][c]=type;p++;}t++;}}
function hasPath(s,e){
  const v=Array.from({length:rows},()=>Array(cols).fill(false));
  const q=[s];v[s.r][s.c]=true;
  while(q.length){
    const{r,c}=q.shift();if(r===e.r&&c===e.c)return true;
    for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
      const nr=r+dr,nc=c+dc;
      if(inB(nr,nc)&&!v[nr][nc]&&grid[nr][nc]!==CELL_OBSTACLE){v[nr][nc]=true;q.push({r:nr,c:nc});}
    }
  }return false;
}

// ── Fog ──
function revealAround(r,c,rad){for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){const nr=r+dr,nc=c+dc;if(inB(nr,nc))fogRevealed.add(`${nr},${nc}`);}}
function isFog(r,c){return fogEnabled&&!fogRevealed.has(`${r},${c}`);}

// ── Rendering ──
function renderGrid(){
  gridEl.innerHTML='';
  gridEl.style.gridTemplateColumns=`repeat(${cols},var(--cell))`;
  gridEl.style.gridTemplateRows=`repeat(${rows},var(--cell))`;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const el=document.createElement('div');el.classList.add('cell');
    el.dataset.r=r;el.dataset.c=c;
    if(isFog(r,c))el.classList.add('fog');else applyType(el,r,c);
    gridEl.appendChild(el);
  }
  updateProx();
}

function applyType(el,r,c){
  const t=grid[r][c];
  if(t===CELL_AGENT)el.classList.add('agent');
  else if(t===CELL_TREASURE)el.classList.add('treasure');
  else if(t===CELL_TRAP)el.classList.add('trap');
  else if(t===CELL_OBSTACLE)el.classList.add('obstacle');
  else if(t===CELL_MUD)el.classList.add('mud');
  else if(t===CELL_ICE)el.classList.add('ice');
  else if(t===CELL_POWERUP)el.classList.add('powerup');
  if(ASSETS[t]){const img=document.createElement('img');img.src=ASSETS[t];img.alt='';img.draggable=false;el.appendChild(img);}
}

function updateCell(r,c){
  const el=gridEl.children[r*cols+c];if(!el)return;
  el.className='cell';el.innerHTML='';
  if(isFog(r,c))el.classList.add('fog');else applyType(el,r,c);
}

function refreshFog(){
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const el=gridEl.children[r*cols+c];if(!el)continue;
    if(!isFog(r,c)&&el.classList.contains('fog')){el.classList.remove('fog');applyType(el,r,c);sfxReveal();}
  }
}

function mark(r,c,cls){const el=gridEl.children[r*cols+c];if(el)el.classList.add(cls);}
function clearVis(){document.querySelectorAll('#grid .cell').forEach(c=>c.classList.remove('visited','visited-bfs','visited-dijkstra','visited-greedy','frontier','path','path-bfs','path-dijkstra','path-greedy','agent-trail','danger-flash','proximity-1','proximity-2'));}

// ── Proximity ──
function updateProx(){
  if(mode!=='player')return;
  document.querySelectorAll('#grid .cell.proximity-1,#grid .cell.proximity-2').forEach(c=>c.classList.remove('proximity-1','proximity-2'));
  for(const tp of trapPositions){
    if(isFog(tp.r,tp.c))continue;
    const d=Math.abs(tp.r-agentPos.r)+Math.abs(tp.c-agentPos.c);
    if(d===1)mark(tp.r,tp.c,'proximity-1');else if(d===2)mark(tp.r,tp.c,'proximity-2');
  }
}

// ── Compass ──
function updateCompass(){
  if(mode!=='player'||!compassNeedle)return;
  const dr=goalPos.r-agentPos.r,dc=goalPos.c-agentPos.c;
  compassNeedle.style.transform=`rotate(${Math.atan2(dc,dr)*(180/Math.PI)}deg)`;
  compassDist.textContent=`~${Math.abs(dr)+Math.abs(dc)} steps`;
}

// ── Lives / HUD ──
function updateLives(){
  livesEl.textContent='❤️'.repeat(lives)+'🖤'.repeat(maxLives-lives)||'💀';
  const pct=(lives/maxLives)*100;
  healthRingFg.style.strokeDashoffset=100-pct;
  healthRingFg.style.stroke=lives>1?'var(--green)':lives===1?'var(--orange)':'var(--red)';
}
function bumpEl(el){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}

// ── Timer ──
function startTimer(){timerStart=Date.now();elapsedSec=0;timerInterval=setInterval(()=>{elapsedSec=Math.floor((Date.now()-timerStart)/1000);timerEl.textContent=fmtT(elapsedSec);},500);}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;}
function resetTimer(){stopTimer();elapsedSec=0;timerEl.textContent='0:00';}
function fmtT(s){return`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;}

// ── Score ──
function getScore(){
  const cfg=DIFFICULTY[difficulty];
  const base=1000;
  const movePenalty=moves*5;
  const timePenalty=elapsedSec*2;
  const livesBonus=(lives/maxLives)*200;
  const diffBonus={easy:0,medium:100,hard:200,extreme:400}[difficulty]||0;
  return Math.max(0,Math.round(base-movePenalty-timePenalty+livesBonus+diffBonus));
}
function updateScore(){scoreEl.textContent=getScore();bumpEl(scoreEl);}

// ── Game Flow ──
function startRound(){
  aiTimers.forEach(id=>clearInterval(id));aiTimers=[];aiRunning=false;
  generateGrid();renderGrid();resetStats();gameActive=true;
  btnAISolve.disabled=false;
  updateCompass();updateLives();updateProx();
  if(mode==='player'){setMsg('Navigate to the treasure — watch out for orange traps! 🧭');startTimer();}
  else{setMsg(`AI (${ALGORITHMS[selectedAlgo].label}) computing optimal path… 🤖`);startTimer();setTimeout(()=>runAlgorithm(selectedAlgo),350);}
}
function resetStats(){moves=0;nodesExplored=0;movesEl.textContent='0';scoreEl.textContent='1000';nodesEl.textContent='—';resetTimer();}
function setMsg(t,cls){msgEl.textContent=t;msgEl.className='gmsg '+(cls||'');}

// ── End Game ──
function endGame(won){
  gameActive=false;stopTimer();
  aiTimers.forEach(id=>clearInterval(id));aiTimers=[];
  const el=gridEl.children[agentPos.r*cols+agentPos.c];
  if(won&&el){fxBurst(el,'#00f5ff',16);sfxWin();}
  else if(!won&&el){fxBurst(el,'#ff3355',8);}
  setTimeout(()=>showEnd(won),won?500:350);
}

function showEnd(won){
  endScreen.classList.remove('hidden');
  endScreen.querySelector('.end-card').className='end-card '+(won?'win':'lose');
  $('end-emoji').textContent=won?'🏆':'💀';
  $('end-title').textContent=won?'Treasure Found!':'Game Over';
  $('end-sub').textContent=won
    ?(mode==='ai'?`${ALGORITHMS[selectedAlgo].label} found the optimal path!`:'You navigated the grid and found the treasure!')
    :(lives<=0?'All lives lost. The traps were too dangerous.':'You stepped on a deadly trap!');
  $('end-phase-title').classList.remove('hidden');
  $('end-phase-stats').classList.add('hidden');
  $('end-phase-explain').classList.add('hidden');
  $('end-phase-actions').classList.add('hidden');

  setTimeout(()=>{
    $('end-phase-stats').classList.remove('hidden');
    const vals=$('end-stats-grid').querySelectorAll('.es-v');
    animateCount(vals[0],0,moves,700);
    vals[1].textContent=fmtT(elapsedSec);
    const sc=getScore();
    animateCount(vals[2],0,sc,700);
    vals[3].textContent=nodesExplored>0?nodesExplored:'—';
    $('es-score').classList.toggle('gold',sc>=700);
    if(won){
      const isHS=addScore(sc,difficulty,mode==='ai'?selectedAlgo:'PLAYER');
      $('new-highscore-banner').classList.toggle('hidden',!isHS);
      renderLB();
    }
  },900);
  setTimeout(()=>{$('end-phase-explain').classList.remove('hidden');$('explain-box').innerHTML=buildExplain(won);},2400);
  setTimeout(()=>{$('end-phase-actions').classList.remove('hidden');},3800);
}

function animateCount(el,from,to,dur){
  const start=performance.now();
  const step=ts=>{
    const p=Math.min((ts-start)/dur,1);
    const eased=1-(1-p)*(1-p);
    el.textContent=Math.round(from+(to-from)*eased);
    if(p<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function buildExplain(won){
  if(mode==='ai'){
    const algo=ALGORITHMS[selectedAlgo];
    const algoDesc={
      astar:`A* uses <span class="formula">f(n)=g(n)+h(n)</span> where g is path cost and h is Manhattan distance heuristic. It's both complete and optimal.`,
      bfs:`BFS explores nodes level by level — guaranteeing the shortest path in unweighted grids. It explored all ${nodesExplored} nodes methodically.`,
      dijkstra:`Dijkstra's algorithm accounts for terrain cost (mud=3×) to find the truly lowest-cost path. Best for weighted terrain like this grid.`,
      greedy:`Greedy Best-First only looks at <span class="formula">h(n)</span> — the heuristic. It's faster but may not find the optimal path — it follows its instincts!`
    };
    return`<strong>Algorithm: ${algo.label}</strong><br/>${algoDesc[selectedAlgo]}<br/><br/>
    Explored <strong>${nodesExplored} nodes</strong> · Path: <strong>${moves} steps</strong>
    ${nodesExplored>0?`<br/>Efficiency: <strong>${Math.round((moves/nodesExplored)*100)}%</strong> of explored nodes on the final path`:''}
    <br/><br/><strong>Tip:</strong> Try <em>Algorithm Race</em> to compare all 4 side-by-side!`;
  }
  if(won)return`<strong>Well played, Explorer!</strong><br/>
    Reached the treasure in <strong>${moves} moves</strong> in <strong>${fmtT(elapsedSec)}</strong>.<br/><br/>
    Final score: <strong>${getScore()}/1000+</strong><br/><br/>
    ${getScore()>=800?'🌟 <strong>Outstanding!</strong> Near-optimal run!':getScore()>=600?'👍 <strong>Great job!</strong> Try fewer moves!':'💪 You made it! Try AI mode to see the optimal path.'}
    <br/><br/><strong>Tip:</strong> Mud costs 3× for the AI — Dijkstra avoids it, A* balances it.`;
  return`<strong>What happened:</strong><br/>
    ${lives<=0?`You lost all <strong>${maxLives} lives</strong> stepping on traps.`:'You hit a deadly trap!'}
    <br/><br/><strong>Tips:</strong><br/>
    • Orange glow = trap nearby (1–2 cells)<br/>
    • Power-ups ⚡ grant temporary immunity<br/>
    • In Extreme mode, fog hides danger until revealed`;
}

function hideEnd(){endScreen.classList.add('hidden');}
function goToMenu(){
  hideEnd();gameActive=false;aiRunning=false;
  aiTimers.forEach(id=>clearInterval(id));aiTimers=[];stopTimer();
  gameScreen.classList.add('hidden');compareScreen.classList.add('hidden');
  splashScreen.classList.remove('hidden','hide-out');
  renderLB();
}

// ── Player Movement ──
function moveAgent(dr,dc){
  if(!gameActive||mode!=='player'||iceSliding)return;
  const nr=agentPos.r+dr,nc=agentPos.c+dc;
  if(!inB(nr,nc)||grid[nr][nc]===CELL_OBSTACLE)return;
  performMove(nr,nc,dr,dc);
}

function performMove(nr,nc,dr,dc){
  const oldR=agentPos.r,oldC=agentPos.c;
  const dest=grid[nr][nc];
  grid[oldR][oldC]=CELL_EMPTY;updateCell(oldR,oldC);mark(oldR,oldC,'agent-trail');
  agentPos={r:nr,c:nc};grid[nr][nc]=CELL_AGENT;
  if(fogEnabled){revealAround(nr,nc,2);refreshFog();}
  updateCell(nr,nc);
  moves++;movesEl.textContent=moves;bumpEl(movesEl);updateScore();
  updateCompass();updateProx();

  if(dest===CELL_TREASURE){endGame(true);}
  else if(dest===CELL_TRAP){
    if(activePowerup==='shield'){
      setMsg('🛡️ Shield blocked the trap!','win');
      activePowerup=null;$('powerup-hud').style.display='none';
      grid[nr][nc]=CELL_AGENT;trapPositions=trapPositions.filter(t=>!(t.r===nr&&t.c===nc));
      updateCell(nr,nc);updateProx();
    } else {
      lives--;updateLives();mark(nr,nc,'danger-flash');
      if(lives<=0){sfxTrap();grid[nr][nc]=CELL_AGENT;updateCell(nr,nc);endGame(false);}
      else{sfxLoseLife();setMsg(`💥 Trap hit! ${lives} ${lives===1?'life':'lives'} remaining`,'lose');grid[nr][nc]=CELL_AGENT;trapPositions=trapPositions.filter(t=>!(t.r===nr&&t.c===nc));updateCell(nr,nc);updateProx();}
    }
  } else if(dest===CELL_MUD){sfxMud();setMsg('🟫 Mud! Movement slowed…');grid[nr][nc]=CELL_AGENT;updateCell(nr,nc);}
  else if(dest===CELL_ICE){
    sfxIce();setMsg('❄️ Ice! Sliding…');grid[nr][nc]=CELL_AGENT;updateCell(nr,nc);
    slideOnIce(nr,nc,dr,dc);
  } else if(dest===CELL_POWERUP){
    sfxPowerup();activePowerup='shield';
    $('powerup-hud').style.display='';$('powerup-value').textContent='🛡️';
    setMsg('⚡ Power-Up! Shield activated — immune to next trap!','win');
    const el=gridEl.children[nr*cols+nc];if(el)fxBurst(el,'#ffd700',12);
    grid[nr][nc]=CELL_AGENT;updateCell(nr,nc);
  } else {sfxMove();}
}

function slideOnIce(r,c,dr,dc){
  iceSliding=true;
  const nr=r+dr,nc=c+dc;
  if(!inB(nr,nc)||grid[nr][nc]===CELL_OBSTACLE){iceSliding=false;return;}
  setTimeout(()=>{
    const dest=grid[nr][nc];
    performMove(nr,nc,dr,dc);
    if(dest===CELL_ICE){slideOnIce(nr,nc,dr,dc);}
    else{iceSliding=false;}
  },180);
}

document.addEventListener('keydown',e=>{
  if(!gameActive||mode!=='player')return;
  const m={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],w:[-1,0],W:[-1,0],s:[1,0],S:[1,0],a:[0,-1],A:[0,-1],d:[0,1],D:[0,1]};
  if(m[e.key]){e.preventDefault();moveAgent(m[e.key][0],m[e.key][1]);}
});

$('dpad-up')?.addEventListener('click',()=>moveAgent(-1,0));
$('dpad-down')?.addEventListener('click',()=>moveAgent(1,0));
$('dpad-left')?.addEventListener('click',()=>moveAgent(0,-1));
$('dpad-right')?.addEventListener('click',()=>moveAgent(0,1));

// ── Algorithm Engine ──
function heuristic(r1,c1,r2,c2){return Math.abs(r1-r2)+Math.abs(c1-c2);}

class MinHeap{
  constructor(){this.d=[]}
  push(n){this.d.push(n);this._u(this.d.length-1);}
  pop(){const t=this.d[0];const l=this.d.pop();if(this.d.length){this.d[0]=l;this._d(0);}return t;}
  get size(){return this.d.length;}
  _u(i){while(i>0){const p=(i-1)>>1;if(this.d[i].f<this.d[p].f){[this.d[i],this.d[p]]=[this.d[p],this.d[i]];i=p;}else break;}}
  _d(i){const n=this.d.length;while(true){let s=i;const l=2*i+1,r=2*i+2;if(l<n&&this.d[l].f<this.d[s].f)s=l;if(r<n&&this.d[r].f<this.d[s].f)s=r;if(s!==i){[this.d[i],this.d[s]]=[this.d[s],this.d[i]];i=s;}else break;}}
}

function runAlgorithm(algo, startP, goalP, gridSnapshot, onDone){
  // Use global state if not provided (single game mode)
  const useGlobal = !startP;
  const s = startP||agentPos, g = goalP||goalPos;
  const G = gridSnapshot||grid;
  const R = G.length, C = G[0].length;

  aiRunning=true;
  const gS=Array.from({length:R},()=>Array(C).fill(Infinity));gS[s.r][s.c]=0;
  const par=Array.from({length:R},()=>Array(C).fill(null));
  const closed=Array.from({length:R},()=>Array(C).fill(false));
  const expl=[];let fp=null;

  if(algo==='bfs'){
    // BFS — simple queue
    const q=[{r:s.r,c:s.c}];gS[s.r][s.c]=0;const v=Array.from({length:R},()=>Array(C).fill(false));v[s.r][s.c]=true;
    while(q.length){
      const{r,c}=q.shift();expl.push({r,c});
      if(r===g.r&&c===g.c){fp=recon(par,s,g);break;}
      for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
        const nr=r+dr,nc=c+dc;
        if(!inBound(nr,nc,R,C)||v[nr][nc])continue;
        if(G[nr][nc]===CELL_OBSTACLE||G[nr][nc]===CELL_TRAP)continue;
        v[nr][nc]=true;par[nr][nc]={r,c};q.push({r:nr,c:nc});
      }
    }
  } else if(algo==='dijkstra'){
    const open=new MinHeap();open.push({r:s.r,c:s.c,g:0,f:0});
    while(open.size){
      const{r,c,g:cost}=open.pop();
      if(closed[r][c])continue;closed[r][c]=true;expl.push({r,c});
      if(r===g.r&&c===g.c){fp=recon(par,s,g);break;}
      for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
        const nr=r+dr,nc=c+dc;
        if(!inBound(nr,nc,R,C)||closed[nr][nc])continue;
        if(G[nr][nc]===CELL_OBSTACLE||G[nr][nc]===CELL_TRAP)continue;
        const tc=cost+(TERRAIN_COST[G[nr][nc]]||1);
        if(tc<gS[nr][nc]){gS[nr][nc]=tc;par[nr][nc]={r,c};open.push({r:nr,c:nc,g:tc,f:tc});}
      }
    }
  } else if(algo==='greedy'){
    const open=new MinHeap();open.push({r:s.r,c:s.c,g:0,f:heuristic(s.r,s.c,g.r,g.c)});
    while(open.size){
      const{r,c,g:cost}=open.pop();
      if(closed[r][c])continue;closed[r][c]=true;expl.push({r,c});
      if(r===g.r&&c===g.c){fp=recon(par,s,g);break;}
      for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
        const nr=r+dr,nc=c+dc;
        if(!inBound(nr,nc,R,C)||closed[nr][nc])continue;
        if(G[nr][nc]===CELL_OBSTACLE||G[nr][nc]===CELL_TRAP)continue;
        if(gS[nr][nc]===Infinity){gS[nr][nc]=cost+1;par[nr][nc]={r,c};open.push({r:nr,c:nc,g:cost+1,f:heuristic(nr,nc,g.r,g.c)});}
      }
    }
  } else {
    // A* default
    const open=new MinHeap();open.push({r:s.r,c:s.c,g:0,f:heuristic(s.r,s.c,g.r,g.c)});
    while(open.size){
      const{r,c,g:cost}=open.pop();
      if(closed[r][c])continue;closed[r][c]=true;expl.push({r,c});
      if(r===g.r&&c===g.c){fp=recon(par,s,g);break;}
      for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
        const nr=r+dr,nc=c+dc;
        if(!inBound(nr,nc,R,C)||closed[nr][nc])continue;
        if(G[nr][nc]===CELL_OBSTACLE||G[nr][nc]===CELL_TRAP)continue;
        const tc=cost+(TERRAIN_COST[G[nr][nc]]||1);
        if(tc<gS[nr][nc]){gS[nr][nc]=tc;par[nr][nc]={r,c};open.push({r:nr,c:nc,g:tc,f:tc+heuristic(nr,nc,g.r,g.c)});}
      }
    }
  }

  if(onDone){onDone({expl,fp,nodes:expl.length});return;}

  // Single mode: animate on main grid
  nodesExplored=expl.length;nodesEl.textContent=nodesExplored;bumpEl(nodesEl);
  if(fogEnabled){for(let r=0;r<R;r++)for(let c=0;c<C;c++)fogRevealed.add(`${r},${c}`);refreshFog();}
  const algoInfo=ALGORITHMS[algo];
  animExpl(expl,fp,s,algoInfo.visitClass,algoInfo.pathClass);
}

function inBound(r,c,R,C){return r>=0&&r<R&&c>=0&&c<C;}
function recon(par,s,g){const p=[];let c=g;while(c&&!(c.r===s.r&&c.c===s.c)){p.push(c);c=par[c.r][c.c];}p.push(s);return p.reverse();}

function getAnimSpeed(){return Math.max(5,Math.min(60,400/Math.max(1,nodesExplored))/aiSpeed);}

function animExpl(expl,path,start,visitCls,pathCls){
  let i=0;
  const spd=getAnimSpeed();
  const tid=setInterval(()=>{
    if(i>=expl.length){clearInterval(tid);if(path){setMsg(`Path found! ${path.length-1} steps · ${nodesExplored} nodes`);animPath(path,start,pathCls);}else{setMsg('No path exists!','lose');stopTimer();aiRunning=false;}return;}
    const{r,c}=expl[i];
    if(!(r===start.r&&c===start.c)&&!(r===goalPos.r&&c===goalPos.c)){mark(r,c,visitCls);sfxExplore();}
    i++;
  },spd);aiTimers.push(tid);
}

function animPath(path,start,pathCls){
  let i=0;
  const tid=setInterval(()=>{
    if(i>=path.length){clearInterval(tid);animAgentMove(path,start);return;}
    const{r,c}=path[i];if(!(r===start.r&&c===start.c)&&!(r===goalPos.r&&c===goalPos.c)){mark(r,c,pathCls);sfxPath();}i++;
  },40/aiSpeed);aiTimers.push(tid);
}

function animAgentMove(path,start){
  let step=1;
  const tid=setInterval(()=>{
    if(step>=path.length){clearInterval(tid);moves=path.length-1;movesEl.textContent=moves;bumpEl(movesEl);updateScore();endGame(true);aiRunning=false;return;}
    const prev=path[step-1],next=path[step];
    grid[prev.r][prev.c]=CELL_EMPTY;updateCell(prev.r,prev.c);if(!(prev.r===start.r&&prev.c===start.c))mark(prev.r,prev.c,ALGORITHMS[selectedAlgo].pathClass);
    agentPos={r:next.r,c:next.c};grid[next.r][next.c]=CELL_AGENT;updateCell(next.r,next.c);sfxMove();step++;
  },80/aiSpeed);aiTimers.push(tid);
}

// ── Buttons ──
btnAISolve.addEventListener('click',()=>{
  if(aiRunning||!gameActive)return;
  mode='ai';modeBadge.textContent='AI';modeBadge.classList.add('ai');
  btnAISolve.disabled=true;compassWrap.style.display='none';
  clearVis();setMsg(`AI (${ALGORITHMS[selectedAlgo].label}) computing… 🤖`);
  if(!timerInterval)startTimer();
  runAlgorithm(selectedAlgo);
});

btnSpeed.addEventListener('click',()=>{
  aiSpeed=aiSpeed===1?3:1;
  btnSpeed.classList.toggle('fast',aiSpeed===3);
  btnSpeed.textContent=aiSpeed===3?'⏩ Fast':'⏩ Speed';
});

$('btn-restart').addEventListener('click',()=>{clearVis();lives=maxLives;startRound();});
$('btn-back')?.addEventListener('click',goToMenu);
$('btn-menu')?.addEventListener('click',goToMenu);
$('end-retry')?.addEventListener('click',()=>{hideEnd();clearVis();lives=maxLives;startRound();});
$('end-menu')?.addEventListener('click',goToMenu);

// ══════════════════════════════════════════
// COMPARE MODE
// ══════════════════════════════════════════
const ALGO_KEYS=['astar','bfs','dijkstra','greedy'];
let compareGrid=[], compareRows, compareCols;
let compareTimers=[], compareResults={};

function launchCompare(){
  ensureAudio();
  const cfg=DIFFICULTY[difficulty];
  compareRows=cfg.rows;compareCols=cfg.cols;
  diffBadge.textContent=cfg.label;
  $('compare-diff-badge').textContent=cfg.label;
  splashScreen.classList.add('hide-out');
  setTimeout(()=>{
    splashScreen.classList.add('hidden');
    compareScreen.classList.remove('hidden');
    startCompareRound();
  },350);
}

function generateCompareGrid(){
  let att=0;
  let cGrid, cAgent, cGoal;
  do{
    cGrid=[];
    for(let r=0;r<compareRows;r++){cGrid[r]=[];for(let c=0;c<compareCols;c++)cGrid[r][c]=CELL_EMPTY;}
    cAgent={r:randInt(0,compareRows-1),c:randInt(0,1)};
    cGrid[cAgent.r][cAgent.c]=CELL_AGENT;
    cGoal={r:randInt(0,compareRows-1),c:randInt(compareCols-2,compareCols-1)};
    cGrid[cGoal.r][cGoal.c]=CELL_TREASURE;
    const cfg=DIFFICULTY[difficulty];
    placeRandomIn(cGrid,compareRows,compareCols,CELL_OBSTACLE,cfg.obstacles);
    placeRandomIn(cGrid,compareRows,compareCols,CELL_TRAP,Math.floor(cfg.traps/2));
    placeRandomIn(cGrid,compareRows,compareCols,CELL_MUD,cfg.mud);
    att++;
  }while(!hasPathIn(cGrid,compareRows,compareCols,cAgent,cGoal)&&att<300);
  return{grid:cGrid,agentPos:cAgent,goalPos:cGoal};
}

function placeRandomIn(G,R,C,type,n){let p=0,t=0;while(p<n&&t<n*30){const r=randInt(0,R-1),c=randInt(0,C-1);if(G[r][c]===CELL_EMPTY){G[r][c]=type;p++;}t++;}}
function hasPathIn(G,R,C,s,e){const v=Array.from({length:R},()=>Array(C).fill(false));const q=[s];v[s.r][s.c]=true;while(q.length){const{r,c}=q.shift();if(r===e.r&&c===e.c)return true;for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<R&&nc>=0&&nc<C&&!v[nr][nc]&&G[nr][nc]!==CELL_OBSTACLE){v[nr][nc]=true;q.push({r:nr,c:nc});}}}return false;}

function startCompareRound(){
  compareTimers.forEach(id=>clearInterval(id));compareTimers=[];
  compareResults={};
  $('compare-winner').classList.add('hidden');

  const{grid:cGrid,agentPos:cAgent,goalPos:cGoal}=generateCompareGrid();
  compareGrid=cGrid;

  // Determine mini cell size
  const cw = Math.floor((window.innerWidth/4 - 80)/compareCols);
  const ch = Math.floor((Math.max(180,(window.innerHeight-200))/1) / compareRows);
  const cCell = Math.max(10, Math.min(cw, ch, 32));

  // Build 4 mini grids
  const wrap=$('compare-grids-wrap');
  wrap.innerHTML='';

  ALGO_KEYS.forEach(algo=>{
    const info=ALGORITHMS[algo];
    const container=document.createElement('div');
    container.className='compare-grid-container';
    container.dataset.algo=algo;

    container.innerHTML=`
      <div class="cg-header">
        <span class="cg-dot dot-${algo}"></span>
        <span class="cg-name">${info.label==='A*'?'A* Search':algo==='bfs'?'BFS':algo==='dijkstra'?'Dijkstra':'Greedy'}</span>
        <span class="cg-stat" id="cg-stat-${algo}">—</span>
      </div>
      <div class="cg-grid-area"><div id="cg-${algo}" class="cg-grid" style="--cg-cell:${cCell}px;grid-template-columns:repeat(${compareCols},${cCell}px);grid-template-rows:repeat(${compareRows},${cCell}px);gap:1px;"></div></div>
      <div class="cg-footer" id="cg-foot-${algo}">Computing…</div>
    `;
    wrap.appendChild(container);

    // Render mini grid
    const gEl=container.querySelector(`#cg-${algo}`);
    renderMiniGrid(gEl,cGrid,compareRows,compareCols,cAgent,cGoal,cCell);

    // Run algorithm and animate
    runAlgorithmCompare(algo,cGrid,compareRows,compareCols,cAgent,cGoal,gEl,cCell);
  });
}

function renderMiniGrid(gEl,G,R,C,agent,goal,cellSize){
  gEl.innerHTML='';
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
    const el=document.createElement('div');el.classList.add('cell');el.dataset.r=r;el.dataset.c=c;
    const t=G[r][c];
    if(t===CELL_AGENT)el.classList.add('agent');
    else if(t===CELL_TREASURE)el.classList.add('treasure');
    else if(t===CELL_TRAP)el.classList.add('trap');
    else if(t===CELL_OBSTACLE)el.classList.add('obstacle');
    else if(t===CELL_MUD)el.classList.add('mud');
    else if(t===CELL_ICE)el.classList.add('ice');
    if(ASSETS[t]){const img=document.createElement('img');img.src=ASSETS[t];img.alt='';img.draggable=false;el.appendChild(img);}
    gEl.appendChild(el);
  }
}

function markMini(gEl,R,C,r,c,cls){const el=gEl.children[r*C+c];if(el)el.classList.add(cls);}

function runAlgorithmCompare(algo,G,R,C,s,g,gEl,cellSize){
  // Clone grid for search (don't mutate original)
  const Gc=G.map(row=>[...row]);
  const gS=Array.from({length:R},()=>Array(C).fill(Infinity));gS[s.r][s.c]=0;
  const par=Array.from({length:R},()=>Array(C).fill(null));
  const closed=Array.from({length:R},()=>Array(C).fill(false));
  const expl=[];let fp=null;
  const info=ALGORITHMS[algo];

  if(algo==='bfs'){
    const q=[{r:s.r,c:s.c}];const v=Array.from({length:R},()=>Array(C).fill(false));v[s.r][s.c]=true;
    while(q.length){const{r,c}=q.shift();expl.push({r,c});if(r===g.r&&c===g.c){fp=reconLocal(par,s,g);break;}for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nr=r+dr,nc=c+dc;if(nr<0||nr>=R||nc<0||nc>=C||v[nr][nc])continue;if(Gc[nr][nc]===CELL_OBSTACLE||Gc[nr][nc]===CELL_TRAP)continue;v[nr][nc]=true;par[nr][nc]={r,c};q.push({r:nr,c:nc});}}
  } else if(algo==='dijkstra'){
    const open=new MinHeap();open.push({r:s.r,c:s.c,g:0,f:0});
    while(open.size){const{r,c,g:cost}=open.pop();if(closed[r][c])continue;closed[r][c]=true;expl.push({r,c});if(r===g.r&&c===g.c){fp=reconLocal(par,s,g);break;}for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nr=r+dr,nc=c+dc;if(nr<0||nr>=R||nc<0||nc>=C||closed[nr][nc])continue;if(Gc[nr][nc]===CELL_OBSTACLE||Gc[nr][nc]===CELL_TRAP)continue;const tc=cost+(TERRAIN_COST[Gc[nr][nc]]||1);if(tc<gS[nr][nc]){gS[nr][nc]=tc;par[nr][nc]={r,c};open.push({r:nr,c:nc,g:tc,f:tc});}}}
  } else if(algo==='greedy'){
    const open=new MinHeap();open.push({r:s.r,c:s.c,g:0,f:heuristic(s.r,s.c,g.r,g.c)});
    while(open.size){const{r,c,g:cost}=open.pop();if(closed[r][c])continue;closed[r][c]=true;expl.push({r,c});if(r===g.r&&c===g.c){fp=reconLocal(par,s,g);break;}for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nr=r+dr,nc=c+dc;if(nr<0||nr>=R||nc<0||nc>=C||closed[nr][nc])continue;if(Gc[nr][nc]===CELL_OBSTACLE||Gc[nr][nc]===CELL_TRAP)continue;if(gS[nr][nc]===Infinity){gS[nr][nc]=cost+1;par[nr][nc]={r,c};open.push({r:nr,c:nc,g:cost+1,f:heuristic(nr,nc,g.r,g.c)});}}}
  } else {
    // A*
    const open=new MinHeap();open.push({r:s.r,c:s.c,g:0,f:heuristic(s.r,s.c,g.r,g.c)});
    while(open.size){const{r,c,g:cost}=open.pop();if(closed[r][c])continue;closed[r][c]=true;expl.push({r,c});if(r===g.r&&c===g.c){fp=reconLocal(par,s,g);break;}for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nr=r+dr,nc=c+dc;if(nr<0||nr>=R||nc<0||nc>=C||closed[nr][nc])continue;if(Gc[nr][nc]===CELL_OBSTACLE||Gc[nr][nc]===CELL_TRAP)continue;const tc=cost+(TERRAIN_COST[Gc[nr][nc]]||1);if(tc<gS[nr][nc]){gS[nr][nc]=tc;par[nr][nc]={r,c};open.push({r:nr,c:nc,g:tc,f:tc+heuristic(nr,nc,g.r,g.c)});}}}
  }

  // Animate exploration
  let i=0;
  const baseSpd=Math.max(5,Math.min(50,300/Math.max(1,expl.length)));
  const tid=setInterval(()=>{
    if(i>=expl.length){
      clearInterval(tid);
      if(fp){
        animateMiniPath(gEl,fp,s,g,C,info.pathClass,algo);
        $(`#cg-stat-${algo}`).textContent=`${expl.length} nodes`;
      } else {
        $(`#cg-foot-${algo}`).textContent='❌ No path found';
        compareResults[algo]={nodes:expl.length,path:null};
        checkCompareComplete();
      }
      return;
    }
    const{r,c}=expl[i];
    if(!(r===s.r&&c===s.c)&&!(r===g.r&&c===g.c))markMini(gEl,R,C,r,c,info.visitClass);
    i++;
  },baseSpd);
  compareTimers.push(tid);
}

function animateMiniPath(gEl,path,s,g,C,pathCls,algo){
  let i=0;
  const tid=setInterval(()=>{
    if(i>=path.length){
      clearInterval(tid);
      const foot=path.length-1;
      $(`#cg-foot-${algo}`).textContent=`✓ ${foot} steps`;
      compareResults[algo]={nodes:parseInt($(`#cg-stat-${algo}`).textContent)||0,path:foot};
      gEl.closest('.compare-grid-container').classList.add('done');
      checkCompareComplete();
      return;
    }
    const{r,c}=path[i];if(!(r===s.r&&c===s.c)&&!(r===g.r&&c===g.c))markMini(gEl,compareRows,C,r,c,pathCls);
    i++;
  },35);
  compareTimers.push(tid);
}

function reconLocal(par,s,g){const p=[];let c=g;while(c&&!(c.r===s.r&&c.c===s.c)){p.push(c);c=par[c.r][c.c];}p.push(s);return p.reverse();}

function checkCompareComplete(){
  const done=Object.keys(compareResults);
  if(done.length<ALGO_KEYS.length)return;
  // All done — determine winner
  const withPath=ALGO_KEYS.filter(a=>compareResults[a]?.path!=null);
  if(!withPath.length){showCompareWinner(null);return;}
  // Winner: fewest path steps (then fewest nodes as tiebreaker)
  withPath.sort((a,b)=>{
    const ps=compareResults[a].path-compareResults[b].path;
    if(ps!==0)return ps;
    return compareResults[a].nodes-compareResults[b].nodes;
  });
  showCompareWinner(withPath[0]);
}

function showCompareWinner(algoKey){
  const winEl=$('compare-winner');
  if(!algoKey){
    winEl.innerHTML=`<div class="compare-winner-card"><div class="cw-title">No algorithm found a path!</div></div>`;
    winEl.classList.remove('hidden');return;
  }
  const info=ALGORITHMS[algoKey];
  const res=compareResults[algoKey];
  // Highlight winner container
  document.querySelectorAll('.compare-grid-container').forEach(el=>{el.classList.remove('winner-card');});
  const wc=document.querySelector(`.compare-grid-container[data-algo="${algoKey}"]`);
  if(wc){wc.classList.add('winner-card');fxBurst(wc,'#ffd700',18);}

  const stats=ALGO_KEYS.filter(a=>compareResults[a]?.path!=null).map(a=>`<div class="cw-stat"><div class="cw-stat-label">${a.toUpperCase()}</div><div class="cw-stat-val" style="color:${info.color}">${compareResults[a].path} steps · ${compareResults[a].nodes} nodes</div></div>`).join('');

  winEl.innerHTML=`<div class="compare-winner-card">
    <div class="cw-title">🏆 WINNER: ${info.label==='A*'?'A* Search':algoKey==='bfs'?'BFS':algoKey==='dijkstra'?'Dijkstra':'Greedy Best-First'}</div>
    <div class="cw-details">Shortest path with fewest steps</div>
    <div class="cw-stats">${stats}</div>
  </div>`;
  winEl.classList.remove('hidden');
  sfxWin();
}

// Compare screen buttons
$('btn-compare-back')?.addEventListener('click',()=>{compareTimers.forEach(id=>clearInterval(id));compareTimers=[];compareScreen.classList.add('hidden');goToMenu();});
$('btn-compare-menu')?.addEventListener('click',()=>{compareTimers.forEach(id=>clearInterval(id));compareTimers=[];goToMenu();});
$('btn-compare-restart')?.addEventListener('click',()=>{startCompareRound();});

// ── Helpers ──
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function inB(r,c){return r>=0&&r<rows&&c>=0&&c<cols;}
