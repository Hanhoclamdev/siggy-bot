const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8');

const MULERUN_API_KEY = process.env.MULERUN_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- Dual Provider Setup (Round-Robin, MuleRun first) ---
const providers = [];

if (MULERUN_API_KEY) {
  providers.push({
    name: 'MuleRun',
    client: new OpenAI({ apiKey: MULERUN_API_KEY, baseURL: 'https://api.mulerun.com/v1' }),
    model: process.env.MULERUN_MODEL || 'gpt-4.1-mini',
  });
}
if (OPENAI_API_KEY) {
  providers.push({
    name: 'OpenAI',
    client: new OpenAI({ apiKey: OPENAI_API_KEY }),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
}

if (providers.length === 0) {
  console.error('At least one of MULERUN_API_KEY or OPENAI_API_KEY must be set');
  process.exit(1);
}

let providerIndex = 0;

function getNextProvider() {
  const provider = providers[providerIndex % providers.length];
  providerIndex++;
  return provider;
}

// Store conversation histories in memory (keyed by session)
const sessions = new Map();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const sid = sessionId || 'default';
    if (!sessions.has(sid)) {
      sessions.set(sid, []);
    }
    const history = sessions.get(sid);
    history.push({ role: 'user', content: message });

    // Keep last 20 messages to avoid token overflow
    const recentHistory = history.slice(-20);

    // Round-robin with fallback
    const primary = getNextProvider();
    const fallback = providers.length > 1
      ? providers.find(p => p.name !== primary.name)
      : null;

    let reply = null;
    for (const provider of [primary, fallback].filter(Boolean)) {
      try {
        console.log(`[${provider.name}] Calling model: ${provider.model}`);
        const completion = await provider.client.chat.completions.create({
          model: provider.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...recentHistory,
          ],
          max_tokens: 500,
          temperature: 0.9,
        });

        reply = completion.choices[0].message.content;
        break;
      } catch (err) {
        console.error(`[${provider.name}] Error:`, err.message);
        if (provider === primary && fallback) {
          console.log(`Falling back to ${fallback.name}...`);
        }
      }
    }

    if (!reply) {
      return res.status(500).json({ error: 'All providers failed. Siggy is meditating... try again.' });
    }

    history.push({ role: 'assistant', content: reply });

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Siggy is meditating... try again.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Siggy bot running on port ${PORT}`);
});
