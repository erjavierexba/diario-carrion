const views = new Map([...document.querySelectorAll("[data-view]")].map((view) => [view.dataset.view, view]));
const bootProgress = document.querySelector("#bootProgress");
const bootLog = document.querySelector("#bootLog");
const petCanvas = document.querySelector("#petCanvas");
const petContext = petCanvas.getContext("2d");
const petMessage = document.querySelector("#petMessage");
const petMood = document.querySelector("#petMood");

let activeView = "boot";
let bootTimer = null;
let bootInterval = null;
let petFrame = 0;
let chapters = [];
let chapterIndex = 0;
let readerTouchStart = null;

const petLines = [
  ["Buenos días, Sheriff.", "ESTABLE"],
  ["Yo pongo la música. Tú conduces.", "EN RUTA"],
  ["No puedo conducir. Ya lo hemos hablado.", "OFENDIDO"],
  ["¿Cinco litros de café? Klein estará contento.", "DESPIERTO"],
  ["Sigue adelante, Carrion.", "CONTIGO"],
  ["La pickup no es un colchón de aterrizaje.", "PREOCUPADO"],
  ["Señal limpia. Carretera sucia.", "VIGILANTE"],
  ["Moe sigue debiéndonos una noche tranquila.", "NOSTÁLGICO"],
];

const bootLines = [
  "RECUPERANDO PERSONALIDAD...",
  "ENLACE CON PICKUP: OK",
  "CONTROL DE LUCES: OK",
  "CONDUCCIÓN AUTÓNOMA: DENEGADA",
  "CARGANDO RECUERDOS...",
  "HOLA, SHERIFF.",
];

function setView(name) {
  if (!views.has(name)) return;
  views.forEach((view, key) => view.classList.toggle("is-active", key === name));
  activeView = name;
  if (name !== "snake") pauseSnake();
  if (name === "home") petMessage.focus?.({ preventScroll: true });
}

function startBoot() {
  clearTimeout(bootTimer);
  clearInterval(bootInterval);
  setView("boot");
  let progress = 0;
  let line = 0;
  bootProgress.style.width = "0%";
  bootLog.textContent = bootLines[0];

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = reducedMotion ? 40 : 310;
  bootInterval = window.setInterval(() => {
    progress = Math.min(100, progress + (reducedMotion ? 50 : 9 + Math.random() * 13));
    bootProgress.style.width = `${progress}%`;
    const nextLine = Math.min(bootLines.length - 1, Math.floor(progress / (100 / bootLines.length)));
    if (nextLine !== line) {
      line = nextLine;
      bootLog.textContent = bootLines[line];
    }
    if (progress >= 100) {
      clearInterval(bootInterval);
      bootTimer = window.setTimeout(() => setView("home"), reducedMotion ? 60 : 520);
    }
  }, step);
}

function completeBoot() {
  clearTimeout(bootTimer);
  clearInterval(bootInterval);
  bootProgress.style.width = "100%";
  bootLog.textContent = "HOLA, SHERIFF.";
  window.setTimeout(() => setView("home"), 120);
}

function updateClock() {
  const now = new Date();
  document.querySelector("#statusTime").textContent = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function drawPet(frame = 0) {
  const ctx = petContext;
  const pixel = 6;
  const ox = 12;
  const oy = frame % 20 < 10 ? 7 : 9;
  const color = "#0b1c13";
  const light = "#a7cf28";
  const pixels = [
    [3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
    [2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],
    [3,2],[4,2],[5,2],[6,2],[7,2],[8,2],
    [3,3],[4,3],[5,3],[6,3],[7,3],[8,3],
    [2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],
    [3,5],[4,5],[5,5],[6,5],[7,5],[8,5],
    [2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],[9,6],
    [1,7],[2,7],[4,7],[5,7],[6,7],[7,7],[9,7],[10,7],
    [1,8],[4,8],[5,8],[6,8],[7,8],[10,8],
    [3,9],[4,9],[5,9],[6,9],[7,9],[8,9],
    [3,10],[4,10],[7,10],[8,10],
    [2,11],[3,11],[4,11],[7,11],[8,11],[9,11],
  ];

  ctx.fillStyle = light;
  ctx.fillRect(0, 0, petCanvas.width, petCanvas.height);
  ctx.fillStyle = color;
  pixels.forEach(([x, y]) => ctx.fillRect(ox + x * pixel, oy + y * pixel, pixel, pixel));

  ctx.fillStyle = light;
  const blink = frame % 80 > 72;
  if (!blink) {
    ctx.fillRect(ox + 4 * pixel, oy + 3 * pixel, pixel, pixel);
    ctx.fillRect(ox + 7 * pixel, oy + 3 * pixel, pixel, pixel);
  }
  ctx.fillRect(ox + 5 * pixel, oy + 5 * pixel, 2 * pixel, pixel);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function renderBody(raw) {
  return raw
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => {
      const clean = paragraph.replace(/\n/g, " ").trim();
      const quote = /^\*[^*].*\*$/.test(clean);
      return `<p${quote ? ' class="quote"' : ""}>${inlineMarkdown(clean)}</p>`;
    })
    .join("");
}

function parseMarkdown(markdown) {
  const matches = [...markdown.matchAll(/^###\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    const heading = match[1].trim();
    const parts = heading.match(/^(\d+)\.\s*(.*)$/);
    return {
      number: parts?.[1] ?? String(index + 1),
      title: parts?.[2] ?? heading,
      body: markdown.slice(start, end),
    };
  });
}

async function loadJournal() {
  const track = document.querySelector("#readerTrack");
  try {
    const response = await fetch("./writing-block.md");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    chapters = parseMarkdown(await response.text());
    if (!chapters.length) throw new Error("No se encontraron entradas");
    track.innerHTML = chapters
      .map(
        (chapter) => `<article class="chapter-card">
          <h3><span>ENTRADA ${chapter.number.padStart(2, "0")}</span>${escapeHtml(chapter.title)}</h3>
          ${renderBody(chapter.body)}
        </article>`,
      )
      .join("");
    document.querySelector("#chapterDots").innerHTML = chapters.map(() => "<i></i>").join("");
    showChapter(0, false);
  } catch (error) {
    track.innerHTML = `<article class="chapter-card"><h3>ERROR DE SINCRONIZACIÓN</h3><p>Rick no ha podido leer la bitácora. Abre la web desde un servidor local o desde GitHub Pages.</p></article>`;
    chapters = [{ title: "Error" }];
    console.error(error);
  }
}

function showChapter(index, animate = true) {
  chapterIndex = Math.max(0, Math.min(chapters.length - 1, index));
  const track = document.querySelector("#readerTrack");
  if (!animate) track.style.transition = "none";
  track.style.transform = `translateX(-${chapterIndex * 100}%)`;
  if (!animate) requestAnimationFrame(() => (track.style.transition = ""));
  document.querySelector("#readerCounter").textContent = `${chapterIndex + 1} / ${chapters.length}`;
  document.querySelector("#readerPrev").disabled = chapterIndex === 0;
  const next = document.querySelector("#readerNext");
  next.textContent = chapterIndex === chapters.length - 1 ? "VOLVER AL ÍNDICE" : "SIGUIENTE";
  document.querySelectorAll("#chapterDots i").forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === chapterIndex));
  document.querySelectorAll(".chapter-card")[chapterIndex]?.scrollTo(0, 0);
}

function openReader() {
  showChapter(0, false);
  setView("reader");
}

document.querySelectorAll("[data-open]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.open)));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.close || "home")));
document.querySelector("#bootSkip").addEventListener("click", completeBoot);
document.querySelector("#replayBoot").addEventListener("click", startBoot);
document.querySelector("#openSession").addEventListener("click", openReader);
document.querySelector("#readerPrev").addEventListener("click", () => showChapter(chapterIndex - 1));
document.querySelector("#readerNext").addEventListener("click", () => {
  if (chapterIndex === chapters.length - 1) setView("sessions");
  else showChapter(chapterIndex + 1);
});

document.querySelector("#readerFrame").addEventListener("pointerdown", (event) => {
  readerTouchStart = { x: event.clientX, y: event.clientY };
});

document.querySelector("#readerFrame").addEventListener("pointerup", (event) => {
  if (!readerTouchStart) return;
  const dx = event.clientX - readerTouchStart.x;
  const dy = event.clientY - readerTouchStart.y;
  readerTouchStart = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) showChapter(chapterIndex + (dx < 0 ? 1 : -1));
});

document.querySelector("#petButton").addEventListener("click", () => {
  const [line, mood] = petLines[Math.floor(Math.random() * petLines.length)];
  petMessage.textContent = line;
  petMood.textContent = mood;
  petFrame += 20;
  drawPet(petFrame);
});

window.setInterval(() => {
  petFrame += 1;
  drawPet(petFrame);
}, 180);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeView !== "home" && activeView !== "boot") setView(activeView === "reader" ? "sessions" : "home");
});

// Snake
const snakeCanvas = document.querySelector("#snakeCanvas");
const snakeContext = snakeCanvas.getContext("2d");
const snakeOverlay = document.querySelector("#snakeOverlay");
const snakeScore = document.querySelector("#snakeScore");
const grid = { columns: 24, rows: 18, size: 12 };
let snake = [];
let food = { x: 17, y: 8 };
let direction = { x: 1, y: 0 };
let queuedDirection = direction;
let snakeTimer = null;
let score = 0;
let snakePlaying = false;

function resetSnake() {
  snake = [{ x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }];
  direction = { x: 1, y: 0 };
  queuedDirection = direction;
  score = 0;
  snakeScore.textContent = "000";
  placeFood();
  drawSnake();
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * grid.columns),
      y: Math.floor(Math.random() * grid.rows),
    };
  } while (snake.some((part) => part.x === food.x && part.y === food.y));
}

function drawSnake() {
  const ctx = snakeContext;
  ctx.fillStyle = "#a7cf28";
  ctx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
  ctx.strokeStyle = "rgba(11,28,19,.09)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= snakeCanvas.width; x += grid.size) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, snakeCanvas.height); ctx.stroke();
  }
  for (let y = 0; y <= snakeCanvas.height; y += grid.size) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(snakeCanvas.width, y); ctx.stroke();
  }
  ctx.fillStyle = "#0b1c13";
  snake.forEach((part, index) => {
    const inset = index === 0 ? 1 : 2;
    ctx.fillRect(part.x * grid.size + inset, part.y * grid.size + inset, grid.size - inset * 2, grid.size - inset * 2);
  });
  ctx.fillRect(food.x * grid.size + 2, food.y * grid.size + 2, grid.size - 4, grid.size - 4);
  ctx.fillStyle = "#a7cf28";
  ctx.fillRect(food.x * grid.size + 5, food.y * grid.size + 5, 2, 2);
}

function snakeStep() {
  direction = queuedDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const hitWall = head.x < 0 || head.y < 0 || head.x >= grid.columns || head.y >= grid.rows;
  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
  if (hitWall || hitSelf) return endSnake();
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    snakeScore.textContent = String(score).padStart(3, "0");
    placeFood();
  } else {
    snake.pop();
  }
  drawSnake();
}

function startSnake() {
  clearInterval(snakeTimer);
  resetSnake();
  snakeOverlay.classList.add("is-hidden");
  snakePlaying = true;
  snakeTimer = window.setInterval(snakeStep, 125);
}

function pauseSnake() {
  clearInterval(snakeTimer);
  snakePlaying = false;
}

function endSnake() {
  pauseSnake();
  snakeOverlay.classList.remove("is-hidden");
  snakeOverlay.querySelector("strong").textContent = `RUTA TERMINADA // ${score}`;
  snakeOverlay.querySelector("span").textContent = score ? "Otra entrega. Esta vez intenta conservar la carga." : "La carretera ha ganado esta ronda.";
  document.querySelector("#snakeStart").textContent = "REINTENTAR";
}

function setSnakeDirection(name) {
  const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const next = directions[name];
  if (!next || next.x === -direction.x && next.y === -direction.y) return;
  queuedDirection = next;
}

document.querySelector("#snakeStart").addEventListener("click", startSnake);
document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => setSnakeDirection(button.dataset.direction)));

window.addEventListener("keydown", (event) => {
  if (activeView !== "snake") return;
  const keys = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  if (keys[event.key]) {
    event.preventDefault();
    if (!snakePlaying) startSnake();
    setSnakeDirection(keys[event.key]);
  }
});

let snakeTouch = null;
snakeCanvas.addEventListener("pointerdown", (event) => (snakeTouch = { x: event.clientX, y: event.clientY }));
snakeCanvas.addEventListener("pointerup", (event) => {
  if (!snakeTouch) return;
  const dx = event.clientX - snakeTouch.x;
  const dy = event.clientY - snakeTouch.y;
  snakeTouch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  setSnakeDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
});

updateClock();
window.setInterval(updateClock, 30_000);
drawPet();
resetSnake();
loadJournal();
startBoot();
