/* util.js */
/* Utilidades puras (datas, números, texto). Funciona no navegador e no Node (testes). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GCUtil = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  // Datas "só dia" (AAAA-MM-DD) são lidas no fuso local, para não mudar de dia.
  function parseDate(v) {
    if (v instanceof Date) return new Date(v.getTime());
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const p = v.split('-').map(Number);
      return new Date(p[0], p[1] - 1, p[2]);
    }
    return new Date(v);
  }
  function isoDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addDays(d, n) {
    const x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }
  function startOfDay(d) { const x = parseDate(d); x.setHours(0, 0, 0, 0); return x; }
  function diasAte(isoDay, now) {
    return Math.round((startOfDay(isoDay) - startOfDay(now || new Date())) / 86400000);
  }
  function fmtDate(v) {
    if (!v) return 'Sem data';
    const d = parseDate(v);
    if (isNaN(d)) return 'Sem data';
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function fmtDateTime(v) {
    if (!v) return 'Sem data';
    const d = parseDate(v);
    if (isNaN(d)) return 'Sem data';
    return fmtDate(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtNum(n, casas) {
    if (n === null || n === undefined || isNaN(n)) return 'Sem dado';
    return Number(n).toFixed(casas === undefined ? 1 : casas).replace('.', ',');
  }
  function fmtBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  }
  // Remove acentos e põe em minúsculas, para buscas.
  function norm(s) {
    return String(s === undefined || s === null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  return { uid, pad, parseDate, isoDate, addDays, startOfDay, diasAte, fmtDate, fmtDateTime, fmtNum, fmtBytes, norm, clone };
});
