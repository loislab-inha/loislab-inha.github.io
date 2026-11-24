(function () {
  const root = document.documentElement;
  root.classList.add("js");
  const $ = (id) => document.getElementById(id);
  /* 교수 이메일(HTML의 js-mail): 파일에는 @ 없이 나눠 두고 화면에서만 합침(스팸 수집 방지) */
  document.querySelectorAll("a.js-mail").forEach((a) => {
    const addr = `${a.dataset.u}\u0040${a.dataset.d}`;
    a.href = `mailto:${addr}${a.dataset.subject ? `?subject=${a.dataset.subject}` : ""}`;
    if (a.dataset.show) a.textContent = addr;
  });

  /* 이메일은 data.js에 user/domain으로 나눠 두고, 화면에서만 합쳐 보여줌(스팸 수집 방지) */
  const emailLink = (e) => {
    const addr = typeof e === "string" ? e : `${e.user}\u0040${e.domain}`;
    const safe = addr.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    return `<a href="mailto:${safe}">${safe}</a>`;
  };

  /* ---------- language ---------- */
  function getSaved() { try { return localStorage.getItem("lois-lang"); } catch (e) { return null; } }
  function save(l) { try { localStorage.setItem("lois-lang", l); } catch (e) {} }
  const params = new URLSearchParams(location.search);
  // 처음 방문: 브라우저 언어가 한국어면 한글, 그 외(해외 방문자)는 영어로 시작.
  // 주소의 ?lang= 이나 방문자가 직접 고른 언어(저장값)가 있으면 그것을 우선함.
  const browserLang = () => {
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "ko"]);
    return String(langs[0] || "ko").toLowerCase().startsWith("ko") ? "ko" : "en";
  };
  let lang = params.get("lang") || getSaved() || browserLang();
  if (lang !== "ko" && lang !== "en") lang = "ko";
  if (lang !== "ko" && lang !== "en") lang = "ko";

  const baseTitle = document.title;
  const searchBox = $("pub-search");
  function setLang(l) {
    lang = l;
    root.dataset.lang = l;
    root.setAttribute("lang", l);
    const titleEn = document.querySelector('meta[name="title-en"]');
    document.title = l === "en" && titleEn ? titleEn.content : baseTitle;
    if (searchBox) searchBox.placeholder = l === "ko" ? "제목, 저자, 학술지로 검색" : "Search by title, author or journal";
    save(l);
  }
  setLang(lang);
  document.querySelector(".lang-toggle").addEventListener("click", () => setLang(lang === "ko" ? "en" : "ko"));

  /* ---------- mobile menu ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const nav = $("site-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = menuBtn.getAttribute("aria-expanded") !== "true";
      menuBtn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus();
      }
    });
  }

  /* helpers */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const bi = (o) => typeof o === "string" ? esc(o)
    : `<span lang="ko">${esc(o.ko)}</span><span lang="en">${esc(o.en || o.ko)}</span>`;
  const hasPubs = typeof PUBLICATIONS !== "undefined" && PUBLICATIONS.length;
  const user = typeof SCHOLAR_USER !== "undefined" ? SCHOLAR_USER : "";
  const scholarLink = (p) => p.s && user
    ? `https://scholar.google.com/citations?view_op=view_citation&amp;hl=en&amp;user=${esc(user)}&amp;citation_for_view=${esc(user)}:${esc(p.s)}`
    : "";
  const markPI = (a) => esc(a);   // 저자명은 모두 같은 굵기로 표시
  const inTopic = (p, key) => {
    const t = typeof TOPICS !== "undefined" && TOPICS[key];
    if (!t) return false;
    const hay = `${p.t} ${p.v}`.toLowerCase();
    return t.terms.some((x) => hay.includes(x.toLowerCase()));
  };

  /* ---------- projects page ---------- */
  const list = $("project-list");
  if (list && typeof PROJECTS !== "undefined") {
    const moreBtn = $("project-more");
    const LIMIT = 12;
    let filter = "all", expanded = false;
    const renderProjects = () => {
      const items = PROJECTS.filter((p) => filter === "all" || p.type === filter);
      const shown = expanded ? items : items.slice(0, LIMIT);
      list.innerHTML = shown.map((p) => `
        <li class="proj" data-type="${p.type}">
          <span class="proj-year">${esc(p.year)}</span>
          <div>
            <p class="proj-title">${bi({ ko: p.ko, en: p.en })}</p>
            <p class="proj-sponsor">${bi(p.sponsor)}</p>
          </div>
        </li>`).join("");
      moreBtn.hidden = expanded || items.length <= LIMIT;
    };
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => { c.classList.remove("is-on"); c.setAttribute("aria-pressed", "false"); });
        chip.classList.add("is-on"); chip.setAttribute("aria-pressed", "true");
        filter = chip.dataset.filter;
        renderProjects();
      });
    });
    moreBtn.addEventListener("click", () => { expanded = true; renderProjects(); });
    renderProjects();
  }

  /* ---------- people page: students by degree ---------- */
  if ($("students-phd") && typeof MEMBERS !== "undefined") {
    const initials = (m) => {
      const en = (m.name.en || "").trim();
      if (en) return en.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      return (m.name.ko || "").slice(-2);
    };
    // 연구분야·이메일 항목 제목은 내용이 없어도 항상 표시
    const info = (m) => `<dl class="student-info">
            <div><dt>${bi({ ko: "연구분야", en: "Research area" })}</dt><dd>${m.topic ? bi(m.topic) : ""}</dd></div>
            <div><dt>${bi({ ko: "이메일", en: "Email" })}</dt><dd>${m.email ? emailLink(m.email) : ""}</dd></div>
          </dl>`;
    const card = (m) => `
      <li class="student">
        <div class="student-photo">${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name.ko)} / ${esc(m.name.en)}" loading="lazy">` : `<span>${esc(initials(m))}</span>`}</div>
        <div class="student-body">
          <div class="student-head"><p class="student-name">${bi(m.name)}</p>${m.scholar ? `<a class="text-link student-scholar" href="${esc(m.scholar)}" target="_blank" rel="noopener">Google Scholar</a>` : ""}</div>
          <p class="student-role">${bi(m.degree === "phd" ? { ko: "박사과정", en: "Ph.D. student" } : { ko: "석사과정", en: "M.S. student" })}${m.parttime ? `<span class="student-pt">${bi({ ko: "파트타임", en: "Part-time" })}</span>` : ""}${m.since ? `<span class="student-since">${bi({ ko: `${m.since}년 입학`, en: `since ${m.since}` })}</span>` : ""}</p>
          ${m.affiliation ? `<p class="student-aff">${m.affiliationUrl ? `<a href="${esc(m.affiliationUrl)}" target="_blank" rel="noopener">${bi(m.affiliation)}</a>` : bi(m.affiliation)}</p>` : ""}
          ${info(m)}
        </div>
      </li>`;
    ["phd", "ms"].forEach((key) => {
      const list = MEMBERS.filter((m) => m.degree === key);
      $(`students-${key}`).innerHTML = list.map(card).join("");
      $(`students-${key}-empty`).hidden = list.length > 0;
      const c = document.querySelector(`[data-count="${key}"]`);
      if (c) c.textContent = list.length ? String(list.length) : "";
    });
  }

  /* ---------- people page: alumni ---------- */
  const alumniSec = $("alumni");
  if (alumniSec && typeof ALUMNI !== "undefined" && ALUMNI.length) {
    const degreeLabel = (d) => d === "phd" ? "Ph.D." : "M.S.";
    const row = (m) => {
      const links = [
        m.scholar ? `<a class="text-link" href="${esc(m.scholar)}" target="_blank" rel="noopener">Google Scholar</a>` : "",
        m.homepage ? `<a class="text-link" href="${esc(m.homepage)}" target="_blank" rel="noopener">${bi({ ko: "홈페이지", en: "Homepage" })}</a>` : "",
      ].filter(Boolean).join("");
      return `
        <li class="alum">
          <div class="alum-head">
            <p class="alum-name">${bi(m.name)}</p>
            <p class="alum-meta">${degreeLabel(m.degree)}${m.year ? `, ${esc(m.year)}` : ""}${m.parttime ? `<span class="student-pt">${bi({ ko: "파트타임", en: "Part-time" })}</span>` : ""}</p>
            ${links ? `<p class="alum-links">${links}</p>` : ""}
          </div>
          ${m.thesis ? `<p class="alum-thesis">${bi({ ko: "학위논문", en: "Thesis" })} <span class="alum-val">${typeof m.thesis === "string" ? esc(m.thesis) : bi(m.thesis)}</span></p>` : ""}
          ${m.degreeAfter ? `<p class="alum-career">${bi({ ko: "최종학위", en: "Highest Degree" })} ${bi(m.degreeAfter)}</p>` : ""}
          ${m.current ? `<p class="alum-career">${bi({ ko: "현재", en: "Current" })} ${bi(m.current)}</p>` : ""}
          ${m.history ? `<p class="alum-career">${bi({ ko: "경력", en: "Previously" })} ${bi({ ko: m.history.ko.join(" · "), en: m.history.en.join(" · ") })}</p>` : ""}
          ${m.career ? `<p class="alum-career">${bi(m.career)}</p>` : ""}
        </li>`;
    };
    ["phd", "ms"].forEach((key) => {
      const list = ALUMNI.filter((m) => m.degree === key).sort((a, b) => (b.year || 0) - (a.year || 0));
      const group = document.querySelector(`[data-alumni="${key}"]`);
      if (!list.length) { group.hidden = true; return; }
      $(`alumni-${key}`).innerHTML = list.map(row).join("");
      const c = document.querySelector(`[data-alumni-count="${key}"]`);
      if (c) c.textContent = String(list.length);
    });
    alumniSec.hidden = false;
  }

  /* ---------- research page: hide theme link when no publications ---------- */
  if (hasPubs) {
    document.querySelectorAll(".theme[data-topic]").forEach((el) => {
      const n = PUBLICATIONS.filter((p) => inTopic(p, el.dataset.topic)).length;
      const link = el.querySelector(".theme-link");
      if (link && !n) link.remove();
    });
  }

  /* ---------- publications page ---------- */
  const pubWrap = $("pub-wrap");
  if (pubWrap && hasPubs) {
    const out = $("pub-list"), pubMore = $("pub-more"), empty = $("pub-empty");
    const topicBar = $("pub-topic");
    const RECENT_FROM = new Date().getFullYear() - 5;   // 최근 5년치를 먼저 표시
    let topic = params.get("topic");
    if (typeof TOPICS === "undefined" || !TOPICS[topic]) topic = null;
    let showAll = !!topic, query = "";


    const renderTopic = (n) => {
      if (!topic) { topicBar.hidden = true; return; }
      const t = TOPICS[topic];
      topicBar.innerHTML = `<span>${bi({ ko: `연구 분야: ${t.ko}`, en: `Research area: ${t.en}` })}</span>
        <button type="button" class="topic-clear">${bi({ ko: "필터 해제", en: "Clear filter" })}</button>`;
      topicBar.querySelector(".topic-clear").addEventListener("click", () => {
        topic = null; showAll = false;
        history.replaceState(null, "", location.pathname);
        renderPubs();
      });
      topicBar.hidden = false;
    };

    function renderPubs() {
      const q = query.trim().toLowerCase();
      let items = topic ? PUBLICATIONS.filter((p) => inTopic(p, topic)) : PUBLICATIONS;
      const topicCount = items.length;
      items = items.filter((p) =>
        q ? `${p.t} ${p.a} ${p.v} ${p.y}`.toLowerCase().includes(q) : (showAll || p.y >= RECENT_FROM));

      const byYear = new Map();
      items.forEach((p) => { if (!byYear.has(p.y)) byYear.set(p.y, []); byYear.get(p.y).push(p); });
      out.innerHTML = [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([y, ps]) => `
        <li class="pub-year">
          <h2 class="pub-y">${y}</h2>
          <ol class="pub-items">
            ${ps.map((p) => {
              const href = scholarLink(p);
              const title = href ? `<a href="${href}" target="_blank" rel="noopener">${esc(p.t)}</a>` : esc(p.t);
              return `<li class="pub"><p class="pub-t">${title}</p><p class="pub-a">${markPI(p.a)}</p><p class="pub-v">${esc(p.v)}</p></li>`;
            }).join("")}
          </ol>
        </li>`).join("");

      renderTopic(topicCount);
      empty.hidden = items.length > 0;
      pubMore.hidden = !!q || showAll || PUBLICATIONS.every((p) => p.y >= RECENT_FROM);
    }

    searchBox.addEventListener("input", () => { query = searchBox.value; renderPubs(); });
    pubMore.addEventListener("click", () => { showAll = true; renderPubs(); });
    pubWrap.hidden = false;
    renderPubs();
  }

  /* ---------- publications page: tabs + working papers ---------- */
  const tabPub = $("tab-published"), tabWork = $("tab-working");
  if (tabPub && tabWork) {
    const panelPub = $("pub-wrap"), panelWork = $("working-panel");
    const select = (which, focus) => {
      const isWork = which === "working";
      tabPub.setAttribute("aria-selected", String(!isWork)); tabWork.setAttribute("aria-selected", String(isWork));
      tabPub.tabIndex = isWork ? -1 : 0; tabWork.tabIndex = isWork ? 0 : -1;
      panelPub.hidden = isWork; panelWork.hidden = !isWork;
      if (focus) (isWork ? tabWork : tabPub).focus();
      history.replaceState(null, "", isWork ? "#working" : location.pathname + location.search);
    };
    // 논문 제목의 시작 위치를 '진행 중 논문' 탭 글자의 왼쪽 끝에 맞춤 (언어·화면 폭이 바뀌어도 다시 계산)
    const alignTitles = () => {
      const sp = [...tabWork.querySelectorAll("span")].find((x) => x.offsetParent) || tabWork;
      const box = tabWork.closest(".tabs") || tabWork.parentElement;
      const x = Math.round(sp.getBoundingClientRect().left - box.getBoundingClientRect().left);
      if (x > 40) document.documentElement.style.setProperty("--pub-indent", x + "px");
    };
    alignTitles();
    window.addEventListener("resize", alignTitles);
    document.querySelectorAll(".lang-toggle, [data-set-lang]").forEach((b) => b.addEventListener("click", () => setTimeout(alignTitles, 0)));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignTitles);
    tabPub.addEventListener("click", () => select("published"));
    tabWork.addEventListener("click", () => select("working"));
    [tabPub, tabWork].forEach((t) => t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") select(t === tabPub ? "working" : "published", true);
    }));

    if (typeof WORKING_PAPERS !== "undefined") {
      const groups = [
        ["review", { ko: "심사 중", en: "Under review" }],
        ["submitted", { ko: "투고 완료", en: "Submitted" }],
        ["preparation", { ko: "준비 중", en: "In preparation" }],
      ];
      $("wp-groups").innerHTML = groups.map(([key, label]) => {
        const items = WORKING_PAPERS.filter((p) => p.status === key);
        if (!items.length) return "";
        return `<section class="wp-group">
          <h2 class="group-sub">${bi(label)}</h2>
          <ol class="wp-list">${items.map((p) => `
            <li class="wp">
              <p class="pub-t">${esc(p.t)}</p>
              <p class="pub-a">${esc(p.a)}</p>
              ${p.v || p.note ? `<p class="pub-v">${p.v ? esc(p.v) : ""}${p.v && p.note ? " · " : ""}${p.note ? bi(p.note) : ""}</p>` : ""}
            </li>`).join("")}
          </ol>
        </section>`;
      }).join("");
      if (typeof WORKING_PAPERS_ASOF !== "undefined") $("wp-asof").innerHTML = `(${bi(WORKING_PAPERS_ASOF)})`;
    }
    if (location.hash === "#working" && !params.get("topic")) select("working");
  }

  /* ---------- home page ---------- */
  const homePubs = $("home-pubs");
  if (homePubs && hasPubs) {
    homePubs.innerHTML = PUBLICATIONS.slice(0, 4).map((p) => {
      const href = scholarLink(p);
      return `<li><span class="hl-year">${p.y}</span><div>
        <p class="hl-title">${href ? `<a href="${href}" target="_blank" rel="noopener">${esc(p.t)}</a>` : esc(p.t)}</p>
        <p class="hl-meta">${esc(p.v)}</p></div></li>`;
    }).join("");
  }
  const homeProj = $("home-projects");
  if (homeProj && typeof PROJECTS !== "undefined") {
    homeProj.innerHTML = PROJECTS.slice(0, 4).map((p) => `
      <li><span class="hl-year">${esc(p.year)}</span><div>
        <p class="hl-title">${bi({ ko: p.ko, en: p.en })}</p>
        <p class="hl-meta">${bi(p.sponsor)}</p></div></li>`).join("");
  }

  /* ---------- news (home: latest 3, news page: all) ---------- */
  const renderNews = (el, items) => {
    el.innerHTML = items.map((n) => {
      const cat = (typeof NEWS_CATS !== "undefined" && NEWS_CATS[n.cat]) || null;
      const en = n.cat === "paper";   // 논문 소식의 논문 제목(body)은 언어 설정과 관계없이 항상 영어로 표시
      const inner = `
        ${n.img ? `<div class="news-img"><img src="${esc(n.img)}" alt="" loading="lazy"></div>` : ""}
        <div class="news-body">
          <p class="news-meta"><time>${esc(n.date)}</time>${cat ? `<span class="news-cat">${bi(cat)}</span>` : ""}</p>
          <h3 class="news-title">${bi({ ko: n.ko || n.en, en: n.en })}</h3>
          ${n.body ? `<p class="news-text">${en ? esc(n.body.en || n.body) : bi(n.body)}</p>` : ""}
        </div>`;
      return `<li class="news${n.img ? " has-img" : ""}">${n.link ? `<a class="news-link" href="${esc(n.link)}">${inner}</a>` : inner}</li>`;
    }).join("");
  };
  if (typeof NEWS !== "undefined") {
    const homeNews = $("home-news"), newsList = $("news-list");
    if (homeNews) renderNews(homeNews, NEWS.slice(0, 3));
    if (newsList) renderNews(newsList, NEWS);
    // 소식 페이지: 구성원 / 논문 게재 / 프로젝트 / 수상 / 학회·행사로 나누어 표시
    // (분류가 없거나 정해진 분류가 아닌 소식만 학회·행사 아래에 표시)
    const NEWS_KEYS = ["people", "paper", "project", "award", "event"];
    document.querySelectorAll("[data-news-cat]").forEach((ol) => {
      const cat = ol.dataset.newsCat;
      const items = NEWS.filter((n) => n.cat === cat || (cat === "event" && !NEWS_KEYS.includes(n.cat)));
      renderNews(ol, items);
      ol.hidden = items.length === 0;
      const empty = document.querySelector(`[data-news-empty="${cat}"]`);
      if (empty) empty.hidden = items.length > 0;
      const c = document.querySelector(`[data-news-count="${cat}"]`);
      if (c) c.textContent = items.length ? String(items.length) : "";
      const group = ol.closest(".news-group");
      if (group) group.dataset.count = String(items.length);
    });
    // 소식 탭: 전체 / 구성원 / 논문 게재 / 프로젝트 / 수상 / 학회·행사 (전체에서는 소식이 없는 분류를 숨김)
    const newsChips = document.querySelectorAll("[data-news-filter]");
    const showNews = (f) => {
      newsChips.forEach((c) => { const on = c.dataset.newsFilter === f; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on)); });
      document.querySelectorAll(".news-group").forEach((g) => {
        const cat = g.id.replace("news-", "");
        g.hidden = f === "all" ? g.dataset.count === "0" : cat !== f;
        g.classList.toggle("is-single", f !== "all");
      });
    };
    newsChips.forEach((c) => c.addEventListener("click", () => showNews(c.dataset.newsFilter)));
    if (newsChips.length) showNews("all");
  }

  /* ---------- simulation video: autoplay only when visible, respect reduced motion ---------- */
  const vid = $("sim-video");
  if (vid) {
    const btn = document.querySelector(".video-toggle");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let userPaused = reduce;
    const sync = () => btn.setAttribute("aria-pressed", String(vid.paused));
    const tryPlay = () => { const p = vid.play(); if (p && p.catch) p.catch(() => {}); };
    vid.addEventListener("play", sync); vid.addEventListener("pause", sync);
    btn.addEventListener("click", () => {
      if (vid.paused) { userPaused = false; tryPlay(); } else { userPaused = true; vid.pause(); }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting && !userPaused) tryPlay(); else if (!e.isIntersecting) vid.pause();
      }), { threshold: 0.35 }).observe(vid);
    } else if (!userPaused) tryPlay();
    sync();
  }

  const yearEl = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
