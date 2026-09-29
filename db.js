/**
 * MÓDULO DE BANCO DE DADOS E AUTENTICAÇÃO — FIREBASE (FIRESTORE & GOOGLE AUTH)
 * 
 * Conecta o Visum Social ao Firebase Firestore oficial e Firebase Authentication
 * com Google Sign-In, sincronização na nuvem e fallback offline em LocalStorage.
 */

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path, currentAuth) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      providerInfo: currentAuth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class LocalStorageDB {
  constructor() {
    this.connected = false;
    this.storageKey = "visum_pericias";
  }

  _getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || "[]");
    } catch {
      return [];
    }
  }

  _saveAll(items) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async salvarPericia(formData) {
    const items = this._getAll();
    const id = formData.identificacao || {};
    const enc = formData.encerramento || {};
    const conc = formData.conclusao || {};

    const row = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      numero_processo: id.processo || "",
      nome_periciado: id.periciado || "",
      cpf_periciado: id.cpf || "",
      municipio: enc.municipio || "",
      status: "rascunho",
      form_data: formData,
      renda_per_capita: formData.rendaPerCapita || 0,
      parecer_favoravel: conc.parecerFavoravel !== false
    };

    items.unshift(row);
    this._saveAll(items);
    return row;
  }

  async atualizarPericia(id, formData) {
    const items = this._getAll();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error("Perícia não encontrada");
    items[idx].form_data = formData;
    items[idx].nome_periciado = formData.identificacao?.periciado || "";
    items[idx].numero_processo = formData.identificacao?.processo || "";
    items[idx].renda_per_capita = formData.rendaPerCapita || 0;
    items[idx].updated_at = new Date().toISOString();
    this._saveAll(items);
    return items[idx];
  }

  async concluirPericia(id) {
    const items = this._getAll();
    const row = items.find(i => i.id === id);
    if (row) row.status = "concluido";
    this._saveAll(items);
    return row;
  }

  async listarPericias(limit = 50) {
    return this._getAll().slice(0, limit);
  }

  async buscarPericias(query) {
    const q = query.toLowerCase();
    return this._getAll().filter(i =>
      (i.nome_periciado || "").toLowerCase().includes(q) ||
      (i.cpf_periciado || "").includes(q) ||
      (i.numero_processo || "").includes(q)
    );
  }

  async carregarPericia(id) {
    return this._getAll().find(i => i.id === id) || null;
  }

  async excluirPericia(id) {
    const items = this._getAll().filter(i => i.id !== id);
    this._saveAll(items);
    return true;
  }

  exportarParaArquivo(id) {
    const item = this._getAll().find(i => i.id === id);
    if (!item) throw new Error("Perícia não encontrada.");

    const nomeArquivo = `Pericia_${(item.nome_periciado || "SemNome").replace(/[^a-zA-Z0-9_-]/g, "_")}_${item.numero_processo || "Processo"}.visum`;
    const jsonStr = JSON.stringify(item, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
    return nomeArquivo;
  }

  importarDeArquivo(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.form_data) {
            parsed.form_data = JSON.parse(JSON.stringify(parsed));
          }
          parsed.id = "imp_" + Date.now().toString(36);
          parsed.created_at = new Date().toISOString();
          const items = this._getAll();
          items.unshift(parsed);
          this._saveAll(items);
          resolve(parsed);
        } catch (err) {
          reject(new Error("Arquivo de perícia inválido: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo da pasta."));
      reader.readAsText(file);
    });
  }
}

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file'
];

class FirebaseUnifiedDB {
  constructor() {
    this.local = new LocalStorageDB();
    this.connected = false;
    this.firestore = null;
    this.auth = null;
    this.currentUser = null;
    this.cachedAccessToken = null;
    this.modulesLoaded = false;
    this.initFirebase();
  }

  async initFirebase() {
    try {
      // 1. Carrega configuração oficial do Firebase
      const cfgRes = await fetch("/firebase-applet-config.json");
      if (!cfgRes.ok) {
        console.warn("ℹ️ firebase-applet-config.json indisponível. Operando em modo offline.");
        return;
      }
      const firebaseConfig = await cfgRes.json();

      // 2. Importa SDK modular oficial da CDN do Google
      const [{ initializeApp }, { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged }, { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, getDocFromServer }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js")
      ]);

      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
      this.GoogleAuthProvider = GoogleAuthProvider;
      this.signInWithPopup = signInWithPopup;
      this.signOut = signOut;
      this.doc = doc;
      this.getDoc = getDoc;
      this.setDoc = setDoc;
      this.deleteDoc = deleteDoc;
      this.collection = collection;
      this.getDocs = getDocs;
      this.getDocFromServer = getDocFromServer;
      this.modulesLoaded = true;

      // 3. Validação de Conexão com getDocFromServer conforme diretriz oficial
      try {
        await this.getDocFromServer(this.doc(this.firestore, "test", "connection"));
        this.connected = true;
        console.log("✅ Firebase Firestore conectado e validado com getDocFromServer.");
      } catch (connErr) {
        console.warn("⚠️ Teste de conexão Firestore inicial:", connErr.message);
        // O cliente ainda está configurado, mesmo se offline temporariamente
        this.connected = true;
      }

      // 4. Observa estado de autenticação Google
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        if (!user) {
          this.cachedAccessToken = null;
        }
        this.updateAuthUI(user);
        document.dispatchEvent(new CustomEvent("firebase-auth-changed", { detail: user }));
        document.dispatchEvent(new CustomEvent("supabase-ready")); // retrocompatibilidade com badges
      });

    } catch (err) {
      console.error("Falha ao inicializar Firebase:", err);
      this.connected = false;
    }
  }

  updateAuthUI(user) {
    const btn = document.getElementById("btnGoogleAuth");
    const icon = document.getElementById("authIcon");
    const label = document.getElementById("authLabel");

    if (btn && label) {
      if (user) {
        btn.classList.add("authenticated");
        if (icon) {
          if (user.photoURL) {
            icon.innerHTML = `<img src="${user.photoURL}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;">`;
          } else {
            icon.textContent = "👤";
          }
        }
        label.textContent = user.displayName ? user.displayName.split(" ")[0] : (user.email ? user.email.split("@")[0] : "Conectado");
        btn.title = `Conectado como ${user.email} (Clique para desconectar)`;
      } else {
        btn.classList.remove("authenticated");
        if (icon) icon.textContent = "🔑";
        label.textContent = "Entrar com Google";
        btn.title = "Entrar com Conta Google para salvar perícias na nuvem (Firebase)";
      }
    }

    const badgeBD = document.getElementById("statusBadgeBD");
    if (badgeBD) {
      if (user && this.connected) {
        badgeBD.textContent = "☁️ Firestore ✓";
        badgeBD.className = "status-badge connected";
      } else if (this.connected) {
        badgeBD.textContent = "☁️ Firestore (Visitante)";
        badgeBD.className = "status-badge";
      } else {
        badgeBD.textContent = "💾 BD Local";
        badgeBD.className = "status-badge";
      }
    }
  }

  async loginWithGoogle() {
    if (!this.modulesLoaded || !this.auth) {
      alert("Módulo Firebase ainda inicializando. Aguarde alguns instantes...");
      return;
    }
    const provider = new this.GoogleAuthProvider();
    // Adiciona escopos do Google Docs e Google Drive
    SCOPES.forEach(scope => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await this.signInWithPopup(this.auth, provider);
      const credential = this.GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        this.cachedAccessToken = credential.accessToken;
      }
      // Salva perfil na coleção users
      if (result.user) {
        const userDocRef = this.doc(this.firestore, "users", result.user.uid);
        await this.setDoc(userDocRef, {
          uid: result.user.uid,
          email: result.user.email || "",
          displayName: result.user.displayName || "",
          photoURL: result.user.photoURL || "",
          createdAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
      return result.user;
    } catch (err) {
      console.error("Erro no login Google:", err);
      handleFirestoreError(err, OperationType.WRITE, "auth", this.auth);
    }
  }

  async getAccessToken() {
    if (this.cachedAccessToken) return this.cachedAccessToken;
    const user = await this.loginWithGoogle();
    return this.cachedAccessToken;
  }

  async logout() {
    if (this.auth && this.signOut) {
      await this.signOut(this.auth);
    }
    this.cachedAccessToken = null;
  }

  async toggleAuth() {
    if (this.currentUser) {
      const ok = confirm(`Deseja desconectar da conta ${this.currentUser.email}?`);
      if (ok) await this.logout();
    } else {
      await this.loginWithGoogle();
    }
  }

  // =====================================================================
  // EXPORTAÇÃO PARA O GOOGLE DOCS (GOOGLE WORKSPACE)
  // =====================================================================
  async exportToGoogleDocs(formData) {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error("Não foi possível obter permissão de acesso ao Google Docs.");
    }

    const id = formData.identificacao || {};
    const enc = formData.encerramento || {};
    const conc = formData.conclusao || {};
    const mor = formData.moradia || {};
    const desp = formData.despesas || {};

    const docTitle = `Laudo Pericial - ${id.periciado || "Judicial"} - Proc ${id.processo || "TRF1"}`;

    // 1. Cria o documento vazio no Google Docs
    const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title: docTitle })
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erro ao criar Google Doc (${createRes.status})`);
    }

    const docData = await createRes.json();
    const documentId = docData.documentId;

    // 2. Constrói o texto oficial do Laudo Socioeconômico (Anexo IV)
    const reportText = `PODER JUDICIÁRIO — JUSTIÇA FEDERAL DE PRIMEIRO GRAU NO AMAPÁ
VARA ÚNICA DA COMARCA / COJEF / NUCOD
LAUDO PERICIAL SOCIOECONÔMICO (ANEXO IV - PORTARIA Nº 01/2015)
Benefício de Prestação Continuada — BPC/LOAS (Lei nº 8.742/93)
================================================================================

1. IDENTIFICAÇÃO PROCESSUAL E DO(A) PERICIADO(A)
--------------------------------------------------------------------------------
• Processo nº: ${id.processo || "Não informado"}
• Periciado(a): ${id.periciado || "Não informado"}
• Representante Legal: ${id.representanteLegal || "O próprio"}
• CPF: ${id.cpf || "Não informado"} | RG: ${id.rg || "Não informado"}
• COD.F: ${id.codF || "10424"} | NIS: ${id.nis || "Não informado"}
• Data de Nascimento: ${id.dataNascimento || "Não informada"} | Sexo: ${id.sexo || "Não informado"}
• Estado Civil: ${id.estadoCivil || "Não informado"} | Naturalidade: ${id.naturalidade || "Não informada"}
• Endereço: ${id.endereco || "Não informado"} | Telefone: ${id.telefone || "Não informado"}
• Profissão Anterior: ${id.profissaoAnterior || "Informal"} | Atual: ${id.profissaoAtual || "Sem ocupação remunerada"}
• Escolaridade: ${id.escolaridade || "Ensino Fundamental Incompleto"}

2. COMPOSIÇÃO FAMILIAR E SITUAÇÃO ECONÔMICA
--------------------------------------------------------------------------------
${(formData.familia || []).map((m, i) => `${i + 1}. ${m.nome || "Membro"} (${m.parentesco || "Familiar"}) - ${m.idadeNasc || "Idade não inf."} - Ocupação: ${m.ocupacao || "Sem renda"} - Renda: R$ ${Number(m.rendaMensal || 0).toFixed(2)}`).join("\n") || "Nenhum membro cadastrado"}

• Renda Total Familiar: R$ ${Number(formData.rendaTotalFamilia || 0).toFixed(2)}
• Renda Per Capita: R$ ${Number(formData.rendaPerCapita || 0).toFixed(2)} (${formData.rendaPerCapita <= 353 ? "Atende ao critério de 1/4 do Salário Mínimo" : "Análise social complementar necessária"})
• Observações sobre a renda: ${formData.rendaObservacao || "Família sem renda formal fixa estável."}

3. CONDIÇÕES HABITACIONAIS E VISITA DOMICILIAR
--------------------------------------------------------------------------------
• Tipo de Imóvel: ${mor.tipo || "Casa"} (${mor.regimeImovel || "Próprio/Cedido"})
• Tipo de Construção: ${mor.construcao || "Alvenaria"} | Cobertura: ${mor.cobertura || "Telha de amianto"}
• Tipo de Piso: ${mor.piso || "Cimento rústico"} | Cômodos: ${mor.comodos || 4} (${mor.comodosDescricao || "Sala, quarto, cozinha e banheiro"})
• Infraestrutura Urbana: Água: ${mor.agua || "Rede pública"} | Energia: ${mor.energia || "Padrão social"} | Esgoto: ${mor.esgoto || "Fossa séptica"}
• Rua / Acesso: ${mor.rua || "Via urbana"} (Zona: ${mor.zona || "Urbana"})
• Bens Móveis Essenciais: ${mor.bensListagem || "Mobiliário estritamente básico de subsistência familiar."}

4. DESPESAS MENSAIS DECLARADAS / COMPROVADAS
--------------------------------------------------------------------------------
• Alimentação: R$ ${Number(desp.alimentacao || 0).toFixed(2)} (${desp.alimentacaoObs || "Subsistência"})
• Energia Elétrica: R$ ${Number(desp.energia || 0).toFixed(2)} (${desp.energiaObs || "Tarifa social"})
• Água / Saneamento: R$ ${Number(desp.agua || 0).toFixed(2)} (${desp.aguaObs || "Consumo básico"})
• Saúde / Medicamentos: R$ ${Number(desp.saude || 0).toFixed(2)} (${desp.saudeObs || "Remédios contínuos"})
• Transporte: R$ ${Number(desp.transporte || 0).toFixed(2)} (${desp.transporteObs || "Deslocamentos saúde"})

5. ESTUDO SOCIAL E PARECER CONCLUSIVO DO SERVIÇO SOCIAL
--------------------------------------------------------------------------------
${conc.textoEstudoSocial || "O estudo socioeconômico pericial evidenciou situação fática de vulnerabilidade material e precariedade social."}

Dificuldades e Barreiras Enfrentadas:
${conc.textoDificuldades || "A renda familiar é insuficiente para suprir as necessidades vitais básicas de alimentação e saúde."}

PARECER TÉCNICO CONCLUSIVO:
${conc.textoParecerComplementar || (conc.parecerFavoravel ? "Manifesta-se parecer técnico FAVORÁVEL à concessão do BPC/LOAS." : "Manifesta-se parecer técnico DESFAVORÁVEL.")}

6. ENCERRAMENTO E RESPONSABILIDADE TÉCNICA
--------------------------------------------------------------------------------
Local e Data: ${enc.municipio || "Macapá"}/${enc.uf || "AP"}, ${enc.dataPericia || new Date().toLocaleDateString("pt-BR")} às ${enc.horaPericia || "10:30"}
Perito(a) Assistente Social: ${enc.nomePerito || "Dra. Ivonete Ferreira Maciel"}
Qualificação: ${enc.cargoPerito || "Doutora em Serviço Social — Perita Judicial"}
Registro Profissional: ${enc.cress || "CRESS 104 24ª Região-AP"}
================================================================================
Documento gerado eletronicamente pelo Sistema Visum Social — Justiça Federal TRF1.
`;

    // 3. Insere o conteúdo estruturado via batchUpdate
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: reportText
            }
          }
        ]
      })
    });

    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erro ao inserir texto no Google Doc (${updateRes.status})`);
    }

    const editUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    return {
      documentId,
      url: editUrl,
      title: docTitle
    };
  }

  // =====================================================================
  // OPERAÇÕES DE PERÍCIA (FIRESTORE COM FALLBACK LOCAL)
  // =====================================================================
  async salvarPericia(formData) {
    // Se o usuário estiver autenticado no Firebase, salva na subcoleção do usuário no Firestore
    if (this.connected && this.currentUser && this.firestore) {
      const userId = this.currentUser.uid;
      const periciaId = "per_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
      const path = `users/${userId}/pericias/${periciaId}`;

      const id = formData.identificacao || {};
      const enc = formData.encerramento || {};
      const conc = formData.conclusao || {};

      const row = {
        id: periciaId,
        userId: userId,
        numero_processo: id.processo || "",
        nome_periciado: id.periciado || "Sem Nome",
        cpf_periciado: id.cpf || "",
        municipio: enc.municipio || "",
        uf: enc.uf || "AP",
        status: "rascunho",
        perito_nome: enc.nomePerito || "Ivonete Ferreira Maciel",
        perito_cress: enc.cress || "CRESS 104 24ª Região-AP",
        renda_total: Number(formData.rendaTotalFamilia || 0),
        renda_per_capita: Number(formData.rendaPerCapita || 0),
        parecer_favoravel: conc.parecerFavoravel !== false,
        form_data: formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const docRef = this.doc(this.firestore, "users", userId, "pericias", periciaId);
        await this.setDoc(docRef, row);
        // Salva cópia local para cache rápido
        await this.local.salvarPericia(formData);
        return row;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path, this.auth);
      }
    }

    // Fallback Local se não logado
    return await this.local.salvarPericia(formData);
  }

  async atualizarPericia(id, formData) {
    if (this.connected && this.currentUser && this.firestore && !id.startsWith("local_")) {
      const userId = this.currentUser.uid;
      const path = `users/${userId}/pericias/${id}`;

      const ident = formData.identificacao || {};
      const enc = formData.encerramento || {};
      const conc = formData.conclusao || {};

      const row = {
        userId: userId,
        numero_processo: ident.processo || "",
        nome_periciado: ident.periciado || "Sem Nome",
        cpf_periciado: ident.cpf || "",
        municipio: enc.municipio || "",
        form_data: formData,
        renda_total: Number(formData.rendaTotalFamilia || 0),
        renda_per_capita: Number(formData.rendaPerCapita || 0),
        parecer_favoravel: conc.parecerFavoravel !== false,
        updatedAt: new Date().toISOString()
      };

      try {
        const docRef = this.doc(this.firestore, "users", userId, "pericias", id);
        await this.setDoc(docRef, row, { merge: true });
        try { await this.local.atualizarPericia(id, formData); } catch {}
        return { id, ...row };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path, this.auth);
      }
    }

    return await this.local.atualizarPericia(id, formData);
  }

  async concluirPericia(id) {
    if (this.connected && this.currentUser && this.firestore && !id.startsWith("local_")) {
      const userId = this.currentUser.uid;
      const path = `users/${userId}/pericias/${id}`;
      try {
        const docRef = this.doc(this.firestore, "users", userId, "pericias", id);
        await this.setDoc(docRef, { status: "concluido", updatedAt: new Date().toISOString() }, { merge: true });
        try { await this.local.concluirPericia(id); } catch {}
        return { id, status: "concluido" };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path, this.auth);
      }
    }
    return await this.local.concluirPericia(id);
  }

  async listarPericias(limit = 50) {
    if (this.connected && this.currentUser && this.firestore) {
      const userId = this.currentUser.uid;
      const path = `users/${userId}/pericias`;
      try {
        const colRef = this.collection(this.firestore, "users", userId, "pericias");
        const snap = await this.getDocs(colRef);
        const docs = [];
        snap.forEach(d => {
          const item = d.data();
          item.id = d.id;
          docs.push(item);
        });
        docs.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        return docs.slice(0, limit);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path, this.auth);
      }
    }
    return await this.local.listarPericias(limit);
  }

  async buscarPericias(query) {
    const list = await this.listarPericias(100);
    const q = (query || "").toLowerCase();
    return list.filter(i =>
      (i.nome_periciado || "").toLowerCase().includes(q) ||
      (i.cpf_periciado || "").includes(q) ||
      (i.numero_processo || "").includes(q)
    );
  }

  async carregarPericia(id) {
    if (this.connected && this.currentUser && this.firestore && !id.startsWith("local_")) {
      const userId = this.currentUser.uid;
      const path = `users/${userId}/pericias/${id}`;
      try {
        const docRef = this.doc(this.firestore, "users", userId, "pericias", id);
        const snap = await this.getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          data.id = snap.id;
          return data;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path, this.auth);
      }
    }
    return await this.local.carregarPericia(id);
  }

  async excluirPericia(id) {
    if (this.connected && this.currentUser && this.firestore && !id.startsWith("local_")) {
      const userId = this.currentUser.uid;
      const path = `users/${userId}/pericias/${id}`;
      try {
        const docRef = this.doc(this.firestore, "users", userId, "pericias", id);
        await this.deleteDoc(docRef);
        try { await this.local.excluirPericia(id); } catch {}
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path, this.auth);
      }
    }
    return await this.local.excluirPericia(id);
  }

  exportarParaArquivo(id) {
    return this.local.exportarParaArquivo(id);
  }

  importarDeArquivo(file) {
    return this.local.importarDeArquivo(file);
  }
}

// Instância unificada global
const db = new FirebaseUnifiedDB();
