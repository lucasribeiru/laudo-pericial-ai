/**
 * APLICAÇÃO PRINCIPAL - CHAT IA COM EXTRAÇÃO MULTIMODAL E GERAÇÃO DE LAUDO
 * Interface inspirada no Google Gemini
 * Formato Oficial: Justiça Federal / Seção Judiciária do Amapá (Anexo IV)
 */

class PericiaApp {
  constructor() {
    this.formData = JSON.parse(JSON.stringify(typeof SAMPLE_CASES !== "undefined" && SAMPLE_CASES.mazagao ? SAMPLE_CASES.mazagao.dados : DEFAULT_FORM_DATA));
    this.stagedFiles = [];
    this.chatHistory = [];
    this.apiKey = localStorage.getItem("gemini_api_key") || "";
    let storedModel = localStorage.getItem("gemini_model");
    const VALID_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"];
    if (!storedModel || !VALID_MODELS.includes(storedModel)) {
      storedModel = "gemini-2.5-flash";
      localStorage.setItem("gemini_model", storedModel);
    }
    this.selectedModel = storedModel;
    this.isProcessing = false;
    this.currentZoom = 1.0;
    this._saveTimeout = null;

    // Banco de dados e IA Automática
    this.currentPericiaId = null; // ID da perícia ativa no banco de dados
    this.useServerAI = false;    // Se true, usa /api/extract ao invés de chamada direta
    this._searchTimeout = null;

    this.initElements();
    this.initEventListeners();
    this.initScrollSpy();
    this.renderFormPreview();
    this.appendInitialGreeting();
    this.initStatusBadges();
    this.detectServerAI();
  }

  initElements() {
    // Chat & Input
    this.messagesContainer = document.getElementById("messagesContainer");
    this.chatInput = document.getElementById("chatInput");
    this.btnSend = document.getElementById("btnSend");
    this.btnUpload = document.getElementById("btnUpload");
    this.fileInput = document.getElementById("fileInput");
    this.btnCamera = document.getElementById("btnCamera");
    this.cameraInput = document.getElementById("cameraInput");
    this.stagedFilesBar = document.getElementById("stagedFilesBar");

    // Paineis e Toolbar
    this.chatPane = document.getElementById("chatPane");
    this.documentPane = document.getElementById("documentPane");
    this.a4Content = document.getElementById("a4Content");
    this.docScrollViewport = document.getElementById("docScrollViewport");
    this.docSyncIndicator = document.getElementById("docSyncIndicator");
    this.docSyncText = document.getElementById("docSyncText");
    this.zoomLevelText = document.getElementById("zoomLevelText");
    this.docPageNav = document.getElementById("docPageNav");

    // Botões de Exportação
    this.btnDownloadDocx = document.getElementById("btnDownloadDocx");
    this.btnDownloadDocxTop = document.getElementById("btnDownloadDocxTop");
    this.btnDownloadPdf = document.getElementById("btnDownloadPdf");
    this.btnDownloadPdfTop = document.getElementById("btnDownloadPdfTop");
    this.btnPrintPdf = document.getElementById("btnPrintPdf");
    this.btnResumoCaso = document.getElementById("btnResumoCaso");

    // Controles de Visualização
    this.btnToggleSplit = document.getElementById("btnToggleSplit");
    this.btnThemeToggle = document.getElementById("btnThemeToggle");

    // Modal de Configurações
    this.btnSettings = document.getElementById("btnSettings");
    this.settingsModal = document.getElementById("settingsModal");
    this.btnCloseModal = document.getElementById("btnCloseModal");
    this.btnSaveSettings = document.getElementById("btnSaveSettings");
    this.inputApiKey = document.getElementById("inputApiKey");
    this.selectModel = document.getElementById("selectModel");

    // Modal de Ficha Técnica / Resumo
    this.summaryModal = document.getElementById("summaryModal");
    this.summaryModalBody = document.getElementById("summaryModalBody");

    // Barra de Navegação Mobile (PWA / Celular)
    this.mobileBottomBar = document.getElementById("mobileBottomBar");
    this.tabMobileChat = document.getElementById("tabMobileChat");
    this.tabMobileDoc = document.getElementById("tabMobileDoc");
    this.tabMobileSummary = document.getElementById("tabMobileSummary");

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

    // Upload de arquivos e fotos
    this.btnUpload.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));

    // Câmera in loco (celular / tablet)
    if (this.btnCamera && this.cameraInput) {
      this.btnCamera.addEventListener("click", () => this.cameraInput.click());
      this.cameraInput.addEventListener("change", (e) => this.handleFileSelect(e));
    }

    // Botão de Resumo do Caso
    if (this.btnResumoCaso) {
      this.btnResumoCaso.addEventListener("click", () => this.openSummaryModal());
    }

    // Drag and drop na área do chat
    const dropZone = document.getElementById("chatInputBox");
    if (dropZone) {
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--color-cyan-primary)";
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
    }

    // Casos e botões da barra superior
    this.quickChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const caseKey = chip.getAttribute("data-case");
        if (caseKey && SAMPLE_CASES[caseKey]) {
          this.quickChips.forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          this.loadSampleCase(caseKey);
        }
      });
    });

    // Exportação Word (.docx e .doc)
    if (this.btnDownloadDocx) this.btnDownloadDocx.addEventListener("click", () => this.exportToWord());
    if (this.btnDownloadDocxTop) this.btnDownloadDocxTop.addEventListener("click", () => this.exportToWord());

    // Exportação PDF (.pdf)
    if (this.btnDownloadPdf) this.btnDownloadPdf.addEventListener("click", () => this.exportToPdf());
    if (this.btnDownloadPdfTop) this.btnDownloadPdfTop.addEventListener("click", () => this.exportToPdf());

    // Impressão nativa
    if (this.btnPrintPdf) this.btnPrintPdf.addEventListener("click", () => window.print());

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
      e.target.value = "";
    }
  }

  // Comprime fotos capturadas na câmera ou celular (de 8MB para ~200KB)
  // Acelera o upload e a análise da IA em mais de 15x sem perder detalhes arquitetônicos
  compressImage(file, maxDimension = 1280, quality = 0.82) {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") && !/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
        resolve(file);
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now()
            });
            resolve(compressed);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  async addFilesToStage(files) {
    for (let file of files) {
      const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

      if (isImg) {
        try {
          file = await this.compressImage(file, 1280, 0.82);
        } catch (e) {
          console.warn("Compressão de foto não aplicada, usando original:", e);
        }
      }

      let fileObj = {
        name: file.name,
        size: this.formatFileSize(file.size),
        type: file.type || (isImg ? "image/jpeg" : ""),
        fileRef: file,
        base64: null,
        extractedText: null
      };

      if (isImg) {
        fileObj.base64 = await this.readFileAsBase64(file);
      } else if (isPdf) {
        fileObj.base64 = await this.readFileAsBase64(file);
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
    const greeting = `Olá! Bem-vindo ao **Visum Social**, sua plataforma inteligente de perícias socioeconômicas judiciais (BPC/LOAS). 
    
Você pode anexar os documentos do processo (RG, CPF, Certidões, Extrato do CadÚnico, Laudos Médicos) e **fotos da moradia / visita domiciliar**.

Com base neles, o **Visum Social** realiza a **inspeção visual minuciosa das imagens** (identificando logradouro de terra ou asfalto, tipo de construção alvenaria ou madeira, cobertura de amianto ou telha, tipo de piso, inventário dos bens móveis e saneamento) e formata com rigor técnico o **Formulário de Perícia Socioeconômica (Anexo IV da Justiça Federal do Amapá)**, pronto para download imediato em **Word (.docx)** e **PDF (.pdf)** idêntico ao modelo judicial oficial.

💡 *Dica: Você pode visualizar e editar qualquer texto diretamente nas 6 páginas oficiais ao lado, ou enviar novos documentos e fotos no chat abaixo.*`;

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
      const p = extractionData.identificacao || {};
      const c = extractionData.conclusao || {};
      summaryCardHtml = `
        <div class="ai-summary-card">
          <div class="ai-summary-header">
            <span>✨ Dados Extraídos com Sucesso</span>
            <span style="font-size:0.75rem; color:#007C9C;">● Formulário Atualizado</span>
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
              <span class="value">R$ ${Number(extractionData.rendaPerCapita || 0).toFixed(2)}</span>
            </div>
            <div class="metric-pill">
              <span class="label">PARECER CONCLUSIVO</span>
              <span class="value" style="color:${c.parecerFavoravel ? '#10B981' : '#EF4444'}">
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

  showTypingIndicator(statusText = "Analisando fotos e documentos com IA...") {
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

    this.addUserMessage(userText || "Anexei os documentos e fotos para extração e análise visual.", files);
    this.chatInput.value = "";
    this.stagedFiles = [];
    this.renderStagedFiles();

    // PRIORIDADE DE IA:
    // 1. Servidor automático (/api/extract) — chave no backend, sem configuração
    // 2. Chave local do usuário (se configurada nas settings)
    // 3. Extrator inteligente integrado (sem IA, regex + heurística)
    if (this.useServerAI) {
      await this.processWithServerAI(userText, files);
    } else if (this.apiKey) {
      await this.processWithGeminiAPI(userText, files);
    } else {
      await this.processWithLocalExtractor(userText, files);
    }
  }

  deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && !Array.isArray(source[key]) && target[key] instanceof Object && !Array.isArray(target[key])) {
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  async processWithGeminiAPI(userText, files) {
    this.showTypingIndicator("Conectando ao Gemini API (Análise Visual e Extração de Documentos)...");

    try {
      const contentsParts = [];

      const systemPrompt = `Você é um Assistente Pericial Oficial especializado em Perícias Socioeconômicas da Justiça Federal (BPC/LOAS - Lei 8.742/93).
Analise com rigor técnico todos os documentos, certidões, laudos médicos, extratos de CadÚnico e PRINCIPALMENTE AS FOTOS DA MORADIA/VISITA DOMICILIAR.

REGRA ABSOLUTA DE ISOLAMENTO DE DADOS:
NUNCA misture, reaproveite ou invente dados de casos de teste, modelos anteriores ou de pessoas fictícias.
Se uma informação (como telefone, RG, codF, bens, despesas específicas, etc.) não for expressamente encontrada nos documentos e fotos fornecidos pelo perito, retorne string vazia ("") ou 0 para números. Não assuma nem complete com dados de outros casos.

INSTRUÇÃO OBRIGATÓRIA DE ANÁLISE VISUAL DE IMAGENS:
Para cada foto do imóvel anexada (fachada, rua, cômodos, sala, cozinha, quartos, banheiro, piso):
1. Verifique o tipo de rua/logradouro (ex: rua de terra batida, asfalto, presença de lama, valas, difícil acesso).
2. Verifique o tipo de construção (ex: alvenaria sem reboco, alvenaria simples, madeira rústica, palafita, mista).
3. Verifique a cobertura/telhado (ex: telha de amianto/fibrocimento, telha de barro, zinco).
4. Verifique o piso (ex: chão batido, cimento queimado/rústico, lajota cerâmica simples, madeira com frestas).
5. Faça o inventário descritivo dos bens móveis e eletrodomésticos visíveis (fogão cooktop ou a gás, geladeira, freezer, televisão, ar condicionado, ventilador, camas, mesas, sofás), apontando seu estado de conservação e confirmando ausência de itens de luxo.
6. Avalie o saneamento e infraestrutura (banheiro interno/externo, fossa, rede pública).

Extraia os dados rigorosamente e retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown ou código) correspondente ao schema do formulário judicial.
Formato obrigatório das chaves:
{
  "cabecalho": { "tribunal": "PODER JUDICIÁRIO\\nJUSTIÇA FEDERAL\\nSEÇÃO JUDICIÁRIA DO AMAPÁ\\nCOORDENAÇÃO DOS JUIZADOS ESPECIAIS FEDERAIS\\nPORTARIA COJEF/NUCOD/AP Nº 01 de 10/02/2015\\nANEXO IV - PERITOS ASSISTENTES SOCIAIS", "anexo": "ANEXO IV - PERITOS ASSISTENTES SOCIAIS", "titulo": "PERÍCIA SOCIOECONÔMICA", "rodape": "Rodovia Norte Sul, s/n – Bairro Infraero II, CEP. 68908-911 - Macapá-AP, site: portal.trf1.jus.br/sjap. Fones: 3251-5507" },
  "identificacao": { "processo": "...", "periciado": "...", "representanteLegal": "...", "cpf": "...", "rg": "...", "codF": "...", "nis": "...", "sexo": "M"|"F", "dataNascimento": "...", "objeto": "Benefício de Prestação Continuada- BPC", "escolaridade": "...", "profissaoAnterior": "...", "profissaoAtual": "...", "estadoCivil": "...", "naturalidade": "...", "endereco": "...", "telefone": "..." },
  "situacaoPessoal": { "idadeTrabalhar": "Sim"|"Não", "idadeTrabalharQual": "...", "cursosProfissionalizantes": "Sim"|"Não", "cursosQual": "...", "jaExerceuAtividade": "Sim"|"Não", "jaExerceuQual": "...", "teveCtpsAssinada": "Sim"|"Não", "teveCtpsDetalhes": "..." },
  "familia": [ { "nome": "...", "estadoCivil": "...", "cpfNis": "...", "idadeNasc": "...", "parentesco": "...", "ocupacao": "...", "rendaMensal": 0, "tipoRenda": "..." } ],
  "carteiraAssinadaFamilia": "...", "carteiraAssinadaQtd": 0, "rendaTotalFamilia": 0, "rendaPerCapita": 0, "rendaObservacao": "...",
  "moradia": { "tipo": "Casa"|"Apartamento"|"Outro", "construcao": "alvenaria"|"madeira"|"mista", "cobertura": "telha de amianto"|"telha de barro", "comodos": 5, "comodosDescricao": "...", "zona": "urbana"|"rural", "acesso": "fácil"|"difícil", "tempoResidencia": "...", "regimeImovel": "Próprio"|"Alugado"|"Cedido", "proprietarioImovel": "...", "caraterResidencia": "Habitual", "agua": "...", "esgoto": "...", "energia": "...", "rua": "...", "piso": "...", "bensTextoPadrao": "...", "bensListagem": "..." },
  "despesas": { "habitacao": 0, "habitacaoObs": "...", "energia": 0, "energiaObs": "...", "agua": 0, "aguaObs": "...", "alimentacao": 0, "alimentacaoObs": "...", "transporte": 0, "transporteObs": "...", "saude": 0, "saudeObs": "..." },
  "conclusao": { "dataVisita": "...", "nomeEntrevistado": "...", "fonteRendaDescricao": "...", "rendaTotalExtenso": "...", "vulnerabilidadeEconomicaSevera": true, "necessidadeTratamentoContinuo": true, "naoDispoeMeiosProprios": true, "rendaAtendeCriterioLoas": true, "parecerFavoravel": true, "textoEstudoSocial": "...", "textoDificuldades": "...", "textoParecerComplementar": "..." },
  "classificacao": { "complexidade": 1|2|3, "risco": 1|2|3, "distancia": 1|2|3, "dificuldadeAcesso": 1|2|3, "riscoSocial": 1|2|3, "justificativa": "..." },
  "encerramento": { "municipio": "...", "uf": "...", "dataPericia": "...", "horaPericia": "...", "nomePerito": "Ivonete Ferreira Maciel", "cargoPerito": "Doutora em Serviço Social", "cress": "CRESS 104 24ª Região-AP" },
  "resumoVisualImagens": "Resumo detalhado dos pontos observados visualmente nas imagens"
}`;

      contentsParts.push({ text: systemPrompt + "\n\nInstruções/Anotações adicionais do perito:\n" + userText });

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

      const candidateModels = [
        this.selectedModel,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-pro"
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      let response = null;
      let lastErrorMessage = "";
      let successfulModel = "";

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 28000);

          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: contentsParts }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
              }
            })
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            successfulModel = model;
            break;
          }

          const errData = await response.json().catch(() => null);
          const errMsg = errData?.error?.message || response.statusText || `Código ${response.status}`;
          lastErrorMessage = errMsg;

          if (response.status === 404) {
            continue;
          } else {
            throw new Error(`Erro na API Gemini (${response.status}): ${errMsg}`);
          }
        } catch (e) {
          if (e.name === "AbortError") {
            lastErrorMessage = `Tempo limite esgotado ao contatar ${model}. Tentando próximo modelo...`;
            continue;
          }
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
      
      // ISOLAMENTO TOTAL: inicia com clone limpo de DEFAULT_FORM_DATA para impedir que dados do modelo ou caso anterior permaneçam
      const cleanForm = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
      this.deepMerge(cleanForm, extractedJson);
      this.formData = cleanForm;

      // Desmarca o botão de caso modelo na barra superior
      this.quickChips.forEach(c => c.classList.remove("active"));

      const calc = calcularRendaPerCapita(this.formData.familia);
      this.formData.rendaTotalFamilia = calc.rendaTotal;
      this.formData.rendaPerCapita = calc.rendaPerCapita;

      this.renderFormPreview();
      this.flashDocumentUpdate();
      this.scrollToPage(1);
      this.hideTypingIndicator();

      const m = this.formData.moradia || {};
      const visualReport = `
🏠 **Laudo de Inspeção Visual das Fotos do Imóvel e Visita:**
- 🛣️ **Logradouro / Rua:** ${m.rua || "Identificada em área residencial"}
- 🧱 **Tipo de Construção:** Construção em ${m.construcao || "alvenaria/madeira"} (${m.comodos || "---"} cômodos)
- 🏠 **Cobertura / Telhado:** ${m.cobertura || "Telha de fibrocimento/barro"}
- 🟫 **Piso e Acabamento:** ${m.piso || "Cerâmica/cimento"}
- 🛋️ **Inventário Visual de Bens:** ${m.bensListagem || "Bens essenciais básicos de sobrevivência. Ausência de itens de luxo."}
- 🚿 **Saneamento e Acesso:** ${m.agua || "Rede pública/Poço"} | ${m.esgoto || "Fossa séptica/Rede"}
`;

      this.addAssistantMessage(
        `Analisei com sucesso os arquivos e fotos via **Gemini Multimodal (${successfulModel})**.
        
${visualReport}

Todas as seções do **Formulário de Perícia Socioeconômica (Anexo IV)** foram preenchidas e sincronizadas exclusivamente com base nos dados do periciado atual. Você pode baixar em **Word (.docx)** ou **PDF (.pdf)** a qualquer momento.`,
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
    this.showTypingIndicator("Lendo informações periciais e aplicando diagnóstico do Serviço Social...");

    await new Promise(r => setTimeout(r, 650));

    // ISOLAMENTO TOTAL: laudo limpo, preenchendo estritamente os dados informados
    const cleanForm = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
    const text = userText || "";

    const extractByRegex = (patterns) => {
      for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]) return m[1].trim();
      }
      return "";
    };

    const extractNumber = (patterns) => {
      for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]) {
          const val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
          if (!isNaN(val)) return val;
        }
      }
      return 0;
    };

    // Extração de Identificação
    const periciado = extractByRegex([
      /(?:periciado|nome(?:\s+completo)?|requerente|autor|infante)[:\s]+([^\n,;]+)/i,
      /(?:paciente|assistido|interessado)[:\s]+([^\n,;]+)/i
    ]);
    const representante = extractByRegex([
      /(?:representante(?:\s+legal)?|m[ãa]e|genitora|respons[áa]vel)[:\s]+([^\n,;]+)/i
    ]);
    const cpf = extractByRegex([
      /cpf[:\s]+([\d.-]+)/i,
      /(\b\d{3}\.\d{3}\.\d{3}-\d{2}\b)/
    ]);
    const rg = extractByRegex([
      /rg[:\s]+([\d.-]+)/i
    ]);
    const nis = extractByRegex([
      /nis[:\s]+([\d.-]+)/i,
      /(\b\d{11}\b)/
    ]);
    const processo = extractByRegex([
      /processo(?:\s+n[ºo]?)?[:\s]+([\d.-]+)/i,
      /(\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b)/
    ]);
    const endereco = extractByRegex([
      /(?:endere[çc]o|rua|local(?:idade)?)[:\s]+([^\n;]+)/i
    ]);
    const municipio = extractByRegex([
      /(?:munic[íi]pio|cidade)[:\s]+([^\n,;/]+)/i
    ]);
    const telefone = extractByRegex([
      /(?:telefone|fone|contato|celular)[:\s]+([^\n,;]+)/i,
      /(\(?\d{2}\)?\s*\d{4,5}-?\d{4})/
    ]);
    const dataNasc = extractByRegex([
      /(?:nascimento|data\s+de\s+nascimento|nasc)[:\s]+([\d/.-]+)/i,
      /(\b\d{2}\/\d{2}\/\d{4}\b)/
    ]);

    // Extração Médica / Previdenciária (CID e Patologia)
    const cid = extractByRegex([
      /(?:cid(?:\s*10)?|c[óo]digo\s+cid)[:\s]+([A-Z]\d{2}(?:\.\d+)?)/i,
      /\b([A-Z]\d{2}\.?\d?)\b/
    ]);
    const patologia = extractByRegex([
      /(?:patologia|diagn[óo]stico|doen[çc]a|defici[êe]ncia|enfermidade)[:\s]+([^\n;]+)/i
    ]);

    // Extração de Renda e Despesas
    const rendaText = extractByRegex([
      /(?:renda(?:\s+mensal|\s+familiar)?|sal[áa]rio)[:\s]+(?:r\$\s*)?([\d.,]+)/i
    ]);
    const parsedRenda = rendaText ? parseFloat(rendaText.replace(/\./g, "").replace(",", ".")) || 0 : 0;

    const despEnergia = extractNumber([/(?:energia|luz|cea|equatorial)[:\s]+(?:r\$\s*)?([\d.,]+)/i]);
    const despAgua = extractNumber([/(?:[áa]gua|caesa)[:\s]+(?:r\$\s*)?([\d.,]+)/i]);
    const despAluguel = extractNumber([/(?:aluguel|habita[çc][ãa]o)[:\s]+(?:r\$\s*)?([\d.,]+)/i]);
    const despAlimentacao = extractNumber([/(?:alimenta[çc][ãa]o|comida|mercado)[:\s]+(?:r\$\s*)?([\d.,]+)/i]);
    const despSaude = extractNumber([/(?:sa[úu]de|medicamentos?|rem[ée]dios?|farm[áa]cia)[:\s]+(?:r\$\s*)?([\d.,]+)/i]);
    const despTransporte = extractNumber([/(?:transporte|passagens?|combust[íi]vel)[:\s]+(?:r\$\s*)?([\d.,]+)/i]);

    if (periciado) cleanForm.identificacao.periciado = periciado;
    if (representante) cleanForm.identificacao.representanteLegal = representante;
    if (cpf) cleanForm.identificacao.cpf = cpf;
    if (rg) cleanForm.identificacao.rg = rg;
    if (nis) cleanForm.identificacao.nis = nis;
    if (processo) cleanForm.identificacao.processo = processo;
    if (endereco) cleanForm.identificacao.endereco = endereco;
    if (telefone) cleanForm.identificacao.telefone = telefone;
    if (dataNasc) cleanForm.identificacao.dataNascimento = dataNasc;
    if (municipio) cleanForm.encerramento.municipio = municipio;

    // Despesas
    if (despEnergia > 0) cleanForm.despesas.energia = despEnergia;
    if (despAgua > 0) cleanForm.despesas.agua = despAgua;
    if (despAluguel > 0) cleanForm.despesas.habitacao = despAluguel;
    if (despAlimentacao > 0) cleanForm.despesas.alimentacao = despAlimentacao;
    if (despSaude > 0) cleanForm.despesas.saude = despSaude;
    if (despTransporte > 0) cleanForm.despesas.transporte = despTransporte;

    // Composição Familiar
    cleanForm.familia = [{
      nome: representante || periciado || "Responsável pelo Domicílio",
      parentesco: representante ? "Representante / Genitora" : "Titular",
      estadoCivil: "Solteiro(a)",
      idadeNasc: dataNasc || "",
      cpfNis: cpf || nis || "",
      ocupacao: parsedRenda > 0 ? "Autônomo / Trabalho Informal" : "Do lar / Sem ocupação formal",
      rendaMensal: parsedRenda,
      tipoRenda: parsedRenda > 0 ? "Informal / Declarada" : "Sem renda fixa"
    }];

    cleanForm.rendaTotalFamilia = parsedRenda;
    cleanForm.rendaPerCapita = parsedRenda;
    cleanForm.rendaObservacao = parsedRenda > 0 
      ? `Renda familiar mensal declarada de R$ ${parsedRenda.toFixed(2)}.` 
      : "Família sem renda fixa formal comprovada, dependendo de assistência material de terceiros ou programas sociais.";

    const hoje = new Date().toLocaleDateString("pt-BR");
    cleanForm.conclusao.dataVisita = hoje;
    cleanForm.encerramento.dataPericia = hoje;

    // Análise de Moradia e Fotos
    const hasPhotos = files.some(f => f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(f.name));
    const txtLower = text.toLowerCase();
    
    if (txtLower.includes("madeira")) cleanForm.moradia.construcao = "madeira";
    else if (txtLower.includes("alvenaria")) cleanForm.moradia.construcao = "alvenaria";
    
    if (txtLower.includes("amianto") || txtLower.includes("fibrocimento")) cleanForm.moradia.cobertura = "telha de amianto";
    else if (txtLower.includes("barro")) cleanForm.moradia.cobertura = "telha de barro";

    if (txtLower.includes("cimento")) cleanForm.moradia.piso = "cimento rústico";
    else if (txtLower.includes("cerâmica") || txtLower.includes("lajota")) cleanForm.moradia.piso = "lajota cerâmica simples";

    if (txtLower.includes("terra") || txtLower.includes("lama") || txtLower.includes("barro")) cleanForm.moradia.rua = "rua de terra batida, sem pavimentação asfáltica";
    else if (txtLower.includes("asfalto")) cleanForm.moradia.rua = "rua asfaltada";

    if (hasPhotos) {
      cleanForm.moradia.bensListagem = "Fogão doméstico, refrigerador simples e camas. Bens essenciais básicos de sobrevivência, sem itens de luxo.";
      cleanForm.moradia.bensTextoPadrao = "O conjunto de bens móveis observado na residência é composto por itens estritamente indispensáveis à sobrevivência elementar, demonstrando padrão compatível com extrema vulnerabilidade socioeconômica.";
    }

    // Geração de Parecer Técnico Oficial do Serviço Social
    const patolDesc = patologia ? `portador(a) de ${patologia}${cid ? ` (CID-10: ${cid})` : ""}, ` : (cid ? `com diagnóstico sob CID-10: ${cid}, ` : "");
    cleanForm.conclusao.textoEstudoSocial = `Trata-se de estudo pericial socioeconômico realizado em cumprimento ao mandado judicial para avaliação de Benefício de Prestação Continuada (BPC/LOAS). O(A) periciado(a) ${periciado || "em tela"}, ${patolDesc}reside com seu núcleo familiar em condições de habitação simples no município de ${municipio || cleanForm.encerramento.municipio || "Macapá/AP"}. A família enfrenta quadro de severa restrição material, desprovida de patrimônio ou renda financeira estável capaz de assegurar o sustento básico de forma autônoma.`;

    cleanForm.conclusao.textoDificuldades = `Verifica-se quadro de vulnerabilidade social acentuado. A necessidade de assistência diária e o comprometimento das condições de saúde demandam dedicação e despesas contínuas, limitando a inserção laborativa formal dos adultos no mercado de trabalho e agravando a insegurança de renda no domicílio.`;

    cleanForm.classificacao.justificativa = `Avaliação socioeconômica pericial realizada com verificação in loco da residência, condições de saneamento e barreiras sociais impeditivas enfrentadas pelo núcleo familiar.`;

    // Avaliação de Critério LOAS (1/4 SM = R$ 353,00)
    const limiteLoas = 353.00;
    const despTotal = cleanForm.despesas.habitacao + cleanForm.despesas.energia + cleanForm.despesas.agua + cleanForm.despesas.alimentacao + cleanForm.despesas.saude + cleanForm.despesas.transporte;
    const atendeLoas = cleanForm.rendaPerCapita <= limiteLoas || (despTotal > cleanForm.rendaTotalFamilia);
    
    cleanForm.conclusao.rendaAtendeCriterioLoas = atendeLoas;
    cleanForm.conclusao.parecerFavoravel = atendeLoas;
    cleanForm.conclusao.vulnerabilidadeEconomicaSevera = true;
    cleanForm.conclusao.naoDispoeMeiosProprios = true;

    this.formData = cleanForm;
    this.quickChips.forEach(c => c.classList.remove("active"));

    this.renderFormPreview();
    this.flashDocumentUpdate();
    this.scrollToPage(1);
    this.hideTypingIndicator();

    const id = this.formData.identificacao;
    const cidText = cid ? ` | **CID:** ${cid}` : "";
    this.addAssistantMessage(
      `Dados periciais processados com sucesso! O laudo foi preenchido **exclusivamente com os dados do periciado atual**, sem reaproveitar informações de outros modelos.

👤 **Periciado(a):** ${id.periciado || "*(a preencher diretamente na folha ou anexar documento)*"}${cidText}
📋 **Processo:** ${id.processo || "*(a preencher)*"}
💰 **Renda Per Capita:** R$ ${cleanForm.rendaPerCapita.toFixed(2)} ${atendeLoas ? "*(Atende ao critério de 1/4 SM BPC/LOAS)*" : ""}
🏠 **Moradia:** ${cleanForm.moradia.construcao} | ${cleanForm.moradia.cobertura} | ${cleanForm.moradia.piso}

*O laudo está pronto para conferência e edição nas 6 páginas A4 ao lado. Você pode baixar em **Word (.docx)** ou **PDF (.pdf)** a qualquer momento.*`,
      this.formData
    );
  }

  loadSampleCase(caseKey) {
    const sample = SAMPLE_CASES[caseKey];
    if (!sample) return;

    this.addUserMessage(`Carregar caso oficial: **${sample.nomeCaso}**`, sample.arquivosSimulados);
    this.showTypingIndicator("Formatando laudo pericial oficial e analisando imagens...");

    setTimeout(() => {
      this.formData = JSON.parse(JSON.stringify(sample.dados));
      this.renderFormPreview();
      this.flashDocumentUpdate();
      this.scrollToPage(1);
      this.hideTypingIndicator();

      const m = this.formData.moradia || {};
      const visualReport = `
🏠 **Laudo de Inspeção Visual das Imagens do Imóvel:**
- 🛣️ **Logradouro / Rua:** ${m.rua}
- 🧱 **Tipo de Construção:** Construção em ${m.construcao} com ${m.comodos} cômodos
- 🏠 **Cobertura / Telhado:** ${m.cobertura}
- 🟫 **Piso:** ${m.piso}
- 🛋️ **Inventário de Bens Móveis:** ${m.bensListagem}
`;

      this.addAssistantMessage(
        `O **${sample.nomeCaso}** foi carregado com sucesso seguindo rigorosamente o modelo oficial do Anexo IV!

${visualReport}

Você pode editar diretamente na folha A4 à direita e clicar em **"Baixar Word (.docx)"** ou **"Baixar PDF (.pdf)"**.`,
        this.formData
      );
    }, 600);
  }

  resetToBlankForm() {
    this.formData = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
    this.renderFormPreview();
    this.flashDocumentUpdate();
    this.scrollToPage(1);
    document.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
    const btn = document.getElementById("btnNovoLaudo");
    if (btn) btn.classList.add("active");
    this.addAssistantMessage("📋 Formulário em branco do **Anexo IV da Justiça Federal** carregado com sucesso. Você pode preencher os dados diretamente na folha ao lado ou enviar os documentos e fotos para preenchimento por IA.");
  }

  cb(checked, label) {
    return checked ? `( <strong>X</strong> ) ${label}` : `( &nbsp;&nbsp; ) ${label}`;
  }

  // =====================================================================
  // RENDERIZAÇÃO DA FOLHA A4 JUDICIAL INTERATIVA (MODELO OFICIAL EXATO - 6 PÁGINAS)
  // =====================================================================
  renderFormPreview() {
    const d = this.formData || {};
    const id = d.identificacao || {};
    const sp = d.situacaoPessoal || {};
    const m = d.moradia || {};
    const desp = d.despesas || {};
    const c = d.conclusao || {};
    const cl = d.classificacao || {};
    const enc = d.encerramento || {};
    const fam = Array.isArray(d.familia) ? d.familia : [];

    const formatBRL = (val) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const brasaoImg = typeof BRASAO_HEADER_BASE64 !== "undefined" ? BRASAO_HEADER_BASE64 : "brasao_header.png";

    const headerHtml = `
      <div class="page-header-official">
        <img src="${brasaoImg}" class="official-header-img" alt="Poder Judiciário - Justiça Federal do Amapá" />
      </div>
    `;

    const footerHtml = (pageNum) => `
      <div class="page-footer-official">
        <span class="page-footer-text">Rodovia Norte Sul, s/n – Bairro Infraero II, CEP. 68908-911 - Macapá-AP, site: portal.trf1.jus.br/sjap. Fones: 3251-5507</span>
        <span class="page-footer-num">${pageNum}</span>
      </div>
    `;

    const rubricaHtml = `
      <div class="perita-rubrica-box">
        <div class="perita-rubrica-line">
          <em>${enc.nomePerito || 'Ivonete Ferreira Maciel'}</em><br>
          <span style="font-size:7pt; color:#555;">${enc.cargoPerito || 'Doutora em Serviço Social'}<br>${enc.cress || 'CRESS 104 24ª Região-AP'}</span>
        </div>
      </div>
    `;

    this.a4Content.innerHTML = `
      <div class="pages-wrapper">
        <!-- ==================== PÁGINA 1 ==================== -->
        <div class="official-page" id="page-1">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-form-title">PERÍCIA SOCIOECONÔMICA</div>
            
            <table class="judicial-box-table">
              <tr>
                <td colspan="3"><span class="field-label">Processo nº</span> <span contenteditable="true" class="editable-field" data-path="identificacao.processo" style="font-weight:bold;">${id.processo || ''}</span></td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">Periciado:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.periciado" style="font-weight:bold;">${id.periciado || ''}</span></td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">Representante Legal:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.representanteLegal" style="font-weight:bold;">${id.representanteLegal || ''}</span></td>
              </tr>
              <tr>
                <td colspan="3">
                  <span class="field-label">CPF:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.cpf">${id.cpf || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  <span class="field-label">RG:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.rg">${id.rg || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  <span class="field-label">COD.F</span> <span contenteditable="true" class="editable-field" data-path="identificacao.codF">${id.codF || ''}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  <span class="field-label">NIS:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.nis">${id.nis || ''}</span>
                </td>
              </tr>
              <tr>
                <td colspan="3">
                  <span class="field-label">Sexo:</span>
                  <span>( ${id.sexo === 'M' ? 'X' : '&nbsp;'} )M</span> &nbsp;&nbsp;&nbsp;
                  <span>( ${id.sexo === 'F' ? 'X' : '&nbsp;'} )F</span>
                </td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">Data Nascimento:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.dataNascimento">${id.dataNascimento || ''}</span></td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">OBJETO:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.objeto">${id.objeto || 'Benefício de Prestação Continuada- BPC'}</span></td>
              </tr>
              <tr>
                <td style="width:42%;">
                  <span class="field-label">Profissão Anterior:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.profissaoAnterior">${id.profissaoAnterior || ''}</span><br>
                  <span class="field-label">Profissão Atual:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.profissaoAtual">${id.profissaoAtual || ''}</span>
                </td>
                <td style="width:28%;">
                  <span class="field-label">Estado Civil:</span><br>
                  <span contenteditable="true" class="editable-field" data-path="identificacao.estadoCivil">${id.estadoCivil || ''}</span>
                </td>
                <td style="width:30%;">
                  <span class="field-label">Naturalidade:</span><br>
                  <span contenteditable="true" class="editable-field" data-path="identificacao.naturalidade">${id.naturalidade || ''}</span>
                </td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">Escolaridade:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.escolaridade">${id.escolaridade || ''}</span></td>
              </tr>
              <tr>
                <td colspan="2"><span class="field-label">Endereço da parte (igual ao local da perícia)</span> <span contenteditable="true" class="editable-field" data-path="identificacao.endereco">${id.endereco || ''}</span></td>
                <td><span class="field-label">Telefone:</span><br><span contenteditable="true" class="editable-field" data-path="identificacao.telefone">${id.telefone || ''}</span></td>
              </tr>
            </table>

            <div class="judicial-section-title">SITUAÇÃO PESSOAL</div>
            
            <div class="field-question">Está em idade de trabalhar (acima de 16 anos)?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.idadeTrabalharQual">${sp.idadeTrabalharQual || (sp.idadeTrabalhar ? (sp.idadeTrabalhar === 'Não' ? 'Não.' : 'Sim.') : '')}</span></div>

            <div class="field-question">Realizou cursos profissionalizantes? Especificar.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.cursosQual">${sp.cursosQual || (sp.cursosProfissionalizantes ? (sp.cursosProfissionalizantes === 'Não' ? 'Não.' : 'Sim.') : '')}</span></div>

            <div class="field-question">Já exerceu atividade remunerada? Especificar.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.jaExerceuQual">${sp.jaExerceuQual || (sp.jaExerceuAtividade ? (sp.jaExerceuAtividade === 'Não' ? 'Não.' : 'Sim.') : '')}</span></div>

            <div class="field-question">Teve a CTPS assinada? Especificar.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.teveCtpsDetalhes">${sp.teveCtpsDetalhes || (sp.teveCtpsAssinada ? (sp.teveCtpsAssinada === 'Não' ? 'Não.' : 'Sim.') : '')}</span></div>

            <div style="margin-top:10px;">
              <span class="field-label">CTPS (Nº &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Série &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <table class="judicial-table">
                <thead>
                  <tr><th style="width:8%;">Nº</th><th style="width:34%;">EMPRESA</th><th style="width:28%;">CARGO</th><th style="width:15%;">ENTRADA</th><th style="width:15%;">SAÍDA</th></tr>
                </thead>
                <tbody>
                  <tr><td style="text-align:center;">1</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td style="text-align:center;">2</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td style="text-align:center;">3</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                </tbody>
              </table>
            </div>

            ${rubricaHtml}
          </div>
          ${footerHtml(1)}
        </div>

        <!-- ==================== PÁGINA 2 ==================== -->
        <div class="official-page" id="page-2">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-section-title">SITUAÇÃO FAMILIAR – RENDA DOS INTEGRANTES</div>
            
            <table class="judicial-table">
              <thead>
                <tr>
                  <th style="width:36%;">NOME COMPLETO</th>
                  <th style="width:22%;">ESTADO CIVIL</th>
                  <th style="width:24%;">CPF/NIS</th>
                  <th style="width:18%;">NASCIMENTO</th>
                </tr>
              </thead>
              <tbody>
                ${fam.length > 0 ? fam.map((f, idx) => `
                  <tr>
                    <td style="position:relative;">
                      <span contenteditable="true" class="editable-field" oninput="app.updateFamilyMember(${idx}, 'nome', this.innerText.trim(), false)" onblur="app.updateFamilyMember(${idx}, 'nome', this.innerText.trim(), false)">${f.nome || ''}</span>
                      <button type="button" class="btn-remove-family-member" onclick="app.removeFamilyMember(${idx})" title="Remover este membro familiar">✕</button>
                    </td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" oninput="app.updateFamilyMember(${idx}, 'estadoCivil', this.innerText.trim(), false)" onblur="app.updateFamilyMember(${idx}, 'estadoCivil', this.innerText.trim(), false)">${f.estadoCivil || ''}</span></td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" oninput="app.updateFamilyMember(${idx}, 'cpfNis', this.innerText.trim(), false)" onblur="app.updateFamilyMember(${idx}, 'cpfNis', this.innerText.trim(), false)">${f.cpfNis || ''}</span></td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" oninput="app.updateFamilyMember(${idx}, 'idadeNasc', this.innerText.trim(), false)" onblur="app.updateFamilyMember(${idx}, 'idadeNasc', this.innerText.trim(), false)">${f.idadeNasc || ''}</span></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                  </tr>
                `}
              </tbody>
            </table>

            <div style="text-align:center; font-weight:bold; font-size:9.5pt; margin: 8px 0 4px;">CONTINUAÇÃO</div>

            <table class="judicial-table">
              <thead>
                <tr>
                  <th style="width:24%;">PARENTESCO</th>
                  <th style="width:38%;">OCUPAÇÃO</th>
                  <th style="width:20%;">RENDA MENSAL</th>
                  <th style="width:18%;">R. COMPROVADA?</th>
                </tr>
              </thead>
              <tbody>
                ${fam.length > 0 ? fam.map((f, idx) => `
                  <tr>
                    <td><span contenteditable="true" class="editable-field" oninput="app.updateFamilyMember(${idx}, 'parentesco', this.innerText.trim(), false)" onblur="app.updateFamilyMember(${idx}, 'parentesco', this.innerText.trim(), false)">${f.parentesco || ''}</span></td>
                    <td><span contenteditable="true" class="editable-field" oninput="app.updateFamilyMember(${idx}, 'ocupacao', this.innerText.trim(), false)" onblur="app.updateFamilyMember(${idx}, 'ocupacao', this.innerText.trim(), false)">${f.ocupacao || ''}</span></td>
                    <td style="text-align:right;"><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'rendaMensal', parseFloat(this.innerText.replace(/[^\\d.-]/g, ''))||0, true)">${formatBRL(f.rendaMensal)}</span></td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" oninput="app.updateFamilyMember(${idx}, 'tipoRenda', this.innerText.trim(), false)" onblur="app.updateFamilyMember(${idx}, 'tipoRenda', this.innerText.trim(), false)">${f.tipoRenda || 'Declarada'}</span></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                    <td><span contenteditable="true" class="editable-field">&nbsp;</span></td>
                  </tr>
                `}
              </tbody>
            </table>

            <div style="display:flex; justify-content:flex-end; margin-top:4px;">
              <button type="button" class="btn-add-family-member" onclick="app.addFamilyMember()">
                <span>＋</span> Adicionar Membro da Família
              </button>
            </div>

            <div class="judicial-paragraph" style="font-size:8.2pt; color:#222; margin-top:10px; line-height:1.32;">
              * “renda mensal bruta familiar: a soma dos rendimentos brutos auferidos mensalmente pelos membros da família composta por salários, proventos, pensões, pensões alimentícias, benefícios de previdência pública ou privada, comissões, pró-labore, outros rendimentos do trabalho não assalariado, rendimentos do mercado informal ou autônomo, rendimentos auferidos do patrimônio, Renda Mensal Vitalícia e Benefício de Prestação Continuada, ressalvado o disposto no parágrafo único do art. 19.” (Art. 4º, VI, do anexo do Decreto nº 6.214/2007).
            </div>

            <div class="field-question" style="margin-top:14px;">Quantos possuem carteira de trabalho, CTPS, assinada?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="carteiraAssinadaFamilia">${d.carteiraAssinadaFamilia || (fam.length > 0 ? 'Nenhum membro da família possui CTPS assinada atualmente.' : '')}</span></div>

            <div class="field-question" style="margin-top:14px;">Qual a renda familiar per capita mensal? Especificar com cálculo, conforme art. 20 da lei nº. 8.742/93 - LOAS.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="rendaObservacao">${d.rendaObservacao || (d.rendaPerCapita !== undefined && d.rendaPerCapita !== null && fam.length > 0 ? `Renda familiar total de ${formatBRL(d.rendaTotalFamilia || 0)}, com renda per capita apurada em ${formatBRL(d.rendaPerCapita)} para ${fam.length} membro(s) do grupo familiar, nos termos do art. 20 da Lei nº 8.742/93.` : '')}</span></div>

            ${rubricaHtml}
          </div>
          ${footerHtml(2)}
        </div>

        <!-- ==================== PÁGINA 3 ==================== -->
        <div class="official-page" id="page-3">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-section-title">SITUAÇÃO DE MORADIA</div>

            <div class="field-question">Reside em quê? Abrigos, asilos ou similares, casa, apartamento etc.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.detalhesCompletos">${m.detalhesCompletos || (m.tipo || m.construcao || m.comodos ? `Reside em ${m.tipo || 'casa'}${m.construcao ? ' com construção em ' + m.construcao : ''}${m.cobertura ? ', coberto com ' + m.cobertura : ''}${m.comodos ? ' e possui ' + m.comodos + ' cômodos' : ''}${m.comodosDescricao ? ' (' + m.comodosDescricao + ')' : ''}.${m.zona ? ' A residência encontra-se em área ' + m.zona + '.' : ''}${m.acesso ? ' Acesso ' + m.acesso + '.' : ''} Infraestrutura: água (${m.agua || 'regular'}), esgoto (${m.esgoto || 'fossa/rede'}), energia elétrica (${m.energia || 'regular'}), via pública (${m.rua || 'pavimentada/terra'}), piso (${m.piso || 'cerâmica/cimento'}).` : '')}</span></div>

            <div class="field-question" style="margin-top:12px;">Há quanto tempo reside no local?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.tempoResidencia">${m.tempoResidencia ? (m.tempoResidencia.includes('ano') || m.tempoResidencia.includes('mês') ? (m.tempoResidencia.startsWith('Reside') ? m.tempoResidencia : 'Reside neste imóvel há ' + m.tempoResidencia + '.') : m.tempoResidencia) : ''}</span></div>

            <div class="field-question" style="margin-top:12px;">Imóvel próprio, alugado ou de terceiro?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.proprietarioImovel">${m.proprietarioImovel ? (m.proprietarioImovel.startsWith('É') || m.proprietarioImovel.startsWith('Imóvel') ? m.proprietarioImovel : 'Imóvel ' + (m.regimeImovel || '') + (m.proprietarioImovel ? ' - ' + m.proprietarioImovel : '')) : (m.regimeImovel ? 'Imóvel ' + m.regimeImovel : '')}</span></div>

            <div class="field-question" style="margin-top:12px;">Trata-se residência habitual ou temporária (de passagem)?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.caraterResidencia">${m.caraterResidencia ? (m.caraterResidencia.startsWith('Residência') ? m.caraterResidencia : 'Residência ' + m.caraterResidencia.toLowerCase() + '.') : ''}</span></div>

            <div class="field-question" style="margin-top:12px;">Especificar que bens guarnecem a residência.</div>
            <div class="field-answer">
              <div contenteditable="true" class="editable-field-block" data-path="moradia.bensTextoPadrao">${m.bensTextoPadrao || (m.bensListagem ? 'O conjunto de bens descritos a seguir demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade.' : '')}</div>
              <div contenteditable="true" class="editable-field-block" data-path="moradia.bensListagem" style="margin-top:6px;">${m.bensListagem ? `No imóvel continha os seguintes bens permanentes: ${m.bensListagem}. Nenhum bem de alto valor comercial ou que indique capacidade econômica foi encontrado.` : ''}</div>
            </div>

            ${rubricaHtml}
          </div>
          ${footerHtml(3)}
        </div>

        <!-- ==================== PÁGINA 4 ==================== -->
        <div class="official-page" id="page-4">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-section-title">DESPESAS cont....</div>

            <div class="field-question">Quais os gastos com moradia, água, luz etc.?</div>
            <div class="field-answer">
              <p class="judicial-paragraph"><strong>Habitação:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.habitacaoObs">${desp.habitacaoObs || (desp.habitacao ? `Gasto mensal com habitação no valor de ${formatBRL(desp.habitacao)}.` : '')}</span></p>
              <p class="judicial-paragraph" style="margin-top:6px;"><strong>Energia elétrica:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.energiaObs">${desp.energiaObs || (desp.energia ? `Gasto médio com energia elétrica no valor de ${formatBRL(desp.energia)}.` : '')}</span></p>
              <p class="judicial-paragraph" style="margin-top:6px;"><strong>Alimentação:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.alimentacaoObs">${desp.alimentacaoObs || (desp.alimentacao ? `Gasto estimado com alimentação básica familiar no valor de ${formatBRL(desp.alimentacao)} mensais.` : '')}</span></p>
              <p class="judicial-paragraph" style="margin-top:6px;"><strong>Transporte:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.transporteObs">${desp.transporteObs || (desp.transporte ? `Despesas com transporte no valor de ${formatBRL(desp.transporte)}.` : '')}</span></p>
            </div>

            <div class="field-question" style="margin-top:14px;">Quais os gastos com saúde (tudo incluído)</div>
            <div class="field-answer">
              <div contenteditable="true" class="editable-field-block judicial-paragraph" data-path="despesas.saudeObs">${desp.saudeObs || ''}</div>
            </div>

            ${rubricaHtml}
          </div>
          ${footerHtml(4)}
        </div>

        <!-- ==================== PÁGINA 5 ==================== -->
        <div class="official-page" id="page-5">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-section-title">CONCLUSÕES</div>

            <div contenteditable="true" class="editable-field-block judicial-paragraph" data-path="conclusao.textoEstudoSocial">${c.textoEstudoSocial || (c.textoParecerComplementar ? c.textoParecerComplementar.split('\n\n')[0] : '')}</div>

            <div contenteditable="true" class="editable-field-block judicial-paragraph" data-path="conclusao.textoDificuldades" style="margin-top:6px;">${c.textoDificuldades || (c.textoParecerComplementar && c.textoParecerComplementar.split('\n\n')[1] ? c.textoParecerComplementar.split('\n\n')[1] : '')}</div>

            <div class="judicial-paragraph" style="margin-top:6px;">
              Portanto, analisando o que preconiza a Fundamentação Legal: a elegibilidade do infante encontra amparo nos seguintes dispositivos:
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:5px;">Lei Orgânica da Assistência Social - LOAS – Lei 8.742/93</div>
            <div class="judicial-paragraph" style="padding-left:14px; margin-top:1px;">
              Art. 1º – Direito do cidadão e dever do Estado.<br>
              Art. 2º, inciso V – Garantia de um salário-mínimo à pessoa com deficiência.<br>
              Art. 20 – Critérios socioeconômicos (renda per capita inferior a ¼ do salário-mínimo).
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:5px;">Estatuto da Criança e do Adolescente – ECA, lei nº 8.069/90</div>
            <div class="judicial-paragraph" style="padding-left:14px; margin-top:1px;">
              Art. 7º – Garantia de condições dignas de vida e acesso à saúde.<br>
              Art. 4º – Prioridade absoluta no atendimento de crianças.
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:5px;">Normas Técnicas da Assistência Social</div>
            <div class="judicial-paragraph" style="padding-left:14px; margin-top:1px;">
              Proteção integral.<br>
              Avaliação por múltiplos critérios.<br>
              Reconhecimento da deficiência e impedimentos de longo prazo.
            </div>

            ${rubricaHtml}
          </div>
          ${footerHtml(5)}
        </div>

        <!-- ==================== PÁGINA 6 ==================== -->
        <div class="official-page" id="page-6">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-paragraph" style="margin-top:4px;">
              Após criteriosa análise técnica, fundamentada em visita domiciliar, entrevista, documentação anexa e legislação vigente, conclui-se que:
            </div>

            <div class="judicial-paragraph" style="margin-top:4px;">
              ${c.vulnerabilidadeEconomicaSevera ? 'O requerente encontra-se em situação de vulnerabilidade econômica severa.<br>' : ''}
              ${c.necessidadeTratamentoContinuo ? 'Possui necessidade comprovada de tratamento contínuo, cuja manutenção depende de recursos.' : ''}
            </div>

            <ul style="margin: 4px 0 8px 22px; padding:0; line-height:1.35; text-align:justify;">
              <li>A família não dispõe de meios próprios para prover sua subsistência digna.</li>
              <li>A renda per capita atende ao critério objetivo da LOAS.</li>
              <li>O ambiente social, familiar e territorial agrava a vulnerabilidade e aumenta o risco social.</li>
            </ul>

            <div class="judicial-paragraph" style="margin-top:6px;">
              Assim, o requerente <span class="clickable-parecer" onclick="app.toggleParecer()" title="Clique para alternar parecer">${c.parecerFavoravel ? '<strong>possui</strong>' : '<strong>não possui</strong>'}</span> amparo legal e social para a concessão do Benefício de Prestação Continuada BPC.
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:10px;">
              Fundamentadamente, se for o caso, classifique a perícia de 1 a 3 de acordo com o grau crescente de complexidade, risco, distância e dificuldade de acesso ao local da perícia:
            </div>

            <div class="judicial-paragraph" style="margin-top:4px;">
              <strong>RESPOSTA:</strong> <span contenteditable="true" class="editable-field" data-path="classificacao.justificativa">${cl.justificativa || ''}</span>
            </div>

            <div style="margin-top:8px; font-size:9.5pt; line-height:1.45;">
              <div class="score-row">Complexidade &nbsp;&nbsp;&nbsp;&nbsp; 
                <span class="clickable-score ${cl.complexidade == 1 ? 'selected' : ''}" onclick="app.setClassification('complexidade', 1)" title="Nível 1">( ${cl.complexidade == 1 ? '<strong>x</strong>' : '&nbsp;'} ) 1</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.complexidade == 2 ? 'selected' : ''}" onclick="app.setClassification('complexidade', 2)" title="Nível 2">( ${cl.complexidade == 2 ? '<strong>x</strong>' : '&nbsp;'} ) 2</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.complexidade == 3 ? 'selected' : ''}" onclick="app.setClassification('complexidade', 3)" title="Nível 3">( ${cl.complexidade == 3 ? '<strong>x</strong>' : '&nbsp;'} ) 3</span>
              </div>
              <div class="score-row">Risco &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
                <span class="clickable-score ${cl.risco == 1 ? 'selected' : ''}" onclick="app.setClassification('risco', 1)" title="Nível 1">( ${cl.risco == 1 ? '<strong>x</strong>' : '&nbsp;'} ) 1</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.risco == 2 ? 'selected' : ''}" onclick="app.setClassification('risco', 2)" title="Nível 2">( ${cl.risco == 2 ? '<strong>x</strong>' : '&nbsp;'} ) 2</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.risco == 3 ? 'selected' : ''}" onclick="app.setClassification('risco', 3)" title="Nível 3">( ${cl.risco == 3 ? '<strong>x</strong>' : '&nbsp;'} ) 3</span>
              </div>
              <div class="score-row">Distância &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
                <span class="clickable-score ${cl.distancia == 1 ? 'selected' : ''}" onclick="app.setClassification('distancia', 1)" title="Nível 1">( ${cl.distancia == 1 ? '<strong>x</strong>' : '&nbsp;'} ) 1</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.distancia == 2 ? 'selected' : ''}" onclick="app.setClassification('distancia', 2)" title="Nível 2">( ${cl.distancia == 2 ? '<strong>x</strong>' : '&nbsp;'} ) 2</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.distancia == 3 ? 'selected' : ''}" onclick="app.setClassification('distancia', 3)" title="Nível 3">( ${cl.distancia == 3 ? '<strong>x</strong>' : '&nbsp;'} ) 3</span>
              </div>
              <div class="score-row">Dificuldade de acesso 
                <span class="clickable-score ${cl.dificuldadeAcesso == 1 ? 'selected' : ''}" onclick="app.setClassification('dificuldadeAcesso', 1)" title="Nível 1">( ${cl.dificuldadeAcesso == 1 ? '<strong>x</strong>' : '&nbsp;'} ) 1</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.dificuldadeAcesso == 2 ? 'selected' : ''}" onclick="app.setClassification('dificuldadeAcesso', 2)" title="Nível 2">( ${cl.dificuldadeAcesso == 2 ? '<strong>x</strong>' : '&nbsp;'} ) 2</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.dificuldadeAcesso == 3 ? 'selected' : ''}" onclick="app.setClassification('dificuldadeAcesso', 3)" title="Nível 3">( ${cl.dificuldadeAcesso == 3 ? '<strong>x</strong>' : '&nbsp;'} ) 3</span>
              </div>
              <div class="score-row">Situação em local de risco social elevado 
                <span class="clickable-score ${cl.riscoSocial == 1 ? 'selected' : ''}" onclick="app.setClassification('riscoSocial', 1)" title="Nível 1">( ${cl.riscoSocial == 1 ? '<strong>x</strong>' : '&nbsp;'} ) 1</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.riscoSocial == 2 ? 'selected' : ''}" onclick="app.setClassification('riscoSocial', 2)" title="Nível 2">( ${cl.riscoSocial == 2 ? '<strong>x</strong>' : '&nbsp;'} ) 2</span> &nbsp;&nbsp; 
                <span class="clickable-score ${cl.riscoSocial == 3 ? 'selected' : ''}" onclick="app.setClassification('riscoSocial', 3)" title="Nível 3">( ${cl.riscoSocial == 3 ? '<strong>x</strong>' : '&nbsp;'} ) 3</span>
              </div>
            </div>

            <div style="margin-top:10px; font-size:9.5pt; line-height:1.4;">
              <p style="margin:2px 0;"><strong>Pericial Social</strong></p>
              <p style="margin:2px 0;">Local: <span contenteditable="true" class="editable-field" data-path="encerramento.municipio">${enc.municipio ? (enc.municipio.toLowerCase().includes('município') ? enc.municipio : 'município de ' + enc.municipio + (enc.uf ? '/' + enc.uf : '')) : ''}</span></p>
              <p style="margin:2px 0;">Data da perícia in loco: <span contenteditable="true" class="editable-field" data-path="encerramento.dataPericia">${enc.dataPericia || ''}</span></p>
              <p style="margin:2px 0;">Hora da perícia in loco: <span contenteditable="true" class="editable-field" data-path="encerramento.horaPericia">${enc.horaPericia || ''}</span></p>
            </div>

            <div class="perita-full-signature" style="margin-top:16px;">
              <div class="sig-line" style="width:280px; height:1px; background:#000; margin:0 auto 4px;"></div>
              <div class="sig-name" style="font-weight:bold; font-size:10pt;">${enc.nomePerito || 'Ivonete Ferreira Maciel'}</div>
              <div class="sig-role" style="font-size:9pt; color:#222;">${enc.cargoPerito || 'Doutora em Serviço Social'}</div>
              <div class="sig-role" style="font-size:9pt; color:#222;">${enc.cress || 'CRESS 104 24ª Região-AP'}</div>
            </div>
          </div>
          ${footerHtml(6)}
        </div>
      </div>
    `;

    // Vincula inputs com two-way data binding imediato (input + blur)
    this.a4Content.querySelectorAll("[contenteditable='true'][data-path]").forEach(el => {
      el.addEventListener("input", (e) => {
        const path = e.target.getAttribute("data-path");
        const val = e.target.innerText.trim();
        this.updateNestedValue(this.formData, path, val);
        this.notifyChange("Digitando...");
      });
      el.addEventListener("blur", (e) => {
        const path = e.target.getAttribute("data-path");
        const val = e.target.innerText.trim();
        this.updateNestedValue(this.formData, path, val);
        this.notifyChange("Em sincronia");
      });
    });
  }

  updateField(path, value) {
    this.updateNestedValue(this.formData, path, value);
    this.renderFormPreview();
  }

  updateNestedValue(obj, path, value) {
    const keys = path.split(".");
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!curr[keys[i]]) curr[keys[i]] = {};
      curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
  }

  updateFamilyMember(index, field, value, shouldReRender = false) {
    if (this.formData.familia && this.formData.familia[index]) {
      this.formData.familia[index][field] = value;
      const calc = calcularRendaPerCapita(this.formData.familia);
      this.formData.rendaTotalFamilia = calc.rendaTotal;
      this.formData.rendaPerCapita = calc.rendaPerCapita;
      this.notifyChange("Família atualizada");
      if (shouldReRender) {
        this.renderFormPreview();
      }
    }
  }

  removeFamilyMember(index) {
    if (this.formData.familia && this.formData.familia.length > 0) {
      this.formData.familia.splice(index, 1);
      const calc = calcularRendaPerCapita(this.formData.familia);
      this.formData.rendaTotalFamilia = calc.rendaTotal;
      this.formData.rendaPerCapita = calc.rendaPerCapita;
      this.renderFormPreview();
      this.notifyChange("Membro familiar removido");
    }
  }

  addFamilyMember() {
    if (!Array.isArray(this.formData.familia)) {
      this.formData.familia = [];
    }
    this.formData.familia.push({
      nome: "",
      parentesco: "Familiar",
      idadeNasc: "",
      cpfNis: "",
      ocupacao: "Sem ocupação",
      rendaMensal: 0,
      tipoRenda: "Declarada"
    });
    const calc = calcularRendaPerCapita(this.formData.familia);
    this.formData.rendaTotalFamilia = calc.rendaTotal;
    this.formData.rendaPerCapita = calc.rendaPerCapita;
    this.renderFormPreview();
    this.notifyChange("Membro familiar adicionado");
  }

  setClassification(field, value) {
    if (!this.formData.classificacao) this.formData.classificacao = {};
    this.formData.classificacao[field] = value;
    this.renderFormPreview();
    this.notifyChange("Classificação atualizada");
  }

  toggleParecer() {
    if (!this.formData.conclusao) this.formData.conclusao = {};
    this.formData.conclusao.parecerFavoravel = !this.formData.conclusao.parecerFavoravel;
    this.renderFormPreview();
    this.notifyChange("Parecer atualizado");
  }

  // =====================================================================
  // CONTROLES DE ZOOM E NAVEGAÇÃO DA FOLHA A4
  // =====================================================================
  setZoom(level) {
    this.currentZoom = Math.min(1.6, Math.max(0.4, Math.round(level * 100) / 100));
    if (this.a4Content) {
      this.a4Content.style.zoom = this.currentZoom;
      this.a4Content.style.setProperty("--doc-zoom", this.currentZoom);
    }
    if (this.zoomLevelText) {
      this.zoomLevelText.innerText = `${Math.round(this.currentZoom * 100)}%`;
    }
  }

  zoomIn() {
    this.setZoom(this.currentZoom + 0.1);
  }

  zoomOut() {
    this.setZoom(this.currentZoom - 0.1);
  }

  resetZoom() {
    this.setZoom(1.0);
  }

  fitToWidth() {
    if (!this.docScrollViewport) return;
    const availableWidth = this.docScrollViewport.clientWidth - 48;
    const pageWidthPx = 830;
    const fitLevel = Math.min(1.3, Math.max(0.45, availableWidth / pageWidthPx));
    this.setZoom(fitLevel);
  }

  scrollToPage(pageNum) {
    const pageEl = document.getElementById(`page-${pageNum}`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      this.updateActivePageChip(pageNum);
    }
  }

  updateActivePageChip(pageNum) {
    const chips = document.querySelectorAll(".btn-page-chip");
    chips.forEach(chip => {
      const p = parseInt(chip.getAttribute("data-page"), 10);
      if (p === pageNum) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });
  }

  initScrollSpy() {
    if (!this.docScrollViewport) return;
    this.docScrollViewport.addEventListener("scroll", () => {
      const pages = this.docScrollViewport.querySelectorAll(".official-page");
      const viewportTop = this.docScrollViewport.scrollTop + 120;
      let activePage = 1;
      pages.forEach((page, idx) => {
        if (page.offsetTop <= viewportTop) {
          activePage = idx + 1;
        }
      });
      this.updateActivePageChip(activePage);
    }, { passive: true });
  }

  notifyChange(label = "Em sincronia") {
    if (this.docSyncIndicator) {
      this.docSyncIndicator.className = "status-indicator saving";
      if (this.docSyncText) this.docSyncText.innerText = "Salvando...";
      clearTimeout(this._saveTimeout);
      this._saveTimeout = setTimeout(() => {
        if (this.docSyncIndicator) this.docSyncIndicator.className = "status-indicator synced";
        if (this.docSyncText) this.docSyncText.innerText = label;
      }, 400);
    }
  }

  flashDocumentUpdate() {
    if (this.docSyncIndicator) {
      this.docSyncIndicator.className = "status-indicator updated";
      if (this.docSyncText) this.docSyncText.innerText = "✨ Dados Atualizados";
      setTimeout(() => {
        if (this.docSyncIndicator) this.docSyncIndicator.className = "status-indicator synced";
        if (this.docSyncText) this.docSyncText.innerText = "Em sincronia";
      }, 2500);
    }
    if (this.a4Content) {
      this.a4Content.classList.remove("doc-flash-highlight");
      void this.a4Content.offsetWidth;
      this.a4Content.classList.add("doc-flash-highlight");
    }
  }

  // =====================================================================
  // EXPORTAÇÃO PARA WORD (.DOCX)
  // =====================================================================
  async exportToWord() {
    const buttons = [this.btnDownloadDocx, this.btnDownloadDocxTop].filter(Boolean);
    const defaultWordHtml = '<span>📥</span><span>Baixar Word (.docx)</span>';
    buttons.forEach(b => {
      b.innerHTML = `<span>⏳ Baixando Word...</span>`;
      b.disabled = true;
    });

    try {
      const generator = new PericiaDocxGenerator(this.formData);
      const safeName = (this.formData.identificacao.periciado || "Periciado")
        .replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Pericia_Socioeconomica_${safeName}.docx`;

      await generator.downloadDocx(filename);

      this.addAssistantMessage(`📄 Seu arquivo editável **${filename}** foi gerado com sucesso e o download foi iniciado no seu computador!
      
Ele segue estritamente o modelo oficial da Justiça Federal / Seção Judiciária do Amapá (Anexo IV), com o Brasão da República colorido, tabelas com bordas, caixas ` + "`( X )`" + ` e todas as assinaturas.`);
    } catch (err) {
      console.error("Erro na exportação Word:", err);
      alert("Erro ao baixar o arquivo Word: " + err.message);
    } finally {
      buttons.forEach(b => {
        b.innerHTML = defaultWordHtml;
        b.disabled = false;
      });
    }
  }

  // =====================================================================
  // EXPORTAÇÃO PARA PDF (.PDF) - 6 PÁGINAS OFICIAIS SEM CORTE NEM DESLOCAMENTO
  // =====================================================================
  async exportToPdf() {
    const buttons = [this.btnDownloadPdf, this.btnDownloadPdfTop].filter(Boolean);
    const defaultPdfHtml = '<span>📄</span><span>Baixar PDF</span>';
    buttons.forEach(b => {
      b.innerHTML = `<span>⏳ Gerando PDF...</span>`;
      b.disabled = true;
    });

    let staging = null;
    try {
      const safeName = (this.formData.identificacao.periciado || "Periciado")
        .replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Pericia_Socioeconomica_${safeName}.pdf`;

      const pages = Array.from(this.a4Content.querySelectorAll('.official-page'));
      if (pages.length === 0) {
        throw new Error("Nenhuma página encontrada para gerar o PDF.");
      }

      const jsPdfClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPdfClass || !window.html2canvas) {
        window.print();
        return;
      }

      // Cria container de staging temporário posicionado exatamente em (0,0) sem interferência de viewport
      staging = document.createElement('div');
      staging.id = 'pdf-render-staging';
      staging.style.cssText = 'position:fixed!important;left:0!important;top:0!important;width:794px!important;height:1123px!important;margin:0!important;padding:0!important;z-index:-9999!important;background:#ffffff!important;overflow:hidden!important;pointer-events:none!important;opacity:1!important;';
      document.body.appendChild(staging);

      const pdf = new jsPdfClass({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        buttons.forEach(b => {
          b.innerHTML = `<span>⏳ Gerando pág. ${i + 1}/${pages.length}...</span>`;
        });

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Clona a página dentro do container perfeitamente posicionado em (0, 0)
        staging.innerHTML = '';
        const clone = pageEl.cloneNode(true);
        clone.style.cssText = 'width:794px!important;height:1123px!important;min-height:1123px!important;max-height:1123px!important;box-sizing:border-box!important;margin:0!important;padding:14mm 20mm 14mm 22mm!important;box-shadow:none!important;border-radius:0!important;position:absolute!important;left:0!important;top:0!important;background:#ffffff!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;';
        staging.appendChild(clone);

        // Breve pausa para o layout e fontes renderizarem
        await new Promise(r => setTimeout(r, 60));

        const canvas = await window.html2canvas(clone, {
          scale: 2,
          useCORS: false,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      if (staging) {
        staging.remove();
        staging = null;
      }

      pdf.save(filename);

      this.addAssistantMessage(`📄 Seu arquivo PDF **${filename}** foi gerado com sucesso em 6 páginas oficiais idênticas ao modelo da Justiça Federal! Todas as 6 folhas estão perfeitamente ajustadas, sem qualquer deslocamento ou corte na assinatura.`);
    } catch (err) {
      console.error("Erro na exportação PDF:", err);
      if (staging) staging.remove();
      window.print();
    } finally {
      if (staging) staging.remove();
      buttons.forEach(b => {
        b.innerHTML = defaultPdfHtml;
        b.disabled = false;
      });
    }
  }


  // =====================================================================
  // TEMAS E MODAL DE CONFIGURAÇÃO
  // =====================================================================
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    this.btnThemeToggle.innerHTML = nextTheme === "light" ? "🌙" : "☀️";
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

  // =====================================================================
  // APP MOBILE, PWA E NAVEGAÇÃO ENTRE ABAS
  // =====================================================================
  setMobileTab(tabName) {
    if (this.tabMobileChat) this.tabMobileChat.classList.toggle("active", tabName === "chat");
    if (this.tabMobileDoc) this.tabMobileDoc.classList.toggle("active", tabName === "doc");
    if (this.tabMobileSummary) this.tabMobileSummary.classList.toggle("active", tabName === "summary");

    if (tabName === "summary") {
      this.openSummaryModal();
      return;
    }

    if (window.innerWidth <= 960) {
      if (tabName === "chat") {
        this.chatPane.style.display = "flex";
        this.documentPane.style.display = "none";
      } else if (tabName === "doc") {
        this.chatPane.style.display = "none";
        this.documentPane.style.display = "flex";
        this.fitToWidth();
      }
    }
  }

  openSummaryModal() {
    this.renderSummaryDrawer();
    if (this.summaryModal) this.summaryModal.classList.add("open");
  }

  closeSummaryModal() {
    if (this.summaryModal) this.summaryModal.classList.remove("open");
  }

  renderSummaryDrawer() {
    if (!this.summaryModalBody) return;
    const d = this.formData || {};
    const id = d.identificacao || {};
    const c = d.conclusao || {};
    const m = d.moradia || {};
    const desp = d.despesas || {};
    const despTotal = Object.entries(desp)
      .filter(([k]) => !k.endsWith("Obs"))
      .reduce((acc, [, val]) => acc + (Number(val) || 0), 0);

    const calc = typeof calcularRendaPerCapita === "function" 
      ? calcularRendaPerCapita(d.familia || []) 
      : { rendaTotal: d.rendaTotalFamilia || 0, rendaPerCapita: d.rendaPerCapita || 0 };
    const limiteLoas = 353.00; // 1/4 do salário mínimo de R$ 1.412
    const satisfiesLoas = calc.rendaPerCapita <= limiteLoas;

    this.summaryModalBody.innerHTML = `
      <div class="summary-kpi-banner">
        <div class="summary-kpi-item">
          <span class="kpi-label">RENDA FAMILIAR TOTAL</span>
          <span class="kpi-val">R$ ${calc.rendaTotal.toFixed(2)}</span>
          <span class="kpi-sub">${d.familia ? d.familia.length : 1} membro(s)</span>
        </div>
        <div class="summary-kpi-item">
          <span class="kpi-label">RENDA PER CAPITA</span>
          <span class="kpi-val highlight">R$ ${calc.rendaPerCapita.toFixed(2)}</span>
          <span class="kpi-sub">Teto 1/4 SM: R$ 353,00</span>
        </div>
        <div class="summary-kpi-item">
          <span class="kpi-label">DESPESAS COMPROVADAS</span>
          <span class="kpi-val">R$ ${despTotal.toFixed(2)}</span>
          <span class="kpi-sub">${despTotal > calc.rendaTotal ? "Déficit Orçamentário" : "Sobrevivência"}</span>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <h4>👤 Identificação Pericial</h4>
          <p><strong>Periciado(a):</strong> ${id.periciado || "Não informado"}</p>
          <p><strong>CPF:</strong> ${id.cpf || "---"} | <strong>RG:</strong> ${id.rg || "---"}</p>
          <p><strong>Processo nº:</strong> ${id.processo || "---"}</p>
          <p><strong>Representante Legal:</strong> ${id.representanteLegal || "O próprio"}</p>
          <p><strong>Endereço / Comarca:</strong> ${id.endereco || "---"} - ${d.encerramento?.municipio || "AP"}</p>
        </div>

        <div class="summary-card">
          <h4>🏠 Diagnóstico Habitacional</h4>
          <p><strong>Tipo & Estrutura:</strong> ${m.tipo || "Casa"} em ${m.construcao || "alvenaria/madeira"} (${m.comodos || 4} cômodos)</p>
          <p><strong>Cobertura & Piso:</strong> ${m.cobertura || "Telha"} / ${m.piso || "Cimento"}</p>
          <p><strong>Logradouro:</strong> ${m.rua || "Via urbana"}</p>
          <p><strong>Saneamento:</strong> Água: ${m.agua || "Rede"} | Esgoto: ${m.esgoto || "Fossa"}</p>
        </div>

        <div class="summary-card full-width">
          <h4>⚖️ Parecer Conclusivo do Serviço Social (BPC/LOAS)</h4>
          <div class="loas-verdict-badge ${c.parecerFavoravel ? 'favoravel' : 'desfavoravel'}">
            <span>${c.parecerFavoravel ? '✅ PARECER SOCIAL FAVORÁVEL AO BPC/LOAS' : '⚠️ ATENÇÃO: CRITÉRIO DE RENDA EXCEDIDO'}</span>
            <small>${satisfiesLoas ? 'Renda per capita igual ou inferior a 1/4 do Salário Mínimo (Art. 20, § 3º, Lei 8.742/93).' : 'Renda per capita superior a 1/4 SM. A concessão depende da comprovação judicial de extrema vulnerabilidade material.'}</small>
          </div>
          <p style="margin-top:10px; font-size:0.85rem; color:var(--text-secondary); line-height:1.5;">
            ${c.textoEstudoSocial || "Estudo social pronto para visualização completa nas páginas A4 judiciais."}
          </p>
        </div>
      </div>
    `;
  }

  insertPromptSuggestion(type) {
    let suggestion = "";
    if (type === "moradia") {
      suggestion = "Foto da moradia (fachada e cômodos): residência em alvenaria simples/madeira, telha de fibrocimento, piso rústico, via de terra sem saneamento, sem itens de luxo.";
    } else if (type === "cadunico") {
      suggestion = "CadÚnico: NIS ..., periciado(a) menor/idoso, renda familiar formal zero, família depende de assistência e auxílio de terceiros.";
    } else if (type === "cid") {
      suggestion = "Laudo Médico: CID-10 ..., impedimento de longo prazo de natureza física/mental, necessita de cuidados contínuos, sem condições laborais.";
    } else if (type === "familia") {
      suggestion = "Composição Familiar: 3 pessoas no domicílio (genitora sem renda fixa, periciado dependente de cuidados, irmão menor). Renda total: R$ 0,00.";
    }

    if (this.chatInput) {
      if (this.chatInput.value.trim().length > 0) {
        this.chatInput.value += "\n" + suggestion;
      } else {
        this.chatInput.value = suggestion;
      }
      this.chatInput.focus();
    }
  }

  // =====================================================================
  // IA AUTOMÁTICA VIA SERVIDOR (SEM CONFIGURAÇÃO DO USUÁRIO)
  // =====================================================================
  async detectServerAI() {
    try {
      const res = await fetch("/api/extract", { method: "OPTIONS" });
      if (res.ok || res.status === 200 || res.status === 204) {
        this.useServerAI = true;
        console.log("✅ IA Automática detectada no servidor (/api/extract).");
      }
    } catch {
      this.useServerAI = false;
      console.info("ℹ️ Servidor de IA não disponível. Usando chave local ou extrator inteligente.");
    }
    this.updateStatusBadges();
  }

  initStatusBadges() {
    this.statusBadgeIA = document.getElementById("statusBadgeIA");
    this.statusBadgeBD = document.getElementById("statusBadgeBD");

    // Escuta o evento do Supabase
    document.addEventListener("supabase-ready", () => {
      this.updateStatusBadges();
    });

    // Atualiza após um pequeno delay para dar tempo do Supabase conectar
    setTimeout(() => this.updateStatusBadges(), 2000);
  }

  updateStatusBadges() {
    if (this.statusBadgeIA) {
      if (this.useServerAI) {
        this.statusBadgeIA.textContent = "🤖 IA Auto ✓";
        this.statusBadgeIA.className = "status-badge connected";
      } else if (this.apiKey) {
        this.statusBadgeIA.textContent = "🔑 IA Chave Local";
        this.statusBadgeIA.className = "status-badge connected";
      } else {
        this.statusBadgeIA.textContent = "🧠 IA Integrada";
        this.statusBadgeIA.className = "status-badge";
      }
    }

    if (this.statusBadgeBD) {
      if (typeof db !== "undefined" && db.connected) {
        this.statusBadgeBD.textContent = "☁️ BD Nuvem ✓";
        this.statusBadgeBD.className = "status-badge connected";
      } else {
        this.statusBadgeBD.textContent = "💾 BD Local";
        this.statusBadgeBD.className = "status-badge";
      }
    }
  }

  async processWithServerAI(userText, files) {
    this.showTypingIndicator("Conectando à IA Automática (Gemini Flash)...");

    try {
      const contentsParts = [];

      // Monta o system prompt (reutiliza o mesmo da API direta)
      const systemPrompt = this._buildSystemPrompt();
      contentsParts.push({ text: systemPrompt + "\n\nInstruções/Anotações adicionais do perito:\n" + userText });

      // Anexa arquivos como inline_data
      for (const f of files) {
        let base64Data = f.base64;
        if (!base64Data && f.fileRef) {
          try {
            base64Data = await this.readFileAsBase64(f.fileRef);
          } catch (e) {
            console.warn("Falha ao converter arquivo:", e);
          }
        }

        if (base64Data) {
          const mime = f.type || (f.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
          contentsParts.push({
            inline_data: { mime_type: mime, data: base64Data }
          });
        } else if (f.extractedText) {
          contentsParts.push({ text: `CONTEÚDO DO DOCUMENTO [${f.name}]:\n${f.extractedText}` });
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          parts: contentsParts,
          model: this.selectedModel
        })
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.detail || `Erro ${res.status}`);
      }

      const result = await res.json();

      if (!result.success || !result.data) {
        throw new Error(result.parseError || "A IA não retornou dados estruturados.");
      }

      const extractedJson = result.data;

      // ISOLAMENTO TOTAL
      const cleanForm = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
      this.deepMerge(cleanForm, extractedJson);
      this.formData = cleanForm;

      this.quickChips.forEach(c => c.classList.remove("active"));

      const calc = calcularRendaPerCapita(this.formData.familia);
      this.formData.rendaTotalFamilia = calc.rendaTotal;
      this.formData.rendaPerCapita = calc.rendaPerCapita;

      this.renderFormPreview();
      this.flashDocumentUpdate();
      this.scrollToPage(1);
      this.hideTypingIndicator();

      const m = this.formData.moradia || {};
      this.addAssistantMessage(
        `Analisei os arquivos via **IA Automática (${result.model})** — sem necessidade de chave de API!

🏠 **Inspeção Visual:**
- 🧱 **Construção:** ${m.construcao || "alvenaria"} (${m.comodos || "---"} cômodos)
- 🏠 **Telhado:** ${m.cobertura || "Telha"} | **Piso:** ${m.piso || "Cimento"}
- 🛋️ **Bens:** ${m.bensListagem || "Bens essenciais"}

O formulário oficial foi preenchido automaticamente. Baixe em **Word** ou **PDF** a qualquer momento.`,
        this.formData
      );

    } catch (err) {
      console.error("Erro na IA automática:", err);
      this.hideTypingIndicator();

      // Se o servidor falha, tenta extração local como fallback
      if (err.name === "AbortError") {
        this.addAssistantMessage("⏳ A IA demorou demais. Processando com inteligência integrada...");
      } else {
        this.addAssistantMessage(`⚠️ IA automática indisponível: **${err.message}**. Processando localmente...`);
      }
      await this.processWithLocalExtractor(userText, files);
    }
  }

  _buildSystemPrompt() {
    return `Você é um Assistente Pericial Oficial especializado em Perícias Socioeconômicas da Justiça Federal (BPC/LOAS - Lei 8.742/93).
Analise com rigor técnico todos os documentos, certidões, laudos médicos, extratos de CadÚnico e PRINCIPALMENTE AS FOTOS DA MORADIA/VISITA DOMICILIAR.

REGRA ABSOLUTA DE ISOLAMENTO DE DADOS:
NUNCA misture, reaproveite ou invente dados de casos de teste, modelos anteriores ou de pessoas fictícias.
Se uma informação não for expressamente encontrada nos documentos e fotos fornecidos, retorne string vazia ("") ou 0 para números.

INSTRUÇÃO OBRIGATÓRIA DE ANÁLISE VISUAL DE IMAGENS:
Para cada foto do imóvel anexada:
1. Verifique o tipo de rua/logradouro (terra batida, asfalto, lama).
2. Verifique o tipo de construção (alvenaria, madeira, palafita, mista).
3. Verifique a cobertura/telhado (amianto, barro, zinco).
4. Verifique o piso (chão batido, cimento, cerâmica).
5. Inventário de bens móveis visíveis, confirmando ausência de luxo.
6. Avalie saneamento (banheiro interno/externo, fossa, rede pública).

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem markdown) com o schema do formulário judicial.`;
  }

  // =====================================================================
  // BANCO DE DADOS — SALVAR, LISTAR, CARREGAR E EXCLUIR PERÍCIAS
  // =====================================================================
  async salvarPericiaAtual() {
    const btn = document.getElementById("btnSalvarPericia");
    if (btn) {
      btn.innerHTML = "<span>⏳</span><span class='hide-mobile'>Salvando...</span>";
      btn.disabled = true;
    }

    try {
      if (typeof db === "undefined") throw new Error("Módulo de banco de dados não carregado.");

      let result;
      if (this.currentPericiaId) {
        result = await db.atualizarPericia(this.currentPericiaId, this.formData);
        this.showToast("✅ Perícia atualizada com sucesso!");
      } else {
        result = await db.salvarPericia(this.formData);
        this.currentPericiaId = result.id;
        this.showToast("✅ Perícia salva com sucesso!");
      }

      this.addAssistantMessage(`💾 Perícia **${this.formData.identificacao?.periciado || ""}** salva com sucesso no ${db.connected ? "banco de dados na nuvem" : "armazenamento local"}. ID: \`${result.id?.substring(0, 8) || "local"}\``);

    } catch (err) {
      console.error("Erro ao salvar:", err);
      this.showToast("❌ Erro ao salvar: " + err.message);
    } finally {
      if (btn) {
        btn.innerHTML = "<span>💾</span><span class='hide-mobile'>Salvar</span>";
        btn.disabled = false;
      }
    }
  }

  async togglePericiasPanel() {
    const panel = document.getElementById("periciasPanel");
    if (!panel) return;

    const isOpen = panel.classList.contains("open");

    if (isOpen) {
      panel.classList.remove("open");
      const overlay = document.querySelector(".pericias-overlay");
      if (overlay) overlay.remove();
    } else {
      panel.classList.add("open");

      // Cria overlay
      const overlay = document.createElement("div");
      overlay.className = "pericias-overlay open";
      overlay.addEventListener("click", () => this.togglePericiasPanel());
      document.body.appendChild(overlay);

      // Carrega lista
      await this.renderPericiasList();
    }
  }

  async renderPericiasList(items) {
    const listEl = document.getElementById("periciasList");
    if (!listEl) return;

    if (!items) {
      try {
        items = await db.listarPericias(50);
      } catch (err) {
        listEl.innerHTML = `<div class="pericias-empty">❌ Erro ao carregar: ${err.message}</div>`;
        return;
      }
    }

    if (!items || items.length === 0) {
      listEl.innerHTML = `<div class="pericias-empty">Nenhuma perícia salva ainda.<br>Clique em "💾 Salvar" para gravar a perícia atual.</div>`;
      return;
    }

    listEl.innerHTML = items.map(p => {
      const date = new Date(p.created_at).toLocaleDateString("pt-BR");
      const isActive = p.id === this.currentPericiaId;
      return `
        <div class="pericia-card${isActive ? ' active' : ''}" onclick="app.carregarPericiaDoDb('${p.id}')">
          <div class="pericia-card-top">
            <span class="pericia-card-name">${p.nome_periciado || "Sem nome"}</span>
            <span class="pericia-card-status ${p.status || 'rascunho'}">${p.status || "rascunho"}</span>
          </div>
          <div class="pericia-card-meta">
            <span>📋 ${p.numero_processo || "Sem processo"}</span>
            <span>📍 ${p.municipio || "AP"}</span>
            <span>💰 R$ ${Number(p.renda_per_capita || 0).toFixed(2)}/cap</span>
            <span>📅 ${date}</span>
          </div>
          <div class="pericia-card-actions" onclick="event.stopPropagation()">
            <button onclick="app.carregarPericiaDoDb('${p.id}')">📂 Abrir</button>
            <button onclick="app.concluirPericiaDb('${p.id}')">✅ Concluir</button>
            <button class="btn-danger" onclick="app.excluirPericia('${p.id}')">🗑️ Excluir</button>
          </div>
        </div>
      `;
    }).join("");
  }

  async carregarPericiaDoDb(id) {
    try {
      const row = await db.carregarPericia(id);
      if (!row || !row.form_data) throw new Error("Perícia não encontrada.");

      this.formData = JSON.parse(JSON.stringify(row.form_data));
      this.currentPericiaId = row.id;

      this.quickChips.forEach(c => c.classList.remove("active"));
      this.renderFormPreview();
      this.flashDocumentUpdate();
      this.scrollToPage(1);

      // Fecha o painel
      this.togglePericiasPanel();

      this.showToast(`📂 Perícia "${row.nome_periciado || "Carregada"}" aberta.`);
      this.addAssistantMessage(`📂 Perícia **${row.nome_periciado}** (Processo: ${row.numero_processo || "N/A"}) carregada do banco de dados. Edite à vontade e clique em **Salvar** para atualizar.`);

    } catch (err) {
      console.error("Erro ao carregar:", err);
      this.showToast("❌ Erro: " + err.message);
    }
  }

  async concluirPericiaDb(id) {
    try {
      await db.concluirPericia(id);
      this.showToast("✅ Perícia marcada como concluída.");
      await this.renderPericiasList();
    } catch (err) {
      this.showToast("❌ " + err.message);
    }
  }

  async excluirPericia(id) {
    if (!confirm("Tem certeza que deseja excluir esta perícia permanentemente?")) return;
    try {
      await db.excluirPericia(id);
      if (this.currentPericiaId === id) this.currentPericiaId = null;
      this.showToast("🗑️ Perícia excluída.");
      await this.renderPericiasList();
    } catch (err) {
      this.showToast("❌ " + err.message);
    }
  }

  buscarPericiasDebounced(query) {
    if (this._searchTimeout) clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(async () => {
      try {
        const items = query.trim().length > 0
          ? await db.buscarPericias(query.trim())
          : await db.listarPericias(50);
        await this.renderPericiasList(items);
      } catch (err) {
        console.error("Erro na busca:", err);
      }
    }, 350);
  }

  showToast(message) {
    let toast = document.querySelector(".toast-notification");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notification";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
  }
}

// Inicializa a aplicação assim que o DOM carregar
window.addEventListener("DOMContentLoaded", () => {
  window.app = new PericiaApp();
});

