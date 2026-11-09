/* eligibility.js */
/* Regra de elegibilidade (US06, US07, US08): compara os dados do aluno com a regra da vaga. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util'));
  else root.GCEligibility = factory(root.GCUtil);
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  /**
   * @param regra {mediaMin, percentualMin, maxReprovacoes}
   * @param dados {media, percentualConcluido, reprovacoes}
   * @returns {elegivel:boolean, criterios:[{id,rotulo,ok,atual,exigido,falta}]}
   */
  function avaliar(regra, dados) {
    if (!regra || !dados) throw new Error('Regra e dados do aluno são obrigatórios.');
    const criterios = [];

    const okMedia = dados.media >= regra.mediaMin;
    criterios.push({
      id: 'media', rotulo: 'Média geral', ok: okMedia,
      atual: U.fmtNum(dados.media), exigido: 'mínimo ' + U.fmtNum(regra.mediaMin),
      falta: okMedia ? '' : 'faltam ' + U.fmtNum(regra.mediaMin - dados.media) + ' ponto(s) de média'
    });

    const okPerc = dados.percentualConcluido >= regra.percentualMin;
    criterios.push({
      id: 'percentual', rotulo: 'Curso concluído', ok: okPerc,
      atual: U.fmtNum(dados.percentualConcluido, 0) + '%', exigido: 'mínimo ' + U.fmtNum(regra.percentualMin, 0) + '%',
      falta: okPerc ? '' : 'faltam ' + U.fmtNum(regra.percentualMin - dados.percentualConcluido, 0) + ' ponto(s) percentual(is) do curso'
    });

    const okReprov = dados.reprovacoes <= regra.maxReprovacoes;
    criterios.push({
      id: 'reprovacoes', rotulo: 'Reprovações', ok: okReprov,
      atual: String(dados.reprovacoes), exigido: 'no máximo ' + regra.maxReprovacoes,
      falta: okReprov ? '' : 'são ' + (dados.reprovacoes - regra.maxReprovacoes) + ' reprovação(ões) a mais que o limite'
    });

    return { elegivel: criterios.every(function (c) { return c.ok; }), criterios: criterios };
  }

  return { avaliar };
});
