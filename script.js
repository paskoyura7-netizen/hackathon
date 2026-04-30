const COZE_TOKEN = 'YOUR_TOKEN';
const BOT_ID     = 'YOUR_BOT_ID';
const API_BASE   = 'https://api.coze.com';

const texts = [
  "Привіт 👋",
  "Я твій AI друг",
  "Створений для допомоги студентам ІФНТУНГ"
];

const lineEls = [
  document.getElementById("line1"),
  document.getElementById("line2"),
  document.getElementById("line3")
];

const TYPING_SPEED = 55;

function typeText(text, el, cb) {
  let i = 0;
  (function step() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(step, TYPING_SPEED);
    } else if (cb) cb();
  })();
}

typeText(texts[0], lineEls[0], () =>
  typeText(texts[1], lineEls[1], () =>
    typeText(texts[2], lineEls[2], () => {
      document.getElementById("introCursor").style.display = "none";
      setTimeout(showChat, 1800);
    })
  )
);

function showChat() {
  const intro   = document.getElementById("intro");
  const inputBox = document.getElementById("inputBox");

  intro.style.opacity = "0";
  setTimeout(() => {
    intro.style.display = "none";
    chatArea.style.display = "flex";
    inputBox.classList.add("show");
    messageInput.focus();
  }, 900);
}

// ================= CHAT UI =================

const chatArea     = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const statusBar    = document.getElementById("statusBar");

function setStatus(text, type = "default") {
  statusBar.textContent = text;
  statusBar.className = "input-status" + (type !== "default" ? ` ${type}` : "");
}

function addMessage(text, role) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = getTime();

  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);
  chatArea.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function addTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "msg ai typing";
  wrapper.innerHTML = `<div class="bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  chatArea.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function getTime() {
  return new Date().toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ================= API =================

const SESSION_USER_ID = "ifntunh_student_" + Math.random().toString(36).slice(2, 9);

async function callCozeAPI(message) {
  const chatRes = await fetch(`${API_BASE}/v3/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${COZE_TOKEN}`
    },
    body: JSON.stringify({
      bot_id: BOT_ID,
      user_id: SESSION_USER_ID,
      stream: false,
      auto_save_history: true,
      additional_messages: [
        {
          role: "user",
          content: message,
          content_type: "text"
        }
      ]
    })
  });

  if (!chatRes.ok) {
    const errText = await chatRes.text();
    throw new Error(`Coze API помилка ${chatRes.status}: ${errText}`);
  }

  const chatData = await chatRes.json();

  const chatId = chatData.data?.id ?? chatData.id;
  const conversationId = chatData.data?.conversation_id ?? chatData.conversation_id;

  return await pollForAnswer(chatId, conversationId);
}

async function pollForAnswer(chatId, conversationId) {
  for (let i = 0; i < 40; i++) {
    await sleep(1000);

    const res = await fetch(
      `${API_BASE}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
      {
        headers: { Authorization: `Bearer ${COZE_TOKEN}` }
      }
    );

    if (res.ok) {
      const data = await res.json();
      const status = data.data?.status ?? data.status;

      if (status === "completed") {
        return await fetchMessages(chatId, conversationId);
      }

      if (status === "failed") {
        throw new Error("Запит не виконано");
      }
    }
  }

  throw new Error("Таймаут відповіді");
}

async function fetchMessages(chatId, conversationId) {
  const res = await fetch(
    `${API_BASE}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
    {
      headers: { Authorization: `Bearer ${COZE_TOKEN}` }
    }
  );

  const data = await res.json();
  const messages = data.data ?? [];

  const answer = messages.find(m => m.role === "assistant");
  return answer?.content || "Немає відповіді";
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ================= SEND MESSAGE =================

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  if (sendBtn.disabled) return;

  addMessage(message, "user");
  messageInput.value = "";
  sendBtn.disabled = true;
  setStatus("Бот думає...", "loading");

  const typingEl = addTypingIndicator();

  try {
    const reply = await callCozeAPI(message);
    typingEl.remove();

    addMessage(reply, "ai");
    speak(reply);

    setStatus("Готовий до розмови ✦");
  } catch (e) {
    typingEl.remove();
    addMessage(`Помилка: ${e.message}`, "ai");
    setStatus("Помилка", "error");
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ================= VOICE =================

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

recognition.lang = 'uk-UA';
recognition.interimResults = false;

function startVoiceInput() {
  recognition.start();
}

recognition.onresult = function(event) {
  const text = event.results[0][0].transcript;
  messageInput.value = text;
  sendMessage(); // 🔥 автосенд
};

recognition.onerror = function(event) {
  console.error("Speech error:", event.error);
};

recognition.onend = function() {
  recognition.start(); // 🔁 постійне слухання
};

// ================= SPEECH =================

function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "uk-UA";
  speech.rate = 1;
  speech.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(speech);
}

// ================= INIT =================

// авто старт голосу (можеш прибрати якщо не треба)
recognition.start();
