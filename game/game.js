'use strict';
/* ================================================================
   CLASH BLADE — wave-survival action game
   Original code-drawn characters inspired by barbaric fantasy style.
   ================================================================ */

/* ---------------- SAVE / PROGRESSION ---------------- */
const SAVE_KEY = 'clashblade_v1';
const defUp = () => ({ damage:0, atkSpeed:0, moveSpeed:0, dash:0, special:0 });
let save = null;
try { save = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch(e){}
if (!save || !save.upHero) save = { gold:250, upHero:defUp(), upTroop:defUp(), best:0 };
const persist = () => { try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(e){} };

/* ---------------- ASSET PRELOADER (game_assets/) ---------------- */
const ASSET_PATH = 'game_assets/';
const ASSET_FILES = {
  bg:          'game_background_tz01.png',
  rockCluster: 'rock_cluster_01.png',
  woodPlank:   'wood_plank_01.png',
  treeBushy:   'tree_bushy_3lobe_01.png',
  rockSingle:  'rock_single_01.png',
  treeRound:   'tree_round_01.png',
  treeStump:   'tree_stump_log_01.png',
};
const ASSETS = {};
let assetsReady = false, assetsTotal = 0, assetsLoaded = 0;
function preloadAssets(){
  const keys = Object.keys(ASSET_FILES);
  assetsTotal = keys.length; assetsLoaded = 0; assetsReady = false;
  keys.forEach(key => {
    const img = new Image();
    img.onload = img.onerror = () => { assetsLoaded++; if (assetsLoaded >= assetsTotal) assetsReady = true; };
    img.src = ASSET_PATH + ASSET_FILES[key];
    ASSETS[key] = img;
  });
}
preloadAssets();

const UPGRADES = [
  { key:'damage',   name:'Damage',        icon:'⚔️', bg:'#c93a1a', base:60,  desc:'+12% damage per level' },
  { key:'atkSpeed', name:'Attack Speed',  icon:'⚡', bg:'#e0a020', base:60,  desc:'+10% attack rate per level' },
  { key:'moveSpeed',name:'Movement Speed',icon:'👢', bg:'#2fae4f', base:50,  desc:'+6% run speed per level' },
  { key:'dash',     name:'Dash Power',    icon:'💨', bg:'#2a8ac9', base:50,  desc:'+dash distance, −cooldown' },
  { key:'special',  name:'Special Skill', icon:'✨', bg:'#8a2ac9', base:80,  desc:'Stronger ability, −cooldown' },
];
const MAX_LVL = 10;
const upCost = (u, lvl) => Math.floor(u.base * Math.pow(1.45, lvl));

/* ---------------- CHARACTER ROSTER ---------------- */
const CHARS = {
  heroes: [
    { id:'bk', name:'Barbarian King', weapon:'sword', type:'melee', hp:560, dmg:44, range:80, atkCd:0.75, speed:172,
      colors:{ skin:'#c9884e', hair:'#2e1b0e', top:'#8a5a2b', armor:'#f3b32b', pants:'#5b3a1e', cape:'#8e1f1f', crown:true },
      ability:{ name:'Iron Fist', icon:'👊', desc:'Ground smash — huge AoE damage + rage speed burst.' } },
    { id:'aq', name:'Archer Queen', weapon:'bow', type:'ranged', hp:380, dmg:34, range:340, atkCd:0.6, speed:190,
      colors:{ skin:'#e8b98a', hair:'#9b51e0', top:'#2f7d4f', armor:'#f3b32b', pants:'#1f5c3a', cape:'#245c3f', ponytail:true },
      ability:{ name:'Royal Cloak', icon:'🏹', desc:'Turn invisible and unleash a rapid arrow volley.' } },
    { id:'gw', name:'Grand Warden', weapon:'staff', type:'ranged', hp:340, dmg:30, range:330, atkCd:0.8, speed:160,
      colors:{ skin:'#e8c39a', hair:'#e8e2d0', top:'#3f63c9', armor:'#f3b32b', pants:'#2c4593', cape:'#2c4593', hood:true },
      ability:{ name:'Eternal Tome', icon:'📖', desc:'Invulnerable aura + instantly heals 30% HP.' } },
    { id:'rc', name:'Royal Champion', weapon:'spear', type:'ranged', hp:430, dmg:40, range:310, atkCd:0.7, speed:185,
      colors:{ skin:'#d99a63', hair:'#7c2f1d', top:'#a32c2c', armor:'#f3b32b', pants:'#6e1f1f', cape:'#a32c2c', helmet:true },
      ability:{ name:'Seeking Spear', icon:'🔱', desc:'Signature spear that hunts enemies, pierces, and returns.' } },
  ],
  troops: [
    { id:'barb', name:'Barbarian', weapon:'sword', type:'melee', hp:430, dmg:32, range:66, atkCd:0.8, speed:180,
      colors:{ skin:'#e8b072', hair:'#f2c12e', top:'#e8b072', armor:'#8a6d2f', pants:'#7a4d21', cape:null },
      ability:{ name:'Rage', icon:'🔥', desc:'Berserk: massive attack & speed surge.' } },
    { id:'arch', name:'Archer', weapon:'bow', type:'ranged', hp:300, dmg:24, range:330, atkCd:0.55, speed:195,
      colors:{ skin:'#e8b98a', hair:'#e05aa0', top:'#2f9e5f', armor:'#c9a13c', pants:'#1f6e3f', cape:null, ponytail:true },
      ability:{ name:'Triple Shot', icon:'🎯', desc:'Every shot fires 3 arrows for a short time.' } },
    { id:'wiz', name:'Wizard', weapon:'staff', type:'ranged', hp:320, dmg:38, range:300, atkCd:0.9, speed:165,
      colors:{ skin:'#e8c39a', hair:'#3a2412', top:'#4a3ac9', armor:'#f3b32b', pants:'#2c2093', cape:'#3a2cb0', hood:true },
      ability:{ name:'Fire Nova', icon:'☄️', desc:'Blast a ring of fireballs in every direction.' } },
  ],
};

const ENEMY_TYPES = [
  { id:'ebarb', type:'melee', weapon:'sword', hp:62, dmg:10, speed:96, range:56, atkCd:1.1, gold:6,
    colors:{ skin:'#e8b072', hair:'#f2c12e', top:'#e8b072', armor:'#6a4d1f', pants:'#6a4020', cape:null } },
  { id:'earch', type:'ranged', weapon:'bow', hp:44, dmg:8, speed:86, range:260, atkCd:1.7, gold:8,
    colors:{ skin:'#d8a878', hair:'#c9407a', top:'#7a2c8e', armor:'#8a6d2f', pants:'#5a1f6e', cape:null, ponytail:true } },
];

/* ---------------- DOM ---------------- */
const $ = id => document.getElementById(id);
const screens = { menu:$('menuScreen'), up:$('upgradeScreen'), game:$('gameScreen'), over:$('overScreen') };
function showScreen(name){ for (const k in screens) screens[k].classList.toggle('hidden', k!==name); }

/* ---------------- AUDIO (procedural music + sfx) ---------------- */
const AC = window.AudioContext || window.webkitAudioContext;
let ac = null, musicOn = true, musicTimer = null, mStep = 0;
function initAudio(){ if (!ac){ ac = new AC(); } if (ac.state==='suspended') ac.resume(); startMusic(); }
function tone(freq, dur, type, vol, when=0, slide=0){
  if (!ac) return;
  const t = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), t+dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t+dur+0.05);
}
function noiseHit(dur, vol, when=0){
  if (!ac) return;
  const t = ac.currentTime + when, len = Math.floor(ac.sampleRate*dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i=0;i<len;i++) d[i] = (Math.random()*2-1)*(1-i/len);
  const s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = buf; g.gain.value = vol; s.connect(g).connect(ac.destination); s.start(t);
}
// Adventurous folk loop in A-minor pentatonic
const MEL = [0,null,2,3, 4,null,3,2, 0,null,2,4, 5,4,3,2, 0,null,2,3, 4,5,4,3, 2,null,3,2, 0,null,null,null];
const SCALE = [220, 261.6, 293.7, 329.6, 392, 440];
const BASS  = [110, 110, 87.3, 98];
function startMusic(){
  if (musicTimer || !musicOn) return;
  mStep = 0;
  musicTimer = setInterval(()=>{
    if (!ac || !musicOn) return;
    const s = mStep % 32;
    if (s % 8 === 0) tone(BASS[(mStep>>3)%4], 0.4, 'triangle', 0.10);
    if (s % 4 === 0) noiseHit(0.05, 0.05);
    const n = MEL[s];
    if (n !== null){ tone(SCALE[n], 0.22, 'square', 0.045); tone(SCALE[n]*2, 0.22, 'sine', 0.03); }
    mStep++;
  }, 170);
}
function stopMusic(){ clearInterval(musicTimer); musicTimer = null; }
const sfx = {
  hit:   () => { noiseHit(0.08,0.12); tone(160,0.08,'square',0.08,0,-60); },
  shoot: () => tone(700,0.09,'triangle',0.07,0,-300),
  dash:  () => tone(300,0.15,'sawtooth',0.06,0,300),
  coin:  () => { tone(880,0.07,'square',0.06); tone(1320,0.1,'square',0.05,0.06); },
  shield:() => tone(440,0.25,'sine',0.08,0,120),
  power: () => { tone(220,0.3,'sawtooth',0.09,0,220); tone(440,0.3,'sine',0.06,0.1,220); },
  hurt:  () => { tone(120,0.2,'square',0.1,0,-60); noiseHit(0.12,0.1); },
  boss:  () => { tone(80,0.8,'sawtooth',0.14,0,-30); tone(60,1.0,'square',0.1,0.2,-20); },
  wave:  () => { tone(523,0.15,'square',0.07); tone(659,0.15,'square',0.07,0.12); tone(784,0.3,'square',0.08,0.24); },
  die:   () => { tone(300,0.5,'sawtooth',0.12,0,-250); noiseHit(0.4,0.12,0.1); },
};

/* ---------------- CHARACTER RENDERING ----------------
   "Supercell-style" renderer: bold outline strokes, gradient-shaded
   capsule limbs, a breathing torso, blinking/reactive face and glowing
   swing trails on the weapon — technique ported from the CoC-style
   arena build, driven by the same walkT / atkT / facing values the
   game already produces. Anatomy coordinates (head/torso/limb spans)
   are kept identical so silhouette height & proportions don't change;
   every per-character color still comes straight from def.colors, so
   dress code / palette is untouched. ---------------- */
const OUTLINE = 'rgba(18,12,8,0.55)';
function shade(hex, amt){
  const n = parseInt(hex.slice(1),16);
  let r=(n>>16)+amt, gg=((n>>8)&0xff)+amt, b=(n&0xff)+amt;
  r=Math.max(0,Math.min(255,r)); gg=Math.max(0,Math.min(255,gg)); b=Math.max(0,Math.min(255,b));
  return 'rgb('+r+','+gg+','+b+')';
}
function drawChar(g, def, x, y, s, facing, walkT, atkT, opts={}){
  const c = def.colors, a = opts.alpha ?? 1;
  const flash = !!opts.flash;
  const hurt = opts.hurt || 0;
  const dir = opts.swingDir || 1;
  const T = performance.now()/1000;
  const seed = x*0.013 + y*0.017;
  g.save(); g.translate(x, y); g.globalAlpha = a;

  // ground shadow
  g.fillStyle = 'rgba(0,0,0,0.27)';
  g.beginPath(); g.ellipse(0, 4*s, 16*s, 6*s, 0, 0, Math.PI*2); g.fill();

  g.scale(facing, 1);
  const bob = Math.sin(walkT*10)*1.6*s;
  const leg = Math.sin(walkT*10)*5*s;

  // legs: gradient capsule strokes (same hip/foot span as before) + boots
  const legDark = flash ? '#ffffff' : shade(c.pants,-22);
  const legLit  = flash ? '#ffffff' : shade(c.pants, 10);
  [[-4*s, -12*s+leg*0.4, legDark], [4*s, -12*s-leg*0.4, legLit]].forEach(([lx,ly,col])=>{
    g.strokeStyle = OUTLINE; g.lineWidth = Math.max(4.6, 6.6*s); g.lineCap='round';
    g.beginPath(); g.moveTo(lx,ly); g.lineTo(lx,0); g.stroke();
    g.strokeStyle = col; g.lineWidth = Math.max(3.6, 5.4*s); g.lineCap='round';
    g.beginPath(); g.moveTo(lx,ly); g.lineTo(lx,0); g.stroke();
    g.fillStyle = flash ? '#ffffff' : shade(c.pants,-42);
    g.beginPath(); g.ellipse(lx, 1.2*s, 3.6*s, 2.3*s, 0, 0, Math.PI*2); g.fill();
  });

  g.translate(0, bob);

  // cape (crown-bearers) — gentle flutter
  if (c.cape){
    const flutter = Math.sin(T*5 + seed*3) * 1.4*s;
    g.fillStyle = flash ? '#ffffff' : shade(c.cape,-10);
    g.beginPath();
    g.moveTo(-8*s,-30*s); g.quadraticCurveTo(-20*s+flutter,-14*s,-13*s,-2*s);
    g.lineTo(-5*s,-10*s); g.closePath(); g.fill();
    if (!flash){
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.beginPath(); g.moveTo(-8*s,-28*s); g.quadraticCurveTo(-15*s,-18*s,-10.5*s,-6*s); g.lineTo(-8*s,-9*s); g.closePath(); g.fill();
    }
  }

  // torso: gradient ellipse, outline rim, subtle idle breathing
  const breathe = 1 + Math.sin(T*2.6 + seed*4) * 0.015;
  g.save(); g.translate(0,-21*s); g.scale(breathe,breathe);
  g.strokeStyle = OUTLINE; g.lineWidth = Math.max(1.6, 1.4*s);
  g.beginPath(); g.ellipse(0,0, 11*s, 12*s, 0, 0, Math.PI*2); g.stroke();
  if (flash) g.fillStyle = '#ffffff';
  else {
    const tg = g.createLinearGradient(0,-12*s,0,12*s);
    tg.addColorStop(0, shade(c.top,20)); tg.addColorStop(0.55, c.top); tg.addColorStop(1, shade(c.top,-20));
    g.fillStyle = tg;
  }
  g.beginPath(); g.ellipse(0,0, 10.5*s, 11.5*s, 0, 0, Math.PI*2); g.fill();
  if (!flash){
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.beginPath(); g.ellipse(-3.4*s,-3.2*s, 3.2*s, 4.8*s, -0.3, 0, Math.PI*2); g.fill();
  }
  g.restore();

  // armor belt
  g.fillStyle = OUTLINE; g.fillRect(-11.5*s,-14.5*s, 23*s, 4.8*s);
  if (flash) g.fillStyle = '#ffffff';
  else {
    const bg = g.createLinearGradient(0,-14*s,0,-10*s);
    bg.addColorStop(0, shade(c.armor,20)); bg.addColorStop(1, shade(c.armor,-16));
    g.fillStyle = bg;
  }
  g.fillRect(-11*s,-14*s, 22*s, 4*s);
  if (!flash){ g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(-11*s,-14*s, 22*s, 1*s); }

  // back arm
  g.strokeStyle = OUTLINE; g.lineWidth = Math.max(4.6, 6*s); g.lineCap='round';
  g.beginPath(); g.moveTo(-8*s,-26*s); g.lineTo(-12*s,-16*s); g.stroke();
  g.strokeStyle = flash ? '#ffffff' : shade(c.skin,-12); g.lineWidth = Math.max(3.4, 4.6*s); g.lineCap='round';
  g.beginPath(); g.moveTo(-8*s,-26*s); g.lineTo(-12*s,-16*s); g.stroke();

  // head
  g.strokeStyle = OUTLINE; g.lineWidth = Math.max(1.4, 1.2*s);
  g.beginPath(); g.arc(2*s,-38*s, 8.6*s, 0, Math.PI*2); g.stroke();
  if (flash) g.fillStyle = '#ffffff';
  else {
    const hg = g.createRadialGradient(-0.6*s,-40.6*s, 1*s, 2*s,-38*s, 9*s);
    hg.addColorStop(0, shade(c.skin,26)); hg.addColorStop(0.55, c.skin); hg.addColorStop(1, shade(c.skin,-16));
    g.fillStyle = hg;
  }
  g.beginPath(); g.arc(2*s,-38*s, 8.3*s, 0, Math.PI*2); g.fill();

  // hair / hat (same silhouette paths as before, gradient-shaded)
  if (c.hood){
    g.fillStyle = OUTLINE;
    g.beginPath(); g.arc(2*s,-39*s, 9.9*s, Math.PI*0.9, Math.PI*2.1); g.fill();
    g.fillRect(-8.4*s,-40.4*s, 20.8*s, 4.4*s);
    const hoodG = g.createLinearGradient(0,-48*s,0,-36*s);
    hoodG.addColorStop(0, shade(c.hair,14)); hoodG.addColorStop(1, shade(c.hair,-16));
    g.fillStyle = flash ? '#ffffff' : hoodG;
    g.beginPath(); g.arc(2*s,-39*s, 9.5*s, Math.PI*0.9, Math.PI*2.1); g.fill();
    g.fillRect(-8*s,-40*s, 20*s, 4*s);
  } else if (c.helmet){
    g.fillStyle = OUTLINE;
    g.beginPath(); g.arc(2*s,-40.4*s, 9.4*s, Math.PI, Math.PI*2); g.fill();
    const helmG = g.createLinearGradient(0,-49*s,0,-40*s);
    helmG.addColorStop(0,'#f0f4f8'); helmG.addColorStop(0.55,'#c4ccd6'); helmG.addColorStop(1, shade(c.armor,-14));
    g.fillStyle = flash ? '#ffffff' : helmG;
    g.beginPath(); g.arc(2*s,-40*s, 9*s, Math.PI, Math.PI*2); g.fill();
    g.fillStyle = flash ? '#ffffff' : '#e8e8f0'; g.fillRect(-1*s,-49*s, 3*s, 6*s);
    if (!flash){ g.fillStyle='rgba(255,255,255,0.45)'; g.beginPath(); g.arc(-2*s,-45*s,1.4*s,0,Math.PI*2); g.fill(); }
  } else {
    g.fillStyle = OUTLINE;
    g.beginPath(); g.arc(1*s,-41*s, 8.9*s, Math.PI*0.95, Math.PI*2.05); g.fill();
    const hairG = g.createLinearGradient(0,-49*s,0,-33*s);
    hairG.addColorStop(0, shade(c.hair,18)); hairG.addColorStop(1, shade(c.hair,-14));
    g.fillStyle = flash ? '#ffffff' : hairG;
    g.beginPath(); g.arc(1*s,-41*s, 8.5*s, Math.PI*0.95, Math.PI*2.05); g.fill();
    if (c.ponytail){
      const sway = Math.sin(T*4 + seed*6) * 1.4*s;
      g.strokeStyle = OUTLINE; g.lineWidth = Math.max(3.4, 4*s); g.lineCap='round';
      g.beginPath(); g.moveTo(-6*s,-42*s); g.quadraticCurveTo(-16*s,-38*s,-13*s+sway,-24*s); g.stroke();
      g.strokeStyle = flash ? '#ffffff' : shade(c.hair,-10); g.lineWidth = Math.max(2.4, 3*s); g.lineCap='round';
      g.beginPath(); g.moveTo(-6*s,-42*s); g.quadraticCurveTo(-16*s,-38*s,-13*s+sway,-24*s); g.stroke();
    }
    if (c.crown){
      g.fillStyle = OUTLINE;
      g.fillRect(-5.4*s,-48.4*s, 14.8*s, 3.9*s);
      g.fillRect(-4.4*s,-51.4*s,3.4*s,3.4*s); g.fillRect(1.6*s,-52.4*s,3.4*s,4.4*s); g.fillRect(7.6*s,-51.4*s,3.4*s,3.4*s);
      const crownG = g.createLinearGradient(0,-52*s,0,-45*s);
      crownG.addColorStop(0,'#ffec9e'); crownG.addColorStop(1,'#e8a800');
      g.fillStyle = flash ? '#ffffff' : crownG;
      g.fillRect(-5*s,-48*s, 14*s, 3.5*s);
      g.fillRect(-4*s,-51*s,3*s,3*s); g.fillRect(2*s,-52*s,3*s,4*s); g.fillRect(8*s,-51*s,3*s,3*s);
      if (!flash){ g.fillStyle='#ff3c6e'; g.beginPath(); g.arc(3.5*s,-49.6*s,1.1*s,0,Math.PI*2); g.fill(); }
    }
  }

  // blinking eye + hit/kill mouth reaction
  const blink = Math.sin(T*0.8 + seed*11) > 0.965;
  if (blink || hurt > 0.4){
    g.strokeStyle = '#1a1a1a'; g.lineWidth = Math.max(0.9, 0.6*s);
    g.beginPath(); g.moveTo(4.8*s,-38*s); g.lineTo(7.6*s,-38*s); g.stroke();
  } else {
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(6.2*s,-38*s, 1.3*s, 0, Math.PI*2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.arc(6.6*s,-38.4*s, 0.4*s, 0, Math.PI*2); g.fill();
  }
  if (hurt > 0.05){
    const mo = Math.min(1, hurt);
    g.fillStyle = '#5a1a14';
    g.beginPath(); g.ellipse(4.2*s,-34.2*s, (1.1+1*mo)*s, (0.6+1.8*mo)*s, 0, 0, Math.PI*2); g.fill();
  }

  // front arm + weapon (attack swing — big alternating arc for melee,
  // a quick recoil snap for ranged, plus a glowing motion trail)
  g.save();
  g.translate(7*s,-24*s);
  let wa;
  if (atkT > 0){
    wa = (def.type === 'melee')
      ? (-0.5 + (atkT-0.5)*2.6*dir)
      : (-0.5 + Math.sin(atkT*Math.PI)*0.55);
  } else wa = -0.5;
  if (atkT > 0.06 && atkT < 0.95 && def.type === 'melee'){
    const trailA = 1 - Math.abs(atkT-0.5)*2;
    g.strokeStyle = 'rgba(255,255,255,'+(0.55*trailA)+')'; g.lineWidth = Math.max(2, 2.6*s);
    g.beginPath(); g.arc(0,0, 11*s, wa-0.75*dir, wa, dir<0); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,'+(0.24*trailA)+')'; g.lineWidth = Math.max(4, 5*s);
    g.beginPath(); g.arc(0,0, 13.5*s, wa-0.5*dir, wa, dir<0); g.stroke();
  }
  g.rotate(wa);
  g.strokeStyle = OUTLINE; g.lineWidth = Math.max(4.6, 6*s); g.lineCap='round';
  g.beginPath(); g.moveTo(0,0); g.lineTo(7*s,5*s); g.stroke();
  const armG = g.createLinearGradient(0,0,7*s,5*s);
  armG.addColorStop(0, shade(c.skin,10)); armG.addColorStop(1, shade(c.skin,-16));
  g.strokeStyle = flash ? '#ffffff' : armG; g.lineWidth = Math.max(3.4, 4.6*s); g.lineCap='round';
  g.beginPath(); g.moveTo(0,0); g.lineTo(7*s,5*s); g.stroke();
  g.translate(7*s,5*s);
  const wrist = atkT > 0 ? Math.sin(atkT*Math.PI)*1.4*dir : 0;
  if (def.weapon === 'sword'){
    g.rotate(0.9 + wrist*0.5);
    g.fillStyle = OUTLINE;
    g.beginPath();
    g.moveTo(-3*s,0); g.lineTo(3*s,0); g.lineTo(2.4*s,-20.5*s); g.lineTo(0,-24.5*s); g.lineTo(-2.4*s,-20.5*s);
    g.closePath(); g.fill();
    const bladeG = g.createLinearGradient(-2*s,0,2*s,0);
    bladeG.addColorStop(0,'#ffffff'); bladeG.addColorStop(0.5,'#d7e0ea'); bladeG.addColorStop(1,'#767f8c');
    g.fillStyle = flash ? '#ffffff' : bladeG;
    g.beginPath();
    g.moveTo(-2.5*s,0); g.lineTo(2.5*s,0); g.lineTo(2*s,-20*s); g.lineTo(0,-24*s); g.lineTo(-2*s,-20*s);
    g.closePath(); g.fill();
    if (!flash){
      g.strokeStyle='rgba(255,255,255,0.7)'; g.lineWidth=Math.max(0.7,0.5*s);
      g.beginPath(); g.moveTo(0,-2*s); g.lineTo(0,-21*s); g.stroke();
    }
    g.fillStyle = flash ? '#ffffff' : c.armor; g.fillRect(-4.5*s,-1*s, 9*s, 2.5*s);
    g.fillStyle = flash ? '#ffffff' : shade(c.pants,-20); g.fillRect(-1.5*s,1.5*s,3*s,5*s);
  } else if (def.weapon === 'bow'){
    g.rotate(0.2);
    g.strokeStyle = OUTLINE; g.lineWidth = Math.max(3, 2.6*s);
    g.beginPath(); g.arc(0,0, 11*s, -1.2, 1.2); g.stroke();
    const bowG = g.createLinearGradient(0,-11*s,0,11*s);
    bowG.addColorStop(0,'#b4772f'); bowG.addColorStop(0.5,'#8b5a2b'); bowG.addColorStop(1,'#6e4420');
    g.strokeStyle = flash ? '#ffffff' : bowG; g.lineWidth = Math.max(2, 2*s);
    g.beginPath(); g.arc(0,0, 11*s, -1.2, 1.2); g.stroke();
    g.strokeStyle = flash ? '#ffffff' : 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(0.7, 0.9*s);
    g.beginPath();
    g.moveTo(Math.cos(-1.2)*11*s, Math.sin(-1.2)*11*s);
    g.lineTo(Math.cos(1.2)*11*s, Math.sin(1.2)*11*s);
    g.stroke();
  } else if (def.weapon === 'staff'){
    g.rotate(0.15);
    g.strokeStyle = OUTLINE; g.lineWidth = Math.max(3.4, 2.8*s);
    g.beginPath(); g.moveTo(0,8*s); g.lineTo(0,-16*s); g.stroke();
    const shaftG = g.createLinearGradient(0,8*s,0,-16*s);
    shaftG.addColorStop(0,'#5a3a1e'); shaftG.addColorStop(1,'#8a5c34');
    g.strokeStyle = flash ? '#ffffff' : shaftG; g.lineWidth = Math.max(2.4, 2*s);
    g.beginPath(); g.moveTo(0,8*s); g.lineTo(0,-16*s); g.stroke();
    const pulse = 1 + Math.sin(T*6)*0.08;
    g.fillStyle = flash ? '#ffffff' : 'rgba(90,216,255,0.35)';
    g.beginPath(); g.arc(0,-19*s, 6*s*pulse, 0, Math.PI*2); g.fill();
    const orbG = g.createRadialGradient(-1*s,-20*s,1*s, 0,-19*s,4.5*s);
    orbG.addColorStop(0,'#ffffff'); orbG.addColorStop(0.45,'#5ad8ff'); orbG.addColorStop(1,'#1c6f96');
    g.fillStyle = flash ? '#ffffff' : orbG;
    g.beginPath(); g.arc(0,-19*s, 3.6*s, 0, Math.PI*2); g.fill();
    if (!flash){ g.strokeStyle='rgba(255,255,255,0.6)'; g.lineWidth=1; g.beginPath(); g.arc(0,-19*s,3.6*s,0,Math.PI*2); g.stroke(); }
  } else if (def.weapon === 'spear'){
    g.rotate(-0.4 + wrist*0.4);
    g.strokeStyle = OUTLINE; g.lineWidth = Math.max(3.2, 2.6*s);
    g.beginPath(); g.moveTo(0,10*s); g.lineTo(0,-18*s); g.stroke();
    const shaftG = g.createLinearGradient(0,10*s,0,-18*s);
    shaftG.addColorStop(0,'#6e561f'); shaftG.addColorStop(1,'#8a6d2f');
    g.strokeStyle = flash ? '#ffffff' : shaftG; g.lineWidth = Math.max(2.2, 2*s);
    g.beginPath(); g.moveTo(0,10*s); g.lineTo(0,-18*s); g.stroke();
    g.fillStyle = OUTLINE;
    g.beginPath(); g.moveTo(0,-27*s); g.lineTo(4*s,-17*s); g.lineTo(-4*s,-17*s); g.closePath(); g.fill();
    const tipG = g.createLinearGradient(-3.5*s,-17*s,3.5*s,-17*s);
    tipG.addColorStop(0,'#c9930f'); tipG.addColorStop(0.5,'#ffd54a'); tipG.addColorStop(1,'#fff3c9');
    g.fillStyle = flash ? '#ffffff' : tipG;
    g.beginPath(); g.moveTo(0,-26*s); g.lineTo(3.5*s,-17*s); g.lineTo(-3.5*s,-17*s); g.closePath(); g.fill();
  }
  g.restore();

  // hit-flash white pulse overlay
  if (hurt > 0){
    g.globalAlpha = Math.min(0.6, hurt) * a;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(0,-20*s, 15*s, 0, Math.PI*2); g.fill();
    g.globalAlpha = a;
  }

  g.restore();
}

/* ---------------- WORLD / ARENA ---------------- */
const WORLD = { w: 2400, h: 1800 };
let decor = [];
// Each obstacle type maps to a preloaded game_assets/ image, with a base
// draw size (w,h) at scale 1 and a matching collision radius.
const OBSTACLE_DEFS = {
  rockCluster: { key:'rockCluster', w:75, h:75, cr:20 },
  woodPlank:   { key:'woodPlank',   w:75, h:75, cr:20 },
  treeBushy:   { key:'treeBushy',   w:140, h:140, cr:20 },
  rockSingle:  { key:'rockSingle',  w:140, h:140, cr:20 },
  treeRound:   { key:'treeRound',   w:140, h:140, cr:20 },
  treeStump:   { key:'treeStump',   w:75, h:75, cr:15 },
};
// Small stones and fallen logs/planks are flat ground details: they render
// beneath the player/troops/enemies (never occlude them) and have no
// movement-blocking collision, so entities walk smoothly over them.
const GROUND_DECOR = new Set(['rockCluster', 'woodPlank']);
// Spawn weight per obstacle type — trees drop at a higher rate than stones.
// Overall weights raised for a denser, richer environment; the tree > stone
// ratio established earlier is kept intact.
const OBSTACLE_WEIGHTS = {
  rockCluster: 2,
  woodPlank:   2,
  treeBushy:   4,
  rockSingle:  2,
  treeRound:   4,
  treeStump:   4,
};
function pickWeightedType(){
  const types = Object.keys(OBSTACLE_DEFS);
  let total = 0;
  for (const t of types) total += (OBSTACLE_WEIGHTS[t] || 1);
  let roll = Math.random() * total;
  for (const t of types){
    roll -= (OBSTACLE_WEIGHTS[t] || 1);
    if (roll <= 0) return t;
  }
  return types[types.length-1];
}
// Bounding box for an obstacle instance. Anchor (x,y) is bottom-center
// (matches drawDecor: drawImage(img, -w/2, -h, w, h)).
function decorBox(t, x, y){
  const def = OBSTACLE_DEFS[t];
  return { left:x-def.w/2, right:x+def.w/2, top:y-def.h, bottom:y };
}
function boxesOverlap(a, b, pad){
  return !(a.right+pad<=b.left || a.left-pad>=b.right || a.bottom+pad<=b.top || a.top-pad>=b.bottom);
}
function genDecor(){
  decor = [];
  const rand = (a,b)=>a+Math.random()*(b-a);
  const TARGET = 150;       // raised obstacle density for a richer map
  const MAX_ATTEMPTS = 60;  // per-obstacle placement retries before giving up
  const PAD = 4;            // small gap so bounding boxes never touch/intersect
  for (let i=0;i<TARGET;i++){
    let placed = false;
    for (let a=0; a<MAX_ATTEMPTS && !placed; a++){
      const x = rand(60, WORLD.w-60), y = rand(60, WORLD.h-60);
      if (Math.hypot(x-WORLD.w/2, y-WORLD.h/2) < 260) continue; // keep spawn clear
      const t = pickWeightedType();
      const box = decorBox(t, x, y);
      // Strict no-overlap rule: reject if this obstacle's bounding box
      // intersects any already-placed obstacle. Side-by-side (touching,
      // non-intersecting) placement is allowed.
      let overlaps = false;
      for (const d of decor){
        if (boxesOverlap(box, decorBox(d.t, d.x, d.y), PAD)){ overlaps = true; break; }
      }
      if (overlaps) continue;
      // r stays fixed at 1 so every obstacle renders at its native w/h (strict 1:1,
      // no per-instance scale distortion). Background/tiles are untouched.
      decor.push({ t, x, y, r: 1 });
      placed = true;
    }
  }
}
function drawDecor(g, d){
  const def = OBSTACLE_DEFS[d.t];
  const s = d.r;
  const img = ASSETS[def.key];
  const w = def.w*s, h = def.h*s;
  g.save(); g.translate(d.x, d.y);
  if (img && img.complete && img.naturalWidth){
    g.drawImage(img, -w/2, -h, w, h);
  }
  g.restore();
}

/* ---------------- CANVAS ---------------- */
const canvas = $('game'), ctx = canvas.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = VW*DPR; canvas.height = VH*DPR;
}
window.addEventListener('resize', resize); resize();

/* ---------------- GAME STATE ---------------- */
let running=false, paused=false, gameOver=false;
let player=null, enemies=[], projectiles=[], pickups=[], effects=[], texts=[], particles=[];
let wave=0, spawnQueue=0, spawnT=0, calmT=0, runGold=0, cam={x:0,y:0};
let selCat='heroes', selIdx=0;
let combo=0, comboTimer=0, shakeMag=0, shakeTime=0, hitstop=0;
const COMBO_WINDOW = 2.2, ATK_ANIM = 0.25, STOMP_RANGE = 130;
const MAX_ALIVE = 18;               // hard spawn cap → no lag on high waves
const MAX_PROJ  = 90;

/* ---------------- COMBAT FEEL: combo / shake / particles ----------------
   Ported from the CoC-style arena build: kill-chain combo multiplier,
   hit-stop + camera shake on impact, and lightweight spark particles. */
function triggerShake(mag, dur){ shakeMag = Math.max(shakeMag, mag); shakeTime = Math.max(shakeTime, dur); }
function comboMult(){ return Math.min(1 + Math.floor(combo/3)*0.08, 1.4); }
function registerCombo(){
  combo = comboTimer > 0 ? combo+1 : 1;
  comboTimer = COMBO_WINDOW;
  if (combo >= 2 && player) texts.push({x:player.x, y:player.y-90, txt:'COMBO x'+combo, t:0.6, color:'#ffb347'});
}
function spawnParticles(x, y, color, count, sMin, sMax){
  if (particles.length > 260) return;
  for (let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2, sp = sMin + Math.random()*(sMax-sMin);
    particles.push({ x, y, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp,
      life:0.22+Math.random()*0.28, maxLife:0.5, r:1.3+Math.random()*2.1, color });
  }
}

function heroUps(){ return selCat==='heroes' ? save.upHero : save.upTroop; }
function computeStats(def, ups){
  return {
    dmg:     def.dmg   * (1 + 0.12*ups.damage),
    atkCd:   def.atkCd / (1 + 0.10*ups.atkSpeed),
    speed:   def.speed * (1 + 0.06*ups.moveSpeed),
    hp:      def.hp,
    dashDist: 170 + 26*ups.dash,
    dashCd:  Math.max(1.1, 2.8 - 0.14*ups.dash),
    abilityCd: Math.max(5, 11 - 0.45*ups.special),
    spPow:   1 + 0.12*ups.special,
  };
}

function startGame(){
  const def = CHARS[selCat][selIdx];
  const st = computeStats(def, heroUps());
  player = { def, st, x:WORLD.w/2, y:WORLD.h/2, hp:st.hp, maxhp:st.hp, face:1,
    walkT:0, atkT:0, atkCd:0, dashT:0, dashCd:0, ddx:0, ddy:0,
    shieldT:0, shieldCd:0, abCd:0, invis:0, invuln:0, rage:0, multi:0,
    volley:0, volleyT:0, swingDir:1, hitFlash:0 };
  enemies=[]; projectiles=[]; pickups=[]; effects=[]; texts=[]; particles=[];
  wave=0; runGold=0; gameOver=false; paused=false;
  combo=0; comboTimer=0; shakeMag=0; shakeTime=0; hitstop=0;
  genDecor();
  nextWave();
  $('powerIcon').textContent = def.ability.icon;
  showScreen('game');
  running = true;
}

function nextWave(){
  wave++;
  const isBoss = wave % 5 === 0;
  spawnQueue = Math.min(4 + wave*2, 46);
  spawnT = 1.2; calmT = 0;
  banner(isBoss ? `☠ BOSS WAVE ${wave} ☠` : `WAVE ${wave}`, isBoss);
  isBoss ? sfx.boss() : sfx.wave();
  if (isBoss){
    spawnQueue = Math.max(4, (spawnQueue*0.5)|0);
    spawnEnemy(true);
    triggerShake(7, 0.35);
  }
}

function banner(msg, boss){
  const b = $('banner');
  b.textContent = msg;
  b.classList.toggle('boss', !!boss);
  b.classList.add('show');
  clearTimeout(b._t);
  b._t = setTimeout(()=>b.classList.remove('show'), 1800);
}

function spawnEnemy(boss=false){
  const base = ENEMY_TYPES[Math.random() < 0.62 ? 0 : 1];
  const hpMul = 1 + 0.16*(wave-1), dmgMul = 1 + 0.10*(wave-1);
  // spawn at ring around player, clamped to arena
  let a = Math.random()*Math.PI*2, d = 480 + Math.random()*200;
  let x = Math.min(WORLD.w-50, Math.max(50, player.x + Math.cos(a)*d));
  let y = Math.min(WORLD.h-50, Math.max(50, player.y + Math.sin(a)*d));
  const e = {
    def: base, x, y, face:1, walkT:0, atkT:0, atkCd:1 + Math.random(), swingDir:1,
    boss, scale: boss ? 2.6 : 1,
    hp:    base.hp  * hpMul * (boss ? 22 : 1),
    dmg:   base.dmg * dmgMul * (boss ? 2.6 : 1),
    speed: base.speed * (boss ? 0.85 : 1) * (0.9 + Math.random()*0.2),
    range: base.range * (boss ? 1.5 : 1),
    cd:    base.atkCd * (boss ? 0.6 : 1),
    gold:  base.gold * (boss ? 15 : 1),
    hitT: 0,
  };
  e.maxhp = e.hp;
  if (boss){ e.stompCd = 2.2; e.telegraph = 0; e.telegraphMax = 0; }
  enemies.push(e);
}

/* ---------------- INPUT ---------------- */
const input = { mx:0, my:0, attack:false, keys:{} };
const joy = { active:false, id:null, bx:0, by:0 };
const joyBase = $('joyBase'), joyKnob = $('joyKnob');
const JOY_HOME = () => { joyBase.style.left='34px'; joyBase.style.bottom='44px'; joyBase.style.top=''; };

screens.game.addEventListener('pointerdown', ev => {
  if (ev.target.closest('.actBtn') || ev.target.closest('.iconBtn')) return;
  if (ev.clientX < VW*0.55 && !joy.active){
    joy.active = true; joy.id = ev.pointerId;
    joy.bx = ev.clientX; joy.by = ev.clientY;
    joyBase.style.left = (joy.bx-64)+'px'; joyBase.style.top = (joy.by-64)+'px'; joyBase.style.bottom='auto';
    updateJoy(ev);
  }
});
window.addEventListener('pointermove', ev => { if (joy.active && ev.pointerId===joy.id) updateJoy(ev); });
function endJoy(ev){
  if (joy.active && ev.pointerId===joy.id){
    joy.active=false; input.mx=0; input.my=0;
    joyKnob.style.transform='translate(-50%,-50%)';
    joyBase.style.top=''; JOY_HOME();
  }
}
window.addEventListener('pointerup', endJoy);
window.addEventListener('pointercancel', endJoy);
function updateJoy(ev){
  let dx = ev.clientX - joy.bx, dy = ev.clientY - joy.by;
  const d = Math.hypot(dx,dy), max = 52;
  if (d > max){ dx = dx/d*max; dy = dy/d*max; }
  input.mx = dx/max; input.my = dy/max;
  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function bindBtn(id, down, up){
  const el = $(id);
  el.addEventListener('pointerdown', ev => { ev.stopPropagation(); initAudio(); down(); });
  if (up){ ['pointerup','pointerleave','pointercancel'].forEach(t => el.addEventListener(t, up)); }
}
bindBtn('btnAttack', ()=>input.attack=true, ()=>input.attack=false);
bindBtn('btnShield', ()=>tryShield());
bindBtn('btnDash',   ()=>tryDash());
bindBtn('btnPower',  ()=>tryPower());

window.addEventListener('keydown', e => {
  input.keys[e.key.toLowerCase()] = true;
  if (e.key===' ') input.attack = true;
  if (e.key.toLowerCase()==='k') tryShield();
  if (e.key.toLowerCase()==='l' || e.key==='Shift') tryDash();
  if (e.key.toLowerCase()==='e') tryPower();
});
window.addEventListener('keyup', e => {
  input.keys[e.key.toLowerCase()] = false;
  if (e.key===' ') input.attack = false;
});

/* ---------------- PLAYER ACTIONS ---------------- */
function tryShield(){
  if (!running || paused || !player || player.shieldCd > 0) return;
  player.shieldT = 2.0; player.shieldCd = 5.5; sfx.shield();
}
function tryDash(){
  if (!running || paused || !player || player.dashCd > 0) return;
  let dx = input.mx, dy = input.my;
  if (!dx && !dy){ dx = player.face; dy = 0; }
  const d = Math.hypot(dx,dy) || 1;
  player.ddx = dx/d; player.ddy = dy/d;
  player.dashT = 0.18; player.dashCd = player.st.dashCd; player.invuln = Math.max(player.invuln, 0.25);
  spawnParticles(player.x, player.y, '#ffffff', 10, 60, 190);
  sfx.dash();
}
function nearestEnemy(){
  let best=null, bd=1e9;
  for (const e of enemies){ const d=Math.hypot(e.x-player.x, e.y-player.y); if (d<bd){bd=d;best=e;} }
  return best;
}
function fireProjectile(kind, dx, dy, dmg, opts={}){
  if (projectiles.length >= MAX_PROJ) return;
  const sp = opts.speed || 620;
  projectiles.push({ kind, x:player.x+dx*22, y:player.y-26+dy*22, vx:dx*sp, vy:dy*sp,
    dmg, from:'player', life:opts.life||1.4, pierce:opts.pierce||0, seek:opts.seek||false,
    returning:false, hitSet: opts.pierce ? new Set() : null });
}
function playerAttack(){
  const st = player.st, rageMul = player.rage>0 ? 1.5 : 1;
  player.atkCd = st.atkCd / rageMul;
  player.atkT = ATK_ANIM;
  const t = nearestEnemy();
  let dx = player.face, dy = 0;
  if (t){ const d=Math.hypot(t.x-player.x,t.y-player.y)||1; dx=(t.x-player.x)/d; dy=(t.y-player.y)/d;
    player.face = dx>=0?1:-1; }
  const dmg = st.dmg * rageMul * comboMult();
  if (player.def.type === 'melee'){
    player.swingDir = -(player.swingDir||1);
    sfx.hit();
    effects.push({ t:'slash', x:player.x+dx*40, y:player.y-20+dy*40, a:Math.atan2(dy,dx), time:0.18, max:0.18 });
    let hitAny = false;
    for (const e of enemies){
      const d = Math.hypot(e.x-player.x, e.y-player.y);
      if (d < player.def.range + 20*e.scale){
        const ang = Math.atan2(e.y-player.y, e.x-player.x);
        let diff = Math.abs(ang - Math.atan2(dy,dx));
        if (diff > Math.PI) diff = Math.PI*2-diff;
        if (diff < 1.3){ damageEnemy(e, dmg); hitAny = true; }
      }
    }
    if (hitAny){
      spawnParticles(player.x+dx*40, player.y-20+dy*40, '#ffe9a8', 8, 60, 200);
      triggerShake(4, 0.14); hitstop = Math.max(hitstop, 0.035);
    }
  } else {
    sfx.shoot();
    const kind = player.def.weapon==='staff' ? 'magic' : (player.def.weapon==='spear' ? 'dart' : 'arrow');
    if (player.multi > 0){
      for (const off of [-0.22,0,0.22]){
        const a = Math.atan2(dy,dx)+off;
        fireProjectile(kind, Math.cos(a), Math.sin(a), dmg*0.8);
      }
    } else fireProjectile(kind, dx, dy, dmg);
  }
}
function tryPower(){
  if (!running || paused || !player || player.abCd > 0) return;
  const st = player.st, id = player.def.id;
  player.abCd = st.abilityCd;
  sfx.power();
  if (id==='bk'){
    effects.push({ t:'shock', x:player.x, y:player.y, r:10, max:190*st.spPow, time:0.5, maxT:0.5 });
    spawnParticles(player.x, player.y, '#ffd54a', 14, 90, 240);
    triggerShake(8, 0.3);
    for (const e of enemies)
      if (Math.hypot(e.x-player.x,e.y-player.y) < 190*st.spPow) damageEnemy(e, st.dmg*2.6*st.spPow);
    player.rage = 4;
  } else if (id==='aq'){
    player.invis = 3.5; player.volley = Math.round(10*st.spPow); player.volleyT = 0;
  } else if (id==='gw'){
    player.invuln = Math.max(player.invuln, 3.5);
    const heal = player.maxhp*0.3*st.spPow;
    player.hp = Math.min(player.maxhp, player.hp+heal);
    texts.push({x:player.x, y:player.y-70, txt:'+'+(heal|0), t:1, color:'#7ed957'});
    effects.push({ t:'aura', x:0, y:0, time:3.5, maxT:3.5 });
  } else if (id==='rc'){
    const t = nearestEnemy(); let dx = player.face, dy = 0;
    if (t){ const d=Math.hypot(t.x-player.x,t.y-player.y)||1; dx=(t.x-player.x)/d; dy=(t.y-player.y)/d; }
    fireProjectile('spear', dx, dy, st.dmg*1.9*st.spPow, { speed:520, life:1.3, pierce:99, seek:true });
  } else if (id==='barb'){
    player.rage = 5*Math.min(1.4,st.spPow);
    effects.push({ t:'shock', x:player.x, y:player.y, r:10, max:80, time:0.3, maxT:0.3 });
  } else if (id==='arch'){
    player.multi = 6*Math.min(1.5,st.spPow);
  } else if (id==='wiz'){
    const n = Math.round(12*st.spPow);
    for (let i=0;i<n;i++){ const a=i/n*Math.PI*2;
      fireProjectile('magic', Math.cos(a), Math.sin(a), st.dmg*1.2*st.spPow, {speed:480}); }
  }
}
function damageEnemy(e, dmg){
  e.hp -= dmg; e.hitT = 0.12;
  texts.push({x:e.x+(Math.random()*20-10), y:e.y-50*e.scale, txt:(dmg|0)+'', t:0.7, color:'#ffd54a'});
  spawnParticles(e.x, e.y-30*e.scale, '#fff3c9', 3, 30, 90);
  if (e.hp <= 0){
    registerCombo();
    effects.push({t:'poof', x:e.x, y:e.y-15, time:0.35, maxT:0.35});
    spawnParticles(e.x, e.y-15, '#ffe08a', 10, 60, 180);
    pickups.push({x:e.x, y:e.y, v:e.gold, t:0});
    if (e.boss) pickups.push({x:e.x+30, y:e.y, v:e.gold, t:0});
    enemies.splice(enemies.indexOf(e), 1);
  }
}
function damagePlayer(dmg){
  if (player.invuln > 0) return;
  if (player.shieldT > 0){
    texts.push({x:player.x, y:player.y-70, txt:'BLOCK', t:0.6, color:'#8ac9ff'});
    return;
  }
  player.hp -= dmg; sfx.hurt();
  player.hitFlash = 0.18;
  spawnParticles(player.x, player.y-24, '#ff8a5a', 6, 50, 150);
  triggerShake(3, 0.12);
  texts.push({x:player.x, y:player.y-70, txt:'-'+(dmg|0), t:0.8, color:'#ff6a5a'});
  if (player.hp <= 0){ player.hp = 0; endGame(); }
}
function endGame(){
  running = false; gameOver = true;
  sfx.die();
  save.gold += runGold;
  save.best = Math.max(save.best, wave);
  persist();
  setTimeout(()=>{
    $('overWave').textContent = wave;
    $('overBest').textContent = save.best;
    $('overGold').textContent = runGold;
    showScreen('over');
  }, 900);
}

/* ---------------- UPDATE ---------------- */
function update(dt){
  const p = player, st = p.st;
  // timers
  for (const k of ['atkCd','dashCd','shieldT','shieldCd','abCd','invis','invuln','rage','multi','atkT','hitFlash'])
    if (p[k] > 0) p[k] -= dt;
  if (comboTimer > 0){ comboTimer -= dt; if (comboTimer <= 0) combo = 0; }
  if (shakeTime > 0) shakeTime -= dt;
  if (p.dashT > 0){
    p.dashT -= dt;
    const sp = st.dashDist / 0.18;
    p.x += p.ddx*sp*dt; p.y += p.ddy*sp*dt;
  } else {
    let dx = input.mx + ((input.keys.d?1:0)-(input.keys.a?1:0));
    let dy = input.my + ((input.keys.s?1:0)-(input.keys.w?1:0));
    const d = Math.hypot(dx,dy);
    if (d > 0.15){
      dx/=Math.max(1,d); dy/=Math.max(1,d);
      const sp = st.speed * (p.rage>0?1.35:1);
      p.x += dx*sp*dt; p.y += dy*sp*dt;
      p.walkT += dt; if (Math.abs(dx)>0.1) p.face = dx>0?1:-1;
    } else p.walkT = 0;
  }
  p.x = Math.min(WORLD.w-30, Math.max(30, p.x));
  p.y = Math.min(WORLD.h-30, Math.max(30, p.y));
  if (input.attack && p.atkCd <= 0) playerAttack();
  // AQ volley
  if (p.volley > 0){
    p.volleyT -= dt;
    if (p.volleyT <= 0){
      p.volleyT = 0.1; p.volley--;
      const t = nearestEnemy();
      if (t){ const d=Math.hypot(t.x-p.x,t.y-p.y)||1;
        fireProjectile('arrow',(t.x-p.x)/d,(t.y-p.y)/d, st.dmg*1.1); sfx.shoot(); }
    }
  }

  // spawn logic (cap alive count → stable framerate)
  if (spawnQueue > 0){
    spawnT -= dt;
    if (spawnT <= 0 && enemies.length < MAX_ALIVE){
      spawnT = Math.max(0.35, 0.9 - wave*0.02);
      spawnQueue--; spawnEnemy();
    }
  } else if (enemies.length === 0){
    calmT += dt;
    if (calmT > 2.2){
      const bonus = 20 + wave*5;
      runGold += bonus;
      texts.push({x:p.x, y:p.y-90, txt:'+'+bonus+' 🪙', t:1.2, color:'#ffd54a'});
      nextWave();
    }
  }

  // enemies
  for (let i=enemies.length-1; i>=0; i--){
    const e = enemies[i];
    if (e.hitT > 0) e.hitT -= dt;
    if (e.atkT > 0) e.atkT -= dt;
    e.atkCd -= dt;
    const dx = p.x-e.x, dy = p.y-e.y, d = Math.hypot(dx,dy)||1;
    e.face = dx>=0?1:-1;
    const canSee = p.invis <= 0;
    // boss stomp/roar telegraph — freezes the boss, warns with a growing
    // ground ring, then AoE-damages + shakes the screen (ported feel)
    if (e.boss){
      e.stompCd -= dt;
      if (e.telegraph > 0){
        e.telegraph -= dt; e.walkT = 0;
        if (e.telegraph <= 0){
          const dd = Math.hypot(p.x-e.x, p.y-e.y);
          effects.push({ t:'shock', x:e.x, y:e.y, max: STOMP_RANGE*e.scale, time:0.45, maxT:0.45 });
          spawnParticles(e.x, e.y, '#ff9a4a', 16, 80, 220);
          triggerShake(9, 0.28); sfx.boss();
          if (dd < STOMP_RANGE*e.scale) damagePlayer(e.dmg*1.7);
          e.stompCd = 3.4 + Math.random()*1.6;
        }
      } else if (e.stompCd <= 0 && canSee && d < STOMP_RANGE*e.scale*1.35){
        e.telegraph = 0.85; e.telegraphMax = 0.85;
      }
    }
    const frozen = e.boss && e.telegraph > 0;
    if (e.def.type==='melee'){
      if (!frozen && canSee && d > e.range*0.8){ e.x += dx/d*e.speed*dt; e.y += dy/d*e.speed*dt; e.walkT += dt; }
      else if (!frozen && canSee && e.atkCd <= 0){
        e.atkCd = e.cd; e.atkT = ATK_ANIM; e.swingDir = -(e.swingDir||1); damagePlayer(e.dmg);
      }
    } else {
      if (!frozen && canSee && d > e.range){ e.x += dx/d*e.speed*dt; e.y += dy/d*e.speed*dt; e.walkT += dt; }
      else if (!frozen && canSee && d < e.range*0.5){ e.x -= dx/d*e.speed*0.7*dt; e.y -= dy/d*e.speed*0.7*dt; e.walkT += dt; }
      else if (!frozen && canSee && e.atkCd <= 0){
        e.atkCd = e.cd; e.atkT = ATK_ANIM; e.swingDir = -(e.swingDir||1);
        if (projectiles.length < MAX_PROJ)
          projectiles.push({ kind:'arrow', x:e.x, y:e.y-26*e.scale, vx:dx/d*380, vy:dy/d*380,
            dmg:e.dmg, from:'enemy', life:1.6 });
      }
    }
    // gentle separation
    for (let j=i-1; j>=0; j--){
      const o = enemies[j], ox = e.x-o.x, oy = e.y-o.y, od = Math.hypot(ox,oy);
      const min = 34*(e.scale+o.scale)/2;
      if (od > 0 && od < min){ const push=(min-od)/od*0.5; e.x+=ox*push; e.y+=oy*push; o.x-=ox*push; o.y-=oy*push; }
    }
    e.x = Math.min(WORLD.w-30, Math.max(30, e.x));
    e.y = Math.min(WORLD.h-30, Math.max(30, e.y));
  }

  // projectiles
  for (let i=projectiles.length-1; i>=0; i--){
    const pr = projectiles[i];
    pr.life -= dt;
    if (pr.seek && !pr.returning){
      const t = nearestEnemy();
      if (t){
        const dx=t.x-pr.x, dy=(t.y-26)-pr.y, d=Math.hypot(dx,dy)||1;
        const sp=Math.hypot(pr.vx,pr.vy);
        pr.vx += (dx/d*sp - pr.vx)*4*dt; pr.vy += (dy/d*sp - pr.vy)*4*dt;
      }
      if (pr.life <= 0){ pr.returning = true; pr.life = 2; if (pr.hitSet) pr.hitSet.clear(); }
    } else if (pr.returning){
      const dx=p.x-pr.x, dy=(p.y-26)-pr.y, d=Math.hypot(dx,dy)||1;
      pr.vx = dx/d*640; pr.vy = dy/d*640;
      if (d < 30 || pr.life <= 0){ projectiles.splice(i,1); continue; }
    }
    pr.x += pr.vx*dt; pr.y += pr.vy*dt;
    if (!pr.seek && (pr.life <= 0 || pr.x<-50 || pr.x>WORLD.w+50 || pr.y<-50 || pr.y>WORLD.h+50)){
      projectiles.splice(i,1); continue;
    }
    if (pr.from === 'player'){
      let consumed = false;
      for (const e of enemies){
        if (pr.hitSet && pr.hitSet.has(e)) continue;
        if (Math.hypot(e.x-pr.x, (e.y-24*e.scale)-pr.y) < 26*e.scale){
          damageEnemy(e, pr.dmg); sfx.hit();
          if (pr.pierce > 0){ pr.pierce--; if (pr.hitSet) pr.hitSet.add(e); }
          else { consumed = true; }
          break;
        }
      }
      if (consumed){ projectiles.splice(i,1); continue; }
    } else {
      if (Math.hypot(p.x-pr.x, (p.y-24)-pr.y) < 26){
        damagePlayer(pr.dmg); projectiles.splice(i,1); continue;
      }
    }
  }

  // coin pickups (magnet)
  for (let i=pickups.length-1; i>=0; i--){
    const c = pickups[i]; c.t += dt;
    const dx = p.x-c.x, dy = p.y-c.y, d = Math.hypot(dx,dy);
    if (d < 120){ c.x += dx/d*420*dt; c.y += dy/d*420*dt; }
    if (d < 26){ runGold += c.v; sfx.coin();
      texts.push({x:c.x, y:c.y-30, txt:'+'+c.v, t:0.6, color:'#ffd54a'});
      pickups.splice(i,1); }
  }
  // effects / texts / particles
  for (let i=effects.length-1;i>=0;i--){ effects[i].time-=dt; if (effects[i].time<=0) effects.splice(i,1); }
  for (let i=texts.length-1;i>=0;i--){ const t=texts[i]; t.t-=dt; t.y-=40*dt; if (t.t<=0) texts.splice(i,1); }
  for (let i=particles.length-1;i>=0;i--){
    const q = particles[i];
    q.life -= dt; q.x += q.vx*dt; q.y += q.vy*dt; q.vx *= 0.9; q.vy *= 0.9;
    if (q.life <= 0) particles.splice(i,1);
  }

  // camera
  cam.x = Math.min(WORLD.w-VW/2, Math.max(VW/2, p.x));
  cam.y = Math.min(WORLD.h-VH/2, Math.max(VH/2, p.y));
  if (WORLD.w < VW) cam.x = WORLD.w/2;
  if (WORLD.h < VH) cam.y = WORLD.h/2;
}

/* ---------------- BACKGROUND COVER-CROP ----------------
   Computes a centered source crop box (sx,sy,sw,sh) so the single background
   asset can be drawn onto the fixed target (WORLD.w x WORLD.h) with a
   "cover"-style fit: fully filled, correct aspect ratio, no stretching.
   Cached once the image is loaded since target dimensions are fixed. */
let bgCrop = null;
function computeBgCoverCrop(img, targetW, targetH){
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const imgRatio = iw/ih, targetRatio = targetW/targetH;
  let sw, sh, sx, sy;
  if (imgRatio > targetRatio){
    // image is relatively wider than target -> crop left/right edges
    sh = ih; sw = ih*targetRatio;
    sx = (iw-sw)/2; sy = 0;
  } else {
    // image is relatively taller than target -> crop top/bottom edges
    sw = iw; sh = iw/targetRatio;
    sx = 0; sy = (ih-sh)/2;
  }
  return { sx, sy, sw, sh };
}

/* ---------------- RENDER ---------------- */
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle = '#123c1c';
  ctx.fillRect(0,0,VW,VH);
  if (!player) return;
  ctx.save();
  let shakeX = 0, shakeY = 0;
  if (shakeTime > 0){
    const m = shakeMag * Math.min(1, shakeTime/0.35);
    shakeX = (Math.random()*2-1)*m; shakeY = (Math.random()*2-1)*m;
  }
  ctx.translate(VW/2 - cam.x + shakeX, VH/2 - cam.y + shakeY);

  // background: single game_assets/game_background_tz01.png asset, dynamically
  // cropped+scaled ("cover" fit) to the fixed WORLD arena size — no stretching,
  // no distortion, no tiling/duplication of the source image.
  const bg = ASSETS.bg;
  if (bg && bg.complete && bg.naturalWidth){
    if (!bgCrop) bgCrop = computeBgCoverCrop(bg, WORLD.w, WORLD.h);
    ctx.drawImage(bg, bgCrop.sx, bgCrop.sy, bgCrop.sw, bgCrop.sh, 0, 0, WORLD.w, WORLD.h);
  } else {
    ctx.fillStyle = '#123c1c';
    ctx.fillRect(cam.x-VW/2, cam.y-VH/2, VW, VH);
  }
  // arena border (thin boundary line, image handles the visual ground)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, WORLD.w, WORLD.h);

  // Ground-layer decor: small stones and fallen logs/planks are flat
  // walk-over details, not tall obstacles — draw them first, beneath
  // every entity, instead of depth-sorting them with the player/enemies.
  // They carry no movement collision, so the player/troops pass over them.
  for (const d of decor) if (GROUND_DECOR.has(d.t)) drawDecor(ctx, d);

  // depth-sorted drawables (tall obstacles + entities)
  const drawables = [];
  for (const d of decor){
    if (GROUND_DECOR.has(d.t)) continue; // already drawn as ground layer above
    drawables.push({ y:d.y, fn:()=>drawDecor(ctx,d) });
  }
  for (const c of pickups) drawables.push({ y:c.y, fn:()=>{
    ctx.save(); ctx.translate(c.x,c.y);
    const w = Math.abs(Math.sin(c.t*6));
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0,4,9,3.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffd54a'; ctx.beginPath(); ctx.ellipse(0,-6,9*Math.max(0.25,w),9,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#c9930f'; ctx.lineWidth=2; ctx.stroke();
    ctx.restore();
  }});
  for (const e of enemies) drawables.push({ y:e.y, fn:()=>{
    if (e.boss){ // boss ground aura
      ctx.fillStyle = `rgba(255,60,40,${0.15+0.08*Math.sin(Date.now()/150)})`;
      ctx.beginPath(); ctx.ellipse(e.x, e.y+4, 46*e.scale, 17*e.scale, 0,0,Math.PI*2); ctx.fill();
      if (e.telegraph > 0){ // stomp warning ring — closes in before the AoE lands
        const k = 1 - e.telegraph/e.telegraphMax;
        ctx.fillStyle = `rgba(255,60,40,${0.08+0.1*k})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, STOMP_RANGE*e.scale, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = `rgba(255,90,40,${0.4+0.4*k})`; ctx.lineWidth = 3+4*k;
        ctx.beginPath(); ctx.arc(e.x, e.y, STOMP_RANGE*e.scale*Math.min(1,k+0.15), 0, Math.PI*2); ctx.stroke();
      }
    }
    drawChar(ctx, e.def, e.x, e.y, e.scale, e.face, e.walkT||0, e.atkT>0 ? (ATK_ANIM-e.atkT)/ATK_ANIM : 0,
      { flash: e.hitT>0, hurt: e.hitT>0 ? e.hitT/0.12 : 0, swingDir: e.swingDir||1 });
    // hp bar
    const w = 44*e.scale;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(e.x-w/2, e.y-58*e.scale, w, 5*Math.min(e.scale,1.6));
    ctx.fillStyle = e.boss ? '#ff5a4a' : '#7ed957';
    ctx.fillRect(e.x-w/2, e.y-58*e.scale, w*Math.max(0,e.hp/e.maxhp), 5*Math.min(e.scale,1.6));
  }});
  drawables.push({ y:player.y, fn:()=>{
    if (player.shieldT > 0){
      ctx.fillStyle='rgba(90,180,255,0.25)'; ctx.strokeStyle='rgba(140,210,255,0.9)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(player.x, player.y-24, 42, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    if (player.invuln > 0.3 && player.def.id==='gw'){
      ctx.strokeStyle='rgba(255,224,120,0.8)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(player.x, player.y-24, 48+4*Math.sin(Date.now()/100), 0, Math.PI*2); ctx.stroke();
    }
    drawChar(ctx, player.def, player.x, player.y, 1.15, player.face, player.walkT,
      player.atkT>0 ? (ATK_ANIM-player.atkT)/ATK_ANIM : 0,
      { alpha: player.invis>0 ? 0.35 : (player.dashT>0 ? 0.6 : 1),
        flash: player.hitFlash>0, hurt: player.hitFlash>0 ? player.hitFlash/0.18 : 0,
        swingDir: player.swingDir||1 });
    if (player.rage > 0){
      ctx.fillStyle='rgba(255,120,40,0.5)';
      for (let i=0;i<3;i++){ const a=Date.now()/120+i*2.1;
        ctx.beginPath(); ctx.arc(player.x+Math.cos(a)*26, player.y-30+Math.sin(a)*16, 4, 0, Math.PI*2); ctx.fill(); }
    }
  }});
  drawables.sort((a,b)=>a.y-b.y);
  for (const d of drawables) d.fn();

  // projectiles
  for (const pr of projectiles){
    ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy,pr.vx));
    if (pr.kind==='magic'){
      ctx.fillStyle='rgba(90,216,255,0.35)'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#5ad8ff'; ctx.beginPath(); ctx.arc(0,0,5.5,0,Math.PI*2); ctx.fill();
    } else if (pr.kind==='spear'){
      ctx.strokeStyle='#8a6d2f'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-18,0); ctx.lineTo(10,0); ctx.stroke();
      ctx.fillStyle='#ffd54a'; ctx.beginPath(); ctx.moveTo(20,0); ctx.lineTo(8,-5); ctx.lineTo(8,5); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,213,74,0.3)'; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
    } else {
      ctx.strokeStyle = pr.from==='enemy' ? '#d8d8d8' : '#7a4d21';
      ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(8,0); ctx.stroke();
      ctx.fillStyle = pr.from==='enemy' ? '#b0b0b0' : '#c9c9d4';
      ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(5,-4); ctx.lineTo(5,4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // effects
  for (const fx of effects){
    const k = fx.time/(fx.maxT||fx.max||0.3);
    if (fx.t==='shock'){
      const r = fx.max*(1-k);
      ctx.strokeStyle=`rgba(255,180,60,${k})`; ctx.lineWidth=8*k+2;
      ctx.beginPath(); ctx.ellipse(fx.x, fx.y, r, r*0.45, 0, 0, Math.PI*2); ctx.stroke();
    } else if (fx.t==='slash'){
      ctx.strokeStyle=`rgba(255,255,255,${k*0.35})`; ctx.lineWidth=10;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 34, fx.a-0.9, fx.a+0.9); ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${k})`; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 34, fx.a-0.9, fx.a+0.9); ctx.stroke();
    } else if (fx.t==='poof'){
      ctx.fillStyle=`rgba(230,230,230,${k*0.8})`;
      for (let i=0;i<5;i++){ const a=i/5*Math.PI*2;
        ctx.beginPath(); ctx.arc(fx.x+Math.cos(a)*(1-k)*30, fx.y+Math.sin(a)*(1-k)*20, 8*k, 0, Math.PI*2); ctx.fill(); }
    }
  }
  // impact sparks / dash & smash particles
  for (const q of particles){
    const k = Math.max(0, q.life/q.maxLife);
    ctx.globalAlpha = k;
    ctx.fillStyle = q.color;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // floating texts
  ctx.textAlign='center'; ctx.font='bold 17px Trebuchet MS';
  for (const t of texts){
    ctx.globalAlpha = Math.min(1, t.t*2);
    ctx.fillStyle='#000'; ctx.fillText(t.txt, t.x+1, t.y+1);
    ctx.fillStyle=t.color; ctx.fillText(t.txt, t.x, t.y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* ---------------- HUD ---------------- */
function updateHUD(){
  if (!player) return;
  $('hpFill').style.width = (player.hp/player.maxhp*100)+'%';
  $('hpText').textContent = `${player.hp|0} / ${player.maxhp|0}`;
  $('hudWave').textContent = 'Wave '+wave;
  $('hudEnemies').textContent = '👾 '+(enemies.length+spawnQueue);
  $('hudGold').textContent = runGold;
  setCd('btnAttack', player.atkCd, player.st.atkCd);
  setCd('btnShield', player.shieldCd, 5.5);
  setCd('btnDash',   player.dashCd, player.st.dashCd);
  setCd('btnPower',  player.abCd, player.st.abilityCd);
  const vg = $('hpVignette');
  if (vg) vg.classList.toggle('active', player.hp/player.maxhp < 0.3);
}
function setCd(id, cur, max){
  $(id).querySelector('.cd').style.height = (Math.max(0,cur)/max*100)+'%';
}

/* ---------------- MENU UI ---------------- */
// Hero/Troop selector is a horizontal, one-way bounded carousel: cards are
// rendered once (no duplicated buffer sets), and native scroll extents give
// a hard stop at the first card (left) and last card (right) — no wrapping.
function charCardWidth(grid){
  const first = grid.querySelector('.charCard');
  if (!first) return 130;
  const gap = parseFloat(getComputedStyle(grid).columnGap || getComputedStyle(grid).gap || '10') || 10;
  return first.offsetWidth + gap;
}
function updateCharInfo(){
  const d = CHARS[selCat][selIdx];
  $('charInfo').innerHTML =
    `<b>${d.name}</b> — ${d.type==='melee'?'⚔ Melee':'🏹 Ranged'} &nbsp;|&nbsp; ` +
    `HP <b>${d.hp}</b> · DMG <b>${d.dmg}</b> · SPD <b>${d.speed}</b><br>` +
    `${d.ability.icon} <b>${d.ability.name}</b>: ${d.ability.desc}`;
  $('menuGold').textContent = save.gold;
}
function buildGrid(){
  const grid = $('charGrid');
  grid.innerHTML = '';
  const list = CHARS[selCat];
  list.forEach((def, i) => {
    const card = document.createElement('div');
    card.className = 'charCard' + (i===selIdx ? ' sel' : '');
    card.dataset.idx = i;
    const cv = document.createElement('canvas');
    cv.width = 168; cv.height = 168;
    const g = cv.getContext('2d');
    g.scale(2,2);
    drawChar(g, def, 42, 72, 1.35, 1, 0, 0);
    card.appendChild(cv);
    const nm = document.createElement('div'); nm.className='cName'; nm.textContent = def.name;
    const fr = document.createElement('div'); fr.className='free'; fr.textContent='FREE';
    card.appendChild(nm); card.appendChild(fr);
    card.addEventListener('click', ()=>{
      selIdx = i;
      grid.querySelectorAll('.charCard').forEach(c => c.classList.toggle('sel', +c.dataset.idx === i));
      updateCharInfo();
    });
    grid.appendChild(card);
  });
  updateCharInfo();
  // center the scroll on the currently selected card (clamped to the real,
  // one-way scroll bounds — never past the first or last card)
  requestAnimationFrame(()=>{
    const cw = charCardWidth(grid);
    const first = grid.querySelector('.charCard');
    const cardW = first ? first.offsetWidth : 130;
    const target = cw*selIdx - (grid.clientWidth - cardW)/2;
    grid.scrollLeft = Math.max(0, Math.min(target, grid.scrollWidth - grid.clientWidth));
  });
}
// Drag-to-scroll for mouse/trackpad input; native touch scrolling already
// handles swipe on mobile via the touch-action:pan-x carousel style. Native
// scroll extents (scrollLeft clamped to [0, scrollWidth-clientWidth]) give
// the hard one-way stop at the first/last card — no wrap in either direction.
(function setupCarouselDrag(){
  const grid = $('charGrid');
  const DRAG_THRESHOLD = 6; // px before a press counts as a swipe, not a tap
  let dragging = false, moved = false, activeId = null, startX = 0, startScroll = 0;

  grid.addEventListener('pointerdown', e=>{
    dragging = true; moved = false; activeId = e.pointerId;
    startX = e.clientX; startScroll = grid.scrollLeft;
    if (e.pointerType === 'mouse'){
      grid.classList.add('dragging');
      grid.setPointerCapture(e.pointerId);
    }
  });

  grid.addEventListener('pointermove', e=>{
    if (!dragging || e.pointerId !== activeId) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > DRAG_THRESHOLD) moved = true;
    // Mouse/pen: drive the scroll manually. Touch: native scrolling already
    // moves the carousel (touch-action:pan-x), so just track movement here.
    if (e.pointerType !== 'touch') grid.scrollLeft = startScroll - dx;
  });

  const stopDrag = e=>{
    if (!dragging || (e && e.pointerId !== activeId)) return;
    dragging = false;
    grid.classList.remove('dragging');
    if (moved){
      // Swallow the click that the browser fires right after a drag/swipe
      // so releasing on a different card never accidentally re-selects it.
      const suppressClick = ev=>{ ev.stopPropagation(); ev.preventDefault(); };
      grid.addEventListener('click', suppressClick, { capture:true, once:true });
      setTimeout(()=> grid.removeEventListener('click', suppressClick, { capture:true }), 300);
    }
  };
  grid.addEventListener('pointerup', stopDrag);
  grid.addEventListener('pointerleave', stopDrag);
  grid.addEventListener('pointercancel', stopDrag);
})();
$('tabHeroes').addEventListener('click', ()=>{ selCat='heroes'; selIdx=0;
  $('tabHeroes').classList.add('active'); $('tabTroops').classList.remove('active'); buildGrid(); });
$('tabTroops').addEventListener('click', ()=>{ selCat='troops'; selIdx=0;
  $('tabTroops').classList.add('active'); $('tabHeroes').classList.remove('active'); buildGrid(); });

/* ---------------- UPGRADE UI ---------------- */
let upTab = 'hero';
function buildUpgrades(){
  const ups = upTab==='hero' ? save.upHero : save.upTroop;
  $('upGold').textContent = save.gold;
  const list = $('upList');
  list.innerHTML = '';
  UPGRADES.forEach(u => {
    const lvl = ups[u.key];
    const card = document.createElement('div'); card.className='upCard';
    const cost = upCost(u, lvl), maxed = lvl >= MAX_LVL;
    card.innerHTML =
      `<div class="upIcon" style="background:linear-gradient(${u.bg},#1a1a2a)">${u.icon}</div>
       <div class="upMid">
         <div class="upName">${u.name} <span style="color:#8ac9ff">Lv ${lvl}/${MAX_LVL}</span></div>
         <div class="upDesc">${u.desc}</div>
         <div class="lvlBar">${Array.from({length:MAX_LVL},(_,i)=>`<i class="${i<lvl?'on':''}"></i>`).join('')}</div>
       </div>`;
    const btn = document.createElement('button');
    btn.className = 'buyBtn' + (maxed ? ' maxed' : '');
    btn.textContent = maxed ? 'MAX' : `🪙 ${cost}`;
    btn.disabled = maxed || save.gold < cost;
    btn.addEventListener('click', ()=>{
      if (maxed || save.gold < cost) return;
      save.gold -= cost; ups[u.key]++; persist(); sfx.coin(); buildUpgrades();
    });
    card.appendChild(btn);
    list.appendChild(card);
  });
}
$('upTabHero').addEventListener('click', ()=>{ upTab='hero';
  $('upTabHero').classList.add('active'); $('upTabTroop').classList.remove('active'); buildUpgrades(); });
$('upTabTroop').addEventListener('click', ()=>{ upTab='troop';
  $('upTabTroop').classList.add('active'); $('upTabHero').classList.remove('active'); buildUpgrades(); });

/* ---------------- NAVIGATION ---------------- */
$('btnBattle').addEventListener('click', ()=>{ initAudio(); startGame(); });
$('btnUpgrades').addEventListener('click', ()=>{ initAudio(); buildUpgrades(); showScreen('up'); });
$('btnBackUp').addEventListener('click', ()=>{ buildGrid(); showScreen('menu'); });
$('btnToMenu').addEventListener('click', ()=>{ buildGrid(); showScreen('menu'); });
$('btnPause').addEventListener('click', ()=>{ if (!running) return;
  paused = true; $('pauseOverlay').classList.remove('hidden'); });
$('btnResume').addEventListener('click', ()=>{ paused = false; $('pauseOverlay').classList.add('hidden'); });
$('btnQuit').addEventListener('click', ()=>{
  running = false; paused = false; $('pauseOverlay').classList.add('hidden');
  save.gold += runGold; save.best = Math.max(save.best, wave); persist();
  buildGrid(); showScreen('menu');
});
$('btnMusic').addEventListener('click', ()=>{
  musicOn = !musicOn;
  $('btnMusic').textContent = musicOn ? '🔊' : '🔇';
  if (musicOn){ initAudio(); } else stopMusic();
});

/* ---------------- MAIN LOOP ---------------- */
let last = performance.now();
function loop(now){
  let dt = Math.min((now-last)/1000, 0.05);
  last = now;
  if (hitstop > 0){ hitstop -= dt; dt *= 0.15; } // brief freeze-frame punch on solid hits
  if (running && !paused && !gameOver){ update(dt); updateHUD(); }
  if (!screens.game.classList.contains('hidden')) render();
  requestAnimationFrame(loop);
}
buildGrid();
JOY_HOME();
requestAnimationFrame(loop);