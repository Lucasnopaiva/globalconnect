/* main.js */
/* Registro das rotas e início da aplicação. */
(function (root) {
  'use strict';
  const App = root.GCApp, V = root.GCViews;

  App.rota(/^#\/?$/, { titulo: 'Vagas', render: V.lista });
  App.rota(/^#\/vaga\/([\w-]+)$/, { titulo: 'Vaga', render: V.detalhe });
  App.rota(/^#\/guias$/, { titulo: 'Guias de preparação', render: V.guias });
  App.rota(/^#\/eventos$/, { titulo: 'Tandem e eventos', render: V.eventos });
  App.rota(/^#\/faq$/, { titulo: 'Perguntas frequentes', render: V.faq });
  App.rota(/^#\/relatos$/, { titulo: 'Relatos', render: V.relatos });
  App.rota(/^#\/login$/, { titulo: 'Entrar', render: V.login });

  App.rota(/^#\/minhas-candidaturas$/, { titulo: 'Minhas candidaturas', login: true, perm: 'candidatura:ver-propria', render: V.minhas });
  App.rota(/^#\/candidatura\/([\w-]+)$/, { titulo: 'Candidatura', login: true, perm: 'candidatura:ver-propria', render: V.candidatura });
  App.rota(/^#\/avisos$/, { titulo: 'Avisos', login: true, perm: 'aviso:ver', render: V.avisos });

  App.rota(/^#\/gestao$/, { titulo: 'Gestão', perm: 'documento:conferir', render: V.painel });
  App.rota(/^#\/gestao\/candidatura\/([\w-]+)$/, { titulo: 'Conferência', perm: 'documento:conferir', render: V.candidaturaGestao });
  App.rota(/^#\/gestao\/vagas$/, { titulo: 'Gestão de vagas', perm: 'vaga:gerenciar', render: V.vagas });
  App.rota(/^#\/gestao\/vaga\/([\w-]+)$/, { titulo: 'Editar vaga', perm: 'vaga:gerenciar', render: V.vagaEditor });
  App.rota(/^#\/gestao\/relatorios$/, { titulo: 'Relatórios', perm: 'relatorio:ver', render: V.relatorios });
  App.rota(/^#\/gestao\/relatos$/, { titulo: 'Moderação de relatos', perm: 'relato:moderar', render: V.relatosGestao });

  App.rota(/^#\/admin(?:\/(\w+))?$/, { titulo: 'Administração', perm: 'perfil:gerenciar', render: V.admin });

  if (document.readyState === 'loading') {
    if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { App.iniciar(); });
  } else {
    App.iniciar();
  }
  } else {
    App.iniciar();
  }
})(typeof self !== 'undefined' ? self : this);
