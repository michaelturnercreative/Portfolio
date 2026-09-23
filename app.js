(() => {
  const main = document.getElementById("main-content");

  if (!window.siteData) {
    main.innerHTML = `
      <section class="content-error">
        <h1>This content couldn’t load.</h1>
        <p>Please refresh the page or try again later.</p>
      </section>`;
    return;
  }

  const menuButton = document.querySelector(".menu-toggle");
  const siteNav = document.getElementById("site-nav");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.querySelector(".lightbox-close");
  let revealObserver;
  let lastFocusedElement;

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const paragraphsTemplate = (value) => {
    const paragraphs = Array.isArray(value) ? value : String(value).split(/\n\s*\n/);
    return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  };

  const projectLinkTypes = [
    {
      key: "website",
      label: "Website",
      icon: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z"></path>'
    },
    {
      key: "youtube",
      label: "YouTube",
      icon: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"></rect><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"></path>'
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: '<rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle>'
    },
    {
      key: "tiktok",
      label: "TikTok",
      icon: '<path d="M14 4v10.5a4 4 0 1 1-3-3.87"></path><path d="M14 4c.8 2.2 2.5 3.5 5 3.7"></path>'
    },
    {
      key: "twitter",
      label: "X",
      icon: '<path d="m5 4 14 16M19 4 5 20"></path>'
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M8 10v7M8 7v.01M12 17v-7M12 13a3 3 0 0 1 6 0v4"></path>'
    }
  ];

  const projectLinksTemplate = (project) => {
    const links = project.links || {};
    const availableLinks = projectLinkTypes.filter(({ key }) => typeof links[key] === "string" && links[key].trim());
    if (!availableLinks.length) return "";

    return `
      <div class="project-links">
        <div class="project-links-list">
          ${availableLinks.map(({ key, label, icon }) => `
            <a class="project-external-link" href="${escapeHtml(links[key].trim())}" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg>
              <span>${label}</span>
            </a>`).join("")}
        </div>
      </div>`;
  };

  const projectVideoLinksTemplate = (project) => {
    const videos = Array.isArray(project.videoLinks)
      ? project.videoLinks.filter((video) => video?.label?.trim() && video?.url?.trim())
      : [];
    if (!videos.length) return "";

    return `
      <div class="project-video-links">
        <p class="meta-label">Playable examples</p>
        <div class="project-video-links-list">
          ${videos.map((video) => `
            <a class="project-video-link" href="${escapeHtml(video.url.trim())}" target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">▶</span>
              <span>${escapeHtml(video.label.trim())}</span>
            </a>`).join("")}
        </div>
      </div>`;
  };

  const projectLink = (project, className = "") => `
    <article class="project-card reveal ${className}" data-project="${escapeHtml(project.id)}">
      <a class="project-link" href="#project/${project.id}" aria-label="View ${escapeHtml(project.title)} for ${escapeHtml(project.client)}">
        <div class="project-cover fit-${project.coverFit === "contain" ? "contain" : "cover"}">
          <img src="${escapeHtml(project.cover)}" alt="" loading="lazy" decoding="async">
          <span class="view-project" aria-hidden="true">View<br>project</span>
        </div>
        <div class="project-card-meta">
          <span class="project-index">${escapeHtml(project.number)}</span>
          <div>
            <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
            <p class="project-client">${escapeHtml(project.client)} · ${escapeHtml(project.year)}</p>
            <p class="project-card-summary">${escapeHtml(project.summary)}</p>
          </div>
          <p class="project-tags">${project.categories.slice(0, 2).map(escapeHtml).join(" · ")}</p>
        </div>
      </a>
    </article>`;

  const footerTemplate = () => `
    <footer class="site-footer" id="contact">
      <div class="footer-cta">
        <div>
          <span class="footer-label">${escapeHtml(siteData.profile.footerLabel)}</span>
          <h2>${escapeHtml(siteData.profile.footerTitle)}</h2>
          <p class="footer-supporting-line">${escapeHtml(siteData.profile.footerSupportingLine)}</p>
        </div>
        <a class="footer-email" href="mailto:${siteData.profile.email}">${siteData.profile.email}</a>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Michael Turner</span>
        <span>${escapeHtml(siteData.profile.location)}</span>
        <a href="tel:+14253301309">${escapeHtml(siteData.profile.phone)}</a>
      </div>
    </footer>`;

  function renderHome(targetHash = "#home") {
    const categories = ["All", ...new Set(siteData.archive.map((item) => item.category))];
    const tickerItems = siteData.profile.capabilities;
    const featuredProjects = siteData.projects.filter((project) => project.featured !== false);

    main.innerHTML = `
      <div class="page-shell">
        <section class="home-hero" id="home" aria-labelledby="hero-title">
          <div class="hero-primary">
            <p class="eyebrow">${escapeHtml(siteData.profile.eyebrow)}</p>
            <h1 class="hero-title" id="hero-title">${escapeHtml(siteData.profile.heroTitle)}</h1>
            <p class="hero-intro">${escapeHtml(siteData.profile.introduction)}</p>
            <a class="hero-scroll" href="#work">Explore my work</a>
          </div>
          <a class="hero-feature" href="#project/france-luxe-art-direction" aria-label="Explore France Luxe art direction">
            <img src="${escapeHtml(siteData.projects.find(project => project.id === 'france-luxe-art-direction').cover)}" alt="France Luxe tropical editorial portrait in an orange blouse" fetchpriority="high" decoding="async">
            <span>France Luxe · Art direction ↗</span>
          </a>
        </section>

        <div class="capability-ticker" role="region" aria-label="Creative capabilities. Hover or focus to scroll; swipe on touch screens." tabindex="0">
          <div class="ticker-track">
            ${[false, true].map(duplicate => `<div class="ticker-group"${duplicate ? ' aria-hidden="true"' : ''}>${tickerItems.map((item) => `<span class="ticker-item">${escapeHtml(item)}</span>`).join("")}</div>`).join("")}
          </div>
        </div>

        <section class="featured-work section-pad" id="work" aria-labelledby="work-title">
          <div class="section-heading-row reveal">
            <p class="section-kicker">Selected work</p>
            <div><h2 class="section-title" id="work-title">${escapeHtml(siteData.profile.workTitle)}</h2><p class="section-description">${escapeHtml(siteData.profile.workDescription)}</p></div>
          </div>
          <div class="project-grid" id="brand-work">
            ${featuredProjects.map((project) => projectLink(project)).join("")}
          </div>
        </section>

        <section class="stats" aria-label="Creative capabilities">
          ${siteData.profile.focusAreas.map((stat) => `
            <div class="stat reveal">
              <p class="stat-value">${escapeHtml(stat.value)}</p>
              <div><p class="stat-label">${escapeHtml(stat.label)}</p><p class="stat-detail">${escapeHtml(stat.detail)}</p></div>
            </div>`).join("")}
        </section>

        <section class="archive-section section-pad" id="archive" aria-labelledby="archive-title">
          <div class="archive-header reveal">
            <p class="section-kicker">More work</p>
            <div><h2 class="section-title" id="archive-title">${escapeHtml(siteData.profile.archiveTitle)}</h2><p class="section-description">${escapeHtml(siteData.profile.archiveDescription)}</p></div>
          </div>
          <div id="discipline-work">
              <div class="archive-filters" role="group" aria-label="Filter work by specialty">
                ${categories.map((category, index) => `<button class="filter-btn${index === 0 ? " is-active" : ""}" type="button" aria-pressed="${index === 0}" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
              </div>
          <div class="archive-grid">
            ${siteData.archive.map((item) => `
              <article class="archive-card reveal" data-category="${escapeHtml(item.category)}">
                <a href="#project/${escapeHtml(item.project)}">
                  <div class="archive-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)} — ${escapeHtml(item.client)}" loading="lazy" decoding="async"></div>
                  <div class="archive-copy">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p class="archive-meta">${escapeHtml(item.client)} · ${escapeHtml(item.category)}</p>
                  </div>
                </a>
              </article>`).join("")}
          </div>
          </div>
        </section>

        <section class="about-section section-pad" id="about" aria-labelledby="about-title">
          <p class="section-kicker">About</p>
          <div class="about-content">
            <h2 class="about-statement reveal" id="about-title">${escapeHtml(siteData.profile.aboutTitle)}</h2>
            <div class="about-intro reveal">${paragraphsTemplate(siteData.profile.aboutCopy)}</div>
            <p class="section-kicker experience-kicker">Experience</p>
            <div class="experience-list">
              ${siteData.experience.map((item) => `
                <details class="experience-item reveal">
                  <summary class="experience-row">
                    <span class="experience-company">${escapeHtml(item.company)}</span>
                    <span class="experience-role">${escapeHtml(item.role)}</span>
                    <span class="experience-note">${escapeHtml(item.note)}</span>
                    <span class="experience-dates">${escapeHtml(item.dates)}</span>
                    <span class="experience-toggle" aria-hidden="true"></span>
                  </summary>
                  <div class="experience-detail">
                    <p>${escapeHtml(item.detail)}</p>
                    ${item.project ? `<a class="experience-work-link" href="#project/${escapeHtml(item.project)}" aria-label="See my work for ${escapeHtml(item.company)}">See my work</a>` : ""}
                  </div>
                </details>`).join("")}
            </div>
          </div>
        </section>

        ${footerTemplate()}
      </div>`;

    document.title = siteData.profile.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", siteData.profile.metaDescription);
    bindHomeInteractions();
    setupRevealObserver();
    requestAnimationFrame(() => {
      if (targetHash === "#home" || !targetHash) window.scrollTo(0, 0);
      else document.querySelector(targetHash)?.scrollIntoView();
    });
  }

  function renderProject(projectId) {
    const projectIndex = siteData.projects.findIndex((item) => item.id === projectId);
    if (projectIndex < 0) {
      renderHome("#work");
      return;
    }

    const project = siteData.projects[projectIndex];
    const nextProject = siteData.projects[(projectIndex + 1) % siteData.projects.length];

    main.innerHTML = `
      <article class="project-page theme-${escapeHtml(project.theme)}">
        <header class="project-hero">
          <a class="back-link" href="#work">All selected work</a>
          <h1 class="project-hero-title">${escapeHtml(project.title)}</h1>
          <div class="project-hero-meta">
            <div><span class="meta-label">Client</span><p>${escapeHtml(project.client)}</p></div>
            <div><span class="meta-label">Role</span><p>${escapeHtml(project.role)}</p></div>
            <div><span class="meta-label">Period</span><p>${escapeHtml(project.year)}</p></div>
            <div><span class="meta-label">Disciplines</span><p>${project.categories.map(escapeHtml).join(" · ")}</p></div>
            ${projectLinksTemplate(project)}
            ${projectVideoLinksTemplate(project)}
          </div>
        </header>

        <figure class="project-lead-image">
          <img src="${escapeHtml(project.cover)}" alt="${escapeHtml(project.title)} — ${escapeHtml(project.client)}" decoding="async">
          ${project.coverCaption ? `<figcaption>${escapeHtml(project.coverCaption)}</figcaption>` : ""}
        </figure>

        <section class="project-story section-pad" aria-labelledby="project-summary">
          <p class="section-kicker">The project</p>
          <div class="project-story-main">
            <h2 class="project-summary reveal" id="project-summary">${escapeHtml(project.summary)}</h2>
            <div class="story-columns">
              <div class="reveal"><h2>Challenge</h2><p>${escapeHtml(project.challenge)}</p></div>
              <div class="reveal"><h2>Approach</h2>${paragraphsTemplate(project.approach)}</div>
              <div class="reveal">
                <h2>Contribution</h2>
                <ul class="contribution-list">${project.contribution.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              </div>
            </div>
            ${project.results?.length ? `
              <div class="project-results-block reveal">
                <h2 class="project-results-title">${escapeHtml(project.resultsTitle || "Results")}</h2>
                <div class="project-results" aria-label="${escapeHtml(project.resultsTitle || "Results")}">
                  ${project.results.map((result) => `
                    <div class="project-result">
                      <p class="project-result-value">${escapeHtml(result.value)}</p>
                      <p class="project-result-label">${escapeHtml(result.label)}</p>
                    </div>`).join("")}
                </div>
              </div>` : ""}
          </div>
        </section>

        ${project.gallery?.length ? `
          <section class="project-gallery" aria-label="Selected project images">
            ${galleryTemplate(project.gallery)}
          </section>` : ""}

        <a class="next-project" href="#project/${escapeHtml(nextProject.id)}">
          <span class="next-project-label">Next project · ${escapeHtml(nextProject.title)}</span>
          <span class="next-project-title"><span>${escapeHtml(nextProject.title)}</span><span aria-hidden="true">→</span></span>
        </a>
        ${footerTemplate()}
      </article>`;

    document.title = `${project.title} — Michael Turner`;
    bindGalleryInteractions();
    setupRevealObserver();
    window.scrollTo(0, 0);
  }

  function bindHomeInteractions() {
    const filterButtons = [...document.querySelectorAll(".filter-btn")];
    const archiveCards = [...document.querySelectorAll(".archive-card")];

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        filterButtons.forEach((item) => { item.classList.toggle("is-active", item === button); item.setAttribute("aria-pressed", String(item === button)); });
        archiveCards.forEach((card) => {
          card.hidden = filter !== "All" && card.dataset.category !== filter;
        });
      });
    });
  }

  // Keep image order and full-width artwork while giving each pair a shared row.
  function galleryTemplate(images) {
    const rows = [];
    let pair = [];
    const flush = () => {
      if (!pair.length) return;
      rows.push(`<div class="gallery-row">${pair.join("")}</div>`);
      pair = [];
    };
    images.forEach((image, index) => {
      if (image.section !== images[index - 1]?.section) {
        flush();
        if (image.section) rows.push(`<h2 class="gallery-section-title">${escapeHtml(image.section)}</h2>`);
      }
      const item = `<button class="gallery-item ${escapeHtml(image.layout)} reveal" type="button" data-lightbox-src="${escapeHtml(image.src)}" data-lightbox-alt="${escapeHtml(image.alt)}" aria-label="Enlarge: ${escapeHtml(image.alt)}">
        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async">
      </button>`;
      if (image.layout === "wide") {
        flush();
        rows.push(`<div class="gallery-row">${item}</div>`);
      } else {
        pair.push(item);
        if (pair.length === 2) flush();
      }
    });
    flush();
    return rows.join("");
  }

  function bindGalleryInteractions() {
    document.querySelectorAll(".gallery-row").forEach((row) => {
      const images = [...row.querySelectorAll("img")];
      const alignImages = () => {
        if (images.every((image) => image.naturalWidth && image.naturalHeight)) {
          row.style.setProperty("--gallery-columns", images.map((image) =>
            `minmax(0, ${image.naturalWidth / image.naturalHeight}fr)`
          ).join(" "));
        }
      };
      images.forEach((image) => image.addEventListener("load", alignImages, { once: true }));
      alignImages();
    });

    document.querySelectorAll("[data-lightbox-src]").forEach((button) => {
      button.addEventListener("click", () => openLightbox(button));
    });
  }

  function setupRevealObserver() {
    if (revealObserver) revealObserver.disconnect();
    const elements = document.querySelectorAll(".reveal");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    elements.forEach((element) => revealObserver.observe(element));
  }

  function openLightbox(button) {
    lastFocusedElement = button;
    lightboxImage.src = button.dataset.lightboxSrc;
    lightboxImage.alt = button.dataset.lightboxAlt;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.src = "";
    document.body.classList.remove("lightbox-open");
    lastFocusedElement?.focus();
  }

  function route() {
    const hash = window.location.hash || "#home";
    if (hash.startsWith("#project/")) renderProject(hash.slice("#project/".length));
    else renderHome(hash);
    closeMenu();
  }

  function closeMenu() {
    siteNav.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Menu";
  }

  menuButton.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = isOpen ? "Close" : "Menu";
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

  window.addEventListener("hashchange", route);
  route();
})();
