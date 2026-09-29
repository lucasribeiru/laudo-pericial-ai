/**
 * VERCEL SERVERLESS FUNCTION — PROXY INTELIGENTE DE IA PERICIAL
 * Suporta Gemini API (se configurada GEMINI_API_KEY) e Fallback Automático via IA Livre Integrada.
 * Zero configuração para o usuário final: funciona imediatamente sem chaves.
 */

export default async function handler(req, res) {
  // CORS para permitir chamadas de qualquer frontend/desktop
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  const { parts, model } = req.body || {};

  if (!parts || !Array.isArray(parts) || parts.length === 0) {
    return res.status(400).json({ error: "O campo 'parts' (array) é obrigatório." });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // 1. TENTA VIA GEMINI API SE A CHAVE DO SERVIDOR ESTIVER CONFIGURADA
  if (GEMINI_API_KEY) {
    try {
      const candidateModels = [
        model || "gemini-2.0-flash",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-1.5-flash"
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      for (const m of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25000);

          const geminiResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
              }
            })
          });
          clearTimeout(timeout);

          if (geminiResponse.ok) {
            const data = await geminiResponse.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
              return res.status(200).json({
                success: true,
                model: m,
                data: parsed
              });
            }
          }
        } catch (e) {
          console.warn(`Tentativa com ${m} falhou:`, e.message);
        }
      }
    } catch (err) {
      console.warn("Falha no Gemini, acionando fallback livre:", err.message);
    }
  }

  // 2. FALLBACK AUTOMÁTICO VIA IA LIVRE (SEM CHAVE, 100% FUNCIONAL)
  try {
    return await handleFreeAIExtract(parts, res);
  } catch (freeErr) {
    console.error("Erro no processamento da IA livre:", freeErr);
    return res.status(500).json({
      error: "Falha ao processar laudo com a IA: " + freeErr.message
    });
  }
}

async function handleFreeAIExtract(parts, res) {
  let combinedText = "";
  for (const p of parts) {
    if (p.text) combinedText += "\n" + p.text;
  }

  const systemPrompt = `Você é a Dra. Ivonete Ferreira Maciel, Perita Judicial e Assistente Social da Justiça Federal do Amapá.
Com base nas informações, certidões, laudos e fotos da moradia fornecidos, elabore o Formulário Oficial de Perícia Socioeconômica (Anexo IV da Portaria COJEF/NUCOD/AP Nº 01/2015).
Preencha TODOS os campos com dados realistas, fundamentação técnica do Serviço Social e parecer conclusivo.
Retorne EXCLUSIVAMENTE um objeto JSON válido (sem crases nem formatação markdown) com esta estrutura exata:
{
  "identificacao": {
    "processo": "0001842-19.2026.4.01.3100",
    "periciado": "Requerente Identificado nos Autos",
    "representanteLegal": "O próprio / Responsável Familiar",
    "cpf": "123.456.789-00",
    "rg": "123456-AP",
    "codF": "10424",
    "nis": "12345678901",
    "sexo": "F",
    "dataNascimento": "12/05/1982",
    "objeto": "Benefício de Prestação Continuada - BPC (LOAS)",
    "escolaridade": "Ensino Fundamental Incompleto",
    "profissaoAnterior": "Trabalhos informais / Diarista",
    "profissaoAtual": "Sem ocupação remunerada",
    "estadoCivil": "Solteira",
    "naturalidade": "Macapá/AP",
    "endereco": "Área periférica urbana, Macapá-AP",
    "telefone": "(96) 98123-4567"
  },
  "situacaoPessoal": {
    "idadeTrabalhar": "Não",
    "idadeTrabalharQual": "Incapacidade decorrente de patologias e severas barreiras sociais",
    "cursosProfissionalizantes": "Não",
    "cursosQual": "",
    "jaExerceuAtividade": "Sim",
    "jaExerceuQual": "Bicos informais de subsistência",
    "teveCtpsAssinada": "Não",
    "teveCtpsDetalhes": "Sem anotações na CTPS"
  },
  "familia": [
    { "nome": "Requerente", "estadoCivil": "Solteira", "cpfNis": "123.456.789-00", "idadeNasc": "43 anos", "parentesco": "Periciado(a)", "ocupacao": "Sem renda", "rendaMensal": 0, "tipoRenda": "Sem renda" },
    { "nome": "Filho(a) Dependente", "estadoCivil": "Solteiro", "cpfNis": "", "idadeNasc": "14 anos", "parentesco": "Filho(a)", "ocupacao": "Estudante", "rendaMensal": 0, "tipoRenda": "Sem renda" }
  ],
  "carteiraAssinadaFamilia": "Não",
  "carteiraAssinadaQtd": 0,
  "rendaTotalFamilia": 0,
  "rendaPerCapita": 0,
  "rendaObservacao": "O grupo familiar sobrevive sem nenhuma renda fixa formal, dependendo de doações esporádicas de vizinhos e benefícios eventuais.",
  "moradia": {
    "tipo": "Casa",
    "construcao": "alvenaria",
    "cobertura": "telha de amianto",
    "comodos": 4,
    "comodosDescricao": "Sala, quarto, cozinha e banheiro simples",
    "zona": "urbana",
    "acesso": "fácil",
    "tempoResidencia": "Mais de 6 anos",
    "regimeImovel": "Cedido",
    "proprietarioImovel": "Familiar",
    "caraterResidencia": "Habitual",
    "agua": "Rede pública com interrupções",
    "esgoto": "Fossa séptica rudimentar",
    "energia": "Rede elétrica padrão social",
    "rua": "Rua de terra batida / Pavimentação precária",
    "piso": "Cimento rústico",
    "bensTextoPadrao": "Bens móveis estritamente de sobrevivência elementar.",
    "bensListagem": "Geladeira simples antiga, fogão a gás de 4 bocas com marcas de uso, mesa com 4 cadeiras, cama e ventilador. Ausência total de bens supérfluos ou de luxo."
  },
  "despesas": {
    "habitacao": 0,
    "habitacaoObs": "Imóvel cedido por familiares",
    "energia": 75,
    "energiaObs": "Tarifa social de energia elétrica",
    "agua": 35,
    "aguaObs": "Consumo mínimo residencial",
    "alimentacao": 320,
    "alimentacaoObs": "Complementada por auxílios da comunidade",
    "transporte": 60,
    "transporteObs": "Deslocamentos para acompanhamento em saúde",
    "saude": 150,
    "saudeObs": "Medicamentos de uso contínuo não fornecidos pela rede pública"
  },
  "conclusao": {
    "dataVisita": "18/02/2026",
    "nomeEntrevistado": "Próprio periciado(a)",
    "fonteRendaDescricao": "Sem atividade laboral ativa, auxílio de terceiros",
    "rendaTotalExtenso": "Zero reais",
    "vulnerabilidadeEconomicaSevera": true,
    "necessidadeTratamentoContinuo": true,
    "naoDispoeMeiosProprios": true,
    "rendaAtendeCriterioLoas": true,
    "parecerFavoravel": true,
    "textoEstudoSocial": "A perícia socioeconômica realizada in loco evidenciou que a parte autora vivencia situação de extrema vulnerabilidade e precariedade material, sem renda estável e desprovida de patrimônio que lhe garanta subsistência digna. A residência apresenta condições modestas, com mobília restrita ao mínimo existencial.",
    "textoDificuldades": "A renda do grupo familiar é insuficiente para assegurar segurança alimentar regular e custeio das necessidades de saúde indispensáveis.",
    "textoParecerComplementar": "Diante do contexto fático apurado e do cumprimento dos requisitos previstos na Lei Orgânica da Assistência Social (Lei nº 8.742/93, art. 20), manifesta-se parecer técnico FAVORÁVEL à concessão do Benefício de Prestação Continuada (BPC/LOAS)."
  },
  "classificacao": {
    "complexidade": 1,
    "risco": 1,
    "distancia": 1,
    "dificuldadeAcesso": 1,
    "riscoSocial": 2,
    "justificativa": "Caso pericial em área urbana periférica de Macapá, com severa fragilidade socioeconômica constatada."
  },
  "encerramento": {
    "municipio": "Macapá",
    "uf": "AP",
    "dataPericia": "18/02/2026",
    "horaPericia": "10:30",
    "nomePerito": "Ivonete Ferreira Maciel",
    "cargoPerito": "Doutora em Serviço Social",
    "cress": "CRESS 104 24ª Região-AP"
  }
}`;

  const promptFinal = `${systemPrompt}\n\nINFORMAÇÕES E DOCUMENTOS RECEBIDOS:\n${combinedText.substring(0, 4000)}`;

  const response = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "Você é um perito do Serviço Social. Responda APENAS com o JSON do laudo judicial completo." },
        { role: "user", content: promptFinal }
      ],
      model: "openai",
      jsonMode: true
    })
  });

  if (!response.ok) {
    throw new Error(`Serviço de IA retornou status ${response.status}`);
  }

  const raw = await response.text();
  const cleanJson = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleanJson);

  return res.status(200).json({
    success: true,
    model: "ia-livre-integrada",
    data: parsed
  });
}
