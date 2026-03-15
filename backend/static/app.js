const chatWindow = document.getElementById("chat-window");
const input = document.getElementById("user-input");
const typingIndicator = document.getElementById("typing-indicator");
const themeToggle = document.getElementById("theme-toggle");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const historyList = document.getElementById("history-list");
const downloadBtn = document.getElementById("download-chat");


// --- Conversation state (localStorage) ---
let conversations = [];
let currentConversationId = null;
const STORAGE_KEY = "unigpt_conversations_v1";

// Load from localStorage
function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      conversations = [];
      return;
    }
    conversations = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load conversations:", e);
    conversations = [];
  }
}

// Save to localStorage
function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error("Failed to save conversations:", e);
  }
}

function createNewConversation() {
  const id = Date.now().toString();
  const conv = {
    id,
    title: "New chat",
    createdAt: new Date().toISOString(),
    messages: [],
  };
  conversations.unshift(conv); // newest first
  currentConversationId = id;
  saveConversations();
  renderHistoryList();
  renderCurrentConversation();
}

// Get current conversation object
function getCurrentConversation() {
  return conversations.find((c) => c.id === currentConversationId) || null;
}

// Set title as first user message
function updateConversationTitleIfNeeded(conv) {
  if (!conv) return;
  const firstUserMsg = conv.messages.find((m) => m.sender === "user");
  if (firstUserMsg && (!conv.title || conv.title === "New chat")) {
    conv.title =
      firstUserMsg.text.length > 28
        ? firstUserMsg.text.slice(0, 28) + "..."
        : firstUserMsg.text;
  }
}

// Render history list in sidebar
function renderHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = "";

  if (conversations.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-item-time";
    empty.textContent = "No chats yet.";
    historyList.appendChild(empty);
    return;
  }

  conversations.forEach((conv) => {
    const item = document.createElement("div");
    item.className = "history-item";
    if (conv.id === currentConversationId) item.classList.add("active");

    const titleDiv = document.createElement("div");
    titleDiv.className = "history-item-title";
    titleDiv.textContent = conv.title || "New chat";

    const timeDiv = document.createElement("div");
    timeDiv.className = "history-item-time";
    const dt = new Date(conv.createdAt || Date.now());
    timeDiv.textContent = dt.toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    item.appendChild(titleDiv);
    item.appendChild(timeDiv);

    item.addEventListener("click", () => {
      currentConversationId = conv.id;
      renderHistoryList();
      renderCurrentConversation();
    });

    historyList.appendChild(item);
  });
}

// Render all messages of current conversation
function renderCurrentConversation() {
  if (!chatWindow) return;
  chatWindow.innerHTML = "";

  const conv = getCurrentConversation();
  if (!conv) return;

  conv.messages.forEach((m) => {
    displayMessage(m.sender, m.text, m.time, false); // no auto-store
  });

  scrollToBottom(false);
}

// --- Smooth scroll helper ---
function scrollToBottom(smooth = true) {
  if (!chatWindow) return;
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

// --- Typing indicator control ---
function setTyping(isTyping) {
  if (!typingIndicator) return;
  typingIndicator.classList.toggle("hidden", !isTyping);
  if (isTyping) scrollToBottom(false);
}

// --- Message display with timestamp ---
function displayMessage(sender, text, timeString = null, storeInConv = true) {
  if (!chatWindow) return;

  // Row wrapper for avatar + bubble
  const row = document.createElement("div");
  row.className = `msg-row ${sender}`;

  // Avatar
  const avatar = document.createElement("div");
  avatar.className = `avatar ${
    sender === "user" ? "avatar-user" : "avatar-bot"
  }`;
  // Avatar label (you can change these)
  avatar.textContent = sender === "user" ? "U" : "AI";

  // Bubble
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;

  const textDiv = document.createElement("div");
  textDiv.className = "msg-text";
  textDiv.textContent = text;

  const metaDiv = document.createElement("div");
  metaDiv.className = "msg-meta";
  const now = timeString ? new Date(timeString) : new Date();
  metaDiv.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  msg.appendChild(textDiv);
  msg.appendChild(metaDiv);

  // Order: for bot -> avatar left, for user -> avatar right
  // CSS .msg-row.user/.bot handles margins, so we just do:
  row.appendChild(avatar);
  row.appendChild(msg);

  chatWindow.appendChild(row);

  // Store in conversation (for live messages)
  if (storeInConv) {
    const conv = getCurrentConversation();
    if (conv) {
      conv.messages.push({
        sender,
        text,
        time: now.toISOString(),
      });
      updateConversationTitleIfNeeded(conv);
      saveConversations();
      renderHistoryList();
    }
  }

  scrollToBottom();
}

// --- Send message ---
async function sendMessage() {
  const question = input.value.trim();
  if (!question) return;

  // Ensure we have a current conversation
  if (!currentConversationId) {
    createNewConversation();
  }

  // User message
  displayMessage("user", question);
  input.value = "";
  input.focus();

  // Show typing indicator
  setTyping(true);

  try {
    const response = await fetch("/api/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await response.json();

    if (data.error) {
      displayMessage("bot", "⚠ " + data.error);
    } else {
      displayMessage("bot", data.answer || "I couldn't generate a response.");
    }
  } catch (err) {
    console.error(err);
    displayMessage("bot", "⚠ Server error. Please try again.");
  } finally {
    // Hide typing indicator
    setTyping(false);
  }
}

// --- Enter key to send ---
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

// --- Theme toggle (light / dark) ---
function applyThemeFromStorage() {
  const saved = localStorage.getItem("unigpt_theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "☾";
  } else {
    document.body.classList.remove("dark");
    if (themeToggle) themeToggle.textContent = "☀";
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("unigpt_theme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "☾" : "☀";
  });
}

// Apply saved theme on load
applyThemeFromStorage();

// --- Voice input (Speech Recognition) ---
let recognition = null;
let isRecording = false;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecording = true;
    if (micBtn) micBtn.classList.add("active");
  };

  recognition.onend = () => {
    isRecording = false;
    if (micBtn) micBtn.classList.remove("active");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (input) {
      input.value = transcript;
      input.focus();
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (micBtn) micBtn.classList.remove("active");
  };
}

if (micBtn) {
  if (recognition) {
    micBtn.addEventListener("click", () => {
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else {
    micBtn.disabled = true;
    micBtn.title = "Speech recognition not supported in this browser";
  }
}

// --- New chat button (reset conversation but keep history) ---
if (newChatBtn) {
  newChatBtn.addEventListener("click", () => {
    createNewConversation();
  });
}

// --- Initial load: conversations + pick current session ---
(function init() {
  loadConversations();

  if (conversations.length === 0) {
    createNewConversation();
  } else {
    currentConversationId = conversations[0].id;
    renderHistoryList();
    renderCurrentConversation();
  }
})();



// --- Download current chat as .txt ---
if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const conv = getCurrentConversation();
    if (!conv || !conv.messages || conv.messages.length === 0) {
      alert("No messages in this chat to download.");
      return;
    }

    let text = "";
    text += `uniGPT Conversation\n`;
    text += `Title: ${conv.title || "Untitled"}\n`;
    text += `Started: ${
      conv.createdAt
        ? new Date(conv.createdAt).toLocaleString()
        : new Date().toLocaleString()
    }\n\n`;

    conv.messages.forEach((m) => {
      const t = m.time
        ? new Date(m.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      const who = m.sender === "user" ? "You" : "uniGPT";
      text += `[${t}] ${who}: ${m.text}\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (conv.title || "unigpt-chat") + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

