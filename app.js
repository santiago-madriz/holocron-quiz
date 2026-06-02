(function () {
  const QUESTIONS = window.HOLOCRON_QUESTIONS || [];
  const CATEGORIES = window.HOLOCRON_CATEGORIES || {};
  const letters = ["A", "B", "C", "D"];
  const state = {
    index: 0,
    category: "all",
    difficulty: "all",
    answers: loadJson("holocron.answers", {}),
    streak: Number(localStorage.getItem("holocron.streak") || 0),
    bestScore: Number(localStorage.getItem("holocron.bestScore") || 0)
  };

  const els = {
    questionMeta: document.getElementById("questionMeta"),
    questionText: document.getElementById("questionText"),
    scoreValue: document.getElementById("scoreValue"),
    progressValue: document.getElementById("progressValue"),
    streakValue: document.getElementById("streakValue"),
    accuracyValue: document.getElementById("accuracyValue"),
    answeredCount: document.getElementById("answeredCount"),
    answerGrid: document.getElementById("answerGrid"),
    answerTemplate: document.getElementById("answerTemplate"),
    feedbackPanel: document.getElementById("feedbackPanel"),
    feedbackResult: document.getElementById("feedbackResult"),
    feedbackExplanation: document.getElementById("feedbackExplanation"),
    wikiImage: document.getElementById("wikiImage"),
    imageFallback: document.getElementById("imageFallback"),
    wikiSource: document.getElementById("wikiSource"),
    wikiExtract: document.getElementById("wikiExtract"),
    wikiStatus: document.getElementById("wikiStatus"),
    visitorPill: document.getElementById("visitorPill"),
    previousButton: document.getElementById("previousButton"),
    nextButton: document.getElementById("nextButton"),
    resetButton: document.getElementById("resetButton"),
    categoryFilter: document.getElementById("categoryFilter"),
    difficultyFilter: document.getElementById("difficultyFilter"),
    clearFiltersButton: document.getElementById("clearFiltersButton"),
    questionMap: document.getElementById("questionMap"),
    analyticsStatus: document.getElementById("analyticsStatus"),
    monthlyVisits: document.getElementById("monthlyVisits"),
    completedRuns: document.getElementById("completedRuns"),
    bestScore: document.getElementById("bestScore")
  };

  const metrics = initMetrics();
  const gaId = initGoogleAnalytics();
  if (gaId) {
    els.analyticsStatus.textContent = "GA4";
  }

  fillFilters();
  bindEvents();
  render();
  track("quiz_view", { question_count: QUESTIONS.length });

  function filteredQuestions() {
    return QUESTIONS.filter((question) => {
      const categoryOk = state.category === "all" || question.category === state.category;
      const difficultyOk = state.difficulty === "all" || question.difficulty === state.difficulty;
      return categoryOk && difficultyOk;
    });
  }

  function render() {
    const questions = filteredQuestions();
    if (!questions.length) {
      renderEmptyState();
      return;
    }

    state.index = clamp(state.index, 0, questions.length - 1);
    const question = questions[state.index];
    const answer = state.answers[question.id];
    const score = getScore();
    const answered = Object.keys(state.answers).length;
    const accuracy = answered ? Math.round((score / answered) * 100) : 0;

    els.questionMeta.textContent = `${question.categoryLabel} · ${titleCase(question.difficulty)} · ${state.index + 1} of ${questions.length}`;
    els.questionText.textContent = question.prompt;
    els.scoreValue.textContent = score;
    els.progressValue.textContent = `${state.index + 1}/${questions.length}`;
    els.streakValue.textContent = state.streak;
    els.accuracyValue.textContent = `${accuracy}%`;
    els.answeredCount.textContent = `${answered} answered`;
    els.bestScore.textContent = String(state.bestScore);
    els.previousButton.disabled = state.index === 0;
    els.nextButton.textContent = state.index === questions.length - 1 ? "Finish" : "Next";

    renderAnswers(question, answer);
    renderFeedback(question, answer);
    renderQuestionMap(questions);
    loadWikiCard(question);
  }

  function renderEmptyState() {
    els.questionMeta.textContent = "No matching questions";
    els.questionText.textContent = "Adjust the filters to reopen the archive.";
    els.answerGrid.innerHTML = "";
    els.feedbackPanel.hidden = true;
    els.wikiStatus.textContent = "Wiki standby";
    els.wikiExtract.textContent = "No source loaded.";
    els.wikiImage.removeAttribute("src");
    els.wikiImage.classList.remove("is-loaded");
    els.previousButton.disabled = true;
    els.nextButton.disabled = true;
    els.questionMap.innerHTML = "";
  }

  function renderAnswers(question, recorded) {
    els.answerGrid.innerHTML = "";
    question.choices.forEach((choice, choiceIndex) => {
      const node = els.answerTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector(".answer-letter").textContent = letters[choiceIndex];
      node.querySelector(".answer-text").textContent = choice;
      node.disabled = Boolean(recorded);
      node.dataset.choice = String(choiceIndex);
      if (recorded) {
        if (choiceIndex === question.answer) {
          node.classList.add("is-correct");
        } else if (choiceIndex === recorded.choice) {
          node.classList.add("is-wrong");
        }
      }
      node.addEventListener("click", () => answerQuestion(question, choiceIndex));
      els.answerGrid.appendChild(node);
    });
  }

  function renderFeedback(question, recorded) {
    if (!recorded) {
      els.feedbackPanel.hidden = true;
      return;
    }
    els.feedbackPanel.hidden = false;
    els.feedbackResult.textContent = recorded.correct ? "Correct answer" : `Correct answer: ${question.choices[question.answer]}`;
    els.feedbackResult.style.color = recorded.correct ? "var(--green)" : "var(--red)";
    els.feedbackExplanation.textContent = question.explanation;
  }

  function renderQuestionMap(questions) {
    els.questionMap.innerHTML = "";
    questions.forEach((question, index) => {
      const button = document.createElement("button");
      const recorded = state.answers[question.id];
      button.type = "button";
      button.textContent = String(index + 1);
      button.setAttribute("aria-label", `Go to question ${index + 1}`);
      if (index === state.index) button.classList.add("is-current");
      if (recorded?.correct) button.classList.add("is-correct");
      if (recorded && !recorded.correct) button.classList.add("is-wrong");
      button.addEventListener("click", () => {
        state.index = index;
        render();
      });
      els.questionMap.appendChild(button);
    });
  }

  function answerQuestion(question, choice) {
    if (state.answers[question.id]) return;
    const correct = choice === question.answer;
    state.answers[question.id] = { choice, correct, answeredAt: new Date().toISOString() };
    state.streak = correct ? state.streak + 1 : 0;
    const score = getScore();
    if (score > state.bestScore) {
      state.bestScore = score;
      localStorage.setItem("holocron.bestScore", String(score));
    }
    persistAnswers();
    track("question_answered", {
      question_id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      correct
    });
    if (Object.keys(state.answers).length === QUESTIONS.length) {
      metrics.completedRuns += 1;
      localStorage.setItem("holocron.completedRuns", String(metrics.completedRuns));
      track("quiz_completed", { score, question_count: QUESTIONS.length });
    }
    render();
  }

  async function loadWikiCard(question) {
    els.wikiStatus.textContent = "Wiki loading";
    els.wikiImage.classList.remove("is-loaded");
    els.wikiImage.alt = "";
    els.imageFallback.hidden = false;
    els.wikiExtract.textContent = "Loading source note...";
    els.wikiSource.href = wikiPageUrl(question.wikiTitle);
    els.wikiSource.textContent = `Source: ${question.wikiTitle}`;

    const data = await getWikiData(question.wikiTitle);
    if (!data || filteredQuestions()[state.index]?.id !== question.id) return;

    els.wikiSource.href = data.url || wikiPageUrl(question.wikiTitle);
    els.wikiSource.textContent = `Source: ${data.title || question.wikiTitle}`;
    els.wikiExtract.textContent = data.extract || "Wookieepedia source loaded for this quiz item.";
    if (data.image) {
      els.wikiImage.onload = () => {
        els.wikiImage.classList.add("is-loaded");
        els.imageFallback.hidden = true;
      };
      els.wikiImage.onerror = () => {
        els.wikiImage.classList.remove("is-loaded");
        els.imageFallback.hidden = false;
      };
      els.wikiImage.alt = `${data.title || question.wikiTitle} image from Wookieepedia`;
      els.wikiImage.src = data.image;
      els.wikiStatus.textContent = "Wiki image loaded";
    } else {
      els.wikiImage.removeAttribute("src");
      els.wikiStatus.textContent = "Wiki source loaded";
    }
  }

  async function getWikiData(title) {
    const key = `holocron.wiki.${title}`;
    const cached = loadJson(key, null);
    if (cached && Date.now() - cached.savedAt < 1000 * 60 * 60 * 24 * 14) {
      return cached.value;
    }

    const params = new URLSearchParams({
      action: "query",
      prop: "pageimages|extracts|info",
      titles: title,
      redirects: "1",
      piprop: "thumbnail|original",
      pithumbsize: "960",
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      inprop: "url",
      format: "json",
      formatversion: "2",
      origin: "*"
    });

    try {
      const response = await fetch(`https://starwars.fandom.com/api.php?${params.toString()}`);
      if (!response.ok) throw new Error(`Wiki HTTP ${response.status}`);
      const payload = await response.json();
      const page = payload?.query?.pages?.[0];
      const value = {
        title: page?.title || title,
        url: page?.fullurl || wikiPageUrl(title),
        image: page?.thumbnail?.source || page?.original?.source || "",
        extract: page?.extract || ""
      };
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
      return value;
    } catch (error) {
      els.wikiStatus.textContent = "Wiki unavailable";
      return {
        title,
        url: wikiPageUrl(title),
        image: "",
        extract: "The Wookieepedia source link is ready, but the image request did not complete in this browser."
      };
    }
  }

  function fillFilters() {
    const option = document.createElement("option");
    option.value = "all";
    option.textContent = "All categories";
    els.categoryFilter.appendChild(option);
    Object.entries(CATEGORIES).forEach(([value, label]) => {
      const categoryOption = document.createElement("option");
      categoryOption.value = value;
      categoryOption.textContent = label;
      els.categoryFilter.appendChild(categoryOption);
    });
  }

  function bindEvents() {
    els.previousButton.addEventListener("click", () => {
      state.index = Math.max(0, state.index - 1);
      render();
    });
    els.nextButton.addEventListener("click", () => {
      const questions = filteredQuestions();
      if (state.index === questions.length - 1) {
        const unanswered = questions.findIndex((question) => !state.answers[question.id]);
        state.index = unanswered >= 0 ? unanswered : 0;
      } else {
        state.index += 1;
      }
      render();
    });
    els.resetButton.addEventListener("click", () => {
      state.answers = {};
      state.streak = 0;
      persistAnswers();
      render();
      track("quiz_reset", {});
    });
    els.categoryFilter.addEventListener("change", () => {
      state.category = els.categoryFilter.value;
      state.index = 0;
      render();
    });
    els.difficultyFilter.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-difficulty]");
      if (!button) return;
      state.difficulty = button.dataset.difficulty;
      els.difficultyFilter.querySelectorAll("button").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      state.index = 0;
      render();
    });
    els.clearFiltersButton.addEventListener("click", () => {
      state.category = "all";
      state.difficulty = "all";
      els.categoryFilter.value = "all";
      els.difficultyFilter.querySelectorAll("button").forEach((item) => {
        item.setAttribute("aria-pressed", String(item.dataset.difficulty === "all"));
      });
      state.index = 0;
      render();
    });
  }

  function initMetrics() {
    const monthKey = new Date().toISOString().slice(0, 7);
    const dayKey = new Date().toISOString().slice(0, 10);
    const stored = loadJson("holocron.metrics", {});
    if (stored.month !== monthKey) {
      stored.month = monthKey;
      stored.monthlyVisits = 0;
      stored.lastVisitDay = "";
    }
    if (stored.lastVisitDay !== dayKey) {
      stored.monthlyVisits = Number(stored.monthlyVisits || 0) + 1;
      stored.lastVisitDay = dayKey;
    }
    stored.completedRuns = Number(localStorage.getItem("holocron.completedRuns") || 0);
    localStorage.setItem("holocron.metrics", JSON.stringify(stored));
    els.monthlyVisits.textContent = String(stored.monthlyVisits);
    els.completedRuns.textContent = String(stored.completedRuns);
    els.visitorPill.textContent = `Monthly visits: ${stored.monthlyVisits}`;
    return stored;
  }

  function initGoogleAnalytics() {
    const queryId = new URLSearchParams(window.location.search).get("ga");
    const configuredId = window.HOLOCRON_CONFIG?.gaMeasurementId || "";
    const storedId = localStorage.getItem("holocron.gaMeasurementId") || "";
    const id = sanitizeGaId(queryId || configuredId || storedId);
    if (!id) return "";
    localStorage.setItem("holocron.gaMeasurementId", id);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: true,
      page_title: "Holocron Quiz"
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
    return id;
  }

  function track(name, params) {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  }

  function sanitizeGaId(value) {
    const id = String(value || "").trim().toUpperCase();
    return /^G-[A-Z0-9]{4,}$/.test(id) ? id : "";
  }

  function getScore() {
    return Object.values(state.answers).filter((answer) => answer.correct).length;
  }

  function persistAnswers() {
    localStorage.setItem("holocron.answers", JSON.stringify(state.answers));
    localStorage.setItem("holocron.streak", String(state.streak));
  }

  function loadJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function wikiPageUrl(title) {
    return `https://starwars.fandom.com/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function titleCase(value) {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  }
})();
