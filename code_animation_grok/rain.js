// Sparse falling X glyphs. The artwork is independent of any product mark.
(function () {
  'use strict';
  const root=document.getElementById('dsh-startup-root');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!root||reduced.matches)return;
  const canvas=document.createElement('canvas');
  canvas.className='grok-rain';canvas.setAttribute('aria-hidden','true');root.appendChild(canvas);
  const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}
  let width=0,height=0,last=0,elapsed=0,raf=0,stopped=false,columns=[];
  const speed=Math.min(10,Math.max(.35,Number((window.__DSH_STARTUP__||{}).speed)||1));
  function resize(){
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  function cross(x,y,r,alpha,shade){
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
    ctx.strokeStyle=shade;ctx.lineWidth=Math.max(1,r*.16);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-r,-r);ctx.lineTo(r,r);ctx.moveTo(r,-r);ctx.lineTo(-r,r);ctx.stroke();
    ctx.restore();
  }
  function frame(now){
    if(stopped)return;raf=requestAnimationFrame(frame);
    if(document.hidden){last=now;return;}
    if(now-last<33)return;
    const dt=Math.min((now-last)/1000,.08)*speed;last=now;elapsed+=dt;
    ctx.clearRect(0,0,width,height);
    if(elapsed%10<3&&columns.length<Math.min(7,Math.ceil(width/220))&&Math.random()<dt*2.2){
      const x=(Math.random()<.5?.05+Math.random()*.19:.76+Math.random()*.19)*width;
      columns.push({x,y:-30,rate:45+Math.random()*55,r:4+Math.random()*3,shade:Math.random()<.5?'#b88845':'#e0bc76'});
    }
    columns=columns.filter(column=>{
      column.y+=column.rate*dt;
      for(let i=6;i>=0;i--)cross(column.x,column.y-i*31,column.r,(1-i/7)*.38,column.shade);
      return column.y<height+220;
    });
  }
  function stop(){stopped=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);reduced.removeEventListener('change',motionChanged);canvas.remove();}
  function motionChanged(){if(reduced.matches)stop();}
  resize();addEventListener('resize',resize);reduced.addEventListener('change',motionChanged);
  addEventListener('dsh-startup:done',stop,{once:true});addEventListener('pagehide',stop,{once:true});
  raf=requestAnimationFrame(frame);
})();
