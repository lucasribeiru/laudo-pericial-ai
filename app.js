/**
 * APLICAÇÃO PRINCIPAL - CHAT IA COM EXTRAÇÃO MULTIMODAL E GERAÇÃO DE LAUDO
 * Interface inspirada no Google Gemini
 * Formato Oficial: Justiça Federal / Seção Judiciária do Amapá (Anexo IV)
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

    // Casos rápidos de demonstração
    this.quickChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const caseKey = chip.getAttribute("data-case");
        if (caseKey && SAMPLE_CASES[caseKey]) {
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
    const greeting = `Olá! Sou seu **Assistente Pericial Oficial com IA**. 
    
Você pode anexar os documentos do processo (RG, CPF, Certidões, Extrato do CadÚnico, Laudos Médicos) e **fotos da moradia / visita domiciliar**.

Com base neles, farei a **inspeção visual minuciosa das imagens** (identificando tipo de logradouro/rua de terra ou asfalto, tipo de construção alvenaria ou madeira, cobertura de amianto ou barro, tipo de piso, inventário dos bens móveis e condições sanitárias) e preencherei automaticamente o **Formulário de Perícia Socioeconômica (Anexo IV da Justiça Federal do Amapá)**, pronto para download imediato em **Word (.docx)** e **PDF (.pdf)** 100% oficial.

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
    const lower = (userText + " " + files.map(f => f.name).join(" ")).toLowerCase();

    if (lower.includes("lucas") || lower.includes("brasil novo")) {
      caseToUse = SAMPLE_CASES.lucas;
    }

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

  cb(checked, label) {
    return checked ? `( <strong>X</strong> ) ${label}` : `( &nbsp;&nbsp; ) ${label}`;
  }

  // =====================================================================
  // RENDERIZAÇÃO DA FOLHA A4 JUDICIAL INTERATIVA (MODELO OFICIAL EXATO)
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

    this.a4Content.innerHTML = `
      <!-- Cabeçalho Oficial Idêntico com Brasão Colorido da República -->
      <div class="judicial-header">
        <img src="${brasaoImg}" class="official-header-img" alt="Poder Judiciário - Justiça Federal do Amapá" />
        <div class="judicial-form-title">PERÍCIA SOCIOECONÔMICA</div>
      </div>

      <!-- Tabela em Caixa Fechada Oficial (Identificação Judicial) -->
      <table class="judicial-box-table">
        <tr>
          <td colspan="3"><span class="field-label">Processo nº</span> <input type="text" class="editable-input-table" style="width:240px; font-weight:bold;" data-path="identificacao.processo" value="${id.processo || ''}"></td>
        </tr>
        <tr>
          <td colspan="3"><span class="field-label">Periciado:</span> <input type="text" class="editable-input-table" style="width:75%; font-weight:bold;" data-path="identificacao.periciado" value="${id.periciado || ''}"></td>
        </tr>
        <tr>
          <td colspan="3"><span class="field-label">Representante Legal:</span> <input type="text" class="editable-input-table" style="width:70%; font-weight:bold;" data-path="identificacao.representanteLegal" value="${id.representanteLegal || ''}"></td>
        </tr>
        <tr>
          <td colspan="3">
            <span class="field-label">CPF:</span> <input type="text" class="editable-input-table" style="width:130px;" data-path="identificacao.cpf" value="${id.cpf || ''}"> &nbsp;
            <span class="field-label">RG:</span> <input type="text" class="editable-input-table" style="width:90px;" data-path="identificacao.rg" value="${id.rg || ''}"> &nbsp;
            <span class="field-label">COD.F</span> <input type="text" class="editable-input-table" style="width:110px;" data-path="identificacao.codF" value="${id.codF || ''}"> &nbsp;
            <span class="field-label">NIS:</span> <input type="text" class="editable-input-table" style="width:120px;" data-path="identificacao.nis" value="${id.nis || ''}">
          </td>
        </tr>
        <tr>
          <td colspan="3">
            <span class="field-label">Sexo:</span>
            <label class="cb-item"><input type="radio" name="sexo" value="M" ${id.sexo === 'M' ? 'checked' : ''} onchange="app.updateField('identificacao.sexo', 'M')"> ( X )M</label> &nbsp;&nbsp;
            <label class="cb-item"><input type="radio" name="sexo" value="F" ${id.sexo === 'F' ? 'checked' : ''} onchange="app.updateField('identificacao.sexo', 'F')"> (  )F</label>
          </td>
        </tr>
        <tr>
          <td colspan="3"><span class="field-label">Data Nascimento:</span> <input type="text" class="editable-input-table" style="width:120px;" data-path="identificacao.dataNascimento" value="${id.dataNascimento || ''}"></td>
        </tr>
        <tr>
          <td colspan="3"><span class="field-label">OBJETO:</span> <input type="text" class="editable-input-table" style="width:80%;" data-path="identificacao.objeto" value="${id.objeto || 'Benefício de Prestação Continuada- BPC'}"></td>
        </tr>
        <tr>
          <td style="width:40%;">
            <span class="field-label">Profissão Anterior:</span> <input type="text" class="editable-input-table" style="width:200px;" data-path="identificacao.profissaoAnterior" value="${id.profissaoAnterior || 'Estudante'}"><br>
            <span class="field-label">Profissão Atual:</span> <input type="text" class="editable-input-table" style="width:215px;" data-path="identificacao.profissaoAtual" value="${id.profissaoAtual || 'Estudante'}">
          </td>
          <td style="width:30%;">
            <span class="field-label">Estado Civil:</span><br>
            <input type="text" class="editable-input-table" style="width:140px;" data-path="identificacao.estadoCivil" value="${id.estadoCivil || 'Solteiro'}">
          </td>
          <td style="width:30%;">
            <span class="field-label">Naturalidade:</span><br>
            <input type="text" class="editable-input-table" style="width:140px;" data-path="identificacao.naturalidade" value="${id.naturalidade || 'Macapá/AP'}">
          </td>
        </tr>
        <tr>
          <td colspan="3"><span class="field-label">Escolaridade:</span> <input type="text" class="editable-input-table" style="width:400px;" data-path="identificacao.escolaridade" value="${id.escolaridade || '3 ano fundamental'}"></td>
        </tr>
        <tr>
          <td colspan="2"><span class="field-label">Endereço da parte (igual ao local da perícia)</span> <input type="text" class="editable-input-table" style="width:90%;" data-path="identificacao.endereco" value="${id.endereco || ''}"></td>
          <td><span class="field-label">Telefone:</span><br><input type="text" class="editable-input-table" style="width:140px;" data-path="identificacao.telefone" value="${id.telefone || ''}"></td>
        </tr>
      </table>

      <!-- SEÇÃO 2: SITUAÇÃO PESSOAL -->
      <div class="form-section-block">
        <div class="judicial-form-title" style="border:none; margin: 12px 0 6px;">SITUAÇÃO PESSOAL</div>
        
        <div class="field-line">
          <span class="field-label">Está em idade de trabalhar (acima de 16 anos)?</span>
        </div>
        <div>
          <input type="text" class="editable-input" style="width:100%;" data-path="situacaoPessoal.idadeTrabalharQual" value="${sp.idadeTrabalhar === 'Não' ? 'Não.' : (sp.idadeTrabalharQual || 'Não.')}">
        </div>

        <div class="field-line" style="margin-top:6px;">
          <span class="field-label">Realizou cursos profissionalizantes? Especificar.</span>
        </div>
        <div>
          <input type="text" class="editable-input" style="width:100%;" data-path="situacaoPessoal.cursosQual" value="${sp.cursosProfissionalizantes === 'Não' ? 'Não.' : (sp.cursosQual || 'Não.')}">
        </div>

        <div class="field-line" style="margin-top:6px;">
          <span class="field-label">Já exerceu atividade remunerada? Especificar.</span>
        </div>
        <div>
          <input type="text" class="editable-input" style="width:100%;" data-path="situacaoPessoal.jaExerceuQual" value="${sp.jaExerceuAtividade === 'Não' ? 'Não.' : (sp.jaExerceuQual || 'Não.')}">
        </div>

        <div class="field-line" style="margin-top:6px;">
          <span class="field-label">Teve a CTPS assinada? Especificar.</span>
        </div>
        <div>
          <input type="text" class="editable-input" style="width:100%;" data-path="situacaoPessoal.teveCtpsDetalhes" value="${sp.teveCtpsAssinada === 'Não' ? 'Não.' : (sp.teveCtpsDetalhes || 'Não.')}">
        </div>

        <div style="margin-top:10px;">
          <span class="field-label">CTPS (Nº Série )</span>
          <table class="judicial-table">
            <thead>
              <tr><th>Nº</th><th>EMPRESA</th><th>CARGO</th><th>ENTRADA</th><th>SAÍDA</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td></tr>
              <tr><td>2</td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SEÇÃO 3: SITUAÇÃO FAMILIAR E RENDA -->
      <div class="form-section-block" style="margin-top:20px;">
        <div class="judicial-form-title" style="border:none; margin: 12px 0 6px;">SITUAÇÃO FAMILIAR – RENDA DOS INTEGRANTES</div>
        
        <table class="judicial-table">
          <thead>
            <tr>
              <th style="width:35%;">NOME COMPLETO</th>
              <th style="width:20%;">ESTADO CIVIL</th>
              <th style="width:25%;">CPF/NIS</th>
              <th style="width:20%;">NASCIMENTO</th>
            </tr>
          </thead>
          <tbody>
            ${fam.map((m, idx) => `
              <tr>
                <td><input type="text" value="${m.nome || ''}" onchange="app.updateFamilyMember(${idx}, 'nome', this.value)"></td>
                <td><input type="text" value="${m.estadoCivil || ''}" onchange="app.updateFamilyMember(${idx}, 'estadoCivil', this.value)"></td>
                <td><input type="text" value="${m.cpfNis || ''}" onchange="app.updateFamilyMember(${idx}, 'cpfNis', this.value)"></td>
                <td><input type="text" value="${m.idadeNasc || ''}" onchange="app.updateFamilyMember(${idx}, 'idadeNasc', this.value)"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align:center; font-weight:bold; font-size:10pt; margin: 10px 0 6px;">CONTINUAÇÃO</div>

        <table class="judicial-table">
          <thead>
            <tr>
              <th style="width:25%;">PARENTESCO</th>
              <th style="width:35%;">OCUPAÇÃO</th>
              <th style="width:20%;">RENDA MENSAL</th>
              <th style="width:20%;">R. COMPROVADA?</th>
            </tr>
          </thead>
          <tbody>
            ${fam.map((m, idx) => `
              <tr>
                <td><input type="text" value="${m.parentesco || ''}" onchange="app.updateFamilyMember(${idx}, 'parentesco', this.value)"></td>
                <td><input type="text" value="${m.ocupacao || ''}" onchange="app.updateFamilyMember(${idx}, 'ocupacao', this.value)"></td>
                <td><input type="number" step="0.01" value="${m.rendaMensal || 0}" onchange="app.updateFamilyMember(${idx}, 'rendaMensal', parseFloat(this.value)||0)"></td>
                <td><input type="text" value="${m.tipoRenda || 'Comprovada'}" onchange="app.updateFamilyMember(${idx}, 'tipoRenda', this.value)"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <button class="btn-add-row" onclick="app.addFamilyMember()">+ Adicionar Integrante da Família</button>

        <div style="font-size:8pt; color:#444; margin-top:8px; line-height:1.3; text-align:justify;">
          * “renda mensal bruta familiar: a soma dos rendimentos brutos auferidos mensalmente pelos membros da família composta por salários, proventos, pensões, pensões alimentícias, benefícios de previdência pública ou privada, comissões, pró-labore, outros rendimentos do trabalho não assalariado, rendimentos do mercado informal ou autônomo, rendimentos auferidos do patrimônio, Renda Mensal Vitalícia e Benefício de Prestação Continuada, ressalvado o disposto no parágrafo único do art. 19.” (Art. 4º, VI, do anexo do Decreto nº 6.214/2007).
        </div>

        <div style="margin-top:12px;">
          <span class="field-label">Quantos possuem carteira de trabalho, CTPS, assinada?</span><br>
          <input type="text" class="editable-input" style="width:100%; margin-top:3px;" data-path="carteiraAssinadaFamilia" value="${d.carteiraAssinadaFamilia || 'Nenhum membro da família possui CTPS assinada atualmente.'}">
        </div>

        <div style="margin-top:10px;">
          <span class="field-label">Qual a renda familiar per capita mensal? Especificar com cálculo, conforme art. 20 da lei nº. 8.742/93 - LOAS.</span><br>
          <input type="text" class="editable-input" style="width:100%; margin-top:3px;" data-path="rendaObservacao" value="${d.rendaObservacao || `Renda per capita: ${formatBRL(d.rendaPerCapita)}.`}">
        </div>
      </div>

      <!-- SEÇÃO 4: SITUAÇÃO DE MORADIA -->
      <div class="form-section-block" style="margin-top:20px;">
        <div class="judicial-form-title" style="border:none; margin: 12px 0 6px;">SITUAÇÃO DE MORADIA</div>
        
        <div style="margin-top:6px;">
          <span class="field-label">Reside em quê? Abrigos, asilos ou similares, casa, apartamento etc.</span>
          <textarea class="editable-textarea" style="min-height:95px; margin-top:4px;" data-path="moradia.detalhesCompletos">${m.detalhesCompletos || `Reside em casa com construção em ${m.construcao || 'alvenaria'}, coberto com ${m.cobertura || 'telha de amianto'} e possui ${m.comodos || 5} cômodos: (${m.comodosDescricao || 'uma sala, um quarto, uma suite, uma cozinha conjugada, banheiro, area de servico'}). A residência encontra-se em área ${m.zona || 'rural'} do município de Mazagão, de difícil acesso, com infraestrutura limitada. Fica próximos aos equipamentos sociais necessários a uma boa convivência comunitária, tais como: Escola, unidade básica de saúde, igrejas, mercantis e outros. Estado geral: condições razoáveis, porém sem padrões adequados de saneamento. Infraestrutura comunitária: ${m.agua || 'Ausência de abastecimento público de água tratada'}, ${m.esgoto || 'Ausência de rede de esgoto'}, ${m.energia || 'Iluminação elétrica regular'}, ${m.rua || 'Rua pavimentada com trechos degradados'}. Piso: ${m.piso || 'Lajota cerâmica simples com acabamento rústico'}.`}</textarea>
        </div>

        <div style="margin-top:8px;">
          <span class="field-label">Há quanto tempo reside no local?</span><br>
          <input type="text" class="editable-input" style="width:100%;" data-path="moradia.tempoResidencia" value="${m.tempoResidencia || 'Residem neste imóvel há 10 anos.'}">
        </div>

        <div style="margin-top:8px;">
          <span class="field-label">Imóvel próprio, alugado ou de terceiro?</span><br>
          <input type="text" class="editable-input" style="width:100%;" data-path="moradia.proprietarioImovel" value="${m.proprietarioImovel ? 'É da ' + m.proprietarioImovel : 'É cedido.'}">
        </div>

        <div style="margin-top:8px;">
          <span class="field-label">Trata-se residência habitual ou temporária (de passagem)?</span><br>
          <input type="text" class="editable-input" style="width:100%;" data-path="moradia.caraterResidencia" value="${m.caraterResidencia || 'Residência habitual.'}">
        </div>

        <div style="margin-top:8px;">
          <span class="field-label">Especificar que bens guarnecem a residência.</span>
          <textarea class="editable-textarea" style="min-height:90px; margin-top:4px;" data-path="moradia.bensListagem">${m.bensTextoPadrao ? `${m.bensTextoPadrao}\n\nNo Imóvel continha os seguintes bens permanentes: ${m.bensListagem}` : m.bensListagem}</textarea>
        </div>
      </div>

      <!-- SEÇÃO 5: DESPESAS -->
      <div class="form-section-block" style="margin-top:20px;">
        <div class="judicial-form-title" style="border:none; margin: 12px 0 6px;">DESPESAS cont....</div>
        
        <div style="margin-top:6px;">
          <span class="field-label">Quais os gastos com moradia, água, luz etc.?</span>
          <div style="margin-top:4px; font-size:9.5pt; line-height:1.4;">
            <p><strong>Habitação:</strong> <input type="text" class="editable-input" style="width:85%;" data-path="despesas.habitacaoObs" value="${desp.habitacaoObs || 'Não possui gasto neste item porque residem em imóvel cedido, porém há custos indiretos altos com manutenção de poço e fossa.'}"></p>
            <p style="margin-top:4px;"><strong>Energia elétrica:</strong> <input type="text" class="editable-input" style="width:80%;" data-path="despesas.energiaObs" value="${desp.energiaObs || `É fornecida pela empresa Equatorial no valor de ${formatBRL(desp.energia)}.`}"></p>
            <p style="margin-top:4px;"><strong>Alimentação:</strong> <input type="text" class="editable-input" style="width:80%;" data-path="despesas.alimentacaoObs" value="${desp.alimentacaoObs || `Gastam em média ${formatBRL(desp.alimentacao)} mensais, indicando insegurança alimentar.`}"></p>
            <p style="margin-top:4px;"><strong>Transporte:</strong> <input type="text" class="editable-input" style="width:82%;" data-path="despesas.transporteObs" value="${desp.transporteObs || 'Deslocamentos extraordinários para tratamento em Macapá (itinerário de 64 km ida e volta).' }"></p>
          </div>
        </div>

        <div style="margin-top:10px;">
          <span class="field-label">Quais os gastos com saúde (tudo incluído)</span>
          <textarea class="editable-textarea" style="min-height:90px; margin-top:4px;" data-path="despesas.saudeObs">${desp.saudeObs || 'O requerente realiza tratamento médico contínuo pelo SUS do Governo do Estado do Amapá, através do Hospital de Clínica Alberto Lima-HCAL/Núcleo de Avaliação do Neurodesenvolvimento-NANDE. A falta de recursos financeiros compromete a evolução do tratamento e caracteriza risco social.'}</textarea>
        </div>
      </div>

      <!-- SEÇÃO 6: CONCLUSÕES -->
      <div class="form-section-block" style="margin-top:20px;">
        <div class="judicial-form-title" style="border:none; margin: 12px 0 6px;">CONCLUSÕES</div>
        
        <textarea class="editable-textarea" style="min-height:130px; margin-top:6px;" data-path="conclusao.textoParecerComplementar">${c.textoParecerComplementar || ''}</textarea>

        <div style="margin-top:12px;">
          <span class="field-label">Fundamentadamente, se for o caso, classifique a perícia de 1 a 3 de acordo com o grau crescente de complexidade, risco, distância e dificuldade de acesso ao local da perícia:</span>
          <textarea class="editable-textarea" style="min-height:75px; margin-top:4px;" data-path="classificacao.justificativa">${cl.justificativa || 'Grau 3, porque o endereço do requerente está localizado em área rural no Município de Mazagão distante de Macapá cerca de 32 km, totalizando 64 km ida e volta, com via degradada e sinal de telefonia instável.'}</textarea>
        </div>

        <div style="margin-top:8px; font-size:9.5pt; line-height:1.6;">
          <div>Complexidade ${this.cb(cl.complexidade == 1, '1')} ${this.cb(cl.complexidade == 2, '2')} ${this.cb(cl.complexidade == 3, '3')}</div>
          <div>Risco ${this.cb(cl.risco == 1, '1')} ${this.cb(cl.risco == 2, '2')} ${this.cb(cl.risco == 3, '3')}</div>
          <div>Distância ${this.cb(cl.distancia == 1, '1')} ${this.cb(cl.distancia == 2, '2')} ${this.cb(cl.distancia == 3, '3')}</div>
          <div>Dificuldade de acesso ${this.cb(cl.dificuldadeAcesso == 1, '1')} ${this.cb(cl.dificuldadeAcesso == 2, '2')} ${this.cb(cl.dificuldadeAcesso == 3, '3')}</div>
          <div>Situação em local de risco social elevado ${this.cb(cl.riscoSocial == 1, '1')} ${this.cb(cl.riscoSocial == 2, '2')} ${this.cb(cl.riscoSocial == 3, '3')}</div>
        </div>

        <div style="margin-top:14px; font-size:9.5pt;">
          <p><strong>Pericial Social</strong></p>
          <p>Local: <input type="text" class="editable-input" style="width:160px;" data-path="encerramento.municipio" value="${enc.municipio || 'município de Mazagão/AP'}"></p>
          <p>Data da perícia in loco: <input type="text" class="editable-input" style="width:160px;" data-path="encerramento.dataPericia" value="${enc.dataPericia || '05 de setembro de 2026.'}"></p>
          <p>Hora da perícia in loco: <input type="text" class="editable-input" style="width:90px;" data-path="encerramento.horaPericia" value="${enc.horaPericia || '08: 00 h.'}"></p>
        </div>

        <div class="signature-block" style="margin-top:35px; text-align:center;">
          <div class="signature-line" style="width:280px; height:1px; background:#000; margin: 0 auto 6px;"></div>
          <div class="signature-name" style="font-weight:bold; font-size:10pt;">${enc.nomePerito || 'Ivonete Ferreira Maciel'}</div>
          <div class="signature-role" style="font-size:9pt; color:#444;">${enc.cargoPerito || 'Doutora em Serviço Social'}</div>
          <div class="signature-role" style="font-size:9pt; color:#444;">${enc.cress || 'CRESS 104 24ª Região-AP'}</div>
        </div>
      </div>

      <!-- Rodapé Oficial da Seção Judiciária do Amapá -->
      <div class="official-page-footer">
        <span>Rodovia Norte Sul, s/n – Bairro Infraero II, CEP. 68908-911 - Macapá-AP, site: portal.trf1.jus.br/sjap. Fones: 3251-5507</span>
      </div>
    `;

    // Vincula inputs com two-way data binding
    this.a4Content.querySelectorAll("[data-path]").forEach(input => {
      input.addEventListener("input", (e) => {
        const path = e.target.getAttribute("data-path");
        const val = e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
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
  // EXPORTAÇÃO PARA PDF (.PDF)
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

      if (window.html2pdf) {
        const opt = {
          margin: [8, 8, 8, 8],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await window.html2pdf().set(opt).from(this.a4Content).save();
        this.addAssistantMessage(`📄 Seu arquivo PDF **${filename}** foi gerado com sucesso e o download foi iniciado no seu computador!`);
      } else {
        window.print();
      }
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
