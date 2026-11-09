/* policy.js */
/* Perfis de acesso e permissões (US28). A mesma regra vale para as telas e para os serviços. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GCPolicy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PERFIS = {
    visitante: 'Visitante',
    aluno: 'Aluno',
    egresso: 'Egresso',
    estrangeiro: 'Aluno estrangeiro',
    analista: 'Analista do DRI/NEI',
    diretora: 'Diretora do DRI/NEI',
    admin: 'Administrador'
  };
  const STAFF = ['analista', 'diretora'];
  const LOGADOS = ['aluno', 'egresso', 'estrangeiro', 'analista', 'diretora', 'admin'];

  // ação -> perfis que podem realizá-la
  const PERMS = {
    'vaga:ver': ['visitante'].concat(LOGADOS),
    'aviso:ver': LOGADOS,
    'candidatura:criar': ['aluno'],
    'candidatura:ver-propria': ['aluno'],
    'documento:conferir': STAFF,
    'documento:ver-sensivel': STAFF,
    'vaga:gerenciar': ['diretora'],
    'regra:configurar': ['diretora'],
    'resultado:definir': ['diretora'],
    'relatorio:ver': ['diretora'],
    'faq:gerenciar': STAFF,
    'relato:publicar': ['egresso'],
    'relato:moderar': STAFF,
    'evento:inscrever': ['aluno', 'estrangeiro'],
    'evento:gerenciar': STAFF,
    'perfil:gerenciar': ['admin'],
    'instituicao:gerenciar': ['admin'],
    'integracao:gerenciar': ['admin'],
    'auditoria:ver': ['admin']
  };

  function can(perfil, acao) {
    const lista = PERMS[acao];
    return !!lista && lista.indexOf(perfil || 'visitante') !== -1;
  }
  function isStaff(perfil) { return STAFF.indexOf(perfil) !== -1; }

  return { PERFIS, STAFF, LOGADOS, PERMS, can, isStaff };
});
