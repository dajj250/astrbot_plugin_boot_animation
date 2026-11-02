import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../web/boot.js', import.meta.url), 'utf8');

function setup(overrides = {}) {
  let now = 0, nextId = 1;
  const timers = new Map();
  const setTimeout = (fn, ms = 0) => { const id = nextId++; timers.set(id, {at:now+ms, fn}); return id; };
  const clearTimeout = id => timers.delete(id);
  function advance(ms) {
    const end = now + ms;
    for (let count = 0; count < 10000; count++) {
      const due = [...timers].filter(([, value]) => value.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!due) { now=end; return; }
      timers.delete(due[0]); now=due[1].at; due[1].fn();
    }
    throw new Error('Timer loop did not settle');
  }
  class Events {
    listeners = new Map();
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type,new Set()); this.listeners.get(type).add(fn); }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    emit(type, data={}) { for (const fn of [...this.listeners.get(type)||[]]) fn(data); }
  }
  const created=[];
  class Element extends Events {
    children=[]; parentNode=null; id=''; className=''; textContent='';
    classes=new Set(); attrs=new Map(); style={setProperty(){}};
    classList={add:(...names)=>names.forEach(n=>this.classes.add(n)),remove:(...names)=>names.forEach(n=>this.classes.delete(n))};
    constructor(tag) { super(); this.tag=tag; this.contentWindow={}; created.push(this); }
    appendChild(child) { child.remove(); this.children.push(child); child.parentNode=this; }
    prepend(child) { child.remove(); this.children.unshift(child); child.parentNode=this; }
    remove() { if (this.parentNode) this.parentNode.children=this.parentNode.children.filter(c=>c!==this); this.parentNode=null; }
    setAttribute(name,value) { this.attrs.set(name,value); }
    removeAttribute(name) { this.attrs.delete(name); if (name==='src') this.src=''; }
    set innerHTML(value) {
      if (value.includes('<video')) { this.video=new Element('video'); this.video.duration=25.5; this.video.currentTime=0; this.video.plays=0;
        this.video.play=()=>{this.video.plays++;this.video.paused=false;return Promise.resolve();};
        this.video.load=()=>{}; this.video.pause=()=>{this.video.paused=true;}; }
      if (value.includes('astrbot-boot-hint')) { this.hint=new Element('hint'); this.skip=new Element('button'); }
    }
    querySelector(selector) { return selector==='video'?this.video:selector.includes('hint')?this.hint:this.skip; }
  }
  const html=new Element('html'), body=new Element('body'); html.appendChild(body);
  function find(id,node=html) { if (node.id===id)return node; for(const child of node.children){const found=find(id,child);if(found)return found;}return null; }
  const document={documentElement:html,body,readyState:'complete',createElement:tag=>new Element(tag),getElementById:find};
  const window=new Events();
  Object.assign(window,{setTimeout,clearTimeout,location:{origin:'https://astrbot.local'},__ASTRBOT_BOOT_ANIMATION__:{enabled:true,sound:false,fadeMs:1000,clips:['a.mp4','b.mp4'],sequence:['a.mp4'],...overrides}});
  vm.runInNewContext(source,{window,document,MutationObserver:class{observe(){}disconnect(){}},performance:{now:()=>now},requestAnimationFrame:fn=>setTimeout(()=>fn(now),16),cancelAnimationFrame:clearTimeout});
  return {window,document,created,advance,video:created.find(e=>e.tag==='video'),find};
}

test('healthy 25-second video is not cut off by the initial 15-second guard',()=>{
  const run=setup(); run.video.emit('loadeddata'); run.video.currentTime=16;run.video.emit('timeupdate');run.advance(16000);
  assert.ok(run.find('astrbot-boot-animation'));assert.equal(run.video.plays,1);
  run.video.emit('ended');run.advance(1200);assert.equal(run.find('astrbot-boot-animation'),null);
});
test('duplicate failures advance only once',()=>{
  const run=setup({sequence:['a.mp4','b.mp4']});run.video.emit('error');run.video.emit('error');run.video.emit('stalled');run.advance(600);
  assert.match(run.video.src,/b\.mp4$/);assert.equal(run.video.plays,2);
});
test('a stalled download does not skip a clip that is still progressing',()=>{
  const run=setup({sequence:['a.mp4','b.mp4']});run.video.emit('loadeddata');run.video.emit('stalled');run.advance(4000);
  run.video.currentTime=4;run.video.emit('timeupdate');run.advance(5000);
  assert.equal(run.video.plays,1);assert.ok(run.find('astrbot-boot-animation'));
});
test('skip cancels pending retry and releases the dashboard keyboard',()=>{
  const run=setup({sequence:['a.mp4','b.mp4']});run.video.emit('error');run.find('astrbot-boot-animation').skip.emit('pointerdown',{preventDefault(){},stopPropagation(){}});run.advance(2000);
  assert.equal(run.video.plays,1);assert.equal(run.video.src,'');assert.equal(run.find('astrbot-boot-animation'),null);
  assert.equal(run.window.listeners.get('keydown').size,0);
});
test('unrelated same-origin messages cannot dismiss the code animation',()=>{
  const run=setup({codeAnimationMode:'only'}),frame=run.find('astrbot-code-animation-frame');
  const message={origin:'https://astrbot.local',data:{type:'astrbot-code-animation:done'}};
  run.window.emit('message',{...message,source:{}});assert.equal(run.find(frame.id),frame);
  run.window.emit('message',{...message,source:frame.contentWindow});run.advance(1200);assert.equal(run.find(frame.id),null);
});
test('before-video mode can still run code animation without video assets',()=>{
  const run=setup({codeAnimationMode:'before_video',clips:[],sequence:[]});assert.ok(run.find('astrbot-code-animation-frame'));
});
test('random video ignores a fixed sequence and picks an available clip',()=>{
  const run=setup({playSequence:'random',clips:['a.mp4','b.mp4'],sequence:['missing.mp4']});
  assert.match(run.video.src,/\/(a|b)\.mp4$/);
});
test('random code style selects one of the installed animation pages',()=>{
  const run=setup({codeAnimationMode:'only',codeAnimationStyle:'random'});
  assert.match(run.find('astrbot-code-animation-frame').src,/\/code-animation(?:-gpt|-gemini|-claude|-grok)?\/index\.html$/);
});
