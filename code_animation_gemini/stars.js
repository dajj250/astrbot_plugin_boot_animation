// Four-point faceted star columns inspired by the supplied reference image.
(function () {
  'use strict';
  const root = document.getElementById('dsh-startup-root');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!root || reduced.matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'gemini-stars'; canvas.setAttribute('aria-hidden','true');
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  let width=0, height=0, last=0, elapsed=0, raf=0, stopped=false, columns=[];
  const palette=['#718ee2','#a888d0','#d794bb','#6faccc','#86b9a5'];
  const config=window.__DSH_STARTUP__ || {};
  const speed=Math.min(10,Math.max(.35,Number(config.speed)||1));
  function resize(){
    width=innerWidth; height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  function star(x,y,r,color,alpha){
    ctx.save(); ctx.translate(x,y); ctx.globalAlpha=alpha;
    ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,-r);
    ctx.quadraticCurveTo(r*.16,-r*.16,r,0); ctx.quadraticCurveTo(r*.16,r*.16,0,r);
    ctx.quadraticCurveTo(-r*.16,r*.16,-r,0); ctx.quadraticCurveTo(-r*.16,-r*.16,0,-r);
    ctx.fill();
    ctx.fillStyle='#fff'; ctx.globalAlpha=alpha*.7; ctx.beginPath();
    ctx.moveTo(0,-r*.85); ctx.lineTo(r*.1,r*.05); ctx.lineTo(-r*.8,0); ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function frame(now){
    if(stopped)return;
    raf=requestAnimationFrame(frame);
    if(document.hidden){last=now;return;}
    if(now-last<33)return;
    const dt=Math.min((now-last)/1000,.08)*speed; last=now;elapsed+=dt;
    ctx.clearRect(0,0,width,height);
    if(elapsed%10<3.6 && columns.length<Math.min(9,Math.ceil(width/180)) && Math.random()<dt*3){
      // Keep the central verification copy clear, including on small screens.
      const x=(Math.random()<.5 ? .05+Math.random()*.17 : .78+Math.random()*.17)*width;
      columns.push({x,y:-30,rate:55+Math.random()*65,r:6+Math.random()*5,color:palette[Math.floor(Math.random()*palette.length)]});
    }
    columns=columns.filter(column=>{
      column.y+=column.rate*dt;
      for(let i=6;i>=0;i--)star(column.x,column.y-i*32,column.r*(1-i*.07),column.color,(1-i/7)*.58);
      return column.y<height+230;
    });
  }
  function stop(){stopped=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);reduced.removeEventListener('change',motionChanged);canvas.remove();}
  function motionChanged(){if(reduced.matches)stop();}
  resize();addEventListener('resize',resize);reduced.addEventListener('change',motionChanged);
  addEventListener('dsh-startup:done',stop,{once:true});addEventListener('pagehide',stop,{once:true});
  raf=requestAnimationFrame(frame);
})();
