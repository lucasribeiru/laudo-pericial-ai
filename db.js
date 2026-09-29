/**
 * MÓDULO DE BANCO DE DADOS — SUPABASE (PostgreSQL Gratuito na Nuvem)
 * 
 * Conecta o Visum Social ao Supabase para salvar, listar, buscar e carregar perícias.
 * 
 * CONFIGURAÇÃO:
 *   1. Crie um projeto gratuito em https://supabase.com
 *   2. Execute o arquivo supabase_schema.sql no SQL Editor do Supabase
 *   3. Copie a URL e a anon key (Settings > API) e cole nas variáveis abaixo
 */

// ============================================================================
// CONFIGURAÇÃO DO SUPABASE — COLE AQUI SEUS DADOS
// ============================================================================
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";  // <-- cole aqui
const SUPABASE_ANON_KEY = "eyJhbG...";                   // <-- cole aqui

// ============================================================================
// CLIENTE SUPABASE (LEVE, SEM SDK PESADO — USA FETCH PURO)
// ============================================================================
class SupabaseClient {
  constructor(url, key) {
    this.url = url.replace(/\/$/, "");
    this.key = key;
    this.restUrl = `${this.url}/rest/v1`;
    this.connected = false;

    // Testa conexão automaticamente ao carregar
    if (url && key && !url.includes("SEU-PROJETO")) {
      this.testConnection().then(ok => {
        this.connected = ok;
        if (ok) {
          console.log("✅ Supabase conectado com sucesso.");
          document.dispatchEvent(new CustomEvent("supabase-ready"));
        } else {
          console.warn("⚠️ Supabase: falha na conexão. Verifique URL e chave.");
        }
      });
    } else {
      console.info("ℹ️ Supabase não configurado. Perícias serão salvas apenas localmente (localStorage).");
    }
  }

  get headers() {
    return {
      "apikey": this.key,
      "Authorization": `Bearer ${this.key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };
  }

  async testConnection() {
    try {
      const res = await fetch(`${this.restUrl}/pericias?select=id&limit=1`, {
        headers: this.headers
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // =====================================================================
  // CRUD DE PERÍCIAS
  // =====================================================================

  /** Salva uma nova perícia no banco de dados */
  async salvarPericia(formData) {
    const id = formData.identificacao || {};
    const enc = formData.encerramento || {};
    const conc = formData.conclusao || {};

    const row = {
      numero_processo: id.processo || "",
      nome_periciado: id.periciado || "",
      cpf_periciado: id.cpf || "",
      municipio: enc.municipio || "",
      uf: enc.uf || "AP",
      status: "rascunho",
      form_data: formData,
      perito_nome: enc.nomePerito || "Ivonete Ferreira Maciel",
      perito_cress: enc.cress || "CRESS 104 24ª Região-AP",
      renda_total: formData.rendaTotalFamilia || 0,
      renda_per_capita: formData.rendaPerCapita || 0,
      parecer_favoravel: conc.parecerFavoravel !== false
    };

    const res = await fetch(`${this.restUrl}/pericias`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(row)
    });

    if (!res.ok) throw new Error(`Erro ao salvar: ${res.statusText}`);
    const data = await res.json();
    return data[0];
  }

  /** Atualiza uma perícia existente */
  async atualizarPericia(id, formData) {
    const ident = formData.identificacao || {};
    const enc = formData.encerramento || {};
    const conc = formData.conclusao || {};

    const row = {
      numero_processo: ident.processo || "",
      nome_periciado: ident.periciado || "",
      cpf_periciado: ident.cpf || "",
      municipio: enc.municipio || "",
      form_data: formData,
      renda_total: formData.rendaTotalFamilia || 0,
      renda_per_capita: formData.rendaPerCapita || 0,
      parecer_favoravel: conc.parecerFavoravel !== false
    };

    const res = await fetch(`${this.restUrl}/pericias?id=eq.${id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(row)
    });

    if (!res.ok) throw new Error(`Erro ao atualizar: ${res.statusText}`);
    const data = await res.json();
    return data[0];
  }

  /** Marca a perícia como concluída */
  async concluirPericia(id) {
    const res = await fetch(`${this.restUrl}/pericias?id=eq.${id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ status: "concluido" })
    });
    if (!res.ok) throw new Error(`Erro ao concluir: ${res.statusText}`);
    return (await res.json())[0];
  }

  /** Lista todas as perícias (mais recentes primeiro) */
  async listarPericias(limit = 50) {
    const res = await fetch(
      `${this.restUrl}/pericias?select=id,created_at,numero_processo,nome_periciado,cpf_periciado,municipio,status,renda_per_capita,parecer_favoravel&order=created_at.desc&limit=${limit}`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Erro ao listar: ${res.statusText}`);
    return await res.json();
  }

  /** Busca perícias por nome ou CPF */
  async buscarPericias(query) {
    const encoded = encodeURIComponent(`%${query}%`);
    const res = await fetch(
      `${this.restUrl}/pericias?or=(nome_periciado.ilike.${encoded},cpf_periciado.ilike.${encoded},numero_processo.ilike.${encoded})&order=created_at.desc&limit=30`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Erro na busca: ${res.statusText}`);
    return await res.json();
  }

  /** Carrega uma perícia completa pelo ID */
  async carregarPericia(id) {
    const res = await fetch(
      `${this.restUrl}/pericias?id=eq.${id}&select=*`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Erro ao carregar: ${res.statusText}`);
    const data = await res.json();
    return data[0] || null;
  }

  /** Exclui uma perícia */
  async excluirPericia(id) {
    const res = await fetch(`${this.restUrl}/pericias?id=eq.${id}`, {
      method: "DELETE",
      headers: this.headers
    });
    if (!res.ok) throw new Error(`Erro ao excluir: ${res.statusText}`);
    return true;
  }
}

// ============================================================================
// FALLBACK LOCAL (LOCALSTORAGE) — Quando Supabase não está configurado
// ============================================================================
class LocalStorageDB {
  constructor() {
    this.connected = false; // Marca que é offline
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
}

// ============================================================================
// INICIALIZAÇÃO AUTOMÁTICA — Usa Supabase se configurado, senão localStorage
// ============================================================================
const db = (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("SEU-PROJETO"))
  ? new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : new LocalStorageDB();
