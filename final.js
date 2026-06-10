(function () {
  'use strict';

  /* ══════════════════════════════════════
     CONFIG
  ══════════════════════════════════════ */
  const COLORS = ['#c0143c','#e0365a','#f48fb1','#ff6b8a','#fce4ec','#d4a853','#f0d080'];

  let W, H, CX, CY;
  const canvas = document.getElementById('final-canvas');
  const ctx    = canvas.getContext('2d');

  /* ══════════════════════════════════════
     STATE
  ══════════════════════════════════════ */
  // Phase: 'zoom' (3.5s) → 'assemble' (3s) → 'content'
  let phase      = 'zoom';
  let phaseT     = 0;
  let lastTime   = 0;
  let contentShown = false;
  let navShown     = false;

  /* ══════════════════════════════════════
     BACKGROUND STARS
  ══════════════════════════════════════ */
  const bgStars = [];
  function initBgStars() {
    for (let i = 0; i < 260; i++) bgStars.push({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.2,
      a: Math.random() * 0.55 + 0.1,
      ph: Math.random() * Math.PI * 2,
      sp: 0.2 + Math.random() * 0.5,
      col: Math.random() < 0.12 ? COLORS[Math.floor(Math.random()*3)] : '#ffffff',
    });
  }
  function drawBgStars(t, alpha = 1) {
    for (const s of bgStars) {
      ctx.globalAlpha = s.a * alpha * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      ctx.fillStyle = s.col;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ══════════════════════════════════════
     CHAPTER ORBS — particle clusters
     appear in corners, fade before content
  ══════════════════════════════════════ */
  const CHAPTERS = [
    { label:'Chapter One',   color:'#c0143c', tx:0.15, ty:0.18, href:'index.html'    },
    { label:'Chapter Two',   color:'#f48fb1', tx:0.85, ty:0.18, href:'flower.html'   },
    { label:'Chapter Three', color:'#7dd3fc', tx:0.15, ty:0.82, href:'timeline.html' },
    { label:'Chapter Four',  color:'#d4a853', tx:0.85, ty:0.82, href:'galaxy.html'   },
  ];

  // Each orb has a particle cluster
  const orbParticles = CHAPTERS.map(ch => {
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 22;
      pts.push({ ox: Math.cos(a)*d, oy: Math.sin(a)*d,
        r: Math.random() * 2 + 0.5, a: Math.random() * 0.7 + 0.2,
        ph: Math.random() * Math.PI * 2, sp: 0.3 + Math.random() * 0.6 });
    }
    return pts;
  });

  function drawOrbs(t, progress, alpha) {
    if (alpha <= 0) return;
    CHAPTERS.forEach((ch, i) => {
      const delay = i * 0.12;
      const p     = Math.max(0, Math.min((progress - delay) / (1 - delay * 2), 1));
      const hoverBoost = (i === hoveredOrb) ? 1.5 : 1.0;
      const ep    = easeOut(p) * alpha * hoverBoost;
      if (ep <= 0) return;

      const ox = ch.tx * W, oy = ch.ty * H;

      // Particle cluster
      orbParticles[i].forEach(pt => {
        const twink = pt.a * ep * (0.5 + 0.5 * Math.sin(t * pt.sp + pt.ph));
        ctx.globalAlpha = twink;
        ctx.fillStyle = ch.color;
        ctx.beginPath();
        ctx.arc(ox + pt.ox, oy + pt.oy, pt.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Core glow
      const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, 30 * ep);
      grd.addColorStop(0, hexA(ch.color, 0.3 * ep));
      grd.addColorStop(1, hexA(ch.color, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(ox, oy, 30 * ep, 0, Math.PI * 2); ctx.fill();

      // Label
      if (p > 0.5) {
        ctx.globalAlpha = ((p - 0.5) / 0.5) * alpha;
        ctx.font = '300 11px Lato, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(ch.label, ox, oy + 32);
      }
      ctx.globalAlpha = 1;
    });
  }

  /* ══════════════════════════════════════
     3D PARTICLE HEART
     (center, assembles after zoom)
  ══════════════════════════════════════ */
  const heartPts = [];
  function buildHeartPts() {
    const N = 180;
    for (let i = 0; i < N; i++) {
      const theta = (i / N) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(theta), 3);
      const hy = -(13*Math.cos(theta) - 5*Math.cos(2*theta) - 2*Math.cos(3*theta) - Math.cos(4*theta));
      // scatter start
      const sa = Math.random() * Math.PI * 2;
      const sd = 120 + Math.random() * 160;
      heartPts.push({
        tx: hx, ty: hy,
        sx: Math.cos(sa)*sd/48, sy: Math.sin(sa)*sd/48,
        x: 0, y: 0,
        col: COLORS[Math.floor(Math.random() * 4)],
        r: Math.random() * 2 + 1,
        ph: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 0.5,
        depth: 0,
      });
    }
    // Volume particles
    for (let i = 0; i < 60; i++) {
      const theta = Math.random() * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(theta), 3);
      const hy = -(13*Math.cos(theta) - 5*Math.cos(2*theta) - 2*Math.cos(3*theta) - Math.cos(4*theta));
      const sa = Math.random() * Math.PI * 2, sd = 80 + Math.random() * 200;
      heartPts.push({
        tx: hx * (0.6 + Math.random()*0.38),
        ty: hy * (0.6 + Math.random()*0.38),
        sx: Math.cos(sa)*sd/48, sy: Math.sin(sa)*sd/48,
        x:0, y:0,
        col: COLORS[Math.floor(Math.random()*COLORS.length)],
        r: Math.random() * 1.5 + 0.5,
        ph: Math.random()*Math.PI*2, sp: 0.3+Math.random()*0.6,
        depth: Math.random(),
      });
    }
    for (const p of heartPts) { p.x = p.sx; p.y = p.sy; }
  }

  let heartRotY = 0;
  function drawHeart(t, assembleP, alpha) {
    if (alpha <= 0) return;
    const e    = easeOut(assembleP);
    const beat = 1 + 0.1 * Math.sin(t * 2.8);
    const S    = Math.min(W, H) * (W > 700 ? 0.038 : 0.032);
    heartRotY += 0.008;

    for (const p of heartPts) {
      p.x = p.sx + (p.tx - p.sx) * e;
      p.y = p.sy + (p.ty - p.sy) * e;

      // 3D rotate Y
      const cosY = Math.cos(heartRotY), sinY = Math.sin(heartRotY);
      const rx   = p.x * cosY;
      const rz   = p.x * sinY;
      const depth = 0.4 + 0.6 * (rz / 16 * 0.5 + 0.5);

      const sx = CX + rx * S * beat;
      const sy = CY + p.y * S * beat * 0.9;

      const twink = 0.6 + 0.4 * Math.sin(t * p.sp + p.ph);
      ctx.globalAlpha = (0.5 + 0.5 * depth) * alpha * twink;

      // Radial glow per particle
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.r * 2.5 * depth);
      gr.addColorStop(0, p.col + 'ff');
      gr.addColorStop(1, p.col + '00');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(sx, sy, p.r * 2.5 * depth, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ══════════════════════════════════════
     CONFETTI + FIREFLIES
  ══════════════════════════════════════ */
  const confetti = [];
  const fireflies = [];

  function spawnConfetti() {
    const cols = ['#c0143c','#f48fb1','#d4a853','#ffffff','#f0d080','#e0365a','#7dd3fc'];
    for (let i = 0; i < 140; i++) {
      const a = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.6;
      confetti.push({
        x: CX + (Math.random()-0.5)*W*0.5,
        y: CY - 20,
        vx: Math.cos(a)*(150+Math.random()*350),
        vy: Math.sin(a)*(150+Math.random()*350) - 80,
        grav: 200+Math.random()*150,
        w: 6+Math.random()*8, h: 3+Math.random()*4,
        rot: Math.random()*Math.PI*2, vrot: (Math.random()-0.5)*7,
        col: cols[Math.floor(Math.random()*cols.length)],
        life: 1, decay: 0.003+Math.random()*0.004,
      });
    }
  }

  function initFireflies() {
    for (let i = 0; i < 32; i++) {
      fireflies.push({
        x: Math.random()*W, y: Math.random()*H,
        r: 1.5+Math.random()*2.5,
        a: 0.1+Math.random()*0.5,
        ph: Math.random()*Math.PI*2,
        sp: 0.4+Math.random()*0.6,
        fx: (Math.random()-0.5)*60, fy: (Math.random()-0.5)*50,
        col: Math.random()<0.5 ? '#d4a853' : '#f48fb1',
      });
    }
  }

  let lastDt = 0;
  function drawConfetti(dt) {
    for (let i = confetti.length-1; i >= 0; i--) {
      const c = confetti[i];
      c.x += c.vx*dt; c.y += c.vy*dt; c.vy += c.grav*dt;
      c.vx *= 0.995; c.rot += c.vrot*dt; c.life -= c.decay;
      if (c.life <= 0 || c.y > H+40) { confetti.splice(i,1); continue; }
      ctx.save();
      ctx.globalAlpha = c.life;
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.col;
      ctx.fillRect(-c.w/2, -c.h/2, c.w, c.h);
      ctx.restore();
    }
  }

  function drawFireflies(t) {
    for (const f of fireflies) {
      const a = f.a * (0.4 + 0.6 * Math.sin(t * f.sp + f.ph));
      const ox = Math.sin(t*0.35+f.ph)*f.fx, oy = Math.cos(t*0.28+f.ph)*f.fy;
      const grd = ctx.createRadialGradient(f.x+ox, f.y+oy, 0, f.x+ox, f.y+oy, f.r*4);
      grd.addColorStop(0, f.col === '#d4a853' ? `rgba(212,168,83,${a})` : `rgba(244,143,177,${a})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(f.x+ox, f.y+oy, f.r*4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = a*0.9;
      ctx.beginPath(); ctx.arc(f.x+ox, f.y+oy, 1.2, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* ══════════════════════════════════════
     SHOOTING STARS
  ══════════════════════════════════════ */
  const shooters = [];
  let nextShot = 2;
  function maybeShoot(t) {
    if (t > nextShot && shooters.length < 3) {
      nextShot = t + 4 + Math.random() * 6;
      shooters.push({ x: Math.random()*W*0.6, y: Math.random()*H*0.35, vx: 3+Math.random()*5, vy: 1+Math.random()*2, life: 1, len: 70+Math.random()*90 });
    }
    for (let i = shooters.length-1; i >= 0; i--) {
      const s = shooters[i];
      s.x += s.vx; s.y += s.vy; s.life -= 0.015;
      if (s.life <= 0) { shooters.splice(i,1); continue; }
      const grd = ctx.createLinearGradient(s.x-s.vx*8, s.y-s.vy*8, s.x, s.y);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(1, `rgba(255,220,240,${s.life*0.85})`);
      ctx.strokeStyle = grd; ctx.lineWidth = 1.5*s.life;
      ctx.globalAlpha = s.life;
      ctx.beginPath(); ctx.moveTo(s.x-s.len*(s.vx/6), s.y-s.len*(s.vy/6)); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ══════════════════════════════════════
     MAIN LOOP
  ══════════════════════════════════════ */
  function tick(ts) {
    requestAnimationFrame(tick);
    const t  = ts * 0.001;
    const dt = Math.min(t - lastTime, 0.05); lastTime = t;

    // Trail fade (not full clear — particle trail effect)
    ctx.fillStyle = 'rgba(2,0,10,0.18)';
    ctx.fillRect(0, 0, W, H);

    drawBgStars(t);
    maybeShoot(t);

    phaseT += dt;

    if (phase === 'zoom') {
      // 3.5s: chapter orbs fly in from corners
      const p = Math.min(phaseT / 3.5, 1);
      drawOrbs(t, p, 1);
      if (p >= 1) { phase = 'fade'; phaseT = 0; }
    }
    else if (phase === 'fade') {
      // 1.2s: orbs fade out
      const p   = Math.min(phaseT / 1.2, 1);
      const oA  = 1 - easeOut(p);
      drawOrbs(t, 1, oA);
      if (p >= 1) { phase = 'assemble'; phaseT = 0; }
    }
    else if (phase === 'assemble') {
      // 3s: heart assembles from particles
      const p = Math.min(phaseT / 3.0, 1);
      drawHeart(t, p, 1);
      if (p >= 0.6 && !contentShown) { showContent(); contentShown = true; }
      if (p >= 1) { phase = 'done'; spawnConfetti(); }
    }
    else if (phase === 'done') {
      drawOrbs(t, 1, 0.7); // orbs stay visible at reduced alpha
      drawHeart(t, 1, 1);
      drawFireflies(t);
      drawConfetti(dt);
    }
  }

  /* ══════════════════════════════════════
     SHOW / HIDE
  ══════════════════════════════════════ */
  function showContent() {
    const el = document.getElementById('final-content');
    el.classList.add('visible');
  }
  function showNav() {
    document.getElementById('final-nav').classList.add('visible');
  }

  /* ══════════════════════════════════════
     MOON EASTER EGG
  ══════════════════════════════════════ */
  function initMoon() {
    const btn  = document.getElementById('moon-btn');
    const prog = document.getElementById('moon-progress');
    const fill = document.getElementById('moon-fill');
    const overlay = document.getElementById('secret-overlay');
    let clicks = 0;

    btn.addEventListener('click', () => {
      clicks = Math.min(clicks + 1, 5);
      prog.classList.add('show');
      fill.style.width = (clicks / 5 * 100) + '%';
      btn.style.transform = `scale(1.4) rotate(${(Math.random()-0.5)*25}deg)`;
      setTimeout(() => { btn.style.transform = ''; }, 280);
      if (clicks >= 5) {
        btn.classList.add('lit');
        setTimeout(() => overlay.classList.add('show'), 500);
      }
    });

    document.getElementById('secret-close').addEventListener('click', () => {
      overlay.classList.remove('show');
    });

    // Secret star particle canvas
    const sc = document.getElementById('secret-star-canvas');
    const sx = sc.getContext('2d');
    const sPts = [];
    for (let i = 0; i < 30; i++) {
      const a = (i/30)*Math.PI*2, d = 10+Math.random()*20;
      sPts.push({ x: 40+Math.cos(a)*d, y: 40+Math.sin(a)*d, r: Math.random()*2+0.5, ph: Math.random()*Math.PI*2, sp: 0.3+Math.random()*0.6, col: COLORS[Math.floor(Math.random()*COLORS.length)] });
    }
    function tickStar(ts) {
      requestAnimationFrame(tickStar);
      const t = ts*0.001;
      sx.clearRect(0,0,80,80);
      sPts.forEach(p => {
        sx.globalAlpha = 0.5+0.5*Math.sin(t*p.sp+p.ph);
        sx.fillStyle = p.col;
        sx.beginPath(); sx.arc(p.x, p.y, p.r, 0, Math.PI*2); sx.fill();
      });
      sx.globalAlpha = 1;
    }
    requestAnimationFrame(tickStar);
  }

  /* ══════════════════════════════════════
     RESIZE + INIT
  ══════════════════════════════════════ */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    CX = W / 2; CY = H / 2;
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    initBgStars();
    buildHeartPts();
    initFireflies();
    initMoon();
    initOrbInteraction();
    requestAnimationFrame(tick);
  }

  /* ══════════════════════════════════════
     ORB INTERACTION
  ══════════════════════════════════════ */
  let hoveredOrb = -1;

  function initOrbInteraction() {
    function orbAt(mx, my) {
      if (phase !== 'done') return -1;
      for (let i = 0; i < CHAPTERS.length; i++) {
        const ch = CHAPTERS[i];
        const ox = ch.tx * W, oy = ch.ty * H;
        if (Math.hypot(mx - ox, my - oy) < 38) return i;
      }
      return -1;
    }

    canvas.addEventListener('mousemove', e => {
      const idx = orbAt(e.clientX, e.clientY);
      hoveredOrb = idx;
      canvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
    });

    canvas.addEventListener('click', e => {
      const idx = orbAt(e.clientX, e.clientY);
      if (idx >= 0) window.location.href = CHAPTERS[idx].href;
    });

    canvas.addEventListener('touchend', e => {
      const tc = e.changedTouches[0];
      const idx = orbAt(tc.clientX, tc.clientY);
      if (idx >= 0) window.location.href = CHAPTERS[idx].href;
    });
  }

  /* helpers */
  function easeOut(t) { return 1 - Math.pow(1 - Math.min(t,1), 3); }
  function hexA(hex, a) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  init();
})();
