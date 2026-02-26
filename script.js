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

// Trạng thái game
let mode = localStorage.getItem("mode") || ""; // Lấy lại mode cũ nếu có (hỗ trợ Yarinaoshi)
let words = [];
let shuffledWords = []; // Dùng để chống lặp
let correctCount = 0;
let missCount = 0;
let missList = [];
let currentAnswer = "";
let timer = 45;
let timerIntervalId = null;
let spawnTimeoutId = null;
let isComposing = false;

// 1. Khởi tạo Chủ đề
const topic = localStorage.getItem("topic") || "";
topicLabel.textContent = topic || "（未選択）";

if (!topic) {
    alert("主題が選ばれていません。");
    location.href = "topic.html";
}

// 2. Xử lý IME
inputBox.addEventListener("compositionstart", () => { isComposing = true; });
inputBox.addEventListener("compositionend", () => { isComposing = false; });

// 3. Chọn chế độ và Cập nhật giao diện nút
function updateModeUI() {
    if (!mode) return;
    localStorage.setItem("mode", mode);
    hiraBtn.classList.toggle("active", mode === "hira");
    kataBtn.classList.toggle("active", mode === "kata");
}

hiraBtn.onclick = () => { mode = "hira"; updateModeUI(); };
kataBtn.onclick = () => { mode = "kata"; updateModeUI(); };
updateModeUI(); // Chạy ngay để highlight nút nếu đã có mode từ trước (do Yarinaoshi)

// 4. Xử lý nhập liệu
inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !isComposing) {
        checkAnswer();
    }
});

const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
    submitBtn.onclick = () => { checkAnswer(); inputBox.focus(); };
}

fallingArea.addEventListener("click", () => { inputBox.focus(); });

if (finishBtn) {
    finishBtn.onclick = () => {
        if (confirm("ゲームを終了しますか？")) {
            finishGame();
        }
    };
}

// 5. Logic Game chính
async function startGame() {
    if (!mode) {
        alert("ひらがな hoặc カタカナ を選択してください！");
        return;
    }
    try {
        await loadWords();
        
        // --- CHỐNG LẶP CHỮ TẠI ĐÂY ---
        shuffledWords = [...words].sort(() => Math.random() - 0.5);

        mojiScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");
        
        correctCount = 0;
        missCount = 0;
        missList = [];
        correctEl.textContent = "0";
        missEl.textContent = "0";
        
        timer = 45; // Đảm bảo luôn là 45s
        timeLeftEl.textContent = timer;

        fallingArea.innerHTML = "";
        inputBox.value = "";
        inputBox.focus();

        startTimer();
        spawnNext();
    } catch (e) {
        alert("単語リストの読み込みに失敗しました。");
    }
}

startBtn.onclick = startGame;

async function loadWords() {
    const path = `${topic}(${mode}).txt`;
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error();
    const text = await res.text();
    words = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function checkAnswer() {
    const val = inputBox.value.trim();
    if (!val) return;

    if (val === currentAnswer) {
        correctCount++;
        correctEl.textContent = correctCount;
    } else {
        missCount++;
        missEl.textContent = missCount;
        missList.push(currentAnswer);
    }
    removeCurrentFalling();
    spawnNext();
    inputBox.value = "";
    inputBox.focus();
}

function spawnNext() {
    clearTimeout(spawnTimeoutId);
    spawnTimeoutId = setTimeout(spawnNewChar, 1000);
}

function spawnNewChar() {
    if (words.length === 0) return;

    // --- LOGIC RÚT CHỮ CHỐNG LẶP ---
    if (shuffledWords.length === 0) {
        shuffledWords = [...words].sort(() => Math.random() - 0.5);
    }
    currentAnswer = shuffledWords.pop(); 
    
    const el = document.createElement("div");
    el.className = "falling-char";
    el.textContent = currentAnswer;
    fallingArea.appendChild(el);

    const areaWidth = fallingArea.clientWidth;
    const wordWidth = el.offsetWidth || 120;
    const safeLeft = Math.random() * (areaWidth - wordWidth - 20);
    el.style.left = Math.max(10, safeLeft) + "px";
    el.style.top = "-50px";

    let y = -50;
    const moveId = setInterval(() => {
        y += 3.0; // Tốc độ rơi
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
    if (el) {
        clearInterval(el.dataset.moveId);
        el.remove();
    }
}

function startTimer() {
    clearInterval(timerIntervalId);
    timerIntervalId = setInterval(() => {
        timer--;
        timeLeftEl.textContent = timer;
        if (timer <= 0) finishGame();
    }, 1000);
}

function finishGame() {
    clearInterval(timerIntervalId);
    clearTimeout(spawnTimeoutId);

    localStorage.setItem("correct", correctCount);
    localStorage.setItem("miss", missCount);
    localStorage.setItem("missList", JSON.stringify(missList)); 

    location.href = "result.html";
}

if (localStorage.getItem("retry") === "1") {
    localStorage.removeItem("retry");
    const savedMode = localStorage.getItem("mode");
    
    if (savedMode) {
        mode = savedMode;
        updateModeUI();

        // ẨN MÀN HÌNH CHỌN NGAY LẬP TỨC (Không chờ đợi)
        if (mojiScreen) mojiScreen.classList.add("hidden");
        
        // Bắt đầu logic game luôn
        setTimeout(() => {
            startGame(); 
        }, 50); // Chỉ chờ 50ms rất ngắn để đảm bảo dữ liệu words được tải
    }
}
