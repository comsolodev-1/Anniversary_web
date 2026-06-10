(function(){
  'use strict';
  const canvas=document.getElementById('cn-canvas');
  const ctx=canvas.getContext('2d');
  let W,H,CX,CY;

  function isMobile(){ return innerWidth<=700; }

  // Push center down enough to clear the title header
  function resize(){
    W=canvas.width=innerWidth;
    H=canvas.height=innerHeight;
    CX=W/2;
    // Desktop: push further down so heart doesn't overlap title
    // Mobile: center is a bit lower too but viewport is taller relative
    CY = isMobile() ? H*0.52 : H*0.60;
  }
  window.addEventListener('resize',()=>{resize();buildTargets();if(!heartFormed)resetStars();});
  resize();

  // Background stars — mix of tiny sparkles and slightly bigger ones
  const bgStars=[];
  for(let i=0;i<280;i++){
    const isTiny=i>200; // last 80 are very small sub-stars
    bgStars.push({
      x:Math.random(), y:Math.random(),
      r: isTiny ? Math.random()*.5+.1 : Math.random()*1.3+.2,
      a: isTiny ? Math.random()*.3+.05 : Math.random()*.5+.1,
      ph:Math.random()*Math.PI*2,
      sp:.2+Math.random()*.5
    });
  }

  const N=16;
  let targets=[], stars=[], dragging=-1, heartFormed=false, beatAnim=0, messageShown=false;
  let animating=false, animProgress=0;

  function heartScale(){
    // Tighter scale so heart fits well and doesn't crowd title
    return Math.min(W,H) * (isMobile() ? 0.022 : 0.022);
  }

  function buildTargets(){
    targets=[];
    const S=heartScale();
    for(let i=0;i<N;i++){
      const theta=(i/N)*Math.PI*2;
      const hx=16*Math.pow(Math.sin(theta),3)*S;
      const hy=-(13*Math.cos(theta)-5*Math.cos(2*theta)-2*Math.cos(3*theta)-Math.cos(4*theta))*S;
      targets.push({x:CX+hx,y:CY+hy});
    }
  }

  function starRadius(){
    // Smaller on mobile so stars don't blob into each other
    return isMobile() ? 3+Math.random()*2 : 3+Math.random()*2;
  }

  function buildStars(){
    stars=targets.map((t,i)=>({
      x:Math.random()*W, y:Math.random()*H,
      sx:Math.random()*W, sy:Math.random()*H,
      tx:t.x, ty:t.y,
      r:starRadius(),
      col:['#f48fb1','#c0143c','#ffffff','#d4a853','#e0365a'][i%5],
      ph:Math.random()*Math.PI*2, sp:.4+Math.random()*.5,
      dragging:false,
    }));
  }

  function resetStars(){
    heartFormed=false;messageShown=false;beatAnim=0;animating=false;animProgress=0;
    document.getElementById('cn-message').classList.remove('show');
    document.getElementById('cn-hint').style.opacity='1';
    buildStars();
  }

  buildTargets();buildStars();

  function checkHeart(){
    const threshold=Math.min(W,H)*.025;
    const formed=stars.every((s,i)=>Math.hypot(s.x-targets[i].x,s.y-targets[i].y)<threshold);
    if(formed&&!heartFormed){
      heartFormed=true;
      setTimeout(()=>{
        document.getElementById('cn-message').classList.add('show');
        messageShown=true;
      },1200);
    }
    return formed;
  }

  function formHeart(){
    if(heartFormed) return;
    stars.forEach(s=>{s.sx=s.x;s.sy=s.y;});
    animating=true;
    animProgress=0;
  }

  function starAt(mx,my){
    for(let i=stars.length-1;i>=0;i--){
      if(Math.hypot(mx-stars[i].x,my-stars[i].y)<stars[i].r+14) return i;
    }
    return -1;
  }

  canvas.addEventListener('mousedown',e=>{if(animating) return;dragging=starAt(e.clientX,e.clientY);if(dragging>=0)stars[dragging].dragging=true;});
  window.addEventListener('mousemove',e=>{if(dragging>=0){stars[dragging].x=e.clientX;stars[dragging].y=e.clientY;}});
  window.addEventListener('mouseup',()=>{if(dragging>=0){stars[dragging].dragging=false;dragging=-1;checkHeart();}});

  canvas.addEventListener('touchstart',e=>{if(animating) return;const tc=e.touches[0];dragging=starAt(tc.clientX,tc.clientY);if(dragging>=0)stars[dragging].dragging=true;},{passive:true});
  window.addEventListener('touchmove',e=>{if(dragging>=0){const tc=e.touches[0];stars[dragging].x=tc.clientX;stars[dragging].y=tc.clientY;}},{passive:true});
  window.addEventListener('touchend',()=>{if(dragging>=0){stars[dragging].dragging=false;dragging=-1;checkHeart();}});

  document.getElementById('cn-reset').addEventListener('click',resetStars);
  document.getElementById('cn-form-heart').addEventListener('click',formHeart);

  function easeInOut(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

  function tick(ts){
    requestAnimationFrame(tick);
    const t=ts*.001;
    ctx.fillStyle='rgba(2,0,10,.2)';ctx.fillRect(0,0,W,H);

    // Background stars — tiny ones first for depth
    for(const s of bgStars){
      ctx.globalAlpha=s.a*(.5+.5*Math.sin(t*s.sp+s.ph));
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    // Animate stars toward targets
    if(animating){
      animProgress=Math.min(animProgress+.012,1);
      const ep=easeInOut(animProgress);
      stars.forEach((s,i)=>{
        s.x=s.sx+(targets[i].x-s.sx)*ep;
        s.y=s.sy+(targets[i].y-s.sy)*ep;
      });
      if(animProgress>=1){animating=false;checkHeart();}
    }

    // Connection lines
    ctx.strokeStyle='rgba(192,20,60,.15)';ctx.lineWidth=.8;ctx.setLineDash([3,6]);
    for(let i=0;i<stars.length;i++){
      const next=stars[(i+1)%stars.length];
      ctx.beginPath();ctx.moveTo(stars[i].x,stars[i].y);ctx.lineTo(next.x,next.y);ctx.stroke();
    }
    ctx.setLineDash([]);

    // Heart outline when formed
    if(heartFormed){
      beatAnim+=.05;
      const beat=1+.08*Math.sin(beatAnim*2.5);
      const S=heartScale()*beat;
      ctx.save();ctx.translate(CX,CY);
      ctx.strokeStyle=`rgba(192,20,60,${.3+.2*Math.sin(beatAnim*2.5)})`;
      ctx.lineWidth=1.5;ctx.setLineDash([4,6]);
      ctx.beginPath();
      for(let i=0;i<=60;i++){
        const theta=(i/60)*Math.PI*2;
        const hx=16*Math.pow(Math.sin(theta),3)*S;
        const hy=-(13*Math.cos(theta)-5*Math.cos(2*theta)-2*Math.cos(3*theta)-Math.cos(4*theta))*S;
        i===0?ctx.moveTo(hx,hy):ctx.lineTo(hx,hy);
      }
      ctx.closePath();ctx.stroke();ctx.setLineDash([]);
      ctx.restore();
    }

    // Draggable stars — glow radius also smaller on mobile
    const glowMult = isMobile() ? 3.5 : 5;
    stars.forEach((s,i)=>{
      const grd=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*glowMult);
      grd.addColorStop(0,s.col+'aa');grd.addColorStop(1,s.col+'00');
      ctx.fillStyle=grd;ctx.globalAlpha=heartFormed?.9:.6;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r*glowMult,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.9+.1*Math.sin(t*s.sp+s.ph);
      ctx.fillStyle=s.dragging?'#fff':s.col;
      ctx.shadowColor=s.col;ctx.shadowBlur=s.dragging?14:6;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r+(s.dragging?2:0),0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle=s.col;ctx.lineWidth=.8;ctx.globalAlpha=.5;
      const arm=s.r*2;
      ctx.beginPath();ctx.moveTo(s.x-arm,s.y);ctx.lineTo(s.x+arm,s.y);
      ctx.moveTo(s.x,s.y-arm);ctx.lineTo(s.x,s.y+arm);ctx.stroke();
      ctx.globalAlpha=1;

      if(!heartFormed&&!animating){
        const d=Math.hypot(s.x-targets[i].x,s.y-targets[i].y);
        const alpha=Math.max(0,.5-d/(Math.min(W,H)*.15));
        ctx.globalAlpha=alpha*.5;
        ctx.strokeStyle=s.col;ctx.lineWidth=1;ctx.setLineDash([2,4]);
        ctx.beginPath();ctx.arc(targets[i].x,targets[i].y,5,0,Math.PI*2);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
      }
    });
    ctx.globalAlpha=1;
  }

  requestAnimationFrame(tick);
})();