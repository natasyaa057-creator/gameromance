const STORAGE_LAST_VISIT = "gamearka_last_visit_v2";
const STORAGE_LAST_HANG = "gamearka_last_hang_v2";
const STORAGE_LAST_CHAT = "gamearka_last_chat_v2";
const STORAGE_COUPLE_CHAT = "gamearka_couple_chatlog_v1";
const STORAGE_DAILY_GIFT_DATE = "gamearka_daily_gift_wib_v1";
const STORAGE_TREE_LEVEL_ACK = "gamearka_tree_level_ack_v1";
const STORAGE_STORY_DAY = "gamearka_story_day_v1";
const STORAGE_STORY_LAST_WIB = "gamearka_story_last_wib_v2";
const STORAGE_HISTORY_JOURNAL = "gamearka_history_journal_v1";
const STORAGE_HISTORY_LAST_READ = "gamearka_history_last_read_v1";

const HISTORY_JOURNAL_MAX = 500;
const HISTORY_TEXT_MAX = 2000;
const STORAGE_MSG_SENT_STATS = "gamearka_msg_sent_stats_v1";
const STORAGE_TREE_OPENS_DAY = "gamearka_tree_opens_wib_v1";

let hangStatPrimed = false;
let hangSeenIds = new Set();

function resetHangStatTracking() {
  hangStatPrimed = false;
  hangSeenIds = new Set();
}

function readMsgSentStats() {
  try {
    const raw = localStorage.getItem(STORAGE_MSG_SENT_STATS);
    const o = JSON.parse(raw || "{}");
    return {
      arka: Math.max(0, parseInt(o.arka, 10) || 0),
      zahra: Math.max(0, parseInt(o.zahra, 10) || 0),
    };
  } catch (e) {
    return { arka: 0, zahra: 0 };
  }
}

function writeMsgSentStats(stats) {
  localStorage.setItem(STORAGE_MSG_SENT_STATS, JSON.stringify({
    arka: stats.arka,
    zahra: stats.zahra,
  }));
}

function bumpMsgSent(role, delta = 1) {
  const r = role === "zahra" ? "zahra" : "arka";
  const stats = readMsgSentStats();
  stats[r] += Math.max(0, delta);
  writeMsgSentStats(stats);
  updateLoveHud();
}

function getOpenCountToday() {
  const key = getJakartaDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_TREE_OPENS_DAY);
    const o = JSON.parse(raw || "{}");
    if (o && o.date === key) {
      return Math.max(0, parseInt(o.count, 10) || 0);
    }
  } catch (e) {
    /* ignore */
  }
  return 0;
}

function bumpOpenCountToday() {
  const key = getJakartaDateKey();
  let o = { date: key, count: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_TREE_OPENS_DAY);
    const prev = JSON.parse(raw || "{}");
    if (prev && prev.date === key) {
      o.count = Math.max(0, parseInt(prev.count, 10) || 0);
    }
  } catch (e) {
    /* ignore */
  }
  o.date = key;
  o.count += 1;
  localStorage.setItem(STORAGE_TREE_OPENS_DAY, JSON.stringify(o));
}

function fillTwilightParticles() {
  const fireHost = document.getElementById("ltFireflies");
  const petHost = document.getElementById("ltPetals");
  if (!fireHost || fireHost.dataset.filled === "1") {
    return;
  }
  fireHost.dataset.filled = "1";
  const positions = [
    [8, 72, 0], [18, 58, 0.4], [28, 80, 0.8], [42, 64, 1.1], [55, 78, 0.2],
    [68, 52, 0.6], [78, 70, 1.3], [88, 60, 0.9], [12, 42, 1.5], [92, 38, 0.3],
    [35, 88, 1.2], [62, 88, 0.5], [50, 48, 1.7], [22, 32, 0.7], [74, 28, 1.4],
    [6, 55, 1.0], [94, 72, 0.15], [48, 22, 1.6], [58, 35, 0.55],
  ];
  positions.forEach(([x, y, d], i) => {
    const s = document.createElement("span");
    s.className = "lt-firefly";
    s.style.setProperty("--fx", `${x}%`);
    s.style.setProperty("--fy", `${y}%`);
    s.style.setProperty("--fd", `${d}s`);
    s.style.setProperty("--fs", `${4 + (i % 4)}px`);
    fireHost.appendChild(s);
  });
  if (petHost && petHost.dataset.filled !== "1") {
    petHost.dataset.filled = "1";
    for (let i = 0; i < 22; i += 1) {
      const p = document.createElement("span");
      p.className = "lt-petal";
      p.style.setProperty("--px", `${(i * 37) % 100}%`);
      p.style.setProperty("--pd", `${(i % 9) * 0.35}s`);
      p.style.setProperty("--ps", `${0.85 + (i % 5) * 0.08}`);
      p.style.setProperty("--pdur", `${14 + (i % 7)}s`);
      petHost.appendChild(p);
    }
  }
}

function getJakartaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysBetweenWibKeys(fromKey, toKey) {
  if (!fromKey || !toKey || fromKey === toKey) {
    return 0;
  }
  const parse = (k) => {
    const [y, m, d] = k.split("-").map((n) => parseInt(n, 10));
    return Date.UTC(y, m - 1, d);
  };
  const a = parse(fromKey);
  const b = parse(toKey);
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function getStoryAgeStage(day) {
  const d = Number(day) || 1;
  if (d < 200) {
    return "child";
  }
  if (d < 500) {
    return "adult";
  }
  return "elder";
}

function syncStoryLoveDay() {
  const today = getJakartaDateKey();
  let day = parseInt(localStorage.getItem(STORAGE_STORY_DAY), 10);
  if (!Number.isFinite(day) || day < 1) {
    day = 1;
  }
  const last = localStorage.getItem(STORAGE_STORY_LAST_WIB);
  if (!last) {
    localStorage.setItem(STORAGE_STORY_LAST_WIB, today);
  } else if (last !== today) {
    const inc = daysBetweenWibKeys(last, today);
    day += Math.max(1, inc);
    localStorage.setItem(STORAGE_STORY_DAY, String(day));
    localStorage.setItem(STORAGE_STORY_LAST_WIB, today);
  }

  window.__storyLoveDay = day;
  document.body.dataset.storyDay = String(day);
  const stage = getStoryAgeStage(day);
  document.body.dataset.ageStage = stage;

  updateTreeHeartHud();
  return day;
}

syncStoryLoveDay();

const ROMANTIC_DAILY_QUOTES = [
  "Setiap hari bersamamu adalah hadiah yang tak ternilai.",
  "Rindu ini bersemi jadi senyuman setiap kali namamu terlintas.",
  "Cinta kita seperti pohon: akar dalam, ranting menjulang ke hangatnya hari.",
  "Kamu adalah rumah dalam bentuk manusia.",
  "Aku memilihmu — lagi dan lagi — di setiap fajar.",
  "Detik bersamamu lebih berharga dari seribu bintang di langit.",
  "Hatiku berdetak dalam irama namamu.",
  "Dunia bisa ramai; yang kuingin hanya tenang di sampingmu.",
  "Kisah kita ditulis pelan, indah, dan abadi.",
  "Senyummu adalah cahaya yang paling kutunggu.",
  "Aku menyimpan kamu di tempat paling lembut di dalam dadaku.",
  "Bersamamu, waktu berubah jadi syair yang manis.",
  "Kamu adalah jawaban dari doa yang tak kutulis.",
  "Langit hari ini cerah — seperti hatiku saat mengingatmu.",
  "Aku mencintaimu tanpa syarat, seperti embun menyapa daun.",
  "Setiap pesan kecilmu adalah pelukan dari jarak.",
  "Kita tidak sempurna, tapi bersama kita utuh.",
  "Biarkan pohon ini jadi saksi: cintaku tumbuh setiap hari.",
  "Malam terasa hangat karena ada bayanganmu di pikiranku.",
  "Aku bersyukur atas namamu yang kutulis di setiap halaman hidupku.",
  "Kamu adalah melodi yang tidak pernah bosan kudengar.",
  "Jarak hanya angka; dekatmu adalah perasaan.",
  "Hari ini aku memilihmu — besok juga, selamanya juga.",
  "Cinta sejati tumbuh pelan, tapi akarnya tak tergoyahkan.",
  "Kamu adalah rumah yang kutemukan di dalam senyuman.",
  "Setiap napas berbisik namamu.",
  "Bunga-bunga dunia kalah manis dengan tawamu.",
  "Aku ingin tua bersamamu, pelan-pelan, indah-indah.",
  "Hatiku punya alamat: di mana kamu berada.",
  "Terima kasih sudah menjadi rumah yang lembut bagiku.",
];

const MOOD_BY_SKY = {
  day: "https://assets.mixkit.co/music/preview/mixkit-deep-meditation-109.mp3",
  dawn: "https://assets.mixkit.co/music/preview/mixkit-path-of-the-wind-823.mp3",
  dusk: "https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3",
  night: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-614.mp3",
};

let userChosenMusicLock = false;
let loveAudioCtx = null;
let loveRainNodes = null;
let moveSfxTicker = 0;

(function initVisitGap() {
  const now = Date.now();
  const last = parseInt(localStorage.getItem(STORAGE_LAST_VISIT), 10);
  window.__gamearkaDaysSinceVisit = last ? (now - last) / (24 * 60 * 60 * 1000) : 0;
  localStorage.setItem(STORAGE_LAST_VISIT, String(now));
})();

const ROMANTIC_TRACKS = [
  { title: "Lembut · Dreaming Big", url: "https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3" },
  { title: "Piano · Deep Meditation", url: "https://assets.mixkit.co/music/preview/mixkit-deep-meditation-109.mp3" },
  { title: "Hangat · Path of the Wind", url: "https://assets.mixkit.co/music/preview/mixkit-path-of-the-wind-823.mp3" },
  { title: "Romantis · Sleepy Cat", url: "https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3" },
  { title: "Tenang · Relaxation", url: "https://assets.mixkit.co/music/preview/mixkit-relaxation-469.mp3" },
  { title: "Malam · Silent Descent", url: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-614.mp3" },
  { title: "Cerah · Sunny Morning", url: "https://assets.mixkit.co/music/preview/mixkit-sunny-morning-165.mp3" },
  { title: "Latar · Beautiful Dream", url: "https://assets.mixkit.co/music/preview/mixkit-beautiful-dream-493.mp3" },
];

let romanticLoaderMinUntil = 0;

function showRomanticLoader(displayName) {
  romanticLoaderMinUntil = Date.now() + 1600;
  const overlay = document.getElementById("loadingOverlay");
  const hint = document.getElementById("loadingNameHint");
  if (hint) {
    hint.textContent = `Halo ${displayName} — menyambungkan hatimu ke Love Tree…`;
  }
  overlay?.classList.remove("is-hidden");
  overlay?.setAttribute("aria-hidden", "false");
}

function hideRomanticLoader(onFullyHidden) {
  const overlay = document.getElementById("loadingOverlay");
  const wait = Math.max(0, romanticLoaderMinUntil - Date.now());
  setTimeout(() => {
    overlay?.classList.add("is-hidden");
    overlay?.setAttribute("aria-hidden", "true");
    if (typeof onFullyHidden === "function") {
      setTimeout(onFullyHidden, 120);
    }
  }, wait);
}

function hideRomanticLoaderNow() {
  const overlay = document.getElementById("loadingOverlay");
  romanticLoaderMinUntil = 0;
  overlay?.classList.add("is-hidden");
  overlay?.setAttribute("aria-hidden", "true");
}

function getJakartaHour() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hourPart = parts.find((p) => p.type === "hour");
  return hourPart ? parseInt(hourPart.value, 10) : 12;
}

function computeTreeLevelFromTotal(total) {
  return 1 + Math.floor((Number(total) || 0) / 2);
}

function pickRandomDailyQuote() {
  const list = ROMANTIC_DAILY_QUOTES;
  return list[Math.floor(Math.random() * list.length)];
}

function showDailyGiftOverlay() {
  const overlay = document.getElementById("dailyGiftOverlay");
  const msgEl = document.getElementById("dailyGiftMessage");
  if (!overlay || !msgEl) {
    return;
  }
  msgEl.textContent = pickRandomDailyQuote();
  overlay.classList.remove("is-hidden");
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.remove("is-open");
  void overlay.offsetWidth;
  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
  });
  LoveSfx.gentleChime();
}

function closeDailyGiftOverlay() {
  const overlay = document.getElementById("dailyGiftOverlay");
  if (!overlay) {
    return;
  }
  localStorage.setItem(STORAGE_DAILY_GIFT_DATE, getJakartaDateKey());
  overlay.classList.remove("is-open");
  overlay.classList.add("is-hidden");
  overlay.setAttribute("aria-hidden", "true");
  LoveSfx.uiTap();
}

function maybeShowDailyLoginGift(options = {}) {
  if (!localName || !isLoveTheme()) {
    return;
  }
  const key = getJakartaDateKey();
  if (localStorage.getItem(STORAGE_DAILY_GIFT_DATE) === key) {
    return;
  }
  if (window.__dailyGiftSessionKey === key) {
    return;
  }
  window.__dailyGiftSessionKey = key;
  const deferMs = typeof options.deferMs === "number" ? options.deferMs : 420;
  setTimeout(() => showDailyGiftOverlay(), deferMs);
}

function showLevelUpCelebration(newLevel) {
  const overlay = document.getElementById("levelUpOverlay");
  const title = document.getElementById("levelUpTitle");
  const sub = document.getElementById("levelUpSub");
  if (!overlay || !title || !sub) {
    return;
  }
  title.textContent = `Pohon naik ke level ${newLevel}`;
  sub.textContent = "Bentuk pohon & efek visual baru terbuka — terus gantung pesan untuk membuatnya semakin indah.";
  overlay.classList.remove("is-hidden");
  overlay.setAttribute("aria-hidden", "false");
  memoryTree?.classList.add("tree-level-up-burst");
  LoveSfx.sparkle();
  setTimeout(() => {
    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
    memoryTree?.classList.remove("tree-level-up-burst");
  }, 3200);
}

function checkTreeLevelProgress(totalHung) {
  const level = computeTreeLevelFromTotal(totalHung);
  const raw = localStorage.getItem(STORAGE_TREE_LEVEL_ACK);
  if (raw === null || raw === "") {
    localStorage.setItem(STORAGE_TREE_LEVEL_ACK, String(level));
    return;
  }
  const prev = parseInt(raw, 10);
  if (!Number.isFinite(prev)) {
    localStorage.setItem(STORAGE_TREE_LEVEL_ACK, String(level));
    return;
  }
  if (level > prev) {
    showLevelUpCelebration(level);
    localStorage.setItem(STORAGE_TREE_LEVEL_ACK, String(level));
  } else if (level < prev) {
    localStorage.setItem(STORAGE_TREE_LEVEL_ACK, String(level));
  }
}

function applyTreeShapeFromState() {
  if (!memoryTree || !isLoveTheme()) {
    return;
  }
  const total = Number(state.tree.totalHungMessages) || 0;
  const level = computeTreeLevelFromTotal(total);
  const shape = Math.min(6, Math.max(1, level));
  const fx = Math.min(5, Math.max(0, level - 1));
  memoryTree.dataset.treeShape = String(shape);
  memoryTree.dataset.treeFx = String(fx);
}

function updateSkyJakarta() {
  const area = document.getElementById("gameArea");
  if (!area) {
    return;
  }
  const hour = getJakartaHour();
  let phase = "day";
  if (hour >= 18 || hour < 5) {
    phase = "night";
  } else if (hour >= 5 && hour < 7) {
    phase = "dawn";
  } else if (hour >= 17 && hour < 18) {
    phase = "dusk";
  }
  area.dataset.sky = phase;
  updateMoodMusicForSky(phase);
  updateSceneMoodLayers();
}

function updateWibClock() {
  const el = document.getElementById("ltClockWib");
  if (!el) {
    return;
  }
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  el.textContent = `${dateStr} · ${timeStr} WIB`;
}

function buildNightStars() {
  const host = document.getElementById("nightCelestial");
  if (!host || host.querySelector(".moon-disc")) {
    return;
  }
  const moon = document.createElement("div");
  moon.className = "moon-disc";
  moon.setAttribute("aria-hidden", "true");
  host.appendChild(moon);
  for (let i = 0; i < 48; i += 1) {
    const s = document.createElement("span");
    s.className = "star";
    s.style.left = `${4 + (i * 17) % 92}%`;
    s.style.top = `${6 + (i * 23) % 38}%`;
    s.style.animationDelay = `${(i % 10) * 0.25}s`;
    host.appendChild(s);
  }
}

function readCoupleChatLog() {
  try {
    const raw = localStorage.getItem(STORAGE_COUPLE_CHAT);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((n) => Number.isFinite(n)) : [];
  } catch (e) {
    return [];
  }
}

function writeCoupleChatLog(timestamps) {
  const pruned = timestamps.filter((t) => Date.now() - t < 7 * 24 * 60 * 60 * 1000).slice(-160);
  localStorage.setItem(STORAGE_COUPLE_CHAT, JSON.stringify(pruned));
}

function appendCoupleChatPing() {
  const next = readCoupleChatLog();
  next.push(Date.now());
  writeCoupleChatLog(next);
}

function recentCoupleChatCount(windowMs) {
  const now = Date.now();
  return readCoupleChatLog().filter((t) => now - t <= windowMs).length;
}

function lastCoupleActivityTs() {
  const log = readCoupleChatLog();
  const fromLog = log.length ? Math.max(...log) : 0;
  const hang = parseInt(localStorage.getItem(STORAGE_LAST_HANG), 10) || 0;
  const chat = parseInt(localStorage.getItem(STORAGE_LAST_CHAT), 10) || 0;
  return Math.max(fromLog, hang, chat);
}

function updateTreeVitalityUi() {
  const area = document.getElementById("gameArea");
  if (!area) {
    return;
  }
  const total = Number(state.tree.totalHungMessages) || 0;
  const hanging = Array.isArray(state.tree.hangingMessages) ? state.tree.hangingMessages.length : 0;
  const recent45m = recentCoupleChatCount(45 * 60 * 1000);
  const recent2h = recentCoupleChatCount(2 * 60 * 60 * 1000);
  const lastAct = lastCoupleActivityTs();
  const hrsSince = lastAct ? (Date.now() - lastAct) / (60 * 60 * 1000) : 200;

  let tier = "normal";
  if (recent45m >= 3 || total >= 5 || hanging >= 3) {
    tier = "bloom";
  } else if (hrsSince > 48 && recent2h === 0) {
    tier = "withered";
  } else if (hrsSince > 14 || recent45m <= 1) {
    tier = "dry";
  }

  area.dataset.treeTier = tier;

  const levelEl = document.getElementById("ltTreeLevel");
  if (levelEl) {
    const level = computeTreeLevelFromTotal(total);
    const tag = tier === "bloom" ? " · aktif & bersinar" : tier === "withered" ? " · rindu (layu)" : tier === "dry" ? " · sepi" : "";
    levelEl.textContent = `Pohon Lv. ${level}${tag}`;
  }

  updateTreeHeartHud();
  applyTreeShapeFromState();
  updateSceneMoodLayers();
}

function updateTreeHeartHud() {
  const label = document.getElementById("loveDayLabel");
  const sub = document.querySelector(".day-counter-sub");
  const total = Number(state?.tree?.totalHungMessages) || 0;
  const level = computeTreeLevelFromTotal(total);
  const day = window.__storyLoveDay || 1;
  const st = getStoryAgeStage(day);
  if (label) {
    label.textContent = `Level ${level}`;
  }
  if (sub) {
    const era = st === "child" ? "Muda bersama" : st === "adult" ? "Dewasa bersama" : "Sejati bersama";
    sub.textContent = `Pohon Cinta Kalian · ${era} · Day ${day} WIB`;
  }
}

function updateLoveHud() {
  const you = document.getElementById("ltAvatarYou");
  const partner = document.getElementById("ltAvatarPartner");
  const youName = document.getElementById("ltNameYou");
  const partnerName = document.getElementById("ltNamePartner");
  const statYou = document.getElementById("ltStatYou");
  const statPartner = document.getElementById("ltStatPartner");
  const stats = readMsgSentStats();
  if (!localName) {
    if (you) {
      you.textContent = "?";
    }
    if (partner) {
      partner.textContent = "?";
    }
    if (youName) {
      youName.textContent = "—";
    }
    if (partnerName) {
      partnerName.textContent = "—";
    }
    if (statYou) {
      statYou.textContent = "0";
    }
    if (statPartner) {
      statPartner.textContent = "0";
    }
    return;
  }
  if (you) {
    you.textContent = localName === "zahra" ? "Z" : "A";
  }
  if (partner) {
    partner.textContent = localName === "zahra" ? "A" : "Z";
  }
  const mine = localName === "zahra" ? "zahra" : "arka";
  const theirs = mine === "arka" ? "zahra" : "arka";
  if (youName) {
    youName.textContent = mine === "zahra" ? "Zahra" : "Arka";
  }
  if (partnerName) {
    partnerName.textContent = theirs === "zahra" ? "Zahra" : "Arka";
  }
  if (statYou) {
    statYou.textContent = String(stats[mine]);
  }
  if (statPartner) {
    statPartner.textContent = String(stats[theirs]);
  }
}

function updateSideDayBlurb(nOther, openedLine) {
  const el = document.getElementById("ltSideDayBlurb");
  if (!el) {
    return;
  }
  if (!localName) {
    el.textContent = "Pilih karakter untuk mulai.";
    return;
  }
  const opens = getOpenCountToday();
  const mid = openedLine && openedLine !== "—" ? openedLine : `${opens} amplop dibuka hari ini (WIB)`;
  if (nOther > 0) {
    el.textContent = `Kamu sudah membuka ${opens} amplop hari ini. ${mid} Masih ada ${nOther} amplop pasangan di pohon — ketuk pohon ya.`;
  } else {
    el.textContent = `Kamu sudah membuka ${opens} amplop hari ini. ${mid} Semua amplop pasangan sudah terbuka — sampai jumpa besok ya.`;
  }
}

function ensureLoveAudioCtx() {
  if (!loveAudioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      return null;
    }
    loveAudioCtx = new AC();
  }
  if (loveAudioCtx.state === "suspended") {
    loveAudioCtx.resume().catch(() => {});
  }
  return loveAudioCtx;
}

function playOscTone(freq, duration, type = "sine", vol = 0.07, when = 0) {
  const ctx = ensureLoveAudioCtx();
  if (!ctx) {
    return;
  }
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const LoveSfx = {
  uiTap() {
    playOscTone(880, 0.05, "triangle", 0.045);
  },
  softPop() {
    playOscTone(520, 0.07, "sine", 0.055);
    playOscTone(780, 0.05, "sine", 0.04, 0.03);
  },
  swoosh() {
    const ctx = ensureLoveAudioCtx();
    if (!ctx) {
      return;
    }
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(800, t0);
    f.frequency.exponentialRampToValueAtTime(2800, t0 + 0.12);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.14);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.07, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(f).connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  },
  softPianoHit() {
    playOscTone(392, 0.28, "sine", 0.09);
    playOscTone(523.25, 0.22, "sine", 0.055, 0.02);
    playOscTone(659.25, 0.18, "triangle", 0.04, 0.05);
  },
  sparkle() {
    playOscTone(1046, 0.09, "sine", 0.04);
    playOscTone(1318, 0.07, "sine", 0.03, 0.04);
  },
  gentleChime() {
    playOscTone(523, 0.2, "sine", 0.05);
    playOscTone(659, 0.18, "sine", 0.04, 0.08);
  },
  softFail() {
    playOscTone(220, 0.18, "sine", 0.045);
  },
  footstep() {
    playOscTone(140, 0.04, "square", 0.018);
  },
  romanticChime() {
    playOscTone(587, 0.12, "sine", 0.05);
    playOscTone(784, 0.14, "sine", 0.045, 0.06);
    playOscTone(988, 0.12, "sine", 0.035, 0.12);
  },
};

function ensureRainNoise() {
  const ctx = ensureLoveAudioCtx();
  if (!ctx || loveRainNodes) {
    return loveRainNodes;
  }
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.6;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 720;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  src.connect(filter).connect(gain).connect(ctx.destination);
  loveRainNodes = { src, gain, started: false };
  return loveRainNodes;
}

function setRainSoundPlaying(on) {
  const nodes = ensureRainNoise();
  if (!nodes) {
    return;
  }
  const ctx = loveAudioCtx;
  if (!ctx) {
    return;
  }
  if (on && !nodes.started) {
    try {
      nodes.src.start(0);
      nodes.started = true;
    } catch (e) {
      /* ignore */
    }
    nodes.gain.gain.cancelScheduledValues(ctx.currentTime);
    nodes.gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.6);
  } else if (!on && nodes.started) {
    nodes.gain.gain.cancelScheduledValues(ctx.currentTime);
    nodes.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
  }
}

function getLovePlayersForMoon() {
  return Object.values(state.players).filter((p) => p.name === "arka" || p.name === "zahra");
}

function updateSceneMoodLayers() {
  const area = document.getElementById("gameArea");
  if (!area) {
    return;
  }
  const phase = area.dataset.sky || "day";
  const tier = area.dataset.treeTier || "normal";
  const recent45m = recentCoupleChatCount(45 * 60 * 1000);
  const recent2h = recentCoupleChatCount(2 * 60 * 60 * 1000);

  let rain = false;
  if (tier === "dry" || tier === "withered") {
    rain = true;
  } else if (phase === "night" && recent45m < 2) {
    rain = true;
  } else if (phase === "dusk" && recent2h < 4) {
    rain = true;
  }
  area.dataset.weather = rain ? "rain" : "clear";

  const ps = getLovePlayersForMoon();
  const roles = new Set(ps.map((p) => p.name));
  const moonCouple = phase === "night" && roles.has("arka") && roles.has("zahra") && ps.length >= 2;
  area.dataset.moonCouple = moonCouple ? "1" : "0";

  setRainSoundPlaying(rain);
}

function getCurrentSkyPhase() {
  return document.getElementById("gameArea")?.dataset.sky || "day";
}

function updateMoodMusicForSky(phase) {
  if (userChosenMusicLock) {
    return;
  }
  const moodEl = document.getElementById("moodAmbientAudio");
  if (!moodEl) {
    return;
  }
  const url = MOOD_BY_SKY[phase] || MOOD_BY_SKY.day;
  if (moodEl.dataset.moodUrl === url && !moodEl.paused) {
    return;
  }
  moodEl.dataset.moodUrl = url;
  moodEl.volume = phase === "night" ? 0.24 : phase === "dusk" ? 0.2 : 0.17;
  moodEl.src = url;
  moodEl.play().catch(() => {});
}

function isRomanticMessage(text) {
  const t = String(text || "").toLowerCase();
  return /(sayang|cinta|love\s*you|i\s*love|rindu|miss\s*you|❤|💕|💗|💘|aku\s*cinta|ku\s*cinta|my\s*heart|hati\s*ku|beb(y|i)|baby|cantik|ganteng|manis|kiss|muah)/i.test(t);
}

function spawnRomanticPetalsAroundTree() {
  if (!memoryTree || !gameArea) {
    return;
  }
  const rect = memoryTree.getBoundingClientRect();
  const areaRect = gameArea.getBoundingClientRect();
  const baseX = rect.left - areaRect.left + rect.width / 2;
  const baseY = rect.top - areaRect.top + rect.height * 0.35;
  for (let i = 0; i < 14; i += 1) {
    const p = document.createElement("span");
    p.className = "float-romantic-petal";
    p.style.left = `${baseX + (i % 7) * 18 - 54 + Math.random() * 12}px`;
    p.style.top = `${baseY + (i % 3) * 8}px`;
    p.style.animationDelay = `${i * 0.05}s`;
    gameArea.appendChild(p);
    setTimeout(() => p.remove(), 2600);
  }
  memoryTree.classList.remove("tree-romantic-float");
  void memoryTree.offsetWidth;
  memoryTree.classList.add("tree-romantic-float");
  setTimeout(() => memoryTree.classList.remove("tree-romantic-float"), 2200);
}

const OPEN_COOLDOWN_CLIENT_MS = 0;
const TEXT_FIELD_MAX = 8000;

let loveNotifLastPartnerEnv = undefined;
let lovePartnerChatPrimed = false;
let lovePartnerChatSnapshot = "";

function pushLoveTreeNotification(body) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    if (document.hidden) {
      try {
        new Notification("Love Tree", { body, tag: "love-tree-msg", renotify: true });
      } catch (e) {
        /* ignore */
      }
    }
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(80);
  }
}

function refreshNotifPermButton() {
  const btn = document.getElementById("ltBtnNotifPerm");
  if (!btn || typeof Notification === "undefined") {
    return;
  }
  btn.hidden = Notification.permission !== "default";
}

function maybeNotifyPartnerEnvelopes(nOther) {
  if (typeof nOther !== "number") {
    return;
  }
  if (loveNotifLastPartnerEnv === undefined) {
    loveNotifLastPartnerEnv = nOther;
    return;
  }
  if (nOther > loveNotifLastPartnerEnv) {
    const line = nOther === 1
      ? "Ada 1 pesan belum terbuka — amplop baru dari pasangan."
      : `Ada ${nOther} amplop dari pasangan yang belum dibuka.`;
    pushLoveTreeNotification(line);
  }
  loveNotifLastPartnerEnv = nOther;
}

function maybeNotifyPartnerChatFromSync(nextPlayers) {
  if (!localName || !state.localId) {
    return;
  }
  const partner = nextPlayers.find((p) => p.id !== state.localId);
  if (!partner) {
    return;
  }
  const msg = String(partner.message || "").trim();
  if (!lovePartnerChatPrimed) {
    lovePartnerChatPrimed = true;
    lovePartnerChatSnapshot = msg;
    return;
  }
  if (msg && msg !== lovePartnerChatSnapshot) {
    lovePartnerChatSnapshot = msg;
    appendCoupleChatPing();
    if (isRomanticMessage(msg)) {
      LoveSfx.romanticChime();
      spawnRomanticPetalsAroundTree();
    }
    pushLoveTreeNotification("Ada pesan chat baru dari pasangan.");
    const fr = partner.name === "zahra" ? "zahra" : "arka";
    appendHistoryEntry({ kind: "chat_received", fromRole: fr, text: truncateHistoryText(msg) });
    bumpMsgSent(fr, 1);
  }
  if (!msg) {
    lovePartnerChatSnapshot = "";
  }
}

function resetLoveNotificationState() {
  loveNotifLastPartnerEnv = undefined;
  lovePartnerChatPrimed = false;
  lovePartnerChatSnapshot = "";
  resetHistoryPresenceSnapshot();
  resetHangStatTracking();
}

let historyPresenceRoles = null;
let pendingHangBody = "";

function resetHistoryPresenceSnapshot() {
  historyPresenceRoles = null;
}

function readHistoryJournal() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_JOURNAL);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writeHistoryJournal(entries) {
  const pruned = entries.slice(-HISTORY_JOURNAL_MAX);
  localStorage.setItem(STORAGE_HISTORY_JOURNAL, JSON.stringify(pruned));
}

function truncateHistoryText(text) {
  const t = String(text || "");
  if (t.length <= HISTORY_TEXT_MAX) {
    return t;
  }
  return `${t.slice(0, HISTORY_TEXT_MAX)}…`;
}

function formatJournalTimeWib(ts) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function roleDisplayName(role) {
  return role === "zahra" ? "Zahra" : "Arka";
}

function appendHistoryEntry(entry) {
  const entries = readHistoryJournal();
  entries.push({
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    t: Date.now(),
    ...entry,
  });
  writeHistoryJournal(entries);
  const histPanel = document.getElementById("historyJournalPanel");
  if (histPanel && !histPanel.classList.contains("is-hidden")) {
    renderHistoryJournalList();
  }
  updateHistoryUnreadBadge();
}

function getHistoryLastReadTs() {
  return parseInt(localStorage.getItem(STORAGE_HISTORY_LAST_READ), 10) || 0;
}

function markHistoryJournalReadThroughNow() {
  const entries = readHistoryJournal();
  const maxT = entries.reduce((m, e) => Math.max(m, Number(e.t) || 0), 0);
  localStorage.setItem(STORAGE_HISTORY_LAST_READ, String(Math.max(maxT, Date.now())));
  updateHistoryUnreadBadge();
}

function updateHistoryUnreadBadge() {
  const badge = document.getElementById("ltHistoryBadge");
  if (!badge) {
    return;
  }
  const lastRead = getHistoryLastReadTs();
  const n = readHistoryJournal().filter((e) => (Number(e.t) || 0) > lastRead).length;
  if (n > 0) {
    badge.classList.remove("is-hidden");
    badge.textContent = n > 99 ? "99+" : String(n);
  } else {
    badge.classList.add("is-hidden");
    badge.textContent = "";
  }
}

function logPresenceTransitions(nextPlayers) {
  if (!localName) {
    historyPresenceRoles = null;
    return;
  }
  const nowSet = getLovePlayerRolesFromList(nextPlayers);
  const prev = historyPresenceRoles;
  historyPresenceRoles = new Set(nowSet);
  if (prev === null) {
    return;
  }
  ["arka", "zahra"].forEach((r) => {
    const wasOnline = prev.has(r);
    const isOnline = historyPresenceRoles.has(r);
    if (!wasOnline && isOnline) {
      appendHistoryEntry({ kind: "presence_online", role: r });
    } else if (wasOnline && !isOnline) {
      appendHistoryEntry({ kind: "presence_offline", role: r });
    }
  });
}

function renderHistoryJournalList() {
  const list = document.getElementById("historyJournalList");
  if (!list) {
    return;
  }
  list.replaceChildren();
  const entries = readHistoryJournal().slice().reverse();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "history-journal-empty";
    empty.textContent = "Belum ada catatan — chat, gantung amplop, atau tunggu pasangan online; jejak manisnya akan tertulis di sini.";
    list.appendChild(empty);
    return;
  }

  entries.forEach((e) => {
    const row = document.createElement("article");
    row.className = "history-journal-row";

    const meta = document.createElement("div");
    meta.className = "history-journal-row-meta";

    const tag = document.createElement("span");
    tag.className = "history-journal-tag";

    const timeEl = document.createElement("time");
    timeEl.dateTime = new Date(e.t).toISOString();
    timeEl.textContent = formatJournalTimeWib(e.t);

    const body = document.createElement("div");
    body.className = "history-journal-row-body";

    const kind = e.kind;
    if (kind === "presence_online") {
      tag.classList.add("history-journal-tag--online");
      tag.textContent = "Online";
      body.textContent = `${roleDisplayName(e.role)} hadir di Love Tree.`;
    } else if (kind === "presence_offline") {
      tag.classList.add("history-journal-tag--offline");
      tag.textContent = "Offline";
      body.textContent = `${roleDisplayName(e.role)} meninggalkan ruangan (offline).`;
    } else if (kind === "chat_sent") {
      tag.classList.add("history-journal-tag--chat");
      tag.textContent = "Chat · kamu";
      body.textContent = `Kamu mengirim: “${truncateHistoryText(e.text)}”`;
    } else if (kind === "chat_received") {
      tag.classList.add("history-journal-tag--chat");
      tag.textContent = "Chat · pasangan";
      body.textContent = `${roleDisplayName(e.fromRole)}: “${truncateHistoryText(e.text)}”`;
    } else if (kind === "hang_sent") {
      tag.classList.add("history-journal-tag--hang");
      tag.textContent = "Amplop gantung";
      body.textContent = `${roleDisplayName(e.fromRole)} menggantung pesan: “${truncateHistoryText(e.text)}”`;
    } else if (kind === "envelope_opened") {
      tag.classList.add("history-journal-tag--open");
      tag.textContent = "Amplop dibuka";
      body.textContent = `Isi dari ${roleDisplayName(e.fromRole)}: “${truncateHistoryText(e.text)}”`;
    } else {
      tag.textContent = "Catatan";
      body.textContent = "Entri tidak dikenal.";
    }

    meta.appendChild(tag);
    meta.appendChild(timeEl);
    row.appendChild(meta);
    row.appendChild(body);
    list.appendChild(row);
  });
}

function setupHistoryPanel() {
  const overlay = document.getElementById("historyJournalPanel");
  const btn = document.getElementById("ltBtnHistory");
  const closeBtn = document.getElementById("historyJournalClose");
  const backdrop = document.getElementById("historyJournalBackdrop");
  if (!overlay || !btn) {
    return;
  }

  const openPanel = () => {
    LoveSfx.uiTap();
    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    renderHistoryJournalList();
    markHistoryJournalReadThroughNow();
  };

  const closePanel = () => {
    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    markHistoryJournalReadThroughNow();
  };

  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (overlay.classList.contains("is-hidden")) {
      openPanel();
    } else {
      closePanel();
    }
  });

  closeBtn?.addEventListener("click", () => {
    LoveSfx.uiTap();
    closePanel();
  });

  backdrop?.addEventListener("click", () => {
    closePanel();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") {
      return;
    }
    if (!overlay.classList.contains("is-hidden")) {
      closePanel();
    }
  });

  document.addEventListener("click", (ev) => {
    if (overlay.classList.contains("is-hidden")) {
      return;
    }
    const t = ev.target;
    if (t === btn || btn.contains(t) || overlay.querySelector(".history-journal-sheet")?.contains(t)) {
      return;
    }
    closePanel();
  });

  updateHistoryUnreadBadge();
}

function addLoveBlossoms(count) {
  const canopyWidth = Math.max(180, treeCanopy.clientWidth || 320);
  const canopyHeight = Math.max(120, treeCanopy.clientHeight || 220);
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement("span");
    dot.className = "love-blossom";
    if (i % 5 === 0) {
      dot.classList.add("love-blossom--lg");
    } else if (i % 3 === 0) {
      dot.classList.add("love-blossom--sm");
    }
    const x = 10 + ((i * 37) % (canopyWidth - 24));
    const y = 8 + ((i * 29) % (canopyHeight - 20));
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.animationDelay = `${(i % 12) * 0.18}s`;
    treeCanopy.appendChild(dot);
  }
}

function setupMusicPanel() {
  const panel = document.getElementById("musicPanel");
  const list = document.getElementById("musicTrackList");
  const audio = document.getElementById("romanticAudio");
  const btnMusic = document.getElementById("ltBtnMusic");
  const btnClose = document.getElementById("musicPanelClose");
  const btnPause = document.getElementById("musicBtnPause");
  const btnStop = document.getElementById("musicBtnStop");
  if (!panel || !list || !audio || !btnMusic) {
    return;
  }

  ROMANTIC_TRACKS.forEach((track, index) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `${index + 1}. ${track.title}`;
    b.addEventListener("click", () => {
      if (!track.url) {
        return;
      }
      userChosenMusicLock = true;
      document.getElementById("moodAmbientAudio")?.pause();
      list.querySelectorAll("button.is-active").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      audio.src = track.url;
      audio.play().catch(() => {
        showPopupMessage("Musik tidak bisa diputar (cek jaringan / URL).");
      });
    });
    li.appendChild(b);
    list.appendChild(li);
  });

  const pill = document.getElementById("ltMusicOnPill");
  const syncMusicPill = () => {
    if (!pill || !btnMusic) {
      return;
    }
    pill.classList.toggle("is-hidden", !btnMusic.classList.contains("is-on"));
  };

  const togglePanel = () => {
    const hidden = panel.classList.toggle("is-hidden");
    panel.setAttribute("aria-hidden", hidden ? "true" : "false");
    btnMusic.classList.toggle("is-on", !hidden);
    btnMusic.setAttribute("aria-expanded", hidden ? "false" : "true");
    syncMusicPill();
  };

  btnMusic.addEventListener("click", (e) => {
    e.stopPropagation();
    LoveSfx.uiTap();
    togglePanel();
  });

  btnClose?.addEventListener("click", () => {
    panel.classList.add("is-hidden");
    panel.setAttribute("aria-hidden", "true");
    btnMusic.classList.remove("is-on");
    btnMusic.setAttribute("aria-expanded", "false");
    syncMusicPill();
  });

  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("is-hidden") && !panel.contains(e.target) && e.target !== btnMusic) {
      panel.classList.add("is-hidden");
      panel.setAttribute("aria-hidden", "true");
      btnMusic.classList.remove("is-on");
      btnMusic.setAttribute("aria-expanded", "false");
      syncMusicPill();
    }
  });

  btnPause?.addEventListener("click", () => {
    if (!audio.paused) {
      audio.pause();
    }
  });
  btnStop?.addEventListener("click", () => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    list.querySelectorAll("button.is-active").forEach((x) => x.classList.remove("is-active"));
    userChosenMusicLock = false;
    updateMoodMusicForSky(getCurrentSkyPhase());
    syncMusicPill();
  });

  syncMusicPill();
}

const gameArea = document.getElementById("gameArea");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const hangForm = document.getElementById("hangForm");
const hangInput = document.getElementById("hangInput");
const connectionInfo = document.getElementById("connectionInfo");
const controlsInfo = document.getElementById("controlsInfo");
const treeInfo = document.getElementById("treeInfo");
const openLimitInfo = document.getElementById("openLimitInfo");
const memoryTree = document.getElementById("memoryTree");
const treeCanopy = document.getElementById("treeCanopy");
const charPickOverlay = document.getElementById("charPickOverlay");
const charPickForm = document.getElementById("charPickForm");
const charPickInput = document.getElementById("charPickInput");
const charPickError = document.getElementById("charPickError");

let localName = null;
let socket = null;
let loveConnectionGuardTimer = null;
let loveLoginSettled = false;

function getLoveWebSocketUrl() {
  if (typeof window.GAMEARKA_WS_URL === "string" && window.GAMEARKA_WS_URL.trim()) {
    return window.GAMEARKA_WS_URL.trim();
  }
  const qp = new URLSearchParams(window.location.search).get("ws");
  if (qp && qp.trim()) {
    const t = qp.trim();
    if (t.startsWith("ws://") || t.startsWith("wss://")) {
      return t;
    }
    const secure = window.location.protocol === "https:";
    return `${secure ? "wss" : "ws"}://${t}`;
  }
  const meta = document.querySelector('meta[name="gamearka:websocket"]');
  const metaContent = meta && meta.getAttribute("content") && meta.getAttribute("content").trim();
  if (metaContent) {
    if (metaContent.startsWith("ws://") || metaContent.startsWith("wss://")) {
      return metaContent;
    }
    const secure = window.location.protocol === "https:";
    return `${secure ? "wss" : "ws"}://${metaContent.replace(/^\/+/, "")}`;
  }

  const secure = window.location.protocol === "https:";
  const wsProto = secure ? "wss" : "ws";
  const host = window.location.hostname;
  const port = window.location.port;

  if (port === "443" || (secure && !port)) {
    return `${wsProto}://${host}`;
  }
  if (port && port !== "80") {
    return `${wsProto}://${host}:${port}`;
  }
  /* HTTP lewat Apache/XAMPP (port 80): WebSocket ada di server Node, biasanya 3000 */
  return `${wsProto}://${host}:3000`;
}

function clearLoveConnectionGuard() {
  if (loveConnectionGuardTimer) {
    clearTimeout(loveConnectionGuardTimer);
    loveConnectionGuardTimer = null;
  }
}

function failLoveLogin(message) {
  if (loveLoginSettled) {
    return;
  }
  loveLoginSettled = true;
  clearLoveConnectionGuard();
  hideRomanticLoaderNow();
  if (connectionInfo) {
    connectionInfo.textContent = message;
  }
  if (charPickError) {
    charPickError.textContent = message;
  }
  localName = null;
  resetHistoryPresenceSnapshot();
  resetHangStatTracking();
  lovePartnerChatPrimed = false;
  lovePartnerChatSnapshot = "";
  loveNotifLastPartnerEnv = undefined;
  if (charPickOverlay) {
    delete charPickOverlay.dataset.submitting;
    charPickOverlay.classList.remove("is-hidden");
    charPickOverlay.setAttribute("aria-hidden", "false");
  }
  if (controlsInfo) {
    controlsInfo.textContent = "Pilih karakter untuk mulai";
  }
  updateHeaderAvatars();
  try {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close();
    }
  } catch (e) {
    /* ignore */
  }
  socket = null;
}

const urlParams = new URLSearchParams(window.location.search);
const urlHint = (urlParams.get("name") || "").toLowerCase();
if (urlHint === "zahra" || urlHint === "arka") {
  if (charPickInput) {
    charPickInput.value = urlHint;
  }
}

const MOVE_KEYS = {
  up: ["w", "arrowup"],
  down: ["s", "arrowdown"],
  left: ["a", "arrowleft"],
  right: ["d", "arrowright"],
};

const state = {
  localId: null,
  players: {},
  pressed: { up: false, down: false, left: false, right: false },
  speed: 4,
  tree: {
    totalHungMessages: 0,
    hangingMessages: [],
    openCooldownByRole: { arka: 0, zahra: 0 },
  },
};

function getStoryLoveDay() {
  return Number.isFinite(window.__storyLoveDay) ? window.__storyLoveDay : 1;
}

function makeAvatarPalette(role, stage) {
  if (role === "arka") {
    if (stage === "child") {
      return { k: "#2a3a55", s: "#fde8cf", b: "#93c5fd", p: "#3b82f6" };
    }
    if (stage === "elder") {
      return { k: "#7d8695", s: "#dcc8b8", b: "#4f7fd1", p: "#1a2f52" };
    }
    return { k: "#243652", s: "#e8c9a8", b: "#2563eb", p: "#1e40af" };
  }
  if (stage === "child") {
    return { k: "#4a3042", s: "#ffe8ee", t: "#fda4c8", p: "#f472b6" };
  }
  if (stage === "elder") {
    return { k: "#8a7a82", s: "#ead8d4", t: "#f0a0c0", p: "#9d174d" };
  }
  return { k: "#3a2834", s: "#fad4dc", t: "#f472b6", p: "#be185d" };
}

const ARKA_PATTERN = [
  "...kkkkkk...",
  "..kkkkkkkk..",
  ".kksssssskk.",
  ".ssssssssss.",
  ".ssssssssss.",
  "..ssssssss..",
  ".bbbbbbbbbb.",
  ".bbbbbbbbbb.",
  ".bbbbbbbbbb.",
  ".bb......bb.",
  ".bb......bb.",
  ".pp......pp.",
  ".pp......pp.",
  ".ss......ss.",
];

const ZAHRA_PATTERN = [
  "..kk....kk..",
  ".kksssssskk.",
  "kksssssskkkk",
  "kssssssssssk",
  ".ssssssssss.",
  "..ssssssss..",
  ".tttttttttt.",
  ".tttttttttt.",
  ".tttttttttt.",
  ".tt......tt.",
  ".tt......tt.",
  ".pp......pp.",
  ".pp......pp.",
  ".ss......ss.",
];

function buildPixelAvatar(role, stageOverride) {
  const stage = stageOverride || getStoryAgeStage(getStoryLoveDay());
  const rows = role === "zahra" ? ZAHRA_PATTERN : ARKA_PATTERN;
  const palette = makeAvatarPalette(role === "zahra" ? "zahra" : "arka", stage);
  const root = document.createElement("div");
  root.className = `pixel-avatar pixel-avatar--${role} pixel-avatar--${stage}`;
  root.setAttribute("aria-hidden", "true");
  rows.forEach((row) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "pixel-row";
    [...row].forEach((ch) => {
      const cell = document.createElement("span");
      cell.className = "pixel";
      if (ch === "." || ch === " ") {
        cell.classList.add("pixel--empty");
      } else {
        const color = palette[ch];
        if (color) {
          cell.style.backgroundColor = color;
        }
      }
      rowDiv.appendChild(cell);
    });
    root.appendChild(rowDiv);
  });
  return root;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getBounds() {
  return {
    width: gameArea.clientWidth,
    height: gameArea.clientHeight,
  };
}

function sanitizeText(text) {
  return String(text || "").replace(/[<>]/g, "").slice(0, TEXT_FIELD_MAX);
}

function sanitizeLongText(text) {
  return String(text || "").replace(/[<>]/g, "").slice(0, TEXT_FIELD_MAX);
}

function formatRemaining(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} jam ${minutes} menit`;
}

function showPopupMessage(message) {
  const popup = document.createElement("div");
  popup.className = "popup-message";
  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 4000);
}

function showEnvelopeOpenAnimation(fromName, messageText) {
  const backdrop = document.createElement("div");
  backdrop.className = "envelope-modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const modal = document.createElement("div");
  modal.className = "envelope-modal-box";

  const onKey = (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  };

  const closeModal = () => {
    window.removeEventListener("keydown", onKey);
    backdrop.classList.add("is-closing");
    setTimeout(() => backdrop.remove(), 380);
  };

  window.addEventListener("keydown", onKey);

  modal.innerHTML = `
    <button type="button" class="envelope-modal-close" aria-label="Tutup">&times;</button>
    <p class="envelope-modal-from">Surat dari ${fromName}</p>
    <div class="envelope-open-stage">
      <div class="em-paper">
        <p class="em-paper-text"></p>
      </div>
      <div class="em-body"></div>
      <div class="em-flap"></div>
      <div class="em-shine"></div>
    </div>
  `;

  modal.querySelector(".em-paper-text").textContent = messageText;

  const closeBtn = modal.querySelector(".envelope-modal-close");
  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  });

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => {
    backdrop.classList.add("is-visible");
    const stage = modal.querySelector(".envelope-open-stage");
    requestAnimationFrame(() => {
      stage.classList.add("is-opening");
    });
  });
}

function createPlayerElement(player) {
  const character = document.createElement("div");
  const role = player.name === "zahra" ? "zahra" : "arka";
  character.className = `character ${role}`;
  character.dataset.playerId = player.id;

  const shadow = document.createElement("div");
  shadow.className = "char-ground-shadow";

  const wrap = document.createElement("div");
  wrap.className = "char-body-wrap";
  const stage = getStoryAgeStage(getStoryLoveDay());
  player.avatarStage = stage;
  character.dataset.ageStage = stage;
  wrap.appendChild(buildPixelAvatar(role, stage));

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.style.display = "none";

  const nameTag = document.createElement("div");
  nameTag.className = "name-tag";
  nameTag.textContent = role === "zahra" ? "Zahra" : "Arka";

  character.appendChild(shadow);
  character.appendChild(wrap);
  character.appendChild(bubble);
  const zzz = document.createElement("div");
  zzz.className = "char-zzz";
  zzz.setAttribute("aria-hidden", "true");
  zzz.innerHTML = "<span>Z</span><span>z</span><span>z</span>";
  character.appendChild(zzz);
  character.appendChild(nameTag);
  gameArea.appendChild(character);
  player.element = character;
  player.bubble = bubble;
}

function renderPlayer(player) {
  if (!player.element) {
    createPlayerElement(player);
  }
  const el = player.element;
  const sleeping = isLoveSleepMode();
  const bounds = getBounds();
  const role = player.name === "zahra" ? "zahra" : "arka";

  if (sleeping) {
    const rolesHere = getLovePlayerRolesFromList(Object.values(state.players));
    const y = Math.max(36, bounds.height - 86);
    let cx;
    if (rolesHere.size >= 2) {
      cx = role === "zahra" ? bounds.width * 0.56 : bounds.width * 0.4;
    } else {
      cx = bounds.width * 0.5;
    }
    const half = 18;
    el.style.left = `${clamp(cx, half, bounds.width - half) - half}px`;
    el.style.top = `${y}px`;
    el.classList.add("character--sleeping");
  } else {
    el.style.left = `${player.x}px`;
    el.style.top = `${player.y}px`;
    el.classList.remove("character--sleeping");
  }

  el.classList.toggle("me", player.id === state.localId);

  const zzz = el.querySelector(".char-zzz");
  if (zzz) {
    zzz.classList.toggle("is-visible", sleeping);
  }

  const stage = getStoryAgeStage(getStoryLoveDay());
  if (player.avatarStage !== stage) {
    player.avatarStage = stage;
    el.dataset.ageStage = stage;
    const wrap = el.querySelector(".char-body-wrap");
    if (wrap) {
      wrap.replaceChildren(buildPixelAvatar(role, stage));
    }
  }

  if (sleeping) {
    player.bubble.style.display = "none";
  } else if (player.message) {
    player.bubble.textContent = player.message;
    player.bubble.style.display = "block";
  } else {
    player.bubble.style.display = "none";
  }
}

function removePlayer(playerId) {
  const player = state.players[playerId];
  if (!player) {
    return;
  }
  if (player.element) {
    player.element.remove();
  }
  delete state.players[playerId];
}

function syncPlayers(nextPlayers) {
  const activeIds = new Set();
  nextPlayers.forEach((nextPlayer) => {
    activeIds.add(nextPlayer.id);
    const existing = state.players[nextPlayer.id] || {};
    state.players[nextPlayer.id] = {
      ...existing,
      ...nextPlayer,
      message: sanitizeText(nextPlayer.message || ""),
    };
    renderPlayer(state.players[nextPlayer.id]);
  });

  Object.keys(state.players).forEach((id) => {
    if (!activeIds.has(id)) {
      removePlayer(id);
    }
  });
  updateCouplePresenceUi(nextPlayers);
  updateHeaderAvatars();
  maybeNotifyPartnerChatFromSync(nextPlayers);
  logPresenceTransitions(nextPlayers);
  Object.values(state.players).forEach((p) => {
    renderPlayer(p);
  });
}

function isLoveTheme() {
  return document.body.classList.contains("love-tree-theme");
}

function getLovePlayerRolesFromList(list) {
  const roles = new Set();
  (list || []).forEach((p) => {
    if (p && (p.name === "arka" || p.name === "zahra")) {
      roles.add(p.name);
    }
  });
  return roles;
}

function isCoupleAwakeFromPlayerList(list) {
  const roles = getLovePlayerRolesFromList(list);
  return roles.has("arka") && roles.has("zahra");
}

function isLoveSleepMode() {
  return Boolean(
    localName
    && isLoveTheme()
    && !isCoupleAwakeFromPlayerList(Object.values(state.players)),
  );
}

function updateCouplePresenceUi(playerList) {
  const area = document.getElementById("gameArea");
  const ghost = document.getElementById("sleepGhostPartner");
  const list = playerList || Object.values(state.players);
  const awake = Boolean(localName && isCoupleAwakeFromPlayerList(list));
  if (area) {
    area.dataset.coupleAwake = awake ? "1" : "0";
  }
  if (!ghost) {
    return;
  }
  if (!localName || awake) {
    ghost.classList.add("is-hidden");
    ghost.setAttribute("aria-hidden", "true");
    return;
  }
  const roles = getLovePlayerRolesFromList(list);
  let missing = "zahra";
  if (!roles.has("arka")) {
    missing = "arka";
  } else if (!roles.has("zahra")) {
    missing = "zahra";
  }
  ghost.dataset.missingRole = missing;
  ghost.dataset.side = missing === "zahra" ? "right" : "left";
  ghost.classList.remove("is-hidden");
  ghost.setAttribute("aria-hidden", "false");
}

function updateHeaderAvatars() {
  updateLoveHud();
}

function addTreeDecor(count, className) {
  if (isLoveTheme()) {
    return;
  }
  const canopyWidth = 260;
  const canopyHeight = 200;
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement("span");
    dot.className = className;
    const x = 8 + ((i * 31) % (canopyWidth - 20));
    const y = 10 + ((i * 23) % (canopyHeight - 22));
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    treeCanopy.appendChild(dot);
  }
}

function renderTreeEnvelopes(messages) {
  treeCanopy.querySelectorAll(".hanging-envelope-wrap").forEach((node) => node.remove());
  messages.forEach((message, index) => {
    const wrap = document.createElement("span");
    wrap.className = "hanging-envelope-wrap";
    wrap.classList.add(`wind-var-${index % 5}`);

    const stringEl = document.createElement("span");
    stringEl.className = "envelope-string";
    stringEl.setAttribute("aria-hidden", "true");

    const env = document.createElement("span");
    env.className = "hanging-envelope hanging-envelope--tree";
    env.innerHTML = '<span class="env-paper-hint"></span><span class="env-body-shade"></span>';

    const x = 16 + ((index * 31) % 210);
    const y = 18 + ((index * 37) % 130);
    wrap.style.left = `${x}px`;
    wrap.style.top = `${y}px`;
    wrap.title = `Amplop dari ${message.from === "zahra" ? "Zahra" : "Arka"}`;

    wrap.appendChild(stringEl);
    wrap.appendChild(env);
    treeCanopy.appendChild(wrap);
  });
}

function renderTreeState(tree) {
  state.tree = {
    totalHungMessages: Number(tree.totalHungMessages) || 0,
    hangingMessages: Array.isArray(tree.hangingMessages) ? tree.hangingMessages : [],
    openCooldownByRole: tree.openCooldownByRole || { arka: 0, zahra: 0 },
  };

  treeCanopy.querySelectorAll(".leaf, .flower, .love-blossom").forEach((node) => node.remove());
  const totalHung = state.tree.totalHungMessages;
  const hangingN = state.tree.hangingMessages.length;
  if (isLoveTheme()) {
    const blossoms = Math.min(220, 12 + Math.floor(totalHung * 2.2) + hangingN * 4);
    const scale = 1 + Math.min(1.35, 0.028 * Math.sqrt(Math.max(0, totalHung)) + 0.012 * hangingN);
    memoryTree.style.setProperty("--love-tree-scale", String(scale));
    addLoveBlossoms(blossoms);
  } else {
    const leafCount = Math.min(50, 8 + Math.floor(totalHung * 1.4));
    const flowerCount = Math.min(24, Math.floor(totalHung / 3));
    addTreeDecor(leafCount, "leaf");
    addTreeDecor(flowerCount, "flower");
    memoryTree.style.removeProperty("--love-tree-scale");
  }
  renderTreeEnvelopes(state.tree.hangingMessages);

  const partnerMemo = document.getElementById("ltPartnerMemo");
  let nOther = 0;
  if (localName) {
    const myRole = localName === "zahra" ? "zahra" : "arka";
    const otherRole = myRole === "arka" ? "zahra" : "arka";
    const nMine = state.tree.hangingMessages.filter((m) => m.from === myRole).length;
    nOther = state.tree.hangingMessages.filter((m) => m.from === otherRole).length;
    treeInfo.textContent = `${nMine} amplop gantung milikmu`;
    if (partnerMemo) {
      partnerMemo.textContent = `${nOther} amplop pasangan di pohon`;
    }

    const strip = document.getElementById("ltUnreadStrip");
    if (strip) {
      if (nOther > 0) {
        strip.textContent = nOther === 1
          ? "Ada 1 pesan belum terbuka — ketuk pohon untuk membuka amplop pasangan."
          : `Ada ${nOther} amplop pasangan yang belum dibuka — ketuk pohon untuk membuka.`;
        strip.classList.remove("is-hidden");
      } else {
        strip.classList.add("is-hidden");
      }
    }
    maybeNotifyPartnerEnvelopes(nOther);

    const list = state.tree.hangingMessages;
    if (!hangStatPrimed) {
      hangSeenIds = new Set(list.map((m) => m.id).filter(Boolean));
      hangStatPrimed = true;
    } else {
      list.forEach((m) => {
        if (!m.id || hangSeenIds.has(m.id)) {
          return;
        }
        hangSeenIds.add(m.id);
        const from = m.from === "zahra" ? "zahra" : "arka";
        if (from !== myRole) {
          bumpMsgSent(from, 1);
        }
      });
    }
  } else {
    treeInfo.textContent = "—";
    if (partnerMemo) {
      partnerMemo.textContent = "—";
    }
    document.getElementById("ltUnreadStrip")?.classList.add("is-hidden");
  }

  const localRole = localName === "zahra" ? "zahra" : "arka";
  const lastOpen = Number(state.tree.openCooldownByRole[localRole]) || 0;
  const remaining = OPEN_COOLDOWN_CLIENT_MS - (Date.now() - lastOpen);
  if (!localName) {
    openLimitInfo.textContent = "—";
  } else if (OPEN_COOLDOWN_CLIENT_MS > 0 && remaining > 0) {
    openLimitInfo.textContent = `0/1 dibuka · ${formatRemaining(remaining)}`;
  } else {
    const opened = getOpenCountToday();
    openLimitInfo.textContent = `${opened} amplop dibuka hari ini (WIB)`;
  }

  updateTreeVitalityUi();
  checkTreeLevelProgress(totalHung);
  updateLoveHud();
  const openedLine = openLimitInfo ? openLimitInfo.textContent : "—";
  updateSideDayBlurb(localName ? nOther : 0, openedLine);
}

function getMoveDelta() {
  let dx = 0;
  let dy = 0;
  if (state.pressed.up) dy -= state.speed;
  if (state.pressed.down) dy += state.speed;
  if (state.pressed.left) dx -= state.speed;
  if (state.pressed.right) dx += state.speed;
  return { dx, dy };
}

function openSocket() {
  const socketUrl = getLoveWebSocketUrl();
  const socket = new WebSocket(socketUrl);

  socket.addEventListener("open", () => {
    if (connectionInfo) {
      connectionInfo.textContent = `Terhubung ke ${socketUrl} · menyambung…`;
    }
    if (!window.__loveWsOpenChimed) {
      window.__loveWsOpenChimed = true;
      LoveSfx.gentleChime();
    } else {
      LoveSfx.softPop();
    }
    if (localName) {
      socket.send(JSON.stringify({ type: "join", name: localName }));
    }
  });

  socket.addEventListener("error", () => {
    if (!localName || state.localId || loveLoginSettled) {
      return;
    }
    failLoveLogin(
      "Tidak bisa menyambung ke server game. Di XAMPP: jalankan juga Node di folder ini (`npm start`, port 3000). "
      + "Atur meta gamearka:websocket atau ?ws=HOST:PORT bila perlu.",
    );
  });

  socket.addEventListener("close", () => {
    clearLoveConnectionGuard();
    if (!localName) {
      return;
    }
    if (!state.localId) {
      return;
    }
    if (connectionInfo) {
      connectionInfo.textContent = "Status: offline (reconnecting...)";
    }
    setTimeout(() => {
      if (localName) {
        socket = openSocket();
      }
    }, 1500);
  });

  socket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    if (payload.type === "join_denied") {
      if (payload.reason === "role_taken") {
        hideRomanticLoaderNow();
        clearLoveConnectionGuard();
        loveLoginSettled = true;
        resetLoveNotificationState();
        const roleLabel = payload.role === "zahra" ? "Zahra" : "Arka";
        charPickError.textContent = `${roleLabel} sudah dipakai pemain lain. Ketik nama lain.`;
        localName = null;
        updateHeaderAvatars();
        controlsInfo.textContent = "Pilih karakter untuk mulai";
        delete charPickOverlay.dataset.submitting;
        charPickOverlay.classList.remove("is-hidden");
        charPickOverlay.setAttribute("aria-hidden", "false");
        charPickInput.focus();
        connectionInfo.textContent = "Peran ditolak — pilih ulang";
      }
      return;
    }
    if (payload.type === "init") {
      loveLoginSettled = true;
      clearLoveConnectionGuard();
      state.localId = payload.playerId;
      syncPlayers(payload.players);
      renderTreeState(payload.tree || {});
      updateHeaderAvatars();
      if (charPickOverlay) {
        delete charPickOverlay.dataset.submitting;
      }
      hideRomanticLoader(() => {
        maybeShowDailyLoginGift({ deferMs: 220 });
      });
      if (connectionInfo) {
        connectionInfo.textContent = "Terhubung · selamat datang di Love Tree";
      }
      refreshNotifPermButton();
    }
    if (payload.type === "state") {
      syncPlayers(payload.players);
      renderTreeState(payload.tree || {});
      const lo = document.getElementById("loadingOverlay");
      if (localName && state.localId && lo && !lo.classList.contains("is-hidden")) {
        loveLoginSettled = true;
        clearLoveConnectionGuard();
        hideRomanticLoader();
        if (connectionInfo) {
          connectionInfo.textContent = "Terhubung · selamat datang di Love Tree";
        }
      }
    }
    if (payload.type === "hang_success") {
      localStorage.setItem(STORAGE_LAST_HANG, String(Date.now()));
      appendCoupleChatPing();
      const hangText = pendingHangBody;
      pendingHangBody = "";
      if (hangText && localName) {
        appendHistoryEntry({
          kind: "hang_sent",
          fromRole: localName === "zahra" ? "zahra" : "arka",
          text: truncateHistoryText(hangText),
        });
        bumpMsgSent(localName === "zahra" ? "zahra" : "arka", 1);
      }
      LoveSfx.sparkle();
      memoryTree.classList.remove("romantic-burst");
      void memoryTree.offsetWidth;
      memoryTree.classList.add("romantic-burst");
      treeCanopy.classList.remove("hang-wind-burst");
      void treeCanopy.offsetWidth;
      treeCanopy.classList.add("hang-wind-burst");
      setTimeout(() => treeCanopy.classList.remove("hang-wind-burst"), 2200);
      showPopupMessage("Amplop kamu berhasil digantung di Pohon Kenangan.");
      updateTreeVitalityUi();
    }
    if (payload.type === "open_result") {
      if (payload.ok) {
        LoveSfx.softPianoHit();
        const fromName = payload.from === "zahra" ? "Zahra" : "Arka";
        const fromRole = payload.from === "zahra" ? "zahra" : "arka";
        appendHistoryEntry({
          kind: "envelope_opened",
          fromRole,
          text: truncateHistoryText(payload.message || ""),
        });
        bumpOpenCountToday();
        if (localName) {
          const myRole = localName === "zahra" ? "zahra" : "arka";
          const otherRole = myRole === "arka" ? "zahra" : "arka";
          const nOtherNow = (state.tree.hangingMessages || []).filter((m) => m.from === otherRole).length;
          const openEl = document.getElementById("openLimitInfo");
          if (openEl) {
            const lastOpen = Number(state.tree.openCooldownByRole[myRole]) || 0;
            const remaining = OPEN_COOLDOWN_CLIENT_MS - (Date.now() - lastOpen);
            if (OPEN_COOLDOWN_CLIENT_MS > 0 && remaining > 0) {
              openEl.textContent = `0/1 dibuka · ${formatRemaining(remaining)}`;
            } else {
              openEl.textContent = `${getOpenCountToday()} amplop dibuka hari ini (WIB)`;
            }
            updateSideDayBlurb(nOtherNow, openEl.textContent);
          }
        }
        showEnvelopeOpenAnimation(fromName, payload.message || "");
      } else if (payload.reason === "cooldown") {
        LoveSfx.softFail();
        showPopupMessage(`Kamu baru bisa buka lagi dalam ${formatRemaining(payload.remainingMs || 0)}.`);
      } else if (payload.reason === "empty") {
        LoveSfx.softFail();
        showPopupMessage("Belum ada pesan pasanganmu yang tergantung di pohon.");
      }
    }
  });

  return socket;
}

charPickForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!charPickInput || !charPickError || !charPickOverlay) {
    return;
  }
  if (charPickOverlay.dataset.submitting === "1") {
    return;
  }
  charPickError.textContent = "";
  const raw = charPickInput.value.trim().toLowerCase();
  let chosen;
  if (raw === "zahra") {
    chosen = "zahra";
  } else if (raw === "arka") {
    chosen = "arka";
  } else {
    charPickError.textContent = "Ketik arka atau zahra saja.";
    return;
  }
  charPickOverlay.dataset.submitting = "1";
  loveLoginSettled = false;
  clearLoveConnectionGuard();
  localName = chosen;
  resetHistoryPresenceSnapshot();
  resetHangStatTracking();
  const displayName = chosen === "zahra" ? "Zahra" : "Arka";
  LoveSfx.uiTap();
  showRomanticLoader(displayName);
  charPickOverlay.classList.add("is-hidden");
  charPickOverlay.setAttribute("aria-hidden", "true");
  controlsInfo.textContent = `Kamu: ${localName.toUpperCase()} | WASD / Arrow Keys`;
  updateHeaderAvatars();

  if (socket && socket.readyState === WebSocket.OPEN) {
    connectionInfo.textContent = "Mengganti peran…";
    socket.send(JSON.stringify({ type: "join", name: localName }));
  } else {
    connectionInfo.textContent = `Menyambung ke ${getLoveWebSocketUrl()}…`;
    socket = openSocket();
    loveConnectionGuardTimer = setTimeout(() => {
      loveConnectionGuardTimer = null;
      if (!loveLoginSettled && localName && !state.localId) {
        failLoveLogin(
          "Tidak ada balasan dari server. Pastikan di folder project ini perintah `npm start` sudah jalan (port 3000). "
          + "Halaman dari XAMPP (port 80) tetap memakai WebSocket ke Node :3000.",
        );
      }
    }, 12000);
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  Object.entries(MOVE_KEYS).forEach(([direction, keys]) => {
    if (keys.includes(key)) {
      state.pressed[direction] = true;
    }
  });
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  Object.entries(MOVE_KEYS).forEach(([direction, keys]) => {
    if (keys.includes(key)) {
      state.pressed[direction] = false;
    }
  });
});

chatForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = sanitizeText(chatInput.value.trim());
  if (!message || !socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify({ type: "chat", message }));
  appendHistoryEntry({ kind: "chat_sent", text: truncateHistoryText(message) });
  bumpMsgSent(localName === "zahra" ? "zahra" : "arka", 1);
  localStorage.setItem(STORAGE_LAST_CHAT, String(Date.now()));
  appendCoupleChatPing();
  if (isRomanticMessage(message)) {
    LoveSfx.romanticChime();
    spawnRomanticPetalsAroundTree();
  } else {
    LoveSfx.softPop();
  }
  chatInput.value = "";
  updateTreeVitalityUi();
});

hangForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = sanitizeLongText(hangInput.value.trim());
  if (!message || !socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  LoveSfx.swoosh();
  pendingHangBody = message;
  socket.send(JSON.stringify({ type: "hang_message", message }));
  hangInput.value = "";
});

memoryTree.addEventListener("click", () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    showPopupMessage("Koneksi belum online.");
    LoveSfx.softFail();
    return;
  }
  LoveSfx.uiTap();
  socket.send(JSON.stringify({ type: "open_tree_message" }));
});

function gameLoop() {
  if (
    localName
    && socket
    && socket.readyState === WebSocket.OPEN
    && state.localId
    && state.players[state.localId]
    && !isLoveSleepMode()
  ) {
    const player = state.players[state.localId];
    const bounds = getBounds();
    const halfW = 24;
    const halfH = 32;
    const move = getMoveDelta();
    const nextX = clamp(player.x + move.dx, halfW, bounds.width - halfW);
    const nextY = clamp(player.y + move.dy, halfH, bounds.height - halfH);

    if (nextX !== player.x || nextY !== player.y) {
      player.x = nextX;
      player.y = nextY;
      renderPlayer(player);
      socket.send(JSON.stringify({ type: "move", x: nextX, y: nextY }));
      moveSfxTicker += 1;
      if (moveSfxTicker % 16 === 0) {
        LoveSfx.footstep();
      }
    }
  }
  requestAnimationFrame(gameLoop);
}

gameLoop();

function setupLoveUiButtons() {
  const focusHang = () => {
    LoveSfx.uiTap();
    const el = document.getElementById("hangInput");
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };
  const focusTree = () => {
    LoveSfx.uiTap();
    if (memoryTree) {
      memoryTree.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  document.getElementById("ltBtnHang")?.addEventListener("click", focusHang);
  document.getElementById("ltBtnTree")?.addEventListener("click", focusTree);
  document.getElementById("btnWriteLove")?.addEventListener("click", focusHang);
  document.getElementById("ltBtnNotifPerm")?.addEventListener("click", () => {
    if (typeof Notification === "undefined") {
      return;
    }
    Notification.requestPermission().then(() => {
      refreshNotifPermButton();
      if (Notification.permission === "granted") {
        showPopupMessage("Notifikasi aktif — kamu akan dapat pemberitahuannya saat tab tidak terbuka.");
      }
    }).catch(() => {
      refreshNotifPermButton();
    });
  });
}

setupLoveUiButtons();
refreshNotifPermButton();

(function setupDailyGiftAndLevelUi() {
  document.getElementById("dailyGiftClose")?.addEventListener("click", () => {
    closeDailyGiftOverlay();
  });
  document.getElementById("dailyGiftOverlay")?.addEventListener("click", (e) => {
    if (e.target && e.target.id === "dailyGiftOverlay") {
      closeDailyGiftOverlay();
    }
  });
  window.addEventListener("keydown", (e) => {
    const gift = document.getElementById("dailyGiftOverlay");
    if (e.key === "Escape" && gift && !gift.classList.contains("is-hidden")) {
      closeDailyGiftOverlay();
    }
  });
})();

buildNightStars();
fillTwilightParticles();
setupHistoryPanel();
setupMusicPanel();
updateWibClock();
updateSkyJakarta();
updateTreeVitalityUi();
updateLoveHud();
let __lastStoryAgeStage = document.body.dataset.ageStage || "";
setInterval(() => {
  syncStoryLoveDay();
  updateWibClock();
  updateSkyJakarta();
  updateTreeVitalityUi();
  const stNow = document.body.dataset.ageStage || "";
  if (stNow !== __lastStoryAgeStage) {
    __lastStoryAgeStage = stNow;
    Object.values(state.players).forEach((p) => {
      if (p.element) {
        renderPlayer(p);
      }
    });
  }
}, 1000);

document.addEventListener("click", () => {
  ensureLoveAudioCtx();
  updateMoodMusicForSky(getCurrentSkyPhase());
}, { once: true });
