window.__ddl.startNight(1); const s=window.__ddl.state; s.lanterns.slice(0,4).forEach(l=>{l.lit=true;l.deposited=10;}); s.player.pos=[-23.8,0,9]; s.player.carried=10;
dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'})); setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'})),200);
