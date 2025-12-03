// ============================
// MiniQuest – App Logik
// ============================

const STORAGE_KEY_QUESTS = "miniquest_quests_v1";
const STORAGE_KEY_XP = "miniquest_xp_v1";

let quests = [];
let totalXp = 0;
let currentFilter = "open"; // "open" | "done" | "all"

// DOM
const titleInput = document.getElementById("quest-title");
const categorySelect = document.getElementById("quest-category");
const energySelect = document.getElementById("quest-energy");
const rewardInput = document.getElementById("quest-reward");
const addQuestBtn = document.getElementById("add-quest-btn");
const formFeedbackEl = document.getElementById("form-feedback");

const todayQuestEl = document.getElementById("today-quest");
const pickQuestBtn = document.getElementById("pick-quest-btn");

const questsListEl = document.getElementById("quests-list");
const filterChips = document.querySelectorAll(".filter-chip");

const levelBadgeEl = document.getElementById("level-badge");
const xpBarInnerEl = document.getElementById("xp-bar-inner");
const xpLabelEl = document.getElementById("xp-label");

// ============================
// Storage helpers
// ============================

function loadState() {
  try {
    const rawQuests = localStorage.getItem(STORAGE_KEY_QUESTS);
    const rawXp = localStorage.getItem(STORAGE_KEY_XP);

    quests = rawQuests ? JSON.parse(rawQuests) : [];
    if (!Array.isArray(quests)) quests = [];

    totalXp = rawXp ? Number(rawXp) : 0;
    if (Number.isNaN(totalXp)) totalXp = 0;
  } catch (e) {
    console.error("Fehler beim Laden:", e);
    quests = [];
    totalXp = 0;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY_QUESTS, JSON.stringify(quests));
  localStorage.setItem(STORAGE_KEY_XP, String(totalXp));
}

// ============================
// XP / Level
// ============================

function xpForEnergy(energy) {
  // z.B. 1 -> 15 XP, 5 -> 75 XP
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

  if (levelBadgeEl) levelBadgeEl.textContent = level;
  if (xpBarInnerEl) xpBarInnerEl.style.width = `${percent}%`;
  if (xpLabelEl) xpLabelEl.textContent = `${currentLevelXp} / ${xpPerLevel} XP`;
}

// ============================
// Render Funktionen
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

  // sort: offene zuerst, dann nach Erstellzeit
  visible.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  visible.forEach(q => {
    const card = document.createElement("div");
    card.className = "quest-card";
    if (q.done) card.classList.add("done");

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

  todayQuestEl.appendChild(title);
  todayQuestEl.appendChild(tagRow);
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
    done: false
  };

  quests.push(quest);
  saveState();
  renderQuestsList();

  formFeedbackEl.textContent = "Quest gespeichert. +1 Schritt gegen Prokrastination.";
  formFeedbackEl.style.color = "#7a6b5b";

  titleInput.value = "";
  rewardInput.value = "";
}

function toggleQuestDone(id) {
  const quest = quests.find(q => q.id === id);
  if (!quest) return;

  if (quest.done) {
    // rückgängig – XP abziehen
    quest.done = false;
    totalXp = Math.max(0, totalXp - xpForEnergy(quest.energy));
  } else {
    // erledigen
    quest.done = true;
    totalXp += xpForEnergy(quest.energy);
  }

  saveState();
  updateLevelUi();
  renderQuestsList();

  // wenn das die aktuelle Today-Quest ist, neu zeichnen
  const current = quests.find(q => q.id === id);
  renderTodayQuest(current);
}

function completeQuest(id, fromToday = false) {
  const quest = quests.find(q => q.id === id);
  if (!quest || quest.done) return;
  quest.done = true;

  totalXp += xpForEnergy(quest.energy);
  saveState();
  updateLevelUi();
  renderQuestsList();

  if (fromToday) {
    renderTodayQuest(quest);
  }
}

function deleteQuest(id) {
  quests = quests.filter(q => q.id !== id);
  saveState();
  renderQuestsList();

  // falls das die aktuelle Today-Quest war
  renderTodayQuest(null);
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

// ============================
// Event Listener
// ============================

if (addQuestBtn) {
  addQuestBtn.addEventListener("click", addQuest);
}

if (pickQuestBtn) {
  pickQuestBtn.addEventListener("click", pickRandomQuest);
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

// ============================
// Init
// ============================

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  updateLevelUi();
  renderQuestsList();
  renderTodayQuest(null);
});
