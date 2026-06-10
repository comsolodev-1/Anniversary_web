(function(){
  'use strict';
  const canvas=document.getElementById('hub-canvas');
  const ctx=canvas.getContext('2d');
  let W,H;
  const stars=[];

  function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight;}
  window.addEventListener('resize',resize);resize();

  for(let i=0;i<200;i++) stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.3+.2,a:Math.random()*.5+.1,ph:Math.random()*Math.PI*2,sp:.2+Math.random()*.5});

  function tick(ts){
    requestAnimationFrame(tick);
    const t=ts*.001;
    ctx.fillStyle='rgba(2,0,10,.22)';ctx.fillRect(0,0,W,H);
    for(const s of stars){
      ctx.globalAlpha=s.a*(.5+.5*Math.sin(t*s.sp+s.ph));
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  requestAnimationFrame(tick);

  // Portal canvases
  const portals=[
    {id:'p1',draw:drawMusic,  color:'#c0143c'},
    {id:'p2',draw:drawConstellation,color:'#d4a853'},
    {id:'p3',draw:drawBloom,  color:'#f48fb1'},
  ];

  portals.forEach(p=>{
    const el=document.getElementById(p.id);
    const cvs=el.querySelector('.portal-canvas');
    const pctx=cvs.getContext('2d');
    let angle=0;
    (function loop(ts){
      requestAnimationFrame(loop);
      angle+=.012;
      const t=ts*.001;
      pctx.clearRect(0,0,180,180);
      p.draw(pctx,90,90,angle,t,p.color);
    })();
  });

  // Portal 1: music notes orbiting a heart
  function drawMusic(ctx,cx,cy,a,t,col){
    // Outer glow ring
    const g=ctx.createRadialGradient(cx,cy,20,cx,cy,80);
    g.addColorStop(0,hexA(col,.15));g.addColorStop(1,hexA(col,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,80,0,Math.PI*2);ctx.fill();
    // Orbiting notes
    const notes=['♪','♫','♩','♬'];
    for(let i=0;i<notes.length;i++){
      const na=a+i*(Math.PI/2);
      const nx=cx+Math.cos(na)*52,ny=cy+Math.sin(na)*52;
      ctx.save();ctx.globalAlpha=.7+.3*Math.sin(t*1.5+i);
      ctx.fillStyle=col;ctx.font=`${18+4*Math.sin(t+i)}px serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(notes[i],nx,ny);ctx.restore();
    }
    // Center heart
    const beat=1+.15*Math.sin(t*2.8);
    const S=2.8*beat;
    ctx.save();ctx.translate(cx,cy);
    for(let i=0;i<36;i++){
      const theta=(i/36)*Math.PI*2;
      const hx=16*Math.pow(Math.sin(theta),3)*S;
      const hy=-(13*Math.cos(theta)-5*Math.cos(2*theta)-2*Math.cos(3*theta)-Math.cos(4*theta))*S;
      const d=.4+.6*((i/36));
      ctx.globalAlpha=.5+.5*d;ctx.fillStyle=col;
      ctx.beginPath();ctx.arc(hx,hy,1.5+d*1.5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();ctx.globalAlpha=1;
  }

  // Portal 2: stars connecting into heart
  function drawConstellation(ctx,cx,cy,a,t,col){
    const g=ctx.createRadialGradient(cx,cy,10,cx,cy,75);
    g.addColorStop(0,hexA(col,.12));g.addColorStop(1,hexA(col,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,75,0,Math.PI*2);ctx.fill();
    const pts=[];
    for(let i=0;i<12;i++){
      const theta=(i/12)*Math.PI*2;
      const hx=16*Math.pow(Math.sin(theta),3)*2.4;
      const hy=-(13*Math.cos(theta)-5*Math.cos(2*theta)-2*Math.cos(3*theta)-Math.cos(4*theta))*2.4;
      pts.push({x:cx+hx,y:cy+hy});
    }
    // Lines
    ctx.strokeStyle=hexA(col,.3);ctx.lineWidth=.8;ctx.setLineDash([3,5]);
    for(let i=0;i<pts.length;i++){
      const next=pts[(i+1)%pts.length];
      ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(next.x,next.y);ctx.stroke();
    }
    ctx.setLineDash([]);
    // Star dots
    pts.forEach((p,i)=>{
      const tw=.6+.4*Math.sin(t*1.2+i*.5);
      ctx.globalAlpha=tw;ctx.fillStyle=col;
      ctx.beginPath();ctx.arc(p.x,p.y,3+tw*2,0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;
  }

  // Portal 3: blooming flower
  function drawBloom(ctx,cx,cy,a,t,col){
    const g=ctx.createRadialGradient(cx,cy,10,cx,cy,78);
    g.addColorStop(0,hexA(col,.14));g.addColorStop(1,hexA(col,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,78,0,Math.PI*2);ctx.fill();
    // Stem
    ctx.strokeStyle='rgba(80,180,80,.7)';ctx.lineWidth=2.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cx,cy+50);ctx.lineTo(cx,cy+5);ctx.stroke();
    // Petals
    const petals=6;const bloom=.7+.3*Math.sin(t*1.2);
    for(let i=0;i<petals;i++){
      const pa=a+i*(Math.PI*2/petals);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(pa);
      ctx.globalAlpha=.65+.2*Math.sin(t+i);ctx.fillStyle=col;
      ctx.beginPath();ctx.ellipse(0,-22*bloom,9*bloom,18*bloom,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    // Center
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,12);
    cg.addColorStop(0,'rgba(255,220,80,.9)');cg.addColorStop(1,'rgba(255,200,60,0)');
    ctx.globalAlpha=.9;ctx.fillStyle=cg;ctx.beginPath();ctx.arc(cx,cy,12,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }

  function hexA(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}
})();