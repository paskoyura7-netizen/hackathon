

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

recognition.lang = 'uk-UA';
recognition.interimResults = false;

function startVoiceInput() {
  recognition.start();
}



recognition.onresult = function(event) {
  const text = event.results[0][0].transcript;

  messageInput.value = text;
};

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, "user");
  messageInput.value = "";

  const typingEl = addTypingIndicator();

  try {
    const reply = await callCozeAPI(message);
    typingEl.remove();

    addMessage(reply, "ai");
    speak(reply); 
  } catch (error) {
    typingEl.remove();
    addMessage("Помилка", "ai");
  }
}
recognition.onerror = function(event) {
  console.error("Speech error:", event.error);
  alert("Помилка мікрофона: " + event.error);
};

function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "uk-UA";
  window.speechSynthesis.speak(speech);
}
if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
  console.warn("SpeechRecognition не підтримується");
}
