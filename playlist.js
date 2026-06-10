/* =============================================
   PLAYLIST.JS — Edit your songs here
   spotify: paste embed src URL or null
   Each song has: title, artist, note, spotify (embed URL or null), memory
   To find Spotify embed URL: right-click a song → Share → Embed → copy the src=""
   e.g. https://open.spotify.com/embed/track/TRACK_ID?utm_source=generator
   ============================================= */
const SONGS = [
  { title:'Our Song',       artist:'Add artist', note:'🎵', spotify:'https://open.spotify.com/embed/track/4ZexY8LcZkPd89dYPxf8LH?utm_source=generator', memory:'The one that always brings me back to you.' },
  { title:'First Dance',    artist:'Add artist', note:'🎶', spotify:null, memory:'I still remember every second of it.' },
  { title:'Drive Home',     artist:'Add artist', note:'🎸', spotify:null, memory:'Windows down, singing too loud.' },
  { title:'Late Night',     artist:'Add artist', note:'🌙', spotify:null, memory:'2am and neither of us wanted to sleep.' },
  { title:'Your Favourite', artist:'Add artist', note:'💫', spotify:null, memory:'You played this on repeat for a week.' },
  { title:'Our Anthem',     artist:'Add artist', note:'❤️', spotify:null, memory:'This one is ours. No one else gets it.' },
  /* Add more songs below by copying a line above */
];

(function(){
  'use strict';
  let W,H;
  const bgCvs=document.getElementById('pl-canvas');
  const bgCtx=bgCvs.getContext('2d');
  const vinylCvs=document.getElementById('vinyl-canvas');
  const vCtx=vinylCvs.getContext('2d');
  const notesCvs=document.getElementById('notes-canvas');
  const nCtx=notesCvs.getContext('2d');

  vinylCvs.width=vinylCvs.height=220;

  function isMobile(){ return innerWidth<=700; }

  function resize(){
    W=bgCvs.width=notesCvs.width=innerWidth;
    H=bgCvs.height=notesCvs.height=innerHeight;
    layoutSongCards(orbitAngle);
  }
  window.addEventListener('resize',resize);
  // Initial resize called below after layoutSongCards is defined

  // BG stars
  const stars=[];
  for(let i=0;i<200;i++) stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.3+.2,a:Math.random()*.5+.1,ph:Math.random()*Math.PI*2,sp:.2+Math.random()*.5});

  // Vinyl state
  let vinylAngle=0, isPlaying=false, currentSong=-1;
  const notes=[];
  let noteTimer=0;

  // Build song ring cards — ONE per song, no duplicates
  const ring=document.getElementById('song-ring');

  SONGS.forEach((s,i)=>{
    const el=document.createElement('div');
    el.className='song-card';el.dataset.i=i;
    el.innerHTML=`
      <div class="sc-note">${s.note}</div>
      <div class="sc-title">${s.title}</div>
      <div class="sc-artist">${s.artist}</div>
    `;
    el.addEventListener('click',()=>playSong(i));
    ring.appendChild(el);
  });

  let orbitAngle = 0; // global orbit rotation offset

  function layoutSongCards(angle){
    const cards=ring.querySelectorAll('.song-card');
    const mobile=isMobile();
    const ringR=mobile?120:200;

    ring.style.position='absolute';
    ring.style.transform='';
    ring.style.overflowY='';
    ring.style.maxHeight='';
    ring.style.width='';
    ring.style.display='';
    ring.style.flexDirection='';
    ring.style.paddingTop='';
    document.getElementById('vinyl-stage').style.top='';

    const baseAngle = (angle || 0);
    cards.forEach((el,i)=>{
      const a = (i/SONGS.length)*Math.PI*2 - Math.PI/2 + baseAngle;
      el.style.position='absolute';
      el.style.left=Math.round(Math.cos(a)*ringR)+'px';
      el.style.top=Math.round(Math.sin(a)*ringR)+'px';
      el.style.transform='translate(-50%,-50%)';
      el.style.margin='';
      el.style.display='';
    });
  }
  // Set initial dimensions and layout now that everything is defined
  W=bgCvs.width=notesCvs.width=innerWidth;
  H=bgCvs.height=notesCvs.height=innerHeight;
  layoutSongCards(0);

  function playSong(idx){
    currentSong=idx;isPlaying=true;
    document.querySelectorAll('.song-card').forEach((c,i)=>c.classList.toggle('playing',i===idx));
    vinylCvs.classList.add('playing');
    const s=SONGS[idx];
    document.getElementById('np-title').textContent=s.title;
    document.getElementById('np-artist').textContent=s.artist;
    document.getElementById('np-note').textContent=s.note;
    document.getElementById('np-memory').textContent=s.memory||'';
    document.getElementById('now-playing').classList.remove('hidden');

    // Update Spotify iframe — each song gets its own labeled frame
    const ifr=document.getElementById('sp-iframe');
    const spLabel=document.getElementById('sp-label');
    if(s.spotify){
      const src=s.spotify.includes('autoplay') ? s.spotify : s.spotify+'&autoplay=1';
      ifr.src=src;
      ifr.title=`${s.title} by ${s.artist}`;
      ifr.style.display='block';
      if(spLabel) spLabel.textContent=`▶ Playing via Spotify: ${s.title}`;
    } else {
      ifr.src='';
      ifr.style.display='none';
      if(spLabel) spLabel.textContent='No Spotify link for this song.';
    }
    for(let i=0;i<16;i++) setTimeout(()=>spawnNote(),i*60);
  }

  function stopSong(){
    isPlaying=false;currentSong=-1;
    document.querySelectorAll('.song-card').forEach(c=>c.classList.remove('playing'));
    vinylCvs.classList.remove('playing');
    document.getElementById('now-playing').classList.add('hidden');
    document.getElementById('sp-iframe').src='';
    document.getElementById('sp-iframe').style.display='none';
  }
  document.getElementById('np-stop').addEventListener('click',stopSong);

  function spawnNote(){
    const syms=['♩','♪','♫','♬'];
    notes.push({
      x:W/2+(Math.random()-.5)*60, y:H/2+(Math.random()-.5)*60,
      vx:(Math.random()-.5)*2, vy:-(1+Math.random()*2),
      sym:syms[Math.floor(Math.random()*syms.length)],
      size:14+Math.random()*14, life:1, decay:.005+Math.random()*.005,
      rot:(Math.random()-.5)*.4,
    });
  }

  function tick(ts){
    requestAnimationFrame(tick);
    const t=ts*.001;
    vinylAngle+=isPlaying?.025:.006;
    orbitAngle += isPlaying ? .004 : .0015;
    layoutSongCards(orbitAngle);
    noteTimer++;
    if(isPlaying&&noteTimer%18===0) spawnNote();

    bgCtx.fillStyle='rgba(2,0,10,.2)';bgCtx.fillRect(0,0,W,H);
    for(const s of stars){
      bgCtx.globalAlpha=s.a*(.5+.5*Math.sin(t*s.sp+s.ph));
      bgCtx.fillStyle='#fff';bgCtx.beginPath();bgCtx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);bgCtx.fill();
    }
    bgCtx.globalAlpha=1;
    drawVinyl(t);

    nCtx.clearRect(0,0,W,H);
    for(let i=notes.length-1;i>=0;i--){
      const n=notes[i];
      n.x+=n.vx;n.y+=n.vy;n.life-=n.decay;
      if(n.life<=0){notes.splice(i,1);continue;}
      nCtx.save();nCtx.globalAlpha=n.life*.85;nCtx.fillStyle='#f48fb1';
      nCtx.font=`${n.size}px serif`;nCtx.textAlign='center';
      nCtx.translate(n.x,n.y);nCtx.rotate(n.rot);
      nCtx.fillText(n.sym,0,0);nCtx.restore();
    }
  }

  function drawVinyl(t){
    const cx=110,cy=110,R=100;
    vCtx.clearRect(0,0,220,220);
    vCtx.save();vCtx.translate(cx,cy);vCtx.rotate(vinylAngle);
    const disc=vCtx.createRadialGradient(0,0,0,0,0,R);
    disc.addColorStop(0,'#1a0008');disc.addColorStop(.3,'#0d0005');
    disc.addColorStop(.6,'#180008');disc.addColorStop(1,'#0a0003');
    vCtx.fillStyle=disc;vCtx.beginPath();vCtx.arc(0,0,R,0,Math.PI*2);vCtx.fill();
    for(let r=20;r<R;r+=7){
      vCtx.strokeStyle=`rgba(255,255,255,${.03+.01*(r%14===0?1:0)})`;
      vCtx.lineWidth=.6;vCtx.beginPath();vCtx.arc(0,0,r,0,Math.PI*2);vCtx.stroke();
    }
    const lbl=vCtx.createRadialGradient(0,0,0,0,0,28);
    lbl.addColorStop(0,'#3d0018');lbl.addColorStop(1,'#1a0008');
    vCtx.fillStyle=lbl;vCtx.beginPath();vCtx.arc(0,0,28,0,Math.PI*2);vCtx.fill();
    vCtx.strokeStyle='rgba(192,20,60,.6)';vCtx.lineWidth=1.2;
    vCtx.beginPath();vCtx.arc(0,0,28,0,Math.PI*2);vCtx.stroke();
    if(isPlaying&&currentSong>=0){
      vCtx.save();vCtx.rotate(-vinylAngle);
      vCtx.fillStyle='rgba(244,143,177,.8)';vCtx.font='16px serif';
      vCtx.textAlign='center';vCtx.textBaseline='middle';
      vCtx.fillText(SONGS[currentSong].note,0,0);
      vCtx.restore();
    }
    vCtx.fillStyle='#02000a';vCtx.beginPath();vCtx.arc(0,0,4,0,Math.PI*2);vCtx.fill();
    vCtx.restore();
    const shine=vCtx.createRadialGradient(cx-30,cy-30,0,cx,cy,R);
    shine.addColorStop(0,'rgba(255,255,255,.07)');shine.addColorStop(.4,'rgba(255,255,255,.02)');shine.addColorStop(1,'rgba(0,0,0,0)');
    vCtx.fillStyle=shine;vCtx.beginPath();vCtx.arc(cx,cy,R,0,Math.PI*2);vCtx.fill();
    if(isPlaying){
      const glow=vCtx.createRadialGradient(cx,cy,R-2,cx,cy,R+8);
      glow.addColorStop(0,`rgba(192,20,60,${.4+.3*Math.sin(t*3)})`);
      glow.addColorStop(1,'rgba(192,20,60,0)');
      vCtx.fillStyle=glow;vCtx.beginPath();vCtx.arc(cx,cy,R+8,0,Math.PI*2);vCtx.fill();
    }
  }

  requestAnimationFrame(tick);
})();