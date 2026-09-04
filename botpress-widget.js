(function(){
  function applySafeZIndex(){
    var style = document.createElement('style');
    style.id = 'bp-ar-safe-style';
    style.textContent = '#bp-web-widget-container{ z-index:35 !important; }';
    document.head.appendChild(style);
  }

  function sendBpEvent(type){
    if(window.botpressWebChat && typeof window.botpressWebChat.sendEvent === 'function'){
      window.botpressWebChat.sendEvent({ type: type });
    }
  }

  function watchArOverlay(){
    var overlay = document.getElementById('arOverlay');
    if(!overlay) return;
    var isArOpen = function(){ return !overlay.classList.contains('hidden'); };
    if(isArOpen()) sendBpEvent('hide');
    var observer = new MutationObserver(function(){
      sendBpEvent(isArOpen() ? 'hide' : 'show');
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  }

  applySafeZIndex();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', watchArOverlay);
  } else {
    watchArOverlay();
  }
})();
