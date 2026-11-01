(function () {
  'use strict';
  var root = document.getElementById('dsh-startup-root');
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.createElement('canvas');
  canvas.className = 'codex-rain'; canvas.setAttribute('aria-hidden','true'); root.appendChild(canvas);
  var ctx = canvas.getContext('2d'), trails = [], raf, last = 0, stopped = false;
  if (!ctx) { canvas.remove(); return; }
  function resize() { canvas.width=innerWidth; canvas.height=innerHeight; }
  function draw(now) {
    if(stopped) return;
    raf=requestAnimationFrame(draw);
    if(document.hidden || now-last<50) return;
    var dt=Math.min((now-last)/1000,.1); last=now;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(now%11000<3300 && trails.length<12 && Math.random()<.22)
      trails.push({x:Math.floor(Math.random()*canvas.width/22)*22,y:-160,speed:85+Math.random()*90});
    trails=trails.filter(function(t){
      t.y+=t.speed*dt;
      ctx.font='12px Consolas,monospace';
      for(var i=0;i<12;i++) {
        ctx.fillStyle='rgba(56,220,118,'+((1-i/12)*.8)+')';
        ctx.fillText('01{}<>/ABCDEF'[(Math.floor(t.y/20)+i+1000)%13],t.x,t.y-i*18);
      }
      return t.y<canvas.height+220;
    });
  }
  function stop(){stopped=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);canvas.remove();}
  resize();addEventListener('resize',resize);
  addEventListener('dsh-startup:done',stop,{once:true});addEventListener('pagehide',stop,{once:true});
  raf=requestAnimationFrame(draw);
})();
