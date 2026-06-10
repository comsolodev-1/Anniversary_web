/* =============================================
   HERO.JS — Text LEFT | 3D Particle Heart RIGHT
   + floating mini hearts around it
   ============================================= */
(function () {
  'use strict';

  /* ---- Config ---- */
  const PARTICLE_COUNT = 2000;
  const ASSEMBLE_SPEED = 0.014;
  const HEART_SCALE_DESKTOP = 52;
  const HEART_SCALE_MOBILE  = 30;   // smaller so whole heart fits in top half
  let   HEART_SCALE    = 52;
  const DRIFT_AMP      = 0.7;
  const COLORS = ['#c0143c','#e0365a','#f48fb1','#ff6b8a','#ff2d55','#fce4ec','#ff6b9d'];

  /* ---- 3D camera ---- */
  let rotX = -0.2, rotY = 0.3;
  let targetRotX = -0.2, targetRotY = 0.3;
  let zoom = 1.0, targetZoom = 1.0;
  let isDragging = false, lastMX = 0, lastMY = 0;
  let autoRotate = true;

  /* ---- Canvas ---- */
  let canvas, ctx, W, H, rightCX, rightCY;

  /* ---- Main heart particles ---- */
  let particles = [];
  let assembleT = 0, assembled = false, contentShown = false;

  /* ---- Floating mini hearts ---- */
  const FLOAT_COUNT = 18;
  let floaters = [];

  /* ---- Heart equation ---- */
  function heartXY(t) {
    const s = Math.sin(t);
    return {
      x:  16 * s * s * s,
      y: -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t))
    };
  }

  /* ---- 3D projection ---- */
  function project(x, y, z) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 =  x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const y1 =  y * cosX - z1 * sinX;
    const z2 =  y * sinX + z1 * cosX;
    const fov = 600;
    const d   = fov + z2 * zoom;
    const sc  = (fov / d) * zoom;
    return { sx: rightCX + x1 * HEART_SCALE * sc, sy: rightCY + y1 * HEART_SCALE * sc, scale: sc, depth: z2 };
  }

  /* ---- Build main particles ---- */
  function buildParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t  = (i / PARTICLE_COUNT) * Math.PI * 2;
      const hp = heartXY(t);
      const angle = Math.random() * Math.PI * 2;
      const elev  = (Math.random() - 0.5) * Math.PI;
      const r     = 80 + Math.random() * 140;
      const S     = HEART_SCALE;
      particles.push({
        tx: hp.x, ty: hp.y, tz: (Math.random()-0.5) * 1.5,
        sx: Math.cos(elev)*Math.cos(angle)*r/S,
        sy: Math.cos(elev)*Math.sin(angle)*r/S,
        sz: Math.sin(elev)*r/S,
        x:0, y:0, z:0,
        color: COLORS[Math.floor(Math.random()*COLORS.length)],
        size:  Math.random()*2+0.7,
        phase: Math.random()*Math.PI*2,
        speed: 0.7+Math.random()*0.6,
      });
    }
    for (const p of particles) { p.x=p.sx; p.y=p.sy; p.z=p.sz; }
  }

  /* ---- Build floating mini hearts ---- */
  function buildFloaters() {
    floaters = [];
    const isMobile = W <= 700;
    const zone = isMobile
      ? { x: 0, y: 0, w: W, h: H * 0.55 }
      : { x: W * 0.42, y: 0, w: W * 0.58, h: H };
    for (let i = 0; i < FLOAT_COUNT; i++) {
      floaters.push(makeFloater(zone, true));
    }
  }

  function makeFloater(zone, randomY) {
    const size  = 10 + Math.random() * 28;
    return {
      x:     zone.x + Math.random() * zone.w,
      y:     randomY ? Math.random() * zone.h : zone.y + zone.h + size * 2,
      vy:    -(0.25 + Math.random() * 0.55),
      vx:    (Math.random() - 0.5) * 0.3,
      size,
      alpha: 0.12 + Math.random() * 0.25,
      rot:   (Math.random() - 0.5) * 0.5,
      vrot:  (Math.random() - 0.5) * 0.008,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.02,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      zone,
    };
  }

  /* ---- Draw a heart shape ---- */
  function drawHeart(ctx, cx, cy, size, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.beginPath();
    // Simple heart via bezier
    const s = size * 0.045;
    ctx.moveTo(0, -size * 0.3);
    ctx.bezierCurveTo( size*0.5, -size*0.9,  size*1.1,  size*0.1,  0,  size*0.7);
    ctx.bezierCurveTo(-size*1.1,  size*0.1, -size*0.5, -size*0.9,  0, -size*0.3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /* ---- Easing ---- */
  function easeOutQuart(t) { return 1 - Math.pow(1-t,4); }

  /* ---- Resize ---- */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const isMobile = W <= 700;
    HEART_SCALE = isMobile ? HEART_SCALE_MOBILE : HEART_SCALE_DESKTOP;
    if (isMobile) {
      // Top 55% of screen for the heart, text overlays the bottom
      rightCX = W * 0.50;
      rightCY = H * 0.26;
    } else {
      rightCX = W * 0.68;
      rightCY = H * 0.50;
    }
    buildParticles();
    buildFloaters();
  }

  /* ---- Main loop ---- */
  function tick(ts) {
    requestAnimationFrame(tick);
    const time = ts * 0.001;

    /* Smooth camera */
    if (autoRotate && !isDragging) targetRotY += 0.004;
    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;
    zoom += (targetZoom  - zoom) * 0.10;

    /* Clear with trail */
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fillRect(0, 0, W, H);

    /* ---- Floating hearts (draw behind particles) ---- */
    const isMobile = W <= 700;
    const zone = isMobile
      ? { x: 0, y: 0, w: W, h: H * 0.55 }
      : { x: W*0.42, y:0, w: W*0.58, h: H };
    for (const f of floaters) {
      f.wobble += f.wobbleSpeed;
      f.x  += f.vx + Math.sin(f.wobble) * 0.4;
      f.y  += f.vy;
      f.rot += f.vrot;
      // Respawn when off screen top
      if (f.y < -f.size * 3) {
        Object.assign(f, makeFloater(zone, false));
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.alpha * (0.7 + 0.3 * Math.sin(time * 1.5 + f.wobble));
      ctx.beginPath();
      const s = f.size;
      ctx.moveTo(0, -s * 0.3);
      ctx.bezierCurveTo( s*0.5, -s*0.9,  s*1.1,  s*0.1,  0,  s*0.7);
      ctx.bezierCurveTo(-s*1.1,  s*0.1, -s*0.5, -s*0.9,  0, -s*0.3);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.restore();
    }

    /* ---- Assembly ---- */
    if (!assembled) {
      assembleT = Math.min(assembleT + ASSEMBLE_SPEED, 1);
      const e = easeOutQuart(assembleT);
      for (const p of particles) {
        p.x = p.sx + (p.tx - p.sx) * e;
        p.y = p.sy + (p.ty - p.sy) * e;
        p.z = p.sz + (p.tz - p.sz) * e;
      }
      if (assembleT >= 0.82 && !contentShown) showContent();
      if (assembleT >= 1.0)  assembled = true;
    }

    /* ---- Drift ---- */
    if (assembled) {
      for (const p of particles) {
        p.x = p.tx + Math.sin(time*p.speed     + p.phase) * DRIFT_AMP / HEART_SCALE;
        p.y = p.ty + Math.cos(time*p.speed*0.8 + p.phase) * DRIFT_AMP / HEART_SCALE;
        p.z = p.tz + Math.sin(time*p.speed*0.6 + p.phase) * DRIFT_AMP*0.1/HEART_SCALE;
      }
    }

    /* ---- Project + sort ---- */
    const proj = particles.map(p => ({ ...p, ...project(p.x, p.y, p.z) }));
    proj.sort((a,b) => a.depth - b.depth);

    /* ---- Draw main particles ---- */
    for (const p of proj) {
      const sz = p.size * p.scale * 1.5;
      if (sz < 0.3) continue;
      const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, sz*2);
      grd.addColorStop(0,   p.color + 'ff');
      grd.addColorStop(0.4, p.color + '99');
      grd.addColorStop(1,   p.color + '00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, sz*2, 0, Math.PI*2);
      ctx.fill();
    }

    /* ---- Center glow ---- */
    const gR = (80 + Math.sin(time*1.1)*12) * zoom;
    const g  = ctx.createRadialGradient(rightCX, rightCY, 0, rightCX, rightCY, gR);
    g.addColorStop(0, 'rgba(192,20,60,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function showContent() {
    contentShown = true;
    const el = document.getElementById('hero-content');
    if (el) el.classList.add('visible');
  }

  /* ---- Controls ---- */
  function onDown(e) {
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    if (cx < W * 0.38) return;
    isDragging = true; autoRotate = false;
    lastMX = cx;
    lastMY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  }
  function onMove(e) {
    if (!isDragging) return;
    const mx = e.clientX ?? e.touches?.[0]?.clientX ?? lastMX;
    const my = e.clientY ?? e.touches?.[0]?.clientY ?? lastMY;
    targetRotY += (mx - lastMX) * 0.008;
    targetRotX += (my - lastMY) * 0.008;
    targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
    lastMX = mx; lastMY = my;
  }
  function onUp() {
    isDragging = false;
    setTimeout(() => { autoRotate = true; }, 2000);
  }
  function onWheel(e) {
    if (e.clientX < W * 0.38) return;
    e.preventDefault();
    targetZoom = Math.max(0.3, Math.min(3.5, targetZoom - e.deltaY * 0.001));
  }

  /* ---- Init ---- */
  function init() {
    canvas = document.getElementById('hero-canvas');
    ctx    = canvas.getContext('2d');
    if (!canvas || !ctx) return;
    resize();
    window.addEventListener('resize',     resize);
    canvas.addEventListener('mousedown',  onDown);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onUp);
    canvas.addEventListener('touchstart', onDown,  { passive:true });
    window.addEventListener('touchmove',  onMove,  { passive:true });
    window.addEventListener('touchend',   onUp);
    canvas.addEventListener('wheel',      onWheel, { passive:false });
    requestAnimationFrame(tick);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();