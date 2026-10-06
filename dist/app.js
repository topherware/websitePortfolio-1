import { cleanUrl, loadContent } from "./cms.js";
import { updateFavicon } from "./branding.js";

const app = document.querySelector("#app");
let activeLanguage = "en";
let currentContent = null;
let currentPageIsDetail = false;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const safe = (value) => escapeHtml(value || "");
const safeUrl = (value) => escapeHtml(cleanUrl(value) || "");
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const isPublished = (item) => (item.status || "published").toLowerCase() === "published";

const uiText = {
  en: {
    viewMore: "View more", showMore: "Show more", showAll: "Show all", showLess: "Show less",
    iAm: "I am", projectHighlight: "Project highlight", highlightTitle: "Three projects,<br /><span class=\"accent\">one clear focus</span>", highlightCopy: "A quick look at the work that best represents my approach to product thinking, interaction, and visual craft.", experienceTitle: "My <span class=\"accent\">work experience</span>", selectedPortfolio: "Selected portfolio", projectsTitle: "Work built for<br /><span class=\"accent\">real outcomes</span>", projectsCopy: "A focused selection of product systems, interfaces, and digital experiences shaped around clarity and measurable value.", caseStudy: "Case study", viewProject: "View project", professionalDevelopment: "Professional development", collaborationNotes: "Collaboration notes", openConversation: "Open for conversation", navigation: "Navigation", contact: "Contact", preferEmail: "Prefer email?", present: "Present", visitProject: "Visit project", challenge: "The challenge", descriptionLabel: "Project description", storyEyebrow: "Case study notes", storyTitle: "Description & challenge", backPortfolio: "Back to portfolio", projectNotFound: "Project not found", projectUnavailable: "This project is unavailable or has not been published.",
  },
  id: {
    viewMore: "Lihat lebih banyak", showMore: "Tampilkan lebih banyak", showAll: "Tampilkan semua", showLess: "Tampilkan lebih sedikit",
    iAm: "Saya", projectHighlight: "Sorotan proyek", highlightTitle: "Tiga proyek,<br /><span class=\"accent\">satu fokus jelas</span>", highlightCopy: "Pilihan karya yang paling mewakili pendekatan saya terhadap pemikiran produk, interaksi, dan visual.", experienceTitle: "Pengalaman <span class=\"accent\">kerja saya</span>", selectedPortfolio: "Portofolio pilihan", projectsTitle: "Karya untuk<br /><span class=\"accent\">hasil nyata</span>", projectsCopy: "Pilihan sistem produk, antarmuka, dan pengalaman digital yang dibangun untuk kejelasan dan nilai yang terukur.", caseStudy: "Studi kasus", viewProject: "Lihat proyek", professionalDevelopment: "Pengembangan profesional", collaborationNotes: "Catatan kolaborasi", openConversation: "Terbuka untuk berdiskusi", navigation: "Navigasi", contact: "Kontak", preferEmail: "Lebih suka email?", present: "Sekarang", visitProject: "Kunjungi proyek", challenge: "Tantangan", descriptionLabel: "Deskripsi proyek", storyEyebrow: "Catatan studi kasus", storyTitle: "Deskripsi & tantangan", backPortfolio: "Kembali ke portofolio", projectNotFound: "Proyek tidak ditemukan", projectUnavailable: "Proyek ini tidak tersedia atau belum dipublikasikan.",
  },
};

function translated(object, key) {
  if (activeLanguage === "id" && object?.[`${key}Id`]) return object[`${key}Id`];
  return object?.[key] || "";
}

function text(key) {
  return uiText[activeLanguage]?.[key] || uiText.en[key] || key;
}

function categoryLabel(content, scope, category) {
  if (activeLanguage !== "id") return category;
  return content.categoryTranslations?.[scope]?.[category] || category;
}

function imageOrFallback(url, alt, className = "") {
  const src = cleanUrl(url);
  return src ? `<img class="${safe(className)}" src="${safeUrl(src)}" alt="${safe(alt)}" />` : "";
}

function iconArrow() {
  return '<span class="arrow" aria-hidden="true">&#8599;</span>';
}

function socialIcon(platform = "") {
  const icons = {
    linkedin: '<path fill="currentColor" d="M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3v12h-3V9Zm6 0h3v1.6c.6-1.1 1.8-1.9 3.5-1.9 3.1 0 4.5 1.8 4.5 5.2V21h-3v-6.4c0-1.9-.6-3-2.2-3-1.7 0-2.8 1.2-2.8 3.3V21h-3V9Z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
    whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.7 7.4L3 21l1.7-4.9a8.5 8.5 0 1 1 15.8-4.4Z"/><path d="m8 7 1.5 3-1 1c1 2 2.5 3.5 4.5 4.5l1-1 3 1.5c0 1.5-1.1 2.3-2.5 2-4.5-1-8-4.5-9-9C5.2 7.6 6.5 7 8 7Z" transform="translate(1 -1) scale(.9)"/>',
    facebook: '<path fill="currentColor" stroke="none" d="M14 22v-9h3l.5-4H14V7c0-1.2.3-2 2-2h2V1.5A24 24 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9Z"/>',
    x: '<path d="m4 3 16 18h-4L4 3h4l12 18M20 3 4 21"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path fill="currentColor" stroke="none" d="m10 8 6 4-6 4Z"/>',
    telegram: '<path d="m21 3-4 18-6-5-4 3 1-7 13-9-18 7 5 2M11 16l10-13"/>',
    github: '<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-3.2 19.5v-2.3c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1-1.4-1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.8.9.1-.6.3-1.1.6-1.4-2.2-.3-4.5-1.1-4.5-5a3.8 3.8 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.7 0 0 .9-.3 2.8 1a9.7 9.7 0 0 1 5.1 0c2-1.3 2.8-1 2.8-1 .6 1.4.2 2.4.1 2.7a3.8 3.8 0 0 1 1 2.7c0 3.9-2.3 4.7-4.5 5 .4.4.7 1 .7 2v3A10 10 0 0 0 12 2Z"/>',
  };
  const key = platform.toLowerCase().replace(/[^a-z]/g, "");
  const icon = icons[key === "twitter" ? "x" : key] || '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>';
  return `<svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icon}</svg>`;
}

function renderListToggle(target, label) {
  return `<div class="list-actions"><button class="button button--outline list-toggle" type="button" data-list-toggle="${target}" data-expand-label="${label}" aria-controls="${target}-list" aria-expanded="false" hidden><span>${safe(text(label))}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>`;
}

function accentLastWord(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const last = words.pop();
  return `${safe(words.join(" "))}${words.length ? " " : ""}<span class="accent">${safe(last)}</span>`;
}

function formatMonth(value) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return safe(value);
  return new Intl.DateTimeFormat(activeLanguage === "id" ? "id-ID" : "en", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function sortExperiences(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.current) !== Boolean(b.current)) return a.current ? -1 : 1;
    const endA = a.current ? "9999-12" : a.endMonth || "0000-00";
    const endB = b.current ? "9999-12" : b.endMonth || "0000-00";
    if (endA !== endB) return endB.localeCompare(endA);
    return (b.startMonth || "").localeCompare(a.startMonth || "");
  });
}

function renderBrand(site) {
  const logo = cleanUrl(site.logoUrl)
    ? `<span class="brand-mark">${imageOrFallback(site.logoUrl, `${site.name} logo`)}</span>`
    : `<span class="brand-mark">${safe(initials(site.name) || "P")}</span>`;
  return `<a class="brand" href="index.html#home" aria-label="${safe(site.name)} home">${logo}<span>${safe(site.name)}</span></a>`;
}

function renderHeader(site, detail = false) {
  const navigation = Array.isArray(site.navigation) ? site.navigation : [];
  const normalized = navigation.map((item) => ({
    ...item,
    href: detail && String(item.href || "").startsWith("#") ? `index.html${item.href}` : item.href,
  }));
  const midpoint = Math.ceil(normalized.length / 2);
  const links = (items, offset = 0) => items.map((item, index) => `<li><a class="nav-link${!detail && offset + index === 0 ? " active" : ""}" href="${safeUrl(item.href) || "#"}">${safe(translated(item, "label"))}</a></li>`).join("");
  const languageSwitch = site.languages?.enabled ? `<div class="language-switch language-switch--${activeLanguage}" role="group" aria-label="Language"><span class="language-switch-thumb" aria-hidden="true"></span><button type="button" data-language="id" class="${activeLanguage === "id" ? "active" : ""}" aria-pressed="${activeLanguage === "id"}">ID</button><button type="button" data-language="en" class="${activeLanguage === "en" ? "active" : ""}" aria-pressed="${activeLanguage === "en"}">EN</button></div>` : "";
  return `
    <header class="site-header">
      <nav class="nav-shell" aria-label="Primary navigation">
        <ul class="nav-list">${links(normalized.slice(0, midpoint), 0)}</ul>
        ${renderBrand(site)}
        <div class="nav-right"><ul class="nav-list">${links(normalized.slice(midpoint), midpoint)}</ul></div>
        <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false">&#9776;</button>
      </nav>
      ${languageSwitch}
    </header>`;
}

function renderHero(content) {
  const { home } = content;
  const portrait = cleanUrl(home.portraitUrl)
    ? imageOrFallback(home.portraitUrl, `${home.name}, ${translated(home, "role")}`, "portrait-image")
    : '<div class="portrait-placeholder" aria-label="Portrait placeholder"></div>';
  const portfolioHref = content.projects.some(isPublished) ? "#projects" : "#contact";
  const cv = cleanUrl(home.cvUrl);
  return `
    <section class="hero" id="home">
      <div class="hello-pill">${safe(translated(home, "greeting"))}</div>
      <h1 class="hero-heading">${safe(text("iAm"))} <span class="name">${safe(home.name)}</span>,<br />${safe(translated(home, "role"))}</h1>
      <div class="hero-grid">
        <div class="hero-quote reveal"><span class="quote-mark">&ldquo;</span>${safe(translated(home, "quote"))}</div>
        <div class="portrait-stage reveal">
          ${portrait}
          <div class="hero-actions">
            <a href="${portfolioHref}">${safe(translated(home, "primaryCtaLabel"))} ${iconArrow()}</a>
            <a href="${cv ? safeUrl(cv) : "#contact"}"${cv ? ' target="_blank" rel="noopener"' : ""}>${safe(translated(home, "cvLabel"))}</a>
          </div>
        </div>
        <div class="hero-rating reveal">
          <div class="stars" aria-label="Five star client rating">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <strong>${safe(home.stats?.[0]?.value || "")}</strong>
          <span>${safe(translated(home.stats?.[0], "label"))}</span>
        </div>
      </div>
    </section>`;
}

function renderHighlight(content) {
  const projects = (content.projects || []).filter(isPublished).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const selected = projects.filter((project) => project.highlighted).slice(0, 3);
  const highlights = (selected.length ? selected : projects).slice(0, 3);
  if (!highlights.length) return '<section class="project-highlight" id="highlight"><div class="container"><div class="empty-state">Highlighted projects will appear after a project is published.</div></div></section>';
  const cards = highlights.map((project, index) => `
    <article class="highlight-card reveal">
      <a class="highlight-card-image" href="project.html?slug=${encodeURIComponent(project.slug)}" aria-label="${safe(text("viewProject"))} ${safe(translated(project, "title"))}">
        ${imageOrFallback(project.thumbnail || project.mainImage, translated(project, "title"))}
        <span class="highlight-number">0${index + 1}</span>
        <span class="icon-button">${iconArrow()}</span>
      </a>
      <div class="highlight-card-body">
        <span>${safe(categoryLabel(content, "project", project.category))}</span>
        <h3><a href="project.html?slug=${encodeURIComponent(project.slug)}">${safe(translated(project, "title"))}</a></h3>
        <p>${safe(translated(project, "description"))}</p>
      </div>
    </article>`).join("");
  return `
    <section class="project-highlight" id="highlight">
      <div class="container">
        <div class="section-heading-row reveal">
          <div><p class="eyebrow">${safe(text("projectHighlight"))}</p><h2 class="section-title">${text("highlightTitle")}</h2></div>
          <p class="section-copy">${safe(text("highlightCopy"))}</p>
        </div>
        <div class="highlight-card-grid">${cards}</div>
      </div>
    </section>`;
}

function renderExperience(content) {
  const items = sortExperiences((content.experiences || []).filter(isPublished));
  const categories = [...new Set([...(content.experienceCategories || []), ...items.map((item) => item.category)])].filter((category) => category && category.toLowerCase() !== "all");
  const defaultCategory = categories.find((category) => category.toLowerCase() === "work") || categories[0];
  const timeline = items.map((item) => `
    <article class="timeline-item reveal" data-category="${safe(item.category)}">
      <div class="timeline-company">
        <h3>${safe(item.organization)}</h3>
        <p>${formatMonth(item.startMonth)} - ${item.current ? safe(text("present")) : formatMonth(item.endMonth)}</p>
      </div>
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-role">
        <h3>${safe(translated(item, "title"))}</h3>
        <div class="timeline-descriptions">${(activeLanguage === "id" && item.descriptionsId?.length ? item.descriptionsId : item.descriptions?.length ? item.descriptions : [item.description]).filter(Boolean).map((description) => `<p>${safe(description)}</p>`).join("")}</div>
        <div class="skill-list">${(item.skills || []).map((skill) => `<span>${safe(skill)}</span>`).join("")}</div>
      </div>
    </article>`).join("");
  return `
    <section class="experience" id="experience">
      <div class="container">
        <h2 class="section-title reveal">${text("experienceTitle")}</h2>
        <div class="filter-row" data-filter-target="experience">
          ${categories.map((category) => `<button class="filter-button${category === defaultCategory ? " active" : ""}" type="button" data-filter="${safe(category)}" aria-pressed="${category === defaultCategory}">${safe(categoryLabel(content, "experience", category))}</button>`).join("")}
        </div>
        <div class="timeline" id="experience-list" data-list-limit="2">${timeline || '<div class="empty-state">Experience entries will appear here when published.</div>'}</div>
        ${renderListToggle("experience", "viewMore")}
      </div>
    </section>`;
}

function renderAbout(content) {
  const { about, home } = content;
  const photoUrl = about.photoUrl || content.experiencePhotoUrl || home.portraitUrl;
  const photo = cleanUrl(photoUrl)
    ? imageOrFallback(photoUrl, translated(about, "title"))
    : '<div class="about-placeholder" aria-label="About portrait placeholder"></div>';
  const stats = (home.stats || []).slice(1, 3).map((stat) => `<div class="about-stat"><strong>${safe(stat.value)}</strong><span>${safe(translated(stat, "label"))}</span></div>`).join("");
  return `
    <section class="about" id="about">
      <div class="about-grid">
        <div class="about-visual reveal">${photo}</div>
        <div class="about-copy reveal">
          <p class="eyebrow">${safe(translated(about, "subtitle"))}</p>
          <h2 class="section-title">${accentLastWord(translated(about, "title") || "About me")}</h2>
          ${(activeLanguage === "id" && about.paragraphsId?.length ? about.paragraphsId : about.paragraphs || []).map((paragraph) => `<p>${safe(paragraph)}</p>`).join("")}
          <div class="about-stats">${stats}</div>
          <a class="button button--outline" href="${safeUrl(about.buttonHref) || "#experience"}">${safe(translated(about, "buttonLabel"))}</a>
        </div>
      </div>
    </section>`;
}

function renderProjects(content) {
  const projects = (content.projects || []).filter(isPublished).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const categories = content.projectCategories || ["All"];
  const cards = projects.map((project, index) => `
    <article class="project-card reveal" data-category="${safe(project.category)}">
      <a class="project-image" href="project.html?slug=${encodeURIComponent(project.slug)}" aria-label="${safe(text("viewProject"))} ${safe(translated(project, "title"))}">
        ${imageOrFallback(project.thumbnail || project.mainImage, translated(project, "title"))}
        <span class="project-index">0${index + 1}</span>
        <span class="icon-button">${iconArrow()}</span>
      </a>
      <div class="project-body">
        <div class="project-meta"><span>${safe(categoryLabel(content, "project", project.category))}</span><span>${safe(text("caseStudy"))}</span></div>
        <h3><a href="project.html?slug=${encodeURIComponent(project.slug)}">${safe(translated(project, "title"))}</a></h3>
        <p>${safe(translated(project, "description"))}</p>
        <a class="project-text-link" href="project.html?slug=${encodeURIComponent(project.slug)}">${safe(text("viewProject"))} ${iconArrow()}</a>
      </div>
    </article>`).join("");
  return `
    <section class="projects" id="projects">
      <div class="container">
        <div class="section-heading-row reveal">
          <div><p class="eyebrow">${safe(text("selectedPortfolio"))}</p><h2 class="section-title">${text("projectsTitle")}</h2></div>
          <p class="section-copy">${safe(text("projectsCopy"))}</p>
        </div>
        <div class="filter-row" data-filter-target="projects">
          ${categories.map((category, index) => `<button class="filter-button${index === 0 ? " active" : ""}" type="button" data-filter="${safe(category)}">${safe(categoryLabel(content, "project", category))}</button>`).join("")}
        </div>
        <div class="project-grid" id="projects-list" data-list-limit="3">${cards || '<div class="empty-state">Projects will appear here when published.</div>'}</div>
        ${renderListToggle("projects", "showAll")}
      </div>
    </section>`;
}

function renderCertificates(content) {
  const certificates = (content.certificates || []).filter(isPublished).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return `
    <section class="certificates" id="certificates">
      <div class="container">
        <p class="eyebrow reveal">${safe(text("professionalDevelopment"))}</p>
        <h2 class="section-title reveal">${safe(translated(content, "certificateTitle"))}</h2>
        <p class="section-copy reveal">${safe(translated(content, "certificateSubtitle"))}</p>
        <div class="certificate-grid" id="certificates-list" data-list-limit="3">
          ${certificates.map((certificate) => `<article class="certificate-card reveal"><div class="certificate-image">${imageOrFallback(certificate.imageUrl, translated(certificate, "title"))}</div><div class="certificate-body"><p class="certificate-category">${safe(translated(certificate, "category"))}</p><h3>${safe(translated(certificate, "title"))}</h3><div class="certificate-meta"><span>${safe(certificate.issuer || "Issuer not set")}</span><span>${safe(certificate.year || "Year not set")}</span></div></div></article>`).join("") || '<div class="empty-state">Certificates will appear here when published.</div>'}
        </div>
        ${renderListToggle("certificates", "showMore")}
      </div>
    </section>`;
}

function renderTestimonials(content) {
  const testimonials = (content.testimonials || []).filter(isPublished).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const cards = testimonials.map((testimonial) => `
    <article class="testimonial-card reveal">
      <blockquote>${safe(translated(testimonial, "quote"))}</blockquote>
      <div class="feedback-source"><strong>${safe(testimonial.name || "Collaborator")}</strong><span>${safe(translated(testimonial, "context"))}</span></div>
    </article>`).join("");
  return `
    <section class="testimonials" id="testimonials">
      <div class="container">
        <p class="eyebrow reveal">${safe(text("collaborationNotes"))}</p>
        <h2 class="section-title reveal">${accentLastWord(translated(content, "testimonialTitle") || "What they say about me")}</h2>
        <p class="section-copy reveal">${safe(translated(content, "testimonialSubtitle"))}</p>
        <div class="testimonial-grid">${cards || '<div class="empty-state">Feedback will appear here when published.</div>'}</div>
      </div>
    </section>`;
}

function renderMarquee(content) {
  const runningText = translated(content.site, "runningText").trim();
  if (!runningText) return "";
  const repeatedText = safe(runningText);
  return `<div class="marquee marquee--final" aria-hidden="true"><div class="marquee-track"><span>${repeatedText}</span><span>${repeatedText}</span></div></div>`;
}

function renderFooter(content) {
  const { site, contact, home } = content;
  const socials = (contact.socials || []).filter((social) => cleanUrl(social.url));
  const emailHref = contact.email ? `mailto:${contact.email}` : "";
  const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^+\d]/g, "")}` : "";
  const whatsapp = socials.find((social) => social.platform?.toLowerCase() === "whatsapp")?.url || "";
  const chatHref = cleanUrl(whatsapp) || emailHref || "#contact";
  return `
    <footer class="site-footer" id="contact">
      <div class="footer-top"><div><p class="eyebrow">${safe(text("openConversation"))}</p><h2>${safe(translated(contact, "title") || "Let us start a conversation")}</h2></div><a class="button" href="${safeUrl(chatHref) || "#contact"}">${safe(translated(site, "ctaLabel") || "Chat with me")} ${iconArrow()}</a></div>
      <div class="footer-grid">
        <div class="footer-brand">${renderBrand(site)}<p>${safe(translated(site, "description"))}</p><div class="social-row">${socials.map((social) => `<a class="social-link" href="${safeUrl(social.url)}" target="_blank" rel="noopener" aria-label="${safe(social.platform)}" title="${safe(social.platform)}">${socialIcon(social.platform)}</a>`).join("")}</div></div>
        <div class="footer-column"><h3>${safe(text("navigation"))}</h3>${(site.navigation || []).map((item) => `<a href="${safeUrl(item.href) || "#"}">${safe(translated(item, "label"))}</a>`).join("")}</div>
        <div class="footer-column"><h3>${safe(text("contact"))}</h3>${emailHref ? `<a href="${safe(emailHref)}">${safe(contact.email)}</a>` : ""}${phoneHref ? `<a href="${safe(phoneHref)}">${safe(contact.phone)}</a>` : ""}${cleanUrl(home.cvUrl) ? `<a href="${safeUrl(home.cvUrl)}" target="_blank" rel="noopener">${safe(translated(home, "cvLabel"))}</a>` : ""}</div>
        <div class="footer-column footer-contact-card"><h3>${safe(text("preferEmail"))}</h3><span>${safe(translated(contact, "subtitle") || "Send a short note and I will get back to you.")}</span>${emailHref ? `<a class="button footer-email-button" href="${safe(emailHref)}">${safe(translated(contact, "emailLabel"))} ${iconArrow()}</a>` : ""}</div>
      </div>
      <div class="footer-note"><span>${safe(translated(site, "footerNote"))}</span></div>
    </footer>`;
}

function renderHome(content) {
  document.title = content.site.name;
  document.querySelector('meta[name="description"]')?.setAttribute("content", translated(content.site, "description") || "Portfolio");
  app.innerHTML = [
    renderHeader(content.site),
    "<main>",
    renderHero(content),
    renderHighlight(content),
    renderAbout(content),
    renderExperience(content),
    renderProjects(content),
    renderMarquee(content),
    renderCertificates(content),
    renderTestimonials(content),
    "</main>",
    renderFooter(content),
  ].join("");
}

function projectSlug() {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("slug");
  if (querySlug) return querySlug;
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.at(-1)?.replace(/\.html$/, "") || "";
}

function renderProjectDetail(content) {
  const slug = projectSlug();
  const project = (content.projects || []).filter(isPublished).find((item) => item.slug === slug);
  if (!project) {
    document.title = `${text("projectNotFound")} | ${content.site.name}`;
    app.innerHTML = `${renderHeader(content.site, true)}<main class="project-detail"><div class="container"><div class="error-state"><h1>${safe(text("projectNotFound"))}</h1><p>${safe(text("projectUnavailable"))}</p><a class="button" href="index.html#projects">${safe(text("backPortfolio"))}</a></div></div></main>${renderFooter(content)}`;
    return;
  }
  document.title = `${translated(project, "title")} | ${content.site.name}`;
  const gallery = (project.gallery || []).filter(cleanUrl);
  app.innerHTML = `
    ${renderHeader(content.site, true)}
    <main class="project-detail">
      <div class="container">
        <section class="project-detail-hero reveal"><p class="eyebrow">${safe(categoryLabel(content, "project", project.category))}</p><h1>${safe(translated(project, "title"))}</h1><p>${safe(translated(project, "description"))}</p>${cleanUrl(project.projectUrl) ? `<a class="button" href="${safeUrl(project.projectUrl)}" target="_blank" rel="noopener">${safe(text("visitProject"))} ${iconArrow()}</a>` : ""}</section>
        <div class="project-cover reveal">${imageOrFallback(project.mainImage || project.thumbnail, translated(project, "title"))}</div>
        <section class="project-story reveal">
          <div class="project-story-heading"><p class="eyebrow">${safe(text("storyEyebrow"))}</p><h2>${safe(text("storyTitle"))}</h2></div>
          <div class="project-story-grid">
            <article class="project-story-card"><span class="story-index">01</span><h3>${safe(text("descriptionLabel"))}</h3><p>${safe(translated(project, "description"))}</p></article>
            <article class="project-story-card"><span class="story-index">02</span><h3>${safe(text("challenge"))}</h3><p>${safe(translated(project, "challenge") || translated(project, "description"))}</p></article>
          </div>
        </section>
        <section class="gallery">${gallery.map((imageUrl, index) => `<img class="reveal" src="${safeUrl(imageUrl)}" alt="${safe(translated(project, "title"))} gallery image ${index + 1}" />`).join("") || '<div class="empty-state">Project gallery images will appear here.</div>'}</section>
      </div>
    </main>
    ${renderFooter(content)}`;
}

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const lists = [...document.querySelectorAll(".nav-list")];
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    lists.forEach((list) => list.classList.toggle("open", open));
  });
  document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
    lists.forEach((list) => list.classList.remove("open"));
    toggle?.setAttribute("aria-expanded", "false");
  }));
}

function renderCurrentPage() {
  document.documentElement.lang = activeLanguage;
  if (currentPageIsDetail) renderProjectDetail(currentContent);
  else renderHome(currentContent);
  setupNavigation();
  setupFilters();
  setupReveal();
  setupLanguageSwitch();
}

function setupLanguageSwitch() {
  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => {
    const language = button.dataset.language;
    if (!currentContent?.site?.languages?.enabled || !["en", "id"].includes(language) || language === activeLanguage) return;
    activeLanguage = language;
    try { localStorage.setItem("portfolio-language", language); } catch { /* Storage can be unavailable in private contexts. */ }
    renderCurrentPage();
  }));
}

function setupFilters() {
  document.querySelectorAll("[data-list-limit]").forEach((list) => {
    const target = list.id.replace(/-list$/, "");
    const row = document.querySelector(`[data-filter-target="${target}"]`);
    const toggle = document.querySelector(`[data-list-toggle="${target}"]`);
    const cards = [...list.children].filter((card) => card.matches("article"));
    const limit = Number(list.dataset.listLimit);
    let category = row?.querySelector(".active")?.dataset.filter || "All";
    let expanded = false;

    const update = () => {
      const matching = cards.filter((card) => category === "All" || card.dataset.category === category);
      const shown = new Set(expanded ? matching : matching.slice(0, limit));
      cards.forEach((card) => {
        card.hidden = !shown.has(card);
        card.classList.remove("last-visible");
      });
      [...shown].at(-1)?.classList.add("last-visible");
      toggle.hidden = matching.length <= limit;
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.querySelector("span").textContent = text(expanded ? "showLess" : toggle.dataset.expandLabel);
    };

    row?.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      row.querySelectorAll("[data-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      category = button.dataset.filter;
      expanded = false;
      update();
    }));
    toggle.addEventListener("click", () => {
      expanded = !expanded;
      update();
      if (!expanded) toggle.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
    update();
  });
}

function setupContact(content) {
  document.querySelector("#contact-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const sender = new FormData(event.currentTarget).get("email");
    window.location.href = `mailto:${encodeURIComponent(content.contact.email)}?subject=${encodeURIComponent(`Project inquiry from ${sender}`)}`;
  });
}

function setupReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    observer.observe(element);
  });
}

function setupPageTransitions() {
  const transition = document.createElement("div");
  transition.className = "page-transition";
  transition.setAttribute("aria-hidden", "true");
  transition.innerHTML = '<span class="page-transition-kicker">Portfolio</span><strong class="page-transition-label">Loading next page</strong>';
  document.body.append(transition);

  const revealPage = () => {
    transition.classList.remove("is-navigating");
    requestAnimationFrame(() => requestAnimationFrame(() => transition.classList.add("is-revealing")));
  };

  revealPage();
  window.addEventListener("pageshow", revealPage);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;

    const target = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);
    if (target.origin !== current.origin || !["http:", "https:"].includes(target.protocol)) return;
    if (target.pathname === current.pathname && target.search === current.search && target.hash) return;
    if (target.href === current.href) return;

    event.preventDefault();
    transition.querySelector(".page-transition-label").textContent = link.getAttribute("aria-label")?.replace(/^Open\s+/i, "") || link.textContent.trim() || "Loading next page";
    transition.classList.remove("is-revealing");
    transition.classList.add("is-navigating");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.location.href = target.href;
      return;
    }
    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      window.location.href = target.href;
    };
    transition.addEventListener("transitionend", navigate, { once: true });
    window.setTimeout(navigate, 900);
  });
}

async function boot() {
  app.innerHTML = '<div class="loading-screen"><div class="loader" aria-label="Loading portfolio"></div></div>';
  try {
    currentContent = await loadContent();
    updateFavicon(currentContent.site?.logoUrl);
    currentPageIsDetail = window.location.pathname.toLowerCase().endsWith("project.html") || new URLSearchParams(window.location.search).has("slug");
    const defaultLanguage = currentContent.site?.languages?.defaultLanguage === "id" ? "id" : "en";
    let savedLanguage = "";
    try { savedLanguage = localStorage.getItem("portfolio-language") || ""; } catch { /* Use the CMS default when storage is unavailable. */ }
    activeLanguage = currentContent.site?.languages?.enabled && ["en", "id"].includes(savedLanguage) ? savedLanguage : defaultLanguage;
    if (!currentContent.site?.languages?.enabled) activeLanguage = "en";
    renderCurrentPage();
  } catch (error) {
    app.innerHTML = `<div class="error-state"><h1>Portfolio unavailable</h1><p>${safe(error.message)}</p></div>`;
  }
}

setupPageTransitions();
boot();
