/* app.js */
/* Núcleo da aplicação: sessão, permissões, rotas e layout. */
(function (root) {
  'use strict';
  const U = root.GCUtil, Policy = root.GCPolicy, S = root.GCServices, UI = root.GCUI, Store = root.GCStore;
  const h = UI.h;
  const SESSAO_MIN = 15; // encerra a sessão por inatividade (US31)
  const KEY_INST = 'gc-mvp-inst-visitante';
  const rotas = [];
  let ultimoToque = 0;

  const App = {
    estado: function () { return Store.get(); },
    salvar: function () { return Store.save(); },
    aviso: function (m, t) { UI.toast(m, t); },
    rotas: rotas,
    rota: function (padrao, def) { rotas.push({ re: padrao, def: def }); },
    SESSAO_MIN: SESSAO_MIN
  };

  // ---------- Sessão ----------
  App.usuario = function () {
    const s = Store.lerSessao();
    if (!s) return null;
    if (Date.now() - s.ultimaAtividade > SESSAO_MIN * 60000) { Store.gravarSessao(null); return null; }
    return App.estado().usuarios.find(function (u) { return u.id === s.userId; }) || null;
  };
  App.perfil = function () { const u = App.usuario(); return u ? u.perfil : 'visitante'; };
  App.pode = function (acao) { return Policy.can(App.perfil(), acao); };
  App.instId = function () {
    const u = App.usuario();
    if (u) return u.instId;
    let v = null; try { v = window.localStorage.getItem(KEY_INST); } catch (e) { /* ignora */ }
    const st = App.estado();
    return st.instituicoes.some(function (i) { return i.id === v && i.ativa; }) ? v : st.instituicoes[0].id;
  };
  App.inst = function () { const id = App.instId(); return App.estado().instituicoes.find(function (i) { return i.id === id; }); };
  App.trocarInstVisitante = function (id) { try { window.localStorage.setItem(KEY_INST, id); } catch (e) { /* ignora */ } App.render(); };

  App.login = function (userId) {
    Store.gravarSessao({ userId: userId, ultimaAtividade: Date.now() });
    const st = App.estado();
    S.gerarAvisosDePrazo(st);
    App.salvar();
    const u = App.usuario();
    const destino = Policy.isStaff(u.perfil) ? '#/gestao' : (u.perfil === 'admin' ? '#/admin' : '#/');
    UI.toast('Bem-vindo(a), ' + u.nome + '.');
    if (location.hash === destino) App.render(); else location.hash = destino;
  };
  App.logout = function (motivo) {
    Store.gravarSessao(null);
    if (motivo) UI.toast(motivo, 'erro'); else UI.toast('Sessão encerrada.');
    if (location.hash === '#/login') App.render(); else location.hash = '#/login';
  };
  function registrarAtividade() {
    const agora = Date.now();
    if (agora - ultimoToque < 15000) return;
    ultimoToque = agora;
    const s = Store.lerSessao();
    if (s && agora - s.ultimaAtividade <= SESSAO_MIN * 60000) { s.ultimaAtividade = agora; Store.gravarSessao(s); }
  }
  function verificarInatividade() {
    const s = Store.lerSessao();
    if (s && Date.now() - s.ultimaAtividade > SESSAO_MIN * 60000) App.logout('Sessão encerrada por inatividade. Entre novamente.');
  }

  // ---------- Execução segura de ações ----------
  /** Executa uma ação de negócio: salva e redesenha; mostra o erro de forma amigável. */
  App.executar = function (fn, msgOk, semRender) {
    try {
      const r = fn();
      App.salvar();
      if (msgOk) UI.toast(msgOk, 'ok');
      if (!semRender) App.render();
      return r;
    } catch (e) {
      if (e && e.name === 'GCError') UI.toast(e.message, 'erro');
      else { console.error(e); UI.toast('Algo deu errado. Tente novamente.', 'erro'); }
      return undefined;
    }
  };

  /** Termo de uso de dados (LGPD, US29): exige aceite antes da primeira candidatura. */
  App.exigirConsentimento = function (aoAceitar) {
    const st = App.estado(), u = App.usuario();
    if (st.consentimentos[u.id]) { aoAceitar(); return; }
    const caixa = h('input', { type: 'checkbox', id: 'aceite-lgpd' });
    const corpo = h('div', null,
      h('p', null, 'Para avaliar a sua candidatura, o GlobalConnect usa os seus dados acadêmicos (média, percentual do curso concluído e reprovações) e os documentos que você enviar, incluindo o passaporte.'),
      h('ul', null,
        h('li', null, 'Finalidade: verificar a elegibilidade e conferir a candidatura ao intercâmbio.'),
        h('li', null, 'Quem acessa: apenas a equipe do DRI/NEI da sua instituição. Cada acesso a dado sensível fica registrado.'),
        h('li', null, 'Os dados são guardados somente enquanto forem necessários para o processo seletivo.')),
      h('label', { class: 'check' }, caixa, ' Li e aceito o uso dos meus dados para esta finalidade.'));
    UI.modal({
      titulo: 'Termo de uso de dados (LGPD)', corpo: corpo,
      acoes: [{ rotulo: 'Cancelar', tipo: 'sec' }, {
        rotulo: 'Aceitar e continuar', tipo: 'primario', onClick: function () {
          if (!caixa.checked) { UI.toast('Marque a caixa para aceitar o termo.', 'erro'); return false; }
          App.executar(function () { S.registrarConsentimento(st, u); }, null, true);
          aoAceitar();
        }
      }]
    });
  };

  // ---------- Layout ----------
  const NAV_PUBLICO = [['#/', 'Vagas'], ['#/guias', 'Guias'], ['#/eventos', 'Eventos'], ['#/faq', 'FAQ'], ['#/relatos', 'Relatos']];

  function ativo(href) {
    const hash = location.hash || '#/';
    if (href === '#/') return hash === '#/' || hash === '' || hash.indexOf('#/vaga/') === 0;
    return hash === href || hash.indexOf(href + '/') === 0;
  }
  function link(href, texto, extra) { return h('a', { href: href, class: 'nav-link' + (ativo(href) ? ' ativo' : ''), 'aria-current': ativo(href) ? 'page' : null }, texto, extra || null); }

  function cabecalho(temPrimario) {
    const st = App.estado(), u = App.usuario();
    const itens = NAV_PUBLICO.map(function (n) { return link(n[0], n[1]); });
    if (u && u.perfil === 'aluno') itens.push(link('#/minhas-candidaturas', 'Candidaturas'));
    if (u && Policy.isStaff(u.perfil)) itens.push(link('#/gestao', 'Gestão'));
    if (u && u.perfil === 'diretora') { itens.push(link('#/gestao/vagas', 'Gestão de vagas')); itens.push(link('#/gestao/relatorios', 'Relatórios')); }
    if (u && u.perfil === 'admin') itens.push(link('#/admin', 'Administração'));
    const naoLidos = u ? st.avisos.filter(function (a) { return a.userId === u.id && !a.lido; }).length : 0;

    const direita = h('div', { class: 'topo-direita' });
    if (!u) {
      const sel = h('select', { 'aria-label': 'Instituição', onchange: function (e) { App.trocarInstVisitante(e.target.value); } },
        st.instituicoes.filter(function (i) { return i.ativa; }).map(function (i) { return h('option', { value: i.id, selected: i.id === App.instId() }, i.nome); }));
      direita.appendChild(sel);
      // N5: só um botão preenchido por tela. Se a página já tem o seu, o do topo vira de contorno.
      direita.appendChild(h('a', { href: '#/login', class: 'btn ' + (temPrimario ? 'btn-sec' : 'btn-primario') }, 'Login institucional'));
    } else {
      direita.appendChild(h('span', { class: 'chip chip-neutro', title: 'Instituição' }, App.inst().nome));
      direita.appendChild(h('a', { href: '#/avisos', class: 'nav-link' + (ativo('#/avisos') ? ' ativo' : ''), 'aria-label': 'Avisos' + (naoLidos ? ' (' + naoLidos + ' não lidos)' : '') }, 'Avisos', naoLidos ? ' ' : null, naoLidos ? h('span', { class: 'chip chip-alerta' }, String(naoLidos)) : null));
      direita.appendChild(h('div', { class: 'usuario' }, h('strong', null, u.nome), h('small', null, Policy.PERFIS[u.perfil])));
      direita.appendChild(h('button', { type: 'button', class: 'btn btn-sec', onclick: function () { App.logout(); } }, 'Sair'));
    }
    return h('header', { class: 'topo' },
      h('div', { class: 'topo-in' },
        h('a', { href: '#/', class: 'marca', 'aria-label': 'GlobalConnect, página inicial' }, 'GlobalConnect'),
        h('nav', { class: 'nav', 'aria-label': 'Principal' }, itens),
        direita));
  }

  function rodape() {
    return h('footer', { class: 'rodape' },
      h('div', { class: 'rodape-in' },
        h('span', null, 'Protótipo de demonstração do GlobalConnect. Todos os dados, universidades e valores são fictícios.'),
        h('button', {
          type: 'button', class: 'btn-link', onclick: function () {
            UI.modal({
              titulo: 'Restaurar dados de demonstração', corpo: h('p', null, 'Isso apaga tudo o que foi feito neste navegador (candidaturas, avisos, vagas criadas) e volta aos dados iniciais.'),
              acoes: [{ rotulo: 'Cancelar', tipo: 'sec' }, { rotulo: 'Restaurar', tipo: 'perigo', onClick: function () { Store.reset(); location.hash = '#/'; App.render(); UI.toast('Dados de demonstração restaurados.', 'ok'); } }]
            });
          }
        }, 'Restaurar dados de demonstração')));
  }

  function acessoNegado() {
    return h('section', { class: 'pagina' }, UI.vazio('Acesso restrito', App.usuario() ? 'O seu perfil (' + Policy.PERFIS[App.perfil()] + ') não tem permissão para ver esta página.' : 'Entre com o seu login institucional para ver esta página.',
      h('a', { href: App.usuario() ? '#/' : '#/login', class: 'btn btn-primario' }, App.usuario() ? 'Voltar ao início' : 'Entrar')));
  }

  function resolver() {
    const hash = location.hash || '#/';
    for (let i = 0; i < rotas.length; i++) {
      const m = hash.match(rotas[i].re);
      if (m) return { def: rotas[i].def, m: m };
    }
    return null;
  }

  App.render = function () {
    const app = document.getElementById('app');
    if (!app) return;
    const alvo = resolver();
    let conteudo;
    try {
      if (!alvo) conteudo = h('section', { class: 'pagina' }, UI.vazio('Página não encontrada', 'O endereço não existe.', h('a', { href: '#/', class: 'btn btn-primario' }, 'Ir para as vagas')));
      else if (alvo.def.login && !App.usuario()) conteudo = acessoNegado();
      else if (alvo.def.perm && !App.pode(alvo.def.perm)) conteudo = acessoNegado();
      else conteudo = alvo.def.render(alvo.m);
    } catch (e) {
      console.error(e);
      conteudo = h('section', { class: 'pagina' }, UI.vazio('Não foi possível abrir esta página', 'Tente voltar ao início.', h('a', { href: '#/', class: 'btn btn-primario' }, 'Início')));
    }
    const primarios = conteudo.querySelectorAll ? conteudo.querySelectorAll('.btn-primario').length : 0;
    if (primarios > 1) console.warn('N5: ' + primarios + ' botões preenchidos nesta tela (o sistema permite um).');
    UI.clear(app);
    app.appendChild(h('a', { href: '#conteudo', class: 'pular' }, 'Ir para o conteúdo'));
    app.appendChild(cabecalho(primarios > 0));
    app.appendChild(h('main', { id: 'conteudo', tabindex: '-1' }, conteudo));
    app.appendChild(rodape());
    document.title = (alvo && alvo.def.titulo ? alvo.def.titulo + ' | ' : '') + 'GlobalConnect';
  };

  App.iniciar = function () {
    Store.load();
    S.gerarAvisosDePrazo(App.estado());
    App.salvar();
    window.addEventListener('hashchange', function () { App.render(); window.scrollTo(0, 0); });
    ['click', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, registrarAtividade, { passive: true }); });
    setInterval(verificarInatividade, 30000);
    if (!location.hash) location.hash = '#/';
    App.render();
  };

  root.GCApp = App;
})(typeof self !== 'undefined' ? self : this);
