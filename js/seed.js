/* seed.js */
/* Dados de demonstração (fictícios). Datas são relativas ao dia em que o protótipo é aberto. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util'));
  else root.GCSeed = factory(root.GCUtil);
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  const DOC = {
    hist: { id: 'hist', nome: 'Histórico escolar', obrigatorio: true },
    matricula: { id: 'matricula', nome: 'Comprovante de matrícula', obrigatorio: true },
    carta: { id: 'carta', nome: 'Carta de motivação', obrigatorio: true },
    plano: { id: 'plano', nome: 'Plano de estudos', obrigatorio: true },
    idioma: { id: 'idioma', nome: 'Comprovante de proficiência no idioma', obrigatorio: true },
    passaporte: { id: 'passaporte', nome: 'Passaporte (cópia)', obrigatorio: true, sensivel: true },
    recomendacao: { id: 'recomendacao', nome: 'Carta de recomendação', obrigatorio: false }
  };
  const docs = function () { return Array.prototype.slice.call(arguments).map(function (k) { return U.clone(DOC[k]); }); };

  function create(now) {
    now = now || new Date();
    const dia = function (n) { return U.isoDate(U.addDays(now, n)); };
    const iso = function (n) { return U.addDays(now, n).toISOString(); };

    const vaga = function (id, instId, f) {
      return Object.assign({ id: id, instId: instId, status: 'aberta' }, f);
    };

    const state = {
      versao: 1,
      instituicoes: [
        { id: 'unifor', nome: 'Unifor', adaptador: 'sim-api', ativa: true },
        { id: 'demo-b', nome: 'Universidade Demonstração B', adaptador: 'csv', ativa: true }
      ],
      usuarios: [
        { id: 'u-gabriel', nome: 'Gabriel', email: 'gabriel@aluno.demo', perfil: 'aluno', instId: 'unifor', matricula: '2610001', curso: 'Ciência da Computação', semestre: 2 },
        { id: 'u-mateus', nome: 'Mateus', email: 'mateus@aluno.demo', perfil: 'aluno', instId: 'unifor', matricula: '2410002', curso: 'Administração', semestre: 4 },
        { id: 'u-beatriz', nome: 'Beatriz', email: 'beatriz@aluno.demo', perfil: 'aluno', instId: 'unifor', matricula: '2310003', curso: 'Direito', semestre: 5 },
        { id: 'u-rafael', nome: 'Rafael', email: 'rafael@egresso.demo', perfil: 'egresso', instId: 'unifor', curso: 'Administração' },
        { id: 'u-lena', nome: 'Lena', email: 'lena@estrangeiro.demo', perfil: 'estrangeiro', instId: 'unifor', pais: 'Alemanha' },
        { id: 'u-helena', nome: 'Helena', email: 'helena@dri.demo', perfil: 'analista', instId: 'unifor' },
        { id: 'u-fernanda', nome: 'Fernanda', email: 'fernanda@dri.demo', perfil: 'diretora', instId: 'unifor' },
        { id: 'u-admin', nome: 'Administrador', email: 'admin@gc.demo', perfil: 'admin', instId: 'unifor' },
        { id: 'u-carlos', nome: 'Carlos', email: 'carlos@aluno-b.demo', perfil: 'aluno', instId: 'demo-b', matricula: 'B-1001', curso: 'Engenharia Civil', semestre: 6 },
        { id: 'u-marina', nome: 'Marina', email: 'marina@dri-b.demo', perfil: 'diretora', instId: 'demo-b' }
      ],
      academico: {
        unifor: {
          '2610001': { matricula: '2610001', nome: 'Gabriel', curso: 'Ciência da Computação', semestre: 2, media: 7.8, percentualConcluido: 18, reprovacoes: 0, atualizadoEm: iso(-1) },
          '2410002': { matricula: '2410002', nome: 'Mateus', curso: 'Administração', semestre: 4, media: 8.4, percentualConcluido: 62, reprovacoes: 1, atualizadoEm: iso(-1) },
          '2310003': { matricula: '2310003', nome: 'Beatriz', curso: 'Direito', semestre: 5, media: 8.9, percentualConcluido: 71, reprovacoes: 0, atualizadoEm: iso(-1) }
        },
        'demo-b': {
          'B-1001': { matricula: 'B-1001', nome: 'Carlos', curso: 'Engenharia Civil', semestre: 6, media: 7.2, percentualConcluido: 55, reprovacoes: 0, atualizadoEm: iso(-3) }
        }
      },
      integracao: { unifor: { falhaSimulada: false }, 'demo-b': { falhaSimulada: false, ultimaImportacao: { em: iso(-3), importados: 1, erros: 0 } } },
      cacheAcademico: {},
      consentimentos: { 'u-beatriz': iso(-10) },
      vagas: [
        vaga('v1', 'unifor', { universidade: 'Universidade do Porto', pais: 'Portugal', paisCod: 'PT', area: 'Engenharia & Tecnologia', duracao: '1 semestre', idioma: 'Português', bolsa: true, custo: '€650/mês', regra: { mediaMin: 7.0, percentualMin: 50, maxReprovacoes: 2 }, docs: docs('hist', 'matricula', 'carta', 'plano', 'passaporte'), prazo: dia(28), prazos: { conferencia: dia(35), resultado: dia(50) }, atualizadoEm: iso(-4) }),
        vaga('v2', 'unifor', { universidade: 'University of Toronto', pais: 'Canadá', paisCod: 'CA', area: 'Negócios & Gestão', duracao: '1 ano', idioma: 'Inglês (TOEFL/IELTS)', bolsa: false, custo: 'CAD 1.200/mês', regra: { mediaMin: 8.0, percentualMin: 40, maxReprovacoes: 1 }, docs: docs('hist', 'matricula', 'carta', 'idioma', 'passaporte', 'recomendacao'), prazo: dia(40), prazos: { conferencia: dia(48), resultado: dia(62) }, atualizadoEm: iso(-6) }),
        vaga('v3', 'unifor', { universidade: 'Seoul National University', pais: 'Coreia do Sul', paisCod: 'KR', area: 'Tecnologia & Sociedade', duracao: '1 semestre', idioma: 'Inglês', bolsa: true, custo: '₩800.000/mês', regra: { mediaMin: 7.5, percentualMin: 50, maxReprovacoes: 1 }, docs: docs('hist', 'matricula', 'carta', 'idioma', 'passaporte'), prazo: dia(21), prazos: { conferencia: dia(30), resultado: dia(45) }, atualizadoEm: iso(-5) }),
        vaga('v4', 'unifor', { universidade: 'Universidad de Salamanca', pais: 'Espanha', paisCod: 'ES', area: 'Direito & Ciências Sociais', duracao: '1 semestre', idioma: 'Espanhol', bolsa: true, custo: '€700/mês', regra: { mediaMin: 7.0, percentualMin: 40, maxReprovacoes: 2 }, docs: docs('hist', 'matricula', 'carta', 'idioma', 'passaporte'), prazo: dia(33), prazos: { conferencia: dia(40), resultado: dia(55) }, atualizadoEm: iso(-8) }),
        vaga('v5', 'unifor', { universidade: 'Technische Universität München', pais: 'Alemanha', paisCod: 'DE', area: 'Engenharia & Tecnologia', duracao: '1 ano', idioma: 'Inglês', bolsa: true, custo: '€950/mês', regra: { mediaMin: 7.5, percentualMin: 60, maxReprovacoes: 1 }, docs: docs('hist', 'matricula', 'carta', 'plano', 'idioma', 'passaporte'), prazo: dia(45), prazos: { conferencia: dia(52), resultado: dia(66) }, atualizadoEm: iso(-2) }),
        vaga('v6', 'unifor', { universidade: 'Universidade de Coimbra', pais: 'Portugal', paisCod: 'PT', area: 'Direito & Ciências Sociais', duracao: '1 semestre', idioma: 'Português', bolsa: false, custo: '€600/mês', regra: { mediaMin: 7.0, percentualMin: 45, maxReprovacoes: 2 }, docs: docs('hist', 'matricula', 'carta', 'plano', 'passaporte'), prazo: dia(5), prazos: { conferencia: dia(10), resultado: dia(25) }, atualizadoEm: iso(-7) }),
        vaga('v7', 'unifor', { universidade: 'Universidad de Chile', pais: 'Chile', paisCod: 'CL', area: 'Ciências Sociais', duracao: '1 semestre', idioma: 'Espanhol', bolsa: false, custo: 'CLP 520.000/mês', regra: { mediaMin: 7.0, percentualMin: 40, maxReprovacoes: 2 }, docs: docs('hist', 'matricula', 'carta'), prazo: dia(-12), prazos: { conferencia: dia(-5), resultado: dia(10) }, atualizadoEm: iso(-30), status: 'encerrada' }),
        vaga('v8', 'demo-b', { universidade: 'University of Melbourne', pais: 'Austrália', paisCod: 'AU', area: 'Engenharia & Tecnologia', duracao: '1 semestre', idioma: 'Inglês (IELTS)', bolsa: true, custo: 'AUD 1.600/mês', regra: { mediaMin: 7.0, percentualMin: 50, maxReprovacoes: 1 }, docs: docs('hist', 'matricula', 'carta', 'idioma', 'passaporte'), prazo: dia(30), prazos: { conferencia: dia(37), resultado: dia(52) }, atualizadoEm: iso(-3) }),
        vaga('v9', 'demo-b', { universidade: 'Université de Montréal', pais: 'Canadá', paisCod: 'CA', area: 'Engenharia & Tecnologia', duracao: '1 ano', idioma: 'Francês', bolsa: false, custo: 'CAD 1.100/mês', regra: { mediaMin: 7.5, percentualMin: 50, maxReprovacoes: 1 }, docs: docs('hist', 'matricula', 'carta', 'passaporte'), prazo: dia(26), prazos: { conferencia: dia(33), resultado: dia(48) }, atualizadoEm: iso(-9) })
      ],
      candidaturas: [],
      avisos: [],
      emails: [],
      relatos: [
        { id: 'r1', instId: 'unifor', autorId: 'u-rafael', autor: 'Rafael', destino: 'Universidade do Porto', periodo: '1 semestre', titulo: 'O que eu queria ter sabido antes de viajar', texto: 'Comece a organizar os documentos cedo e confirme com o setor quais são as regras de equivalência das disciplinas. Isso evita correria perto do prazo. (Relato de demonstração.)', mentor: true, status: 'aprovado', criadoEm: iso(-20) }
      ],
      eventos: [
        { id: 'e1', instId: 'unifor', titulo: 'Tandem de idiomas', tipo: 'Tandem', data: dia(6), local: 'Biblioteca, sala de convivência', descricao: 'Encontro semanal para praticar idiomas com alunos de intercâmbio.', inscritos: [] },
        { id: 'e2', instId: 'unifor', titulo: 'Recepção de alunos estrangeiros', tipo: 'Evento', data: dia(14), local: 'Auditório principal', descricao: 'Boas-vindas e apresentação do campus para os alunos estrangeiros.', inscritos: [] },
        { id: 'e3', instId: 'unifor', titulo: 'Feira de oportunidades de intercâmbio', tipo: 'Evento', data: dia(20), local: 'Hall do bloco central', descricao: 'Converse com egressos e com a equipe do DRI/NEI sobre as vagas.', inscritos: [] }
      ],
      faq: [
        { id: 'f1', instId: 'unifor', tema: 'Elegibilidade', pergunta: 'Como sei se posso me candidatar?', resposta: 'Abra a vaga e entre com o login institucional. O sistema compara a sua média, o percentual do curso concluído e as reprovações com a regra da vaga e mostra o resultado na hora.' },
        { id: 'f2', instId: 'unifor', tema: 'Documentos', pergunta: 'Quais formatos de arquivo são aceitos?', resposta: 'PDF, JPG e PNG. No protótipo, cada arquivo pode ter até 700 KB.' },
        { id: 'f3', instId: 'unifor', tema: 'Documentos', pergunta: 'O que acontece se um documento for devolvido?', resposta: 'Você recebe um aviso com o motivo. Basta enviar uma nova versão do documento dentro do prazo da vaga.' },
        { id: 'f4', instId: 'unifor', tema: 'Prazos', pergunta: 'Como fico sabendo dos prazos?', resposta: 'O sistema avisa dentro da plataforma e por e-mail quando o prazo está perto e quando surge uma pendência.' },
        { id: 'f5', instId: 'unifor', tema: 'Dados', pergunta: 'Quem vê o meu passaporte e as minhas notas?', resposta: 'Somente a equipe do DRI/NEI responsável pela conferência. Cada acesso a dado sensível fica registrado.' }
      ],
      guias: [
        { pais: 'Portugal', paisCod: 'PT', exames: 'Idioma português: em geral não há exame de proficiência. Confirme com a universidade.', visto: 'Verifique no consulado oficial se a duração da vaga exige visto de estudante.', seguro: 'Seguro-saúde internacional com a cobertura mínima pedida pela universidade.' },
        { pais: 'Canadá', paisCod: 'CA', exames: 'TOEFL iBT ou IELTS Academic, com nível e validade definidos pela universidade.', visto: 'Verifique no site oficial do governo canadense a permissão de estudo exigida para a duração da vaga.', seguro: 'Seguro-saúde obrigatório conforme a província e a universidade.' },
        { pais: 'Coreia do Sul', paisCod: 'KR', exames: 'Comprovante de inglês aceito pela universidade (por exemplo TOEFL ou IELTS).', visto: 'Consulte a embaixada ou o consulado para o visto de estudante.', seguro: 'Seguro-saúde exigido na matrícula internacional.' },
        { pais: 'Espanha', paisCod: 'ES', exames: 'Para cursos em espanhol, a universidade pode pedir comprovação (por exemplo DELE).', visto: 'Consulte o consulado espanhol para o visto de estudante.', seguro: 'Seguro-saúde com cobertura mínima definida pela universidade.' },
        { pais: 'Alemanha', paisCod: 'DE', exames: 'Inglês (TOEFL ou IELTS) ou alemão, conforme o curso escolhido.', visto: 'Consulte a embaixada alemã para o visto de estudante.', seguro: 'Seguro-saúde obrigatório para estudantes.' }
      ],
      auditoria: []
    };

    // Candidatura de demonstração (Beatriz, Coimbra): mostra documentos devolvidos e prazo próximo.
    const cand = {
      id: 'cand-demo1', alunoId: 'u-beatriz', vagaId: 'v6', instId: 'unifor', status: 'em_andamento', etapa: 1,
      criadaEm: iso(-6), atualizadaEm: iso(-1), resultado: '',
      documentos: [
        { exigidoId: 'hist', nome: 'Histórico escolar', obrigatorio: true, sensivel: false, status: 'aprovado', versoes: [{ n: 1, nome: 'historico-beatriz.pdf', tamanho: 120000, tipo: 'application/pdf', enviadoEm: iso(-6) }], motivo: '', conferidoPor: 'Helena', conferidoEm: iso(-4) },
        { exigidoId: 'matricula', nome: 'Comprovante de matrícula', obrigatorio: true, sensivel: false, status: 'aprovado', versoes: [{ n: 1, nome: 'matricula.pdf', tamanho: 80000, tipo: 'application/pdf', enviadoEm: iso(-6) }], motivo: '', conferidoPor: 'Helena', conferidoEm: iso(-4) },
        { exigidoId: 'carta', nome: 'Carta de motivação', obrigatorio: true, sensivel: false, status: 'enviado', versoes: [{ n: 1, nome: 'carta-motivacao.pdf', tamanho: 95000, tipo: 'application/pdf', enviadoEm: iso(-6) }], motivo: '', conferidoPor: '', conferidoEm: '' },
        { exigidoId: 'plano', nome: 'Plano de estudos', obrigatorio: true, sensivel: false, status: 'reenviar', versoes: [{ n: 1, nome: 'plano-estudos.pdf', tamanho: 110000, tipo: 'application/pdf', enviadoEm: iso(-6) }], motivo: 'Falta a assinatura do coordenador no plano de estudos.', conferidoPor: 'Helena', conferidoEm: iso(-1) },
        { exigidoId: 'passaporte', nome: 'Passaporte (cópia)', obrigatorio: true, sensivel: true, status: 'enviado', versoes: [{ n: 1, nome: 'passaporte.jpg', tamanho: 150000, tipo: 'image/jpeg', enviadoEm: iso(-6) }], motivo: '', conferidoPor: '', conferidoEm: '' }
      ],
      historico: [
        { em: iso(-6), texto: 'Candidatura iniciada. Envie os documentos exigidos.' },
        { em: iso(-6), texto: 'Candidatura confirmada. Documentos em conferência.' },
        { em: iso(-1), texto: 'Documento devolvido: Plano de estudos.' }
      ]
    };
    state.candidaturas.push(cand);
    state.avisos.push(
      { id: 'av-d1', userId: 'u-beatriz', tipo: 'documento-devolvido', texto: 'O documento “Plano de estudos” foi devolvido. Motivo: Falta a assinatura do coordenador no plano de estudos.', link: '#/candidatura/cand-demo1', chave: '', criadoEm: iso(-1), lido: false },
      { id: 'av-d2', userId: 'u-helena', tipo: 'novo-envio', texto: 'Beatriz enviou documentos para a vaga Universidade de Coimbra.', link: '#/gestao/candidatura/cand-demo1', chave: '', criadoEm: iso(-6), lido: true }
    );
    return state;
  }

  return { create, DOC };
});
