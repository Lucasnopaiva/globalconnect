/* services.js */
/* Regras de negócio do GlobalConnect. Não mexem na tela: recebem o estado, validam e alteram.
 * Cada função confere a permissão do usuário, como um servidor faria. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util'), require('./policy'), require('./eligibility'), require('./adapters'));
  else root.GCServices = factory(root.GCUtil, root.GCPolicy, root.GCEligibility, root.GCAdapters);
})(typeof self !== 'undefined' ? self : this, function (U, Policy, Eligibility, Adapters) {
  'use strict';

  const ETAPAS = ['Documentos', 'Conferência', 'Seleção', 'Resultado'];
  const TIPOS_OK = ['application/pdf', 'image/jpeg', 'image/png'];
  const EXT_OK = ['pdf', 'jpg', 'jpeg', 'png'];
  const MAX_BYTES = 700 * 1024;
  const TTL_MIN = 10;
  const DIAS_AVISO_PRAZO = 7;

  class GCError extends Error {
    constructor(message, code) { super(message); this.name = 'GCError'; this.code = code || 'erro'; }
  }
  function req(cond, msg, code) { if (!cond) throw new GCError(msg, code); }
  function agora(opts) { return (opts && opts.now) || new Date(); }
  function perfilDe(u) { return u ? u.perfil : 'visitante'; }

  // ---------- Consultas ----------
  function vagaAberta(vaga, now) { return vaga.status === 'aberta' && U.diasAte(vaga.prazo, now || new Date()) >= 0; }

  function listarVagas(state, instId, f) {
    f = f || {};
    const q = U.norm(f.q);
    return state.vagas.filter(function (v) {
      if (v.instId !== instId) return false;
      if (f.pais && v.pais !== f.pais) return false;
      if (f.area && v.area !== f.area) return false;
      if (f.duracao && v.duracao !== f.duracao) return false;
      if (q && U.norm(v.universidade + ' ' + v.pais + ' ' + v.area).indexOf(q) === -1) return false;
      return true;
    });
  }
  function opcoesFiltro(state, instId) {
    const vs = state.vagas.filter(function (v) { return v.instId === instId; });
    const uniq = function (k) { return vs.map(function (v) { return v[k]; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(); };
    return { paises: uniq('pais'), areas: uniq('area'), duracoes: uniq('duracao') };
  }

  // ---------- Avisos e e-mails simulados (US17, US18) ----------
  function criarAviso(state, a, now) {
    now = now || new Date();
    const destinatarios = a.userId
      ? state.usuarios.filter(function (u) { return u.id === a.userId; })
      : state.usuarios.filter(function (u) { return u.instId === a.instId && a.perfis.indexOf(u.perfil) !== -1; });
    let criados = 0;
    destinatarios.forEach(function (u) {
      const chave = a.chave ? a.chave + ':' + u.id : '';
      if (chave && state.avisos.some(function (x) { return x.chave === chave; })) return;
      state.avisos.push({ id: U.uid('av'), userId: u.id, tipo: a.tipo, texto: a.texto, link: a.link || '', chave: chave, criadoEm: now.toISOString(), lido: false });
      state.emails.push({ id: U.uid('em'), para: u.email, assunto: a.assunto || a.texto.slice(0, 70), corpo: a.texto, enviadoEm: now.toISOString(), tipo: a.tipo });
      criados++;
    });
    return criados;
  }
  function avisosDoUsuario(state, userId) {
    return state.avisos.filter(function (a) { return a.userId === userId; }).sort(function (a, b) { return b.criadoEm.localeCompare(a.criadoEm); });
  }
  function marcarAvisosLidos(state, userId) {
    state.avisos.forEach(function (a) { if (a.userId === userId) a.lido = true; });
  }

  /** Avisa o aluno de prazos próximos com pendências (uma vez por dia por candidatura). */
  function gerarAvisosDePrazo(state, opts) {
    const now = agora(opts);
    let total = 0;
    state.candidaturas.forEach(function (c) {
      if (c.status !== 'rascunho' && c.status !== 'em_andamento') return;
      const vaga = state.vagas.find(function (v) { return v.id === c.vagaId; });
      if (!vaga) return;
      const dias = U.diasAte(vaga.prazo, now);
      const pend = c.documentos.filter(function (d) { return d.obrigatorio && (d.status === 'pendente' || d.status === 'reenviar'); });
      if (!pend.length || dias < 0 || dias > DIAS_AVISO_PRAZO) return;
      total += criarAviso(state, {
        userId: c.alunoId, tipo: 'prazo', chave: 'prazo:' + c.id + ':' + U.isoDate(now),
        assunto: 'Prazo próximo: ' + vaga.universidade,
        texto: (dias === 0 ? 'O prazo da vaga ' + vaga.universidade + ' termina hoje.' : 'Faltam ' + dias + ' dia(s) para o prazo da vaga ' + vaga.universidade + '.') + ' Pendências: ' + pend.map(function (d) { return d.nome; }).join(', ') + '.',
        link: '#/candidatura/' + c.id
      }, now);
    });
    return total;
  }

  // ---------- Auditoria e consentimento (US29, US30) ----------
  function auditar(state, usuario, acao, recurso, now) {
    state.auditoria.push({ id: U.uid('au'), em: (now || new Date()).toISOString(), usuarioId: usuario ? usuario.id : '', usuario: usuario ? usuario.nome + ' (' + Policy.PERFIS[usuario.perfil] + ')' : 'Sistema', acao: acao, recurso: recurso || '' });
  }
  function registrarConsentimento(state, usuario, opts) {
    req(usuario, 'É preciso estar logado.', 'login');
    state.consentimentos[usuario.id] = agora(opts).toISOString();
    auditar(state, usuario, 'Consentimento de uso de dados aceito', usuario.nome, agora(opts));
  }

  // ---------- Integração com o sistema acadêmico (US32) ----------
  function avisarFalhaIntegracao(state, inst, erro, now) {
    criarAviso(state, {
      instId: inst.id, perfis: ['analista', 'diretora', 'admin'], tipo: 'integracao-falha',
      chave: 'falha:' + inst.id + ':' + now.toISOString().slice(0, 13),
      assunto: 'Falha na integração com o sistema acadêmico',
      texto: 'A consulta ao sistema acadêmico de ' + inst.nome + ' falhou: ' + erro.message
    }, now);
  }
  async function obterDadosAcademicos(state, usuario, opts) {
    opts = opts || {};
    const now = agora(opts);
    req(usuario && usuario.perfil === 'aluno', 'Somente alunos têm dados acadêmicos.', 'perfil');
    const inst = state.instituicoes.find(function (i) { return i.id === usuario.instId; });
    const cache = state.cacheAcademico[usuario.id];
    if (cache && !opts.forcar && now - new Date(cache.atualizadoEm) < TTL_MIN * 60000) {
      return { dados: cache.dados, atualizadoEm: cache.atualizadoEm, desatualizado: false, origem: 'cache' };
    }
    const adaptador = Adapters.get(inst.adaptador);
    try {
      const dados = await adaptador.buscarDadosAluno({ state: state, instituicao: inst, usuario: usuario, now: now });
      const atualizadoEm = now.toISOString();
      state.cacheAcademico[usuario.id] = { dados: dados, atualizadoEm: atualizadoEm };
      return { dados: dados, atualizadoEm: atualizadoEm, desatualizado: false, origem: 'adaptador' };
    } catch (e) {
      avisarFalhaIntegracao(state, inst, e, now);
      if (cache) return { dados: cache.dados, atualizadoEm: cache.atualizadoEm, desatualizado: true, erro: e.message, origem: 'cache' };
      throw new GCError('Não foi possível consultar o sistema acadêmico agora. ' + e.message, 'integracao');
    }
  }
  function avaliarElegibilidade(vaga, dados) { return Eligibility.avaliar(vaga.regra, dados); }

  // ---------- Candidatura (US11 a US14) ----------
  function validarArquivo(arq) {
    req(arq && arq.nome, 'Selecione um arquivo.', 'arquivo');
    const ext = String(arq.nome).split('.').pop().toLowerCase();
    req(EXT_OK.indexOf(ext) !== -1 && (!arq.tipo || TIPOS_OK.indexOf(arq.tipo) !== -1), 'Formato não permitido. Envie PDF, JPG ou PNG.', 'formato');
    req(arq.tamanho > 0, 'O arquivo está vazio.', 'arquivo');
    req(arq.tamanho <= MAX_BYTES, 'O arquivo é grande demais. No protótipo o limite é 700 KB.', 'tamanho');
  }
  function achar(state, lista, id, msg, code) {
    const x = state[lista].find(function (i) { return i.id === id; });
    req(x, msg, code);
    return x;
  }

  function candidatar(state, usuario, vagaId, dadosAcad, opts) {
    const now = agora(opts);
    req(Policy.can(perfilDe(usuario), 'candidatura:criar'), 'Somente alunos podem se candidatar.', 'permissao');
    req(state.consentimentos[usuario.id], 'Aceite o termo de uso de dados antes de se candidatar.', 'consentimento');
    const vaga = achar(state, 'vagas', vagaId, 'Vaga não encontrada.', 'vaga');
    req(vaga.instId === usuario.instId, 'Esta vaga é de outra instituição.', 'instituicao');
    req(vagaAberta(vaga, now), 'Esta vaga está encerrada.', 'encerrada');
    req(Eligibility.avaliar(vaga.regra, dadosAcad).elegivel, 'Você não cumpre os requisitos desta vaga.', 'inelegivel');
    req(!state.candidaturas.some(function (c) { return c.alunoId === usuario.id && c.vagaId === vaga.id; }), 'Você já tem uma candidatura para esta vaga.', 'duplicada');
    const iso = now.toISOString();
    const cand = {
      id: U.uid('cand'), alunoId: usuario.id, vagaId: vaga.id, instId: vaga.instId, status: 'rascunho', etapa: 0,
      criadaEm: iso, atualizadaEm: iso, resultado: '',
      documentos: vaga.docs.map(function (d) { return { exigidoId: d.id, nome: d.nome, obrigatorio: d.obrigatorio, sensivel: !!d.sensivel, status: 'pendente', versoes: [], motivo: '', conferidoPor: '', conferidoEm: '' }; }),
      historico: [{ em: iso, texto: 'Candidatura iniciada. Envie os documentos exigidos.' }]
    };
    state.candidaturas.push(cand);
    return cand;
  }

  function candidaturaDoAluno(state, usuario, candId) {
    const c = achar(state, 'candidaturas', candId, 'Candidatura não encontrada.', 'candidatura');
    req(c.alunoId === usuario.id, 'Você só pode acessar as suas candidaturas.', 'permissao');
    return c;
  }

  function anexarDocumento(state, usuario, candId, exigidoId, arquivo, opts) {
    const now = agora(opts);
    req(Policy.can(perfilDe(usuario), 'candidatura:ver-propria'), 'Somente alunos enviam documentos.', 'permissao');
    const c = candidaturaDoAluno(state, usuario, candId);
    const vaga = achar(state, 'vagas', c.vagaId, 'Vaga não encontrada.', 'vaga');
    const doc = c.documentos.find(function (d) { return d.exigidoId === exigidoId; });
    req(doc, 'Documento não pertence a esta candidatura.', 'documento');
    req(c.status === 'rascunho' || c.status === 'em_andamento', 'Esta candidatura já foi finalizada.', 'finalizada');
    req(U.diasAte(vaga.prazo, now) >= 0, 'O prazo desta vaga terminou. Não é mais possível enviar documentos.', 'prazo');
    req(doc.status !== 'aprovado', 'Este documento já foi aprovado.', 'aprovado');
    const emConferencia = c.status === 'em_andamento';
    req(!emConferencia || doc.status === 'reenviar' || doc.status === 'pendente', 'Este documento está em conferência. Aguarde a análise da equipe.', 'conferencia');
    validarArquivo(arquivo);
    const reenvio = doc.versoes.length > 0 && emConferencia;
    doc.versoes.push({ n: doc.versoes.length + 1, nome: arquivo.nome, tamanho: arquivo.tamanho, tipo: arquivo.tipo || '', dataUrl: arquivo.dataUrl || '', enviadoEm: now.toISOString() });
    doc.status = 'enviado';
    doc.motivo = '';
    c.atualizadaEm = now.toISOString();
    if (reenvio) {
      c.historico.push({ em: now.toISOString(), texto: 'Documento reenviado: ' + doc.nome + ' (versão ' + doc.versoes.length + ').' });
      const aluno = state.usuarios.find(function (u) { return u.id === c.alunoId; });
      criarAviso(state, {
        instId: c.instId, perfis: ['analista', 'diretora'], tipo: 'novo-envio',
        assunto: 'Documento reenviado: ' + doc.nome,
        texto: aluno.nome + ' reenviou o documento “' + doc.nome + '” (' + vaga.universidade + ').', link: '#/gestao/candidatura/' + c.id
      }, now);
    }
    return doc;
  }

  function confirmarCandidatura(state, usuario, candId, opts) {
    const now = agora(opts);
    const c = candidaturaDoAluno(state, usuario, candId);
    const vaga = achar(state, 'vagas', c.vagaId, 'Vaga não encontrada.', 'vaga');
    req(c.status === 'rascunho', 'Esta candidatura já foi confirmada.', 'status');
    req(U.diasAte(vaga.prazo, now) >= 0, 'O prazo desta vaga terminou.', 'prazo');
    const faltam = c.documentos.filter(function (d) { return d.obrigatorio && d.status !== 'enviado'; });
    req(!faltam.length, 'Envie todos os documentos obrigatórios. Faltam: ' + faltam.map(function (d) { return d.nome; }).join(', ') + '.', 'documentos');
    c.status = 'em_andamento';
    c.etapa = 1;
    c.atualizadaEm = now.toISOString();
    c.historico.push({ em: now.toISOString(), texto: 'Candidatura confirmada. Documentos em conferência.' });
    criarAviso(state, { userId: usuario.id, tipo: 'confirmacao', assunto: 'Candidatura confirmada: ' + vaga.universidade, texto: 'Sua candidatura para ' + vaga.universidade + ' foi confirmada e os documentos seguem para conferência.', link: '#/candidatura/' + c.id }, now);
    criarAviso(state, { instId: c.instId, perfis: ['analista', 'diretora'], tipo: 'novo-envio', assunto: 'Nova candidatura: ' + vaga.universidade, texto: usuario.nome + ' enviou documentos para a vaga ' + vaga.universidade + '.', link: '#/gestao/candidatura/' + c.id }, now);
    return c;
  }

  // ---------- Conferência pela equipe (US19) ----------
  function conferirDocumento(state, staff, candId, exigidoId, decisao, motivo, opts) {
    const now = agora(opts);
    req(Policy.can(perfilDe(staff), 'documento:conferir'), 'Somente a equipe do DRI/NEI confere documentos.', 'permissao');
    const c = achar(state, 'candidaturas', candId, 'Candidatura não encontrada.', 'candidatura');
    req(c.instId === staff.instId, 'Candidatura de outra instituição.', 'instituicao');
    req(c.status === 'em_andamento' && c.etapa === 1, 'Esta candidatura não está na etapa de conferência.', 'etapa');
    const doc = c.documentos.find(function (d) { return d.exigidoId === exigidoId; });
    req(doc && doc.status === 'enviado', 'Este documento não está aguardando conferência.', 'documento');
    req(decisao === 'aprovar' || decisao === 'devolver', 'Decisão inválida.', 'decisao');
    const vaga = achar(state, 'vagas', c.vagaId, 'Vaga não encontrada.', 'vaga');
    const iso = now.toISOString();
    if (decisao === 'devolver') {
      req(motivo && String(motivo).trim().length >= 3, 'Informe o motivo da devolução.', 'motivo');
      doc.status = 'reenviar';
      doc.motivo = String(motivo).trim();
      c.historico.push({ em: iso, texto: 'Documento devolvido: ' + doc.nome + '.' });
      criarAviso(state, {
        userId: c.alunoId, tipo: 'documento-devolvido', assunto: 'Documento devolvido: ' + doc.nome,
        texto: 'O documento “' + doc.nome + '” foi devolvido. Motivo: ' + doc.motivo + ' Reenvie até ' + U.fmtDate(vaga.prazo) + '.', link: '#/candidatura/' + c.id
      }, now);
    } else {
      doc.status = 'aprovado';
      doc.motivo = '';
      c.historico.push({ em: iso, texto: 'Documento aprovado: ' + doc.nome + '.' });
    }
    doc.conferidoPor = staff.nome;
    doc.conferidoEm = iso;
    c.atualizadaEm = iso;
    auditar(state, staff, 'Documento ' + (decisao === 'aprovar' ? 'aprovado' : 'devolvido'), doc.nome + ' (' + c.id + ')', now);
    const todosAprovados = c.documentos.filter(function (d) { return d.obrigatorio; }).every(function (d) { return d.status === 'aprovado'; });
    if (todosAprovados) {
      c.etapa = 2;
      c.historico.push({ em: iso, texto: 'Documentos aprovados. Candidatura na etapa de seleção.' });
      criarAviso(state, { userId: c.alunoId, tipo: 'etapa', assunto: 'Documentos aprovados: ' + vaga.universidade, texto: 'Todos os documentos foram aprovados. Sua candidatura para ' + vaga.universidade + ' seguiu para a seleção.', link: '#/candidatura/' + c.id }, now);
    }
    return c;
  }

  function definirResultado(state, diretora, candId, resultado, opts) {
    const now = agora(opts);
    req(Policy.can(perfilDe(diretora), 'resultado:definir'), 'Somente a diretora define o resultado.', 'permissao');
    const c = achar(state, 'candidaturas', candId, 'Candidatura não encontrada.', 'candidatura');
    req(c.instId === diretora.instId, 'Candidatura de outra instituição.', 'instituicao');
    req(c.status === 'em_andamento' && c.etapa === 2, 'A candidatura precisa estar na etapa de seleção.', 'etapa');
    req(['aprovado', 'lista_espera', 'nao_aprovado'].indexOf(resultado) !== -1, 'Resultado inválido.', 'resultado');
    const vaga = achar(state, 'vagas', c.vagaId, 'Vaga não encontrada.', 'vaga');
    c.resultado = resultado; c.status = 'finalizada'; c.etapa = 3; c.atualizadaEm = now.toISOString();
    const rotulo = { aprovado: 'aprovada', lista_espera: 'em lista de espera', nao_aprovado: 'não aprovada' }[resultado];
    c.historico.push({ em: now.toISOString(), texto: 'Resultado: candidatura ' + rotulo + '.' });
    criarAviso(state, { userId: c.alunoId, tipo: 'resultado', assunto: 'Resultado da seleção: ' + vaga.universidade, texto: 'Sua candidatura para ' + vaga.universidade + ' foi ' + rotulo + '.', link: '#/candidatura/' + c.id }, now);
    auditar(state, diretora, 'Resultado definido: ' + rotulo, c.id, now);
    return c;
  }

  // ---------- Vagas (US06, US20) ----------
  function validarVaga(d) {
    const faltas = [];
    ['universidade', 'pais', 'area', 'duracao', 'idioma', 'custo'].forEach(function (k) { if (!d[k] || !String(d[k]).trim()) faltas.push(k); });
    req(!faltas.length, 'Preencha todos os campos obrigatórios da vaga.', 'campos');
    req(/^[A-Za-z]{2}$/.test(String(d.paisCod || '')), 'Informe o código do país com 2 letras (por exemplo PT).', 'paisCod');
    req(/^\d{4}-\d{2}-\d{2}$/.test(String(d.prazo || '')) && !isNaN(U.parseDate(d.prazo)), 'Informe um prazo válido.', 'prazo');
    const r = d.regra || {};
    req(typeof r.mediaMin === 'number' && r.mediaMin >= 0 && r.mediaMin <= 10, 'A média mínima deve estar entre 0 e 10.', 'regra');
    req(typeof r.percentualMin === 'number' && r.percentualMin >= 0 && r.percentualMin <= 100, 'O percentual mínimo deve estar entre 0 e 100.', 'regra');
    req(typeof r.maxReprovacoes === 'number' && r.maxReprovacoes >= 0 && Math.floor(r.maxReprovacoes) === r.maxReprovacoes, 'O limite de reprovações deve ser um inteiro maior ou igual a 0.', 'regra');
    req(Array.isArray(d.docs) && d.docs.length > 0 && d.docs.every(function (x) { return x.nome && x.nome.trim(); }), 'Defina pelo menos um documento exigido.', 'docs');
  }
  function salvarVaga(state, diretora, dados, opts) {
    const now = agora(opts);
    req(Policy.can(perfilDe(diretora), 'vaga:gerenciar'), 'Somente a diretora gerencia vagas.', 'permissao');
    validarVaga(dados);
    const docs = dados.docs.map(function (d, i) { return { id: d.id || 'doc' + (i + 1) + '-' + U.uid('d').slice(-3), nome: d.nome.trim(), obrigatorio: !!d.obrigatorio, sensivel: !!d.sensivel }; });
    const base = {
      universidade: dados.universidade.trim(), pais: dados.pais.trim(), paisCod: dados.paisCod.toUpperCase(), area: dados.area.trim(), duracao: dados.duracao.trim(),
      idioma: dados.idioma.trim(), bolsa: !!dados.bolsa, custo: dados.custo.trim(), regra: { mediaMin: dados.regra.mediaMin, percentualMin: dados.regra.percentualMin, maxReprovacoes: dados.regra.maxReprovacoes },
      docs: docs, prazo: dados.prazo, prazos: dados.prazos || {}, atualizadoEm: now.toISOString()
    };
    if (dados.id) {
      const v = achar(state, 'vagas', dados.id, 'Vaga não encontrada.', 'vaga');
      req(v.instId === diretora.instId, 'Vaga de outra instituição.', 'instituicao');
      const regraMudou = JSON.stringify(v.regra) !== JSON.stringify(base.regra);
      Object.assign(v, base);
      if (regraMudou) auditar(state, diretora, 'Regra de elegibilidade alterada', v.universidade, now);
      return v;
    }
    const nova = Object.assign({ id: U.uid('v'), instId: diretora.instId, status: 'aberta' }, base);
    state.vagas.push(nova);
    auditar(state, diretora, 'Vaga criada', nova.universidade, now);
    return nova;
  }
  function alterarStatusVaga(state, diretora, vagaId, status, opts) {
    const now = agora(opts);
    req(Policy.can(perfilDe(diretora), 'vaga:gerenciar'), 'Somente a diretora gerencia vagas.', 'permissao');
    req(status === 'aberta' || status === 'encerrada', 'Status inválido.', 'status');
    const v = achar(state, 'vagas', vagaId, 'Vaga não encontrada.', 'vaga');
    req(v.instId === diretora.instId, 'Vaga de outra instituição.', 'instituicao');
    v.status = status; v.atualizadoEm = now.toISOString();
    auditar(state, diretora, status === 'aberta' ? 'Vaga reaberta' : 'Vaga encerrada', v.universidade, now);
    return v;
  }

  // ---------- Perfis, instituições e integração (US28, US33) ----------
  function alterarPerfil(state, admin, userId, perfil, opts) {
    req(Policy.can(perfilDe(admin), 'perfil:gerenciar'), 'Somente o administrador altera perfis.', 'permissao');
    req(Policy.PERFIS[perfil] && perfil !== 'visitante', 'Perfil inválido.', 'perfil');
    const u = achar(state, 'usuarios', userId, 'Usuário não encontrado.', 'usuario');
    req(!(u.id === admin.id && perfil !== 'admin'), 'Você não pode remover o seu próprio perfil de administrador.', 'autoremocao');
    const antes = u.perfil; u.perfil = perfil;
    auditar(state, admin, 'Perfil alterado: ' + u.nome + ' de ' + Policy.PERFIS[antes] + ' para ' + Policy.PERFIS[perfil], u.id, agora(opts));
    return u;
  }
  function cadastrarInstituicao(state, admin, d, opts) {
    req(Policy.can(perfilDe(admin), 'instituicao:gerenciar'), 'Somente o administrador cadastra instituições.', 'permissao');
    req(d && d.nome && d.nome.trim().length >= 3, 'Informe o nome da instituição.', 'nome');
    req(Adapters.get(d.adaptador), 'Escolha um adaptador de integração.', 'adaptador');
    const id = U.norm(d.nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    req(!state.instituicoes.some(function (i) { return i.id === id || U.norm(i.nome) === U.norm(d.nome); }), 'Já existe uma instituição com esse nome.', 'duplicada');
    const inst = { id: id, nome: d.nome.trim(), adaptador: d.adaptador, ativa: true };
    state.instituicoes.push(inst);
    state.academico[id] = {}; state.integracao[id] = { falhaSimulada: false };
    auditar(state, admin, 'Instituição cadastrada', inst.nome, agora(opts));
    return inst;
  }
  function definirFalhaSimulada(state, admin, instId, valor, opts) {
    req(Policy.can(perfilDe(admin), 'integracao:gerenciar'), 'Somente o administrador gerencia a integração.', 'permissao');
    state.integracao[instId] = state.integracao[instId] || {};
    state.integracao[instId].falhaSimulada = !!valor;
    auditar(state, admin, valor ? 'Falha de integração simulada ativada' : 'Falha de integração simulada desativada', instId, agora(opts));
  }
  function importarAcademico(state, admin, instId, texto, opts) {
    req(Policy.can(perfilDe(admin), 'integracao:gerenciar'), 'Somente o administrador gerencia a integração.', 'permissao');
    const r = Adapters.importarCSV(state, instId, texto, agora(opts));
    state.cacheAcademico = {};
    auditar(state, admin, 'Importação de dados acadêmicos: ' + r.registros.length + ' registro(s), ' + r.erros.length + ' erro(s)', instId, agora(opts));
    return r;
  }

  // ---------- Comunidade (US26, US27) e FAQ ----------
  function publicarRelato(state, egresso, d, opts) {
    req(Policy.can(perfilDe(egresso), 'relato:publicar'), 'Somente egressos publicam relatos.', 'permissao');
    req(d.titulo && d.titulo.trim().length >= 5, 'Informe um título com pelo menos 5 caracteres.', 'titulo');
    req(d.texto && d.texto.trim().length >= 30, 'O relato precisa ter pelo menos 30 caracteres.', 'texto');
    req(d.destino && d.destino.trim(), 'Informe o destino.', 'destino');
    const r = { id: U.uid('r'), instId: egresso.instId, autorId: egresso.id, autor: egresso.nome, destino: d.destino.trim(), periodo: (d.periodo || '').trim(), titulo: d.titulo.trim(), texto: d.texto.trim(), mentor: !!d.mentor, status: 'pendente', criadoEm: agora(opts).toISOString() };
    state.relatos.push(r);
    criarAviso(state, { instId: egresso.instId, perfis: ['analista', 'diretora'], tipo: 'relato', assunto: 'Relato aguardando moderação', texto: egresso.nome + ' enviou o relato “' + r.titulo + '” para moderação.', link: '#/gestao/relatos' }, agora(opts));
    return r;
  }
  function moderarRelato(state, staff, relatoId, aprovar, opts) {
    req(Policy.can(perfilDe(staff), 'relato:moderar'), 'Somente a equipe modera relatos.', 'permissao');
    const r = achar(state, 'relatos', relatoId, 'Relato não encontrado.', 'relato');
    r.status = aprovar ? 'aprovado' : 'recusado';
    auditar(state, staff, 'Relato ' + (aprovar ? 'aprovado' : 'recusado'), r.titulo, agora(opts));
    return r;
  }
  function inscreverEvento(state, usuario, eventoId) {
    req(Policy.can(perfilDe(usuario), 'evento:inscrever'), 'Somente alunos e alunos estrangeiros se inscrevem em eventos.', 'permissao');
    const e = achar(state, 'eventos', eventoId, 'Evento não encontrado.', 'evento');
    req(e.inscritos.indexOf(usuario.id) === -1, 'Você já está inscrito neste evento.', 'duplicada');
    e.inscritos.push(usuario.id);
    return e;
  }
  function salvarFaq(state, staff, d) {
    req(Policy.can(perfilDe(staff), 'faq:gerenciar'), 'Somente a equipe gerencia as perguntas frequentes.', 'permissao');
    req(d.pergunta && d.pergunta.trim().length >= 5 && d.resposta && d.resposta.trim().length >= 5, 'Preencha a pergunta e a resposta.', 'campos');
    const item = { id: U.uid('f'), instId: staff.instId, tema: (d.tema || 'Geral').trim() || 'Geral', pergunta: d.pergunta.trim(), resposta: d.resposta.trim() };
    state.faq.push(item);
    return item;
  }
  function removerFaq(state, staff, id) {
    req(Policy.can(perfilDe(staff), 'faq:gerenciar'), 'Somente a equipe gerencia as perguntas frequentes.', 'permissao');
    state.faq = state.faq.filter(function (f) { return f.id !== id; });
  }

  // ---------- Relatórios (US21) ----------
  function relatorios(state, diretora) {
    req(Policy.can(perfilDe(diretora), 'relatorio:ver'), 'Somente a diretora vê relatórios.', 'permissao');
    const cands = state.candidaturas.filter(function (c) { return c.instId === diretora.instId; });
    const conta = function (chaveFn) {
      const m = {};
      cands.forEach(function (c) { const k = chaveFn(c); m[k] = (m[k] || 0) + 1; });
      return Object.keys(m).map(function (k) { return { nome: k, total: m[k] }; }).sort(function (a, b) { return b.total - a.total; });
    };
    const vagaDe = function (c) { return state.vagas.find(function (v) { return v.id === c.vagaId; }); };
    const alunoDe = function (c) { return state.usuarios.find(function (u) { return u.id === c.alunoId; }); };
    const rotuloStatus = function (c) { return c.status === 'finalizada' ? ({ aprovado: 'Aprovada', lista_espera: 'Lista de espera', nao_aprovado: 'Não aprovada' }[c.resultado]) : (c.status === 'rascunho' ? 'Em preparação' : 'Em andamento'); };
    return {
      total: cands.length,
      porDestino: conta(function (c) { const v = vagaDe(c); return v ? v.universidade + ' (' + v.pais + ')' : 'Sem vaga'; }),
      porCurso: conta(function (c) { const a = alunoDe(c); return a && a.curso ? a.curso : 'Sem curso'; }),
      porStatus: conta(rotuloStatus)
    };
  }

  return {
    GCError, ETAPAS, MAX_BYTES, TTL_MIN, DIAS_AVISO_PRAZO,
    vagaAberta, listarVagas, opcoesFiltro,
    criarAviso, avisosDoUsuario, marcarAvisosLidos, gerarAvisosDePrazo,
    auditar, registrarConsentimento,
    obterDadosAcademicos, avaliarElegibilidade,
    candidatar, anexarDocumento, confirmarCandidatura, conferirDocumento, definirResultado,
    salvarVaga, alterarStatusVaga,
    alterarPerfil, cadastrarInstituicao, definirFalhaSimulada, importarAcademico,
    publicarRelato, moderarRelato, inscreverEvento, salvarFaq, removerFaq,
    relatorios, validarArquivo
  };
});
