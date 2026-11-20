window.__ddl.startNight(3); const s=window.__ddl.state; s.lanterns.slice(1).forEach(l=>{l.lit=true;l.deposited=10;}); s.player.pos=[0,6,4.5]; s.player.grounded=true; s.player.carried=10;
dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'})); setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'})),200);
