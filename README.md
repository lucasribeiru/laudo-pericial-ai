# Gemini Perícias Judiciais - Formulário Oficial BPC/LOAS (.DOCX / PDF)

Sistema web especializado com interface inspirada no **Google Gemini**, desenvolvido para peritos assistentes sociais da Justiça Federal (Seção Judiciária do Amapá - Anexo IV). O sistema permite o envio natural de documentos e fotos por chat com inteligência artificial, extraindo automaticamente todas as informações socioeconômicas e gerando o documento oficial pronto e editável em **Microsoft Word (.docx)** e **PDF**.

---

## 🚀 Como Iniciar

1. Navegue até a pasta do projeto:
   `C:\Users\ap328ps\.gemini\antigravity-ide\scratch\laudo-pericial-ai\`
2. Dê um duplo clique no arquivo:
   `run_app.bat`
   *(Ou abra diretamente o arquivo `index.html` em qualquer navegador: Google Chrome, Microsoft Edge ou Firefox).*

---

## 📋 Funcionalidades Principais

1. **Interface de Chat com IA Estilo Gemini:**
   - Design moderno com suporte a tema escuro e claro.
   - Envio de múltiplos arquivos simultâneos (PDFs de RG/CPF, extratos do CadÚnico, laudos médicos, fotos de fachada e cômodos da moradia).
   - Efeito visual de digitação e cartões resumo das métricas extraídas em tempo real.

2. **Extração Automática e Natural (Multimodal):**
   - **Identificação:** Periciado(a), representante legal, CPF, RG, data de nascimento, naturalidade, NIS, estado civil, escolaridade e endereço completo.
   - **Situação Pessoal:** Idade de trabalhar, cursos, ocupações anteriores e diagnóstico de vínculos em carteira de trabalho (CTPS).
   - **Composição Familiar e Renda:** Tabela estruturada de membros familiares, parentescos, ocupações e rendas declaradas/benefícios.
   - **Cálculo da Renda Per Capita LOAS:** Cálculo automático com validação do teto legal de 1/4 do salário mínimo (Art. 20, § 3º da Lei nº 8.742/93).
   - **Situação de Moradia:** Tipo de construção (alvenaria, madeira), cobertura, cômodos, tempo de residência, regime (próprio, cedido, alugado), infraestrutura de água, esgoto, luz e vias, além de inventário de bens móveis essenciais.
   - **Despesas Gerais:** Levantamento de custos com habitação, energia, água, alimentação, transporte e saúde (medicamentos, consultas especializadas e despesas decorrentes de deficiência/doença crônica).
   - **Conclusão e Parecer Técnico:** Marcação das constatações de vulnerabilidade severa e emissão fundamentada de parecer conclusivo de amparo legal ao BPC.
   - **Classificação Pericial:** Pontuação dos graus de complexidade, risco, distância e dificuldade de acesso com justificativa técnica.
   - **Encerramento:** Município, data, hora e bloco de assinatura oficial do assistente social com CRESS.

3. **Geração Nativa de Documento Word (.docx) Editável:**
   - Utiliza a biblioteca oficial `docx.js` para compilar o arquivo `.docx` diretamente no navegador.
   - Preserva 100% o cabeçalho judiciário, margens ABNT, tabelas formatadas com bordas e marcações `( X )`.
   - Abre perfeitamente no Microsoft Word, LibreOffice Writer e Google Docs.

4. **Painel Interativo de Visualização Dividida (Split View):**
   - Visualização da folha A4 oficial ao lado do chat em tempo real.
   - Todos os campos são interativos e editáveis diretamente na folha para pequenos ajustes antes da impressão ou download.

5. **Configuração da Chave Gemini API:**
   - Clique em **"Configurar IA"** no topo da tela para inserir sua chave gratuita do [Google AI Studio](https://aistudio.google.com/).
   - Permite escolher entre os modelos `gemini-1.5-flash` (padrão estável), `gemini-2.0-flash` ou `gemini-1.5-pro`.
   - Caso não insira uma chave, o sistema opera no modo integrado com casos reais pré-carregados (Lucas de Sousa Ribeiro / Mazagão).

---

## 📁 Estrutura de Arquivos

```
laudo-pericial-ai/
├── index.html            # Estrutura principal da interface Gemini e split-screen
├── style.css             # Design System Material 3, Dark/Light mode e formatação A4
├── app.js                # Lógica do chat, upload multimodal e renderização interativa
├── docx-generator.js     # Compilador nativo de Microsoft Word (.docx)
├── template-schema.js    # Esquema de dados judicial e fórmula de cálculo LOAS
├── sample-data.js        # Casos reais de demonstração (Lucas / Emilly Mazagão)
├── run_app.bat           # Executável de inicialização rápida no Windows
└── README.md             # Esta documentação
```
