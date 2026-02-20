
const mojiScreen = document.getElementById("mojiScreen");
const gameScreen = document.getElementById("gameScreen");

const hiraBtn = document.getElementById("hiraBtn");
const kataBtn = document.getElementById("kataBtn");
const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finishBtn");

const inputBox = document.getElementById("inputBox");
const fallingArea = document.getElementById("fallingArea");

const correctEl = document.getElementById("correct");
const missEl = document.getElementById("miss");
const timeLeftEl = document.getElementById("timeLeft");
const topicLabel = document.getElementById("topicLabel");
const durationSelect = document.getElementById("durationSelect");

// 状態
let mode = localStorage.getItem("mode") || "hira";
let words = [];

let correctCount = 0;
let missCount = 0;
let missList = [];

let currentAnswer = "";
let timer = 60;
let timerIntervalId = null;
let spawnTimeoutId = null;

let isComposing = false;

// -------------------------
// topic 確認
// -------------------------
const topic = localStorage.getItem("topic") || "";
topicLabel.textContent = topic || "（未選択）";

if (!topic) {
  alert("主題が選ばれていません。");
  location.href = "topic.html";
}

// 結果画面の「やり直し」から来た場合は、同じ条件で自動スタート
const retryFlag = localStorage.getItem("retry");
if (retryFlag === "1") {
  localStorage.removeItem("retry");
  // DOMが描画された後に開始
  setTimeout(() => {
    startGame();
  }, 0);
}
// IME
inputBox.addEventListener("compositionstart", () => {
  isComposing = true;
});

inputBox.addEventListener("compositionend", () => {
  isComposing = false;
});

// モード選択（前回の選択を復元）
if (mode === "kata") {
  kataBtn.classList.add("active");
  hiraBtn.classList.remove("active");
} else {
  hiraBtn.classList.add("active");
  kataBtn.classList.remove("active");
}
hiraBtn.onclick = () => {
  mode = "hira";
  localStorage.setItem("mode", mode);
  hiraBtn.classList.add("active");
  kataBtn.classList.remove("active");
};

kataBtn.onclick = () => {
  mode = "kata";
  localStorage.setItem("mode", mode);
  kataBtn.classList.add("active");
  hiraBtn.classList.remove("active");
};

// Enter 判定
inputBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!isComposing) checkAnswer();
  }
});

finishBtn.onclick = finishGame;

// START
async function startGame() {
  await loadWords();

  mojiScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  correctCount = 0;
  missCount = 0;
  missList = [];

  correctEl.textContent = "0";
  missEl.textContent = "0";

  timer = parseInt(durationSelect?.value || "45", 10);
  timeLeftEl.textContent = timer;

  fallingArea.innerHTML = "";
  inputBox.value = "";
  inputBox.focus();

  startTimer();
  spawnNext();
}

startBtn.onclick = startGame;

// 単語
async function loadWords() {
  const path = `category/${topic}(${mode}).txt`;
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error();
  const text = await res.text();
  words = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function pickWord() {
  return words[Math.floor(Math.random() * words.length)];
}

// 判定
function checkAnswer() {
  const userInput = inputBox.value.trim();
  if (!userInput) return;

  if (userInput === currentAnswer) {
    handleCorrect();
  } else {
    handleMiss(currentAnswer);
  }

  inputBox.value = "";
  inputBox.focus();
}

function handleCorrect() {
  correctCount++;
  correctEl.textContent = correctCount;

  removeCurrentFalling();
  spawnNext();
}

function handleMiss(word) {
  missCount++;
  missEl.textContent = missCount;
  missList.push(word);

  removeCurrentFalling();
  spawnNext();
}

// 落下
function spawnNext() {
  clearTimeout(spawnTimeoutId);
  spawnTimeoutId = setTimeout(spawnNewChar, 1200);
}

function spawnNewChar() {
  currentAnswer = pickWord();

  const el = document.createElement("div");
  el.className = "falling-char";
  el.textContent = currentAnswer;

  el.style.left =
    Math.random() * Math.max(20, fallingArea.clientWidth - 120) + "px";
  el.style.top = "-20px";

  fallingArea.appendChild(el);

  let y = -20;
  const speed = 1.5;

  const moveId = setInterval(() => {
    y += speed;
    el.style.top = y + "px";

    if (y > fallingArea.clientHeight) {
      clearInterval(moveId);
      el.remove();

      missCount++;
      missEl.textContent = missCount;
      missList.push(currentAnswer);

      spawnNext();
    }
  }, 16);

  el.dataset.moveId = moveId;
}

function removeCurrentFalling() {
  const el = document.querySelector(".falling-char");
  if (!el) return;
  clearInterval(el.dataset.moveId);
  el.remove();
}

// タイマー
function startTimer() {
  clearInterval(timerIntervalId);
  timerIntervalId = setInterval(() => {
    timer--;
    timeLeftEl.textContent = timer;
    if (timer <= 0) finishGame();
  }, 1000);
}

// 終了
function finishGame() {
  clearInterval(timerIntervalId);
  clearTimeout(spawnTimeoutId);

  document.querySelectorAll(".falling-char").forEach(el => {
    clearInterval(el.dataset.moveId);
  });

  localStorage.setItem("correct", correctCount);
  localStorage.setItem("miss", missCount);
  localStorage.setItem("missList", JSON.stringify(missList));

  location.href = "result.html";
}