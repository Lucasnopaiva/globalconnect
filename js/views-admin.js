/* views-admin.js */
/* Telas do administrador: perfis, instituições, integração com o sistema acadêmico e auditoria (US28, US30, US32 a US34). */
(function (root) {
  'use strict';
  const U = root.GCUtil, Policy = root.GCPolicy, S = root.GCServices, UI = root.GCUI, App = root.GCApp, V = root.GCViews, Adapters = root.GCAdapters;
  const h = UI.h;

  const ABAS = [['perfis', 'Perfis de acesso'], ['instituicoes', 'Instituições'], ['integracao', 'Integração acadêmica'], ['auditoria', 'Auditoria']];
  const CSV_MODELO = 'matricula,nome,curso,semestre,media,percentual_concluido,reprovacoes\nB-2001,Ana,Engenharia Civil,5,8.1,48,0\nB-2002,Pedro,Arquitetura,7,7.4,66,1\n';

  function perfis() {
    const st = App.estado(), admin = App.usuario();
    const opcoes = Object.keys(Policy.PERFIS).filter(function (p) { return p !== 'visitante'; });
    return h('div', { class: 'cartao' }, h('h2', null, 'Perfis de acesso'), h('p', { class: 'ajuda' }, 'Cada perfil vê apenas o que lhe cabe. Toda alteração fica registrada na auditoria.'),
      h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' }, h('thead', null, h('tr', null, ['Pessoa', 'E-mail', 'Instituição', 'Perfil'].map(function (t) { return h('th', null, t); }))),
        h('tbody', null, st.usuarios.map(function (x) {
          const inst = st.instituicoes.find(function (i) { return i.id === x.instId; });
          const sel = h('select', { 'aria-label': 'Perfil de ' + x.nome, onchange: function (e) {
            const ok = App.executar(function () { S.alterarPerfil(st, admin, x.id, e.target.value); return true; }, 'Perfil de ' + x.nome + ' alterado para ' + Policy.PERFIS[e.target.value] + '.');
            if (!ok) e.target.value = x.perfil;
          } }, opcoes.map(function (p) { return h('option', { value: p, selected: p === x.perfil }, Policy.PERFIS[p]); }));
          return h('tr', null, h('td', null, h('strong', null, x.nome)), h('td', { class: 'mono' }, x.email), h('td', null, inst ? inst.nome : 'Sem dado'), h('td', null, sel));
        })))));
  }

  function instituicoes() {
    const st = App.estado(), admin = App.usuario();
    const nome = h('input', { type: 'text', placeholder: 'Nome da universidade' });
    const adapt = h('select', { 'aria-label': 'Adaptador de integração' }, Adapters.list().map(function (a) { return h('option', { value: a.id }, a.nome); }));
    return h('div', null,
      h('div', { class: 'cartao' }, h('h2', null, 'Instituições cadastradas'), h('p', { class: 'ajuda' }, 'Os dados de cada instituição ficam separados: vagas, usuários, regras e documentos.'),
        h('ul', { class: 'lista-simples' }, st.instituicoes.map(function (i) {
          return h('li', null, h('strong', null, i.nome), ' ', UI.chip(Adapters.get(i.adaptador).nome, 'info'), ' ', UI.chip(st.vagas.filter(function (v) { return v.instId === i.id; }).length + ' vaga(s)', 'neutro'));
        }))),
      h('form', { class: 'cartao form', onsubmit: function (e) { e.preventDefault(); App.executar(function () { S.cadastrarInstituicao(st, admin, { nome: nome.value, adaptador: adapt.value }); }, 'Instituição cadastrada. Configure a integração para carregar os dados dos alunos.'); } },
        h('h2', null, 'Cadastrar nova instituição'), UI.campo('Nome', nome), UI.campo('Como os dados acadêmicos chegam', adapt, 'Cada instituição usa o adaptador combinado com a sua TI. O resto do sistema não muda.'), h('button', { type: 'submit', class: 'btn btn-primario' }, 'Cadastrar instituição')));
  }

  function integracao() {
    const st = App.estado(), admin = App.usuario();
    return h('div', null, st.instituicoes.map(function (inst) {
      const ad = Adapters.get(inst.adaptador);
      const cfg = st.integracao[inst.id] || {};
      const base = st.academico[inst.id] || {};
      const texto = h('textarea', { rows: '5', placeholder: CSV_MODELO, 'aria-label': 'Conteúdo do CSV para ' + inst.nome });
      const arq = h('input', { type: 'file', accept: '.csv,text/csv', 'aria-label': 'Escolher arquivo CSV' });
      arq.addEventListener('change', function () { const f = arq.files[0]; if (!f) return; const r = new FileReader(); r.onload = function () { texto.value = String(r.result); }; r.readAsText(f); });
      const resultado = h('div', { 'aria-live': 'polite' });
      return h('div', { class: 'cartao' }, h('h2', null, inst.nome),
        h('p', null, h('strong', null, 'Adaptador: '), ad.nome), h('p', { class: 'ajuda' }, ad.descricao),
        h('div', { class: 'chips' }, UI.chip(Object.keys(base).length + ' aluno(s) na base', 'neutro'), cfg.falhaSimulada ? UI.chip('Falha simulada ligada', 'erro') : UI.chip('Integração normal', 'ok'),
          cfg.ultimaImportacao ? UI.chip('Última importação: ' + U.fmtDateTime(cfg.ultimaImportacao.em) + ' (' + cfg.ultimaImportacao.importados + ' ok, ' + cfg.ultimaImportacao.erros + ' erro(s))', 'info') : null),
        h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { App.executar(function () { S.definirFalhaSimulada(st, admin, inst.id, !cfg.falhaSimulada); }, cfg.falhaSimulada ? 'Falha simulada desligada.' : 'Falha simulada ligada. As consultas passam a falhar, e a equipe é avisada.'); } }, cfg.falhaSimulada ? 'Desligar falha simulada' : 'Simular falha do sistema acadêmico')),
        h('h3', null, 'Importar dados dos alunos (CSV)'),
        h('p', { class: 'ajuda' }, 'Colunas obrigatórias: matricula, media, percentual_concluido e reprovacoes. Opcionais: nome, curso e semestre.'),
        texto, h('div', { class: 'acoes' }, arq,
          h('button', { type: 'button', class: 'btn btn-sec', onclick: function () {
            const r = App.executar(function () { return S.importarAcademico(st, admin, inst.id, texto.value); }, null, true);
            if (!r) return;
            UI.clear(resultado);
            resultado.appendChild(h('div', { class: 'aviso ' + (r.erros.length ? 'alerta' : 'ok') }, r.registros.length + ' registro(s) importado(s), ' + r.erros.length + ' com erro.'));
            if (r.erros.length) resultado.appendChild(h('ul', null, r.erros.map(function (e) { return h('li', null, e); })));
            App.salvar();
          } }, 'Importar'),
          h('button', { type: 'button', class: 'btn btn-sec', onclick: function () {
            const a = h('a', { href: URL.createObjectURL(new Blob([CSV_MODELO], { type: 'text/csv' })), download: 'modelo-alunos.csv' }); document.body.appendChild(a); a.click(); a.remove();
          } }, 'Baixar modelo')),
        resultado);
    }));
  }

  function auditoria() {
    const st = App.estado();
    const itens = st.auditoria.slice().reverse().slice(0, 100);
    return h('div', { class: 'cartao' }, h('h2', null, 'Registro de auditoria'), h('p', { class: 'ajuda' }, 'Acessos a dados sensíveis, decisões sobre documentos, mudanças de perfil e de regras. Mostra os 100 mais recentes.'),
      itens.length ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' }, h('thead', null, h('tr', null, ['Quando', 'Quem', 'O quê', 'Em'].map(function (t) { return h('th', null, t); }))),
        h('tbody', null, itens.map(function (a) { return h('tr', null, h('td', null, U.fmtDateTime(a.em)), h('td', null, a.usuario), h('td', null, a.acao), h('td', null, a.recurso)); })))) : UI.vazio('Nenhum registro ainda', 'Os acessos e as decisões aparecem aqui conforme acontecem.'));
  }

  function admin(m) {
    const aba = m[1] || 'perfis';
    const corpo = { perfis: perfis, instituicoes: instituicoes, integracao: integracao, auditoria: auditoria }[aba] || perfis;
    return h('section', { class: 'pagina' }, h('h1', null, 'Administração'),
      h('nav', { class: 'abas', 'aria-label': 'Seções da administração' }, ABAS.map(function (a) { return h('a', { href: '#/admin/' + a[0], class: 'aba' + (a[0] === aba ? ' ativa' : ''), 'aria-current': a[0] === aba ? 'page' : null }, a[1]); })),
      corpo());
  }

  Object.assign(V, { admin });
})(typeof self !== 'undefined' ? self : this);
