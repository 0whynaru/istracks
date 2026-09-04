(function(){

  function prefersReducedMotion(){
    try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch(e){ return false; }
  }

  function spawnRipple(btn, x, y){
    if(prefersReducedMotion()) return;
    const rect = btn.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return;
    const size = Math.max(rect.width, rect.height) * 1.15;
    const span = document.createElement('span');
    span.className = 'ui-ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (x - rect.left - size/2) + 'px';
    span.style.top = (y - rect.top - size/2) + 'px';
    btn.appendChild(span);
    span.addEventListener('animationend', ()=>{ span.remove(); }, {once:true});

    setTimeout(()=>{ if(span.parentNode) span.remove(); }, 700);
  }

  function onPointerDown(e){
    const btn = e.target.closest && e.target.closest('button');
    if(!btn || btn.disabled) return;

    const cs = getComputedStyle(btn);
    if(cs.position === 'static') btn.style.position = 'relative';
    if(cs.overflow === 'visible') btn.style.overflow = 'hidden';
    const point = (e.touches && e.touches[0]) || e;
    spawnRipple(btn, point.clientX, point.clientY);
  }

  document.addEventListener('pointerdown', onPointerDown, {passive:true});

  function staggerCards(){
    if(prefersReducedMotion()) return;
    const cards = document.querySelectorAll('.cards > .card');
    cards.forEach((card, i)=>{
      card.style.setProperty('--entrance-delay', Math.min(i * 45, 400) + 'ms');
      card.classList.add('ui-rise-in');
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', staggerCards);
  } else {
    staggerCards();
  }

})();
