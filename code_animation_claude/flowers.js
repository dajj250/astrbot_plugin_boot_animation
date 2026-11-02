// Sparse falling flower-code columns based on the supplied gold daisy reference.
(function () {
  'use strict';
  const root=document.getElementById('dsh-startup-root');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!root||reduced.matches)return;
  const canvas=document.createElement('canvas');
  canvas.className='claude-flowers';canvas.setAttribute('aria-hidden','true');root.appendChild(canvas);
  const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}
  let width=0,height=0,last=0,elapsed=0,raf=0,stopped=false,columns=[];
  const speed=Math.min(10,Math.max(.35,Number((window.__DSH_STARTUP__||{}).speed)||1));
  function resize(){
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  function flower(x,y,r,alpha,shade){
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
    ctx.strokeStyle=shade;ctx.fillStyle=shade;ctx.lineWidth=Math.max(.65,r*.09);
    for(let i=0;i<12;i++){
      ctx.save();ctx.rotate(i*Math.PI/6);ctx.beginPath();
      ctx.moveTo(-r*.13,-r*.31);ctx.quadraticCurveTo(-r*.48,-r*.83,0,-r);
      ctx.quadraticCurveTo(r*.48,-r*.83,r*.13,-r*.31);ctx.stroke();ctx.restore();
    }
    ctx.beginPath();ctx.arc(0,0,r*.31,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function frame(now){
    if(stopped)return;raf=requestAnimationFrame(frame);
    if(document.hidden){last=now;return;}
    if(now-last<33)return;
    const dt=Math.min((now-last)/1000,.08)*speed;last=now;elapsed+=dt;
    ctx.clearRect(0,0,width,height);
    if(elapsed%11<3.2&&columns.length<Math.min(8,Math.ceil(width/190))&&Math.random()<dt*2.6){
      const x=(Math.random()<.5?.04+Math.random()*.18:.78+Math.random()*.18)*width;
      columns.push({x,y:-30,rate:48+Math.random()*62,r:6+Math.random()*4,shade:Math.random()<.5?'#c0784b':'#d4a45d'});
    }
    columns=columns.filter(column=>{
      column.y+=column.rate*dt;
      for(let i=6;i>=0;i--)flower(column.x,column.y-i*33,column.r*(1-i*.055),(1-i/7)*.46,column.shade);
      return column.y<height+230;
    });
  }
  function stop(){stopped=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);reduced.removeEventListener('change',motionChanged);canvas.remove();}
  function motionChanged(){if(reduced.matches)stop();}
  resize();addEventListener('resize',resize);reduced.addEventListener('change',motionChanged);
  addEventListener('dsh-startup:done',stop,{once:true});addEventListener('pagehide',stop,{once:true});
  raf=requestAnimationFrame(frame);
})();
