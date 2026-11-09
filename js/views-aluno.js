/* views-aluno.js */
/* Telas do aluno: candidaturas, documentos, acompanhamento e avisos (US11 a US14, US17). */
(function (root) {
  'use strict';
  const U = root.GCUtil, Policy = root.GCPolicy, S = root.GCServices, UI = root.GCUI, App = root.GCApp, V = root.GCViews;
  const h = UI.h;

  const DOC_ROTULO = { pendente: ['Pendente', 'neutro'], enviado: ['Enviado', 'info'], aprovado: ['Aprovado', 'ok'], reenviar: ['Reenviar', 'erro'] };
  function chipDoc(status) { const r = DOC_ROTULO[status]; return UI.chip(r[0], r[1]); }
  const RESULTADO = { aprovado: ['Aprovada', 'ok'], lista_espera: ['Lista de espera', 'alerta'], nao_aprovado: ['Não aprovada', 'erro'] };
  function chipCand(c) {
    if (c.status === 'finalizada') { const r = RESULTADO[c.resultado]; return UI.chip(r[0], r[1]); }
    return c.status === 'rascunho' ? UI.chip('Em preparação', 'neutro') : UI.chip('Em andamento', 'info');
  }

  function lerArquivo(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(new Error('Não foi possível ler o arquivo.')); };
      r.readAsDataURL(file);
    });
  }
  /** Abre um arquivo guardado (dataURL) em nova aba, usando Blob. */
  function abrirArquivo(versao) {
    if (!versao.dataUrl) { UI.toast('Este é um arquivo de demonstração, sem conteúdo para abrir.', 'erro'); return; }
    const partes = versao.dataUrl.split(',');
    const tipo = (partes[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    const bin = atob(partes[1]); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([bytes], { type: tipo })), '_blank', 'noopener');
  }

  function stepper(c) {
    return h('ol', { class: 'stepper', 'aria-label': 'Etapas da candidatura' }, S.ETAPAS.map(function (n, i) {
      const feito = c.status === 'finalizada' ? true : i < c.etapa;
      const atual = c.status !== 'finalizada' && i === c.etapa;
      return h('li', { class: (feito ? 'feito ' : '') + (atual ? 'atual' : ''), 'aria-current': atual ? 'step' : null }, h('span', { class: 'passo-n' }, String(i + 1)), h('span', null, n));
    }));
  }
  function historico(c) {
    return h('ol', { class: 'linha-tempo' }, c.historico.slice().reverse().map(function (x) { return h('li', null, h('time', null, U.fmtDateTime(x.em)), h('span', null, x.texto)); }));
  }

  // ---------- Minhas candidaturas (histórico, US16) ----------
  function minhas() {
    const st = App.estado(), u = App.usuario();
    const cs = st.candidaturas.filter(function (c) { return c.alunoId === u.id; }).sort(function (a, b) { return b.criadaEm.localeCompare(a.criadaEm); });
    return h('section', { class: 'pagina' }, h('h1', null, 'Minhas candidaturas'),
      cs.length ? h('div', { class: 'lista-cartoes' }, cs.map(function (c) {
        const v = st.vagas.find(function (x) { return x.id === c.vagaId; });
        const pend = c.documentos.filter(function (d) { return d.status === 'pendente' || d.status === 'reenviar'; }).length;
        return h('a', { href: '#/candidatura/' + c.id, class: 'cartao linha-cand' },
          h('div', null, h('h2', null, v ? v.universidade : 'Vaga removida'), h('p', { class: 'ajuda' }, (v ? v.pais + ' · ' : '') + 'Iniciada em ' + U.fmtDate(c.criadaEm))),
          h('div', { class: 'chips' }, chipCand(c), UI.chip('Etapa: ' + S.ETAPAS[c.etapa], 'neutro'), pend ? UI.chip(pend + ' documento(s) com pendência', 'alerta') : null));
      })) : UI.vazio('Você ainda não tem candidaturas', 'Escolha uma vaga e verifique a sua elegibilidade.', h('a', { href: '#/', class: 'btn btn-primario' }, 'Ver vagas')));
  }

  // ---------- Detalhe da candidatura (US11 a US14) ----------
  function candidatura(m) {
    const st = App.estado(), u = App.usuario();
    const c = st.candidaturas.find(function (x) { return x.id === m[1]; });
    if (!c || c.alunoId !== u.id) return h('section', { class: 'pagina' }, UI.vazio('Candidatura não encontrada', 'Ela não existe ou pertence a outra pessoa.', h('a', { href: '#/minhas-candidaturas', class: 'btn btn-primario' }, 'Minhas candidaturas')));
    const v = st.vagas.find(function (x) { return x.id === c.vagaId; });
    const dias = U.diasAte(v.prazo, new Date());
    const prazoOk = dias >= 0;
    const docs = c.documentos.map(function (d) {
      const ultima = d.versoes[d.versoes.length - 1];
      const podeEnviar = prazoOk && (c.status === 'rascunho' ? d.status !== 'aprovado' : (d.status === 'reenviar' || d.status === 'pendente'));
      const input = h('input', { type: 'file', accept: '.pdf,.jpg,.jpeg,.png', id: 'f-' + d.exigidoId, class: 'arquivo-input', 'aria-label': 'Enviar arquivo para ' + d.nome });
      input.addEventListener('change', async function () {
        const f = input.files[0]; if (!f) return;
        const arq = { nome: f.name, tamanho: f.size, tipo: f.type };
        try { S.validarArquivo(arq); } catch (e) { UI.toast(e.message, 'erro'); input.value = ''; return; }
        try { arq.dataUrl = await lerArquivo(f); } catch (e) { UI.toast(e.message, 'erro'); return; }
        App.executar(function () { S.anexarDocumento(st, u, c.id, d.exigidoId, arq); }, d.status === 'reenviar' ? 'Documento reenviado. A equipe foi avisada.' : 'Documento anexado.');
      });
      return h('li', { class: 'doc doc-' + d.status },
        h('div', { class: 'doc-topo' },
          h('div', null, h('strong', null, d.nome), ' ', UI.chip(d.obrigatorio ? 'Obrigatório' : 'Opcional', d.obrigatorio ? 'info' : 'neutro'), d.sensivel ? UI.chip('Dado sensível', 'alerta') : null),
          chipDoc(d.status)),
        d.status === 'reenviar' ? h('div', { class: 'aviso erro' }, h('strong', null, 'Devolvido pela equipe: '), d.motivo, h('div', null, 'Envie uma nova versão até ' + U.fmtDate(v.prazo) + '.')) : null,
        ultima ? h('p', { class: 'ajuda' }, ultima.nome + ' (' + U.fmtBytes(ultima.tamanho) + '), versão ' + ultima.n + ', enviada em ' + U.fmtDateTime(ultima.enviadoEm)) : h('p', { class: 'ajuda' }, 'Nenhum arquivo enviado.'),
        d.status === 'aprovado' ? h('p', { class: 'ajuda' }, 'Aprovado por ' + d.conferidoPor + ' em ' + U.fmtDateTime(d.conferidoEm) + '.') : null,
        podeEnviar ? h('label', { class: 'btn btn-sec upload', for: 'f-' + d.exigidoId }, d.status === 'reenviar' ? 'Reenviar documento' : (ultima ? 'Trocar arquivo' : 'Anexar arquivo')) : null,
        podeEnviar ? input : null);
    });
    const faltam = c.documentos.filter(function (d) { return d.obrigatorio && d.status !== 'enviado'; });
    const confirmar = c.status === 'rascunho' ? h('div', { class: 'cartao' }, h('h2', null, 'Confirmar candidatura'),
      h('p', null, faltam.length ? 'Falta enviar: ' + faltam.map(function (d) { return d.nome; }).join(', ') + '.' : 'Todos os documentos obrigatórios foram anexados. Ao confirmar, a equipe do DRI/NEI inicia a conferência.'),
      h('button', { type: 'button', class: 'btn btn-primario', disabled: faltam.length > 0 || !prazoOk, onclick: function () { App.executar(function () { S.confirmarCandidatura(st, u, c.id); }, 'Candidatura confirmada. Acompanhe a conferência por aqui.'); } }, 'Confirmar candidatura')) : null;

    return h('section', { class: 'pagina' }, h('a', { href: '#/minhas-candidaturas', class: 'voltar' }, '← Minhas candidaturas'),
      h('div', { class: 'cartao' },
        h('div', { class: 'detalhe-topo' }, h('p', { class: 'meta-linha ajuda' }, v.pais + ' · ' + v.duracao + ' · ' + v.area), h('h1', null, v.universidade)),
        h('div', { class: 'chips' }, chipCand(c), prazoOk ? UI.chip(dias === 0 ? 'O prazo termina hoje' : 'Prazo: ' + U.fmtDate(v.prazo) + ' (' + dias + ' dia(s))', dias <= 7 ? 'alerta' : 'info') : UI.chip('Prazo encerrado em ' + U.fmtDate(v.prazo), 'neutro')),
        stepper(c)),
      h('div', { class: 'duas-colunas' },
        h('div', null, h('div', { class: 'cartao' }, h('h2', null, 'Documentos'), h('p', { class: 'ajuda' }, 'Formatos aceitos: PDF, JPG e PNG, até 700 KB cada (limite do protótipo).'), h('ul', { class: 'docs' }, docs)), confirmar),
        h('div', { class: 'cartao' }, h('h2', null, 'Acompanhamento'), historico(c))));
  }

  // ---------- Avisos e e-mails simulados (US17) ----------
  function avisos() {
    const st = App.estado(), u = App.usuario();
    const lista = S.avisosDoUsuario(st, u.id);
    const emails = st.emails.filter(function (e) { return e.para === u.email; }).sort(function (a, b) { return b.enviadoEm.localeCompare(a.enviadoEm); });
    const naoLidos = lista.filter(function (a) { return !a.lido; }).length;
    return h('section', { class: 'pagina estreita' }, h('h1', null, 'Avisos'),
      h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn btn-sec', disabled: !naoLidos, onclick: function () { App.executar(function () { S.marcarAvisosLidos(st, u.id); }); } }, 'Marcar todos como lidos')),
      lista.length ? h('ul', { class: 'avisos' }, lista.map(function (a) {
        return h('li', { class: 'cartao aviso-item' + (a.lido ? '' : ' nao-lido') },
          h('div', null, a.lido ? null : UI.chip('Novo', 'info'), ' ', h('time', { class: 'ajuda' }, U.fmtDateTime(a.criadoEm))),
          h('p', null, a.texto), a.link ? h('a', { href: a.link, class: 'btn-link' }, 'Abrir') : null);
      })) : UI.vazio('Nenhum aviso por enquanto'),
      h('h2', null, 'E-mails enviados (simulação)'),
      h('p', { class: 'ajuda' }, 'No produto final, cada aviso também chega por e-mail. Aqui você vê o que seria enviado para ' + u.email + '.'),
      emails.length ? h('ul', { class: 'avisos' }, emails.map(function (e) {
        return h('li', { class: 'cartao email' }, h('div', { class: 'ajuda' }, 'Para: ' + e.para + ' · ' + U.fmtDateTime(e.enviadoEm)), h('strong', null, e.assunto), h('p', null, e.corpo));
      })) : UI.vazio('Nenhum e-mail simulado ainda'));
  }

  Object.assign(V, { chipDoc, chipCand, lerArquivo, abrirArquivo, stepper, historico, minhas, candidatura, avisos });
})(typeof self !== 'undefined' ? self : this);
