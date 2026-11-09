/* ui.js */
/* Ajudantes de interface: criação de elementos, avisos, janelas e ícones. */
(function (root) {
  'use strict';
  const U = root.GCUtil;
  const SVGNS = 'http://www.w3.org/2000/svg';

  /** h('div', {class:'x', onclick: fn, 'aria-label':'...'}, filho, [filhos], 'texto') */
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        const v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (k === 'disabled' || k === 'selected' || k === 'required' || k === 'hidden') { if (v) el.setAttribute(k, ''); }
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  const ICONS = {
    globe: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 0c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10zM2 12h20',
    search: 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4.2-4.2',
    check: 'M5 13l4 4L19 7',
    x: 'M6 6l12 12M18 6L6 18',
    alert: 'M12 3l10 18H2L12 3zm0 7v5m0 3v.5',
    upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 20h16',
    bell: 'M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zm4 10a2 2 0 004 0',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9c0-4 3.6-6 8-6s8 2 8 6',
    file: 'M7 3h7l5 5v13H7V3zm7 0v5h5',
    pin: 'M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12zm0-9a3 3 0 100-6 3 3 0 000 6z',
    clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2',
    lock: 'M6 11h12v10H6V11zm2 0V8a4 4 0 118 0v3',
    chev: 'M9 6l6 6-6 6'
  };
  function icon(nome, tam) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', tam || 18); s.setAttribute('height', tam || 18);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', ICONS[nome] || ICONS.file); s.appendChild(p);
    return s;
  }

  function chip(texto, tipo) { return h('span', { class: 'chip chip-' + (tipo || 'neutro') }, texto); }

  let toastTimer;
  function toast(msg, tipo) {
    let t = document.getElementById('toast');
    if (!t) { t = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
    t.className = 'toast show ' + (tipo || '');
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast ' + (tipo || ''); }, tipo === 'erro' ? 5200 : 3000);
  }

  /** Janela de diálogo. acoes: [{rotulo, tipo, fechar:true, onClick}] */
  function modal(opts) {
    const fundo = h('div', { class: 'modal-fundo', role: 'presentation' });
    const caixa = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.titulo });
    const fechar = function () { if (fundo.parentNode) fundo.parentNode.removeChild(fundo); document.removeEventListener('keydown', esc); if (opts.aoFechar) opts.aoFechar(); };
    const esc = function (e) { if (e.key === 'Escape' && opts.fecharComEsc !== false) fechar(); };
    caixa.appendChild(h('h2', { text: opts.titulo }));
    if (opts.corpo) caixa.appendChild(opts.corpo);
    const rodape = h('div', { class: 'modal-acoes' });
    (opts.acoes || []).forEach(function (a) {
      rodape.appendChild(h('button', {
        type: 'button', class: 'btn ' + (a.tipo === 'primario' ? 'btn-primario' : (a.tipo === 'perigo' ? 'btn-perigo' : 'btn-sec')), text: a.rotulo,
        onclick: function () {
          const r = a.onClick ? a.onClick() : true;
          if (r !== false && a.fechar !== false) fechar();
        }
      }));
    });
    caixa.appendChild(rodape);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);
    document.addEventListener('keydown', esc);
    const foco = caixa.querySelector('textarea, input, select') || rodape.querySelector('button');
    if (foco) foco.focus();
    return fechar;
  }

  function campo(rotulo, controle, ajuda) {
    return h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo), controle, ajuda ? h('small', { class: 'ajuda' }, ajuda) : null);
  }
  function vazio(titulo, texto, acao) {
    return h('div', { class: 'vazio' }, h('strong', null, titulo), texto ? h('p', null, texto) : null, acao || null);
  }

  root.GCUI = { h, append, clear, icon, chip, toast, modal, campo, vazio };
})(typeof self !== 'undefined' ? self : this);
