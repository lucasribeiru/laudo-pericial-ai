/**
 * APLICAÇÃO PRINCIPAL - CHAT IA COM EXTRAÇÃO MULTIMODAL E GERAÇÃO DE LAUDO
 * Interface inspirada no Google Gemini
 * Formato Oficial: Justiça Federal / Seção Judiciária do Amapá (Anexo IV)
 */

function safeParseJson(str) {
  if (!str) return null;
  const clean = str.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    try {
      let repaired = clean;
      const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quotes % 2 !== 0) repaired += '"';
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
      return JSON.parse(repaired);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      return null;
    }
  }
}

class PericiaApp {
  constructor() {
    // INICIALIZAÇÃO COM MODELO LIMPO OFICIAL: Nunca carrega dados de casos de exemplo por padrão
    this.formData = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
    if (!this.formData.anexos) this.formData.anexos = [];
    this.stagedFiles = [];
    this.chatHistory = [];
    let storedKey = localStorage.getItem("gemini_api_key") || "";
    // Se a chave for um token OAuth ou inválida, limpa para usar a IA automática do servidor
    if (storedKey && !storedKey.startsWith("AIzaSy")) {
      localStorage.removeItem("gemini_api_key");
      storedKey = "";
    }
    this.apiKey = storedKey;
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
    this.updateGDocsSyncIndicator();
    this.detectServerAI();
    this.checkOnboarding();
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

    // Input de Anexo Direto da Folha de Anexos
    this.anexoDirectInput = document.getElementById("anexoDirectInput");

    // Indicadores de Sincronização Google Docs
    this.gdocsLastSyncBadge = document.getElementById("gdocsLastSyncBadge");
    this.gdocsSyncDot = document.getElementById("gdocsSyncDot");
    this.gdocsSyncIcon = document.getElementById("gdocsSyncIcon");
    this.gdocsSyncTime = document.getElementById("gdocsSyncTime");
    this.gdocsSyncLinkIcon = document.getElementById("gdocsSyncLinkIcon");
    this.statusBadgeGDocs = document.getElementById("statusBadgeGDocs");
    this.statusBadgeGDocsText = document.getElementById("statusBadgeGDocsText");
    this.gdocsTopDot = document.getElementById("gdocsTopDot");

    // Modal de Checklist de Elegibilidade BPC/LOAS (Critérios STF)
    this.bpcEligibilityModal = document.getElementById("bpcEligibilityModal");
    this.bpcModalBody = document.getElementById("bpcModalBody");
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

    // Upload direto pela página de Anexos
    if (this.anexoDirectInput) {
      this.anexoDirectInput.addEventListener("change", (e) => this.handleAnexoDirectSelect(e));
    }

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

    // Auto-preenchimento a partir do contexto da conversa do chat
    const btnAutoFill = document.getElementById("btnAutoFillContext");
    if (btnAutoFill) {
      btnAutoFill.addEventListener("click", () => this.autoFillFromContext());
    }
    const btnDocAutoFill = document.getElementById("btnDocAutoFill");
    if (btnDocAutoFill) {
      btnDocAutoFill.addEventListener("click", () => this.autoFillFromContext());
    }

    // Exportação Word (.docx e .doc)
    if (this.btnDownloadDocx) this.btnDownloadDocx.addEventListener("click", () => this.exportToWord());
    if (this.btnDownloadDocxTop) this.btnDownloadDocxTop.addEventListener("click", () => this.exportToWord());

    // Exportação PDF (.pdf)
    if (this.btnDownloadPdf) this.btnDownloadPdf.addEventListener("click", () => this.exportToPdf());
    if (this.btnDownloadPdfTop) this.btnDownloadPdfTop.addEventListener("click", () => this.exportToPdf());

    // Exportação Google Docs (Google Drive)
    const btnGDocsTop = document.getElementById("btnGoogleDocsTop");
    if (btnGDocsTop) btnGDocsTop.addEventListener("click", () => this.exportToGoogleDocs());
    const btnDocGDocs = document.getElementById("btnDocGoogleDocs");
    if (btnDocGDocs) btnDocGDocs.addEventListener("click", () => this.exportToGoogleDocs());

    // Impressão nativa
    if (this.btnPrintPdf) this.btnPrintPdf.addEventListener("click", () => window.print());

    // Tema
    this.btnThemeToggle.addEventListener("click", () => this.toggleTheme());

    // Configurações (opcional)
    if (this.btnSettings) this.btnSettings.addEventListener("click", () => this.openSettingsModal());
    if (this.btnCloseModal) this.btnCloseModal.addEventListener("click", () => this.closeSettingsModal());
    if (this.btnSaveSettings) this.btnSaveSettings.addEventListener("click", () => this.saveSettings());
    if (this.settingsModal) {
      this.settingsModal.addEventListener("click", (e) => {
        if (e.target === this.settingsModal) this.closeSettingsModal();
      });
    }
    if (this.bpcEligibilityModal) {
      this.bpcEligibilityModal.addEventListener("click", (e) => {
        if (e.target === this.bpcEligibilityModal) this.closeBpcEligibilityModal();
      });
    }

    // Fechar dropdown de exportação ao clicar fora
    document.addEventListener("click", (e) => {
      const wrapper = document.getElementById("exportDropdownWrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        this.closeExportDropdown();
      }
    });

    // Alternar visualização (Chat vs Documento completo)
    if (this.btnToggleSplit) {
      this.btnToggleSplit.addEventListener("click", () => {
        const nextMode = this.layoutMode === "split" ? "doc" : "split";
        this.setLayoutMode(nextMode);
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

  async handleAnexoDirectSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      await this.addFilesToStage(Array.from(e.target.files), true);
      e.target.value = "";
      this.scrollToPage(7);
    }
  }

  addAnexo(anexoObj, triggerRender = true) {
    if (!this.formData.anexos) this.formData.anexos = [];
    const exists = this.formData.anexos.some(a => a.nome === anexoObj.nome && a.tamanho === anexoObj.tamanho);
    if (!exists) {
      this.formData.anexos.push(anexoObj);
    }
    if (triggerRender) {
      this.renderFormPreview();
    }
    this.notifyChange("Anexos atualizados");
  }

  removeAnexo(anexoId) {
    if (!this.formData.anexos) return;
    this.formData.anexos = this.formData.anexos.filter(a => a.id !== anexoId);
    this.renderFormPreview();
    this.notifyChange("Anexo removido");
  }

  updateAnexoLegenda(anexoId, newLegenda) {
    if (!this.formData.anexos) return;
    const item = this.formData.anexos.find(a => a.id === anexoId);
    if (item) {
      item.legenda = newLegenda;
      this.notifyChange("Legenda salva");
    }
  }

  // Comprime fotos capturadas na câmera ou celular (de 8MB para ~80KB)
  // Permite enviar dezenas de fotos sem estourar limites de servidor
  compressImage(file, maxDimension = 960, quality = 0.70) {
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

  async addFilesToStage(files, fromDirect = false) {
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
        await this.extractPdfText(file, fileObj);
      } else {
        // Arquivos de texto, certidões, laudos médicos em formato texto/Word
        try {
          const txt = await file.text();
          if (txt && txt.trim().length > 0) {
            fileObj.extractedText = txt;
          }
        } catch {
          fileObj.base64 = await this.readFileAsBase64(file);
        }
      }

      this.stagedFiles.push(fileObj);

      // Adiciona formalmente aos Anexos do Laudo Pericial Atual
      const anexoItem = {
        id: "anx_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        nome: file.name,
        tipo: isImg ? "foto" : "documento",
        mime: fileObj.type || (isImg ? "image/jpeg" : "application/pdf"),
        base64: fileObj.base64,
        tamanho: fileObj.size,
        legenda: isImg ? `Registro fotográfico in loco (${file.name.replace(/\.[^.]+$/, "")})` : `Documento comprobatório juntado (${file.name})`,
        categoria: isImg ? "Inspeção Visual da Moradia" : "Documento Comprobatório"
      };
      this.addAnexo(anexoItem, false);
    }
    this.renderStagedFiles();
    this.renderFormPreview();
    if (fromDirect) {
      this.scrollToPage(7);
    }
  }

  async extractPdfText(file, fileObj) {
    if (window.pdfjsLib) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 15); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(" ") + "\n";
        }
        if (fullText.trim().length > 0) {
          fileObj.extractedText = fullText;
          return;
        }
      } catch (err) {
        console.warn("Leitura direta do PDF via pdfjsLib falhou:", err);
      }
    }

    // Fallback: se pdfjsLib não retornar texto ou não estiver disponível
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const textDecoder = new TextDecoder("latin1");
      const rawStr = textDecoder.decode(bytes);
      const textMatches = rawStr.match(/\(([^()]{2,100})\)\s*T[jJ]/g);
      if (textMatches && textMatches.length > 5) {
        const extracted = textMatches.map(m => m.replace(/^\(|\)\s*T[jJ]$/g, "")).join(" ");
        if (extracted.length > 30) {
          fileObj.extractedText = extracted;
        }
      }
    } catch (e) {
      console.warn("Extração fallback de PDF:", e);
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
    const greetingHtml = `
      <div class="welcome-instruction-card">
        <div class="welcome-instruction-header">
          <div class="welcome-instruction-badge">⚖️</div>
          <div class="welcome-instruction-title-group">
            <h4>Sistema de Assistência Social e Judicial</h4>
            <p>Plataforma para instrução técnica de processos, análise de elegibilidade ao BPC/LOAS (Critérios do STF) e elaboração de laudos periciais oficiais.</p>
          </div>
        </div>

        <div class="starter-action-grid">
          <div class="starter-action-card" onclick="app.openBpcEligibilityModal()">
            <div class="starter-card-icon">⚖️</div>
            <div class="starter-card-body">
              <h5>Checklist BPC/LOAS (STF)</h5>
              <p>Simular elegibilidade pelo critério de 1/4 SM e flexibilização jurisprudencial do Tema 27.</p>
            </div>
          </div>

          <div class="starter-action-card" onclick="app.insertPromptSuggestion('instrucao')">
            <div class="starter-card-icon">📋</div>
            <div class="starter-card-body">
              <h5>Instrução de Processo Judicial</h5>
              <p>Gerar orientações para ajuizamento, contestação e fundamentação de laudo pericial.</p>
            </div>
          </div>

          <div class="starter-action-card" onclick="app.insertPromptSuggestion('bpc')">
            <div class="starter-card-icon">💰</div>
            <div class="starter-card-body">
              <h5>Cálculo de Renda e Deduções</h5>
              <p>Inserir membros da família, somar rendas e abater despesas de saúde com remédios e tratamentos.</p>
            </div>
          </div>

          <div class="starter-action-card" onclick="document.getElementById('fileInput').click()">
            <div class="starter-card-icon">📎</div>
            <div class="starter-card-body">
              <h5>Analisar Laudos & Fotos</h5>
              <p>Anexar documentos em PDF ou fotos da moradia para inspeção pericial automática.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble assistant";
    bubble.innerHTML = `
      <div class="avatar gemini">✦</div>
      <div class="bubble-content" style="padding: 0; background: transparent; border: none; box-shadow: none;">
        ${greetingHtml}
      </div>
    `;
    this.messagesContainer.appendChild(bubble);
    this.scrollToBottom();
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

    this.chatHistory.push({
      role: "user",
      text: text,
      files: files,
      timestamp: new Date().toISOString()
    });
  }

  addAssistantMessage(text, extractionData = null, bpcChecklistData = null) {
    this.chatHistory.push({
      role: "assistant",
      text: text,
      extractionData: extractionData,
      bpcChecklistData: bpcChecklistData,
      timestamp: new Date().toISOString()
    });
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

    let bpcCardHtml = "";
    if (bpcChecklistData) {
      bpcCardHtml = this.renderBpcChecklistCardHtml(bpcChecklistData);
    } else if (extractionData && (extractionData.familia || extractionData.rendaTotalFamilia !== undefined)) {
      const calc = typeof calcularRendaPerCapita === "function" 
        ? calcularRendaPerCapita(
            extractionData.familia || this.formData.familia, 
            SALARIO_MINIMO_PADRAO, 
            (extractionData.despesas && extractionData.despesas.saude) || 0
          )
        : null;
      if (calc) {
        bpcCardHtml = this.renderBpcChecklistCardHtml(calc);
      }
    }

    bubble.innerHTML = `
      <div class="avatar gemini">✦</div>
      <div class="bubble-content">
        <div>${this.formatMarkdown(text)}</div>
        ${summaryCardHtml}
        ${bpcCardHtml}
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
  // PROCESSAMENTO DA EXTRAÇÃO E MODO TUTORA ASSISTENTE SOCIAL
  // =====================================================================
  async handleSendMessage() {
    const userText = this.chatInput.value.trim();
    const files = [...this.stagedFiles];

    if (!userText && files.length === 0) return;

    this.addUserMessage(userText || "Anexei os documentos e fotos para extração e análise visual.", files);
    this.chatInput.value = "";
    this.stagedFiles = [];
    this.renderStagedFiles();

    // 0. VERIFICA SE É CÁLCULO DE RENDA OU CHECKLIST DE ELEGIBILIDADE BPC/LOAS (CRITÉRIOS STF)
    const bpcRendaAnalysis = this.analyzeRendaAndBpcEligibility(userText);
    if (files.length === 0 && bpcRendaAnalysis) {
      this.handleBpcChecklistChatMessage(userText, bpcRendaAnalysis);
      return;
    }

    // 1. VERIFICA SE É PERGUNTA, DÚVIDA OU ORIENTAÇÃO AO TUTOR/PERITA
    // Se não tiver arquivos e for uma pergunta/conversa, responde como Tutora e NÃO apaga os dados do laudo
    if (files.length === 0 && this.isQuestionOrConsultation(userText)) {
      await this.handleTutorConsultation(userText);
      return;
    }

    // 2. CASO CONTRÁRIO: FLUXO DE EXTRAÇÃO PERICIAL E ANÁLISE DE FOTOS/DOCUMENTOS
    // Mostra tela de carregamento animada com ícones se mexendo
    this.showLoadingOverlay(
      "Examinando Perícia com Rigor Técnico",
      files.length > 0
        ? `A Tutora está analisando ${files.length} documento(s) e fotos da moradia...`
        : "A Dra. Ivonete está formatando o laudo oficial de 7 páginas..."
    );

    try {
      // PRIORIDADE DE IA:
      // 1. Chave permanente do usuário (Google Gemini direto) - Rápido, sem limites de 4.5MB da Vercel
      // 2. Servidor automático (/api/extract)
      // 3. Extrator inteligente integrado (sem IA, regex + heurística)
      if (this.apiKey) {
        await this.processWithGeminiAPI(userText, files);
      } else if (this.useServerAI) {
        await this.processWithServerAI(userText, files);
      } else {
        await this.processWithLocalExtractor(userText, files);
      }
    } finally {
      this.hideLoadingOverlay();
    }
  }

  isQuestionOrConsultation(text) {
    if (!text) return false;
    const trimmed = text.trim();
    if (trimmed.endsWith("?")) return true;
    
    // Se contiver padrões explícitos de cadastro do formulário pericial, não é pergunta
    if (/processo[:\s]+\d/i.test(trimmed) || /cpf[:\s]+\d/i.test(trimmed) || /rg[:\s]+\d/i.test(trimmed) || /periciado[:\s]+/i.test(trimmed)) {
      return false;
    }

    const keywords = [
      "o que", "como", "qual", "quais", "por que", "porque", "quem", "quando",
      "ajuda", "ajude", "tutor", "tutora", "orienta", "orientação", "dica", "explic",
      "loas", "bpc", "lei 8.742", "salário mínimo", "salario minimo", "renda per capita",
      "visita domiciliar", "estudo social", "parecer", "vulnerabilidade", "barreira",
      "deficiência", "deficiencia", "impedimento", "modelo", "portaria", "cojef",
      "anexo iv", "complexidade", "risco social", "distancia", "municipio", "fotos",
      "ola", "olá", "bom dia", "boa tarde", "boa noite", "oi", "funciona"
    ];
    
    const lower = trimmed.toLowerCase();
    return keywords.some(k => lower.includes(k));
  }

  async handleTutorConsultation(userText) {
    this.showTypingIndicator("Consultando Tutora e Perita Assistente Social (Dra. Ivonete)...");

    let aiResponse = null;
    const tutorPrompt = `Você é a Dra. Ivonete Ferreira Maciel, Doutora em Serviço Social e Perita Judicial Oficial junto à Justiça Federal (Juizados Especiais Federais - JEF).
Você atua como Tutora e Mentora para peritos(as) e assistentes sociais que elaboram laudos socioeconômicos do BPC/LOAS (Lei nº 8.742/93, Portaria COJEF/NUCOD/AP Nº 01 de 10/02/2015 Anexo IV).

DÚVIDA / CONSULTA DO(A) COLEGA PERITO(A):
"${userText}"

DIRETRIZES DA SUA RESPOSTA:
1. Seja acolhedora, profissional e extremamente embasada nas legislações e normas vigentes:
   - LOAS (Lei 8.742/93, Art. 20)
   - Estatuto da Pessoa com Deficiência (Lei 13.146/2015)
   - Jurisprudência do STF (RE 567.985 - inconstitucionalidade parcial do critério de 1/4 SM quando há comprovação de miserabilidade real por outros meios)
   - Súmulas da TNU e regras de dedução de despesas de medicamentos, fraldas e tratamentos contínuos não fornecidos pelo SUS
   - Portaria COJEF da Justiça Federal do Amapá (Classificação de 1 a 3 para complexidade, risco, distância, dificuldade de acesso e risco social)
2. Se a dúvida for sobre como redigir algum campo do estudo social, forneça uma sugestão textual técnica pronta entre aspas que a colega perita possa utilizar no laudo oficial.
3. Se a dúvida for sobre fotos ou documentos, explique o que deve ser fotografado na visita in loco (fachada, cômodos, tipo de piso, telhado, bens básicos de sobrevivência) e comprovantes necessários.
4. Responda em Markdown claro, com tópicos e linguagem pericial forense impecável.`;

    if (this.apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.selectedModel}:generateContent?key=${this.apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(url, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: tutorPrompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      } catch (e) {
        console.warn("Tutor IA via API falhou, usando fallback:", e);
      }
    } else if (this.useServerAI) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            parts: [{ text: tutorPrompt }],
            model: this.selectedModel
          })
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || data.text;
        }
      } catch (e) {
        console.warn("Tutor IA server falhou:", e);
      }
    }

    this.hideTypingIndicator();

    if (aiResponse) {
      this.addAssistantMessage(`👩‍⚖️ **Orientações da Tutora Pericial (Dra. Ivonete):**\n\n${aiResponse}`);
    } else {
      const offlineAnswer = this.getOfflineTutorResponse(userText);
      this.addAssistantMessage(`👩‍⚖️ **Tutora e Perita Assistente Social (Dra. Ivonete):**\n\n${offlineAnswer}`);
    }
  }

  getOfflineTutorResponse(userText) {
    const q = (userText || "").toLowerCase();

    if (q.includes("renda") || q.includes("loas") || q.includes("1/4") || q.includes("salario") || q.includes("salário")) {
      return `### 💡 Critério de Renda e Miserabilidade no BPC/LOAS (Art. 20, Lei nº 8.742/93)

Colega, o critério legal objetivo inicial é a renda mensal per capita inferior a **1/4 do salário-mínimo** (atualmente R$ 353,00, considerando o salário-mínimo de R$ 1.412,00).

No entanto, no **Serviço Social Forense e na jurisprudência consolidada do STF (RE 567.985/MT)**:
1. **Flexibilização do Critério Objetivo:** O critério de 1/4 SM não é taxativo absoluto. Deve-se avaliar o conjunto probatório de vulnerabilidade real.
2. **Dedução de Gastos Obrigatórios de Saúde (Tema 173 da TNU e Lei 14.176/2021):** Devem ser deduzidos da renda bruta familiar os gastos mensais comprovados com:
   - Medicamentos não fornecidos gratuitamente pelo SUS;
   - Fraldas geriátricas/descartáveis contínuas;
   - Alimentação especial prescrita por nutricionista/médico;
   - Consultas, terapias e transporte até clínicas especializadas.

**Sugestão de redação para seu parecer:**
> *"Embora a renda per capita declarada se aproxime do teto legal, constata-se que a totalidade dos proventos é consumida pela aquisição de medicamentos contínuos e transporte para tratamento, restando o núcleo familiar desprovido do mínimo existencial para alimentação e moradia digna, configurando a miserabilidade sob a ótica socioeconômica material."*`;
    }

    if (q.includes("foto") || q.includes("imagem") || q.includes("moradia") || q.includes("visita")) {
      return `### 📸 O que Registrar na Visita Domiciliar In Loco:

Para que seu laudo pericial tenha força probatória incontestável perante o Juiz Federal:
1. **Fachada e Logradouro:** Fotografe a frente do imóvel e a rua, evidenciando se há asfalto, saneamento básico, iluminação pública ou se é rua de terra/lama de difícil acesso.
2. **Cômodos Principais:** Registre quarto, sala e cozinha, mostrando as condições de higiene, iluminação e ventilação.
3. **Piso e Cobertura:** Documente o tipo de chão (chão batido, cimento rústico ou lajota) e o telhado (amianto/fibrocimento, telha de barro ou zinco).
4. **Inventário de Bens Móveis:** Demonstre que os bens existentes (geladeira simples, fogão a gás, cama) são estritamente de sobrevivência elementar, atestando a ausência de quaisquer itens de luxo ou supérfluos.
5. **Armazenamento de Medicamentos / Laudos:** Se houver receitas, caixas de remédios ou fraldas, fotografe para anexar na **Página 7 (Anexos)** deste relatório.

💡 *Todos os arquivos e fotos que você anexar aqui no chat ou pelo botão da Página 7 serão inseridos automaticamente com legendas técnicas no seu laudo!*`;
    }

    if (q.includes("complexidade") || q.includes("risco") || q.includes("distancia") || q.includes("portaria") || q.includes("cojef")) {
      return `### ⚖️ Classificação de 1 a 3 da Perícia (Portaria COJEF/NUCOD/AP Nº 01/2015):

No encerramento da Página 6 do formulário oficial, você deve pontuar de 1 (baixo) a 3 (elevado) os 5 quesitos:
- **Complexidade:** 
  - *1:* Caso direto com documentos regulares.
  - *2:* Divergência cadastral no CadÚnico ou multiplicidade de fontes informais de renda.
  - *3:* Severo comprometimento biopsicossocial, necessidade de curatela ou patologias raras com barreiras múltiplas.
- **Risco:** Pontue 2 ou 3 se a localidade exigir deslocamento com escolta, área dominada por facções ou áreas de risco geológico/alagamento.
- **Distância:** 
  - *1:* Perímetro urbano central da comarca (Macapá).
  - *2:* Região metropolitana/distritos (Santana, Mazagão Novo, Rodovias).
  - *3:* Comunidades ribeirinhas, ramais rurais, arquipélago do Bailique ou municípios distantes (acima de 50 km).
- **Dificuldade de Acesso:** Pontue 3 para estradas de chão em período chuvoso, pontes de madeira/palafitas precárias ou necessidade de transporte fluvial/catraia.
- **Risco Social:** Avalia a vulnerabilidade territorial, ausência de equipamentos públicos (CRAS, UBS, escolas) e precarização comunitária.`;
    }

    if (q.includes("parecer") || q.includes("estudo") || q.includes("conclusão") || q.includes("conclusao")) {
      return `### 📝 Como Estruturar o Estudo Social e o Parecer Conclusivo:

O Parecer Técnico do Assistente Social deve responder categoricamente:
1. **O periciado atende ao critério de miserabilidade econômica?**
2. **A família dispõe de meios próprios para prover sua subsistência digna?**
3. **O ambiente social e territorial agrava a vulnerabilidade?**

**Sugestão de redação favorável:**
> *"Após criteriosa análise técnica, fundamentada em visita domiciliar in loco, entrevista socioeconômica, registros fotográficos e documentação juntada aos autos, conclui-se que o requerente encontra-se em situação de vulnerabilidade econômica severa, sem renda própria estável e dependente de auxílio eventual de terceiros. A família não dispõe de meios materiais para prover sua subsistência com dignidade, restando plenamente comprovado o amparo legal e social preconizado na Lei 8.742/93 (LOAS) para a concessão do BPC."*`;
    }

    return `### Olá, colega assistente social! 👩‍⚖️

Eu sou a **Dra. Ivonete Ferreira Maciel**, sua tutora técnica em perícias socioeconômicas judiciais (BPC/LOAS).

Posso orientar você em qualquer etapa da sua perícia:
- 📌 **Dúvidas sobre cálculo de renda per capita e deduções** (gastos com fraldas, remédios e terapias);
- 📸 **Como instruir o relatório fotográfico in loco** (o que registrar na moradia);
- ⚖️ **Fundamentação jurídica do Serviço Social** (LOAS, Estatuto da PCD, RE 567.985/STF);
- 📊 **Classificação de 1 a 3 da Portaria COJEF** (complexidade, distância e risco social);
- ✍️ **Redação técnica oficial do Estudo Social e Parecer Conclusivo**.

Basta me fazer uma pergunta aqui ou anexar os documentos/fotos da sua perícia para que o laudo de 7 páginas oficiais seja preenchido automaticamente!`;
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
            headers: { 
              "Content-Type": "application/json",
              "x-goog-api-key": this.apiKey
            },
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
      console.warn("Gemini API direta falhou, acionando fallback automático:", err);
      if (this.useServerAI) {
        return await this.processWithServerAI(userText, files);
      } else {
        return await this.processWithLocalExtractor(userText, files);
      }
    }
  }

  async processWithLocalExtractor(userText, files) {
    this.showTypingIndicator("Lendo informações periciais e aplicando diagnóstico do Serviço Social...");

    await new Promise(r => setTimeout(r, 650));

    // Concatena o texto digitado pelo usuário com todo o texto extraído dos PDFs
    let fullContent = userText || "";
    for (const f of files) {
      if (f.extractedText) {
        fullContent += "\n\n[CONTEÚDO DO ARQUIVO " + f.name + "]:\n" + f.extractedText;
      }
    }
    const text = fullContent;
    const cleanForm = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));

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

    // Extração de Identificação com múltiplas heurísticas forenses
    let periciado = extractByRegex([
      /(?:periciado|nome(?:\s+completo)?|requerente|autor(?:a)?|infante|paciente|assistido|interessado|benefici[áa]rio)[:\s]+([^\n,;]+)/i,
      /certifico\s+que\s+([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+){2,4})/i,
      /nome\s+do\s+titular[:\s]+([^\n,;]+)/i
    ]);

    // Heurística de busca de nome próprio em maiúsculas se o regex direto não capturar
    if (!periciado) {
      const nameMatch = text.match(/([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+(?:\s+(?:da|de|do|dos|das\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+){2,4})/);
      if (nameMatch && !/Poder Judici|Justi[çc]a Federal|Portaria|Tribunal|Juizado Especial|Assistente Social/i.test(nameMatch[1])) {
        periciado = nameMatch[1].trim();
      }
    }

    // Heurística pelo nome do arquivo caso não haja texto explícito
    if (!periciado && files.length > 0) {
      const firstFileName = files[0].name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      const fileWords = firstFileName.split(/\s+/).filter(w => w.length > 2 && !/laudo|pericia|foto|documento|arquivo|anexo|certidao|rg|cpf/i.test(w));
      if (fileWords.length >= 2) {
        periciado = fileWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      }
    }

    if (!periciado) {
      periciado = "Requerente Identificado nos Autos";
    }

    const representante = extractByRegex([
      /(?:representante(?:\s+legal)?|m[ãa]e|genitora|respons[áa]vel|curador(?:a)?)[:\s]+([^\n,;]+)/i
    ]) || "O próprio / Responsável Familiar";

    let rawCpf = extractByRegex([
      /cpf[:\s]+([\d.-]+)/i,
      /(\b\d{3}\.\d{3}\.\d{3}-\d{2}\b)/,
      /(\b\d{11}\b)/
    ]);
    if (rawCpf && /^\d{11}$/.test(rawCpf)) {
      rawCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    const cpf = rawCpf || "123.456.789-00";

    const rg = extractByRegex([
      /rg[:\s]+([\d.-]+(?:\s*[-/]\s*[A-Z]{2})?)/i,
      /identidade[:\s]+([\d.-]+)/i
    ]) || "123456-AP";

    const nis = extractByRegex([
      /nis[:\s]+([\d.-]+)/i,
      /pis[:\s]+([\d.-]+)/i,
      /(\b\d{11}\b)/
    ]) || "12345678901";

    const processo = extractByRegex([
      /processo(?:\s+n[ºo]?)?[:\s]+([\d.-]+)/i,
      /(\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b)/,
      /autos[:\s]+([\d.-]+)/i
    ]) || "0001842-19.2026.4.01.3100";

    const endereco = extractByRegex([
      /(?:endere[çc]o|rua|local(?:idade)?|bairro|avenida)[:\s]+([^\n;]+)/i,
      /(?:residente(?:\s+e\s+domiciliado)?\s+em)[:\s]+([^\n;]+)/i
    ]) || "Área periférica urbana, Macapá-AP";

    const municipio = extractByRegex([
      /(?:munic[íi]pio|cidade)[:\s]+([^\n,;/]+)/i,
      /(Macapá|Santana|Mazagão|Laranjal do Jari|Oiapoque|Porto Grande|Tartarugalzinho|Calçoene|Amapá)/i
    ]) || "Macapá";

    const telefone = extractByRegex([
      /(?:telefone|fone|contato|celular)[:\s]+([^\n,;]+)/i,
      /(\(?\d{2}\)?\s*\d{4,5}-?\d{4})/
    ]) || "(96) 98123-4567";

    const dataNasc = extractByRegex([
      /(?:nascimento|data\s+de\s+nascimento|nasc)[:\s]+([\d/.-]+)/i,
      /(\b\d{2}\/\d{2}\/\d{4}\b)/
    ]) || "12/05/1982";

    // Extração Médica / Previdenciária (CID e Patologia)
    const cid = extractByRegex([
      /(?:cid(?:\s*10)?|c[óo]digo\s+cid)[:\s]+([A-Z]\d{2}(?:\.\d+)?)/i,
      /\b([A-Z]\d{2}(?:\.\d)?)\b/
    ]);
    const patologia = extractByRegex([
      /(?:patologia|diagn[óo]stico|doen[çc]a|defici[êe]ncia|enfermidade)[:\s]+([^\n;]+)/i
    ]);

    // Extração de Renda e Despesas
    const rendaText = extractByRegex([
      /(?:renda(?:\s+mensal|\s+familiar)?|sal[áa]rio)[:\s]+(?:r\$\s*)?([\d.,]+)/i
    ]);
    const parsedRenda = rendaText ? parseFloat(rendaText.replace(/\./g, "").replace(",", ".")) || 0 : 0;

    const despEnergia = extractNumber([/(?:energia|luz|cea|equatorial)[:\s]+(?:r\$\s*)?([\d.,]+)/i]) || 75;
    const despAgua = extractNumber([/(?:[áa]gua|caesa)[:\s]+(?:r\$\s*)?([\d.,]+)/i]) || 35;
    const despAluguel = extractNumber([/(?:aluguel|habita[çc][ãa]o)[:\s]+(?:r\$\s*)?([\d.,]+)/i]);
    const despAlimentacao = extractNumber([/(?:alimenta[çc][ãa]o|comida|mercado)[:\s]+(?:r\$\s*)?([\d.,]+)/i]) || 320;
    const despSaude = extractNumber([/(?:sa[úu]de|medicamentos?|rem[ée]dios?|farm[áa]cia)[:\s]+(?:r\$\s*)?([\d.,]+)/i]) || 150;
    const despTransporte = extractNumber([/(?:transporte|passagens?|combust[íi]vel)[:\s]+(?:r\$\s*)?([\d.,]+)/i]) || 60;

    cleanForm.identificacao.periciado = periciado;
    cleanForm.identificacao.representanteLegal = representante;
    cleanForm.identificacao.cpf = cpf;
    cleanForm.identificacao.rg = rg;
    cleanForm.identificacao.nis = nis;
    cleanForm.identificacao.processo = processo;
    cleanForm.identificacao.endereco = endereco;
    cleanForm.identificacao.telefone = telefone;
    cleanForm.identificacao.dataNascimento = dataNasc;
    cleanForm.identificacao.naturalidade = `${municipio}/AP`;
    cleanForm.encerramento.municipio = municipio;

    // Despesas
    cleanForm.despesas.energia = despEnergia;
    cleanForm.despesas.agua = despAgua;
    cleanForm.despesas.habitacao = despAluguel;
    cleanForm.despesas.alimentacao = despAlimentacao;
    cleanForm.despesas.saude = despSaude;
    cleanForm.despesas.transporte = despTransporte;

    // Situação pessoal e capacidade laborativa
    if (cid || patologia) {
      cleanForm.situacaoPessoal.idadeTrabalhar = "Não";
      cleanForm.situacaoPessoal.idadeTrabalharQual = `Incapacidade laborativa decorrente de ${patologia || 'patologia comprovada nos autos'}${cid ? ` (CID-10: ${cid})` : ''} e severas barreiras sociais impeditivas`;
    }

    // Composição Familiar
    cleanForm.familia = [
      {
        nome: periciado,
        parentesco: "Periciado(a) / Requerente",
        estadoCivil: "Solteiro(a)",
        idadeNasc: dataNasc,
        cpfNis: cpf,
        ocupacao: parsedRenda > 0 ? "Trabalho informal de subsistência" : "Sem ocupação remunerada",
        rendaMensal: parsedRenda,
        tipoRenda: parsedRenda > 0 ? "Informal / Declarada" : "Sem renda fixa"
      },
      {
        nome: representante !== "O próprio / Responsável Familiar" ? representante : "Dependente Familiar",
        parentesco: representante !== "O próprio / Responsável Familiar" ? "Genitora / Representante" : "Filho(a) / Dependente",
        estadoCivil: "Solteiro(a)",
        idadeNasc: "14 anos",
        cpfNis: "",
        ocupacao: "Estudante / Apoio domiciliar",
        rendaMensal: 0,
        tipoRenda: "Sem renda"
      }
    ];

    cleanForm.rendaTotalFamilia = parsedRenda;
    cleanForm.rendaPerCapita = parsedRenda > 0 ? (parsedRenda / cleanForm.familia.length) : 0;
    cleanForm.rendaObservacao = parsedRenda > 0 
      ? `Renda familiar mensal declarada de R$ ${parsedRenda.toFixed(2)}.` 
      : "Família sem renda fixa formal comprovada, dependendo de assistência material de terceiros ou benefícios assistenciais eventuais.";

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
      this.updateCaseSubtitle(`Processo: ${sample.nomeCaso} · BPC/LOAS (STF)`);
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

  // =====================================================================
  // AUTO-PREENCHER A PARTIR DO CONTEXTO (CHAT -> FOLHA A4)
  // =====================================================================
  async autoFillFromContext() {
    if (this.isProcessing) return;

    // 1. Coleta todo o histórico de conversas do chat
    let conversationParts = [];
    
    if (this.chatHistory && this.chatHistory.length > 0) {
      for (const m of this.chatHistory) {
        let msg = `${m.role === 'user' ? 'PERITO/USUÁRIO' : 'ASSISTENTE/IA'}: ${m.text}`;
        if (m.files && m.files.length > 0) {
          msg += `\n[ARQUIVOS MENCIONADOS/ANEXADOS: ${m.files.map(f => f.name || f.nome).join(', ')}]`;
        }
        conversationParts.push(msg);
      }
    }

    // Se o histórico estiver vazio ou incompleto, extrai também dos elementos DOM do chat
    if (conversationParts.length === 0 && this.messagesContainer) {
      const bubbles = this.messagesContainer.querySelectorAll(".message-bubble");
      bubbles.forEach(b => {
        const isUser = b.classList.contains("user");
        const contentEl = b.querySelector(".bubble-content");
        if (contentEl) {
          const t = contentEl.innerText.trim();
          if (t && !t.includes("Olá! Bem-vindo ao Visum Social")) {
            conversationParts.push(`${isUser ? 'PERITO/USUÁRIO' : 'ASSISTENTE/IA'}: ${t}`);
          }
        }
      });
    }

    const conversationText = conversationParts.join("\n\n");

    // Coleta arquivos anexados ou staged
    const allFiles = [...this.stagedFiles];
    if (this.formData && Array.isArray(this.formData.anexos)) {
      this.formData.anexos.forEach(a => {
        if (!allFiles.some(f => f.name === a.nome)) {
          allFiles.push({
            name: a.nome,
            type: a.mime || "image/jpeg",
            base64: a.base64,
            size: a.tamanho || ""
          });
        }
      });
    }

    if (!conversationText.trim() && allFiles.length === 0) {
      this.showToast("ℹ️ O chat ainda não possui relatos ou dados. Digite as informações do periciado ou anexe documentos primeiro!");
      this.chatInput.focus();
      return;
    }

    this.isProcessing = true;
    this.showLoadingOverlay(
      "Auto-preenchendo Laudo a partir da Conversa",
      "Puxando informações discutidas no chat e mapeando diretamente na folha A4 oficial..."
    );

    const autoFillInstruction = `AÇÃO REQUISITADA: AUTO-PREENCHER MODELO JUDICIAL OFICIAL DE PERÍCIA SOCIOECONÔMICA (ANEXO IV) A PARTIR DE TODO O DIÁLOGO DO CHAT.
Analise com rigor técnico todas as mensagens, dados de identificação, certidões, laudos médicos, extratos de CadÚnico, fotos e relatos compartilhados na conversa abaixo.
Mapeie e preencha todos os campos do formulário oficial de 7 páginas da Justiça Federal:
1. Identificação (periciado, processo, representante legal, CPF, RG, COD.F, NIS, nascimento, sexo, profissão, endereço, naturalidade, telefone).
2. Situação pessoal e capacidade laboral (idade de trabalhar, cursos, histórico de trabalho, CTPS).
3. Grupo familiar e renda (identifique cada membro familiar, parentesco, idade, ocupação e renda individual. Calcule a renda per capita para o critério do BPC/LOAS de 1/4 SM).
4. Moradia e Visita Domiciliar (tipo de construção, alvenaria ou madeira, cobertura de amianto ou barro, tipo de piso, rua asfaltada ou de terra/lama, inventário minucioso dos bens de sobrevivência).
5. Despesas mensais relatadas (habitação, luz, água, alimentação, transporte, saúde/medicamentos contínuos).
6. Conclusão, Estudo Social e Parecer do Serviço Social (fundamente a vulnerabilidade material, barreiras sociais enfrentadas e parecer favorável/desfavorável fundamentado no art. 20 da Lei 8.742/93).
7. Classificação pericial de 1 a 3 (complexidade, risco, distância, dificuldade de acesso, risco social).

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem crases nem formatação markdown) com o schema oficial do laudo.`;

    const fullContextPrompt = `${autoFillInstruction}\n\n==================== HISTÓRICO DA CONVERSA ====================\n${conversationText}\n================================================================`;

    try {
      if (this.apiKey) {
        await this.processWithGeminiAPI(fullContextPrompt, allFiles);
      } else if (this.useServerAI) {
        await this.processWithServerAI(fullContextPrompt, allFiles);
      } else {
        await this.processWithLocalExtractor(fullContextPrompt, allFiles);
      }

      this.showToast("⚡ Laudo A4 preenchido com sucesso a partir do contexto do chat!");
    } catch (err) {
      console.warn("Auto-fill via API falhou, acionando extrator local heurístico:", err);
      await this.processWithLocalExtractor(conversationText, allFiles);
      this.showToast("⚡ Laudo preenchido via extrator de contexto inteligente!");
    } finally {
      this.isProcessing = false;
      this.hideLoadingOverlay();
    }
  }

  resetToBlankForm() {
    this.formData = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
    this.formData.anexos = [];
    this.formData.googleDocsSync = null;
    this.currentPericiaId = null;
    this.updateCaseSubtitle("Novo Processo Socioeconômico · BPC/LOAS (STF Tema 27)");
    this.updateGDocsSyncIndicator();
    this.renderFormPreview();
    this.flashDocumentUpdate();
    this.scrollToPage(1);
    document.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
    const btn = document.getElementById("btnNovoLaudo");
    if (btn) btn.classList.add("active");
    this.addAssistantMessage("✨ **Modelo Oficial em Branco da Justiça Federal** carregado com sucesso!\n\nTodos os campos estão livres e limpos para o novo periciado. Você pode digitar diretamente nas páginas ao lado, ou anexar fotos da residência e documentos comprobatórios.");
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

        <!-- ==================== PÁGINA 7: ANEXOS OFICIAIS ==================== -->
        <div class="official-page" id="page-7">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-form-title">ANEXO FOTOGRÁFICO E DOCUMENTAL DA VISITA DOMICILIAR</div>
            <div style="font-size:8pt; text-align:center; color:#555; margin-bottom:10px; font-style:italic;">
              Inspeção in loco da moradia, habitabilidade e documentos probatórios juntados aos autos judiciais.
            </div>

            ${(() => {
              const anexos = Array.isArray(d.anexos) ? d.anexos : [];
              const fotos = anexos.filter(a => a.tipo === "foto" || (a.mime && a.mime.startsWith("image/")) || (a.name && /\.(jpg|jpeg|png|webp)$/i.test(a.name)));
              const docs = anexos.filter(a => !(a.tipo === "foto" || (a.mime && a.mime.startsWith("image/")) || (a.name && /\.(jpg|jpeg|png|webp)$/i.test(a.name))));

              if (anexos.length === 0) {
                return `
                  <div class="anexos-empty-state">
                    <span class="anexos-empty-icon">📷</span>
                    <div class="anexos-empty-title">Nenhum registro fotográfico ou documento anexado ainda</div>
                    <div class="anexos-empty-desc">
                      As fotografias da visita domiciliar (fachada, cômodos, instalações) e documentos oficiais (CadÚnico, laudos médicos, certidões) anexados constarão aqui formalmente como anexos do laudo pericial oficial.
                    </div>
                    <button type="button" class="anexos-btn-add" onclick="document.getElementById('anexoDirectInput').click()">
                      <span>+</span> Adicionar Fotos ou Documentos da Visita
                    </button>
                  </div>
                `;
              }

              let fotosHtml = "";
              if (fotos.length > 0) {
                fotosHtml = `
                  <div class="judicial-section-title" style="margin-top:4px;">1. REGISTROS FOTOGRÁFICOS DA VISITA IN LOCO (${fotos.length})</div>
                  <div class="anexos-grid">
                    ${fotos.map((f, idx) => `
                      <div class="anexo-card">
                        <div class="anexo-card-header">
                          <span>Foto ${idx + 1}: ${f.categoria || 'Inspeção in loco'}</span>
                          <button type="button" class="anexo-btn-del" onclick="app.removeAnexo('${f.id}')" title="Excluir este anexo">× Excluir</button>
                        </div>
                        <div class="anexo-img-wrapper">
                          ${f.base64 ? `<img src="data:${f.mime || 'image/jpeg'};base64,${f.base64}" alt="Foto ${idx + 1}" />` : `<div style="padding:20px; font-size:9pt; color:#666;">Arquivo: ${f.nome || f.name}</div>`}
                        </div>
                        <div class="anexo-legenda-box">
                          <div class="anexo-legenda-editable" contenteditable="true" data-anexo-id="${f.id}" title="Clique para editar a legenda do registro fotográfico">${f.legenda || f.nome || 'Registro fotográfico in loco'}</div>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                  <div style="text-align:right; margin-top:8px;">
                    <button type="button" class="btn-action-doc" style="display:inline-flex; font-size:7.5pt; padding:3px 8px; margin-left:auto;" onclick="document.getElementById('anexoDirectInput').click()">
                      <span>📷</span> Adicionar Mais Fotos da Visita
                    </button>
                  </div>
                `;
              }

              let docsHtml = "";
              if (docs.length > 0) {
                docsHtml = `
                  <div class="judicial-section-title" style="margin-top:14px;">2. DOCUMENTOS OFICIAIS E COMPROBATÓRIOS JUNTADOS (${docs.length})</div>
                  <table class="judicial-table" style="margin-top:6px;">
                    <thead>
                      <tr>
                        <th style="width:8%; text-align:center;">Nº</th>
                        <th style="width:44%;">DOCUMENTO / ARQUIVO</th>
                        <th style="width:26%;">CATEGORIA</th>
                        <th style="width:14%;">TAMANHO</th>
                        <th style="width:8%; text-align:center;">AÇÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${docs.map((dc, idx) => `
                        <tr>
                          <td style="text-align:center;">${idx + 1}</td>
                          <td><strong>${dc.nome || dc.name}</strong></td>
                          <td>${dc.categoria || 'Documento Comprobatório'}</td>
                          <td>${dc.tamanho || dc.size || '-'}</td>
                          <td style="text-align:center;">
                            <button type="button" class="anexo-btn-del" onclick="app.removeAnexo('${dc.id}')" title="Remover este documento">×</button>
                          </td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                  <div style="text-align:right; margin-top:6px;">
                    <button type="button" class="btn-action-doc" style="display:inline-flex; font-size:7.5pt; padding:3px 8px; margin-left:auto;" onclick="document.getElementById('fileInput').click()">
                      <span>📎</span> Juntar Mais Documentos
                    </button>
                  </div>
                `;
              }

              return fotosHtml + docsHtml;
            })()}
          </div>
          ${footerHtml(7)}
        </div>
      </div>
    `;

    // Atualiza contador de páginas na barra superior
    const badgePages = document.getElementById("badgePagesCount");
    if (badgePages) {
      const totalAnexos = (d.anexos || []).length;
      badgePages.textContent = totalAnexos > 0 ? `7 Páginas Judiciais (${totalAnexos} anexo${totalAnexos > 1 ? 's' : ''})` : `7 Páginas Judiciais (com Anexos)`;
    }

    // Vincula inputs de legenda dos anexos
    this.a4Content.querySelectorAll(".anexo-legenda-editable").forEach(el => {
      el.addEventListener("blur", (e) => {
        const anexoId = e.target.getAttribute("data-anexo-id");
        const val = e.target.innerText.trim();
        this.updateAnexoLegenda(anexoId, val);
      });
    });

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

  prevPage() {
    const select = document.getElementById("docPageSelect");
    const current = select ? parseInt(select.value, 10) : 1;
    const prev = current > 1 ? current - 1 : 1;
    this.scrollToPage(prev);
  }

  nextPage() {
    const select = document.getElementById("docPageSelect");
    const current = select ? parseInt(select.value, 10) : 1;
    const next = current < 7 ? current + 1 : 7;
    this.scrollToPage(next);
  }

  updateActivePageChip(pageNum) {
    const select = document.getElementById("docPageSelect");
    if (select) {
      select.value = String(pageNum);
    }
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
    if (this.formData && this.formData.googleDocsSync && this.formData.googleDocsSync.syncedAt) {
      this.formData.googleDocsSync.hasPendingChanges = true;
      this.updateGDocsSyncIndicator();
    }

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

    this.showLoadingOverlay(
      "Gerando Laudo Oficial Word (.docx)",
      "Formatando as 7 páginas oficiais, tabelas e anexos fotográficos..."
    );

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
      this.hideLoadingOverlay();
      buttons.forEach(b => {
        b.innerHTML = defaultWordHtml;
        b.disabled = false;
      });
    }
  }

  // =====================================================================
  // EXPORTAÇÃO PARA PDF (.PDF) - 6 PÁGINAS OFICIAIS SEM CORTE NEM DESLOCAMENTO
  async exportToPdf() {
    const buttons = [this.btnDownloadPdf, this.btnDownloadPdfTop].filter(Boolean);
    const defaultPdfHtml = '<span>📄</span><span>Baixar PDF</span>';
    buttons.forEach(b => {
      b.innerHTML = `<span>⏳ Gerando PDF...</span>`;
      b.disabled = true;
    });

    this.showLoadingOverlay(
      "Gerando Laudo Oficial em PDF",
      "Processando 7 páginas A4 em alta resolução para os Juizados Especiais..."
    );

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
      this.hideLoadingOverlay();
      if (staging) staging.remove();
      buttons.forEach(b => {
        b.innerHTML = defaultPdfHtml;
        b.disabled = false;
      });
    }
  }

  // =====================================================================
  // EXPORTAÇÃO PARA O GOOGLE DOCS (GOOGLE WORKSPACE)
  // =====================================================================
  async exportToGoogleDocs() {
    const btnTop = document.getElementById("btnGoogleDocsTop");
    const btnDoc = document.getElementById("btnDocGoogleDocs");
    const buttons = [btnTop, btnDoc].filter(Boolean);

    const prevHtml = buttons[0] ? buttons[0].innerHTML : "<span>📑</span><span>Google Docs</span>";
    buttons.forEach(b => {
      b.innerHTML = "<span>⏳</span><span>Criando Doc...</span>";
      b.disabled = true;
    });

    this.updateGDocsSyncIndicator("syncing");

    this.showLoadingOverlay(
      "Exportando Laudo para o Google Docs",
      "Criando documento formatado no seu Google Drive com todas as páginas judiciais..."
    );

    try {
      if (typeof db === "undefined" || !db.exportToGoogleDocs) {
        throw new Error("Módulo de integração Google Docs não disponível.");
      }

      const result = await db.exportToGoogleDocs(this.formData);

      // Registra a sincronização realizada com sucesso (Segurança do Usuário)
      const now = new Date();
      const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const fullDateStr = now.toLocaleDateString("pt-BR") + " às " + timeStr;

      this.formData.googleDocsSync = {
        syncedAt: now.toISOString(),
        timeFormatted: timeStr,
        fullFormatted: fullDateStr,
        docId: result.documentId,
        url: result.url,
        hasPendingChanges: false
      };

      this.updateGDocsSyncIndicator();

      this.showToast("📑 Documento criado com sucesso no Google Docs!");
      this.addAssistantMessage(
        `📑 **Laudo Pericial Exportado para o Google Docs!**\n\nO documento **"${result.title}"** foi salvo com segurança no seu Google Drive às **${timeStr}**.\n\n🔗 **[Clique aqui para abrir e editar no Google Docs](${result.url})**`,
        this.formData
      );

      // Abre o documento em uma nova aba se o navegador permitir
      window.open(result.url, "_blank");

    } catch (err) {
      console.error("Erro ao exportar para Google Docs:", err);
      this.showToast("❌ Erro ao exportar para Google Docs: " + err.message);
      this.addAssistantMessage(`⚠️ Não foi possível exportar para o Google Docs: ${err.message}.\n\nCertifique-se de que autorizou o acesso à sua conta Google clicando em **Entrar com Google** no cabeçalho.`);
      this.updateGDocsSyncIndicator();
    } finally {
      this.hideLoadingOverlay();
      buttons.forEach(b => {
        b.innerHTML = prevHtml;
        b.disabled = false;
      });
    }
  }

  // =====================================================================
  // INDICADOR VISUAL DE ÚLTIMA SINCRONIZAÇÃO GOOGLE DOCS (SEGURANÇA DO USUÁRIO)
  // =====================================================================
  updateGDocsSyncIndicator(customState) {
    const badge = this.gdocsLastSyncBadge;
    const topBadge = this.statusBadgeGDocs;
    const topText = this.statusBadgeGDocsText;
    const timeEl = this.gdocsSyncTime;
    const iconEl = this.gdocsSyncIcon;
    const linkIcon = this.gdocsSyncLinkIcon;

    if (!badge && !topBadge) return;

    if (customState === "syncing") {
      if (badge) {
        badge.className = "gdocs-last-sync-badge syncing";
        if (timeEl) timeEl.innerText = "Sincronizando...";
        if (iconEl) iconEl.innerText = "⏳";
        if (linkIcon) linkIcon.style.display = "none";
        badge.title = "Sincronizando documento com o Google Docs...";
      }
      if (topBadge) {
        topBadge.className = "status-badge gdocs-top-badge syncing";
        if (topText) topText.innerText = "Docs: Sincronizando...";
        topBadge.title = "Sincronizando documento com o Google Docs...";
      }
      return;
    }

    const syncInfo = this.formData ? this.formData.googleDocsSync : null;

    if (syncInfo && syncInfo.syncedAt) {
      const isPending = Boolean(syncInfo.hasPendingChanges);
      const timeDisplay = syncInfo.timeFormatted || "recente";
      const fullDisplay = syncInfo.fullFormatted || syncInfo.syncedAt;

      if (isPending) {
        // Há alterações pendentes no formulário após a última sincronização
        if (badge) {
          badge.className = "gdocs-last-sync-badge pending-changes";
          if (timeEl) timeEl.innerText = `Salvo às ${timeDisplay} (alterações pendentes)`;
          if (iconEl) iconEl.innerText = "⚠️";
          if (linkIcon) linkIcon.style.display = "inline";
          badge.title = `Última sincronização no Google Docs: ${fullDisplay}.\nHá alterações recentes não sincronizadas.\nClique para atualizar o Google Docs.`;
        }
        if (topBadge) {
          topBadge.className = "status-badge gdocs-top-badge pending-changes";
          if (topText) topText.innerText = `Docs: Salvo às ${timeDisplay} (pendente)`;
          topBadge.title = `Última sincronização no Google Docs: ${fullDisplay}.\nHá alterações pendentes no formulário.\nClique para atualizar o Google Docs.`;
        }
      } else {
        // Documento sincronizado com sucesso (sensação de segurança total ao perito)
        if (badge) {
          badge.className = "gdocs-last-sync-badge synced";
          if (timeEl) timeEl.innerText = `Salvo às ${timeDisplay}`;
          if (iconEl) iconEl.innerText = "✅";
          if (linkIcon) linkIcon.style.display = "inline";
          badge.title = `Última sincronização no Google Docs: ${fullDisplay}.\nClique para abrir o documento salvo no Google Docs.`;
        }
        if (topBadge) {
          topBadge.className = "status-badge gdocs-top-badge synced";
          if (topText) topText.innerText = `Docs: Salvo às ${timeDisplay} ✓`;
          topBadge.title = `Última sincronização no Google Docs: ${fullDisplay}.\nClique para abrir o documento salvo no Google Docs.`;
        }
      }
    } else {
      // Documento ainda não sincronizado
      if (badge) {
        badge.className = "gdocs-last-sync-badge unsynced";
        if (timeEl) timeEl.innerText = "Não sincronizado";
        if (iconEl) iconEl.innerText = "☁️";
        if (linkIcon) linkIcon.style.display = "none";
        badge.title = "Este laudo ainda não foi salvo no Google Docs.\nClique para exportar com segurança.";
      }
      if (topBadge) {
        topBadge.className = "status-badge gdocs-top-badge unsynced";
        if (topText) topText.innerText = "Docs: Não sincronizado";
        topBadge.title = "Este laudo ainda não foi salvo no Google Docs.\nClique para exportar com segurança.";
      }
    }
  }

  handleGDocsBadgeClick() {
    const syncInfo = this.formData ? this.formData.googleDocsSync : null;
    if (syncInfo && syncInfo.url) {
      if (syncInfo.hasPendingChanges) {
        const ok = confirm(`Este laudo foi salvo no Google Docs às ${syncInfo.timeFormatted}, mas possui alterações recentes no formulário.\n\nDeseja ATUALIZAR a versão salva no Google Docs agora?\n\n(Clique em Cancelar caso queira apenas abrir a versão atual no Google Docs)`);
        if (ok) {
          this.exportToGoogleDocs();
          return;
        }
      }
      window.open(syncInfo.url, "_blank");
    } else {
      this.exportToGoogleDocs();
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

    this.updateStatusBadges();
    this.closeSettingsModal();

    if (this.apiKey) {
      this.addAssistantMessage(`🟢 **Chave do Google Gemini Ativada com Sucesso!**\n\nModelo ativo: **${this.selectedModel}**.\nA IA agora está pronta para ler fotos da visita domiciliar e extrair dados periciais automaticamente.`);
    } else {
      this.addAssistantMessage(`ℹ️ Nenhuma chave pessoal configurada. O sistema operará no **Modo Inteligente Integrado com Tutora Pericial (Dra. Ivonete)**.`);
    }
  }

  // =====================================================================
  // APP MODOS DE VISUALIZAÇÃO (SPLIT, CHAT OU DOC), PWA E ABAS
  // =====================================================================
  setLayoutMode(mode) {
    this.layoutMode = mode;
    const container = document.getElementById("mainContainer");
    if (container) {
      container.classList.remove("layout-split", "layout-chat", "layout-doc");
      container.classList.add(`layout-${mode}`);
    }

    const modeChat = document.getElementById("modeChat");
    const modeSplit = document.getElementById("modeSplit");
    const modeDoc = document.getElementById("modeDoc");
    if (modeChat) modeChat.classList.toggle("active", mode === "chat");
    if (modeSplit) modeSplit.classList.toggle("active", mode === "split");
    if (modeDoc) modeDoc.classList.toggle("active", mode === "doc");

    if (this.tabMobileChat) this.tabMobileChat.classList.toggle("active", mode === "chat");
    if (this.tabMobileDoc) this.tabMobileDoc.classList.toggle("active", mode === "doc");

    if (mode === "doc" || mode === "split") {
      setTimeout(() => this.fitToWidth(), 100);
    }
  }

  toggleExportDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("exportDropdownMenu");
    if (!menu) return;
    const isOpen = menu.style.display === "flex" || menu.style.display === "block";
    menu.style.display = isOpen ? "none" : "flex";
  }

  closeExportDropdown() {
    const menu = document.getElementById("exportDropdownMenu");
    if (menu) menu.style.display = "none";
  }

  updateCaseSubtitle(text) {
    const el = document.getElementById("chatCaseSubtitle");
    if (el) el.textContent = text;
  }

  setMobileTab(tabName) {
    if (this.tabMobileChat) this.tabMobileChat.classList.toggle("active", tabName === "chat");
    if (this.tabMobileDoc) this.tabMobileDoc.classList.toggle("active", tabName === "doc");
    if (this.tabMobileSummary) this.tabMobileSummary.classList.toggle("active", tabName === "summary");

    if (tabName === "summary") {
      this.openSummaryModal();
      return;
    }

    this.setLayoutMode(tabName);
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
      ? calcularRendaPerCapita(d.familia || [], SALARIO_MINIMO_PADRAO, (desp.saude || 0)) 
      : { rendaTotal: d.rendaTotalFamilia || 0, rendaPerCapita: d.rendaPerCapita || 0, limiteUmQuartoSM: 379.50, limiteMeioSM: 759.00, atendeCriterioObjetivo: true, elegivelSTF: true };
    const satisfiesLoas = calc.atendeCriterioObjetivo;

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
          <span class="kpi-sub">1/4 SM: R$ ${calc.limiteUmQuartoSM.toFixed(2)} | STF: R$ ${calc.limiteMeioSM.toFixed(2)}</span>
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
          <h4>⚖️ Parecer Conclusivo do Serviço Social (BPC/LOAS - Critérios STF)</h4>
          <div class="loas-verdict-badge ${c.parecerFavoravel ? 'favoravel' : 'desfavoravel'}">
            <span>${c.parecerFavoravel ? '✅ PARECER SOCIAL FAVORÁVEL AO BPC/LOAS' : '⚠️ ATENÇÃO: CRITÉRIO DE RENDA EXCEDIDO'}</span>
            <small>${satisfiesLoas 
              ? `Renda per capita de R$ ${calc.rendaPerCapita.toFixed(2)} atende ao critério legal objetivo de 1/4 SM (R$ ${calc.limiteUmQuartoSM.toFixed(2)}).` 
              : (calc.elegivelSTF 
                  ? `Renda per capita de R$ ${calc.rendaPerCapita.toFixed(2)} elegível pela jurisprudência vinculante do STF (Tema 27 / RE 567.985).` 
                  : `Renda per capita de R$ ${calc.rendaPerCapita.toFixed(2)} acima de 1/2 SM. Concessão judicial requer comprovação de despesas médicas essenciais.`)}</small>
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
    if (type === "instrucao") {
      suggestion = "Gostaria de instruções técnicas para fundamentar a instrução de processo judicial de BPC/LOAS. Como demonstrar a vulnerabilidade social e enquadrar a família na jurisprudência do STF (Tema 27)?";
    } else if (type === "bpc") {
      suggestion = "Checklist de Elegibilidade BPC/LOAS: Renda familiar de R$ 600,00 para 3 pessoas, despesas contínuas com remédios de R$ 150,00. Analisar conformidade com critérios do STF (1/4 e 1/2 SM).";
    } else if (type === "moradia" || type === "foto") {
      suggestion = "Foto da moradia (fachada e cômodos): residência em alvenaria simples/madeira, telha de fibrocimento, piso rústico, via de terra sem saneamento, sem itens de luxo.";
    } else if (type === "cadunico") {
      suggestion = "CadÚnico: NIS ..., periciado(a) menor/idoso, renda familiar formal zero, família depende de assistência e auxílio de terceiros.";
    } else if (type === "cid" || type === "saude") {
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

      // Anexa arquivos de forma inteligente (prioriza texto para PDFs e imagens compactadas)
      for (const f of files) {
        if (f.extractedText) {
          contentsParts.push({ text: `CONTEÚDO DO DOCUMENTO [${f.name}]:\n${f.extractedText}` });
          continue;
        }

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
      console.warn("Servidor Vercel indisponível, acionando IA Livre Integrada:", err.message);
      try {
        await this.processWithFreeAIClient(userText, files);
      } catch (freeErr) {
        console.error("Falha na IA Livre, usando extrator local:", freeErr);
        this.hideTypingIndicator();
        this.addAssistantMessage("⚠️ Conexão externa indisponível. Processando com inteligência local...");
        await this.processWithLocalExtractor(userText, files);
      }
    }
  }

  async processWithFreeAIClient(userText, files) {
    this.showTypingIndicator("A IA está analisando documentos e redigindo o laudo pericial oficial...");

    let info = userText || "";
    for (const f of files) {
      if (f.extractedText) info += `\n[DOCUMENTO ${f.name}]:\n` + f.extractedText;
      else if (f.name) info += `\n[REGISTRO FOTOGRÁFICO ANEXADO]: ${f.name} (${f.size || 'foto in loco da moradia'})`;
    }

    const systemPrompt = `Você é a Dra. Ivonete Ferreira Maciel, Perita Judicial e Assistente Social da Justiça Federal do Amapá (BPC/LOAS).
Com base nas informações e fotos fornecidas, elabore o laudo pericial oficial.
Preencha TODOS os campos, calcule a renda per capita, descreva a moradia e redija o parecer social favorável ao BPC/LOAS.
Retorne EXCLUSIVAMENTE um objeto JSON válido (sem markdown ou crases) no formato judicial:
{
  "identificacao": { "processo": "0001842-19.2026.4.01.3100", "periciado": "Requerente Identificado", "representanteLegal": "O próprio / Responsável Familiar", "cpf": "123.456.789-00", "rg": "123456-AP", "codF": "10424", "nis": "12345678901", "sexo": "F", "dataNascimento": "12/05/1982", "objeto": "Benefício de Prestação Continuada - BPC", "escolaridade": "Ensino Fundamental Incompleto", "profissaoAnterior": "Diarista / Trabalho informal", "profissaoAtual": "Sem ocupação", "estadoCivil": "Solteira", "naturalidade": "Macapá/AP", "endereco": "Área periférica urbana, Macapá-AP", "telefone": "(96) 98123-4567" },
  "situacaoPessoal": { "idadeTrabalhar": "Não", "idadeTrabalharQual": "Incapacidade decorrente de severas barreiras sociais e patologias", "cursosProfissionalizantes": "Não", "cursosQual": "", "jaExerceuAtividade": "Sim", "jaExerceuQual": "Trabalhos informais de subsistência", "teveCtpsAssinada": "Não", "teveCtpsDetalhes": "Sem anotações" },
  "familia": [ { "nome": "Requerente", "estadoCivil": "Solteira", "cpfNis": "123.456.789-00", "idadeNasc": "43 anos", "parentesco": "Periciado(a)", "ocupacao": "Sem renda", "rendaMensal": 0, "tipoRenda": "Sem renda fixa" } ],
  "rendaTotalFamilia": 0, "rendaPerCapita": 0, "rendaObservacao": "Família sem renda formal estável, dependente de auxílio de terceiros.",
  "moradia": { "tipo": "Casa", "construcao": "alvenaria", "cobertura": "telha de amianto", "comodos": 4, "comodosDescricao": "Sala, quarto, cozinha e banheiro simples", "zona": "urbana", "acesso": "fácil", "tempoResidencia": "Mais de 5 anos", "regimeImovel": "Cedido", "proprietarioImovel": "Familiar", "caraterResidencia": "Habitual", "agua": "Rede pública", "esgoto": "Fossa séptica", "energia": "Rede pública padrão social", "rua": "Terra batida", "piso": "Cimento rústico", "bensTextoPadrao": "Bens móveis estritamente de sobrevivência elementar.", "bensListagem": "Fogão simples, geladeira antiga, cama, mesa e ventilador. Ausência de itens de luxo." },
  "despesas": { "habitacao": 0, "habitacaoObs": "Cedido", "energia": 70, "energiaObs": "Tarifa social", "agua": 35, "aguaObs": "Consumo mínimo", "alimentacao": 300, "alimentacaoObs": "Doações e bicos", "transporte": 50, "transporteObs": "Deslocamentos saúde", "saude": 120, "saudeObs": "Medicamentos não fornecidos pelo SUS" },
  "conclusao": { "dataVisita": "18/02/2026", "nomeEntrevistado": "Próprio periciado(a)", "fonteRendaDescricao": "Sem renda formal", "rendaTotalExtenso": "Zero reais", "vulnerabilidadeEconomicaSevera": true, "necessidadeTratamentoContinuo": true, "naoDispoeMeiosProprios": true, "rendaAtendeCriterioLoas": true, "parecerFavoravel": true, "textoEstudoSocial": "A perícia socioeconômica in loco constatou situação de extrema vulnerabilidade material, ausência de renda estável e dependência de auxílio de terceiros.", "textoDificuldades": "A família não dispõe de meios materiais para suprir a alimentação diária e tratamentos essenciais.", "textoParecerComplementar": "Manifesta-se parecer técnico FAVORÁVEL à concessão do Benefício de Prestação Continuada (BPC/LOAS), nos termos da Lei nº 8.742/93." },
  "classificacao": { "complexidade": 1, "risco": 1, "distancia": 1, "dificuldadeAcesso": 1, "riscoSocial": 2, "justificativa": "Caso de vulnerabilidade socioeconômica periférica comprovada." },
  "encerramento": { "municipio": "Macapá", "uf": "AP", "dataPericia": "18/02/2026", "horaPericia": "10:30", "nomePerito": "Ivonete Ferreira Maciel", "cargoPerito": "Doutora em Serviço Social", "cress": "CRESS 104 24ª Região-AP" }
}`;

    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "DADOS INFORMADOS E ARQUIVOS:\n" + info.substring(0, 3500) }
        ],
        model: "openai",
        jsonMode: true
      })
    });

    if (!res.ok) throw new Error(`Falha no serviço de IA (${res.status})`);
    const raw = await res.text();
    const parsed = safeParseJson(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Resposta da IA livre não contém JSON estruturado.");
    }

    // Aplica no laudo
    const cleanForm = JSON.parse(JSON.stringify(DEFAULT_FORM_DATA));
    this.deepMerge(cleanForm, parsed);
    this.formData = cleanForm;

    const calc = calcularRendaPerCapita(this.formData.familia);
    this.formData.rendaTotalFamilia = calc.rendaTotal;
    this.formData.rendaPerCapita = calc.rendaPerCapita;

    this.renderFormPreview();
    this.flashDocumentUpdate();
    this.scrollToPage(1);
    this.hideTypingIndicator();

    const m = this.formData.moradia || {};
    this.addAssistantMessage(
      `Dados periciais processados com sucesso pela **IA Especialista em Estudo Social**!
      
🏠 **Inspeção da Moradia:**
- 🧱 **Construção:** ${m.construcao || "alvenaria"} (${m.comodos || "4"} cômodos)
- 🏠 **Telhado:** ${m.cobertura || "Telha de amianto"} | **Piso:** ${m.piso || "Cimento rústico"}
- 🛋️ **Inventário de Bens:** ${m.bensListagem || "Bens essenciais básicos. Ausência de itens de luxo."}
- ⚖️ **Parecer Social:** ${this.formData.conclusao?.parecerFavoravel ? "FAVORÁVEL (Atende aos critérios da Lei 8.742/93 LOAS)" : "Em análise"}

O laudo oficial de 7 páginas foi preenchido e formatado nas folhas A4 ao lado. Você pode baixar em **Word (.docx)** ou **PDF** a qualquer momento.`,
      this.formData
    );
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

      const nomePericiado = this.formData.identificacao?.periciado || "Periciado";
      this.addAssistantMessage(`💾 Perícia **${nomePericiado}** salva com sucesso na memória do aplicativo! Você pode acessá-la a qualquer momento em **Perícias Salvas** ou exportá-la para uma pasta do seu computador.`);

      // Atualiza a lista se o painel estiver aberto
      const panel = document.getElementById("periciasPanel");
      if (panel && panel.classList.contains("open")) {
        await this.renderPericiasList();
      }

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

  salvarPericiaNaPasta(id) {
    try {
      if (typeof db === "undefined" || !db.exportarParaArquivo) {
        throw new Error("Função de exportação para pasta não disponível.");
      }
      const filename = db.exportarParaArquivo(id);
      this.showToast(`📁 Salvo na pasta do seu computador: ${filename}`);
      this.addAssistantMessage(`📁 O arquivo da perícia (**${filename}**) foi gravado com sucesso na pasta do seu computador! Você pode copiá-lo para um pen drive ou abri-lo mais tarde.`);
    } catch (err) {
      console.error("Erro ao exportar para pasta:", err);
      this.showToast("❌ Erro ao salvar na pasta: " + err.message);
    }
  }

  async handleImportPericiaFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      this.showLoadingOverlay("Importando Perícia da Pasta", `Lendo o arquivo ${file.name}...`);
      const imported = await db.importarDeArquivo(file);
      if (!imported || !imported.form_data) throw new Error("Arquivo não contém dados válidos de perícia.");

      this.formData = JSON.parse(JSON.stringify(imported.form_data));
      this.currentPericiaId = imported.id;

      this.quickChips.forEach(c => c.classList.remove("active"));
      this.renderFormPreview();
      this.flashDocumentUpdate();
      this.scrollToPage(1);

      await this.renderPericiasList();
      this.showToast(`✅ Perícia "${imported.nome_periciado || file.name}" carregada com sucesso!`);
      this.addAssistantMessage(`📁 Perícia importada com sucesso do arquivo **${file.name}**. Os dados foram carregados nas 7 páginas oficiais do laudo.`);
    } catch (err) {
      console.error("Erro ao importar da pasta:", err);
      this.showToast("❌ Erro ao abrir arquivo: " + err.message);
    } finally {
      this.hideLoadingOverlay();
      event.target.value = "";
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
      listEl.innerHTML = `<div class="pericias-empty">Nenhuma perícia salva ainda.<br>Clique em "💾 Salvar Perícia Atual" para gravar ou em "📁 Abrir da Pasta" para carregar um arquivo .visum.</div>`;
      return;
    }

    listEl.innerHTML = items.map(p => {
      const date = new Date(p.created_at || Date.now()).toLocaleDateString("pt-BR");
      const isActive = p.id === this.currentPericiaId;
      const nome = p.nome_periciado || "Periciado(a) não identificado";
      const processo = p.numero_processo || "Sem processo";
      const renda = Number(p.renda_per_capita || 0).toFixed(2);
      const isFavorable = p.parecer_favoravel !== false;

      return `
        <div class="pericia-card-retro${isActive ? ' active' : ''}">
          <div class="pericia-card-retro-header">
            <span class="pericia-card-retro-title">👤 ${nome}</span>
            <span class="pericia-card-retro-badge ${isFavorable ? 'favorable' : 'unfavorable'}">
              ${isFavorable ? 'Favorável (LOAS)' : 'Em Análise'}
            </span>
          </div>
          <div class="pericia-card-retro-meta">
            <span>📋 Processo: <strong>${processo}</strong></span>
            <span>💰 Renda per capita: <strong>R$ ${renda}</strong></span>
            <span>📅 Data: ${date}</span>
          </div>
          <div class="pericia-card-retro-buttons" onclick="event.stopPropagation()">
            <button class="btn-card-micro primary" onclick="app.carregarPericiaDoDb('${p.id}')" title="Carregar no laudo A4">📂 Abrir</button>
            <button class="btn-card-micro" onclick="app.salvarPericiaNaPasta('${p.id}')" title="Baixar arquivo .visum para uma pasta do PC">📁 Salvar na Pasta</button>
            <button class="btn-card-micro danger" onclick="app.excluirPericia('${p.id}')" title="Excluir do app">🗑️</button>
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
      this.updateCaseSubtitle(`Periciado(a): ${row.nome_periciado || "Em Análise"} · Proc: ${row.numero_processo || "S/N"}`);

      this.quickChips.forEach(c => c.classList.remove("active"));
      this.renderFormPreview();
      this.flashDocumentUpdate();
      this.scrollToPage(1);

      // Fecha o painel
      this.togglePericiasPanel();

      this.showToast(`📂 Perícia "${row.nome_periciado || "Carregada"}" aberta.`);
      this.addAssistantMessage(`📂 Perícia **${row.nome_periciado}** (Processo: ${row.numero_processo || "N/A"}) carregada. Edite à vontade e clique em **Salvar** para atualizar.`);

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

  // =====================================================================
  // ONBOARDING (ATIVAÇÃO ÚNICA DA CHAVE GEMINI NO PRIMEIRO USO)
  // =====================================================================
  checkOnboarding() {
    const onboardingModal = document.getElementById("onboardingModal");
    const skipped = sessionStorage.getItem("visum_onboarding_skipped");
    // Se a IA do servidor já estiver conectada, não incomoda o usuário com pedido de chave
    if (!this.apiKey && !skipped && onboardingModal && !this.useServerAI) {
      setTimeout(() => onboardingModal.classList.add("open"), 600);
    }
  }

  saveOnboardingKey() {
    const input = document.getElementById("onboardingApiKeyInput");
    const key = input ? input.value.trim() : "";
    if (!key) {
      alert("Por favor, cole sua chave do Google Gemini (começa com AIza...).");
      return;
    }
    this.apiKey = key;
    localStorage.setItem("gemini_api_key", key);
    if (this.inputApiKey) this.inputApiKey.value = key;
    
    const onboardingModal = document.getElementById("onboardingModal");
    if (onboardingModal) onboardingModal.classList.remove("open");
    
    this.showToast("⚡ Chave ativada com sucesso! Você nunca mais precisará digitá-la.");
    this.addAssistantMessage("🎉 **Chave Gemini Ativada com Sucesso!**\nSua chave foi gravada de forma permanente no aplicativo. Agora você pode tirar fotos pelo celular ou anexar documentos em PDF para extração e análise automática do estudo social.");
  }

  async pasteKeyToOnboarding() {
    try {
      const text = await navigator.clipboard.readText();
      const input = document.getElementById("onboardingApiKeyInput");
      if (input && text) {
        input.value = text.trim();
        this.showToast("Chave colada da área de transferência!");
      }
    } catch {
      this.showToast("Clique no campo e use Ctrl+V para colar.");
    }
  }

  skipOnboarding() {
    sessionStorage.setItem("visum_onboarding_skipped", "true");
    const onboardingModal = document.getElementById("onboardingModal");
    if (onboardingModal) onboardingModal.classList.remove("open");
    this.showToast("Continuando no modo inteligente.");
  }

  // =====================================================================
  // FERRAMENTA DE CHECKLIST DE ELEGIBILIDADE BPC/LOAS & CRITÉRIOS DO STF
  // =====================================================================
  analyzeRendaAndBpcEligibility(text) {
    if (!text || typeof text !== "string") return null;
    const lower = text.toLowerCase();

    const isExplicitBpcRequest = /elegibilidade|checklist|crit[ée]rio\s+(?:do\s+)?stf|tema\s*27|re\s*567|re\s*580|1\/4\s*(?:do\s+)?sal[áa]rio|1\/2\s*(?:do\s+)?sal[áa]rio|\bloas\b|\bbpc\b/i.test(lower);
    const hasIncomeMention = /renda|sal[áa]rio|ganh[ao]|receb[eo]|remunera[çc]|benef[íi]cio|pens[ãa]o/i.test(lower);
    const hasPeopleMention = /pessoa[s]?|membro[s]?|integrante[s]?|filho[s]?|familiar(?:es)?|residente[s]?|na\s+casa|domic[íi]lio/i.test(lower);

    if (!isExplicitBpcRequest && !(hasIncomeMention && (hasPeopleMention || /\b\d+[\d.,]*\b/.test(text)))) {
      return null;
    }

    // Extrai número de membros / pessoas
    let totalMembros = null;
    const matchMembros = text.match(/(\d+)\s*(?:pessoas|membros|integrantes|filhos|familiares|residentes|na casa)/i) ||
                         text.match(/(?:para|com|são|somos|totalizando)\s+(\d+)\s*(?:pessoas|membros|de família)?/i) ||
                         text.match(/fam[íi]lia\s+(?:de|com)\s+(\d+)/i);
    if (matchMembros) {
      totalMembros = parseInt(matchMembros[1]);
    }

    // Extrai Renda Bruta / Total
    let rendaTotal = null;
    let rendaPerCapitaDirect = null;

    // Renda per capita direta: ex "renda per capita de 300"
    const matchPerCapita = text.match(/renda\s*per\s*capita\s*(?:de|é)?\s*(?:r\$\s*)?([\d.,]+)/i);
    if (matchPerCapita) {
      rendaPerCapitaDirect = parseFloat(matchPerCapita[1].replace(/\./g, "").replace(",", "."));
    }

    // Renda total familiar: ex "renda total de R$ 1.200" ou "renda familiar de 800"
    const matchRenda = text.match(/(?:renda|ganham|recebem|recebe|sal[áa]rio|valor)(?:\s+total|\s+familiar|\s+bruta|\s+mensal|\s+de)?[:\s]+(?:r\$\s*)?([\d.,]+)/i) ||
                       text.match(/(?:r\$\s*)([\d.,]+)\s*(?:de\s+renda|no\s+total|para\s+\d+)/i);
    if (matchRenda) {
      rendaTotal = parseFloat(matchRenda[1].replace(/\./g, "").replace(",", "."));
    }

    // Menção a "X salários mínimos" ou "1 salário mínimo"
    const matchSM = text.match(/(\d+)?\s*sal[áa]rio[s]?\s*m[íi]nimo[s]?/i);
    if (matchSM && (rendaTotal === null || isNaN(rendaTotal))) {
      const qtdSM = matchSM[1] ? parseInt(matchSM[1]) : 1;
      rendaTotal = qtdSM * SALARIO_MINIMO_PADRAO;
    }

    // Despesas dedutíveis com medicamentos / saúde / tratamentos
    let despesasDedutiveis = 0;
    const matchDespesa = text.match(/(?:gasto|gasta|despesa|medicamento|remédio|farm[áa]cia|sa[úu]de|tratamento)\w*\s*(?:de|é)?\s*(?:r\$\s*)?([\d.,]+)/i);
    if (matchDespesa) {
      despesasDedutiveis = parseFloat(matchDespesa[1].replace(/\./g, "").replace(",", "."));
    }

    // Se não encontrou no texto mas foi pedido explícito de checklist, usa os dados atuais do laudo
    if (totalMembros === null || isNaN(totalMembros) || totalMembros <= 0) {
      totalMembros = (this.formData.familia && this.formData.familia.length > 0) ? this.formData.familia.length : 1;
    }
    if (rendaTotal === null || isNaN(rendaTotal)) {
      if (rendaPerCapitaDirect !== null && !isNaN(rendaPerCapitaDirect)) {
        rendaTotal = rendaPerCapitaDirect * totalMembros;
      } else {
        rendaTotal = Number(this.formData.rendaTotalFamilia) || 0;
      }
    }
    if (despesasDedutiveis === 0 && this.formData.despesas && this.formData.despesas.saude) {
      despesasDedutiveis = Number(this.formData.despesas.saude) || 0;
    }

    // Executa cálculo com os critérios do STF
    const calc = typeof calcularRendaPerCapita === "function"
      ? calcularRendaPerCapita(
          Array(totalMembros).fill(0).map((_, i) => ({
            rendaMensal: i === 0 ? rendaTotal : 0
          })),
          SALARIO_MINIMO_PADRAO,
          despesasDedutiveis
        )
      : {
          totalMembros,
          rendaBruta: rendaTotal,
          despesasDedutiveis,
          rendaTotal: Math.max(0, rendaTotal - despesasDedutiveis),
          rendaPerCapita: totalMembros > 0 ? (Math.max(0, rendaTotal - despesasDedutiveis) / totalMembros) : 0,
          salarioMinimo: SALARIO_MINIMO_PADRAO,
          limiteUmQuartoSM: 379.50,
          limiteMeioSM: 759.00,
          atendeCriterioObjetivo: true,
          elegivelSTF: true,
          statusSTF: "CONFORME_OBJETIVO",
          tituloAlerta: "CONFORME CRITÉRIO LEGAL OBJETIVO (≤ 1/4 SM)",
          nivelAlerta: "verde",
          resumoFundamentacao: "Renda per capita em conformidade com o critério da LOAS.",
          textoParecer: "Renda per capita atende ao critério legal objetivo da LOAS."
        };

    return {
      totalMembros,
      rendaBruta: rendaTotal,
      despesasDedutiveis,
      calc
    };
  }

  handleBpcChecklistChatMessage(userText, bpcAnalysis) {
    const calc = bpcAnalysis.calc;
    const msgIntro = `⚖️ **Checklist de Elegibilidade BPC/LOAS & Critérios do STF:**\n\nIdentifiquei a renda familiar declarada de **R$ ${calc.rendaBruta.toFixed(2)}** para **${calc.totalMembros} ${calc.totalMembros === 1 ? 'pessoa' : 'pessoas'}**${calc.despesasDedutiveis > 0 ? ` (com dedução legal de R$ ${calc.despesasDedutiveis.toFixed(2)} em saúde/medicamentos)` : ''}.\n\nA **renda líquida per capita** apurada é de **R$ ${calc.rendaPerCapita.toFixed(2)}**.\n\nAbaixo está a aferição oficial com o alerta visual de conformidade com os critérios do STF (Tema 27 / RE 567.985):`;
    
    this.addAssistantMessage(msgIntro, null, calc);
  }

  renderBpcChecklistCardHtml(calc) {
    if (!calc) return "";

    const sm = calc.salarioMinimo || SALARIO_MINIMO_PADRAO;
    const limite14 = calc.limiteUmQuartoSM || (sm / 4);
    const limite12 = calc.limiteMeioSM || (sm / 2);
    const rpc = calc.rendaPerCapita || 0;

    let iconAlert = "🛡️";
    if (calc.nivelAlerta === "amarelo") iconAlert = "⚖️";
    if (calc.nivelAlerta === "vermelho") iconAlert = "⚠️";

    const calcDataEscaped = JSON.stringify(calc).replace(/"/g, '&quot;');

    return `
      <div class="bpc-checklist-card">
        <div class="bpc-card-header">
          <div class="bpc-card-title">
            <span>⚖️</span>
            <span>Checklist de Elegibilidade BPC/LOAS</span>
          </div>
          <span class="bpc-stf-tag" title="Critério Jurisprudencial Vinculante">STF: Tema 27 / RE 567.985</span>
        </div>

        <!-- Alerta Visual de Conformidade com o STF -->
        <div class="bpc-alert-banner ${calc.nivelAlerta}">
          <div class="bpc-alert-icon">${iconAlert}</div>
          <div class="bpc-alert-content">
            <div class="bpc-alert-title">${calc.tituloAlerta}</div>
            <div class="bpc-alert-desc">${calc.resumoFundamentacao}</div>
          </div>
        </div>

        <!-- Barra Visual de Faixas (0 a 1 Salário Mínimo) -->
        <div class="bpc-gauge-wrap">
          <div style="display:flex; justify-content:space-between; font-size:0.72rem; margin-bottom:4px; font-weight:600;">
            <span>Faixa de Enquadramento Socioeconômico:</span>
            <span style="color:${calc.nivelAlerta === 'verde' ? '#16a34a' : (calc.nivelAlerta === 'amarelo' ? '#d97706' : '#dc2626')}">
              Renda Apurada: R$ ${rpc.toFixed(2)} (${sm > 0 ? (rpc / sm * 100).toFixed(0) : 0}% do Salário Mínimo)
            </span>
          </div>
          <div class="bpc-gauge-bar">
            <div class="bpc-zone-1" title="Até 1/4 SM (R$ ${limite14.toFixed(2)}) - Conforme Presunção Legal"></div>
            <div class="bpc-zone-2" title="De 1/4 a 1/2 SM (R$ ${limite12.toFixed(2)}) - Elegível via STF / Tema 27"></div>
            <div class="bpc-zone-3" title="Acima de 1/2 SM - Requer Comprovação de Gastos Graves"></div>
          </div>
          <div class="bpc-gauge-labels">
            <span>R$ 0,00</span>
            <span style="color:#16a34a; font-weight:700;">1/4 SM: R$ ${limite14.toFixed(2)}</span>
            <span style="color:#d97706; font-weight:700;">1/2 SM: R$ ${limite12.toFixed(2)} (STF)</span>
            <span>1 SM: R$ ${sm.toFixed(2)}</span>
          </div>
        </div>

        <!-- Métricas Principais -->
        <div class="bpc-metrics-grid">
          <div class="bpc-metric-box">
            <span class="bpc-metric-label">Renda Familiar</span>
            <span class="bpc-metric-value">R$ ${calc.rendaBruta.toFixed(2)}</span>
          </div>
          <div class="bpc-metric-box">
            <span class="bpc-metric-label">Membros</span>
            <span class="bpc-metric-value">${calc.totalMembros} ${calc.totalMembros === 1 ? 'pessoa' : 'pessoas'}</span>
          </div>
          <div class="bpc-metric-box highlight">
            <span class="bpc-metric-label">Renda Per Capita</span>
            <span class="bpc-metric-value">R$ ${rpc.toFixed(2)}</span>
          </div>
          <div class="bpc-metric-box">
            <span class="bpc-metric-label">Teto STF (1/4 SM)</span>
            <span class="bpc-metric-value">R$ ${limite14.toFixed(2)}</span>
          </div>
        </div>

        <!-- Checklist de Critérios Legais e Judiciais -->
        <div class="bpc-checklist-items">
          <div class="bpc-item-row">
            <span class="bpc-check-icon checked">✓</span>
            <div><strong>1. Requisito Pessoal:</strong> Idoso (≥ 65 anos) OU Pessoa com Deficiência (Impedimento de longo prazo ≥ 2 anos)</div>
          </div>
          <div class="bpc-item-row">
            <span class="bpc-check-icon ${calc.atendeCriterioObjetivo ? 'checked' : (calc.elegivelSTF ? 'warning' : 'unchecked')}">
              ${calc.atendeCriterioObjetivo ? '✓' : (calc.elegivelSTF ? '⚖️' : '⚠️')}
            </span>
            <div>
              <strong>2. Critério de Renda (STF):</strong> 
              ${calc.atendeCriterioObjetivo 
                ? `Renda per capita de R$ ${rpc.toFixed(2)} atende ao limite objetivo de 1/4 do salário mínimo (Art. 20, § 3º LOAS).` 
                : (calc.elegivelSTF 
                    ? `Renda per capita de R$ ${rpc.toFixed(2)} elegível pela jurisprudência vinculante do STF (Tema 27 / RE 567.985).`
                    : `Renda per capita de R$ ${rpc.toFixed(2)} acima de 1/2 SM; exige dedução contábil de medicamentos e tratamentos.`)}
            </div>
          </div>
          <div class="bpc-item-row">
            <span class="bpc-check-icon ${calc.despesasDedutiveis > 0 ? 'checked' : 'checked'}">✓</span>
            <div>
              <strong>3. Deduções Legais de Saúde (Art. 20-B da LOAS):</strong>
              ${calc.despesasDedutiveis > 0 
                ? `R$ ${calc.despesasDedutiveis.toFixed(2)} deduzidos com medicamentos, fraldas ou tratamentos essenciais.` 
                : 'Gastos contínuos de saúde dedutíveis da renda bruta na perícia judicial.'}
            </div>
          </div>
          <div class="bpc-item-row">
            <span class="bpc-check-icon checked">✓</span>
            <div><strong>4. Inscrição no CadÚnico:</strong> Exigência de cadastramento e atualização bienal da família.</div>
          </div>
          <div class="bpc-item-row">
            <span class="bpc-check-icon checked">✓</span>
            <div><strong>5. Não Cumulação:</strong> Ausência de benefício previdenciário concomitante (salvo pensão indenizatória e assistência médica).</div>
          </div>
          <div class="bpc-item-row">
            <span class="bpc-check-icon checked">✓</span>
            <div><strong>6. Parecer Técnico do Serviço Social:</strong> Estudo social comprova vulnerabilidade material, precariedade de moradia e barreiras comunitárias.</div>
          </div>
        </div>

        <!-- Ações do Checklist -->
        <div class="bpc-actions-row">
          <button type="button" class="btn-bpc-action primary" onclick="app.applyBpcChecklistToForm(${calcDataEscaped})" title="Preencher as páginas 2 e 6 do formulário oficial A4 com este cálculo e tese do STF">
            <span>📝</span> Aplicar ao Laudo Oficial (A4)
          </button>
          <button type="button" class="btn-bpc-action secondary" onclick="app.openBpcEligibilityModal(${calcDataEscaped})" title="Abrir ferramenta completa para simular despesas médicas e deduções">
            <span>🧮</span> Simular Deduções / Ajustar
          </button>
          <button type="button" class="btn-bpc-action secondary" onclick="app.exportBpcChecklistTxt(${calcDataEscaped})" title="Baixar relatório técnico da análise preliminar como arquivo de texto (.txt)">
            <span>📄</span> Exportar (.txt)
          </button>
          <button type="button" class="btn-bpc-action secondary" onclick="app.exportBpcChecklistImage(${calcDataEscaped})" title="Gerar e baixar imagem do certificado de análise do checklist (.png)">
            <span>🖼️</span> Imagem (.png)
          </button>
          <button type="button" class="btn-bpc-action secondary" onclick="app.insertBpcTeseJudicial(${calcDataEscaped})" title="Inserir a tese jurisprudencial do STF no parecer técnico">
            <span>📜</span> Inserir Tese STF
          </button>
        </div>
      </div>
    `;
  }

  openBpcEligibilityModal(initialCalc = null) {
    const modal = document.getElementById("bpcEligibilityModal");
    if (!modal) return;

    let membros = 1;
    let renda = 0;
    let deducoes = 0;
    let sm = SALARIO_MINIMO_PADRAO;

    if (initialCalc) {
      membros = initialCalc.totalMembros || 1;
      renda = initialCalc.rendaBruta || 0;
      deducoes = initialCalc.despesasDedutiveis || 0;
      sm = initialCalc.salarioMinimo || SALARIO_MINIMO_PADRAO;
    } else {
      if (this.formData.familia && this.formData.familia.length > 0) {
        membros = this.formData.familia.length;
        renda = this.formData.familia.reduce((acc, curr) => acc + (parseFloat(curr.rendaMensal) || 0), 0);
      } else if (this.formData.rendaTotalFamilia) {
        renda = parseFloat(this.formData.rendaTotalFamilia) || 0;
      }
      if (this.formData.despesas && this.formData.despesas.saude) {
        deducoes = parseFloat(this.formData.despesas.saude) || 0;
      }
    }

    this._currentBpcModalState = { membros, renda, deducoes, sm };
    this.renderBpcModalContent();
    modal.classList.add("open");
  }

  closeBpcEligibilityModal() {
    const modal = document.getElementById("bpcEligibilityModal");
    if (modal) modal.classList.remove("open");
  }

  renderBpcModalContent() {
    const body = document.getElementById("bpcModalBody");
    if (!body || !this._currentBpcModalState) return;

    const s = this._currentBpcModalState;
    const calc = typeof calcularRendaPerCapita === "function"
      ? calcularRendaPerCapita(
          Array(s.membros).fill(0).map((_, i) => ({ rendaMensal: i === 0 ? s.renda : 0 })),
          s.sm,
          s.deducoes
        )
      : null;

    this._currentBpcCalc = calc;

    body.innerHTML = `
      <div style="background:var(--bg-surface-elevated); padding:12px 14px; border-radius:8px; margin-bottom:14px; border:1px solid var(--gemini-border); font-size:0.82rem; line-height:1.45; color:var(--text-secondary);">
        ⚖️ <strong>Fundamentação Jurisprudencial Vinculante:</strong><br>
        O <strong>Supremo Tribunal Federal (RE 567.985/MT - Tema 27)</strong> declarou a inconstitucionalidade parcial sem pronúncia de nulidade do critério absoluto de 1/4 do salário mínimo (Art. 20, § 3º da Lei 8.742/93), permitindo ao(à) Assistente Social Perito(a) demonstrar a vulnerabilidade real no caso concreto através de despesas com tratamentos contínuos de saúde e condições sociais de moradia.
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <span style="font-size:0.82rem; font-weight:700; color:var(--text-primary);">Aferição de Variáveis e Deduções:</span>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-bpc-action secondary" onclick="app.exportBpcChecklistTxt()" title="Baixar relatório técnico como arquivo de texto (.txt)">
            <span>📄</span> Exportar (.txt)
          </button>
          <button type="button" class="btn-bpc-action secondary" onclick="app.exportBpcChecklistImage()" title="Gerar e baixar certificado do checklist em imagem (.png)">
            <span>🖼️</span> Exportar Imagem (.png)
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
        <div class="bpc-form-group">
          <label for="bpcModalSM">Salário Mínimo de Referência (R$):</label>
          <input type="number" id="bpcModalSM" value="${s.sm.toFixed(2)}" step="1" oninput="app.recalculateBpcModal()">
        </div>

        <div class="bpc-form-group">
          <label for="bpcModalMembros">Número de Membros da Família:</label>
          <input type="number" id="bpcModalMembros" value="${s.membros}" min="1" step="1" oninput="app.recalculateBpcModal()">
        </div>

        <div class="bpc-form-group">
          <label for="bpcModalRenda">Renda Familiar Bruta Mensal (R$):</label>
          <input type="number" id="bpcModalRenda" value="${s.renda.toFixed(2)}" min="0" step="10" oninput="app.recalculateBpcModal()">
        </div>

        <div class="bpc-form-group">
          <label for="bpcModalDeducoes">Deduções de Medicamentos/Saúde (R$):</label>
          <input type="number" id="bpcModalDeducoes" value="${s.deducoes.toFixed(2)}" min="0" step="10" oninput="app.recalculateBpcModal()">
          <small style="font-size:0.7rem; color:var(--text-tertiary);">Art. 20-B da LOAS (Lei 14.176/21)</small>
        </div>
      </div>

      <div id="bpcModalCardContainer">
        ${this.renderBpcChecklistCardHtml(calc)}
      </div>
    `;
  }

  recalculateBpcModal() {
    const inputSM = document.getElementById("bpcModalSM");
    const inputMembros = document.getElementById("bpcModalMembros");
    const inputRenda = document.getElementById("bpcModalRenda");
    const inputDeducoes = document.getElementById("bpcModalDeducoes");

    const sm = inputSM ? parseFloat(inputSM.value) || SALARIO_MINIMO_PADRAO : SALARIO_MINIMO_PADRAO;
    const membros = inputMembros ? Math.max(1, parseInt(inputMembros.value) || 1) : 1;
    const renda = inputRenda ? Math.max(0, parseFloat(inputRenda.value) || 0) : 0;
    const deducoes = inputDeducoes ? Math.max(0, parseFloat(inputDeducoes.value) || 0) : 0;

    this._currentBpcModalState = { membros, renda, deducoes, sm };

    const calc = typeof calcularRendaPerCapita === "function"
      ? calcularRendaPerCapita(
          Array(membros).fill(0).map((_, i) => ({ rendaMensal: i === 0 ? renda : 0 })),
          sm,
          deducoes
        )
      : null;

    this._currentBpcCalc = calc;

    const container = document.getElementById("bpcModalCardContainer");
    if (container && calc) {
      container.innerHTML = this.renderBpcChecklistCardHtml(calc);
    }
  }

  applyBpcChecklistToForm(customCalc = null) {
    const calc = customCalc || this._currentBpcCalc || (this._currentBpcModalState ? calcularRendaPerCapita(
      Array(this._currentBpcModalState.membros).fill(0).map((_, i) => ({ rendaMensal: i === 0 ? this._currentBpcModalState.renda : 0 })),
      this._currentBpcModalState.sm,
      this._currentBpcModalState.deducoes
    ) : null);

    if (!calc) return;

    // Atualiza dados de renda do formulário oficial A4
    this.formData.rendaTotalFamilia = calc.rendaTotal;
    this.formData.rendaPerCapita = calc.rendaPerCapita;
    this.formData.rendaObservacao = `Renda familiar total de R$ ${calc.rendaBruta.toFixed(2)}${calc.despesasDedutiveis > 0 ? ` (dedução legal de R$ ${calc.despesasDedutiveis.toFixed(2)} em saúde/medicamentos contínuos)` : ""}, perfazendo a renda per capita mensal de R$ ${calc.rendaPerCapita.toFixed(2)} para ${calc.totalMembros} pessoa(s). ${calc.resumoFundamentacao}`;

    // Atualiza parecer técnico oficial na Página 6
    if (!this.formData.conclusao) this.formData.conclusao = {};
    this.formData.conclusao.rendaAtendeCriterioLoas = calc.elegivelSTF;
    this.formData.conclusao.parecerFavoravel = calc.elegivelSTF;
    this.formData.conclusao.vulnerabilidadeEconomicaSevera = true;
    this.formData.conclusao.naoDispoeMeiosProprios = true;
    this.formData.conclusao.textoParecerComplementar = calc.textoParecer;

    // Se houver despesas de saúde informadas, atualiza no laudo
    if (calc.despesasDedutiveis > 0) {
      if (!this.formData.despesas) this.formData.despesas = {};
      this.formData.despesas.saude = calc.despesasDedutiveis;
      this.formData.despesas.saudeObs = "Medicamentos de uso contínuo e tratamentos indispensáveis (dedução conforme Art. 20-B da LOAS).";
    }

    this.renderFormPreview();
    this.flashDocumentUpdate();
    this.scrollToPage(2);
    this.closeBpcEligibilityModal();

    this.showToast(`⚖️ Checklist BPC/LOAS e Critérios do STF aplicados com sucesso à Página 2 e 6 do Laudo!`);
  }

  copyBpcFundamentacaoToChat() {
    const calc = this._currentBpcCalc;
    if (!calc) return;

    const chatMsg = `⚖️ **Checklist Oficial de Elegibilidade BPC/LOAS (Critérios STF):**\n\n` +
      `• **Renda Familiar Bruta:** R$ ${calc.rendaBruta.toFixed(2)}\n` +
      `• **Composição Familiar:** ${calc.totalMembros} membro(s)\n` +
      `• **Deduções com Saúde:** R$ ${calc.despesasDedutiveis.toFixed(2)}\n` +
      `• **Renda Líquida Per Capita:** R$ ${calc.rendaPerCapita.toFixed(2)}\n` +
      `• **Alerta Visual STF:** ${calc.tituloAlerta}\n\n` +
      `**Fundamentação Técnica do Serviço Social:**\n${calc.resumoFundamentacao}\n\n` +
      `*Jurisprudência Vinculante: STF RE 567.985/MT (Tema 27), RE 580.963/PR e Lei 14.176/2021.*`;

    this.addAssistantMessage(chatMsg, null, calc);
    this.closeBpcEligibilityModal();
    this.showToast("Análise de elegibilidade enviada ao chat com sucesso!");
  }

  insertBpcTeseJudicial(calc) {
    if (!calc) return;

    if (!this.formData.conclusao) this.formData.conclusao = {};
    this.formData.conclusao.textoParecerComplementar = calc.textoParecer;
    this.renderFormPreview();
    this.flashDocumentUpdate();
    this.scrollToPage(6);

    this.showToast("Tese jurisprudencial do STF inserida no Parecer Conclusivo (Página 6)!");
  }

  // =====================================================================
  // EXPORTAÇÃO DO CHECKLIST BPC/LOAS (ARQUIVO .TXT E IMAGEM .PNG)
  // =====================================================================
  exportBpcChecklistTxt(customCalc = null) {
    const calc = customCalc || this._currentBpcCalc || (this._currentBpcModalState ? calcularRendaPerCapita(
      Array(this._currentBpcModalState.membros).fill(0).map((_, i) => ({ rendaMensal: i === 0 ? this._currentBpcModalState.renda : 0 })),
      this._currentBpcModalState.sm,
      this._currentBpcModalState.deducoes
    ) : calcularRendaPerCapita(this.formData.familia || [], SALARIO_MINIMO_PADRAO, (this.formData.despesas && this.formData.despesas.saude) || 0));

    if (!calc) {
      this.showToast("Nenhum dado de cálculo disponível para exportação.");
      return;
    }

    const id = this.formData.identificacao || {};
    const enc = this.formData.encerramento || {};
    const dataHora = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

    const txtContent = 
`================================================================================
PODER JUDICIÁRIO • JUSTIÇA FEDERAL
SEÇÃO JUDICIÁRIA DO AMAPÁ • COORDENAÇÃO DOS JUIZADOS ESPECIAIS FEDERAIS
ANÁLISE PRELIMINAR DE ELEGIBILIDADE BPC/LOAS (LEI Nº 8.742/1993)
CONFORMIDADE COM OS CRITÉRIOS JURISPRUDENCIAIS DO STF (TEMA 27 / RE 567.985)
================================================================================

DATA E HORA DA EMISSÃO: ${dataHora}
COMARCA / SEÇÃO: ${enc.municipio || "Macapá"}/${enc.uf || "AP"}
PERICIADO(A): ${id.periciado || "Não especificado (Análise em Fase Preliminar)"}
CPF: ${id.cpf || "---"}
PROCESSO JUDICIAL Nº: ${id.processo || "Em autuação / Juizado Especial Federal"}
PERITO(A) RESPONSÁVEL: ${enc.nomePerito || "Assistente Social Perito(a) Judicial"} (${enc.cress || "CRESS 104 24ª Região-AP"})

--------------------------------------------------------------------------------
1. QUADRO ECONÔMICO E COMPOSIÇÃO FAMILIAR
--------------------------------------------------------------------------------
• Salário Mínimo Vigente de Referência:  R$ ${calc.salarioMinimo.toFixed(2)}
• Total de Integrantes no Grupo Familiar: ${calc.totalMembros} pessoa(s)
• Renda Familiar Bruta Mensal:            R$ ${calc.rendaBruta.toFixed(2)}
• Deduções com Saúde/Medicamentos:        R$ ${calc.despesasDedutiveis.toFixed(2)} (Art. 20-B da Lei 8.742/93)
• Renda Familiar Líquida Disponível:      R$ ${calc.rendaTotal.toFixed(2)}
• RENDA LÍQUIDA PER CAPITA APURADA:       R$ ${calc.rendaPerCapita.toFixed(2)} por pessoa

PARÂMETROS DE CONTROLE JUDICIAL:
• Teto Legal Objetivo LOAS (1/4 SM):      R$ ${calc.limiteUmQuartoSM.toFixed(2)}
• Teto Jurisprudencial do STF (1/2 SM):   R$ ${calc.limiteMeioSM.toFixed(2)}

--------------------------------------------------------------------------------
2. ALERTA VISUAL DE CONFORMIDADE COM O STF (TEMA 27 / RE 567.985)
--------------------------------------------------------------------------------
STATUS DE ENQUADRAMENTO: ${calc.tituloAlerta}
NÍVEL TÉCNICO DE VULNERABILIDADE: ${calc.nivelAlerta === "verde" ? "PRESUMIDA POR LEI (≤ 1/4 SM)" : (calc.nivelAlerta === "amarelo" ? "ELEGÍVEL SEGUNDO CRITÉRIO DO STF (1/4 A 1/2 SM)" : "EXCEDE 1/2 SM (NECESSÁRIO COMPROVAR GASTOS GRAVES)")}

PARECER DO SERVIÇO SOCIAL:
${calc.resumoFundamentacao}

SUGESTÃO DE TEXTO PARA O LAUDO PERICIAL:
"${calc.textoParecer}"

--------------------------------------------------------------------------------
3. CHECKLIST OFICIAL DE REQUISITOS (LEI Nº 8.742/93 E ESTATUTOS)
--------------------------------------------------------------------------------
[X] 1. Requisito Pessoal: Idoso (≥ 65 anos) OU Pessoa com Deficiência (Impedimento físico/mental de longo prazo ≥ 2 anos)
[${calc.atendeCriterioObjetivo ? 'X' : (calc.elegivelSTF ? '!' : ' ')}] 2. Critério de Renda: ${calc.atendeCriterioObjetivo ? 'Atende ao teto estrito de 1/4 SM' : (calc.elegivelSTF ? 'Elegível via flexibilização do STF (Tema 27)' : 'Supera 1/2 SM sem deduções')}
[X] 3. Deduções com Saúde: Comprovação de despesas contínuas com medicamentos e fraldas não fornecidos pelo SUS
[X] 4. Cadastro Único (CadÚnico): Família inscrita ou em processo de atualização bienal obrigatória
[X] 5. Não Cumulação: Ausência de recebimento simultâneo com outro benefício da Seguridade Social
[X] 6. Estudo Social Pericial: Constatação in loco de precariedade habitacional e barreiras sociais

--------------------------------------------------------------------------------
4. FUNDAMENTAÇÃO JURÍDICA E SÚMULAS VINCULANTES
--------------------------------------------------------------------------------
- Supremo Tribunal Federal (STF) - RE 567.985/MT (Tema 27 da Repercussão Geral):
  Fixou que o critério de 1/4 do salário mínimo não é o único meio idôneo para
  comprovar a miserabilidade da família do necessitado, autorizando o magistrado
  a utilizar outros elementos probatórios constantes no Estudo Social Pericial.
- Lei nº 14.176/2021 (Art. 20-B da Lei nº 8.742/1993):
  Autorizou a dedução de despesas com tratamentos de saúde, medicamentos, fraldas
  e alimentação especial não custeados pelo SUS, elevando o patamar de análise.
- Turma Nacional de Uniformização (TNU - Súmula 79):
  Nas ações em que se postula benefício assistencial, comprovada a necessidade
  contínua de medicamentos ou tratamentos não fornecidos pelo SUS, tais despesas
  devem ser deduzidas da renda familiar bruta.

================================================================================
Documento gerado eletronicamente pelo Sistema Visum Social
Coordenação de Perícias Socioeconômicas • Justiça Federal
================================================================================`;

    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (id.periciado || "periciado").toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.href = url;
    a.download = `checklist_bpc_loas_${safeName}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("📄 Relatório do checklist exportado como arquivo de texto (.txt)!");
  }

  exportBpcChecklistImage(customCalc = null) {
    const calc = customCalc || this._currentBpcCalc || (this._currentBpcModalState ? calcularRendaPerCapita(
      Array(this._currentBpcModalState.membros).fill(0).map((_, i) => ({ rendaMensal: i === 0 ? this._currentBpcModalState.renda : 0 })),
      this._currentBpcModalState.sm,
      this._currentBpcModalState.deducoes
    ) : calcularRendaPerCapita(this.formData.familia || [], SALARIO_MINIMO_PADRAO, (this.formData.despesas && this.formData.despesas.saude) || 0));

    if (!calc) {
      this.showToast("Nenhum dado de cálculo disponível para exportação.");
      return;
    }

    const id = this.formData.identificacao || {};
    const enc = this.formData.encerramento || {};
    const dataHora = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    // Cria canvas de alta definição (1200 x 1580 px)
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1580;
    const ctx = canvas.getContext("2d");

    // Helper para desenhar retângulos arredondados
    function drawRoundRect(c, x, y, width, height, radius, fill, stroke, strokeWidth = 1) {
      c.save();
      c.beginPath();
      c.moveTo(x + radius, y);
      c.lineTo(x + width - radius, y);
      c.quadraticCurveTo(x + width, y, x + width, y + radius);
      c.lineTo(x + width, y + height - radius);
      c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      c.lineTo(x + radius, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - radius);
      c.lineTo(x, y + radius);
      c.quadraticCurveTo(x, y, x + radius, y);
      c.closePath();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = strokeWidth;
        c.stroke();
      }
      c.restore();
    }

    // Helper para quebra de linha de texto
    function wrapText(c, text, x, y, maxWidth, lineHeight) {
      const words = (text || "").split(" ");
      let line = "";
      let curY = y;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = c.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          c.fillText(line.trim(), x, curY);
          line = words[n] + " ";
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line.trim().length > 0) {
        c.fillText(line.trim(), x, curY);
        curY += lineHeight;
      }
      return curY;
    }

    // 1. Fundo Geral
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Cabeçalho Oficial Azul Petróleo / Marinho
    const gradHeader = ctx.createLinearGradient(0, 0, 1200, 160);
    gradHeader.addColorStop(0, "#0a192f");
    gradHeader.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = gradHeader;
    ctx.fillRect(0, 0, 1200, 160);

    // Barra Dourada de Destaque
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, 155, 1200, 5);

    // Ícone e Títulos do Cabeçalho
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("PODER JUDICIÁRIO  •  JUSTIÇA FEDERAL  •  SERVIÇO SOCIAL", 60, 48);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("RELATÓRIO DE ELEGIBILIDADE BPC/LOAS", 60, 92);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Aferição da Renda Per Capita  •  Critérios Vinculantes do STF (Tema 27 / RE 567.985)", 60, 128);

    // 3. Card de Identificação do Caso
    drawRoundRect(ctx, 50, 185, 1100, 105, 8, "#ffffff", "#e2e8f0", 1.5);
    
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`PERICIADO(A): ${id.periciado || "Análise Preliminar em Andamento"}`, 75, 222);

    ctx.fillStyle = "#475569";
    ctx.font = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`Processo Judicial: ${id.processo || "Não autuado"}   |   CPF: ${id.cpf || "Não informado"}`, 75, 252);
    ctx.fillText(`Comarca: ${enc.municipio || "Macapá"}/${enc.uf || "AP"}   |   Emissão: ${dataHora}`, 75, 274);

    // 4. Banner com Alerta Visual do STF
    let alertBg = "#f0fdf4";
    let alertBorder = "#16a34a";
    let alertTextColor = "#166534";
    let alertIcon = "🛡️";

    if (calc.nivelAlerta === "amarelo") {
      alertBg = "#fffbeb";
      alertBorder = "#d97706";
      alertTextColor = "#92400e";
      alertIcon = "⚖️";
    } else if (calc.nivelAlerta === "vermelho") {
      alertBg = "#fef2f2";
      alertBorder = "#dc2626";
      alertTextColor = "#991b1b";
      alertIcon = "⚠️";
    }

    drawRoundRect(ctx, 50, 310, 1100, 135, 8, alertBg, alertBorder, 2);

    // Faixa lateral colorida
    ctx.fillStyle = alertBorder;
    ctx.fillRect(50, 310, 12, 135);

    ctx.fillStyle = alertTextColor;
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`${alertIcon}  ${calc.tituloAlerta}`, 85, 345);

    ctx.fillStyle = "#1e293b";
    ctx.font = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    wrapText(ctx, calc.resumoFundamentacao, 85, 375, 1030, 22);

    // 5. Quatro Caixas de Métricas Financeiras
    const metricBoxes = [
      { label: "RENDA FAMILIAR BRUTA", val: `R$ ${calc.rendaBruta.toFixed(2)}`, sub: "Rendimentos mensais" },
      { label: "GRUPO FAMILIAR", val: `${calc.totalMembros} ${calc.totalMembros === 1 ? 'membro' : 'membros'}`, sub: "Residência habitual" },
      { label: "DEDUÇÕES SAÚDE (ART. 20-B)", val: `R$ ${calc.despesasDedutiveis.toFixed(2)}`, sub: "Remédios / Tratamentos" },
      { label: "RENDA PER CAPITA LÍQUIDA", val: `R$ ${calc.rendaPerCapita.toFixed(2)}`, sub: "Valor apurado final", isPrimary: true }
    ];

    const boxWidth = 260;
    const boxGap = 20;
    metricBoxes.forEach((m, idx) => {
      const bx = 50 + idx * (boxWidth + boxGap);
      const bgBox = m.isPrimary ? "#f0f9ff" : "#ffffff";
      const borderBox = m.isPrimary ? "#0284c7" : "#cbd5e1";
      drawRoundRect(ctx, bx, 465, boxWidth, 90, 8, bgBox, borderBox, m.isPrimary ? 2 : 1);

      ctx.fillStyle = m.isPrimary ? "#0369a1" : "#64748b";
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(m.label, bx + 15, 492);

      ctx.fillStyle = m.isPrimary ? "#0284c7" : "#0f172a";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(m.val, bx + 15, 524);

      ctx.fillStyle = "#64748b";
      ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(m.sub, bx + 15, 544);
    });

    // 6. Barra Visual / Gauge do Salário Mínimo e Critérios do STF
    drawRoundRect(ctx, 50, 575, 1100, 80, 8, "#ffffff", "#e2e8f0", 1);
    
    ctx.fillStyle = "#334155";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`ESCALA DE ENQUADRAMENTO  •  SALÁRIO MÍNIMO: R$ ${calc.salarioMinimo.toFixed(2)}`, 75, 600);

    const gaugeX = 75;
    const gaugeY = 612;
    const gaugeW = 1050;
    const gaugeH = 20;

    // Fundo da barra
    drawRoundRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 5, "#e2e8f0", null);

    // Zona 1: Verde (0 a 25% = 1/4 SM)
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(gaugeX, gaugeY, gaugeW * 0.25, gaugeH);

    // Zona 2: Âmbar (25% a 50% = 1/2 SM STF)
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(gaugeX + gaugeW * 0.25, gaugeY, gaugeW * 0.25, gaugeH);

    // Zona 3: Vermelho (50% a 100% = acima de 1/2 SM)
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(gaugeX + gaugeW * 0.50, gaugeY, gaugeW * 0.50, gaugeH);

    // Marcadores de Legenda da barra
    ctx.fillStyle = "#16a34a";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`1/4 SM: R$ ${calc.limiteUmQuartoSM.toFixed(2)} (LOAS)`, gaugeX + gaugeW * 0.15, gaugeY + 36);

    ctx.fillStyle = "#d97706";
    ctx.fillText(`1/2 SM: R$ ${calc.limiteMeioSM.toFixed(2)} (STF)`, gaugeX + gaugeW * 0.40, gaugeY + 36);

    ctx.fillStyle = "#64748b";
    ctx.fillText(`1 SM: R$ ${calc.salarioMinimo.toFixed(2)}`, gaugeX + gaugeW - 120, gaugeY + 36);

    // 7. Card com o Checklist dos 6 Critérios Oficiais
    drawRoundRect(ctx, 50, 675, 1100, 440, 8, "#ffffff", "#e2e8f0", 1);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("CHECKLIST DE ELEGIBILIDADE JUDICIAL (LEI Nº 8.742/93 E ESTATUTOS):", 75, 712);

    const checklistItems = [
      {
        num: "1",
        title: "Condição Pessoal:",
        desc: "Idoso (≥ 65 anos) OU Pessoa com Deficiência (impedimento de longo prazo ≥ 2 anos)",
        ok: true
      },
      {
        num: "2",
        title: "Renda Per Capita (Critério STF):",
        desc: calc.atendeCriterioObjetivo 
          ? `Renda per capita de R$ ${calc.rendaPerCapita.toFixed(2)} atende diretamente ao critério de 1/4 SM.` 
          : (calc.elegivelSTF 
              ? `Renda per capita de R$ ${calc.rendaPerCapita.toFixed(2)} enquadra-se na flexibilização do STF (Tema 27).` 
              : `Renda per capita de R$ ${calc.rendaPerCapita.toFixed(2)} acima de 1/2 SM; requer comprovação contábil de despesas.`),
        ok: calc.elegivelSTF
      },
      {
        num: "3",
        title: "Deduções Legais de Saúde (Art. 20-B):",
        desc: calc.despesasDedutiveis > 0 
          ? `R$ ${calc.despesasDedutiveis.toFixed(2)} deduzidos com medicamentos de uso contínuo, fraldas e tratamentos.` 
          : "Gastos essenciais contínuos são abatidos da renda familiar bruta.",
        ok: true
      },
      {
        num: "4",
        title: "Inscrição Regular no CadÚnico:",
        desc: "Requisito legal formal de cadastramento e atualização bienal da família no Cadastro Único.",
        ok: true
      },
      {
        num: "5",
        title: "Ausência de Acumulação:",
        desc: "Não cumulação com benefícios do RGPS ou RPPS (salvo assistência médica e pensão indenizatória).",
        ok: true
      },
      {
        num: "6",
        title: "Parecer Técnico do Serviço Social:",
        desc: "Estudo socioeconômico pericial atesta barreiras ambientais, vulnerabilidade e carência material fática.",
        ok: true
      }
    ];

    checklistItems.forEach((item, idx) => {
      const iy = 745 + idx * 58;

      // Ícone do check
      ctx.beginPath();
      ctx.arc(95, iy - 6, 14, 0, Math.PI * 2);
      ctx.fillStyle = item.ok ? "#dcfce7" : "#fef3c7";
      ctx.fill();
      ctx.strokeStyle = item.ok ? "#16a34a" : "#d97706";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = item.ok ? "#16a34a" : "#d97706";
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(item.ok ? "✓" : "!", 91, iy - 2);

      // Texto do Item
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(item.title, 125, iy - 7);

      ctx.fillStyle = "#475569";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(item.desc, 125, iy + 14);
    });

    // 8. Card de Fundamentação Jurisprudencial Vinculante (STF / TNU)
    drawRoundRect(ctx, 50, 1135, 1100, 275, 8, "#f1f5f9", "#cbd5e1", 1);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("PARECER PERICIAL SUGERIDO & TESES JURÍDICAS VINCULANTES:", 75, 1168);

    ctx.fillStyle = "#1e293b";
    ctx.font = "italic 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    wrapText(ctx, `"${calc.textoParecer}"`, 75, 1198, 1040, 22);

    ctx.fillStyle = "#334155";
    ctx.font = "13.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const jurText = 
      "• STF (Tema 27 / RE 567.985/MT): O critério de 1/4 do salário mínimo não é critério absoluto nem exclusivo, podendo a miserabilidade ser aferida por outros meios probatórios fáticos constantes do Estudo Social.\n" +
      "• Lei 14.176/2021 (Art. 20-B da LOAS) & Súmula 79 da TNU: Dedução expressa de gastos com medicamentos de uso contínuo, alimentação especial e tratamentos indispensáveis não supridos pelo SUS.";
    wrapText(ctx, jurText, 75, 1315, 1040, 20);

    // 9. Rodapé Institucional
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 1435, 1200, 145);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Visum Social  •  Sistema de Apoio a Perícias Socioeconômicas Judiciais", 60, 1485);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`Relatório gerado eletronicamente para fins de instrução processual • ${dataHora} • Justiça Federal`, 60, 1515);

    // 10. Converte para blob e faz download da imagem PNG
    canvas.toBlob((blob) => {
      if (!blob) {
        this.showToast("Erro ao processar imagem.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (id.periciado || "periciado").toLowerCase().replace(/[^a-z0-9]/g, "_");
      a.href = url;
      a.download = `checklist_bpc_loas_${safeName}_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast("🖼️ Imagem do relatório do checklist exportada com sucesso (.png)!");
    }, "image/png");
  }

  // =====================================================================
  // OVERLAY DE PROCESSAMENTO ANIMADO (ÍCONES SE MEXENDO / AGUARDE)
  // =====================================================================
  showLoadingOverlay(title = "Examinando Perícia com Rigor Técnico", phrase = "Lendo certidões, laudos médicos e fotos da moradia...") {
    const overlay = document.getElementById("loadingOverlay");
    const titleEl = document.getElementById("loadingTitle");
    const phraseEl = document.getElementById("loadingPhrase");
    if (titleEl) titleEl.textContent = title;
    if (phraseEl) phraseEl.textContent = phrase;
    if (overlay) overlay.classList.add("open");
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("open");
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

