/* =============================================
   ROSE.JS — Proper rose shape
   Cupped spiral petals, connected stem+leaves
   Crystal/iridescent glass look
   Text LEFT | Rose RIGHT | Orb rotates
   ============================================= */
(function () {
  'use strict';

  const REASONS = [
    "Because your smile feels like home.",
    "Because you make ordinary moments magical.",
    "Because your laugh is my favourite sound.",
    "Because you love me at my worst.",
    "Because you believe in me always.",
    "Because holding your hand calms everything.",
    "Because you make the world softer.",
    "Because your heart is endlessly kind.",
    "Because you are my safe place.",
    "Because every day with you is a gift.",
    "Because you see me — truly see me.",
    "Because you never let me give up.",
    "Because your eyes hold the whole universe.",
    "Because you turn my tears into strength.",
    "Because loving you feels like breathing.",
    "Because you are my greatest adventure.",
    "Because you make silence feel like music.",
    "Because your warmth lights up every room.",
    "Because you choose me, every single day.",
    "Because you are my forever favourite person.",
  ];

  let canvas, ctx, W, H, RCX, RCY;
  let rotX = 0.30, rotXTarget = 0.30;  // tilt to see into the rose
  let rotY = 0,    rotYTarget = 0;
  let bloomT = 0;
  let t = 0;

  // Orb
  let orbX, orbY, orbDrag=false, odx=0,ody=0,ocx=0,ocy=0;
  const ORB_R = 26;

  // Bokeh + sparkles
  let bokeh=[], sparkles=[];

  /* ---- 3D helpers ---- */
  function rot3(x,y,z) {
    // rotX
    const cx=Math.cos(rotX),sx=Math.sin(rotX);
    const y1= y*cx - z*sx, z1= y*sx + z*cx;
    // rotY
    const cy=Math.cos(rotY),sy=Math.sin(rotY);
    const x2= x*cy + z1*sy, z2=-x*sy + z1*cy;
    return {x:x2, y:y1, z:z2};
  }
  function proj(x,y,z) {
    const r=rot3(x,y,z);
    const FOV=460, S=Math.min(W,H)*0.27;
    const sc=FOV/(FOV+r.z);
    return {x:RCX+r.x*S*sc, y:RCY+r.y*S*sc, sc, d:r.z};
  }

  /* ============================================================
     ROSE PETAL GEOMETRY
     A rose petal is a CUPPED shape — like a rounded spoon.
     - Base is narrow (connects to receptacle)
     - Widens in the middle
     - Rounds off at tip
     - The whole petal curves INWARD like a cup
     Key: outer petals open wide & lay back
          inner petals stay upright & wrap inward
     ============================================================ */

  function rosePetal(
    baseAngle,   // angle around stem (0..2PI)
    openDeg,     // 0=closed(upright), 1=fully open(laid back)
    scale,       // size scale
    yBase,       // Y position of petal base (0 = receptacle top)
    twist        // slight twist/spiral offset
  ) {
    // Petal opens by rotating around its base
    // closed = petal points straight up
    // open   = petal leans outward and back
    const openAngle = openDeg * Math.PI * 0.52;  // max ~94deg lean

    // Petal shape in LOCAL space (before rotation):
    // Y axis = up along petal length
    // X axis = across petal width
    // Z axis = into/out of petal (curvature)
    // Base at origin, tip at top

    // 7 cross-sections along petal (u=0 base, u=1 tip)
    const sections = [
      { u:0.00, hw:0.04, curve:0.00 },  // base: narrow
      { u:0.12, hw:0.14, curve:0.04 },
      { u:0.28, hw:0.26, curve:0.12 },  // widest
      { u:0.45, hw:0.28, curve:0.18 },
      { u:0.62, hw:0.24, curve:0.20 },  // start narrowing
      { u:0.80, hw:0.14, curve:0.16 },
      { u:1.00, hw:0.04, curve:0.08 },  // tip: round
    ];

    // Build left + right 3D points for each section
    const left=[], right=[];

    for (const s of sections) {
      const len     = s.u * scale * 1.6;
      const hw      = s.hw * scale;
      const cupZ    = s.curve * scale * (1 - openDeg * 0.6); // cup reduces as opens

      // Local petal coords
      const lx =  hw, ly = -len, lz = cupZ;
      const rx = -hw, ry = -len, rz = cupZ;

      // Apply twist (spiral wrap)
      const twistA = twist * s.u;
      const cosT=Math.cos(twistA), sinT=Math.sin(twistA);
      function twistPt(px,py,pz){
        return { x:px*cosT-pz*sinT, y:py, z:px*sinT+pz*cosT };
      }
      const lt=twistPt(lx,ly,lz), rt=twistPt(rx,ry,rz);

      // Apply openAngle: rotate petal outward around its X base
      // (tilt the whole petal: tip goes away from stem)
      const cosO=Math.cos(openAngle), sinO=Math.sin(openAngle);
      function tiltPt(p){
        return {
          x: p.x,
          y: p.y*cosO - p.z*sinO,
          z: p.y*sinO + p.z*cosO,
        };
      }
      const lo=tiltPt(lt), ro=tiltPt(rt);

      // Now rotate around stem (baseAngle)
      const cosA=Math.cos(baseAngle), sinA=Math.sin(baseAngle);
      function spinPt(p){
        return {
          x:  p.x*cosA + p.z*sinA,
          y:  p.y + yBase,
          z: -p.x*sinA + p.z*cosA,
        };
      }
      left.push(spinPt(lo));
      right.push(spinPt(ro));
    }
    return { left, right };
  }

  /* ---- Draw one petal ---- */
  function drawPetal(left, right, colorTop, colorBot, alpha, glassEdge) {
    if (alpha < 0.02) return;
    const lp = left.map(p=>proj(p.x,p.y,p.z));
    const rp = right.map(p=>proj(p.x,p.y,p.z));
    const avgDepth = lp.reduce((s,p)=>s+p.d,0)/lp.length;

    // Path: up left side, across tip, down right side
    ctx.beginPath();
    ctx.moveTo(lp[0].x, lp[0].y);
    // Left edge
    ctx.bezierCurveTo(
      lp[1].x, lp[1].y,
      lp[2].x, lp[2].y,
      lp[3].x, lp[3].y
    );
    ctx.bezierCurveTo(
      lp[4].x, lp[4].y,
      lp[5].x, lp[5].y,
      lp[6].x, lp[6].y
    );
    // Right edge (reverse)
    ctx.bezierCurveTo(
      rp[5].x, rp[5].y,
      rp[4].x, rp[4].y,
      rp[3].x, rp[3].y
    );
    ctx.bezierCurveTo(
      rp[2].x, rp[2].y,
      rp[1].x, rp[1].y,
      rp[0].x, rp[0].y
    );
    ctx.closePath();

    // Gradient: base color → tip color
    const tipX=(lp[6].x+rp[6].x)*0.5, tipY=(lp[6].y+rp[6].y)*0.5;
    const grad=ctx.createLinearGradient(lp[0].x,lp[0].y,tipX,tipY);
    grad.addColorStop(0.0, colorBot);
    grad.addColorStop(0.5, colorTop);
    grad.addColorStop(1.0, glassEdge);

    ctx.globalAlpha = alpha;
    ctx.fillStyle   = grad;
    ctx.fill();

    // Glass edge
    ctx.globalAlpha = alpha * 0.50;
    ctx.strokeStyle = glassEdge;
    ctx.lineWidth   = 0.7;
    ctx.stroke();

    // Inner highlight (left side of petal = light catches)
    ctx.beginPath();
    ctx.moveTo(lp[0].x, lp[0].y);
    ctx.bezierCurveTo(lp[1].x,lp[1].y,lp[2].x,lp[2].y,lp[3].x,lp[3].y);
    ctx.globalAlpha = alpha * 0.25;
    ctx.strokeStyle = 'rgba(255,220,240,0.8)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    ctx.globalAlpha=1;
    return avgDepth;
  }

  /* ---- Rose layer definitions ---- */
  // Each layer: petals that bloom at different times
  // Inner layers bloom first, outer layers open last
  const LAYERS = [
    // Inner bud: 3 petals, very tight
    {
      n:3, scale:0.30, yBase:-0.10, maxOpen:0.12, twist:0.3,
      startBloom:0.0,
      colorTop: (a,T) => `rgba(${200+20*Math.sin(T+a)|0},${100+30*Math.sin(T*0.7+a)|0},${160+40*Math.sin(T*0.5+a)|0},0.85)`,
      colorBot: (a,T) => `rgba(130,20,50,0.92)`,
      edge:     (a,T) => `rgba(${220+20*Math.sin(T+a)|0},${160+40*Math.sin(T*0.8+a)|0},${220+20*Math.sin(T*0.6+a)|0},0.60)`,
    },
    // Second ring: 4 petals
    {
      n:4, scale:0.48, yBase:-0.05, maxOpen:0.32, twist:0.18,
      startBloom:0.15,
      colorTop: (a,T) => `rgba(${210+20*Math.sin(T+a)|0},${60+30*Math.sin(T*0.7+a)|0},${120+50*Math.sin(T*0.5+a)|0},0.82)`,
      colorBot: (a,T) => `rgba(140,15,45,0.90)`,
      edge:     (a,T) => `rgba(${230+20*Math.sin(T+a)|0},${140+60*Math.sin(T*0.8+a)|0},${230+20*Math.sin(T*0.6+a)|0},0.55)`,
    },
    // Third ring: 5 petals (staggered)
    {
      n:5, scale:0.68, yBase: 0.02, maxOpen:0.58, twist:0.12,
      stagger:Math.PI/5, startBloom:0.30,
      colorTop: (a,T) => `rgba(${220+20*Math.sin(T+a)|0},${70+40*Math.sin(T*0.7+a)|0},${100+60*Math.sin(T*0.5+a)|0},0.80)`,
      colorBot: (a,T) => `rgba(160,20,40,0.88)`,
      edge:     (a,T) => `rgba(${240+10*Math.sin(T+a)|0},${150+60*Math.sin(T*0.8+a)|0},${240+10*Math.sin(T*0.6+a)|0},0.50)`,
    },
    // Outer guard petals: 5 large, open wide
    {
      n:5, scale:0.90, yBase: 0.10, maxOpen:0.88, twist:0.06,
      stagger:0, startBloom:0.45,
      colorTop: (a,T) => `rgba(${220+20*Math.sin(T+a)|0},${80+40*Math.sin(T*0.7+a)|0},${110+50*Math.sin(T*0.5+a)|0},0.78)`,
      colorBot: (a,T) => `rgba(170,25,45,0.85)`,
      edge:     (a,T) => `rgba(${240+10*Math.sin(T+a)|0},${170+60*Math.sin(T*0.8+a)|0},${240+10*Math.sin(T*0.6+a)|0},0.45)`,
    },
    // Outermost sepal-like: 5 wide, very open
    {
      n:5, scale:1.05, yBase: 0.18, maxOpen:0.95, twist:0.04,
      stagger:Math.PI/5, startBloom:0.60,
      colorTop: (a,T) => `rgba(${200+20*Math.sin(T+a)|0},${60+40*Math.sin(T*0.7+a)|0},${90+50*Math.sin(T*0.5+a)|0},0.72)`,
      colorBot: (a,T) => `rgba(150,18,38,0.82)`,
      edge:     (a,T) => `rgba(${230+15*Math.sin(T+a)|0},${160+70*Math.sin(T*0.8+a)|0},${235+15*Math.sin(T*0.6+a)|0},0.42)`,
    },
  ];

  /* ---- Stem + Leaves — CONNECTED to receptacle ---- */
  function drawStemAndLeaves() {
    const a = Math.min(bloomT * 2, 1);
    if (a < 0.01) return;

    // Receptacle (where petals meet stem) — at yBase=0.18 + stem starts here
    // Stem: from bottom of flower (y=0.28 in 3D) down to bottom of screen
    const p0 = proj(0,  0.28, 0);   // receptacle bottom — flower base
    const p1 = proj(0.04, 0.90, 0); // slight bend
    const p2 = proj(0.02, 1.60, 0);
    const p3 = proj(0,    2.50, 0); // ground

    ctx.globalAlpha = a;

    // Stem shadow/body
    const sg = ctx.createLinearGradient(p0.x,p0.y, p3.x,p3.y);
    sg.addColorStop(0,   'rgba(30,100,30,0.95)');
    sg.addColorStop(0.5, 'rgba(25,85,25,0.90)');
    sg.addColorStop(1,   'rgba(20,65,20,0.80)');
    ctx.strokeStyle = sg;
    ctx.lineWidth   = Math.max(4 * p0.sc, 2);
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x,p1.y, p2.x,p2.y, p3.x,p3.y);
    ctx.stroke();

    // Stem highlight
    ctx.strokeStyle = 'rgba(80,200,80,0.35)';
    ctx.lineWidth   = Math.max(1.2 * p0.sc, 0.8);
    ctx.beginPath();
    ctx.moveTo(p0.x-2, p0.y);
    ctx.bezierCurveTo(p1.x-2,p1.y, p2.x-2,p2.y, p3.x-1,p3.y);
    ctx.stroke();

    // Receptacle cap (small green dome where stem meets flower)
    const rcap = proj(0, 0.24, 0);
    const capR  = 12 * rcap.sc;
    const capG  = ctx.createRadialGradient(rcap.x,rcap.y,0,rcap.x,rcap.y,capR);
    capG.addColorStop(0,  'rgba(60,160,60,0.95)');
    capG.addColorStop(0.6,'rgba(30,100,30,0.85)');
    capG.addColorStop(1,  'rgba(20,70,20,0.70)');
    ctx.fillStyle   = capG;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(rcap.x, rcap.y, capR, capR*0.55, 0, 0, Math.PI*2);
    ctx.fill();

    // Leaf 1 (left side, lower)
    drawLeaf( 0.32,  1.15, -0.45, -1, a);
    // Leaf 2 (right side, upper)
    drawLeaf(-0.28,  0.72,  0.38,  1, a);

    ctx.globalAlpha = 1;
  }

  function drawLeaf(lx, ly, lz, side, alpha) {
    // Leaf base connects to stem
    const stemPt = proj(0, ly, 0);         // point on stem
    const leafTip = proj(
      lx * 0.7,
      ly - 0.30,
      lz * 0.5
    );
    const leafMid = proj(
      lx * 0.5,
      ly - 0.16,
      lz * 0.3
    );
    const leafCtrl1 = proj(lx*0.25, ly-0.06, lz*0.15);
    const leafCtrl2 = proj(lx*0.55, ly-0.22, lz*0.40);

    // Leaf shape
    ctx.beginPath();
    ctx.moveTo(stemPt.x, stemPt.y);
    ctx.bezierCurveTo(leafCtrl1.x, leafCtrl1.y, leafCtrl2.x, leafCtrl2.y, leafTip.x, leafTip.y);
    ctx.bezierCurveTo(leafCtrl2.x+side*6, leafCtrl2.y+3, leafCtrl1.x+side*4, leafCtrl1.y+2, stemPt.x, stemPt.y);
    ctx.closePath();

    const lg = ctx.createLinearGradient(stemPt.x,stemPt.y,leafTip.x,leafTip.y);
    lg.addColorStop(0,  'rgba(25,100,25,0.92)');
    lg.addColorStop(0.5,'rgba(45,160,55,0.85)');
    lg.addColorStop(1,  'rgba(80,200,90,0.60)');
    ctx.globalAlpha = alpha * 0.92;
    ctx.fillStyle   = lg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,220,100,0.40)';
    ctx.lineWidth   = 0.6;
    ctx.stroke();

    // Leaf midrib
    ctx.beginPath();
    ctx.moveTo(stemPt.x, stemPt.y);
    ctx.bezierCurveTo(leafCtrl1.x,leafCtrl1.y, leafCtrl2.x,leafCtrl2.y, leafTip.x,leafTip.y);
    ctx.globalAlpha = alpha * 0.25;
    ctx.strokeStyle = 'rgba(150,255,150,0.5)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();
  }

  /* ---- Stamen (golden center glow) ---- */
  function drawStamen() {
    const a = Math.max(0, Math.min((bloomT-0.5)/0.3, 1));
    if (a < 0.01) return;
    const p = proj(0, -0.12, 0);
    const r = 16 * p.sc;
    const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    g.addColorStop(0,   `rgba(255,240,100,${a*0.95})`);
    g.addColorStop(0.3, `rgba(255,180,60,${a*0.70})`);
    g.addColorStop(0.7, `rgba(220,80,80,${a*0.35})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle   = g;
    ctx.beginPath();
    ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ---- Main render ---- */
  function tick(ts) {
    requestAnimationFrame(tick);
    t = ts * 0.001;
    bloomT = Math.min(bloomT + 0.0022, 1);
    rotX += (rotXTarget-rotX)*0.07;
    rotY += (rotYTarget-rotY)*0.07;
    if (!orbDrag) rotYTarget += 0.0030;

    const bar=document.getElementById('bloom-bar');
    if(bar) bar.style.width=(bloomT*100)+'%';

    ctx.fillStyle='rgba(3,0,8,0.20)';
    ctx.fillRect(0,0,W,H);

    // Bokeh
    for (const b of bokeh) {
      const bx=b.x*W+Math.sin(t*b.spd+b.ph)*16;
      const by=b.y*H+Math.cos(t*b.spd*0.7+b.ph)*12;
      const pulse=0.7+0.3*Math.sin(t*b.spd+b.ph);
      const g=ctx.createRadialGradient(bx,by,0,bx,by,b.r*pulse);
      const hex=('0'+Math.floor(b.a*255).toString(16)).slice(-2);
      g.addColorStop(0,b.c+hex); g.addColorStop(1,b.c+'00');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,b.r*pulse,0,Math.PI*2); ctx.fill();
    }

    // Draw stem FIRST (behind everything)
    drawStemAndLeaves();

    // Collect petals for depth sorting
    const queue=[];
    for (let li=0; li<LAYERS.length; li++) {
      const L=LAYERS[li];
      const lt=Math.max(0,Math.min((bloomT-L.startBloom)/Math.max(1-L.startBloom,0.01),1));
      const eased=1-Math.pow(1-lt,3);
      const open=eased*L.maxOpen;
      if(eased<0.01) continue;
      for(let pi=0;pi<L.n;pi++){
        const angle=(L.stagger||0)+(pi/L.n)*Math.PI*2;
        const {left,right}=rosePetal(angle,open,L.scale,L.yBase,L.twist);
        const lp=left.map(p=>proj(p.x,p.y,p.z));
        const avgD=lp.reduce((s,p)=>s+p.d,0)/lp.length;
        queue.push({li,L,pi,angle,open,eased,left,right,avgD});
      }
    }
    queue.sort((a,b)=>b.avgD-a.avgD);

    for(const q of queue){
      const {L,angle,open,eased,left,right}=q;
      const a=Math.min(eased*1.8,1);
      drawPetal(
        left,right,
        L.colorTop(angle,t),
        L.colorBot(angle,t),
        a,
        L.edge(angle,t)
      );
    }

    drawStamen();

    // Sparkles
    if(bloomT>0.3){
      const sa=Math.min((bloomT-0.3)/0.5,1);
      for(const s of sparkles){
        const tw=Math.abs(Math.sin(t*s.ts+s.ph));
        if(tw<0.15) continue;
        const p=proj(s.x+Math.sin(t*s.spd+s.ph)*0.03, s.y+Math.cos(t*s.spd*0.7+s.ph)*0.02, s.z);
        const sz=s.sz*p.sc*tw;
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*3);
        g.addColorStop(0,s.c+'ff'); g.addColorStop(0.3,s.c+'88'); g.addColorStop(1,s.c+'00');
        ctx.globalAlpha=sa*tw*0.90;
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,sz*3,0,Math.PI*2); ctx.fill();
        if(tw>0.65){
          ctx.strokeStyle=s.c; ctx.lineWidth=0.5;
          const arm=sz*5;
          ctx.beginPath();
          ctx.moveTo(p.x-arm,p.y); ctx.lineTo(p.x+arm,p.y);
          ctx.moveTo(p.x,p.y-arm); ctx.lineTo(p.x,p.y+arm);
          ctx.stroke();
        }
      }
      ctx.globalAlpha=1;
    }

    // Glow
    const rg=ctx.createRadialGradient(RCX,RCY-15,0,RCX,RCY,170);
    rg.addColorStop(0,'rgba(200,40,80,0.09)');
    rg.addColorStop(0.5,'rgba(140,50,200,0.05)');
    rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);

    drawOrb();
  }

  function drawOrb(){
    const ox=orbX,oy=orbY;
    const g=ctx.createRadialGradient(ox,oy,0,ox,oy,ORB_R*3);
    g.addColorStop(0,'rgba(192,20,60,0.20)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ox,oy,ORB_R*3,0,Math.PI*2); ctx.fill();
    const fg=ctx.createRadialGradient(ox-6,oy-6,0,ox,oy,ORB_R);
    fg.addColorStop(0,orbDrag?'rgba(255,120,160,0.28)':'rgba(192,20,60,0.12)');
    fg.addColorStop(1,'rgba(0,0,0,0.3)');
    ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(ox,oy,ORB_R,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=orbDrag?'rgba(255,160,190,0.95)':'rgba(192,20,60,0.52)';
    ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(ox,oy,ORB_R,0,Math.PI*2); ctx.stroke();
    ctx.save(); ctx.strokeStyle=orbDrag?'rgba(255,200,220,0.95)':'rgba(255,255,255,0.48)';
    ctx.lineWidth=1.3; ctx.lineCap='round';
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
      ctx.beginPath(); ctx.moveTo(ox+c*4,oy+s*4); ctx.lineTo(ox+c*9,oy+s*9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox+c*9,oy+s*9);
      ctx.lineTo(ox+c*9+Math.cos(a+2.5)*3.5,oy+s*9+Math.sin(a+2.5)*3.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox+c*9,oy+s*9);
      ctx.lineTo(ox+c*9+Math.cos(a-2.5)*3.5,oy+s*9+Math.sin(a-2.5)*3.5); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha=0.25; ctx.fillStyle='#fff';
    ctx.font='8px Lato,sans-serif'; ctx.textAlign='center';
    ctx.fillText('drag to rotate',ox,oy+ORB_R+14);
    ctx.globalAlpha=1;
  }

  function isOverOrb(mx,my){return Math.hypot(mx-orbX,my-orbY)<=ORB_R+8;}

  // Hover
  let hoverPi=-1;
  function checkHover(mx,my){
    if(bloomT<0.7){return;}
    const L=LAYERS[3]; // outer petals
    const lt=Math.max(0,Math.min((bloomT-L.startBloom)/Math.max(1-L.startBloom,0.01),1));
    const open=(1-Math.pow(1-lt,3))*L.maxOpen;
    let found=-1;
    for(let pi=0;pi<L.n;pi++){
      const angle=(pi/L.n)*Math.PI*2;
      const {left}=rosePetal(angle,open,L.scale,L.yBase,L.twist);
      const lp=left.map(p=>proj(p.x,p.y,p.z));
      const allX=lp.map(p=>p.x), allY=lp.map(p=>p.y);
      const pad=15;
      if(mx>=Math.min(...allX)-pad && mx<=Math.max(...allX)+pad &&
         my>=Math.min(...allY)-pad && my<=Math.max(...allY)+pad){
        found=pi; break;
      }
    }
    if(found!==hoverPi){
      hoverPi=found;
      if(found>=0){
        document.getElementById('reason-number').textContent=`#${found+1}`;
        document.getElementById('reason-text').textContent=REASONS[found%REASONS.length];
        document.getElementById('rose-reason').classList.add('visible');
      } else {
        document.getElementById('rose-reason')?.classList.remove('visible');
      }
    }
  }

  function onMouseDown(e){if(isOverOrb(e.clientX,e.clientY)){orbDrag=true;odx=e.clientX;ody=e.clientY;ocx=rotXTarget;ocy=rotYTarget;}}
  function onMouseMove(e){
    if(orbDrag){rotYTarget=ocy+(e.clientX-odx)*0.013;rotXTarget=ocx+(e.clientY-ody)*0.010;rotXTarget=Math.max(-1.2,Math.min(1.2,rotXTarget));}
    canvas.style.cursor=isOverOrb(e.clientX,e.clientY)?(orbDrag?'grabbing':'grab'):'default';
    checkHover(e.clientX,e.clientY);
  }
  function onMouseUp(){orbDrag=false;}
  let pinchDist0=null,zoom0=1;
  function pDist(e){const [a,b]=Array.from(e.touches);return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);}

  function onTouchStart(e){
    const tc=e.touches[0];
    if(e.touches.length===2){
      pinchDist0=pDist(e); zoom0=zoomTarget; orbDrag=false; return;
    }
    if(isOverOrb(tc.clientX,tc.clientY)){
      orbDrag=true;odx=tc.clientX;ody=tc.clientY;ocx=rotXTarget;ocy=rotYTarget;
    } else {
      // Direct drag on canvas
      orbDrag=false;
      odx=tc.clientX;ody=tc.clientY;ocx=rotXTarget;ocy=rotYTarget;
      checkHover(tc.clientX,tc.clientY);
    }
  }
  function onTouchMove(e){
    if(e.touches.length===2&&pinchDist0!==null){
      const d=pDist(e);
      zoomTarget=Math.max(0.4,Math.min(3.0,zoom0*(d/pinchDist0)));
      return;
    }
    if(!orbDrag&&e.touches.length===1){
      // Direct canvas drag
      const tc=e.touches[0];
      rotYTarget=ocy+(tc.clientX-odx)*0.013;
      rotXTarget=ocx+(tc.clientY-ody)*0.010;
      return;
    }
    if(!orbDrag)return;
    const tc=e.touches[0];
    rotYTarget=ocy+(tc.clientX-odx)*0.013;
    rotXTarget=ocx+(tc.clientY-ody)*0.010;
  }
  function onTouchEnd(){orbDrag=false;pinchDist0=null;}

  function buildFX(){
    bokeh=[];
    const isMobile = W <= 700;
    for(let i=0;i<55;i++){
      bokeh.push({
        x: isMobile ? Math.random() : 0.43+Math.random()*0.55,
        y: isMobile ? Math.random()*0.55 : Math.random(),
        r:8+Math.random()*32,
        c:['#f9a8d4','#a78bfa','#7dd3fc','#6ee7b7','#fde68a'][Math.floor(Math.random()*5)],
        a:0.04+Math.random()*0.09,
        ph:Math.random()*Math.PI*2, spd:0.15+Math.random()*0.25,
      });
    }
    sparkles=[];
    for(let i=0;i<100;i++){
      const ang=Math.random()*Math.PI*2;
      const r=0.25+Math.random()*0.95;
      sparkles.push({
        x:Math.cos(ang)*r, y:-0.4+Math.random()*1.1, z:Math.sin(ang)*r*0.4,
        sz:Math.random()*2.5+0.5,
        c:['#ffffff','#fce4ec','#c084fc','#7dd3fc','#fde68a','#f9a8d4'][Math.floor(Math.random()*6)],
        ph:Math.random()*Math.PI*2, spd:0.3+Math.random()*0.7, ts:1+Math.random()*2,
      });
    }
  }

  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
    const isMobile = W <= 700;
    if (isMobile) {
      RCX=W*0.50; RCY=H*0.28;
      orbX=W*0.88; orbY=H*0.50;
    } else {
      RCX=W*0.67; RCY=H*0.48;
      orbX=W*0.91; orbY=H*0.87;
    }
  }

  function init(){
    canvas=document.getElementById('rose-canvas');
    ctx=canvas.getContext('2d');
    resize(); buildFX();
    window.addEventListener('resize',()=>{ resize(); buildFX(); });
    canvas.addEventListener('mousedown',onMouseDown);
    window.addEventListener('mousemove',onMouseMove);
    window.addEventListener('mouseup',onMouseUp);
    canvas.addEventListener('touchstart',onTouchStart,{passive:true});
    window.addEventListener('touchmove',onTouchMove,{passive:true});
    window.addEventListener('touchend',onTouchEnd);
    requestAnimationFrame(tick);
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init) : init();
})();
