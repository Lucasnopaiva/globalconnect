/* store.js */
/* Armazenamento no navegador (localStorage). Em um produto real, esta camada seria um servidor com banco de dados. */
(function (root) {
  'use strict';
  const KEY = 'gc-mvp-v1';
  const SESSION_KEY = 'gc-mvp-sessao';
  const memoria = {};
  let state = null;

  function lerLS(k) { try { return window.localStorage.getItem(k); } catch (e) { return memoria[k] || null; } }
  function gravarLS(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { memoria[k] = v; return e && e.name === 'QuotaExceededError' ? false : true; } }
  function removerLS(k) { try { window.localStorage.removeItem(k); } catch (e) { delete memoria[k]; } }

  function load() {
    const raw = lerLS(KEY);
    if (raw) {
      try {
        const o = JSON.parse(raw);
        if (o && o.versao === 1) { state = o; return state; }
      } catch (e) { /* dados corrompidos: recria */ }
    }
    state = root.GCSeed.create(new Date());
    save();
    return state;
  }
  function save() {
    const ok = gravarLS(KEY, JSON.stringify(state));
    if (!ok && root.GCApp && root.GCApp.aviso) root.GCApp.aviso('Armazenamento do navegador cheio. Remova documentos grandes ou restaure os dados de demonstração.', 'erro');
    return ok;
  }
  function reset() {
    removerLS(KEY); removerLS(SESSION_KEY);
    state = root.GCSeed.create(new Date());
    save();
    return state;
  }
  function get() { return state || load(); }

  // ----- sessão (login institucional simulado) -----
  function lerSessao() {
    const raw = lerLS(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function gravarSessao(s) { if (s) gravarLS(SESSION_KEY, JSON.stringify(s)); else removerLS(SESSION_KEY); }

  root.GCStore = { load, save, reset, get, lerSessao, gravarSessao };
})(typeof self !== 'undefined' ? self : this);
