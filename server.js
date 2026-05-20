const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Paracá Backend attivo!' });
});

app.post('/ai', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key non configurata' });
  }

  const { prompt, pdfBase64 } = req.body;

  const content = pdfBase64
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
      ]
    : prompt;

  const payload = JSON.stringify({
    model: 'gpt-4o',
    max_tokens: 1500,
    messages: [
      { role: 'system', content: 'Sei un assistente per la gestione di un bar. Analizza le fatture e rispondi in italiano in formato JSON strutturato.' },
      { role: 'user', content }
    ]
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (apiRes.statusCode !== 200) {
          return res.status(apiRes.statusCode).json(parsed);
        }
        const text = parsed.choices?.[0]?.message?.content || '';
        res.json({ content: [{ type: 'text', text }] });
      } catch (e) {
        res.status(500).json({ error: 'Errore parsing risposta' });
      }
    });
  });

  apiReq.on('error', (e) => {
    res.status(500).json({ error: e.message });
  });

  apiReq.write(payload);
  apiReq.end();
});

app.listen(PORT, () => {
  console.log(`Server attivo su porta ${PORT}`);
});
