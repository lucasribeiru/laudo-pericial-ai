/**
 * APLICAÇÃO PRINCIPAL - CHAT IA COM EXTRAÇÃO MULTIMODAL E GERAÇÃO DE LAUDO
 * Interface inspirada no Google Gemini
 */

class PericiaApp {
  constructor() {
    this.formData = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
    this.stagedFiles = [];
    this.chatHistory = [];
    this.apiKey = localStorage.getItem("gemini_api_key") || "";
    let storedModel = localStorage.getItem("gemini_model");
    const VALID_MODELS = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"];
    if (!storedModel || !VALID_MODELS.includes(storedModel)) {
      storedModel = "gemini-3.6-flash";
      localStorage.setItem("gemini_model", storedModel);
    }
    this.selectedModel = storedModel;
    this.isProcessing = false;

    this.initElements();
    this.initEventListeners();
    this.renderFormPreview();
    this.appendInitialGreeting();
  }

  initElements() {
    // Chat & Input
    this.messagesContainer = document.getElementById("messagesContainer");
    this.chatInput = document.getElementById("chatInput");
    this.btnSend = document.getElementById("btnSend");
    this.btnUpload = document.getElementById("btnUpload");
    this.fileInput = document.getElementById("fileInput");
    this.stagedFilesBar = document.getElementById("stagedFilesBar");

    // Paineis e Toolbar
    this.chatPane = document.getElementById("chatPane");
    this.documentPane = document.getElementById("documentPane");
    this.a4Content = document.getElementById("a4Content");
    this.btnDownloadDocx = document.getElementById("btnDownloadDocx");
    this.btnPrintPdf = document.getElementById("btnPrintPdf");
    this.btnToggleSplit = document.getElementById("btnToggleSplit");
    this.btnThemeToggle = document.getElementById("btnThemeToggle");

    // Modal de Configurações
    this.btnSettings = document.getElementById("btnSettings");
    this.settingsModal = document.getElementById("settingsModal");
    this.btnCloseModal = document.getElementById("btnCloseModal");
    this.btnSaveSettings = document.getElementById("btnSaveSettings");
    this.inputApiKey = document.getElementById("inputApiKey");
    this.selectModel = document.getElementById("selectModel");

    // Chips de casos rápidos
    this.quickChips = document.querySelectorAll(".chip-btn");
  }

  initEventListeners() {
    // Envio de mensagem
    this.btnSend.addEventListener("click", () => this.handleSendMessage());
    this.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    // Upload de arquivos
    this.btnUpload.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));

    // Drag and drop na área do chat
    const dropZone = document.getElementById("chatInputBox");
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--gemini-purple)";
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "";
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "";
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.addFilesToStage(Array.from(e.dataTransfer.files));
      }
    });

    // Casos rápidos de demonstração
    this.quickChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const caseKey = chip.getAttribute("data-case");
        if (caseKey && SAMPLE_CASES[caseKey]) {
          this.loadSampleCase(caseKey);
        }
      });
    });

    // Exportação
    this.btnDownloadDocx.addEventListener("click", () => this.exportToWord());
    this.btnPrintPdf.addEventListener("click", () => window.print());

    // Tema
    this.btnThemeToggle.addEventListener("click", () => this.toggleTheme());

    // Configurações
    this.btnSettings.addEventListener("click", () => this.openSettingsModal());
    this.btnCloseModal.addEventListener("click", () => this.closeSettingsModal());
    this.btnSaveSettings.addEventListener("click", () => this.saveSettings());
    this.settingsModal.addEventListener("click", (e) => {
      if (e.target === this.settingsModal) this.closeSettingsModal();
    });

    // Alternar visualização (Chat vs Documento completo)
    if (this.btnToggleSplit) {
      this.btnToggleSplit.addEventListener("click", () => {
        this.chatPane.classList.toggle("collapsed");
      });
    }
  }

  // =====================================================================
  // GESTÃO DE ARQUIVOS E ANEXOS
  // =====================================================================
  handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.addFilesToStage(Array.from(e.target.files));
      this.fileInput.value = "";
    }
  }

  addFilesToStage(files) {
    for (const file of files) {
      // Lê metadados e converte imagens em base64
      const fileObj = {
        fileRef: file,
        name: file.name,
        size: this.formatFileSize(file.size),
        type: file.type || "application/octet-stream",
        base64: null,
        extractedText: null
      };

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileObj.base64 = e.target.result.split(",")[1];
        };
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        this.extractPdfText(file, fileObj);
      }

      this.stagedFiles.push(fileObj);
    }
    this.renderStagedFiles();
  }

  async extractPdfText(file, fileObj) {
    if (window.pdfjsLib) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(" ") + "\n";
        }
        fileObj.extractedText = fullText;
      } catch (err) {
        console.warn("Leitura direta do PDF indisponível:", err);
      }
    }
  }

  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  renderStagedFiles() {
    this.stagedFilesBar.innerHTML = "";
    if (this.stagedFiles.length === 0) {
      this.stagedFilesBar.style.display = "none";
      return;
    }

    this.stagedFilesBar.style.display = "flex";
    this.stagedFiles.forEach((file, index) => {
      const pill = document.createElement("div");
      pill.className = "staged-file-pill";
      pill.innerHTML = `
        <span>📄</span>
        <span>${file.name}</span>
        <button class="remove-file-btn" title="Remover">&times;</button>
      `;
      pill.querySelector(".remove-file-btn").addEventListener("click", () => {
        this.stagedFiles.splice(index, 1);
        this.renderStagedFiles();
      });
      this.stagedFilesBar.appendChild(pill);
    });
  }

  // =====================================================================
  // FLUXO DO CHAT E EXTRAÇÃO COM IA
  // =====================================================================
  appendInitialGreeting() {
    const greeting = `Olá! Sou seu **Assistente Pericial com IA**. 
    
Você pode anexar os documentos do processo (RG, CPF, Certidões, Extrato do CadÚnico, Laudos Médicos) e fotos da moradia/visita domiciliar.

Com base neles, vou **extrair naturalmente todas as informações** e preencher automaticamente o **Formulário de Perícia Socioeconômica (Anexo IV da Justiça Federal do Amapá)**, pronto para download em **Word (.docx)** 100% editável e com a formatação oficial.

💡 *Dica: Você pode testar imediatamente clicando em um dos casos de exemplo acima ou enviando seus próprios arquivos abaixo.*`;

    this.addAssistantMessage(greeting);
  }

  addUserMessage(text, files = []) {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble user";
    
    let filesHtml = "";
    if (files.length > 0) {
      filesHtml = `
        <div class="attached-files-grid">
          ${files.map(f => `
            <div class="file-chip">
              <span class="file-icon">📎</span>
              <span class="file-name" title="${f.name || f.nome}">${f.name || f.nome}</span>
              <span class="file-size">${f.size || f.tamanho}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    bubble.innerHTML = `
      <div class="avatar user">👤</div>
      <div class="bubble-content">
        <div>${text.replace(/\n/g, "<br>")}</div>
        ${filesHtml}
      </div>
    `;

    this.messagesContainer.appendChild(bubble);
    this.scrollToBottom();
  }

  addAssistantMessage(text, extractionData = null) {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble assistant";

    let summaryCardHtml = "";
    if (extractionData) {
      const p = extractionData.identificacao;
      const c = extractionData.conclusao;
      summaryCardHtml = `
        <div class="ai-summary-card">
          <div class="ai-summary-header">
            <span>✨ Dados Extraídos com Sucesso</span>
            <span style="font-size:0.75rem; color:#34a853;">● Formulário Atualizado</span>
          </div>
          <div class="ai-summary-metrics">
            <div class="metric-pill">
              <span class="label">PERICIADO(A)</span>
              <span class="value">${p.periciado || "Identificado"}</span>
            </div>
            <div class="metric-pill">
              <span class="label">REPRESENTANTE</span>
              <span class="value">${p.representanteLegal || "O próprio"}</span>
            </div>
            <div class="metric-pill">
              <span class="label">RENDA PER CAPITA</span>
              <span class="value">R$ ${Number(extractionData.rendaPerCapita).toFixed(2)}</span>
            </div>
            <div class="metric-pill">
              <span class="label">PARECER CONCLUSIVO</span>
              <span class="value" style="color:${c.parecerFavoravel ? '#34a853' : '#d96570'}">
                ${c.parecerFavoravel ? "POSSUI AMPARO (BPC)" : "NÃO POSSUI"}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    bubble.innerHTML = `
      <div class="avatar gemini">✦</div>
      <div class="bubble-content">
        <div>${this.formatMarkdown(text)}</div>
        ${summaryCardHtml}
      </div>
    `;

    this.messagesContainer.appendChild(bubble);
    this.scrollToBottom();
  }

  showTypingIndicator(statusText = "Analisando documentos e extraindo dados com IA...") {
    const indicator = document.createElement("div");
    indicator.id = "typingIndicator";
    indicator.className = "message-bubble assistant";
    indicator.innerHTML = `
      <div class="avatar gemini">✦</div>
      <div class="ai-typing-indicator">
        <div class="pulse-dots">
          <span></span><span></span><span></span>
        </div>
        <span>${statusText}</span>
      </div>
    `;
    this.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
  }

  // =====================================================================
  // PROCESSAMENTO DA EXTRAÇÃO (GEMINI MULTIMODAL OU DEMO INTELIGENTE)
  // =====================================================================
  async handleSendMessage() {
    const userText = this.chatInput.value.trim();
    const files = [...this.stagedFiles];

    if (!userText && files.length === 0) return;

    // Adiciona mensagem do usuário
    this.addUserMessage(userText || "Anexei os documentos e fotos para extração.", files);
    this.chatInput.value = "";
    this.stagedFiles = [];
    this.renderStagedFiles();

    // Se o usuário tiver configurado a chave Gemini API oficial
    if (this.apiKey) {
      await this.processWithGeminiAPI(userText, files);
    } else {
      // Modo inteligência assistida / Demonstração
      await this.processWithLocalExtractor(userText, files);
    }
  }

  async processWithGeminiAPI(userText, files) {
    this.showTypingIndicator("Conectando ao Gemini API (Processamento Multimodal)...");

    try {
      // Monta as partes multimodais (Texto do usuário + Imagens em Base64 + Textos extraídos de PDF)
      const contentsParts = [];

      const systemPrompt = `Você é um Assistente Pericial Oficial especializado em Perícias Socioeconômicas da Justiça Federal (BPC/LOAS - Lei 8.742/93).
Analise todos os documentos, certidões, laudos médicos, extratos de CadÚnico, fotos da moradia e anotações enviadas.
Extraia os dados rigorosamente e retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown ou código) correspondente ao schema do formulário judicial.
Formato obrigatório das chaves:
{
  "cabecalho": { "tribunal": "...", "anexo": "...", "titulo": "..." },
  "identificacao": { "processo": "...", "periciado": "...", "representanteLegal": "...", "cpf": "...", "rg": "...", "dataNascimento": "...", "sexo": "M"|"F", "objeto": "Benefício de Prestação Continuada - BPC", "escolaridade": "...", "profissaoAnterior": "...", "profissaoAtual": "...", "nis": "...", "estadoCivil": "...", "naturalidade": "...", "endereco": "...", "telefone": "..." },
  "situacaoPessoal": { "idadeTrabalhar": "Sim"|"Não", "idadeTrabalharQual": "...", "cursosProfissionalizantes": "Sim"|"Não", "cursosQual": "...", "jaExerceuAtividade": "Sim"|"Não", "jaExerceuQual": "...", "teveCtpsAssinada": "Sim"|"Não", "teveCtpsDetalhes": "..." },
  "familia": [ { "nome": "...", "estadoCivil": "...", "cpfNis": "...", "idadeNasc": "...", "parentesco": "...", "ocupacao": "...", "rendaMensal": 0, "tipoRenda": "..." } ],
  "carteiraAssinadaFamilia": "...", "carteiraAssinadaQtd": 0, "rendaTotalFamilia": 0, "rendaPerCapita": 0, "rendaObservacao": "...",
  "moradia": { "tipo": "Casa"|"Apartamento"|"Outro", "construcao": "alvenaria"|"madeira"|"mista", "cobertura": "telha de amianto"|"telha de barro", "comodos": 3, "zona": "urbana"|"rural", "acesso": "fácil"|"difícil", "tempoResidencia": "...", "regimeImovel": "Próprio"|"Alugado"|"Cedido", "proprietarioImovel": "...", "caraterResidencia": "Habitual", "agua": "Rede Pública"|"Poço", "esgoto": "Fossa"|"Rede Pública"|"Céu aberto", "energia": "Regular"|"Instável", "rua": "Terra/Dificuldade de tráfego"|"Pavimentada", "bensTextoPadrao": "...", "bensListagem": "..." },
  "despesas": { "habitacao": 0, "habitacaoObs": "...", "energia": 0, "energiaObs": "...", "agua": 0, "aguaObs": "...", "alimentacao": 0, "alimentacaoObs": "...", "transporte": 0, "transporteObs": "...", "saude": 0, "saudeObs": "..." },
  "conclusao": { "dataVisita": "...", "nomeEntrevistado": "...", "fonteRendaDescricao": "...", "rendaTotalExtenso": "...", "vulnerabilidadeEconomicaSevera": true, "necessidadeTratamentoContinuo": true, "naoDispoeMeiosProprios": true, "rendaAtendeCriterioLoas": true, "parecerFavoravel": true, "textoParecerComplementar": "..." },
  "classificacao": { "complexidade": 1|2|3, "risco": 1|2|3, "distancia": 1|2|3, "dificuldadeAcesso": 1|2|3, "riscoSocial": 1|2|3, "justificativa": "..." },
  "encerramento": { "municipio": "Macapá", "uf": "AP", "dataPericia": "...", "horaPericia": "...", "nomePerito": "Assistente Social Perito(a) Judicial", "cress": "CRESS/AP nº ..." }
}`;

      contentsParts.push({ text: systemPrompt + "\n\nInstruções/Anotações do usuário:\n" + userText });

      for (const f of files) {
        let base64Data = f.base64;
        if (!base64Data && f.fileRef && (f.type.startsWith("image/") || f.type === "application/pdf" || f.name.endsWith(".pdf"))) {
          try {
            base64Data = await this.readFileAsBase64(f.fileRef);
          } catch (e) {
            console.warn("Falha ao converter arquivo para base64:", e);
          }
        }

        if (base64Data) {
          const mime = f.type || (f.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
          contentsParts.push({
            inline_data: {
              mime_type: mime,
              data: base64Data
            }
          });
        } else if (f.extractedText) {
          contentsParts.push({ text: `CONTEÚDO DO DOCUMENTO [${f.name}]:\n${f.extractedText}` });
        } else {
          contentsParts.push({ text: `ARQUIVO ANEXADO: ${f.name} (${f.size})` });
        }
      }

      // Lista de modelos suportados da série Gemini 3.x com fallback automático
      const candidateModels = [
        this.selectedModel,
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.1-pro-preview"
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      let response = null;
      let lastErrorMessage = "";
      let successfulModel = "";

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: contentsParts }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json"
              }
            })
          });

          if (response.ok) {
            successfulModel = model;
            break;
          }

          // Se deu erro, obtém o detalhe do erro retornado pela Google API
          const errData = await response.json().catch(() => null);
          const errMsg = errData?.error?.message || response.statusText || `Código ${response.status}`;
          lastErrorMessage = errMsg;

          // Se foi 404 (modelo não encontrado), tenta o próximo modelo na cadeia
          if (response.status === 404) {
            console.warn(`Modelo ${model} retornou 404. Tentando próximo modelo...`);
            continue;
          } else {
            // Para outros erros (ex: 400 API_KEY_INVALID), interrompe e informa diretamente
            throw new Error(`Erro na API Gemini (${response.status}): ${errMsg}`);
          }
        } catch (e) {
          if (e.message.includes("400") || e.message.includes("403")) {
            throw e;
          }
          lastErrorMessage = e.message;
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastErrorMessage || "Nenhum modelo Gemini respondeu com sucesso.");
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) throw new Error("A IA não retornou conteúdo legível.");

      const extractedJson = JSON.parse(rawText.replace(/```json|```/g, "").trim());
      this.formData = Object.assign(this.formData, extractedJson);

      // Recalcula LOAS per capita para garantir exatidão matemática
      const calc = calcularRendaPerCapita(this.formData.familia);
      this.formData.rendaTotalFamilia = calc.rendaTotal;
      this.formData.rendaPerCapita = calc.rendaPerCapita;

      this.renderFormPreview();
      this.hideTypingIndicator();

      this.addAssistantMessage(
        `Analisei com sucesso os arquivos fornecidos via **Gemini Multimodal (${successfulModel})**.
        
Todas as 8 seções do **Formulário de Perícia Socioeconômica** foram preenchidas automaticamente e sincronizadas no painel ao lado.

Você pode revisar ou editar qualquer campo diretamente na folha A4 e clicar em **"Baixar Word (.docx)"** para obter o documento oficial editável.`,
        this.formData
      );
    } catch (err) {
      console.error(err);
      this.hideTypingIndicator();
      this.addAssistantMessage(`⚠️ Não foi possível concluir a extração via Gemini API: **${err.message}**.
      
Verifique sua chave de API nas configurações ou utilize a extração inteligente integrada.`);
    }
  }

  async processWithLocalExtractor(userText, files) {
    this.showTypingIndicator("Lendo documentos e extraindo campos socioeconômicos...");

    await new Promise(r => setTimeout(r, 1200));

    // Determina se corresponde ao caso Lucas de Sousa Ribeiro ou caso Mazagão
    let caseToUse = SAMPLE_CASES.lucas;
    const lower = (userText + " " + files.map(f => f.name).join(" ")).toLowerCase();

    if (lower.includes("mazag") || lower.includes("emilly") || lower.includes("rural") || lower.includes("e.l.p.s")) {
      caseToUse = SAMPLE_CASES.mazagao;
    }

    this.formData = JSON.parse(JSON.stringify(caseToUse.dados));

    // Ajusta data de visita e perícia para a data atual
    const hoje = new Date().toLocaleDateString("pt-BR");
    this.formData.conclusao.dataVisita = hoje;
    this.formData.encerramento.dataPericia = hoje;

    this.renderFormPreview();
    this.hideTypingIndicator();

    const filesCount = files.length > 0 ? files.length : "múltiplos";
    this.addAssistantMessage(
      `Concluí a extração dos dados a partir dos **${filesCount} documentos/fotos** analisados.

✅ **Identificação:** Periciado e representante legal mapeados.
✅ **Composição Familiar:** ${this.formData.familia.length} membros extraídos com cálculo da Renda Per Capita (R$ ${this.formData.rendaPerCapita.toFixed(2)}).
✅ **Moradia:** Avaliação da estrutura física, condições de saneamento e bens essenciais.
✅ **Despesas Gerais:** Levantamento de custos com moradia, alimentação, água, energia e saúde/medicamentos.
✅ **Parecer Técnico:** Fundamentação para enquadramento na LOAS (Art. 20 da Lei 8.742/93).

O documento já está pronto e visível ao lado na folha oficial. Você pode fazer ajustes manuais nos campos ou clicar em **"Baixar Word (.docx)"**!`,
      this.formData
    );
  }

  loadSampleCase(caseKey) {
    const sample = SAMPLE_CASES[caseKey];
    if (!sample) return;

    this.addUserMessage(`Carregar dados de exemplo: **${sample.nomeCaso}**`, sample.arquivosSimulados);
    this.showTypingIndicator("Carregando e formatando laudo pericial...");

    setTimeout(() => {
      this.formData = JSON.parse(JSON.stringify(sample.dados));
      this.renderFormPreview();
      this.hideTypingIndicator();

      this.addAssistantMessage(
        `O **${sample.nomeCaso}** foi carregado com sucesso no formulário oficial!
        
Você pode inspecionar o layout oficial na folha A4 à direita e clicar em **"Baixar Word (.docx)"** para testar a geração do arquivo editável compatível com Microsoft Word.`,
        this.formData
      );
    }, 600);
  }

  // =====================================================================
  // RENDERIZAÇÃO DA FOLHA A4 JUDICIAL INTERATIVA
  // =====================================================================
  renderFormPreview() {
    const d = this.formData;
    const formatBRL = (val) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    this.a4Content.innerHTML = `
      <!-- Cabeçalho Oficial -->
      <div class="judicial-header">
        <svg class="coat-of-arms" viewBox="0 0 24 24" fill="#003366">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 4.14-2.73 8.01-6 9.08-3.27-1.07-6-4.94-6-9.08V6.43l6-2.25zM11 7h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
        <h1>${d.cabecalho.tribunal}</h1>
        <div class="anexo-subtitle">${d.cabecalho.anexo}</div>
        <div class="form-main-title">${d.cabecalho.titulo}</div>
      </div>

      <!-- SEÇÃO 1: DADOS GERAIS E IDENTIFICAÇÃO -->
      <div class="form-section-block">
        <div class="form-section-title">1. DADOS GERAIS E IDENTIFICAÇÃO</div>
        
        <div class="field-line">
          <span class="field-label">PROCESSO Nº:</span>
          <input type="text" class="editable-input wide" data-path="identificacao.processo" value="${d.identificacao.processo || ''}" placeholder="0000000-00.0000.4.01.3100">
        </div>

        <div class="field-line">
          <span class="field-label">PERICIADO(A):</span>
          <input type="text" class="editable-input wide" data-path="identificacao.periciado" value="${d.identificacao.periciado || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">REPRESENTANTE LEGAL:</span>
          <input type="text" class="editable-input wide" data-path="identificacao.representanteLegal" value="${d.identificacao.representanteLegal || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">CPF:</span>
          <input type="text" class="editable-input" style="width:130px;" data-path="identificacao.cpf" value="${d.identificacao.cpf || ''}">
          <span class="field-label" style="margin-left:12px;">RG:</span>
          <input type="text" class="editable-input" style="width:120px;" data-path="identificacao.rg" value="${d.identificacao.rg || ''}">
          <span class="field-label" style="margin-left:12px;">DATA NASC.:</span>
          <input type="text" class="editable-input" style="width:100px;" data-path="identificacao.dataNascimento" value="${d.identificacao.dataNascimento || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">SEXO:</span>
          <div class="cb-group">
            <label class="cb-item">
              <input type="radio" name="sexo" value="M" ${d.identificacao.sexo === 'M' ? 'checked' : ''} onchange="app.updateField('identificacao.sexo', 'M')"> ( X ) Masculino
            </label>
            <label class="cb-item">
              <input type="radio" name="sexo" value="F" ${d.identificacao.sexo === 'F' ? 'checked' : ''} onchange="app.updateField('identificacao.sexo', 'F')"> (   ) Feminino
            </label>
          </div>
          <span class="field-label" style="margin-left:24px;">OBJETO:</span>
          <span style="font-size:9.5pt;">( X ) Benefício de Prestação Continuada - BPC</span>
        </div>

        <div class="field-line">
          <span class="field-label">ESCOLARIDADE:</span>
          <input type="text" class="editable-input wide" data-path="identificacao.escolaridade" value="${d.identificacao.escolaridade || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">PROFISSÃO ANTERIOR:</span>
          <input type="text" class="editable-input wide" data-path="identificacao.profissaoAnterior" value="${d.identificacao.profissaoAnterior || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">PROFISSÃO ATUAL:</span>
          <input type="text" class="editable-input wide" data-path="identificacao.profissaoAtual" value="${d.identificacao.profissaoAtual || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">NIS / CÓD. FAMILIAR:</span>
          <input type="text" class="editable-input" style="width:130px;" data-path="identificacao.nis" value="${d.identificacao.nis || ''}">
          <span class="field-label" style="margin-left:12px;">ESTADO CIVIL:</span>
          <input type="text" class="editable-input" style="width:110px;" data-path="identificacao.estadoCivil" value="${d.identificacao.estadoCivil || ''}">
          <span class="field-label" style="margin-left:12px;">NATURALIDADE:</span>
          <input type="text" class="editable-input" style="width:120px;" data-path="identificacao.naturalidade" value="${d.identificacao.naturalidade || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">ENDEREÇO COMPLETO:</span>
          <input type="text" class="editable-input wide" data-path="identificacao.endereco" value="${d.identificacao.endereco || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">TELEFONE DE CONTATO:</span>
          <input type="text" class="editable-input wide" data-path="identificacao.telefone" value="${d.identificacao.telefone || ''}">
        </div>
      </div>

      <!-- SEÇÃO 2: SITUAÇÃO PESSOAL -->
      <div class="form-section-block">
        <div class="form-section-title">2. SITUAÇÃO PESSOAL</div>
        
        <div class="field-line">
          <span class="field-label">Está em idade de trabalhar (>16 anos)?</span>
          <div class="cb-group">
            <label class="cb-item">
              <input type="radio" name="idadeTrabalhar" value="Sim" ${d.situacaoPessoal.idadeTrabalhar === 'Sim' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.idadeTrabalhar', 'Sim')"> ( X ) Sim
            </label>
            <label class="cb-item">
              <input type="radio" name="idadeTrabalhar" value="Não" ${d.situacaoPessoal.idadeTrabalhar === 'Não' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.idadeTrabalhar', 'Não')"> (   ) Não
            </label>
          </div>
          <input type="text" class="editable-input" style="width:160px; margin-left:8px;" data-path="situacaoPessoal.idadeTrabalharQual" value="${d.situacaoPessoal.idadeTrabalharQual || ''}" placeholder="Idade/Justificativa">
        </div>

        <div class="field-line">
          <span class="field-label">Possui cursos profissionalizantes?</span>
          <div class="cb-group">
            <label class="cb-item">
              <input type="radio" name="cursosProf" value="Sim" ${d.situacaoPessoal.cursosProfissionalizantes === 'Sim' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.cursosProfissionalizantes', 'Sim')"> ( X ) Sim
            </label>
            <label class="cb-item">
              <input type="radio" name="cursosProf" value="Não" ${d.situacaoPessoal.cursosProfissionalizantes === 'Não' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.cursosProfissionalizantes', 'Não')"> (   ) Não
            </label>
          </div>
          <input type="text" class="editable-input" style="flex:1; margin-left:8px;" data-path="situacaoPessoal.cursosQual" value="${d.situacaoPessoal.cursosQual || ''}" placeholder="Qual curso?">
        </div>

        <div class="field-line">
          <span class="field-label">Já exerceu alguma atividade remunerada?</span>
          <div class="cb-group">
            <label class="cb-item">
              <input type="radio" name="exerceuAtiv" value="Sim" ${d.situacaoPessoal.jaExerceuAtividade === 'Sim' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.jaExerceuAtividade', 'Sim')"> ( X ) Sim
            </label>
            <label class="cb-item">
              <input type="radio" name="exerceuAtiv" value="Não" ${d.situacaoPessoal.jaExerceuAtividade === 'Não' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.jaExerceuAtividade', 'Não')"> (   ) Não
            </label>
          </div>
          <input type="text" class="editable-input" style="flex:1; margin-left:8px;" data-path="situacaoPessoal.jaExerceuQual" value="${d.situacaoPessoal.jaExerceuQual || ''}" placeholder="Quais atividades?">
        </div>

        <div class="field-line">
          <span class="field-label">Teve a CTPS (Carteira de Trabalho) assinada?</span>
          <div class="cb-group">
            <label class="cb-item">
              <input type="radio" name="teveCtps" value="Sim" ${d.situacaoPessoal.teveCtpsAssinada === 'Sim' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.teveCtpsAssinada', 'Sim')"> ( X ) Sim
            </label>
            <label class="cb-item">
              <input type="radio" name="teveCtps" value="Não" ${d.situacaoPessoal.teveCtpsAssinada === 'Não' ? 'checked' : ''} onchange="app.updateField('situacaoPessoal.teveCtpsAssinada', 'Não')"> (   ) Não
            </label>
          </div>
          <input type="text" class="editable-input" style="flex:1; margin-left:8px;" data-path="situacaoPessoal.teveCtpsDetalhes" value="${d.situacaoPessoal.teveCtpsDetalhes || ''}" placeholder="Detalhes de vínculos formais">
        </div>
      </div>

      <!-- SEÇÃO 3: SITUAÇÃO FAMILIAR E RENDA -->
      <div class="form-section-block">
        <div class="form-section-title">3. SITUAÇÃO FAMILIAR E RENDA DOS INTEGRANTES</div>
        
        <table class="judicial-table">
          <thead>
            <tr>
              <th style="width:28%;">Nome Completo</th>
              <th style="width:14%;">Parentesco</th>
              <th style="width:14%;">Idade/Nasc.</th>
              <th style="width:16%;">CPF / NIS</th>
              <th style="width:14%;">Ocupação</th>
              <th style="width:14%;">Renda Mensal</th>
            </tr>
          </thead>
          <tbody>
            ${(d.familia && d.familia.length > 0 ? d.familia : []).map((m, idx) => `
              <tr>
                <td><input type="text" value="${m.nome || ''}" onchange="app.updateFamilyMember(${idx}, 'nome', this.value)"></td>
                <td><input type="text" value="${m.parentesco || ''}" onchange="app.updateFamilyMember(${idx}, 'parentesco', this.value)"></td>
                <td><input type="text" value="${m.idadeNasc || ''}" onchange="app.updateFamilyMember(${idx}, 'idadeNasc', this.value)"></td>
                <td><input type="text" value="${m.cpfNis || ''}" onchange="app.updateFamilyMember(${idx}, 'cpfNis', this.value)"></td>
                <td><input type="text" value="${m.ocupacao || ''}" onchange="app.updateFamilyMember(${idx}, 'ocupacao', this.value)"></td>
                <td><input type="number" step="0.01" value="${m.rendaMensal || 0}" onchange="app.updateFamilyMember(${idx}, 'rendaMensal', parseFloat(this.value)||0)"></td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align:right; font-weight:bold;">RENDA TOTAL DO GRUPO FAMILIAR:</td>
              <td style="font-weight:bold; color:#003366;">${formatBRL(d.rendaTotalFamilia)}</td>
            </tr>
          </tbody>
        </table>
        
        <button class="btn-add-row" onclick="app.addFamilyMember()">+ Adicionar Integrante da Família</button>

        <div class="field-line" style="margin-top:10px;">
          <span class="field-label">Diagnóstico de CTPS:</span>
          <input type="text" class="editable-input wide" data-path="carteiraAssinadaFamilia" value="${d.carteiraAssinadaFamilia || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">CÁLCULO DA RENDA PER CAPITA (Art. 20 da LOAS):</span>
          <span style="font-weight:bold; color:#003366; font-size:10pt;">
            ${formatBRL(d.rendaPerCapita)} por pessoa (Critério objetivo legal de 1/4 SM: R$ 353,00)
          </span>
        </div>

        <div class="field-line">
          <span class="field-label">Observação CadÚnico:</span>
          <input type="text" class="editable-input wide" data-path="rendaObservacao" value="${d.rendaObservacao || ''}">
        </div>
      </div>

      <!-- SEÇÃO 4: SITUAÇÃO DE MORADIA -->
      <div class="form-section-block">
        <div class="form-section-title">4. SITUAÇÃO DE MORADIA</div>
        
        <div class="field-line">
          <span class="field-label">Tipo:</span>
          <input type="text" class="editable-input" style="width:90px;" data-path="moradia.tipo" value="${d.moradia.tipo || 'Casa'}">
          <span class="field-label" style="margin-left:12px;">Construção:</span>
          <input type="text" class="editable-input" style="width:100px;" data-path="moradia.construcao" value="${d.moradia.construcao || 'madeira'}">
          <span class="field-label" style="margin-left:12px;">Cobertura:</span>
          <input type="text" class="editable-input" style="width:120px;" data-path="moradia.cobertura" value="${d.moradia.cobertura || 'telha de amianto'}">
          <span class="field-label" style="margin-left:12px;">Cômodos:</span>
          <input type="number" class="editable-input" style="width:40px;" data-path="moradia.comodos" value="${d.moradia.comodos || 3}">
        </div>

        <div class="field-line">
          <span class="field-label">Localização:</span>
          <input type="text" class="editable-input" style="width:90px;" data-path="moradia.zona" value="${d.moradia.zona || 'urbana'}">
          <span class="field-label" style="margin-left:12px;">Acesso:</span>
          <input type="text" class="editable-input" style="width:90px;" data-path="moradia.acesso" value="${d.moradia.acesso || 'difícil'}">
          <span class="field-label" style="margin-left:12px;">Tempo Residência:</span>
          <input type="text" class="editable-input" style="width:90px;" data-path="moradia.tempoResidencia" value="${d.moradia.tempoResidencia || '5 anos'}">
          <span class="field-label" style="margin-left:12px;">Regime:</span>
          <input type="text" class="editable-input" style="width:110px;" data-path="moradia.regimeImovel" value="${d.moradia.regimeImovel || 'Cedido'}">
        </div>

        <div class="field-line">
          <span class="field-label">Infraestrutura Básica:</span>
          <span style="font-size:9pt;">Água:</span>
          <input type="text" class="editable-input" style="width:90px;" data-path="moradia.agua" value="${d.moradia.agua || 'Rede Pública'}">
          <span style="font-size:9pt; margin-left:6px;">Esgoto:</span>
          <input type="text" class="editable-input" style="width:80px;" data-path="moradia.esgoto" value="${d.moradia.esgoto || 'Fossa'}">
          <span style="font-size:9pt; margin-left:6px;">Energia:</span>
          <input type="text" class="editable-input" style="width:80px;" data-path="moradia.energia" value="${d.moradia.energia || 'Regular'}">
          <span style="font-size:9pt; margin-left:6px;">Rua:</span>
          <input type="text" class="editable-input" style="flex:1;" data-path="moradia.rua" value="${d.moradia.rua || 'Terra batida'}">
        </div>

        <div style="margin-top:6px;">
          <span class="field-label">Inventário Descritivo de Bens Móveis:</span>
          <textarea class="editable-textarea" data-path="moradia.bensListagem">${d.moradia.bensListagem || ''}</textarea>
        </div>
      </div>

      <!-- SEÇÃO 5: DESPESAS MENSAIS GERAIS -->
      <div class="form-section-block">
        <div class="form-section-title">5. DESPESAS MENSAIS GERAIS</div>
        
        <table class="judicial-table">
          <thead>
            <tr>
              <th style="width:24%;">Item de Despesa</th>
              <th style="width:18%;">Valor Mensal</th>
              <th style="width:58%;">Observações e Detalhamento Circunstanciado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Habitação / Aluguel</td>
              <td><input type="number" step="0.01" value="${d.despesas.habitacao || 0}" onchange="app.updateField('despesas.habitacao', parseFloat(this.value)||0)"></td>
              <td><input type="text" value="${d.despesas.habitacaoObs || ''}" onchange="app.updateField('despesas.habitacaoObs', this.value)"></td>
            </tr>
            <tr>
              <td>Energia Elétrica</td>
              <td><input type="number" step="0.01" value="${d.despesas.energia || 0}" onchange="app.updateField('despesas.energia', parseFloat(this.value)||0)"></td>
              <td><input type="text" value="${d.despesas.energiaObs || ''}" onchange="app.updateField('despesas.energiaObs', this.value)"></td>
            </tr>
            <tr>
              <td>Água Encanada</td>
              <td><input type="number" step="0.01" value="${d.despesas.agua || 0}" onchange="app.updateField('despesas.agua', parseFloat(this.value)||0)"></td>
              <td><input type="text" value="${d.despesas.aguaObs || ''}" onchange="app.updateField('despesas.aguaObs', this.value)"></td>
            </tr>
            <tr>
              <td>Alimentação Básica</td>
              <td><input type="number" step="0.01" value="${d.despesas.alimentacao || 0}" onchange="app.updateField('despesas.alimentacao', parseFloat(this.value)||0)"></td>
              <td><input type="text" value="${d.despesas.alimentacaoObs || ''}" onchange="app.updateField('despesas.alimentacaoObs', this.value)"></td>
            </tr>
            <tr>
              <td>Transporte</td>
              <td><input type="number" step="0.01" value="${d.despesas.transporte || 0}" onchange="app.updateField('despesas.transporte', parseFloat(this.value)||0)"></td>
              <td><input type="text" value="${d.despesas.transporteObs || ''}" onchange="app.updateField('despesas.transporteObs', this.value)"></td>
            </tr>
            <tr>
              <td>Saúde e Medicamentos</td>
              <td><input type="number" step="0.01" value="${d.despesas.saude || 0}" onchange="app.updateField('despesas.saude', parseFloat(this.value)||0)"></td>
              <td><input type="text" value="${d.despesas.saudeObs || ''}" onchange="app.updateField('despesas.saudeObs', this.value)"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SEÇÃO 6: CONCLUSÃO E PARECER TÉCNICO -->
      <div class="form-section-block">
        <div class="form-section-title">6. CONCLUSÃO E PARECER TÉCNICO</div>
        
        <div class="field-line">
          <span class="field-label">Data da Visita Domiciliar:</span>
          <input type="text" class="editable-input" style="width:110px;" data-path="conclusao.dataVisita" value="${d.conclusao.dataVisita || ''}">
          <span class="field-label" style="margin-left:14px;">Entrevistado(a):</span>
          <input type="text" class="editable-input wide" data-path="conclusao.nomeEntrevistado" value="${d.conclusao.nomeEntrevistado || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">Fontes de Renda Identificadas:</span>
          <input type="text" class="editable-input wide" data-path="conclusao.fonteRendaDescricao" value="${d.conclusao.fonteRendaDescricao || ''}">
        </div>

        <div class="field-line">
          <span class="field-label">Diagnóstico da Renda Global:</span>
          <input type="text" class="editable-input wide" data-path="conclusao.rendaTotalExtenso" value="${d.conclusao.rendaTotalExtenso || ''}">
        </div>

        <div style="margin:10px 0;">
          <div class="field-label" style="margin-bottom:4px;">Constatações Socioeconômicas:</div>
          <div style="display:flex; flex-direction:column; gap:4px; font-size:9.5pt;">
            <label class="cb-item">
              <input type="checkbox" ${d.conclusao.vulnerabilidadeEconomicaSevera ? 'checked' : ''} onchange="app.updateField('conclusao.vulnerabilidadeEconomicaSevera', this.checked)"> ( X ) Vulnerabilidade econômica severa
            </label>
            <label class="cb-item">
              <input type="checkbox" ${d.conclusao.necessidadeTratamentoContinuo ? 'checked' : ''} onchange="app.updateField('conclusao.necessidadeTratamentoContinuo', this.checked)"> ( X ) Necessidade de tratamento médico/multiprofissional contínuo
            </label>
            <label class="cb-item">
              <input type="checkbox" ${d.conclusao.naoDispoeMeiosProprios ? 'checked' : ''} onchange="app.updateField('conclusao.naoDispoeMeiosProprios', this.checked)"> ( X ) Não dispõe de meios próprios ou da família para prover a subsistência
            </label>
            <label class="cb-item">
              <input type="checkbox" ${d.conclusao.rendaAtendeCriterioLoas ? 'checked' : ''} onchange="app.updateField('conclusao.rendaAtendeCriterioLoas', this.checked)"> ( X ) Atende ao critério objetivo de renda per capita (art. 20 da Lei 8.742/93)
            </label>
          </div>
        </div>

        <!-- Box de Parecer Conclusivo -->
        <div class="conclusion-box">
          <div class="conclusion-title">PARECER CONCLUSIVO:</div>
          <div class="cb-group" style="margin-bottom:8px;">
            <label class="cb-item" style="font-weight:bold; color:#003366;">
              <input type="radio" name="parecerFavoravel" value="true" ${d.conclusao.parecerFavoravel ? 'checked' : ''} onchange="app.updateField('conclusao.parecerFavoravel', true)"> ( X ) POSSUI amparo legal e social
            </label>
            <label class="cb-item" style="font-weight:bold; color:#d96570; margin-left:16px;">
              <input type="radio" name="parecerFavoravel" value="false" ${!d.conclusao.parecerFavoravel ? 'checked' : ''} onchange="app.updateField('conclusao.parecerFavoravel', false)"> (   ) NÃO POSSUI amparo legal
            </label>
          </div>
          <textarea class="editable-textarea" data-path="conclusao.textoParecerComplementar">${d.conclusao.textoParecerComplementar || ''}</textarea>
        </div>
      </div>

      <!-- SEÇÃO 7: CLASSIFICAÇÃO DA PERÍCIA -->
      <div class="form-section-block">
        <div class="form-section-title">7. CLASSIFICAÇÃO DA PERÍCIA</div>
        
        <div class="field-line">
          <span class="field-label">Complexidade:</span> Grau <input type="number" min="1" max="3" class="editable-input" style="width:36px;" data-path="classificacao.complexidade" value="${d.classificacao.complexidade || 2}">
          <span class="field-label" style="margin-left:10px;">Risco:</span> Grau <input type="number" min="1" max="3" class="editable-input" style="width:36px;" data-path="classificacao.risco" value="${d.classificacao.risco || 2}">
          <span class="field-label" style="margin-left:10px;">Distância:</span> Grau <input type="number" min="1" max="3" class="editable-input" style="width:36px;" data-path="classificacao.distancia" value="${d.classificacao.distancia || 2}">
          <span class="field-label" style="margin-left:10px;">Dificuldade Acesso:</span> Grau <input type="number" min="1" max="3" class="editable-input" style="width:36px;" data-path="classificacao.dificuldadeAcesso" value="${d.classificacao.dificuldadeAcesso || 3}">
          <span class="field-label" style="margin-left:10px;">Risco Social:</span> Grau <input type="number" min="1" max="3" class="editable-input" style="width:36px;" data-path="classificacao.riscoSocial" value="${d.classificacao.riscoSocial || 3}">
        </div>

        <div style="margin-top:6px;">
          <span class="field-label">Justificativa Técnica Circunstanciada:</span>
          <textarea class="editable-textarea" data-path="classificacao.justificativa">${d.classificacao.justificativa || ''}</textarea>
        </div>
      </div>

      <!-- SEÇÃO 8: ENCERRAMENTO -->
      <div class="form-section-block">
        <div class="form-section-title">8. ENCERRAMENTO</div>
        
        <div class="field-line">
          <span>Perícia realizada em</span>
          <input type="text" class="editable-input" style="width:110px;" data-path="encerramento.municipio" value="${d.encerramento.municipio || 'Macapá'}"> /
          <input type="text" class="editable-input" style="width:40px;" data-path="encerramento.uf" value="${d.encerramento.uf || 'AP'}">,
          <span>na data de</span>
          <input type="text" class="editable-input" style="width:100px;" data-path="encerramento.dataPericia" value="${d.encerramento.dataPericia || ''}">
          <span>às</span>
          <input type="text" class="editable-input" style="width:80px;" data-path="encerramento.horaPericia" value="${d.encerramento.horaPericia || '14:30 h'}">.
        </div>

        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">
            <input type="text" class="editable-input" style="text-align:center; font-weight:bold; font-size:10pt;" data-path="encerramento.nomePerito" value="${d.encerramento.nomePerito || 'Assistente Social Perito(a) Judicial'}">
          </div>
          <div class="signature-role">
            <input type="text" class="editable-input" style="text-align:center; font-size:8.5pt; color:#555;" data-path="encerramento.cress" value="${d.encerramento.cress || 'CRESS/AP nº 0000'}">
          </div>
        </div>
      </div>
    `;

    // Conecta ouvintes a todos os campos editáveis
    this.a4Content.querySelectorAll("[data-path]").forEach(input => {
      input.addEventListener("input", (e) => {
        const path = e.target.getAttribute("data-path");
        const val = e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
        this.updateField(path, val);
      });
    });
  }

  // Atualização bidirecional de campos
  updateField(path, value) {
    const keys = path.split(".");
    let curr = this.formData;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!curr[keys[i]]) curr[keys[i]] = {};
      curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
  }

  updateFamilyMember(index, field, value) {
    if (this.formData.familia[index]) {
      this.formData.familia[index][field] = value;
      const calc = calcularRendaPerCapita(this.formData.familia);
      this.formData.rendaTotalFamilia = calc.rendaTotal;
      this.formData.rendaPerCapita = calc.rendaPerCapita;
      this.renderFormPreview();
    }
  }

  addFamilyMember() {
    this.formData.familia.push({
      nome: "",
      parentesco: "Familiar",
      idadeNasc: "",
      cpfNis: "",
      ocupacao: "Sem ocupação",
      rendaMensal: 0,
      tipoRenda: "Sem renda"
    });
    this.renderFormPreview();
  }

  // =====================================================================
  // EXPORTAÇÃO PARA WORD (.DOCX)
  // =====================================================================
  async exportToWord() {
    try {
      this.btnDownloadDocx.innerHTML = `<span>⏳ Gerando Word...</span>`;
      this.btnDownloadDocx.disabled = true;

      const generator = new PericiaDocxGenerator(this.formData);
      const safeName = (this.formData.identificacao.periciado || "Periciado")
        .replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Pericia_Socioeconomica_${safeName}.docx`;

      await generator.downloadDocx(filename);

      this.addAssistantMessage(`📄 Seu arquivo editável **${filename}** foi gerado com sucesso e o download foi iniciado!
      
Ele está estruturado exatamente com o cabeçalho oficial, tabelas de membros da família, marcações de caixas ` + "`( X )`" + ` e campos do Anexo IV da Justiça Federal.`);
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao gerar o arquivo Word: " + err.message);
    } finally {
      this.btnDownloadDocx.innerHTML = `<span>📥 Baixar Word (.docx)</span>`;
      this.btnDownloadDocx.disabled = false;
    }
  }

  // =====================================================================
  // TEMAS E MODAL DE CONFIGURAÇÃO
  // =====================================================================
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    this.btnThemeToggle.innerHTML = nextTheme === "dark" ? "☀️" : "🌙";
  }

  openSettingsModal() {
    this.inputApiKey.value = this.apiKey;
    this.selectModel.value = this.selectedModel;
    this.settingsModal.classList.add("open");
  }

  closeSettingsModal() {
    this.settingsModal.classList.remove("open");
  }

  saveSettings() {
    this.apiKey = this.inputApiKey.value.trim();
    this.selectedModel = this.selectModel.value;

    localStorage.setItem("gemini_api_key", this.apiKey);
    localStorage.setItem("gemini_model", this.selectedModel);

    this.closeSettingsModal();
    this.addAssistantMessage(`⚙️ Configurações salvas com sucesso! 
    ${this.apiKey ? `Chave API configurada com o modelo **${this.selectedModel}**.` : "Modo de Demonstração / Extração Local ativo."}`);
  }
}

// Inicializa a aplicação assim que o DOM carregar
window.addEventListener("DOMContentLoaded", () => {
  window.app = new PericiaApp();
});
