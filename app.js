// ============================
// MiniQuest – XP + Streak + Stats + Presets + Inspiration + Achievements + Sounds
// ============================

const STORAGE_KEY_QUESTS = "miniquest_quests_v1";
const STORAGE_KEY_XP = "miniquest_xp_v1";
const STORAGE_KEY_STREAK = "miniquest_streak_v1";
const STORAGE_KEY_ACH = "miniquest_achievements_v1";

let quests = [];
let totalXp = 0;

let streak = 0;
let lastDate = null;
let todayCount = 0;
let dailyGoal = 3;
let celebratedToday = false;

let currentFilter = "open";
let unlockedAchievementIds = [];

// Preset Daten
const presetQuests = [
  { title: "Küche 5 Minuten aufräumen", category: "home", energy: 2, reward: "kurz am Handy chillen" },
  { title: "Badspiegel & Waschbecken wischen", category: "home", energy: 2, reward: "Glas Wasser trinken" },
  { title: "10 Minuten Bewerbungen / Projekte", category: "work", energy: 3, reward: "kleine Pause auf dem Sofa" },
  { title: "5 Minuten Dehnen", category: "selfcare", energy: 1, reward: "einmal tief durchatmen und nix tun" },
  { title: "Nachricht an Freund:in schicken", category: "social", energy: 1, reward: "ein Meme scrollen" },
  { title: "Schreibtisch kurz freiräumen", category: "home", energy: 2, reward: "Kaffee oder Tee" },
  { title: "10 Minuten Lernen / Lesen", category: "work", energy: 2, reward: "Song hören, den du magst" },
];

const presetRewards = [
  "1 Runde zocken",
  "10 Minuten sinnlos am Handy scrollen",
  "eine Folge einer kurzen Serie",
  "ein gutes Getränk mixen",
  "5 Minuten einfach auf dem Sofa liegen",
  "Musik laut hören und nichts tun",
  "kurz auf den Balkon / ans Fenster und frische Luft",
  "ein kleines süßes Snack-Ding",
];

const inspirationQuests = [
  { title: "10 Minuten Spazieren gehen (ohne Handy)", category: "selfcare", energy: 2, reward: "guten Song unterwegs hören" },
  { title: "Staub wischen auf einer Fläche, die du immer ignorierst", category: "home", energy: 2, reward: "danach kurz chillen" },
  { title: "1 Glas Wasser trinken und kurz strecken", category: "selfcare", energy: 1, reward: "30 Sekunden einfach Augen schließen" },
  { title: "Alle offenen Tabs am Handy/PC durchgehen und aufräumen", category: "work", energy: 3, reward: "kleine YouTube-Pause" },
  { title: "Wäschekorb leeren oder zumindest sortieren", category: "home", energy: 3, reward: "einen Song laut mitsingen" },
  { title: "Nachricht schreiben an jemanden, bei dem du dich lange melden wolltest", category: "social", energy: 3, reward: "kurz Social Media gönnen" },
  { title: "5 Minuten Zimmer/Raum durchlüften und kurz stehen bleiben", category: "selfcare", energy: 1, reward: "Deep Breath Moment" },
];

// Achievements Definition
const ACHIEVEMENTS = [
  {
    id: "first-quest",
    name: "Erste Quest!",
    description: "Du hast deine erste Quest abgeschlossen.",
    check: (view) => view.stats.done >= 1,
    emoji: "🥉",
  },
  {
    id: "five-quests",
    name: "Im Flow",
    description: "5 Quests erledigt.",
    check: (view) => view.stats.done >= 5,
    emoji: "🥈",
  },
  {
    id: "ten-quests",
    name: "Quest Grinder",
    description: "10 Quests erledigt.",
    check: (view) => view.stats.done >= 10,
    emoji: "🏅",
  },
  {
    id: "streak-3",
    name: "Drei am Stück",
    description: "3-Tage-Streak erreicht.",
    check: (view) => view.streak >= 3,
    emoji: "🔥",
  },
  {
    id: "streak-7",
    name: "Eine Woche durchgezogen",
    description: "7 Tage nacheinander aktiv.",
    check: (view) => view.streak >= 7,
    emoji: "⚡",
  },
  {
    id: "level-3",
    name: "Level 3",
    description: "Level 3 erreicht.",
    check: (view) => view.level >= 3,
    emoji: "📈",
  },
  {
    id: "level-5",
    name: "Level 5",
    description: "Level 5 erreicht.",
    check: (view) => view.level >= 5,
    emoji: "💫",
  },
];

// DOM
const titleInput = document.getElementById("quest-title");
const categorySelect = document.getElementById("quest-category");
const energySelect = document.getElementById("quest-energy");
const rewardInput = document.getElementById("quest-reward");
const addQuestBtn = document.getElementById("add-quest-btn");
const formFeedbackEl = document.getElementById("form-feedback");

const presetQuestBtn = document.getElementById("preset-quest-btn");
const presetRewardBtn = document.getElementById("preset-reward-btn");

const todayQuestEl = document.getElementById("today-quest");
const pickQuestBtn = document.getElementById("pick-quest-btn");
const inspireQuestBtn = document.getElementById("inspire-quest-btn");

const questsListEl = document.getElementById("quests-list");
const filterChips = document.querySelectorAll(".filter-chip");

const levelBadgeEl = document.getElementById("level-badge");
const xpBarInnerEl = document.getElementById("xp-bar-inner");
const xpLabelEl = document.getElementById("xp-label");

const streakValueEl = document.getElementById("streak-value");
const dailyGoalLabelEl = document.getElementById("daily-goal-label");
const dailyGoalInputEl = document.getElementById("daily-goal-input");

const statsContentEl = document.getElementById("stats-content");
const achievementsListEl = document.getElementById("achievements-list");

const celebrationEl = document.getElementById("celebration");
const celebrationTextEl = document.getElementById("celebration-text");
const celebrationCloseBtn = document.getElementById("celebration-close-btn");

// ============================
// Helpers: Datum
// ============================

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function isYesterday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toISOString().slice(0, 10) === y.toISOString().slice(0, 10);
}

// ============================
// Sounds (Web Audio)
// ============================

let audioCtx = null;

function playSound(type) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) {
      audioCtx = new AC();
    }
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    let freq = 440;
    let duration = 0.15;

    if (type === "complete") {
      freq = 660;
      duration = 0.13;
    } else if (type === "achievement") {
      freq = 880;
      duration = 0.2;
    } else if (type === "celebration") {
      freq = 523.25; // C5
      duration = 0.25;
    }

    const now = ctx.currentTime;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch (e) {
    // ignore
  }
}

// ============================
// Storage helpers
// ============================

function loadState() {
  try {
    const rawQuests = localStorage.getItem(STORAGE_KEY_QUESTS);
    const rawXp = localStorage.getItem(STORAGE_KEY_XP);
    const rawStreak = localStorage.getItem(STORAGE_KEY_STREAK);
    const rawAch = localStorage.getItem(STORAGE_KEY_ACH);

    quests = rawQuests ? JSON.parse(rawQuests) : [];
    if (!Array.isArray(quests)) quests = [];

    totalXp = rawXp ? Number(rawXp) : 0;
    if (Number.isNaN(totalXp)) totalXp = 0;

    if (rawStreak) {
      const data = JSON.parse(rawStreak);
      streak = Number(data.streak) || 0;
      lastDate = data.lastDate || null;
      todayCount = Number(data.todayCount) || 0;
      dailyGoal = Number(data.dailyGoal) || 3;
      celebratedToday = Boolean(data.celebratedToday);
    } else {
      streak = 0;
      lastDate = null;
      todayCount = 0;
      dailyGoal = 3;
      celebratedToday = false;
    }

    const today = todayString();
    if (lastDate !== today) {
      todayCount = 0;
      celebratedToday = false;
    }

    if (rawAch) {
      unlockedAchievementIds = JSON.parse(rawAch) || [];
      if (!Array.isArray(unlockedAchievementIds)) unlockedAchievementIds = [];
    } else {
      unlockedAchievementIds = [];
    }
  } catch (e) {
    console.error("Fehler beim Laden:", e);
    quests = [];
    totalXp = 0;
    streak = 0;
    lastDate = null;
    todayCount = 0;
    dailyGoal = 3;
    celebratedToday = false;
    unlockedAchievementIds = [];
  }

  if (dailyGoalInputEl) {
    dailyGoalInputEl.value = dailyGoal;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY_QUESTS, JSON.stringify(quests));
  localStorage.setItem(STORAGE_KEY_XP, String(totalXp));
  localStorage.setItem(
    STORAGE_KEY_STREAK,
    JSON.stringify({ streak, lastDate, todayCount, dailyGoal, celebratedToday })
  );
}

function saveAchievements() {
  localStorage.setItem(STORAGE_KEY_ACH, JSON.stringify(unlockedAchievementIds));
}

// ============================
// XP / Level
// ============================

function xpForEnergy(energy) {
  return energy * 15;
}

function getLevelAndProgress(xp) {
  const xpPerLevel = 120;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXp = xp % xpPerLevel;
  const percent = Math.min(100, (currentLevelXp / xpPerLevel) * 100);
  return { level, currentLevelXp, xpPerLevel, percent };
}

function updateLevelUi() {
  const { level, currentLevelXp, xpPerLevel, percent } = getLevelAndProgress(totalXp);

  if (levelBadgeEl) {
    levelBadgeEl.textContent = level;
    levelBadgeEl.classList.remove("level-pop");
    void levelBadgeEl.offsetWidth;
    levelBadgeEl.classList.add("level-pop");
  }

  if (xpBarInnerEl) {
    xpBarInnerEl.style.width = `${percent}%`;
    xpBarInnerEl.classList.remove("xp-bar-anim");
    void xpBarInnerEl.offsetWidth;
    xpBarInnerEl.classList.add("xp-bar-anim");
  }

  if (xpLabelEl) {
    xpLabelEl.textContent = `${currentLevelXp} / ${xpPerLevel} XP`;
  }
}

// ============================
// Streak UI & Logik
// ============================

function updateStreakUi() {
  if (streakValueEl) {
    streakValueEl.textContent = `🔥 Streak: ${streak}`;
  }
  if (dailyGoalLabelEl) {
    const clamped = Math.min(todayCount, dailyGoal);
    dailyGoalLabelEl.textContent = `${clamped} / ${dailyGoal} Quests heute`;
  }
}

function triggerDailyGoalCelebration() {
  if (!celebrationEl || !celebrationTextEl || !streakValueEl) return;

  playSound("celebration");

  const messages = [
    "Du hast dein Tagesziel nicht nur erreicht, du hast es einfach zerlegt.",
    "Daily done. Dein zukünftiges Ich schickt mentale High-Fives.",
    "Dein innerer Schweinehund hat gerade leise „gg“ gesagt.",
    "Tagesziel im Speedrun geschafft. Rest des Tages ist Bonus-Content.",
    "Wenn du so weiter machst, brauchst du bald ein richtiges Level-Up-Menü.",
  ];
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  celebrationTextEl.textContent = randomMsg;

  celebrationEl.classList.add("visible");

  streakValueEl.classList.remove("streak-pop");
  void streakValueEl.offsetWidth;
  streakValueEl.classList.add("streak-pop");
}

function handleQuestCompletedToday() {
  const today = todayString();

  if (!lastDate) {
    streak = 1;
    todayCount = 1;
  } else if (lastDate === today) {
    todayCount += 1;
  } else if (isYesterday(lastDate)) {
    streak += 1;
    todayCount = 1;
  } else {
    streak = 1;
    todayCount = 1;
  }

  lastDate = today;

  if (!celebratedToday && todayCount >= dailyGoal) {
    celebratedToday = true;
    triggerDailyGoalCelebration();
  }
}

// ============================
// Labels
// ============================

function categoryLabel(cat) {
  switch (cat) {
    case "home": return "Home";
    case "work": return "Work/Schule";
    case "selfcare": return "Selfcare";
    case "social": return "Social";
    default: return cat;
  }
}

function energyLabel(e) {
  const n = Number(e);
  const stars = "★".repeat(n) + "☆".repeat(5 - n);
  return `${stars} (${n})`;
}

// ============================
// Stats
// ============================

function computeStats() {
  const total = quests.length;
  const done = quests.filter(q => q.done).length;
  const open = total - done;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const now = Date.now();
  const weekAgo = now - 6 * 24 * 60 * 60 * 1000;

  let weekDone = 0;
  let weekXp = 0;
  const categoryCounts = {
    home: 0,
    work: 0,
    selfcare: 0,
    social: 0,
  };

  quests.forEach(q => {
    if (q.done) {
      if (!q.doneAt) return;
      const t = q.doneAt;
      if (t >= weekAgo) {
        weekDone += 1;
        weekXp += xpForEnergy(q.energy);
      }
      if (categoryCounts[q.category] !== undefined) {
        categoryCounts[q.category] += 1;
      }
    }
  });

  return {
    total,
    done,
    open,
    completionRate,
    weekDone,
    weekXp,
    categoryCounts,
  };
}

function renderStats() {
  if (!statsContentEl) return;
  const s = computeStats();

  statsContentEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-title">Quests insgesamt</div>
      <div class="stat-main">${s.total}</div>
      <div class="stat-sub">${s.done} erledigt · ${s.open} offen</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Abschlussrate</div>
      <div class="stat-main">${s.completionRate}%</div>
      <div class="stat-sub">erledigte Quests von allen</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Letzte 7 Tage</div>
      <div class="stat-main">${s.weekDone} Quests</div>
      <div class="stat-sub">${s.weekXp} XP in dieser Woche</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">nach Kategorie (erledigt)</div>
      <div class="stat-sub">
        Home: ${s.categoryCounts.home} · Work/Schule: ${s.categoryCounts.work}<br>
        Selfcare: ${s.categoryCounts.selfcare} · Social: ${s.categoryCounts.social}
      </div>
    </div>
  `;
}

// ============================
// Achievements
// ============================

function renderAchievementsList() {
  if (!achievementsListEl) return;

  achievementsListEl.innerHTML = "";

  ACHIEVEMENTS.forEach(meta => {
    const unlocked = unlockedAchievementIds.includes(meta.id);

    const card = document.createElement("div");
    card.className = "achievement-card" + (unlocked ? "" : " locked");

    const badge = document.createElement("div");
    badge.className = "achievement-badge " + (unlocked ? "unlocked" : "locked");
    badge.textContent = unlocked ? meta.emoji : "🔒";

    const textWrap = document.createElement("div");
    textWrap.className = "achievement-text";

    const title = document.createElement("div");
    title.className = "achievement-title";
    title.textContent = meta.name;

    const desc = document.createElement("div");
    desc.className = "achievement-desc";
    desc.textContent = meta.description;

    textWrap.appendChild(title);
    textWrap.appendChild(desc);
    card.appendChild(badge);
    card.appendChild(textWrap);
    achievementsListEl.appendChild(card);
  });
}

function showAchievementToast(meta) {
  let toast = document.getElementById("achievement-toast");
  if (toast) {
    toast.remove();
  }
  toast = document.createElement("div");
  toast.id = "achievement-toast";
  toast.className = "achievement-toast";
  toast.innerHTML = `🏅 <strong>${meta.name}</strong><br><span>${meta.description}</span>`;
  document.body.appendChild(toast);

  playSound("achievement");

  setTimeout(() => {
    toast.classList.add("hide");
  }, 2200);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 2700);
}

function checkAchievements(initial = false) {
  const stats = computeStats();
  const level = getLevelAndProgress(totalXp).level;
  const view = { stats, level, streak };

  let changed = false;

  ACHIEVEMENTS.forEach(meta => {
    if (unlockedAchievementIds.includes(meta.id)) return;
    if (meta.check(view)) {
      unlockedAchievementIds.push(meta.id);
      changed = true;
      saveAchievements();
      if (!initial) {
        showAchievementToast(meta);
      }
    }
  });

  if (changed) {
    renderAchievementsList();
  }
}

// ============================
// Render: Quests & Today
// ============================

function renderQuestsList() {
  if (!questsListEl) return;

  questsListEl.innerHTML = "";

  let visible = quests;
  if (currentFilter === "open") {
    visible = quests.filter(q => !q.done);
  } else if (currentFilter === "done") {
    visible = quests.filter(q => q.done);
  }

  if (visible.length === 0) {
    questsListEl.innerHTML = `<p class="hint">Keine Quests in dieser Ansicht. Erstell neue oder ändere den Filter.</p>`;
    return;
  }

  visible.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  visible.forEach(q => {
    const card = document.createElement("div");
    card.className = "quest-card";
    if (q.done) card.classList.add("done");
    if (q.justCompleted) {
      card.classList.add("quest-card-just-completed");
      setTimeout(() => {
        card.classList.remove("quest-card-just-completed");
        q.justCompleted = false;
      }, 400);
    }

    const main = document.createElement("div");
    main.className = "quest-main";

    const title = document.createElement("div");
    title.className = "quest-title";
    title.textContent = q.title;

    const meta = document.createElement("div");
    meta.className = "quest-meta";
    meta.textContent = `${categoryLabel(q.category)} · Energie: ${energyLabel(q.energy)}`
      + (q.reward ? ` · Belohnung: ${q.reward}` : "");

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "quest-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "small-btn " + (q.done ? "undo" : "complete");
    toggleBtn.textContent = q.done ? "wieder offen" : "erledigt";
    toggleBtn.addEventListener("click", () => toggleQuestDone(q.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "small-btn delete";
    deleteBtn.textContent = "löschen";
    deleteBtn.addEventListener("click", () => deleteQuest(q.id));

    actions.appendChild(toggleBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(main);
    card.appendChild(actions);
    questsListEl.appendChild(card);
  });
}

function renderTodayQuest(quest) {
  if (!todayQuestEl) return;

  todayQuestEl.innerHTML = "";

  if (!quest) {
    todayQuestEl.innerHTML = `<p class="placeholder">Momentan ist keine Quest aktiv. Klick auf „Zufällige Quest“ oder erstell neue.</p>`;
    return;
  }

  const title = document.createElement("div");
  title.className = "today-title";
  title.textContent = quest.title;

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";

  const catTag = document.createElement("span");
  catTag.className = "tag";
  catTag.textContent = categoryLabel(quest.category);

  const energyTag = document.createElement("span");
  energyTag.className = "tag";
  energyTag.textContent = `Energie: ${energyLabel(quest.energy)}`;

  tagRow.appendChild(catTag);
  tagRow.appendChild(energyTag);

  todayQuestEl.appendChild(title);
  todayQuestEl.appendChild(tagRow);

  if (quest.reward) {
    const rewardP = document.createElement("div");
    rewardP.className = "today-reward";
    rewardP.textContent = `Belohnung danach: ${quest.reward}`;
    todayQuestEl.appendChild(rewardP);
  }

  const btn = document.createElement("button");
  btn.className = "complete-btn";
  btn.textContent = quest.done ? "Schon erledigt 🎉" : "Quest erledigt ✅";
  btn.disabled = quest.done;

  btn.addEventListener("click", () => {
    if (!quest.done) {
      completeQuest(quest.id, true);
    }
  });

  todayQuestEl.appendChild(btn);
}

function renderInspirationQuest(q) {
  if (!todayQuestEl) return;

  todayQuestEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "today-title";
  title.textContent = q.title;

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";

  const catTag = document.createElement("span");
  catTag.className = "tag";
  catTag.textContent = categoryLabel(q.category);

  const energyTag = document.createElement("span");
  energyTag.className = "tag";
  energyTag.textContent = `Energie: ${energyLabel(q.energy)}`;

  tagRow.appendChild(catTag);
  tagRow.appendChild(energyTag);

  const info = document.createElement("div");
  info.className = "today-reward";
  info.textContent = "Das ist eine vorgeschlagene Motivations-Quest. Du kannst sie ins Formular übernehmen und speichern.";

  const btn = document.createElement("button");
  btn.className = "secondary-btn";
  btn.textContent = "In Formular übernehmen 🔁";
  btn.addEventListener("click", () => {
    if (titleInput) titleInput.value = q.title;
    if (categorySelect) categorySelect.value = q.category;
    if (energySelect) energySelect.value = String(q.energy);
    if (rewardInput && q.reward) rewardInput.value = q.reward;
    if (formFeedbackEl) {
      formFeedbackEl.textContent = "Motivations-Quest ins Formular übernommen. Du kannst sie jetzt speichern.";
      formFeedbackEl.style.color = "#7a6b5b";
    }
  });

  todayQuestEl.appendChild(title);
  todayQuestEl.appendChild(tagRow);
  todayQuestEl.appendChild(info);
  todayQuestEl.appendChild(btn);
}

// ============================
// Quest Actions
// ============================

function addQuest() {
  const title = titleInput.value.trim();
  const category = categorySelect.value;
  const energy = Number(energySelect.value);
  const reward = rewardInput.value.trim();

  if (!title) {
    formFeedbackEl.textContent = "Gib deiner Quest wenigstens einen Titel. 😅";
    formFeedbackEl.style.color = "#e63946";
    return;
  }

  const quest = {
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    title,
    category,
    energy,
    reward,
    createdAt: Date.now(),
    done: false,
    doneAt: null,
    justCompleted: false,
  };

  quests.push(quest);
  saveState();
  renderQuestsList();
  renderStats();
  checkAchievements(true); // noch ohne Toast

  formFeedbackEl.textContent = "Quest gespeichert. +1 Schritt gegen Prokrastination.";
  formFeedbackEl.style.color = "#7a6b5b";

  titleInput.value = "";
  rewardInput.value = "";
}

function toggleQuestDone(id) {
  const quest = quests.find(q => q.id === id);
  if (!quest) return;

  if (quest.done) {
    quest.done = false;
    quest.doneAt = null;
    totalXp = Math.max(0, totalXp - xpForEnergy(quest.energy));
  } else {
    quest.done = true;
    quest.doneAt = Date.now();
    quest.justCompleted = true;
    totalXp += xpForEnergy(quest.energy);
    handleQuestCompletedToday();
    playSound("complete");
  }

  saveState();
  updateLevelUi();
  updateStreakUi();
  renderQuestsList();
  renderStats();
  checkAchievements();
}

function completeQuest(id, fromToday = false) {
  const quest = quests.find(q => q.id === id);
  if (!quest || quest.done) return;

  quest.done = true;
  quest.doneAt = Date.now();
  quest.justCompleted = true;
  totalXp += xpForEnergy(quest.energy);
  handleQuestCompletedToday();
  playSound("complete");

  saveState();
  updateLevelUi();
  updateStreakUi();
  renderQuestsList();
  renderStats();
  checkAchievements();

  if (fromToday) {
    renderTodayQuest(quest);
  }
}

function deleteQuest(id) {
  quests = quests.filter(q => q.id !== id);
  saveState();
  renderQuestsList();
  renderStats();
  renderTodayQuest(null);
  checkAchievements(true);
}

function pickRandomQuest() {
  const openQuests = quests.filter(q => !q.done);
  if (openQuests.length === 0) {
    renderTodayQuest(null);
    return;
  }
  const idx = Math.floor(Math.random() * openQuests.length);
  const quest = openQuests[idx];
  renderTodayQuest(quest);
}

function showInspirationQuest() {
  if (inspirationQuests.length === 0) return;
  const idx = Math.floor(Math.random() * inspirationQuests.length);
  const q = inspirationQuests[idx];
  renderInspirationQuest(q);
}

function fillRandomPresetQuest() {
  if (!presetQuests.length) return;
  const idx = Math.floor(Math.random() * presetQuests.length);
  const p = presetQuests[idx];
  if (titleInput) titleInput.value = p.title;
  if (categorySelect) categorySelect.value = p.category;
  if (energySelect) energySelect.value = String(p.energy);
  if (rewardInput && p.reward) rewardInput.value = p.reward;

  if (formFeedbackEl) {
    formFeedbackEl.textContent = "Alltags-Quest vorgeschlagen – kannst du noch anpassen und dann speichern.";
    formFeedbackEl.style.color = "#7a6b5b";
  }
}

function fillRandomPresetReward() {
  if (!presetRewards.length) return;
  const idx = Math.floor(Math.random() * presetRewards.length);
  const r = presetRewards[idx];
  if (rewardInput) rewardInput.value = r;

  if (formFeedbackEl) {
    formFeedbackEl.textContent = "Belohnungs-Idee gesetzt. Jetzt musst du sie dir nur noch verdienen. 😏";
    formFeedbackEl.style.color = "#7a6b5b";
  }
}

// ============================
// Event Listener
// ============================

if (addQuestBtn) {
  addQuestBtn.addEventListener("click", addQuest);
}

if (pickQuestBtn) {
  pickQuestBtn.addEventListener("click", pickRandomQuest);
}

if (inspireQuestBtn) {
  inspireQuestBtn.addEventListener("click", showInspirationQuest);
}

filterChips.forEach(chip => {
  chip.addEventListener("click", () => {
    const filter = chip.dataset.filter;
    currentFilter = filter;

    filterChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    renderQuestsList();
  });
});

if (dailyGoalInputEl) {
  dailyGoalInputEl.addEventListener("change", () => {
    const v = Number(dailyGoalInputEl.value);
    if (!Number.isFinite(v) || v <= 0) {
      dailyGoal = 1;
    } else if (v > 50) {
      dailyGoal = 50;
    } else {
      dailyGoal = Math.round(v);
    }
    dailyGoalInputEl.value = dailyGoal;
    saveState();
    updateStreakUi();
  });
}

if (presetQuestBtn) {
  presetQuestBtn.addEventListener("click", fillRandomPresetQuest);
}

if (presetRewardBtn) {
  presetRewardBtn.addEventListener("click", fillRandomPresetReward);
}

if (celebrationCloseBtn && celebrationEl) {
  celebrationCloseBtn.addEventListener("click", () => {
    celebrationEl.classList.remove("visible");
  });
  celebrationEl.addEventListener("click", (e) => {
    if (e.target === celebrationEl) {
      celebrationEl.classList.remove("visible");
    }
  });
}

// ============================
// Init
// ============================

function initAll() {
  loadState();
  updateLevelUi();
  updateStreakUi();
  renderQuestsList();
  renderTodayQuest(null);
  renderStats();
  renderAchievementsList();
  checkAchievements(true); // initial, ohne Toast-Spam beim Laden
}

initAll();
