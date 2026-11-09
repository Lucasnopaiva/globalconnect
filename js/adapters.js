/* adapters.js */
/* Adaptadores de sistema acadêmico (US32 e US34).
 * O núcleo do GlobalConnect só conhece esta interface:
 *   buscarDadosAluno(ctx) -> Promise<{matricula, media, percentualConcluido, reprovacoes, ...}>
 * Cada universidade usa o adaptador que combinar com a sua TI, sem mexer no resto do sistema.
 * No protótipo, a "API" é simulada e lê os dados guardados no navegador. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util'));
  else root.GCAdapters = factory(root.GCUtil);
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  const registry = {};
  function register(adapter) { registry[adapter.id] = adapter; }
  function get(id) { return registry[id]; }
  function list() { return Object.keys(registry).map(function (k) { return registry[k]; }); }

  function buscarNaBase(ctx, mensagemNaoEncontrado) {
    const cfg = (ctx.state.integracao && ctx.state.integracao[ctx.instituicao.id]) || {};
    if (cfg.falhaSimulada) return Promise.reject(new Error('Sistema acadêmico indisponível (falha simulada).'));
    const base = (ctx.state.academico && ctx.state.academico[ctx.instituicao.id]) || {};
    const reg = base[ctx.usuario.matricula];
    if (!reg) return Promise.reject(new Error(mensagemNaoEncontrado));
    const agora = (ctx.now || new Date()).toISOString();
    return Promise.resolve(Object.assign({}, U.clone(reg), { consultadoEm: agora }));
  }

  register({
    id: 'sim-api',
    nome: 'API do sistema acadêmico (simulada)',
    descricao: 'Consulta os dados do aluno por uma interface de integração. No protótipo, a resposta é simulada.',
    buscarDadosAluno: function (ctx) { return buscarNaBase(ctx, 'Matrícula não encontrada no sistema acadêmico.'); }
  });
  register({
    id: 'csv',
    nome: 'Importação de arquivo CSV',
    descricao: 'A Secretaria exporta um arquivo do sistema acadêmico e o GlobalConnect o importa. Serve de caminho enquanto a TI não libera uma API.',
    buscarDadosAluno: function (ctx) { return buscarNaBase(ctx, 'Matrícula não encontrada na última importação.'); }
  });

  // ---------- CSV ----------
  function splitLinha(linha, sep) { return linha.split(sep).map(function (c) { return c.trim().replace(/^"|"$/g, ''); }); }
  function num(v) { return Number(String(v).replace(',', '.')); }

  /** Lê o texto de um CSV e devolve {registros, erros}. Colunas: matricula, media, percentual_concluido, reprovacoes (+ nome, curso, semestre). */
  function parseCSV(texto) {
    const linhas = String(texto || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    const resultado = { registros: [], erros: [] };
    if (linhas.length < 2) { resultado.erros.push('O arquivo precisa ter o cabeçalho e pelo menos uma linha de dados.'); return resultado; }
    const sep = linhas[0].indexOf(';') !== -1 ? ';' : ',';
    const cab = splitLinha(linhas[0], sep).map(U.norm).map(function (c) { return c.replace(/\s+/g, '_'); });
    const idx = function (nomes) { for (let i = 0; i < nomes.length; i++) { const p = cab.indexOf(nomes[i]); if (p !== -1) return p; } return -1; };
    const col = {
      matricula: idx(['matricula']), media: idx(['media']), perc: idx(['percentual_concluido', 'percentual']),
      reprov: idx(['reprovacoes']), nome: idx(['nome']), curso: idx(['curso']), semestre: idx(['semestre'])
    };
    const faltando = [];
    if (col.matricula < 0) faltando.push('matricula');
    if (col.media < 0) faltando.push('media');
    if (col.perc < 0) faltando.push('percentual_concluido');
    if (col.reprov < 0) faltando.push('reprovacoes');
    if (faltando.length) { resultado.erros.push('Colunas obrigatórias ausentes: ' + faltando.join(', ') + '.'); return resultado; }

    for (let i = 1; i < linhas.length; i++) {
      const c = splitLinha(linhas[i], sep);
      const n = i + 1;
      const matricula = c[col.matricula];
      const media = num(c[col.media]), perc = num(c[col.perc]), reprov = num(c[col.reprov]);
      if (!matricula) { resultado.erros.push('Linha ' + n + ': matrícula vazia.'); continue; }
      if (isNaN(media) || media < 0 || media > 10) { resultado.erros.push('Linha ' + n + ': média deve estar entre 0 e 10.'); continue; }
      if (isNaN(perc) || perc < 0 || perc > 100) { resultado.erros.push('Linha ' + n + ': percentual concluído deve estar entre 0 e 100.'); continue; }
      if (isNaN(reprov) || reprov < 0 || Math.floor(reprov) !== reprov) { resultado.erros.push('Linha ' + n + ': reprovações deve ser um número inteiro maior ou igual a 0.'); continue; }
      resultado.registros.push({
        matricula: matricula, media: media, percentualConcluido: perc, reprovacoes: reprov,
        nome: col.nome >= 0 ? c[col.nome] : '', curso: col.curso >= 0 ? c[col.curso] : '',
        semestre: col.semestre >= 0 ? Number(c[col.semestre]) || 0 : 0
      });
    }
    return resultado;
  }

  /** Importa um CSV para a base da instituição e registra o resultado. */
  function importarCSV(state, instId, texto, now) {
    now = now || new Date();
    const r = parseCSV(texto);
    state.academico[instId] = state.academico[instId] || {};
    r.registros.forEach(function (reg) {
      state.academico[instId][reg.matricula] = Object.assign({}, reg, { atualizadoEm: now.toISOString() });
    });
    state.integracao[instId] = state.integracao[instId] || {};
    state.integracao[instId].ultimaImportacao = { em: now.toISOString(), importados: r.registros.length, erros: r.erros.length };
    return r;
  }

  return { register, get, list, parseCSV, importarCSV };
});
