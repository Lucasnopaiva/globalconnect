/* views-public.js */
/* Telas públicas e de acesso: vagas, detalhe da vaga, login, guias, eventos, FAQ e relatos. */
(function (root) {
  'use strict';
  const U = root.GCUtil, Policy = root.GCPolicy, S = root.GCServices, UI = root.GCUI, App = root.GCApp;
  const h = UI.h;

  function regraTexto(v) {
    return 'Média ≥ ' + U.fmtNum(v.regra.mediaMin) + '  |  ≥ ' + U.fmtNum(v.regra.percentualMin, 0) + '% do curso concluído  |  até ' + v.regra.maxReprovacoes + ' reprovação(ões)';
  }
  function prazoChip(v) {
    const d = U.diasAte(v.prazo, new Date());
    if (v.status !== 'aberta' || d < 0) return UI.chip('Encerrada', 'neutro');
    if (d <= 7) return UI.chip('Prazo em ' + d + ' dia(s)', 'alerta');
    return UI.chip('Inscrições até ' + U.fmtDate(v.prazo), 'info');
  }
  function linhaInfo(rotulo, valor) { return h('div', { class: 'info-linha' }, h('span', { class: 'info-rotulo' }, rotulo), h('span', null, valor)); }

  /** Foto da vaga. Sem foto disponível, mostra um marcador tipográfico (nunca gradiente nem ícone). */
  function imagemVaga(v, variante, classe) {
    const mapa = root.GCImagens || {};
    const src = mapa[v.id] || mapa[String(v.paisCod || '').toLowerCase()];
    const media = h('div', { class: (classe || 'media') + ' ' + (variante || '') });
    if (src) media.appendChild(h('img', { src: src, alt: 'Foto de ' + v.universidade + ', ' + v.pais, loading: 'lazy' }));
    else media.appendChild(h('div', { class: 'marcador', 'aria-hidden': 'true' }, h('strong', null, v.pais), h('span', null, v.paisCod)));
    return media;
  }

  /** variante: 'destaque' (foto grande e título display), 'secundaria' (foto 16:9 e título de 22px) */
  function cartaoVaga(v, elig, variante) {
    const aberta = S.vagaAberta(v, new Date());
    const href = '#/vaga/' + v.id;
    return h('article', { class: 'cartao vaga ' + (variante || 'secundaria') + (aberta ? '' : ' encerrada') },
      h('a', { href: href, tabindex: '-1', 'aria-hidden': 'true' }, imagemVaga(v, variante === 'destaque' ? 'destaque' : 'secundaria')),
      h('div', { class: 'texto' },
        h('h3', null, h('a', { href: href }, v.universidade)),
        h('p', { class: 'meta-linha' }, v.pais + ' · ' + v.duracao + ' · ' + v.idioma),
        h('div', { class: 'chips' }, UI.chip(v.bolsa ? 'Bolsa disponível' : 'Auto-financiado', v.bolsa ? 'info' : 'neutro'), UI.chip('Custo estimado: ' + v.custo, 'neutro'), prazoChip(v)),
        h('p', { class: 'regra' }, v.area + '. ' + regraTexto(v)),
        elig ? h('p', { class: 'elig ' + (elig.elegivel ? 'sim' : 'nao') }, elig.elegivel ? 'Você é elegível' : 'Você ainda não é elegível') : null,
        h('div', { class: 'rodape-vaga' }, h('span', null, 'Última atualização: ' + U.fmtDate(v.atualizadoEm)), h('a', { href: href, class: 'btn btn-sec' }, 'Ver detalhes'))));
  }

  // ---------- Lista de vagas (US01, US02): hero + composição editorial de 2 colunas ----------
  function lista() {
    const st = App.estado(), instId = App.instId(), u = App.usuario();
    const op = S.opcoesFiltro(st, instId);
    const f = { q: '', pais: '', area: '', duracao: '' };
    const resultado = h('div');
    const contagem = h('p', { class: 'contagem', role: 'status', 'aria-live': 'polite' });
    let elig = null;
    const tags = [];

    function pintar() {
      const vs = S.listarVagas(st, instId, f).sort(function (a, b) { return (S.vagaAberta(b, new Date()) ? 1 : 0) - (S.vagaAberta(a, new Date()) ? 1 : 0); });
      UI.clear(resultado);
      contagem.textContent = vs.length + (vs.length === 1 ? ' vaga encontrada' : ' vagas encontradas');
      if (!vs.length) { resultado.appendChild(UI.vazio('Nenhuma vaga encontrada', 'Tente remover algum filtro ou buscar por outro nome.', h('button', { type: 'button', class: 'btn btn-sec', onclick: limpar }, 'Limpar filtros'))); return; }
      const e = function (v) { return elig ? elig[v.id] : null; };
      const pilha = vs.slice(1, 4);
      resultado.appendChild(h('div', { class: 'vagas-editorial' }, cartaoVaga(vs[0], e(vs[0]), 'destaque'), pilha.length ? h('div', { class: 'pilha' }, pilha.map(function (v) { return cartaoVaga(v, e(v), 'secundaria'); })) : null));
      if (vs.length > 4) resultado.appendChild(h('div', { class: 'vagas-resto' }, vs.slice(4).map(function (v) { return cartaoVaga(v, e(v), 'secundaria'); })));
    }
    const busca = h('input', { type: 'search', placeholder: 'Buscar universidade ou país', 'aria-label': 'Buscar universidade ou país', oninput: function (e) { f.q = e.target.value; pintar(); } });
    const sel = function (rotulo, chave, valores) {
      return h('select', { 'aria-label': rotulo, onchange: function (e) { f[chave] = e.target.value; pintar(); } }, h('option', { value: '' }, rotulo), valores.map(function (x) { return h('option', { value: x }, x); }));
    };
    const sArea = sel('Área de estudo', 'area', op.areas), sDur = sel('Duração', 'duracao', op.duracoes);
    op.paises.forEach(function (p) {
      const t = h('button', { type: 'button', class: 'tag', 'aria-pressed': 'false', onclick: function () {
        f.pais = f.pais === p ? '' : p;
        tags.forEach(function (x) { x.setAttribute('aria-pressed', x.textContent === f.pais ? 'true' : 'false'); });
        pintar();
      } }, p);
      tags.push(t);
    });
    function limpar() { f.q = f.pais = f.area = f.duracao = ''; busca.value = ''; sArea.value = sDur.value = ''; tags.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); pintar(); }

    pintar();
    if (u && u.perfil === 'aluno') {
      S.obterDadosAcademicos(st, u).then(function (r) {
        App.salvar();
        elig = {};
        st.vagas.filter(function (v) { return v.instId === instId; }).forEach(function (v) { elig[v.id] = S.avaliarElegibilidade(v, r.dados); });
        pintar();
      }).catch(function (e) { App.salvar(); UI.toast(e.message, 'erro'); });
    }
    return h('section', { class: 'pagina' },
      h('div', { class: 'heroi' },
        h('span', { class: 'heroi-badge' }, 'Portal de Mobilidade Acadêmica Internacional'),
        h('h1', null, 'Para onde o seu intercâmbio vai levar você?'),
        h('p', null, 'Pesquise vagas, destinos e requisitos.' + (u && u.perfil === 'aluno' ? ' Cada vaga mostra se você é elegível.' : '')),
        h('div', { class: 'busca-hero', role: 'search' }, UI.icon('search', 20), busca),
        h('div', { class: 'fileira-tags', role: 'group', 'aria-label': 'Filtrar por país' }, tags),
        h('div', { class: 'filtros-linha' }, sArea, sDur, h('button', { type: 'button', class: 'btn-link', onclick: limpar }, 'Limpar filtros'))),
      contagem, resultado);
  }

  // ---------- Detalhe da vaga e elegibilidade (US03, US07, US08) ----------
  function detalhe(m) {
    const st = App.estado(), u = App.usuario();
    const v = st.vagas.find(function (x) { return x.id === m[1]; });
    if (!v || v.instId !== App.instId()) return h('section', { class: 'pagina' }, UI.vazio('Vaga não encontrada', 'Ela pode ter sido removida ou ser de outra instituição.', h('a', { href: '#/', class: 'btn btn-primario' }, 'Ver todas as vagas')));
    const aberta = S.vagaAberta(v, new Date());

    const esq = h('div', null,
      imagemVaga(v, '', 'detalhe-media'),
      h('div', { class: 'detalhe-topo' }, h('p', { class: 'meta-linha ajuda' }, v.pais + ' · ' + v.area), h('h1', null, v.universidade)),
      h('div', { class: 'chips' }, UI.chip(v.bolsa ? 'Bolsa disponível' : 'Auto-financiado', v.bolsa ? 'info' : 'neutro'), UI.chip('Custo estimado: ' + v.custo, 'neutro'), prazoChip(v)),
      h('div', { class: 'info-grade' }, linhaInfo('Área', v.area), linhaInfo('Duração', v.duracao), linhaInfo('Idioma exigido', v.idioma), linhaInfo('Prazo de inscrição', U.fmtDate(v.prazo)),
        linhaInfo('Conferência dos documentos', U.fmtDate(v.prazos && v.prazos.conferencia)), linhaInfo('Resultado', U.fmtDate(v.prazos && v.prazos.resultado))),
      h('h2', null, 'Requisitos de elegibilidade'), h('p', null, regraTexto(v)),
      h('h2', null, 'Documentos exigidos'),
      h('ul', { class: 'lista-docs' }, v.docs.map(function (d) { return h('li', null, d.nome, ' ', UI.chip(d.obrigatorio ? 'Obrigatório' : 'Opcional', 'neutro'), d.sensivel ? UI.chip('Dado sensível', 'alerta') : null); })),
      h('p', { class: 'ajuda' }, 'Última atualização desta vaga: ' + U.fmtDateTime(v.atualizadoEm) + '.'));

    const painel = h('aside', { class: 'cartao painel-elig', 'aria-live': 'polite' });
    const dir = h('div', null, painel);

    function topoPainel() { UI.clear(painel); painel.appendChild(h('h2', null, 'Sua elegibilidade')); }
    if (!u) {
      topoPainel();
      painel.appendChild(h('p', null, 'Entre com o seu login institucional para ver, na hora, se você cumpre os requisitos desta vaga.'));
      painel.appendChild(h('a', { href: '#/login', class: 'btn btn-primario' }, 'Entrar com login institucional'));
    } else if (u.perfil !== 'aluno') {
      topoPainel();
      painel.appendChild(h('p', null, 'A verificação de elegibilidade é feita para alunos.'));
      if (App.pode('vaga:gerenciar')) painel.appendChild(h('a', { href: '#/gestao/vaga/' + v.id, class: 'btn btn-primario' }, 'Editar esta vaga'));
    } else {
      const carregar = async function (forcar) {
        topoPainel();
        painel.appendChild(h('p', { class: 'ajuda' }, 'Consultando o sistema acadêmico...'));
        try {
          const r = await S.obterDadosAcademicos(st, u, { forcar: !!forcar });
          App.salvar();
          desenhar(r);
        } catch (e) {
          App.salvar();
          topoPainel();
          painel.appendChild(h('div', { class: 'aviso erro' }, e.message));
          painel.appendChild(h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { carregar(true); } }, 'Tentar de novo'));
        }
      };
      const desenhar = function (r) {
        topoPainel();
        const ev = S.avaliarElegibilidade(v, r.dados);
        painel.appendChild(h('p', { class: 'elig-resultado ' + (ev.elegivel ? 'sim' : 'nao') }, ev.elegivel ? 'Você é elegível a esta vaga' : 'Você ainda não é elegível a esta vaga'));
        if (r.desatualizado) painel.appendChild(h('div', { class: 'aviso alerta' }, 'Não foi possível atualizar agora. Estamos usando os dados de ' + U.fmtDateTime(r.atualizadoEm) + ' e a equipe foi avisada.'));
        painel.appendChild(h('ul', { class: 'criterios' }, ev.criterios.map(function (c) {
          return h('li', { class: c.ok ? 'ok' : 'falha' },
            h('div', null, h('strong', null, c.rotulo), h('span', { class: 'v' }, ' ' + c.atual + ' (' + c.exigido + ')'), c.ok ? null : h('span', { class: 'falta' }, 'Falta: ' + c.falta)),
            UI.chip(c.ok ? 'Cumprido' : 'Não cumprido', c.ok ? 'neutro' : 'alerta'));
        })));
        painel.appendChild(h('p', { class: 'ajuda' }, 'Dados acadêmicos de ' + U.fmtDateTime(r.atualizadoEm) + ' (fonte: sistema acadêmico). Você não pode editá-los.'));
        const existente = st.candidaturas.find(function (c) { return c.alunoId === u.id && c.vagaId === v.id; });
        const acoes = h('div', { class: 'acoes' });
        if (existente) acoes.appendChild(h('a', { href: '#/candidatura/' + existente.id, class: 'btn btn-primario' }, 'Ver minha candidatura'));
        else if (!aberta) acoes.appendChild(h('button', { type: 'button', class: 'btn btn-primario', disabled: true }, 'Vaga encerrada'));
        else if (!ev.elegivel) acoes.appendChild(h('button', { type: 'button', class: 'btn btn-primario', disabled: true }, 'Você não cumpre os requisitos'));
        else acoes.appendChild(h('button', {
          type: 'button', class: 'btn btn-primario', onclick: function () {
            App.exigirConsentimento(function () {
              const c = App.executar(function () { return S.candidatar(st, u, v.id, r.dados); }, 'Candidatura iniciada. Envie os documentos.', true);
              if (c) location.hash = '#/candidatura/' + c.id;
            });
          }
        }, 'Candidatar-me'));
        acoes.appendChild(h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { carregar(true); } }, 'Atualizar dados'));
        painel.appendChild(acoes);
      };
      carregar(false);
    }
    return h('section', { class: 'pagina' }, h('a', { href: '#/', class: 'voltar' }, '← Todas as vagas'), h('div', { class: 'duas-colunas' }, esq, dir));
  }

  // ---------- Login institucional simulado (US10) ----------
  function login() {
    const st = App.estado();
    const erro = h('div', { class: 'aviso erro', hidden: true, role: 'alert' });
    const email = h('input', { type: 'email', id: 'login-email', autocomplete: 'username', placeholder: 'seu.email@instituicao.edu', required: true });
    const senha = h('input', { type: 'password', id: 'login-senha', autocomplete: 'current-password', placeholder: 'Senha institucional', required: true });
    function entrar(e) {
      e.preventDefault();
      const u = st.usuarios.find(function (x) { return U.norm(x.email) === U.norm(email.value); });
      const msg = !u ? 'Usuário não encontrado na instituição.' : (!senha.value ? 'Informe a senha.' : '');
      senha.value = ''; // a senha nunca é guardada
      if (msg) { erro.textContent = msg; erro.hidden = false; return; }
      App.login(u.id);
    }
    const grupos = st.instituicoes.map(function (inst) {
      const us = st.usuarios.filter(function (x) { return x.instId === inst.id; });
      return h('div', { class: 'grupo-demo' }, h('h3', null, inst.nome),
        h('div', { class: 'demo-lista' }, us.map(function (x) {
          return h('button', { type: 'button', class: 'demo-user', onclick: function () { App.login(x.id); } }, h('strong', null, x.nome), h('small', null, Policy.PERFIS[x.perfil]), h('small', { class: 'mono' }, x.email));
        })));
    });
    return h('section', { class: 'pagina' }, h('div', { class: 'duas-colunas' },
      h('div', { class: 'cartao' },
        h('h1', null, 'Entrar com login institucional'),
        h('p', { class: 'ajuda' }, 'No produto final, esta tela é a do login da própria instituição. A senha não é guardada pelo GlobalConnect. Nesta demonstração, qualquer senha é aceita para os e-mails abaixo.'),
        h('form', { onsubmit: entrar, class: 'form' }, UI.campo('E-mail institucional', email), UI.campo('Senha', senha), erro, h('button', { type: 'submit', class: 'btn btn-primario' }, 'Entrar')),
        h('p', { class: 'ajuda' }, 'A sessão é encerrada após ' + App.SESSAO_MIN + ' minutos sem atividade.')),
      h('div', { class: 'cartao' }, h('h2', null, 'Usuários de demonstração'), h('p', { class: 'ajuda' }, 'Clique para entrar com cada perfil.'), grupos)));
  }

  // ---------- Guias, eventos, FAQ, relatos (US05, US22, US26, US27) ----------
  function guias() {
    const st = App.estado();
    const paises = st.vagas.filter(function (v) { return v.instId === App.instId(); }).map(function (v) { return v.pais; }).filter(function (p, i, a) { return a.indexOf(p) === i; });
    const gs = st.guias.filter(function (g) { return paises.indexOf(g.pais) !== -1; });
    return h('section', { class: 'pagina' }, h('h1', null, 'Guias de preparação'),
      h('p', { class: 'ajuda' }, 'Resumo do que costuma ser pedido em cada destino. Confirme sempre nas fontes oficiais (consulado, embaixada e universidade).'),
      gs.length ? h('div', { class: 'grade-guias' }, gs.map(function (g) {
        return h('article', { class: 'cartao' }, h('h2', null, g.pais),
          h('h3', null, 'Exames de idioma'), h('p', null, g.exames), h('h3', null, 'Visto'), h('p', null, g.visto), h('h3', null, 'Seguro-viagem'), h('p', null, g.seguro));
      })) : UI.vazio('Sem guias para esta instituição', 'Quando houver vagas com destinos cadastrados, os guias aparecem aqui.'));
  }

  function eventos() {
    const st = App.estado(), u = App.usuario();
    const lista = st.eventos.filter(function (e) { return e.instId === App.instId(); }).sort(function (a, b) { return a.data.localeCompare(b.data); });
    const guiaChegada = h('div', { class: 'cartao' }, h('h2', null, 'Guia de chegada para alunos estrangeiros'),
      h('ol', { class: 'lista-docs' },
        h('li', null, 'Apresente-se ao DRI/NEI na primeira semana, com o seu passaporte e a carta de aceite.'),
        h('li', null, 'Confirme a cobertura do seu seguro-saúde internacional.'),
        h('li', null, 'Participe da recepção de alunos estrangeiros e conheça o campus.'),
        h('li', null, 'Inscreva-se no Tandem para praticar idiomas e fazer amizades.'),
        h('li', null, 'Em caso de dúvida, consulte as perguntas frequentes ou fale com a equipe.')),
      h('a', { href: '#/faq', class: 'btn btn-sec' }, 'Ver perguntas frequentes'));
    return h('section', { class: 'pagina' }, h('h1', null, 'Tandem e eventos'),
      h('p', { class: 'ajuda' }, 'Encontros para praticar idiomas e integrar alunos estrangeiros e brasileiros.'), guiaChegada,
      lista.length ? h('div', { class: 'grade-guias' }, lista.map(function (e) {
        const inscrito = u && e.inscritos.indexOf(u.id) !== -1;
        let acao;
        if (!u) acao = h('a', { href: '#/login', class: 'btn btn-sec' }, 'Entre para se inscrever');
        else if (!App.pode('evento:inscrever')) acao = h('small', { class: 'ajuda' }, 'Inscrições são feitas por alunos e alunos estrangeiros.');
        else if (inscrito) acao = UI.chip('Inscrição confirmada', 'ok');
        else acao = h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { App.executar(function () { S.inscreverEvento(st, u, e.id); }, 'Inscrição confirmada em ' + e.titulo + '.'); } }, 'Inscrever-me');
        return h('article', { class: 'cartao' }, UI.chip(e.tipo, 'info'), h('h2', null, e.titulo), h('p', null, e.descricao), linhaInfo('Data', U.fmtDate(e.data)), linhaInfo('Local', e.local), linhaInfo('Inscritos', String(e.inscritos.length)), h('div', { class: 'acoes' }, acao));
      })) : UI.vazio('Nenhum evento no momento'));
  }

  function faq() {
    const st = App.estado();
    const inst = App.instId();
    const equipe = App.pode('faq:gerenciar');
    const caixa = h('div', { class: 'faq-lista' });
    const busca = h('input', { type: 'search', placeholder: 'Buscar uma pergunta...', 'aria-label': 'Buscar nas perguntas frequentes', oninput: pintar });
    function pintar() {
      const q = U.norm(busca.value);
      const itens = st.faq.filter(function (f) { return f.instId === inst && (!q || U.norm(f.pergunta + ' ' + f.resposta + ' ' + f.tema).indexOf(q) !== -1); });
      UI.clear(caixa);
      if (!itens.length) caixa.appendChild(UI.vazio('Nenhuma pergunta encontrada', 'Tente outra palavra.'));
      itens.forEach(function (f) {
        caixa.appendChild(h('details', { class: 'cartao faq-item' }, h('summary', null, UI.chip(f.tema, 'neutro'), ' ', f.pergunta), h('p', null, f.resposta),
          equipe ? h('button', { type: 'button', class: 'btn-link', onclick: function () { App.executar(function () { S.removerFaq(st, App.usuario(), f.id); }, 'Pergunta removida.'); } }, 'Remover') : null));
      });
    }
    pintar();
    let formulario = null;
    if (equipe) {
      const tema = h('input', { type: 'text', placeholder: 'Tema (ex.: Documentos)' }), perg = h('input', { type: 'text', placeholder: 'Pergunta' }), resp = h('textarea', { rows: '3', placeholder: 'Resposta' });
      formulario = h('form', { class: 'cartao form', onsubmit: function (e) { e.preventDefault(); App.executar(function () { S.salvarFaq(st, App.usuario(), { tema: tema.value, pergunta: perg.value, resposta: resp.value }); }, 'Pergunta adicionada.'); } },
        h('h2', null, 'Nova pergunta (equipe)'), UI.campo('Tema', tema), UI.campo('Pergunta', perg), UI.campo('Resposta', resp), h('button', { type: 'submit', class: 'btn btn-primario' }, 'Adicionar'));
    }
    return h('section', { class: 'pagina estreita' }, h('h1', null, 'Perguntas frequentes'), busca, caixa, formulario);
  }

  function relatos() {
    const st = App.estado(), u = App.usuario();
    const aprovados = st.relatos.filter(function (r) { return r.instId === App.instId() && r.status === 'aprovado'; });
    let formulario = null, meus = null;
    if (u && App.pode('relato:publicar')) {
      const titulo = h('input', { type: 'text', placeholder: 'Título do relato' }), destino = h('input', { type: 'text', placeholder: 'Universidade de destino' }), periodo = h('input', { type: 'text', placeholder: 'Período (ex.: 1 semestre)' });
      const texto = h('textarea', { rows: '5', placeholder: 'Conte como foi a sua experiência (mínimo de 30 caracteres).' }), mentor = h('input', { type: 'checkbox' });
      formulario = h('form', {
        class: 'cartao form', onsubmit: function (e) {
          e.preventDefault();
          App.executar(function () { S.publicarRelato(st, u, { titulo: titulo.value, destino: destino.value, periodo: periodo.value, texto: texto.value, mentor: mentor.checked }); }, 'Relato enviado para moderação da equipe.');
        }
      }, h('h2', null, 'Publicar um relato'), UI.campo('Título', titulo), UI.campo('Destino', destino), UI.campo('Período', periodo), UI.campo('Relato', texto),
        h('label', { class: 'check' }, mentor, ' Quero atuar como mentor de futuros candidatos'), h('button', { type: 'submit', class: 'btn btn-primario' }, 'Enviar para moderação'));
      const mine = st.relatos.filter(function (r) { return r.autorId === u.id && r.status !== 'aprovado'; });
      if (mine.length) meus = h('div', { class: 'cartao' }, h('h2', null, 'Meus relatos em análise'), h('ul', null, mine.map(function (r) { return h('li', null, r.titulo + ' ', UI.chip(r.status === 'pendente' ? 'Aguardando moderação' : 'Recusado', r.status === 'pendente' ? 'alerta' : 'neutro')); })));
    }
    return h('section', { class: 'pagina' }, h('h1', null, 'Relatos de quem já viajou'),
      h('p', { class: 'ajuda' }, 'Experiências de egressos. Os relatos passam por moderação da equipe antes de aparecer aqui.'),
      aprovados.length ? h('div', { class: 'grade-guias' }, aprovados.map(function (r) {
        return h('article', { class: 'cartao' }, h('div', { class: 'chips' }, UI.chip(r.destino, 'info'), r.periodo ? UI.chip(r.periodo, 'neutro') : null, r.mentor ? UI.chip('Disponível como mentor', 'ok') : null), h('h2', null, r.titulo), h('p', null, r.texto), h('small', { class: 'ajuda' }, 'Por ' + r.autor));
      })) : UI.vazio('Ainda não há relatos publicados'),
      formulario, meus);
  }

  root.GCViews = root.GCViews || {};
  Object.assign(root.GCViews, { regraTexto, prazoChip, linhaInfo, imagemVaga, lista, detalhe, login, guias, eventos, faq, relatos });
})(typeof self !== 'undefined' ? self : this);
