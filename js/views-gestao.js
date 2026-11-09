/* views-gestao.js */
/* Telas da equipe do DRI/NEI e da diretora (US06, US19, US20, US21). */
(function (root) {
  'use strict';
  const U = root.GCUtil, Policy = root.GCPolicy, S = root.GCServices, UI = root.GCUI, App = root.GCApp, V = root.GCViews;
  const h = UI.h;
  const reveladas = new Set(); // documentos sensíveis já exibidos nesta navegação (cada abertura é auditada)
  window.addEventListener('hashchange', function () { reveladas.clear(); });

  const nomeAluno = function (st, id) { const a = st.usuarios.find(function (x) { return x.id === id; }); return a ? a.nome : 'Aluno removido'; };
  const vagaDe = function (st, id) { return st.vagas.find(function (v) { return v.id === id; }); };
  function metrica(valor, rotulo) { return h('div', { class: 'cartao metrica' }, h('strong', null, String(valor)), h('span', null, rotulo)); }

  // ---------- Painel e fila de conferência ----------
  function painel() {
    const st = App.estado(), u = App.usuario();
    const cands = st.candidaturas.filter(function (c) { return c.instId === u.instId; });
    const conferir = cands.filter(function (c) { return c.status === 'em_andamento' && c.etapa === 1; });
    const selecao = cands.filter(function (c) { return c.status === 'em_andamento' && c.etapa === 2; });
    const contar = function (st_) { return cands.reduce(function (n, c) { return n + c.documentos.filter(function (d) { return d.status === st_; }).length; }, 0); };
    const vagasAbertas = st.vagas.filter(function (v) { return v.instId === u.instId && S.vagaAberta(v, new Date()); }).length;

    const tabela = function (lista, vazio, rotuloBotao) {
      if (!lista.length) return UI.vazio(vazio);
      return h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' },
        h('thead', null, h('tr', null, ['Aluno', 'Vaga', 'Para conferir', 'Devolvidos', 'Atualizada em', ''].map(function (t) { return h('th', null, t); }))),
        h('tbody', null, lista.map(function (c) {
          const v = vagaDe(st, c.vagaId);
          return h('tr', null, h('td', null, nomeAluno(st, c.alunoId)), h('td', null, v ? v.universidade : 'Vaga removida'),
            h('td', null, String(c.documentos.filter(function (d) { return d.status === 'enviado'; }).length)),
            h('td', null, String(c.documentos.filter(function (d) { return d.status === 'reenviar'; }).length)),
            h('td', null, U.fmtDate(c.atualizadaEm)), h('td', null, h('a', { href: '#/gestao/candidatura/' + c.id, class: 'btn btn-sec' }, rotuloBotao)));
        }))));
    };
    return h('section', { class: 'pagina' }, h('h1', null, 'Gestão do intercâmbio'),
      h('p', { class: 'ajuda' }, 'Olá, ' + u.nome + '. Esta é a fila de trabalho da sua instituição.'),
      h('div', { class: 'metricas' }, metrica(conferir.length, 'candidaturas em conferência'), metrica(contar('enviado'), 'documentos para conferir'), metrica(contar('reenviar'), 'devolvidos aguardando o aluno'), metrica(vagasAbertas, 'vagas abertas')),
      h('h2', null, 'Fila de conferência'), tabela(conferir, 'Nenhuma candidatura aguardando conferência.', 'Conferir'),
      h('h2', null, 'Aguardando resultado da seleção'), tabela(selecao, 'Nenhuma candidatura na etapa de seleção.', u.perfil === 'diretora' ? 'Definir resultado' : 'Ver'));
  }

  // ---------- Conferência de uma candidatura (US19) ----------
  function candidaturaGestao(m) {
    const st = App.estado(), u = App.usuario();
    const c = st.candidaturas.find(function (x) { return x.id === m[1] && x.instId === u.instId; });
    if (!c) return h('section', { class: 'pagina' }, UI.vazio('Candidatura não encontrada', 'Ela não existe ou é de outra instituição.', h('a', { href: '#/gestao', class: 'btn btn-primario' }, 'Voltar à fila')));
    const v = vagaDe(st, c.vagaId), aluno = st.usuarios.find(function (x) { return x.id === c.alunoId; });
    const acad = ((st.academico[u.instId] || {})[aluno && aluno.matricula]) || null;
    const conferivel = c.status === 'em_andamento' && c.etapa === 1;

    const docs = c.documentos.map(function (d) {
      const chave = c.id + ':' + d.exigidoId;
      const oculto = d.sensivel && !reveladas.has(chave);
      const ultima = d.versoes[d.versoes.length - 1];
      let arquivo;
      if (!ultima) arquivo = h('p', { class: 'ajuda' }, 'Nenhum arquivo enviado.');
      else if (oculto) {
        arquivo = h('div', { class: 'protegido' }, h('span', null, 'Dado sensível protegido. Cada visualização fica registrada na auditoria.'),
          h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { App.executar(function () { S.auditar(st, u, 'Acesso a documento sensível', d.nome + ' (' + c.id + ')'); reveladas.add(chave); }); } }, 'Mostrar arquivo'));
      } else {
        arquivo = h('ul', { class: 'versoes' }, d.versoes.slice().reverse().map(function (ver) {
          return h('li', null, ver.nome + ' (' + U.fmtBytes(ver.tamanho) + '), versão ' + ver.n + ', ' + U.fmtDateTime(ver.enviadoEm) + ' ',
            h('button', { type: 'button', class: 'btn-link', onclick: function () { V.abrirArquivo(ver); } }, 'Abrir'));
        }));
      }
      const acoes = (conferivel && d.status === 'enviado') ? h('div', { class: 'acoes' },
        h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { App.executar(function () { S.conferirDocumento(st, u, c.id, d.exigidoId, 'aprovar'); }, 'Documento aprovado.'); } }, 'Aprovar'),
        h('button', { type: 'button', class: 'btn btn-perigo', onclick: function () { devolver(d); } }, 'Devolver com motivo')) : null;
      return h('li', { class: 'doc doc-' + d.status },
        h('div', { class: 'doc-topo' }, h('div', null, h('strong', null, d.nome), ' ', UI.chip(d.obrigatorio ? 'Obrigatório' : 'Opcional', d.obrigatorio ? 'info' : 'neutro'), d.sensivel ? UI.chip('Dado sensível', 'alerta') : null), V.chipDoc(d.status)),
        d.status === 'reenviar' ? h('div', { class: 'aviso alerta' }, 'Devolvido: ' + d.motivo + ' Aguardando o aluno.') : null,
        d.conferidoPor ? h('p', { class: 'ajuda' }, 'Última decisão: ' + d.conferidoPor + ', ' + U.fmtDateTime(d.conferidoEm) + '.') : null,
        arquivo, acoes);
    });

    function devolver(d) {
      const motivo = h('textarea', { rows: '4', placeholder: 'Explique o que o aluno precisa corrigir.', 'aria-label': 'Motivo da devolução' });
      UI.modal({
        titulo: 'Devolver: ' + d.nome, corpo: UI.campo('Motivo da devolução (obrigatório)', motivo, 'O aluno recebe este texto no aviso e por e-mail.'),
        acoes: [{ rotulo: 'Cancelar', tipo: 'sec' }, {
          rotulo: 'Devolver documento', tipo: 'perigo', onClick: function () {
            try { S.conferirDocumento(st, u, c.id, d.exigidoId, 'devolver', motivo.value); App.salvar(); UI.toast('Documento devolvido. O aluno foi avisado.', 'ok'); App.render(); }
            catch (e) { UI.toast(e.message, 'erro'); return false; }
          }
        }]
      });
    }

    let resultado = null;
    if (c.status === 'em_andamento' && c.etapa === 2) {
      if (App.pode('resultado:definir')) {
        const sel = h('select', { 'aria-label': 'Resultado' }, h('option', { value: 'aprovado' }, 'Aprovada'), h('option', { value: 'lista_espera' }, 'Lista de espera'), h('option', { value: 'nao_aprovado' }, 'Não aprovada'));
        resultado = h('div', { class: 'cartao' }, h('h2', null, 'Definir resultado'), h('p', null, 'Todos os documentos foram aprovados. Registre o resultado da seleção.'), UI.campo('Resultado', sel),
          h('button', { type: 'button', class: 'btn btn-primario', onclick: function () { App.executar(function () { S.definirResultado(st, u, c.id, sel.value); }, 'Resultado registrado e aluno avisado.'); } }, 'Registrar resultado'));
      } else resultado = h('div', { class: 'cartao' }, h('p', null, 'Documentos aprovados. O resultado da seleção é definido pela diretora.'));
    } else if (c.status === 'finalizada') resultado = h('div', { class: 'cartao' }, h('h2', null, 'Resultado'), V.chipCand(c));

    return h('section', { class: 'pagina' }, h('a', { href: '#/gestao', class: 'voltar' }, '← Fila de conferência'),
      h('div', { class: 'cartao' }, h('h1', null, nomeAluno(st, c.alunoId) + ' · ' + (v ? v.universidade : '')), h('div', { class: 'chips' }, V.chipCand(c), UI.chip('Etapa: ' + S.ETAPAS[c.etapa], 'neutro'), v ? V.prazoChip(v) : null), V.stepper(c)),
      h('div', { class: 'duas-colunas' },
        h('div', null, h('div', { class: 'cartao' }, h('h2', null, 'Documentos'), h('ul', { class: 'docs' }, docs)), resultado),
        h('div', null,
          h('div', { class: 'cartao' }, h('h2', null, 'Dados do aluno'), V.linhaInfo('Curso', aluno && aluno.curso ? aluno.curso + ', ' + aluno.semestre + 'º semestre' : 'Sem dado'),
            V.linhaInfo('Matrícula', aluno && aluno.matricula || 'Sem dado'),
            acad ? [V.linhaInfo('Média', U.fmtNum(acad.media)), V.linhaInfo('Curso concluído', U.fmtNum(acad.percentualConcluido, 0) + '%'), V.linhaInfo('Reprovações', String(acad.reprovacoes)), h('p', { class: 'ajuda' }, 'Fonte: sistema acadêmico, em ' + U.fmtDateTime(acad.atualizadoEm) + '.')] : h('p', { class: 'ajuda' }, 'Sem dados acadêmicos importados.')),
          h('div', { class: 'cartao' }, h('h2', null, 'Histórico'), V.historico(c)))));
  }

  // ---------- Vagas (US20) ----------
  function vagas() {
    const st = App.estado(), u = App.usuario();
    const lista = st.vagas.filter(function (v) { return v.instId === u.instId; });
    return h('section', { class: 'pagina' }, h('div', { class: 'titulo-acao' }, h('h1', null, 'Gestão de vagas'), h('a', { href: '#/gestao/vaga/nova', class: 'btn btn-primario' }, 'Nova vaga')),
      h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' },
        h('thead', null, h('tr', null, ['Universidade', 'País', 'Prazo', 'Situação', 'Atualizada em', 'Ações'].map(function (t) { return h('th', null, t); }))),
        h('tbody', null, lista.map(function (v) {
          const aberta = S.vagaAberta(v, new Date());
          return h('tr', null, h('td', null, h('strong', null, v.universidade), h('small', { class: 'bloco' }, v.area)), h('td', null, v.pais), h('td', null, U.fmtDate(v.prazo)),
            h('td', null, UI.chip(aberta ? 'Aberta' : (v.status === 'encerrada' ? 'Encerrada' : 'Prazo vencido'), aberta ? 'ok' : 'neutro')), h('td', null, U.fmtDate(v.atualizadoEm)),
            h('td', null, h('div', { class: 'acoes' }, h('a', { href: '#/gestao/vaga/' + v.id, class: 'btn btn-sec' }, 'Editar'),
              h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { App.executar(function () { S.alterarStatusVaga(st, u, v.id, v.status === 'aberta' ? 'encerrada' : 'aberta'); }, v.status === 'aberta' ? 'Vaga encerrada. Novas candidaturas estão bloqueadas.' : 'Vaga reaberta.'); } }, v.status === 'aberta' ? 'Encerrar' : 'Reabrir'))));
        })))));
  }

  function vagaEditor(m) {
    const st = App.estado(), u = App.usuario();
    const nova = m[1] === 'nova';
    const v = nova ? null : st.vagas.find(function (x) { return x.id === m[1] && x.instId === u.instId; });
    if (!nova && !v) return h('section', { class: 'pagina' }, UI.vazio('Vaga não encontrada', null, h('a', { href: '#/gestao/vagas', class: 'btn btn-primario' }, 'Voltar')));
    const val = function (k, pad) { return v ? v[k] : pad; };
    const f = {
      universidade: h('input', { type: 'text', value: val('universidade', '') }), pais: h('input', { type: 'text', value: val('pais', '') }), paisCod: h('input', { type: 'text', maxlength: '2', value: val('paisCod', ''), 'aria-label': 'Código do país' }),
      area: h('input', { type: 'text', value: val('area', '') }), duracao: h('input', { type: 'text', value: val('duracao', ''), placeholder: 'Ex.: 1 semestre' }), idioma: h('input', { type: 'text', value: val('idioma', '') }),
      custo: h('input', { type: 'text', value: val('custo', ''), placeholder: 'Ex.: €650/mês' }), bolsa: h('input', { type: 'checkbox', checked: v ? v.bolsa : false }),
      prazo: h('input', { type: 'date', value: val('prazo', '') }), pconf: h('input', { type: 'date', value: v && v.prazos ? v.prazos.conferencia || '' : '' }), pres: h('input', { type: 'date', value: v && v.prazos ? v.prazos.resultado || '' : '' }),
      media: h('input', { type: 'text', inputmode: 'decimal', value: v ? String(v.regra.mediaMin).replace('.', ',') : '7,0' }), perc: h('input', { type: 'number', min: '0', max: '100', value: v ? v.regra.percentualMin : 50 }), reprov: h('input', { type: 'number', min: '0', step: '1', value: v ? v.regra.maxReprovacoes : 1 })
    };
    const linhasDocs = h('div', { class: 'docs-edicao' });
    const docsEstado = (v ? v.docs : [{ nome: 'Histórico escolar', obrigatorio: true }, { nome: 'Carta de motivação', obrigatorio: true }]).map(function (d) { return Object.assign({}, d); });
    function pintarDocs() {
      UI.clear(linhasDocs);
      docsEstado.forEach(function (d, i) {
        linhasDocs.appendChild(h('div', { class: 'doc-edicao' },
          h('input', { type: 'text', value: d.nome, placeholder: 'Nome do documento', 'aria-label': 'Nome do documento ' + (i + 1), oninput: function (e) { d.nome = e.target.value; } }),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!d.obrigatorio, onchange: function (e) { d.obrigatorio = e.target.checked; } }), ' Obrigatório'),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!d.sensivel, onchange: function (e) { d.sensivel = e.target.checked; } }), ' Sensível'),
          h('button', { type: 'button', class: 'btn-link', onclick: function () { docsEstado.splice(i, 1); pintarDocs(); } }, 'Remover')));
      });
    }
    pintarDocs();
    const dec = function (x) { return Number(String(x).replace(',', '.')); };
    function salvar(e) {
      e.preventDefault();
      const dados = {
        id: v ? v.id : undefined, universidade: f.universidade.value, pais: f.pais.value, paisCod: f.paisCod.value, area: f.area.value, duracao: f.duracao.value, idioma: f.idioma.value, custo: f.custo.value,
        bolsa: f.bolsa.checked, prazo: f.prazo.value, prazos: { conferencia: f.pconf.value, resultado: f.pres.value },
        regra: { mediaMin: dec(f.media.value), percentualMin: dec(f.perc.value), maxReprovacoes: dec(f.reprov.value) }, docs: docsEstado
      };
      try { S.salvarVaga(st, u, dados); App.salvar(); UI.toast(v ? 'Vaga atualizada.' : 'Vaga publicada.', 'ok'); location.hash = '#/gestao/vagas'; }
      catch (err) { UI.toast(err.message, 'erro'); }
    }
    return h('section', { class: 'pagina estreita' }, h('a', { href: '#/gestao/vagas', class: 'voltar' }, '← Gestão de vagas'), h('h1', null, nova ? 'Nova vaga' : 'Editar vaga'),
      h('form', { class: 'cartao form', onsubmit: salvar },
        h('h2', null, 'Dados da vaga'), UI.campo('Universidade de destino', f.universidade), h('div', { class: 'duas-cols-form' }, UI.campo('País', f.pais), UI.campo('Código do país (2 letras)', f.paisCod)),
        UI.campo('Área de estudo', f.area), h('div', { class: 'duas-cols-form' }, UI.campo('Duração', f.duracao), UI.campo('Idioma exigido', f.idioma)),
        h('div', { class: 'duas-cols-form' }, UI.campo('Custo estimado', f.custo), h('label', { class: 'check alinhar-baixo' }, f.bolsa, ' Bolsa disponível')),
        h('h2', null, 'Prazos'), h('div', { class: 'tres-cols-form' }, UI.campo('Fim das inscrições', f.prazo), UI.campo('Conferência dos documentos', f.pconf), UI.campo('Resultado', f.pres)),
        h('h2', null, 'Regra de elegibilidade'), h('div', { class: 'tres-cols-form' }, UI.campo('Média mínima (0 a 10)', f.media), UI.campo('Curso concluído mínimo (%)', f.perc), UI.campo('Máximo de reprovações', f.reprov)),
        h('p', { class: 'ajuda' }, 'A nova regra vale para as próximas verificações. A alteração fica registrada na auditoria.'),
        h('h2', null, 'Documentos exigidos'), linhasDocs, h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { docsEstado.push({ nome: '', obrigatorio: true }); pintarDocs(); } }, 'Adicionar documento'),
        h('div', { class: 'acoes' }, h('button', { type: 'submit', class: 'btn btn-primario' }, nova ? 'Publicar vaga' : 'Salvar alterações'), h('a', { href: '#/gestao/vagas', class: 'btn btn-sec' }, 'Cancelar'))));
  }

  // ---------- Relatórios (US21) ----------
  function relatorios() {
    const st = App.estado(), u = App.usuario();
    const r = S.relatorios(st, u);
    const bloco = function (titulo, itens) {
      const max = Math.max.apply(null, itens.map(function (i) { return i.total; }).concat([1]));
      return h('div', { class: 'cartao' }, h('h2', null, titulo), itens.length ? h('ul', { class: 'barras' }, itens.map(function (i) {
        return h('li', null, h('div', { class: 'barra-rotulo' }, h('span', null, i.nome), h('strong', null, String(i.total))), h('div', { class: 'barra-trilho' }, h('div', { class: 'barra', style: 'width:' + Math.round(i.total / max * 100) + '%' })));
      })) : UI.vazio('Sem dados ainda'));
    };
    return h('section', { class: 'pagina' }, h('h1', null, 'Relatórios do programa'), h('p', { class: 'ajuda' }, 'Total de candidaturas na instituição: ' + r.total + '.'),
      h('div', { class: 'grade-guias' }, bloco('Destinos mais procurados', r.porDestino), bloco('Perfil dos candidatos (curso)', r.porCurso), bloco('Situação das candidaturas', r.porStatus)));
  }

  // ---------- Moderação de relatos (US26) ----------
  function relatosGestao() {
    const st = App.estado(), u = App.usuario();
    const pend = st.relatos.filter(function (r) { return r.instId === u.instId && r.status === 'pendente'; });
    return h('section', { class: 'pagina estreita' }, h('h1', null, 'Moderação de relatos'),
      pend.length ? pend.map(function (r) {
        return h('article', { class: 'cartao' }, h('div', { class: 'chips' }, UI.chip(r.destino, 'info'), r.mentor ? UI.chip('Quer ser mentor', 'ok') : null), h('h2', null, r.titulo), h('p', null, r.texto), h('small', { class: 'ajuda' }, 'Por ' + r.autor),
          h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { App.executar(function () { S.moderarRelato(st, u, r.id, true); }, 'Relato publicado.'); } }, 'Aprovar'),
            h('button', { type: 'button', class: 'btn btn-perigo', onclick: function () { App.executar(function () { S.moderarRelato(st, u, r.id, false); }, 'Relato recusado.'); } }, 'Recusar')));
      }) : UI.vazio('Nenhum relato aguardando moderação'));
  }

  Object.assign(V, { painel, candidaturaGestao, vagas, vagaEditor, relatorios, relatosGestao });
})(typeof self !== 'undefined' ? self : this);
