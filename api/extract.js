/**
 * VERCEL SERVERLESS FUNCTION — PROXY SEGURO PARA GEMINI API
 * A chave da API fica armazenada como variável de ambiente no Vercel (GEMINI_API_KEY)
 * O frontend chama /api/extract sem nunca conhecer a chave
 * Modelo padrão: gemini-2.0-flash (mais rápido e 100% gratuito)
 */

export default async function handler(req, res) {
  // CORS para permitir chamadas do frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "Chave GEMINI_API_KEY não configurada no servidor.",
      instrucao: "Configure a variável de ambiente GEMINI_API_KEY no painel do Vercel (Settings > Environment Variables)."
    });
  }

  try {
    const { parts, model } = req.body;

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: "O campo 'parts' (array) é obrigatório." });
    }

    // Modelos candidatos: prioriza o mais rápido e gratuito
    const candidateModels = [
      model || "gemini-2.0-flash",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    let geminiResponse = null;
    let successModel = "";
    let lastError = "";

    for (const m of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000); // 55s (Vercel free tier max = 60s)

        geminiResponse = await fetch(url, {
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
          successModel = m;
          break;
        }

        const errBody = await geminiResponse.json().catch(() => null);
        lastError = errBody?.error?.message || geminiResponse.statusText || `Status ${geminiResponse.status}`;

        if (geminiResponse.status === 404) continue;
        break; // Other errors (400, 403, 429) — don't retry

      } catch (e) {
        if (e.name === "AbortError") {
          lastError = `Timeout ao contatar modelo ${m}`;
          continue;
        }
        lastError = e.message;
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      return res.status(502).json({
        error: "Nenhum modelo Gemini respondeu com sucesso.",
        detail: lastError,
        dica: "Verifique se a chave GEMINI_API_KEY é válida e se o plano gratuito não excedeu a cota."
      });
    }

    const data = await geminiResponse.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(502).json({ error: "A IA não retornou conteúdo legível." });
    }

    // Tenta parsear o JSON retornado pela IA
    let extracted;
    try {
      extracted = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch (parseErr) {
      return res.status(200).json({
        success: true,
        model: successModel,
        raw: rawText,
        parsed: null,
        parseError: "A IA retornou texto válido, mas não em JSON parseável."
      });
    }

    return res.status(200).json({
      success: true,
      model: successModel,
      data: extracted
    });

  } catch (err) {
    console.error("Erro no serverless extract:", err);
    return res.status(500).json({ error: err.message });
  }
}
