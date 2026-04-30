/* ═══════════════════════════════════════════
   INTRO — друкування тексту
═══════════════════════════════════════════ */
const texts = [
  "Привіт 👋",
  "Я твій AI друг",
  "Створений для допомоги студентам ІФНТУНГ"
];

const elements = [
  document.getElementById("line1"),
  document.getElementById("line2"),
  document.getElementById("line3")
];

const TYPING_SPEED = 50; // мс між символами

function typeText(text, element, callback) {
  let i = 0;
  function step() {
    if (i < text.length) {
      element.textContent += text[i++];
      setTimeout(step, TYPING_SPEED);
    } else if (callback) {
      callback();
    }
  }
  step();
}

// Послідовний запуск трьох рядків → перехід до чату
typeText(texts[0], elements[0], () =>
  typeText(texts[1], elements[1], () =>
    typeText(texts[2], elements[2], () => {
      setTimeout(showChat, 2000);
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
    input.focus();
  }, 900);
}

/* ═══════════════════════════════════════════
   ЕЛЕМЕНТИ ЧАТУ
═══════════════════════════════════════════ */
const chatArea = document.getElementById("chatArea");
const input    = document.querySelector(".input");
const sendBtn  = document.getElementById("sendBtn");

/* ── Додати повідомлення ── */
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

/* ── Індикатор "друкує..." ── */
function addTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "msg ai typing";

  wrapper.innerHTML = `
    <div class="bubble">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>`;

  chatArea.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

/* ── Скрол вниз ── */
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

/* ── Поточний час ── */
function getTime() {
  return new Date().toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
}

/* ═══════════════════════════════════════════
   ВІДПРАВКА ПОВІДОМЛЕННЯ
═══════════════════════════════════════════ */
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  // Показуємо повідомлення користувача
  addMessage(message, "user");
  input.value = "";
  sendBtn.disabled = true;

  // Показуємо індикатор AI
  const typingEl = addTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    typingEl.remove();
    addMessage(data.reply ?? data.message ?? "Відповідь отримана ✅", "ai");

  } catch (error) {
    console.error("Помилка запиту:", error);
    typingEl.remove();
    addMessage("Помилка з'єднання з сервером 😔", "ai");
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

/* ═══════════════════════════════════════════
   ПОДІЇ
═══════════════════════════════════════════ */
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);
