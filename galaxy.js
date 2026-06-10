/* =============================================
   GALAXY.JS — Chapter 4: Memory Galaxy

   ┌──────────────────────────────────────────┐
   │  ✏️  EDIT YOUR MEMORIES HERE             │
   │  spotify: paste embed src URL or null    │
   └──────────────────────────────────────────┘
*/
const MEMORIES = [
  { title:"Our First Movie",    date:"A Perfect Evening",  desc:"We picked the worst film and laughed through all of it. I barely watched the screen — I was watching you.", icon:"🎬", color:"#f48fb1", size:1.3, spotify:null },
  { title:"That Rainy Day",     date:"When It Poured",     desc:"Stuck inside, nowhere to be. You made a whole adventure out of a Tuesday afternoon. That's your magic.",   icon:"🌧️", color:"#7dd3fc", size:1.0, spotify:null },
  { title:"Our First Gift",     date:"A Surprise",         desc:"It wasn't about what it was. It was about knowing you thought of me. That feeling — I'll keep it forever.", icon:"🎁", color:"#fde68a", size:1.1, spotify:null },
  { title:"Our First Long Call",date:"3 Hours Later…",     desc:"Neither of us wanted to hang up. We talked about everything and nothing and everything again.",             icon:"📞", color:"#c084fc", size:1.0, spotify:null },
  { title:"Your Birthday",      date:"The Best Day",       desc:"I wanted every second to feel as special as you make me feel every single day. I hope I got close.",        icon:"🎂", color:"#f97316", size:1.4, spotify:null },
  { title:"Our Anniversary",    date:"Right Now",          desc:"One full year of choosing each other. Again. And again. And again.",                                        icon:"❤️",  color:"#e0365a", size:1.6, spotify:null },
  { title:"First Trip Together",date:"An Adventure",       desc:"New place, same feeling — wherever you are is home. The photos don't do it justice.",                       icon:"✈️", color:"#6ee7b7", size:1.1, spotify:null },
  { title:"Our Song",           date:"Every Time It Plays",desc:"No matter where I hear it — in a shop, on the radio, at 2am — I think of you instantly.",                   icon:"🎵", color:"#f9a8d4", size:1.2, spotify:null },
];

/* ============================================================
   ↓ Core — no need to edit below
   ============================================================ */
(function () {
  'use strict';

  let canvas, ctx, W, H, CX, CY;
  let rotX = 0.22, rotY = 0.0;
  let targetRotX = 0.22, targetRotY = 0.0;
  let zoom = 1.0, targetZoom = 1.0;
  let isDragging = false, lastMX = 0, lastMY = 0;
  let autoRotate = true;
  let hoveredIdx = -1;
  let elapsed = 0;
  let tooltip;

  /* ---- 3D star memory objects ---- */
  let memStars = [];

  /* ---- Background galaxy layers ---- */
  let bgStars  = [];   // thousands of tiny stars
  let nebulae  = [];   // soft colour clouds
  let shooters = [];   // occasional shooting stars

  const GALAXY_R = 0.40; // fraction of min(W,H) for memory star radius

  /* ======================================================
     BUILD SCENE
     ====================================================== */
  function buildScene() {
    buildMemStars();
    buildBgStars();
    buildNebulae();
  }

  /* Memory stars — on a sphere shell */
  function buildMemStars() {
    memStars = MEMORIES.map((mem, i) => {
      const golden = Math.PI * (3 - Math.sqrt(5));
      const y  = 1 - (i / (MEMORIES.length - 1)) * 2;
      const r  = Math.sqrt(1 - y * y);
      const th = golden * i;
      const sc = 0.38;
      return {
        mem,
        ox: Math.cos(th) * r + (Math.random() - 0.5) * 0.3,
        oy: y * 0.7          + (Math.random() - 0.5) * 0.2,
        oz: Math.sin(th) * r + (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.4,
        twinkle: Math.random() * Math.PI * 2,
      };
    });
  }

  /* Background stars — real galaxy feel */
  function buildBgStars() {
    bgStars = [];
    const count = 1800;
    for (let i = 0; i < count; i++) {
      // Milky-Way-like disc distribution
      const arm   = Math.floor(Math.random() * 3); // 3 spiral arms
      const angle = arm * (Math.PI * 2 / 3) + Math.random() * 1.6;
      const dist  = 0.1 + Math.pow(Math.random(), 0.6) * 1.4;
      const spread = 0.08 + dist * 0.18;
      bgStars.push({
        // 3D position
        x: Math.cos(angle) * dist + (Math.random() - 0.5) * spread,
        y: (Math.random() - 0.5) * 0.35,          // thin disc
        z: Math.sin(angle) * dist + (Math.random() - 0.5) * spread,
        // Display
        r:    0.15 + Math.pow(Math.random(), 3) * 2.2,
        a:    0.15 + Math.random() * 0.65,
        ph:   Math.random() * Math.PI * 2,
        sp:   0.1 + Math.random() * 0.5,
        hue:  Math.random() < 0.15 ? pickStarColor() : '#ffffff',
        core: Math.random() < 0.04, // extra bright core stars
      });
    }
  }

  function pickStarColor() {
    const palette = ['#ffd6d6','#ffe4b5','#d6e4ff','#e0d6ff','#d6ffe4','#ffcce0'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  /* Nebula colour clouds */
  function buildNebulae() {
    nebulae = [
      { cx:0.55, cy:0.42, rx:0.28, ry:0.18, color:'rgba(80,0,120,', a:0.055, angle: 0.3 },
      { cx:0.38, cy:0.58, rx:0.22, ry:0.14, color:'rgba(140,0,60,',  a:0.045, angle:-0.5 },
      { cx:0.62, cy:0.62, rx:0.18, ry:0.12, color:'rgba(0,40,100,',  a:0.04,  angle: 1.1 },
      { cx:0.45, cy:0.30, rx:0.20, ry:0.10, color:'rgba(100,0,80,',  a:0.035, angle:-0.2 },
    ];
  }

  /* ======================================================
     3-D PROJECTION
     ====================================================== */
  function project(x, y, z) {
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const x1 =  x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const y1 =  y * cx - z1 * sx;
    const z2 =  y * sx + z1 * cx;
    const FOV = 560;
    const sc  = (FOV / (FOV + z2 * 260)) * zoom;
    const S   = Math.min(W, H) * GALAXY_R;
    return { sx: CX + x1 * S * sc, sy: CY + y1 * S * sc, sc, d: z2 };
  }

  /* ======================================================
     RENDER
     ====================================================== */
  function tick(ts) {
    requestAnimationFrame(tick);
    elapsed = ts * 0.001;

    // Smooth camera
    if (autoRotate && !isDragging) targetRotY += 0.0025;
    rotX += (targetRotX - rotX) * 0.07;
    rotY += (targetRotY - rotY) * 0.07;
    zoom += (targetZoom  - zoom) * 0.10;

    // Trail fade
    ctx.fillStyle = 'rgba(2,0,10,0.22)';
    ctx.fillRect(0, 0, W, H);

    drawNebulae();
    drawBgStars();
    maybeShootingStar();
    drawConstLines();
    drawMemStars();
  }

  /* Soft nebula clouds */
  function drawNebulae() {
    for (const n of nebulae) {
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.18 + n.angle);
      const gx = W * n.cx, gy = H * n.cy;
      const rx = W * n.rx * pulse, ry = H * n.ry * pulse;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(n.angle + elapsed * 0.008);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0,   n.color + (n.a * 1.4) + ')');
      g.addColorStop(0.5, n.color + n.a + ')');
      g.addColorStop(1,   n.color + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* Background star field */
  function drawBgStars() {
    for (const s of bgStars) {
      const p = project(s.x, s.y, s.z);
      if (p.sc <= 0) continue;
      const twink = s.a * (0.55 + 0.45 * Math.sin(elapsed * s.sp + s.ph));
      const r = s.r * p.sc * (s.core ? 2.2 : 1.0);

      if (s.core) {
        // Bright core star with small glow
        const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 4);
        grd.addColorStop(0,   s.hue === '#ffffff' ? 'rgba(255,255,255,0.9)' : s.hue + 'dd');
        grd.addColorStop(0.3, s.hue === '#ffffff' ? 'rgba(255,255,255,0.3)' : s.hue + '55');
        grd.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.globalAlpha = twink;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = twink;
      ctx.fillStyle = s.hue;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, Math.max(0.3, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* Shooting star (occasional) */
  let nextShooter = 4;
  function maybeShootingStar() {
    if (elapsed > nextShooter && shooters.length < 2) {
      nextShooter = elapsed + 5 + Math.random() * 8;
      shooters.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.4,
        vx: 4 + Math.random() * 5,
        vy: 1.5 + Math.random() * 2,
        life: 1.0,
        len: 60 + Math.random() * 80,
      });
    }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.x += s.vx; s.y += s.vy; s.life -= 0.018;
      if (s.life <= 0) { shooters.splice(i, 1); continue; }
      const grd = ctx.createLinearGradient(s.x - s.vx * 8, s.y - s.vy * 8, s.x, s.y);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(1, `rgba(255,220,240,${s.life * 0.9})`);
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.5 * s.life;
      ctx.globalAlpha = s.life;
      ctx.beginPath();
      ctx.moveTo(s.x - s.len * (s.vx / 6), s.y - s.len * (s.vy / 6));
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* Constellation lines between nearby memory stars */
  function drawConstLines() {
    const THRESH = 0.52 * 0.52;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < memStars.length; i++) {
      for (let j = i + 1; j < memStars.length; j++) {
        const a = memStars[i], b = memStars[j];
        const d2 = (a.ox-b.ox)**2 + (a.oy-b.oy)**2 + (a.oz-b.oz)**2;
        if (d2 > THRESH) continue;
        const pa = project(a.ox, a.oy, a.oz);
        const pb = project(b.ox, b.oy, b.oz);
        const pulse = 0.35 + 0.2 * Math.sin(elapsed * 0.6 + i + j);
        ctx.globalAlpha = 0.07 * pulse;
        ctx.strokeStyle = '#f9a8d4';
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* Memory stars */
  function drawMemStars() {
    const proj = memStars.map((s, i) => ({ s, i, p: project(s.ox, s.oy, s.oz) }));
    proj.sort((a, b) => b.p.d - a.p.d);

    for (const { s, i, p } of proj) {
      const hov   = i === hoveredIdx;
      const tw    = 0.72 + 0.28 * Math.sin(elapsed * s.speed + s.twinkle);
      const baseR = 4.5 * s.mem.size * p.sc * tw;
      const col   = s.mem.color;

      // Outer glow
      const glowR = baseR * (hov ? 5.5 : 3.8);
      const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, glowR);
      grd.addColorStop(0,   col + (hov ? 'cc' : '77'));
      grd.addColorStop(0.4, col + '33');
      grd.addColorStop(1,   col + '00');
      ctx.globalAlpha = hov ? 1 : 0.9;
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Bright white core
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, baseR * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Cross sparkle on hover
      if (hov) {
        const arm = baseR * 3.5;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(p.sx - arm, p.sy); ctx.lineTo(p.sx + arm, p.sy);
        ctx.moveTo(p.sx, p.sy - arm); ctx.lineTo(p.sx, p.sy + arm);
        ctx.stroke();

        // Diagonal arms (8-point star)
        const arm2 = arm * 0.6;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(p.sx - arm2, p.sy - arm2); ctx.lineTo(p.sx + arm2, p.sy + arm2);
        ctx.moveTo(p.sx + arm2, p.sy - arm2); ctx.lineTo(p.sx - arm2, p.sy + arm2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ======================================================
     ORB CONTROLLER (like flower page)
     ====================================================== */
  let orbCanvas, orbCtx, orbDrag = false;
  let orbOdx = 0, orbOdy = 0, orbOcx = 0, orbOcy = 0;
  const ORB_R = 22;

  function initOrb() {
    const wrap = document.getElementById('orb-wrap');
    if (!wrap) return;
    orbCanvas = document.createElement('canvas');
    orbCanvas.width  = 64;
    orbCanvas.height = 64;
    orbCanvas.style.cssText = 'width:64px;height:64px;display:block;';
    wrap.appendChild(orbCanvas);
    orbCtx = orbCanvas.getContext('2d');

    orbCanvas.addEventListener('mousedown', e => {
      orbDrag = true; autoRotate = false;
      orbOdx = e.clientX; orbOdy = e.clientY;
      orbOcx = targetRotX; orbOcy = targetRotY;
      e.stopPropagation();
    });
    window.addEventListener('mouseup', () => {
      if (orbDrag) { orbDrag = false; setTimeout(() => { autoRotate = true; }, 1800); }
    });
    orbCanvas.addEventListener('touchstart', e => {
      const tc = e.touches[0];
      orbDrag = true; autoRotate = false;
      orbOdx = tc.clientX; orbOdy = tc.clientY;
      orbOcx = targetRotX; orbOcy = targetRotY;
      e.stopPropagation();
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (!orbDrag || !e.touches[0]) return;
      const tc = e.touches[0];
      targetRotY = orbOcy + (tc.clientX - orbOdx) * 0.010;
      targetRotX = orbOcx + (tc.clientY - orbOdy) * 0.010;
      targetRotX = Math.max(-1.3, Math.min(1.3, targetRotX));
    }, { passive: true });

    requestAnimationFrame(drawOrb);
  }

  function drawOrb() {
    requestAnimationFrame(drawOrb);
    if (!orbCtx) return;
    orbCtx.clearRect(0, 0, 64, 64);
    const cx = 32, cy = 32;

    // Outer glow
    const g = orbCtx.createRadialGradient(cx, cy, 0, cx, cy, ORB_R * 2.5);
    g.addColorStop(0, 'rgba(192,20,60,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    orbCtx.fillStyle = g;
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, ORB_R * 2.5, 0, Math.PI * 2);
    orbCtx.fill();

    // Orb circle
    const fg = orbCtx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, ORB_R);
    fg.addColorStop(0, orbDrag ? 'rgba(255,120,160,0.3)' : 'rgba(192,20,60,0.14)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    orbCtx.fillStyle = fg;
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, ORB_R, 0, Math.PI * 2);
    orbCtx.fill();

    orbCtx.strokeStyle = orbDrag ? 'rgba(255,160,190,0.95)' : 'rgba(192,20,60,0.55)';
    orbCtx.lineWidth = 1.2;
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, ORB_R, 0, Math.PI * 2);
    orbCtx.stroke();

    // Cross arrows
    orbCtx.strokeStyle = orbDrag ? 'rgba(255,200,220,0.95)' : 'rgba(255,255,255,0.5)';
    orbCtx.lineWidth = 1;
    const a = 6;
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx, dy]) => {
      orbCtx.beginPath();
      orbCtx.moveTo(cx + dx * (ORB_R - a - 2), cy + dy * (ORB_R - a - 2));
      orbCtx.lineTo(cx + dx * (ORB_R - 2),     cy + dy * (ORB_R - 2));
      orbCtx.stroke();
    });

    // Label
    orbCtx.fillStyle = 'rgba(255,255,255,0.2)';
    orbCtx.font = '6px Lato, sans-serif';
    orbCtx.textAlign = 'center';
    orbCtx.fillText('drag', cx, cy + ORB_R + 10);
  }

  /* ======================================================
     INTERACTION — canvas only handles drag in non-UI zone
     ====================================================== */
  function starAt(mx, my) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < memStars.length; i++) {
      const p   = project(memStars[i].ox, memStars[i].oy, memStars[i].oz);
      const hit = 20 * memStars[i].mem.size * p.sc + 10;
      const d   = Math.hypot(mx - p.sx, my - p.sy);
      if (d < hit && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function onMouseMove(e) {
    const mx = e.clientX, my = e.clientY;

    // Orb drag rotation (only via orb)
    if (orbDrag) {
      targetRotY = orbOcy + (mx - orbOdx) * 0.010;
      targetRotX = orbOcx + (my - orbOdy) * 0.010;
      targetRotX = Math.max(-1.3, Math.min(1.3, targetRotX));
      return;
    }

    // Hover star detection only — no canvas drag
    const idx = starAt(mx, my);
    if (idx !== hoveredIdx) {
      hoveredIdx = idx;
      canvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
      idx >= 0 ? showTip(idx, mx, my) : hideTip();
    } else if (idx >= 0) {
      tooltip.style.left = mx + 'px';
      tooltip.style.top  = my + 'px';
    }
  }

  function onMouseDown(e) {
    // Canvas clicks only open memory cards — no drag
    if (e.target !== canvas) return;
  }
  function onMouseUp(e) {
    if (e.target !== canvas) return;
    if (hoveredIdx >= 0) openCard(hoveredIdx);
  }

  function onTouchStart(e) {
    if (e.target !== canvas) return;
    const tc = e.touches[0];
    lastMX = tc.clientX; lastMY = tc.clientY;
  }
  function onTouchMove(e) {
    // No canvas drag — only orb controls rotation
  }
  function onTouchEnd(e) {
    if (orbDrag) { orbDrag = false; setTimeout(() => { autoRotate = true; }, 1800); return; }
    if (e.target !== canvas && !e.changedTouches[0]) return;
    if (e.changedTouches[0]) {
      const tc   = e.changedTouches[0];
      const moved = Math.hypot(tc.clientX - lastMX, tc.clientY - lastMY);
      if (moved < 12) {
        const idx = starAt(tc.clientX, tc.clientY);
        if (idx >= 0) openCard(idx);
      }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    targetZoom = Math.max(0.4, Math.min(3.2, targetZoom - e.deltaY * 0.001));
  }

  /* ======================================================
     TOOLTIP
     ====================================================== */
  function showTip(idx, mx, my) {
    tooltip.textContent = memStars[idx].mem.title;
    tooltip.style.left  = mx + 'px';
    tooltip.style.top   = my + 'px';
    tooltip.classList.add('visible');
  }
  function hideTip() { tooltip.classList.remove('visible'); }

  /* ======================================================
     MEMORY CARD
     ====================================================== */
  let overlayEl;

  function openCard(idx) {
    const mem = memStars[idx].mem;
    document.getElementById('mem-date').textContent  = mem.date;
    document.getElementById('mem-title').textContent = mem.title;
    document.getElementById('mem-desc').textContent  = mem.desc;
    document.getElementById('mem-star-icon').textContent = mem.icon;

    const spotEl = document.getElementById('mem-spotify');
    spotEl.innerHTML = mem.spotify
      ? `<iframe style="border-radius:6px" src="${mem.spotify}"
           width="100%" height="80" frameBorder="0"
           allowfullscreen allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"
           loading="lazy"></iframe>` : '';

    spawnBurst(mem.color);
    overlayEl.classList.add('open');
    overlayEl.setAttribute('aria-hidden', 'false');
    autoRotate = false;
    document.getElementById('rotate-hint')?.classList.add('hidden');
  }

  function closeCard() {
    overlayEl.classList.remove('open');
    overlayEl.setAttribute('aria-hidden', 'true');
    document.getElementById('mem-spotify').innerHTML = '';
    setTimeout(() => { autoRotate = true; }, 1400);
  }

  function spawnBurst(color) {
    const container = document.getElementById('mem-particles');
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const p  = document.createElement('div');
      p.className = 'mem-particle';
      const ang = (i / 20) * Math.PI * 2;
      const d   = 40 + Math.random() * 70;
      p.style.cssText = `width:${4+Math.random()*6}px;height:${4+Math.random()*5}px;
        background:${color};left:50%;top:50%;
        --bx:${Math.cos(ang)*d}px;--by:${Math.sin(ang)*d}px;
        animation-delay:${Math.random()*0.2}s;opacity:0.9;
        box-shadow:0 0 6px ${color};`;
      container.appendChild(p);
    }
  }

  /* ======================================================
     RESIZE
     ====================================================== */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const mob = W <= 700;
    CX = mob ? W * 0.50 : W * 0.62;
    CY = mob ? H * 0.34 : H * 0.50;
    buildBgStars(); // rebuild so density fits new viewport
  }

  /* ======================================================
     INIT
     ====================================================== */
  function init() {
    canvas    = document.getElementById('galaxy-canvas');
    ctx       = canvas.getContext('2d');
    overlayEl = document.getElementById('mem-overlay');

    tooltip = document.createElement('div');
    tooltip.id = 'star-tooltip';
    document.body.appendChild(tooltip);

    resize();
    buildScene();
    window.addEventListener('resize', resize);

    initOrb();

    canvas.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('mouseup',    e => { orbDrag = false; onMouseUp(e); });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   e => { onTouchEnd(e); });
    canvas.addEventListener('wheel',      onWheel, { passive: false });

    document.getElementById('mem-close').addEventListener('click', closeCard);
    overlayEl.addEventListener('click', e => { if (e.target === overlayEl) closeCard(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });

    requestAnimationFrame(tick);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
