document.addEventListener("DOMContentLoaded", () => {

  // ⚠️ НЕ ЗБЕРІГАЙ ТОКЕН У ФРОНТЕНДІ (тільки для тесту)
  const COZE_TOKEN = 'YOUR_COZE_TOKEN_HERE';
  const BOT_ID     = '7634463423774031877';
  const API_BASE   = 'https://api.coze.com';

  // ─── Intro анімація ───────────────────────────────────────────────────────

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
    if (!el) return;
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
        const cursor = document.getElementById("introCursor");
        if (cursor) cursor.style.display = "none";
        setTimeout(showChat, 1200);
      })
    )
  );

  // ─── DOM ────────────────────────────────────────────────────────────────

  const chatArea     = document.getElementById("chatArea");
  const messageInput = document.getElementById("messageInput");
  const sendBtn      = document.getElementById("sendBtn");
  const micBtn       = document.getElementById("micBtn");
  const statusBar    = document.getElementById("statusBar");

  function showChat() {
    const intro    = document.getElementById("intro");
    const inputBox = document.getElementById("inputBox");

    if (intro) intro.style.opacity = "0";

    setTimeout(() => {
      if (intro) intro.style.display = "none";
      if (chatArea) chatArea.style.display = "flex";
      if (inputBox) inputBox.classList.add("show");
      if (messageInput) messageInput.focus();
    }, 700);
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────

  function setStatus(text) {
    if (!statusBar) return;
    statusBar.textContent = text;
  }

  function getTime() {
    return new Date().toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function addMessage(text, role) {
    if (!chatArea) return;

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
    chatArea.scrollTop = chatArea.scrollHeight;

    return wrapper;
  }

  function addTypingIndicator() {
    const wrapper = document.createElement("div");
    wrapper.className = "msg ai typing";
    wrapper.innerHTML = `<div class="bubble">
      <div class="dot"></div><div class="dot"></div><div class="dot"></div>
    </div>`;

    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;

    return wrapper;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── Coze API ───────────────────────────────────────────────────────────

  const SESSION_USER_ID =
    "ifnt_student_" + Math.random().toString(36).slice(2, 9);

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

    const chatData = await chatRes.json();

    const chatId = chatData?.data?.id || chatData?.id;
    const convId = chatData?.data?.conversation_id || chatData?.conversation_id;

    if (!chatId || !convId) {
      throw new Error("Coze: немає chatId або conversationId");
    }

    return await poll(chatId, convId);
  }

  async function poll(chatId, convId) {
    for (let i = 0; i < 40; i++) {
      await sleep(1000);

      const res = await fetch(
        `${API_BASE}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${convId}`,
        { headers: { Authorization: `Bearer ${COZE_TOKEN}` } }
      );

      const data = await res.json();
      const status = data?.data?.status || data?.status;

      if (status === "completed") {
        return await getMessages(chatId, convId);
      }

      if (status === "failed") {
        throw new Error("Coze: failed");
      }
    }

    throw new Error("Timeout");
  }

  async function getMessages(chatId, convId) {
    const res = await fetch(
      `${API_BASE}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${convId}`,
      { headers: { Authorization: `Bearer ${COZE_TOKEN}` } }
    );

    const data = await res.json();
    const msgs = data?.data || [];

    const ans =
      msgs.find(m => m.role === "assistant")?.content;

    return ans || "Немає відповіді";
  }

  // ─── Send message ──────────────────────────────────────────────────────

  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    messageInput.value = "";

    const typing = addTypingIndicator();

    try {
      const reply = await callCozeAPI(text);
      typing.remove();
      addMessage(reply, "ai");
      setStatus("Готово");
    } catch (e) {
      typing.remove();
      addMessage("Помилка: " + e.message, "ai");
      setStatus("Помилка");
    }
  }

  sendBtn?.addEventListener("click", sendMessage);

  messageInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

});
