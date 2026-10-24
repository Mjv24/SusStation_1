document.querySelectorAll('[data-i]').forEach(e=>e.insertAdjacentHTML('afterbegin',ICO(e.dataset.i)));
PostFX.init(); UI.init(); initHome(); requestAnimationFrame(loop);
window.__G=G;
