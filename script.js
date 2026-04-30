
const COZE_TOKEN = 'pat_a7cNS1ynL4dRxvnegq5ytHaJKoyu8NRSYYIBsFfsu9dvcw78LTmkYDoFoIv95Zc3';
const BOT_ID     = '7634463423774031877';
const API_BASE   = 'https://api.coze.com';
 
// ─── Intro анімація ───────────────────────────────────────────────────────────
 
const texts = [
  "Привіт 👋",
  "Я твій AI друг!",
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
  const intro    = document.getElementById("intro");
  const inputBox = document.getElementById("inputBox");
 
  intro.style.opacity = "0";
  setTimeout(() => {
    intro.style.display = "none";
    chatArea.style.display = "flex";
    inputBox.classList.add("show");
    messageInput.focus();
  }, 900);
}
 
// ─── DOM елементи чату ────────────────────────────────────────────────────────
 
const chatArea     = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const micBtn       = document.getElementById("micBtn");
const statusBar    = document.getElementById("statusBar");
 
// ─── Допоміжні функції ────────────────────────────────────────────────────────
 
function setStatus(text, type = "default") {
  statusBar.textContent = text;
  statusBar.className = "input-status" + (type !== "default" ? ` ${type}` : "");
}
 
function getTime() {
  return new Date().toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
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
 
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
 
// ─── Coze API ─────────────────────────────────────────────────────────────────
 
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
        { role: "user", content: message, content_type: "text" }
      ]
    })
  });
 
  if (!chatRes.ok) {
    const errText = await chatRes.text();
    throw new Error(`Coze API помилка ${chatRes.status}: ${errText}`);
  }
 
  const chatData = await chatRes.json();
  console.log("Chat response:", chatData);
 
  const chatId         = chatData.data?.id               ?? chatData.id;
  const conversationId = chatData.data?.conversation_id  ?? chatData.conversation_id;
 
  if (!chatId || !conversationId) {
    throw new Error("Не вдалося отримати chat_id або conversation_id від Coze");
  }
 
  return await pollForAnswer(chatId, conversationId);
}
 
async function pollForAnswer(chatId, conversationId) {
  const MAX_ATTEMPTS = 40;
  const INTERVAL_MS  = 1000;
 
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await sleep(INTERVAL_MS);
 
    const statusRes = await fetch(
      `${API_BASE}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
      { headers: { "Authorization": `Bearer ${COZE_TOKEN}` } }
    );
 
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      console.log(`Attempt ${attempt + 1} status:`, statusData);
 
      const status = statusData.data?.status ?? statusData.status;
 
      if (status === "completed") return await fetchMessages(chatId, conversationId);
      if (status === "failed" || status === "requires_action") {
        throw new Error(`Coze повернув статус: ${status}`);
      }
    }
  }
 
  throw new Error("Час очікування вичерпано. Спробуй ще раз.");
}
 
async function fetchMessages(chatId, conversationId) {
  const msgRes = await fetch(
    `${API_BASE}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
    { headers: { "Authorization": `Bearer ${COZE_TOKEN}` } }
  );
 
  if (!msgRes.ok) throw new Error(`Помилка отримання повідомлень: ${msgRes.status}`);
 
  const msgData = await msgRes.json();
  console.log("Messages:", msgData);
 
  const messages = msgData.data ?? msgData.messages ?? [];
 
  const answer = messages.find(m => m.role === "assistant" && m.type === "answer");
  if (answer?.content) return answer.content;
 
  const anyAssistant = messages.find(m => m.role === "assistant");
  if (anyAssistant?.content) return anyAssistant.content;
 
  throw new Error("Бот відповів, але повідомлення порожнє.");
}
 
// ─── Відправка повідомлення (єдина версія) ────────────────────────────────────
 
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  if (sendBtn.disabled) return;   // захист від подвійного натискання
 
  addMessage(message, "user");
  messageInput.value = "";
  sendBtn.disabled = true;
  setStatus("Бот думає...", "loading");
 
  const typingEl = addTypingIndicator();
 
  try {
    const reply = await callCozeAPI(message);
    typingEl.remove();
    addMessage(reply, "ai");
    speak(reply);                 // озвучуємо відповідь
    setStatus("Готовий до розмови ✦");
  } catch (error) {
    console.error("Помилка:", error);
    typingEl.remove();
    addMessage(`Помилка: ${error.message}`, "ai");
    setStatus("Сталася помилка. Спробуй ще раз.", "error");
    setTimeout(() => setStatus("Готовий до розмови ✦"), 4000);
  } finally {
    sendBtn.disabled = false;
    messageInput.focus();
  }
}
 
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
 
sendBtn.addEventListener("click", sendMessage);
 
// ─── Озвучення тексту ─────────────────────────────────────────────────────────
 
function speak(text) {
  if (!window.speechSynthesis) return;
 
  // Зупиняємо попереднє озвучення якщо є
  window.speechSynthesis.cancel();
 
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "uk-UA";
  utterance.rate = 1;
  utterance.pitch = 1;
 
  // Намагаємось знайти український голос
  // Голоси можуть завантажуватись асинхронно — чекаємо якщо потрібно
  function doSpeak() {
    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find(v => v.lang === "uk-UA") ||
                    voices.find(v => v.lang.startsWith("uk"));
    if (ukVoice) utterance.voice = ukVoice;
    window.speechSynthesis.speak(utterance);
  }
 
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak();
  } else {
    // Голоси ще не завантажились — чекаємо подію
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    };
  }
}
 
// ─── Голосове введення (безпечна ініціалізація) ───────────────────────────────
 
const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
 
if (SpeechAPI) {
  const recognition = new SpeechAPI();
  recognition.lang            = 'uk-UA';
  recognition.interimResults  = false;
  recognition.continuous      = false;
  recognition.maxAlternatives = 1;
 
  let isListening = false;
  let gotResult   = false;
 
  function stopRecognition() {
    isListening = false;
    micBtn.classList.remove("listening");
    try { recognition.stop(); } catch (_) {}
  }
 
  function startVoiceInput() {
    if (isListening) {
      stopRecognition();
      setStatus("Готовий до розмови ✦");
      return;
    }
    // Зупиняємо озвучення бота поки говоримо
    window.speechSynthesis?.cancel();
    gotResult = false;
    try {
      recognition.start();
    } catch (e) {
      console.error("Не вдалося запустити розпізнавання:", e);
    }
  }
 
  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    setStatus("🎤 Слухаю...", "mic");
  };
 
  recognition.onresult = (event) => {
    gotResult = true;
    const text = event.results[0][0].transcript;
    messageInput.value = text;
    stopRecognition();
    // Автоматично відправляємо повідомлення
    sendMessage();
  };
 
  recognition.onend = () => {
    if (isListening) {
      isListening = false;
      micBtn.classList.remove("listening");
      if (!gotResult) setStatus("Готовий до розмови ✦");
    }
  };
 
  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    stopRecognition();
    const msgs = {
      "not-allowed": "Доступ до мікрофону заборонено. Дозволь його в налаштуваннях браузера.",
      "no-speech":   "Нічого не почуто. Спробуй ще раз.",
      "network":     "Помилка мережі при розпізнаванні мови."
    };
    setStatus(msgs[event.error] ?? `Помилка мікрофону: ${event.error}`, "error");
    setTimeout(() => setStatus("Готовий до розмови ✦"), 4000);
  };
 
  micBtn.addEventListener("click", startVoiceInput);
 
} else {
  console.warn("SpeechRecognition не підтримується цим браузером.");
  micBtn.style.display = "none";
}
