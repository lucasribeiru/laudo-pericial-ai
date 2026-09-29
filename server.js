import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import extractHandler from './api/extract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Aumenta o limite para suportar envio de fotos e PDFs em base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rota de extração com IA (compatível com a função Vercel original)
app.all('/api/extract', async (req, res) => {
  try {
    await extractHandler(req, res);
  } catch (err) {
    console.error('Erro no handler /api/extract:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno no servidor: ' + err.message });
    }
  }
});

// Servir arquivos estáticos da pasta raiz
app.use(express.static(__dirname));

// Fallback para qualquer rota não mapeada
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Visum Social dev server running at http://${HOST}:${PORT}`);
});
