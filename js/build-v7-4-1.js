(() => {
  'use strict';
  const id = 'build741Badge';
  let b = document.getElementById(id);
  if (!b) {
    b = document.createElement('div');
    b.id = id;
    Object.assign(b.style, {
      position: 'fixed', right: '10px', bottom: '10px', zIndex: '10000',
      font: '700 10px/1 system-ui', background: '#0f766e', color: '#fff',
      padding: '6px 8px', borderRadius: '8px', opacity: '.82'
    });
    document.body.appendChild(b);
  }
  b.textContent = 'HTML/Build v7.4.1';
})();
