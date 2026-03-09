// === PARTICLES BACKGROUND ===
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h;
  const particles = [];
  const PARTICLE_COUNT = 50;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      color: Math.random() > 0.5 ? 'rgba(139,92,246,' : 'rgba(34,197,94,',
      alpha: Math.random() * 0.4 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > w) p.dx *= -1;
      if (p.y < 0 || p.y > h) p.dy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// === CHAT APP ===
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

const sessionId = 'session-' + Math.random().toString(36).slice(2, 10);
let isWaiting = false;

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
});

// Send on Enter (Shift+Enter for newline)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

function removeWelcome() {
  const welcome = chatContainer.querySelector('.welcome-message');
  if (welcome) welcome.remove();
}

function formatBotMessage(text) {
  // Italicize *actions*
  return text.replace(/\*([^*]+)\*/g, '<em>*$1*</em>');
}

function addMessage(content, role) {
  removeWelcome();
  const div = document.createElement('div');
  div.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  if (role === 'user') avatar.textContent = 'Y';

  const bubble = document.createElement('div');
  bubble.className = 'msg-content';

  if (role === 'bot') {
    bubble.innerHTML = formatBotMessage(content);
  } else {
    bubble.textContent = content;
  }

  div.appendChild(avatar);
  div.appendChild(bubble);
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return div;
}

function addTypingIndicator() {
  removeWelcome();
  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = 'typing';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';

  const bubble = document.createElement('div');
  bubble.className = 'msg-content';
  bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

  div.appendChild(avatar);
  div.appendChild(bubble);
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isWaiting) return;

  addMessage(text, 'user');
  messageInput.value = '';
  messageInput.style.height = 'auto';

  isWaiting = true;
  sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId }),
    });

    const data = await res.json();
    removeTypingIndicator();

    if (data.error) {
      addMessage('*gazes into the void* The arcane channels are disrupted. Try again, traveler.', 'bot');
    } else {
      addMessage(data.reply, 'bot');
    }
  } catch (err) {
    removeTypingIndicator();
    addMessage('*the crystal dims* Siggy cannot reach the grid right now. The multiverse is turbulent...', 'bot');
  }

  isWaiting = false;
  sendBtn.disabled = false;
  messageInput.focus();
}
