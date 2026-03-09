# Siggy — Arcane Guardian of Ritual
# AI Chatbot for the "Engineer Siggy's Soul" Contest

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set your OpenAI API key:
```bash
export OPENAI_API_KEY="your-key-here"
```

3. Run the bot:
```bash
npm start
```

4. Open `http://localhost:8080` in your browser.

## Deploying for Sharing

To get a shareable link, deploy to one of these free platforms:

### Option A: Railway.app (Recommended)
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo or upload the project
3. Add environment variable: `OPENAI_API_KEY`
4. Deploy — you'll get a public URL

### Option B: Render.com
1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Upload or connect repo
4. Set environment variable: `OPENAI_API_KEY`
5. Start command: `node server.js`

### Option C: Replit
1. Go to [replit.com](https://replit.com)
2. Create new Node.js project
3. Upload all files
4. Add secret: `OPENAI_API_KEY`
5. Run — gets a public URL automatically

## Project Structure
```
siggy-bot/
  server.js          — Express backend + OpenAI integration
  system-prompt.txt  — Siggy's full personality prompt
  package.json       — Dependencies
  public/
    index.html       — Chat interface
    style.css        — Ritual-themed dark UI
    app.js           — Frontend chat logic
```

## Contest Submission
1. Deploy and get your shareable link
2. Screenshot your best Siggy interactions
3. Post on X tagging @ritualfnd with #EngineerSiggysSoul
4. Submit your X link + bot link on Domino quest platform
