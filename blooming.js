/* =============================================
   BLOOMING.JS — Edit your dreams here
   ============================================= */
const STAGES = [
  { icon:'🌱', name:'A Seed',          dream:'Every great love starts somewhere small and quiet.',       color:'#4caf50', type:'seed'   },
  { icon:'🌿', name:'First Sprout',    dream:'Travel together — anywhere, as long as it\'s with you.',  color:'#66bb6a', type:'sprout' },
  { icon:'🌺', name:'In Bloom',        dream:'Build a home that feels like us.',                        color:'#f48fb1', type:'flower' },
  { icon:'🌳', name:'Growing Strong',  dream:'Grow old together — still laughing, still choosing each other.', color:'#81c784', type:'tree' },
  { icon:'✨', name:'Forever Ours',    dream:'A love so full it leaves no room for doubt.',              color:'#f48fb1', type:'forever'},
  { icon:'🌌', name:'Our Universe',    dream:'You are my favourite place in every world.',               color:'#c084fc', type:'cosmos' },
];

(function(){
  'use strict';
  const canvas=document.getElementById('bl-canvas');
  const ctx=canvas.getContext('2d');
  let W,H,CX,CY;

  function resize(){
    W=canvas.width=innerWidth;
    H=canvas.height=innerHeight;
    CX=W/2;
    CY=H*.55;
  }
  window.addEventListener('resize',resize);resize();

  const bgStars=[];
  for(let i=0;i<180;i++) bgStars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.2+.2,a:Math.random()*.5+.1,ph:Math.random()*Math.PI*2,sp:.2+Math.random()*.5});

  const particles=[];
  function spawnParticles(stage){
    particles.length=0;
    const col=STAGES[stage].color;
    for(let i=0;i<60;i++){
      const a=Math.random()*Math.PI*2, d=30+Math.random()*120;
      particles.push({x:CX+Math.cos(a)*d,y:CY+Math.sin(a)*d,vx:(Math.random()-.5)*.4,vy:-(Math.random()*.6),r:Math.random()*2+.5,a:.1+Math.random()*.6,ph:Math.random()*Math.PI*2,sp:.3+Math.random()*.5,col});
    }
  }

  let currentStage=0, stageProgress=0;
  let autoAdvanceTimer=null;

  function setStage(idx, progress){
    const changed = idx !== currentStage;
    currentStage = idx;
    stageProgress = progress;
    if(changed){ updateLabel(); spawnParticles(idx); }
  }

  // When "Forever Ours" is fully visible, wait 2.8s then auto-advance to cosmos
  function maybeScheduleAutoAdvance(idx){
    if(idx === STAGES.findIndex(s=>s.type==='forever') && !autoAdvanceTimer){
      autoAdvanceTimer = setTimeout(()=>{
        const cosmosIdx = STAGES.findIndex(s=>s.type==='cosmos');
        // Smoothly animate stageProgress from 0→1 over ~1.2s then hold
        let start=null;
        function animIn(ts){
          if(!start) start=ts;
          const frac=Math.min((ts-start)/1200,1);
          setStage(cosmosIdx, frac);
          if(frac<1) requestAnimationFrame(animIn);
        }
        requestAnimationFrame(animIn);
      }, 2800);
    }
    // If user scrolls away from forever before timer fires, cancel
    if(idx !== STAGES.findIndex(s=>s.type==='forever') && idx !== STAGES.findIndex(s=>s.type==='cosmos')){
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer=null;
    }
  }

  const scrollEl=document.getElementById('bl-scroll');
  scrollEl.addEventListener('scroll',()=>{
    const max=scrollEl.scrollHeight-scrollEl.clientHeight;
    const pct=scrollEl.scrollTop/max;
    const idx=Math.min(Math.floor(pct*(STAGES.length)),STAGES.length-1);
    const prog=(pct*(STAGES.length))%1;
    setStage(idx, prog);
    maybeScheduleAutoAdvance(idx);
  },{ passive:true });

  function updateLabel(){
    const s=STAGES[currentStage];
    document.getElementById('stage-icon').textContent=s.icon;
    document.getElementById('stage-name').textContent=s.name;
    document.getElementById('stage-dream').textContent=s.dream;
  }
  updateLabel();spawnParticles(0);

  function tick(ts){
    requestAnimationFrame(tick);
    const t=ts*.001;
    ctx.fillStyle='rgba(2,0,10,.18)';ctx.fillRect(0,0,W,H);

    for(const s of bgStars){
      ctx.globalAlpha=s.a*(.5+.5*Math.sin(t*s.sp+s.ph));
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    const stage=STAGES[currentStage];
    const ep=easeOut(stageProgress);

    if(stage.type==='seed')    drawSeed(t,ep,stage.color);
    else if(stage.type==='sprout') drawSprout(t,ep,stage.color);
    else if(stage.type==='flower') drawFlower(t,ep,stage.color);
    else if(stage.type==='tree')   drawTree(t,ep,stage.color);
    else if(stage.type==='forever') drawForever(t,ep,stage.color);
    else if(stage.type==='cosmos')  drawCosmos(t,ep,stage.color);

    for(const p of particles){
      p.x+=p.vx;p.y+=p.vy;
      if(p.y<CY-200||p.x<0||p.x>W){p.y=CY+50+Math.random()*80;p.x=CX+(Math.random()-.5)*200;}
      ctx.globalAlpha=p.a*(.5+.5*Math.sin(t*p.sp+p.ph));
      ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  const GR='rgba(80,180,80,';
  function drawStem(h){ctx.strokeStyle=GR+'.8)';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(CX,CY+20);ctx.lineTo(CX,CY-h);ctx.stroke();}

  function drawSeed(t,p,col){
    const s=12+p*6+2*Math.sin(t*1.5);
    const g=ctx.createRadialGradient(CX,CY,0,CX,CY,s*2);
    g.addColorStop(0,col+'cc');g.addColorStop(1,col+'00');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(CX,CY,s*2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(CX,CY,s*.6,s,0,0,Math.PI*2);ctx.fill();
  }

  function drawSprout(t,p,col){
    const h=40+p*60;drawStem(h);
    ctx.strokeStyle=GR+'.7)';ctx.lineWidth=2;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(CX,CY-h*.5);ctx.quadraticCurveTo(CX+25,CY-h*.5-15,CX+35,CY-h*.5-30);ctx.stroke();
    ctx.beginPath();ctx.moveTo(CX,CY-h*.7);ctx.quadraticCurveTo(CX-25,CY-h*.7-15,CX-35,CY-h*.7-30);ctx.stroke();
    const g=ctx.createRadialGradient(CX,CY-h,0,CX,CY-h,20);
    g.addColorStop(0,col+'aa');g.addColorStop(1,col+'00');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(CX,CY-h,10,0,Math.PI*2);ctx.fill();
  }

  function drawFlower(t,p,col){
    const h=80+p*40;drawStem(h);
    const petals=6;const beat=.8+.2*Math.sin(t*1.2);
    for(let i=0;i<petals;i++){
      const a=(i/petals)*Math.PI*2+t*.2;
      ctx.save();ctx.translate(CX,CY-h);ctx.rotate(a);
      ctx.globalAlpha=.7+.2*Math.sin(t+i);ctx.fillStyle=col;
      ctx.beginPath();ctx.ellipse(0,-20*beat,8*beat,18*beat,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    const cg=ctx.createRadialGradient(CX,CY-h,0,CX,CY-h,14);
    cg.addColorStop(0,'rgba(255,220,80,.95)');cg.addColorStop(1,'rgba(255,200,60,0)');
    ctx.globalAlpha=.95;ctx.fillStyle=cg;ctx.beginPath();ctx.arc(CX,CY-h,14,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }

  function drawTree(t,p,col){
    const h=100+p*60;
    ctx.strokeStyle='rgba(100,60,30,.85)';ctx.lineWidth=8;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(CX,CY+20);ctx.lineTo(CX,CY-h*.5);ctx.stroke();
    ctx.lineWidth=4;
    [[30,.6],[-30,.6],[50,.8],[-50,.8]].forEach(([dx,frac])=>{
      ctx.beginPath();ctx.moveTo(CX,CY-h*frac);ctx.lineTo(CX+dx,CY-h*frac-40);ctx.stroke();
    });
    const cr=50+p*30;
    const cg=ctx.createRadialGradient(CX,CY-h,0,CX,CY-h,cr);
    cg.addColorStop(0,col+'cc');cg.addColorStop(.7,col+'55');cg.addColorStop(1,col+'00');
    ctx.fillStyle=cg;ctx.globalAlpha=.85+.1*Math.sin(t*.8);
    ctx.beginPath();ctx.arc(CX,CY-h,cr,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }

  // FOREVER — two intertwined hearts with golden glow, orbiting stars
  function drawForever(t,p,col){
    const S=Math.min(W,H)*0.075;
    const cx1=CX-S*0.7, cx2=CX+S*0.7, cy=CY-80;

    // Outer glow
    const gg=ctx.createRadialGradient(CX,cy,0,CX,cy,S*4);
    gg.addColorStop(0,col+'44');gg.addColorStop(1,col+'00');
    ctx.fillStyle=gg;ctx.globalAlpha=.6+.2*Math.sin(t*1.2);
    ctx.beginPath();ctx.arc(CX,cy,S*4,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;

    // Draw a heart at a given center
    function heartPath(hcx,hcy,scale){
      ctx.beginPath();
      for(let i=0;i<=60;i++){
        const theta=(i/60)*Math.PI*2;
        const hx=16*Math.pow(Math.sin(theta),3)*scale;
        const hy=-(13*Math.cos(theta)-5*Math.cos(2*theta)-2*Math.cos(3*theta)-Math.cos(4*theta))*scale;
        i===0?ctx.moveTo(hcx+hx,hcy+hy):ctx.lineTo(hcx+hx,hcy+hy);
      }
      ctx.closePath();
    }

    const beat=1+.06*Math.sin(t*2.5);
    const sc=S*beat*p;

    // Left heart (rose pink)
    heartPath(cx1,cy,sc);
    const lg1=ctx.createRadialGradient(cx1,cy-sc*.3,0,cx1,cy,sc*2);
    lg1.addColorStop(0,'rgba(255,160,190,.95)');lg1.addColorStop(1,'rgba(192,20,80,.4)');
    ctx.fillStyle=lg1;ctx.globalAlpha=.85;ctx.fill();

    // Right heart (soft pink)
    heartPath(cx2,cy,sc);
    const lg2=ctx.createRadialGradient(cx2,cy-sc*.3,0,cx2,cy,sc*2);
    lg2.addColorStop(0,'rgba(255,200,220,.98)');lg2.addColorStop(1,'rgba(244,143,177,.4)');
    ctx.fillStyle=lg2;ctx.globalAlpha=.85;ctx.fill();
    ctx.globalAlpha=1;

    // Orbiting sparkle dots
    for(let i=0;i<8;i++){
      const a=t*.6+i*(Math.PI*2/8);
      const ox=CX+Math.cos(a)*S*2.2;
      const oy=cy+Math.sin(a)*S*1.4;
      const r=2+Math.sin(t*1.5+i)*1;
      const sg=ctx.createRadialGradient(ox,oy,0,ox,oy,r*4);
      sg.addColorStop(0,col+'cc');sg.addColorStop(1,col+'00');
      ctx.fillStyle=sg;ctx.globalAlpha=.7+.3*Math.sin(t+i);
      ctx.beginPath();ctx.arc(ox,oy,r*4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.globalAlpha=.9;
      ctx.beginPath();ctx.arc(ox,oy,r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  // COSMOS — rotating orbital rings with heart sparks, entrance fade-in via p
  function drawCosmos(t, p, col){
    const cy = CY - 60;
    const S  = Math.min(W, H) * 0.22 * p;

    // Central radial glow
    const gg = ctx.createRadialGradient(CX, cy, 0, CX, cy, S * 2.2);
    gg.addColorStop(0, 'rgba(192,132,252,0.35)');
    gg.addColorStop(0.5, 'rgba(192,20,60,0.12)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.globalAlpha = p;
    ctx.beginPath(); ctx.arc(CX, cy, S * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Rotating elliptical rings (3 at different tilts)
    const rings = [
      { rx: S * 1.0, ry: S * 0.35, speed: 0.38, tilt: 0.3,  strokeCol: 'rgba(192,132,252,', a: 0.38 },
      { rx: S * 1.3, ry: S * 0.48, speed:-0.24, tilt:-0.2,  strokeCol: 'rgba(240,160,200,', a: 0.28 },
      { rx: S * 0.7, ry: S * 0.25, speed: 0.55, tilt: 0.55, strokeCol: 'rgba(255,200,230,', a: 0.22 },
    ];
    rings.forEach(r => {
      ctx.save();
      ctx.translate(CX, cy);
      ctx.rotate(r.tilt);
      ctx.scale(1, r.ry / r.rx);
      ctx.globalAlpha = r.a * p;
      ctx.strokeStyle = r.strokeCol + '1)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, r.rx, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });

    // Orbiting heart sparks on the rings
    const numHearts = 6;
    for(let i = 0; i < numHearts; i++){
      const a = t * 0.55 + i * (Math.PI * 2 / numHearts);
      // Orbit on a tilted ellipse matching ring 0
      const rx = S * 1.0, ry = S * 0.35, tilt = 0.3;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      const ox = CX + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      const oy = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      const sc = 3.5 * p;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.globalAlpha = (0.6 + 0.4 * Math.sin(t * 1.8 + i)) * p;
      ctx.fillStyle = i % 2 === 0 ? '#f48fb1' : '#c084fc';
      ctx.beginPath();
      for(let j = 0; j <= 30; j++){
        const th = (j / 30) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(th), 3) * sc * 0.07;
        const hy = -(13*Math.cos(th)-5*Math.cos(2*th)-2*Math.cos(3*th)-Math.cos(4*th)) * sc * 0.07;
        j === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Central softly pulsing star
    const pulse = 1 + 0.08 * Math.sin(t * 2.2);
    const cr = S * 0.13 * pulse;
    const cg = ctx.createRadialGradient(CX, cy, 0, CX, cy, cr * 3);
    cg.addColorStop(0, 'rgba(255,255,255,0.95)');
    cg.addColorStop(0.4, 'rgba(220,160,255,0.6)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg; ctx.globalAlpha = p;
    ctx.beginPath(); ctx.arc(CX, cy, cr * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function easeOut(t){return 1-Math.pow(1-Math.min(t,1),3);}
  requestAnimationFrame(tick);
})();
