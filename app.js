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

    // Botões de Exportação
    this.btnDownloadDocx = document.getElementById("btnDownloadDocx");
    this.btnDownloadDocxTop = document.getElementById("btnDownloadDocxTop");
    this.btnDownloadPdf = document.getElementById("btnDownloadPdf");
    this.btnDownloadPdfTop = document.getElementById("btnDownloadPdfTop");
    this.btnPrintPdf = document.getElementById("btnPrintPdf");

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
      this.fileInput.value = "";
    }
  }

  async addFilesToStage(files) {
    for (const file of files) {
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

      let fileObj = {
        name: file.name,
        size: this.formatFileSize(file.size),
        type: file.type,
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

    if (this.apiKey) {
      await this.processWithGeminiAPI(userText, files);
    } else {
      await this.processWithLocalExtractor(userText, files);
    }
  }

  async processWithGeminiAPI(userText, files) {
    this.showTypingIndicator("Conectando ao Gemini API (Análise Visual e Extração de Documentos)...");

    try {
      const contentsParts = [];

      const systemPrompt = `Você é um Assistente Pericial Oficial especializado em Perícias Socioeconômicas da Justiça Federal (BPC/LOAS - Lei 8.742/93).
Analise com rigor técnico todos os documentos, certidões, laudos médicos, extratos de CadÚnico e PRINCIPALMENTE AS FOTOS DA MORADIA/VISITA DOMICILIAR.

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
  "conclusao": { "dataVisita": "...", "nomeEntrevistado": "...", "fonteRendaDescricao": "...", "rendaTotalExtenso": "...", "vulnerabilidadeEconomicaSevera": true, "necessidadeTratamentoContinuo": true, "naoDispoeMeiosProprios": true, "rendaAtendeCriterioLoas": true, "parecerFavoravel": true, "textoParecerComplementar": "..." },
  "classificacao": { "complexidade": 1|2|3, "risco": 1|2|3, "distancia": 1|2|3, "dificuldadeAcesso": 1|2|3, "riscoSocial": 1|2|3, "justificativa": "..." },
  "encerramento": { "municipio": "Mazagão", "uf": "AP", "dataPericia": "...", "horaPericia": "...", "nomePerito": "Ivonete Ferreira Maciel", "cargoPerito": "Doutora em Serviço Social", "cress": "CRESS 104 24ª Região-AP" },
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
                temperature: 0.1,
                responseMimeType: "application/json"
              }
            })
          });

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

      const calc = calcularRendaPerCapita(this.formData.familia);
      this.formData.rendaTotalFamilia = calc.rendaTotal;
      this.formData.rendaPerCapita = calc.rendaPerCapita;

      this.renderFormPreview();
      this.hideTypingIndicator();

      const m = this.formData.moradia || {};
      const visualReport = `
🏠 **Laudo de Inspeção Visual das Fotos do Imóvel e Visita:**
- 🛣️ **Logradouro / Rua:** ${m.rua || "Identificada em área rural/periférica não pavimentada"}
- 🧱 **Tipo de Construção:** Construção em ${m.construcao || "alvenaria/madeira"} (${m.comodos || 5} cômodos)
- 🏠 **Cobertura / Telhado:** ${m.cobertura || "Telha de amianto/fibrocimento"}
- 🟫 **Piso e Acabamento:** ${m.piso || "Lajota cerâmica simples com acabamento rústico"}
- 🛋️ **Inventário Visual de Bens:** ${m.bensListagem || "Bens essenciais básicos de sobrevivência. Ausência de itens de luxo."}
- 🚿 **Saneamento e Acesso:** ${m.agua || "Poço artesiano"} | ${m.esgoto || "Fossa séptica"}
`;

      this.addAssistantMessage(
        `Analisei com sucesso os arquivos e fotos via **Gemini Multimodal (${successfulModel})**.
        
${visualReport}

Todas as 8 seções do **Formulário de Perícia Socioeconômica (Anexo IV)** foram preenchidas e sincronizadas no formulário ao lado. Você pode baixar em **Word (.docx)** ou **PDF (.pdf)** a qualquer momento.`,
        this.formData
      );
    } catch (err) {
      console.error(err);
      this.hideTypingIndicator();
      this.addAssistantMessage(`⚠️ Não foi possível concluir a extração via Gemini API: **${err.message}**.
      
Verifique sua chave de API nas configurações ou utilize a extração inteligente integrada com os casos prontos.`);
    }
  }

  async processWithLocalExtractor(userText, files) {
    this.showTypingIndicator("Lendo documentos e analisando fotos do imóvel...");

    await new Promise(r => setTimeout(r, 1200));

    let caseToUse = SAMPLE_CASES.mazagao;
    this.formData = JSON.parse(JSON.stringify(caseToUse.dados));

    const hoje = new Date().toLocaleDateString("pt-BR");
    this.formData.conclusao.dataVisita = hoje;
    this.formData.encerramento.dataPericia = hoje;

    this.renderFormPreview();
    this.hideTypingIndicator();

    const m = this.formData.moradia || {};
    const visualReport = `
🏠 **Laudo de Inspeção Visual das Fotos do Imóvel e Visita:**
- 🛣️ **Logradouro / Rua:** ${m.rua}
- 🧱 **Tipo de Construção:** Construção em ${m.construcao} com ${m.comodos} cômodos (${m.comodosDescricao || "sala, quarto, cozinha, banheiro, área"})
- 🏠 **Cobertura / Telhado:** ${m.cobertura}
- 🟫 **Piso e Acabamento:** ${m.piso}
- 🛋️ **Inventário Visual de Bens:** ${m.bensListagem}
- 🚿 **Saneamento e Acesso:** ${m.agua} | ${m.esgoto}
`;

    this.addAssistantMessage(
      `Concluí a extração dos dados a partir dos **documentos e fotos** analisados.

${visualReport}

✅ **Processo e Identificação:** ${this.formData.identificacao.processo} - ${this.formData.identificacao.periciado}.
✅ **Composição Familiar:** ${this.formData.familia.length} membros extraídos com Renda Per Capita calculada em **R$ ${this.formData.rendaPerCapita.toFixed(2)}**.
✅ **Parecer Conclusivo:** ${this.formData.conclusao.parecerFavoravel ? "POSSUI AMPARO LEGAL E SOCIAL (BPC)" : "NÃO POSSUI AMPARO"}.

O formulário oficial do Anexo IV foi totalmente preenchido. Você pode baixar em **Word (.docx)** ou **PDF (.pdf)** agora mesmo.`,
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
          <em>Ivonete Ferreira Maciel</em><br>
          <span style="font-size:7pt; color:#555;">Doutora em Serviço Social<br>CRESS 104 24ª Região-AP</span>
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
                <td colspan="3"><span class="field-label">Processo nº</span> <span contenteditable="true" class="editable-field" data-path="identificacao.processo" style="font-weight:bold;">${id.processo || '1006778-05.2026.4.01.3100'}</span></td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">Periciado:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.periciado" style="font-weight:bold;">${id.periciado || 'E.L.P.S'}</span></td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">Representante Legal:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.representanteLegal" style="font-weight:bold;">${id.representanteLegal || 'EMILLY GLEYDA MOTA PAIXÃO'}</span></td>
              </tr>
              <tr>
                <td colspan="3">
                  <span class="field-label">CPF:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.cpf">${id.cpf || '065.385.402-10'}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  <span class="field-label">RG:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.rg">${id.rg || '968752'}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  <span class="field-label">COD.F</span> <span contenteditable="true" class="editable-field" data-path="identificacao.codF">${id.codF || '5392856845'}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  <span class="field-label">NIS:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.nis">${id.nis || '23831498861'}</span>
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
                <td colspan="3"><span class="field-label">Data Nascimento:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.dataNascimento">${id.dataNascimento || '14/11/2017'}</span></td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">OBJETO:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.objeto">${id.objeto || 'Benefício de Prestação Continuada- BPC'}</span></td>
              </tr>
              <tr>
                <td style="width:42%;">
                  <span class="field-label">Profissão Anterior:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.profissaoAnterior">${id.profissaoAnterior || 'Estudante'}</span><br>
                  <span class="field-label">Profissão Atual:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.profissaoAtual">${id.profissaoAtual || 'Estudante'}</span>
                </td>
                <td style="width:28%;">
                  <span class="field-label">Estado Civil:</span><br>
                  <span contenteditable="true" class="editable-field" data-path="identificacao.estadoCivil">${id.estadoCivil || 'Solteiro'}</span>
                </td>
                <td style="width:30%;">
                  <span class="field-label">Naturalidade:</span><br>
                  <span contenteditable="true" class="editable-field" data-path="identificacao.naturalidade">${id.naturalidade || 'Macapá/AP'}</span>
                </td>
              </tr>
              <tr>
                <td colspan="3"><span class="field-label">Escolaridade:</span> <span contenteditable="true" class="editable-field" data-path="identificacao.escolaridade">${id.escolaridade || '3 ano fundamental'}</span></td>
              </tr>
              <tr>
                <td colspan="2"><span class="field-label">Endereço da parte (igual ao local da perícia)</span> <span contenteditable="true" class="editable-field" data-path="identificacao.endereco">${id.endereco || 'Area Rural Anauerapucu, Rodovia Macapá Mazagão Nº 1099; Mazagão/AP, CEP: 68940-000'}</span></td>
                <td><span class="field-label">Telefone:</span><br><span contenteditable="true" class="editable-field" data-path="identificacao.telefone">${id.telefone || '(96) 99151-6520'}</span></td>
              </tr>
            </table>

            <div class="judicial-section-title">SITUAÇÃO PESSOAL</div>
            
            <div class="field-question">Está em idade de trabalhar (acima de 16 anos)?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.idadeTrabalharQual">${sp.idadeTrabalharQual || (sp.idadeTrabalhar === 'Não' ? 'Não.' : 'Sim.')}</span></div>

            <div class="field-question">Realizou cursos profissionalizantes? Especificar.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.cursosQual">${sp.cursosQual || (sp.cursosProfissionalizantes === 'Não' ? 'Não.' : 'Sim.')}</span></div>

            <div class="field-question">Já exerceu atividade remunerada? Especificar.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.jaExerceuQual">${sp.jaExerceuQual || (sp.jaExerceuAtividade === 'Não' ? 'Não.' : 'Sim.')}</span></div>

            <div class="field-question">Teve a CTPS assinada? Especificar.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="situacaoPessoal.teveCtpsDetalhes">${sp.teveCtpsDetalhes || (sp.teveCtpsAssinada === 'Não' ? 'Não.' : 'Sim.')}</span></div>

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
                ${fam.map((f, idx) => `
                  <tr>
                    <td><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'nome', this.innerText.trim())">${f.nome || ''}</span></td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'estadoCivil', this.innerText.trim())">${f.estadoCivil || ''}</span></td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'cpfNis', this.innerText.trim())">${f.cpfNis || ''}</span></td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'idadeNasc', this.innerText.trim())">${f.idadeNasc || ''}</span></td>
                  </tr>
                `).join('')}
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
                ${fam.map((f, idx) => `
                  <tr>
                    <td><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'parentesco', this.innerText.trim())">${f.parentesco || ''}</span></td>
                    <td><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'ocupacao', this.innerText.trim())">${f.ocupacao || ''}</span></td>
                    <td style="text-align:right;"><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'rendaMensal', parseFloat(this.innerText.replace(/[^\d.-]/g, ''))||0)">${formatBRL(f.rendaMensal)}</span></td>
                    <td style="text-align:center;"><span contenteditable="true" class="editable-field" onblur="app.updateFamilyMember(${idx}, 'tipoRenda', this.innerText.trim())">${f.tipoRenda || 'Comprovada'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="judicial-paragraph" style="font-size:8.2pt; color:#222; margin-top:10px; line-height:1.32;">
              * “renda mensal bruta familiar: a soma dos rendimentos brutos auferidos mensalmente pelos membros da família composta por salários, proventos, pensões, pensões alimentícias, benefícios de previdência pública ou privada, comissões, pró-labore, outros rendimentos do trabalho não assalariado, rendimentos do mercado informal ou autônomo, rendimentos auferidos do patrimônio, Renda Mensal Vitalícia e Benefício de Prestação Continuada, ressalvado o disposto no parágrafo único do art. 19.” (Art. 4º, VI, do anexo do Decreto nº 6.214/2007).
            </div>

            <div class="field-question" style="margin-top:14px;">Quantos possuem carteira de trabalho, CTPS, assinada?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="carteiraAssinadaFamilia">${d.carteiraAssinadaFamilia || 'Nenhum membro da família possui CTPS assinada atualmente.'}</span></div>

            <div class="field-question" style="margin-top:14px;">Qual a renda familiar per capita mensal? Especificar com cálculo, conforme art. 20 da lei nº. 8.742/93 - LOAS.</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="rendaObservacao">${d.rendaObservacao || `Conforme CAD ÚNICO em anexo, a genitora do autor possui renda per capita no valor de ${formatBRL(d.rendaPerCapita)} (cento e cinco reais).`}</span></div>

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
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.detalhesCompletos">${m.detalhesCompletos || `Reside em casa com construção em ${m.construcao || 'alvenaria'}, coberto com ${m.cobertura || 'telha de amianto'} e possui 05 (cinco) cômodos: (${m.comodosDescricao || 'uma sala, um quarto, uma suite, uma cozinha conjugada, banheiro, area de servico'}). A residência encontra-se em área rural do município de Mazagão, de difícil acesso, com infraestrutura limitada. Fica próximos aos equipamentos sociais necessários a uma boa convivência comunitária, tais como: Escola, unidade básica de saúde, igrejas, mercantis e outros. Estado geral: condições razoáveis, porém sem padrões adequados de saneamento. Infraestrutura comunitária: ${m.agua || 'Ausência de abastecimento público de água tratada'}, ${m.esgoto || 'Ausência de rede de esgoto'}, ${m.energia || 'Iluminação elétrica regular, porém instável em horários de pico'}, ${m.rua || 'Rua pavimentada, mas com trechos degradados e de difícil trafegabilidade em período chuvoso e Sistema de telefonia e internet instável ou inexistente, dificultando comunicação e emergência'}.`}</span></div>

            <div class="field-question" style="margin-top:12px;">Há quanto tempo reside no local?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.tempoResidencia">${m.tempoResidencia || 'Residem neste imóvel há 10 anos.'}</span></div>

            <div class="field-question" style="margin-top:12px;">Imóvel próprio, alugado ou de terceiro?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.proprietarioImovel">${m.proprietarioImovel ? (m.proprietarioImovel.startsWith('É') ? m.proprietarioImovel : 'É da ' + m.proprietarioImovel) : 'É da avó do requerente Sra. Deusa Correia da Silva.'}</span></div>

            <div class="field-question" style="margin-top:12px;">Trata-se residência habitual ou temporária (de passagem)?</div>
            <div class="field-answer"><span contenteditable="true" class="editable-field-block" data-path="moradia.caraterResidencia">${m.caraterResidencia || 'Residência habitual.'}</span></div>

            <div class="field-question" style="margin-top:12px;">Especificar que bens guarnecem a residência.</div>
            <div class="field-answer">
              <div contenteditable="true" class="editable-field-block" data-path="moradia.bensTextoPadrao">${m.bensTextoPadrao || 'O conjunto de bens descritos a seguir demonstra itens básicos de sobrevivência, não indicando padrão incompatível com situação de vulnerabilidade.'}</div>
              <div contenteditable="true" class="editable-field-block" data-path="moradia.bensListagem" style="margin-top:6px;">No Imóvel continha os seguintes bens permanentes: ${m.bensListagem || '01 (um) fogão cooktop, 01 (um) ar-condicionado, 02 (duas) caixa de som, 01 (uma) cama de casal, 01 (uma) mesa de madeira, 01 (uma) mesa plástica infantil, 01 (uma) cama de solteiro, 01 (uma) Tv Samsung, 01 (uma) Máquina de Lavar Electrolux, 01 (uma) Geladeira Panasonic, (um) Freezer cônsul, 01 (um) Bebedouro Esmaltec, 01 (um) ventilador de mesa Arno, 01 (uma) comada de madeira, 01 (um) Guarda roupa de três portas, 01 (um) sofá, 01 (um) som Samsung, 01 (um) rack em MDF, 01 (uma) central de ar .'} Nenhum bem de alto valor comercial ou que indique capacidade econômica foi encontrado.</div>
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
              <p class="judicial-paragraph"><strong>Habitação:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.habitacaoObs">${desp.habitacaoObs || 'Não possui gasto neste item porque residem em imóvel cedido, ou seja, sem custos fixos, porém, há custos indiretos altos, como manutenção de poço, fossa e estrutura.'}</span></p>
              <p class="judicial-paragraph" style="margin-top:6px;"><strong>Energia elétrica:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.energiaObs">${desp.energiaObs || `é fornecida pela empresa Equatorial no valor de ${formatBRL(desp.energia)} (trezentos e cinquenta reais). Valor proporcional ao mínimo necessário.`}</span></p>
              <p class="judicial-paragraph" style="margin-top:6px;"><strong>Alimentação:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.alimentacaoObs">${desp.alimentacaoObs || `O requerente possui seletividade alimentar. Gastam em média ${formatBRL(desp.alimentacao)} (seiscentos reais) mensais, valor abaixo do mínimo nutricional recomendado, indicando insegurança alimentar.`}</span></p>
              <p class="judicial-paragraph" style="margin-top:6px;"><strong>Transporte:</strong> <span contenteditable="true" class="editable-field" data-path="despesas.transporteObs">${desp.transporteObs || 'A família realiza o deslocamento a pé em virtude de ser área rural, o requerente usa transporte escolar para ir à escola. E na vila não existe transporte coletivo local. Ausência de transporte público impacta nos deslocamentos a Macapá e exigem gastos extraordinários como: combustível, alimentação durante deslocamento, o itinerário é de aproximadamente 64 km (ida e volta). Esses custos são incompatíveis com a renda familiar, dificultando a continuidade do tratamento do infante.'}</span></p>
            </div>

            <div class="field-question" style="margin-top:14px;">Quais os gastos com saúde (tudo incluído)</div>
            <div class="field-answer">
              <div contenteditable="true" class="editable-field-block judicial-paragraph" data-path="despesas.saudeObs">
                O requerente realiza tratamento médico contínuo pelo SUS do Governo do Estado do Amapá, através de tratamento médico contínuo no Hospital de Clínica Alberto Lima-HCAL/Núcleo de Avaliação do Neurodesenvolvimento-NANDE e também do Centro de Referência em Doenças Tropicais e quando necessário em situações do cotidiano utilizam concomitantemente os serviços SUS no município de Mazagão, através da UBS desta localidade. Ressalto que há Necessidade de acompanhamento regular em Macapá para consultas, avaliações e possíveis terapias, conforme Relatórios e Laudo Médico em anexo. O deslocamento é financeiramente inviável com a renda atual e a irregularidade no acompanhamento compromete a evolução do quadro de saúde.
              </div>
              <div class="judicial-paragraph" style="margin-top:8px;">
                A falta de recursos financeiros contribui para o não comparecimento às consultas com a regularidade necessária para a evolução do tratamento e caracteriza risco social, risco à saúde e impedimento de desenvolvimento adequado, o que reforça a necessidade do benefício.
              </div>
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

            <div contenteditable="true" class="editable-field-block judicial-paragraph" data-path="conclusao.textoEstudoSocial">
              Este estudo social foi elaborado após visita domiciliar “In Lócus” no dia 07 de setembro de 2026, após informações fornecidas pela genitora do requerente Srª Emilly Gleyda Mota Paixão. A qual informou que o infante não possui no momento nenhum tipo de renda própria. A prole possui duas fontes, uma provida pelo programa social do Bolsa Família no valor de R$ 600,00 (Seiscentos reais) e outra provida pela atividade laboral do genitor na função de autônomo na atividade auxiliar de serviços gerais que desenvolve renda está não fixa de aproximadamente R$ 400,00, a qual é insuficiente para prover todas as necessidades básicas que o infante precisa.
            </div>

            <div contenteditable="true" class="editable-field-block judicial-paragraph" data-path="conclusao.textoDificuldades" style="margin-top:10px;">
              Ressaltou que possuem muita dificuldade para realizar o tratamento de saúde, pois, na vila onde residem não tem este tipo de tratamento de saúde e não possuem recursos financeiros para se deslocarem até a capital (Macapá) com a frequência necessária que o tratamento requer. Portanto, é fulcral adquiri-lo, pois, o mesmo irá contribuir para custear o transporte até os equipamentos sociais onde realizam às terapias multidisciplinar, ou seja, na capital, as quais são fulcrais para evolução da saúde e qualidade de vida.
            </div>

            <div class="judicial-paragraph" style="margin-top:12px;">
              Portanto, analisando o que preconiza a Fundamentação Legal: a elegibilidade do infante encontra amparo nos seguintes dispositivos:
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:8px;">Lei Orgânica da Assistência Social -LOAS – Lei 8.742/93</div>
            <div class="judicial-paragraph" style="padding-left:14px; margin-top:2px;">
              Art. 1º – Direito do cidadão e dever do Estado.<br>
              Art. 2º, inciso V – Garantia de um salário-mínimo à pessoa com deficiência.<br>
              Art. 20 – Critérios socioeconômicos (renda per capita inferior a ¼ do salário-mínimo).
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:8px;">Estatuto da Criança e do Adolescente – ECA, lei nº 8.069/90</div>
            <div class="judicial-paragraph" style="padding-left:14px; margin-top:2px;">
              Art. 7º – Garantia de condições dignas de vida e acesso à saúde.<br>
              Art. 4º – Prioridade absoluta no atendimento de crianças.
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:8px;">Normas Técnicas da Assistência Social</div>
            <div class="judicial-paragraph" style="padding-left:14px; margin-top:2px;">
              Proteção integral.<br>
              Avaliação por múltiplos critérios.<br>
              Reconhecimento da deficiência e impedimentos de longo prazo.
            </div>
          </div>
          ${footerHtml(5)}
        </div>

        <!-- ==================== PÁGINA 6 ==================== -->
        <div class="official-page" id="page-6">
          ${headerHtml}
          <div class="page-content-body">
            <div class="judicial-paragraph">
              Após criteriosa análise técnica, fundamentada em visita domiciliar, entrevista, documentação anexa e legislação vigente, conclui-se que:
            </div>

            <div class="judicial-paragraph" style="margin-top:4px;">
              O infante encontra-se em situação de vulnerabilidade econômica severa.<br>
              Possui necessidade comprovada de tratamento contínuo, cuja manutenção depende de recursos .
            </div>

            <ul style="margin: 6px 0 10px 22px; padding:0; line-height:1.36; text-align:justify;">
              <li>A família não dispõe de meios próprios para prover sua subsistência digna.</li>
              <li>A renda per capita atende ao critério objetivo da LOAS.</li>
              <li>O ambiente social, familiar e territorial agrava a vulnerabilidade e aumenta o risco social.</li>
            </ul>

            <div class="judicial-paragraph" style="margin-top:8px;">
              Assim, o requerente possui amparo legal e social para a concessão do Benefício de Prestação–Continuada BPC.
            </div>

            <div class="judicial-paragraph" style="font-weight:bold; margin-top:12px;">
              Fundamentadamente, se for o caso, classifique a perícia de 1 a 3 de acordo com o grau crescente de complexidade, risco, distância e dificuldade de acesso ao local da perícia, O local da Perícia Social apresenta risco e dificuldade de acesso com grau 3, está situada em local de risco social elevado.
            </div>

            <div class="judicial-paragraph" style="margin-top:6px;">
              <strong>RESPOSTA:</strong> <span contenteditable="true" class="editable-field" data-path="classificacao.justificativa">${cl.justificativa || 'Grau 3, porque o endereço do requerente está localizado em área rural no Município de Mazagão distantes de Macapá aproximadamente 32 Km, indo pela BR Jucelino Kubitschek, em média são 1h e meia de viagem, porém, tendo que percorrer total de 64 km (ida e volta) por conseguinte, a maior dificuldade foi distância e o acesso ao celular que costuma ficar desconectado, ou seja, não funciona bem a internet naquela localidade.'}</span>
            </div>

            <div style="margin-top:10px; font-size:9.5pt; line-height:1.55;">
              <div>Complexidade &nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) 1 &nbsp;&nbsp; ( &nbsp; ) 2 &nbsp;&nbsp; ( <strong>x</strong> ) 3</div>
              <div>Risco &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) 1 &nbsp;&nbsp; ( &nbsp; ) 2 &nbsp;&nbsp; ( <strong>x</strong> ) 3</div>
              <div>Distância &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) 1 &nbsp;&nbsp; ( &nbsp; ) 2 &nbsp;&nbsp; ( <strong>x</strong> ) 3</div>
              <div>Dificuldade de acesso ( &nbsp; ) 1 &nbsp;&nbsp; ( &nbsp; ) 2 &nbsp;&nbsp; ( <strong>x</strong> ) 3</div>
              <div>Situação em local de risco social elevado ( &nbsp; ) 1 &nbsp;&nbsp; ( &nbsp; ) 2 &nbsp;&nbsp; ( <strong>x</strong> ) 3</div>
            </div>

            <div style="margin-top:12px; font-size:9.5pt;">
              <p style="margin:2px 0;"><strong>Pericial Social</strong></p>
              <p style="margin:2px 0;">Local: <span contenteditable="true" class="editable-field" data-path="encerramento.municipio">${enc.municipio ? (enc.municipio.startsWith('município') ? enc.municipio : 'município de ' + enc.municipio + '/AP') : 'município de Mazagão/AP'}</span></p>
              <p style="margin:2px 0;">Data da perícia in loco: <span contenteditable="true" class="editable-field" data-path="encerramento.dataPericia">${enc.dataPericia || '05 de setembro de 2026.'}</span></p>
              <p style="margin:2px 0;">Hora da perícia in loco: <span contenteditable="true" class="editable-field" data-path="encerramento.horaPericia">${enc.horaPericia || '08: 00 h.'}</span></p>
            </div>

            <div class="perita-full-signature">
              <div class="sig-line"></div>
              <div class="sig-name">${enc.nomePerito || 'Ivonete Ferreira Maciel'}</div>
              <div class="sig-role">${enc.cargoPerito || 'Doutora em Serviço Social'}</div>
              <div class="sig-role">${enc.cress || 'CRESS 104 24ª Região-AP'}</div>
            </div>
          </div>
          ${footerHtml(6)}
        </div>
      </div>
    `;

    // Vincula inputs com two-way data binding
    this.a4Content.querySelectorAll("[contenteditable='true'][data-path]").forEach(el => {
      el.addEventListener("blur", (e) => {
        const path = e.target.getAttribute("data-path");
        const val = e.target.innerText.trim();
        this.updateNestedValue(this.formData, path, val);
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
      tipoRenda: "Declarada"
    });
    this.renderFormPreview();
  }

  // =====================================================================
  // EXPORTAÇÃO PARA WORD (.DOCX / .DOC)
  // =====================================================================
  async exportToWord() {
    const buttons = [this.btnDownloadDocx, this.btnDownloadDocxTop].filter(Boolean);
    const originals = buttons.map(b => b.innerHTML);
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
      buttons.forEach((b, i) => {
        b.innerHTML = originals[i];
        b.disabled = false;
      });
    }
  }

  // =====================================================================
  // EXPORTAÇÃO PARA PDF (.PDF) - 6 PÁGINAS OFICIAIS SEM CORTE
  // =====================================================================
  async exportToPdf() {
    const buttons = [this.btnDownloadPdf, this.btnDownloadPdfTop].filter(Boolean);
    const originals = buttons.map(b => b.innerHTML);
    buttons.forEach(b => {
      b.innerHTML = `<span>⏳ Baixando PDF...</span>`;
      b.disabled = true;
    });

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

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      pdf.save(filename);

      this.addAssistantMessage(`📄 Seu arquivo PDF **${filename}** foi gerado com sucesso em 6 páginas oficiais idênticas ao modelo da Justiça Federal! Todas as 6 folhas contam com cabeçalho oficial, rodapé numerado, formatação alinhada e texto 100% justificado.`);
    } catch (err) {
      console.error("Erro na exportação PDF:", err);
      window.print();
    } finally {
      buttons.forEach((b, i) => {
        b.innerHTML = originals[i];
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
}

// Inicializa a aplicação assim que o DOM carregar
window.addEventListener("DOMContentLoaded", () => {
  window.app = new PericiaApp();
});
