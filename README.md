# GlobalConnect — Mobilidade Acadêmica Internacional

Sistema completo para gestão e consulta de oportunidades de intercâmbio acadêmico internacional. Desenvolvido com foco em clareza editorial, alta performance e usabilidade acessível.

---

## 🎨 Identidade Visual e Design

O projeto segue as diretrizes de tipografia e diagramação editorial (inspiradas no estilo de caderno de pesquisa e publicação científica), enriquecido com uma **cor de destaque internacional**:

- **Cor Base Monocromática**: Obsidiana (`#000000`), Grafite (`#666666`), Fumaça (`#8f8f8f`), Papel (`#ffffff`), Cinza Suave (`#f1f1f1`).
- **Cor de Destaque Adicional (Azul Internacional / UNIFOR)**:
  - `--color-brand: #0055ff`
  - `--color-brand-hover: #0045d8`
  - `--color-brand-subtle: rgba(0, 85, 255, 0.08)`
  - `--color-brand-border: rgba(0, 85, 255, 0.28)`
- **Modo Escuro Nativo**: Inversão estrita e acessível, com azul luminoso (`#3b82f6`).
- **Fotografia Editorial Real**: 10 imagens geradas em alta resolução (16:9 widescreen) para as universidades parceiras e o banner principal.

---

## 📁 Estrutura Modular do Projeto

```
globalconnect/
├── index.html                   # Ponto de entrada limpo e semântico
├── README.md                    # Documentação do projeto
├── css/
│   ├── tokens.css               # Variáveis de cor, tipografia, espaçamento e sombras
│   ├── base.css                 # Reset, layout responsivo, botões e campos
│   └── app.css                  # Estilos dos componentes da aplicação e da identidade
├── js/
│   ├── util.js                  # Funções puras (datas, números, normalização)
│   ├── policy.js                # Perfis de acesso e controle de permissões (RBAC)
│   ├── eligibility.js           # Algoritmo de validação de elegibilidade acadêmica
│   ├── adapters.js              # Adaptadores de integração (API simulada e importação CSV)
│   ├── seed.js                  # Banco de dados inicial (vagas, alunos, histórico, eventos)
│   ├── services.js              # Regras de negócio e validações com segurança
│   ├── store.js                 # Camada de persistência local (LocalStorage) e sessão
│   ├── images.js                # Dicionário de imagens das universidades parceiras
│   ├── ui.js                    # Construtor DOM, janelas modais, avisos (toast) e ícones SVG
│   ├── app.js                   # Roteamento, controle de sessão (timeout) e aceite LGPD
│   ├── views-public.js          # Lista de vagas, detalhe, login, guias, eventos e FAQ
│   ├── views-aluno.js           # Painel do aluno, envio de documentos e candidaturas
│   ├── views-gestao.js          # Painel da equipe DRI/NEI e relatórios
│   ├── views-admin.js           # Administração de perfis, instituições e auditoria
│   └── main.js                  # Registro das rotas e inicialização do sistema
└── assets/
    └── img/                     # Fotografias reais geradas para as universidades
        ├── porto.jpg            # Universidade do Porto (Portugal)
        ├── toronto.jpg          # University of Toronto (Canadá)
        ├── seoul.jpg            # Seoul National University (Coreia do Sul)
        ├── salamanca.jpg        # Universidad de Salamanca (Espanha)
        ├── munich.jpg           # Technische Universität München (Alemanha)
        ├── coimbra.jpg          # Universidade de Coimbra (Portugal)
        ├── chile.jpg            # Universidad de Chile (Chile)
        ├── melbourne.jpg        # University of Melbourne (Austrália)
        ├── montreal.jpg         # Université de Montréal (Canadá)
        └── hero.jpg             # Banner internacional GlobalConnect
```

---

## 🚀 Como Executar

Você pode executar o projeto de duas formas simples:

### Opção 1: Diretamente no Navegador
Basta dar um duplo clique no arquivo `index.html` (ou no arquivo consolidado `GlobalConnect_ protótipo funcional do MVP.html`) para abri-lo em qualquer navegador moderno (Chrome, Safari, Edge, Firefox, Brave).

### Opção 2: Servidor Local Estático
Se desejar rodar via terminal:
```bash
# Com Python 3
cd /Users/lucas/Downloads/globalconnect
python3 -m http.server 3000

# Ou com Node.js npx
npx serve /Users/lucas/Downloads/globalconnect
```
Em seguida, acesse: `http://localhost:3000`

---

## 👥 Usuários de Demonstração (Login Rápido)

Na tela de **Entrar** (`#/login`), há atalhos com 1 clique para alternar perfis:

| Usuário | Perfil | Instituição | Caso de Uso Principal |
|---------|--------|-------------|----------------------|
| **Gabriel** | Aluno | Unifor | Aluno em início de curso (teste de não-elegibilidade por % concluído) |
| **Beatriz** | Aluno | Unifor | Aluna elegível com candidatura ativa e pendência de documento devolvido |
| **Mateus** | Aluno | Unifor | Aluno avançado com alto coeficiente de rendimento |
| **Rafael** | Egresso | Unifor | Intercambista egresso que publicou relato e atua como mentor |
| **Lena** | Aluna Estrangeira | Unifor | Estudante alemã inscrita em eventos e Tandem de idiomas |
| **Helena** | Analista DRI | Unifor | Análise, conferência e devolução de documentos com justificativa |
| **Fernanda** | Diretora DRI | Unifor | Gestão de editais, relatórios executivos e homologação |
| **Administrador** | Admin | Geral | Configuração de perfis, instituições, integração CSV e auditoria |

---

## ✨ Funcionalidades Principais

1. **Catálogo Editorial de Vagas**: Visualização em grade assimétrica, filtros rápidos por país, área de conhecimento e duração.
2. **Motor de Elegibilidade em Tempo Real**: Compara média de notas, percentual concluído do curso e limite de reprovações com os requisitos de cada edital.
3. **Fluxo de Candidatura e Documentos**: Envio de documentos com controle de versões, conferência pela equipe do DRI e feedback em caso de devolução.
4. **Adequação à LGPD**: Termo de consentimento explícito registrado em auditoria antes do primeiro envio de dados sensíveis.
5. **Integração Acadêmica**: Suporte a API simulada e importação de dados de alunos via planilha CSV.
6. **Registro de Auditoria**: Registro imutável de acessos a dados sensíveis, alterações de regras e homologações.

