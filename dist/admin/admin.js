import { demoContent, isSupabaseConfigured, loadContentRecord, login, normalizeContent, saveContent, uploadFile } from "../cms.js";
import { consumeAuthLink, verifyAdminToken, setAccountPassword, requestPasswordReset } from "./auth.js";
import { logoUrl, updateFavicon } from "../branding.js";

const root = document.querySelector("#admin-app");
const state = {
  content: null,
  token: "",
  user: "",
  active: "home",
  dirty: false,
  saving: false,
  demo: false,
  search: { projects: "", certificates: "", experience: "", testimonials: "" },
  updatedAt: "",
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const safe = (value) => escapeHtml(value ?? "");

function getAtPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setAtPath(object, path, value) {
  const keys = path.split(".");
  const finalKey = keys.pop();
  const parent = keys.reduce((current, key) => current[key], object);
  parent[finalKey] = value;
}

function markDirty() {
  state.dirty = true;
  const indicator = document.querySelector("#save-indicator");
  if (indicator) indicator.textContent = "Unsaved changes";
}

function field(label, path, options = {}) {
  const value = getAtPath(state.content, path) ?? "";
  const type = options.type || "text";
  const wide = options.wide ? " field--wide" : "";
  const disabledClass = options.disabled ? " is-disabled" : "";
  const disabled = options.disabled ? ' disabled aria-disabled="true"' : "";
  const helper = options.helper ? `<span class="helper">${safe(options.helper)}</span>` : "";
  if (type === "textarea") {
    return `<div class="field${wide}${disabledClass}"><label for="${safe(path)}">${safe(label)}</label><textarea id="${safe(path)}" data-bind="${safe(path)}"${disabled}>${safe(value)}</textarea>${helper}</div>`;
  }
  if (type === "checkbox") {
    return `<div class="field${wide}${disabledClass}"><label class="checkbox-control"><input type="checkbox" data-bind="${safe(path)}" ${value ? "checked" : ""} ${options.refresh ? "data-refresh-admin" : ""}${disabled} /><span>${safe(label)}</span></label>${helper}</div>`;
  }
  return `<div class="field${wide}${disabledClass}"><label for="${safe(path)}">${safe(label)}</label><input id="${safe(path)}" type="${safe(type)}" value="${safe(value)}" data-bind="${safe(path)}"${disabled} />${helper}</div>`;
}

function bilingualEnabled() {
  return Boolean(state.content?.site?.languages?.enabled);
}

function translationPath(path) {
  const parts = path.split(".");
  parts[parts.length - 1] = `${parts.at(-1)}Id`;
  return parts.join(".");
}

function translationPair(label, key, englishField, indonesianField) {
  const disabledNote = bilingualEnabled() ? "" : "Enable bilingual mode to edit Bahasa Indonesia.";
  return `<div class="translation-pair field--wide${bilingualEnabled() ? "" : " is-single-language"}" data-translation-pair="${safe(key)}"><div class="translation-pair-heading"><div><strong>${safe(label)}</strong>${disabledNote ? `<span>${safe(disabledNote)}</span>` : ""}</div><span class="translation-state">${bilingualEnabled() ? "EN + ID" : "EN only"}</span></div><div class="translation-columns">${englishField}${indonesianField}</div></div>`;
}

function translatableField(label, path, options = {}) {
  const childOptions = { ...options, wide: false };
  return translationPair(
    label,
    path,
    field("English (EN)", path, childOptions),
    field("Bahasa Indonesia (ID)", translationPath(path), { ...childOptions, disabled: !bilingualEnabled() }),
  );
}

function selectField(label, path, value, options, config = {}) {
  const disabledClass = config.disabled ? " is-disabled" : "";
  const disabled = config.disabled ? ' disabled aria-disabled="true"' : "";
  return `<div class="field${disabledClass}"><label for="${safe(path)}">${safe(label)}</label><select id="${safe(path)}" data-bind="${safe(path)}"${disabled}>${options.map((option) => `<option value="${safe(option.value)}" ${option.value === value ? "selected" : ""}>${safe(option.label)}</option>`).join("")}</select></div>`;
}

function directField(label, key, value, options = {}) {
  const type = options.type || "text";
  const wide = options.wide ? " field--wide" : "";
  const disabledClass = options.disabled ? " is-disabled" : "";
  const disabled = options.disabled ? ' disabled aria-disabled="true"' : "";
  const helper = options.helper ? `<span class="helper ${safe(options.helperClass || "")}">${safe(options.helper)}</span>` : "";
  if (type === "textarea") return `<div class="field${wide}${disabledClass}"><label>${safe(label)}</label><textarea name="${safe(key)}"${disabled}>${safe(value)}</textarea></div>`;
  if (type === "checkbox") return `<div class="field field--checkbox${wide}${disabledClass}"><label class="checkbox-control"><input name="${safe(key)}" type="checkbox" ${value ? "checked" : ""}${disabled} /><span>${safe(label)}</span></label>${helper}</div>`;
  return `<div class="field${wide}${disabledClass}"><label>${safe(label)}</label><input name="${safe(key)}" type="${safe(type)}" value="${safe(value)}"${disabled} /></div>`;
}

function directSelect(label, key, value, options) {
  return `<div class="field"><label>${safe(label)}</label><select name="${safe(key)}">${options.map((option) => `<option value="${safe(option)}" ${option === value ? "selected" : ""}>${safe(option)}</option>`).join("")}</select></div>`;
}

function translatableDirectField(label, key, current, options = {}) {
  const childOptions = { ...options, wide: false };
  return translationPair(
    label,
    key,
    directField("English (EN)", key, current[key], childOptions),
    directField("Bahasa Indonesia (ID)", `${key}Id`, current[`${key}Id`], { ...childOptions, disabled: !bilingualEnabled() }),
  );
}

function repeatableField(label, key, values, placeholder, options = {}) {
  const disabled = options.disabled ? ' disabled aria-disabled="true"' : "";
  const rows = (values.length ? values : [""]).map((value) => `<div class="repeatable-row"><input name="${safe(key)}[]" value="${safe(value)}" placeholder="${safe(placeholder)}"${disabled} /><button class="small-button danger" type="button" data-remove-repeatable aria-label="Delete ${safe(label.toLowerCase())}"${disabled}>Delete</button></div>`).join("");
  return `<div class="field field--wide repeatable-field${options.disabled ? " is-disabled" : ""}" data-repeatable="${safe(key)}"><div class="repeatable-heading"><label>${safe(label)}</label><button class="small-button" type="button" data-add-repeatable="${safe(key)}" data-placeholder="${safe(placeholder)}"${disabled}>Add</button></div><div class="repeatable-list">${rows}</div></div>`;
}

function translatableRepeatableField(label, englishKey, indonesianKey, englishValues, indonesianValues, englishPlaceholder, indonesianPlaceholder) {
  return translationPair(
    label,
    englishKey,
    repeatableField("English (EN)", englishKey, englishValues, englishPlaceholder),
    repeatableField("Bahasa Indonesia (ID)", indonesianKey, indonesianValues, indonesianPlaceholder, { disabled: !bilingualEnabled() }),
  );
}

function sortExperiences(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.item.current) !== Boolean(b.item.current)) return a.item.current ? -1 : 1;
    const endA = a.item.current ? "9999-12" : a.item.endMonth || "0000-00";
    const endB = b.item.current ? "9999-12" : b.item.endMonth || "0000-00";
    if (endA !== endB) return endB.localeCompare(endA);
    return (b.item.startMonth || "").localeCompare(a.item.startMonth || "");
  });
}

function formatMonth(value) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function uploadField(label, path, folder, guidance, accept = "image/jpeg,image/png,image/webp,image/gif") {
  const url = getAtPath(state.content, path) || "";
  const preview = url && accept !== "application/pdf" ? `<img src="${safe(url)}" alt="${safe(label)} preview" />` : `<strong>${url ? "File uploaded" : "Choose a file"}</strong>`;
  return `<div class="upload-field"><label>${safe(label)}</label><div class="upload-box" data-preview-for="${safe(path)}">${preview}<input type="file" accept="${safe(accept)}" data-upload-path="${safe(path)}" data-upload-folder="${safe(folder)}" /></div><span class="helper">${safe(guidance)}</span></div>`;
}

function modalUploadField(label, name, options = {}) {
  const multiple = Boolean(options.multiple);
  const savedCount = Number(options.savedCount || 0);
  const inputId = `modal-${name}`;
  const savedStatus = savedCount
    ? multiple ? `${savedCount} saved photos` : "A photo is already saved"
    : multiple ? "No gallery photos saved" : "No photo saved";
  const action = multiple ? "Select photos" : "Select photo";
  const selectionHint = multiple ? "Choose more than one file at once" : "JPG, PNG, WebP, or GIF";

  return `<div class="modal-upload-field${options.wide ? " field--wide" : ""}">
    <div class="modal-upload-heading"><div><label for="${safe(inputId)}">${safe(label)}</label><p>${safe(options.guidance || "Maximum 10 MB per photo.")}</p></div><span class="modal-file-status" data-file-status-for="${safe(name)}">${safe(savedStatus)}</span></div>
    <label class="modal-upload-picker" for="${safe(inputId)}"><span class="modal-upload-icon" aria-hidden="true">+</span><span><strong>${safe(action)}</strong><small>${safe(selectionHint)}</small></span></label>
    <input class="modal-file-input" id="${safe(inputId)}" name="${safe(name)}" type="file" accept="image/jpeg,image/png,image/webp,image/gif" ${multiple ? "multiple" : ""} />
  </div>`;
}

function renderLogin(message = "") {
  root.innerHTML = `
    <main class="admin-login">
      <section class="login-art"><h1>Shape the work.<br /><span class="accent">Keep it yours.</span></h1></section>
      <section class="login-panel">
        <form class="login-card" id="login-form">
          <p class="eyebrow">Portfolio CMS</p>
          <h2>Welcome back</h2>
          <p>Sign in to manage your portfolio. New owners must use the invitation sent to their email to create a password.</p>
          ${message ? `<div class="notice error">${safe(message)}</div>` : ""}
          ${!isSupabaseConfigured() ? '<div class="notice">Supabase is not configured. Preview mode is available, but changes cannot be saved.</div>' : ""}
          <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" required /></div>
          <div class="field" style="margin-top:16px"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required /></div>
          <button class="button" style="width:100%;margin-top:24px" type="submit">Sign in</button>
          ${isSupabaseConfigured() ? '<button class="button button--outline" style="width:100%;margin-top:10px" type="button" id="forgot-password">Forgot password?</button>' : ""}
          ${!isSupabaseConfigured() ? '<button class="button button--outline" style="width:100%;margin-top:10px" type="button" id="preview-admin">Preview editor</button>' : ""}
        </form>
      </section>
    </main>`;

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Signing in...";
    try {
      const values = new FormData(event.currentTarget);
      const session = await login(values.get("email"), values.get("password"));
      state.token = session.access_token;
      state.user = session.user.email;
      const record = await loadContentRecord(state.token);
      state.content = record.content;
      state.updatedAt = record.updatedAt;
      renderAdmin();
    } catch (error) {
      renderLogin(error.message);
    }
  });

  document.querySelector("#forgot-password")?.addEventListener("click", () => renderAccountForm());
  document.querySelector("#preview-admin")?.addEventListener("click", () => {
    state.demo = true;
    state.user = "Preview mode";
    state.content = normalizeContent(structuredClone(demoContent));
    renderAdmin();
  });
}

function renderAccountForm(link = null, user = null) {
  const title = link ? (link.type === "invite" ? "Activate your portfolio" : "Create a new password") : "Reset your password";
  root.innerHTML = `<main class="admin-login">
    <section class="login-art"><h1>Shape the work.<br /><span class="accent">Keep it yours.</span></h1></section>
    <section class="login-panel"><form class="login-card" id="account-form">
      <p class="eyebrow">Portfolio CMS</p><h2>${title}</h2>
      <p>${link ? `Set a password for ${safe(user.email)}. Use at least 12 characters.` : "Enter your account email to request a password reset link."}</p>
      ${link ? '<div class="field"><label for="new-password">New password</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="12" required /></div><div class="field" style="margin-top:16px"><label for="confirm-password">Confirm password</label><input id="confirm-password" name="confirm" type="password" autocomplete="new-password" minlength="12" required /></div>' : '<div class="field"><label for="reset-email">Email address</label><input id="reset-email" name="email" type="email" autocomplete="email" required /></div>'}
      <p id="account-status" role="status" aria-live="polite"></p>
      <button class="button" style="width:100%;margin-top:24px" type="submit">${link ? "Save password" : "Send reset link"}</button>
      <button class="button button--outline" style="width:100%;margin-top:10px" type="button" id="back-login">Back to sign in</button>
    </form></section></main>`;
  document.querySelector("#back-login").addEventListener("click", () => renderLogin());
  document.querySelector("#account-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const status = form.querySelector("#account-status");
    const values = new FormData(form);
    button.disabled = true;
    status.textContent = "Please wait...";
    try {
      if (link) {
        if (values.get("password") !== values.get("confirm")) throw new Error("Passwords do not match.");
        await setAccountPassword(link.token, values.get("password"));
        link.token = "";
        form.reset();
        renderLogin();
        const notice = document.createElement("p");
        notice.className = "notice";
        notice.setAttribute("role", "status");
        notice.textContent = "Password saved. Sign in with your email and new password.";
        document.querySelector("#login-form").prepend(notice);
      } else {
        await requestPasswordReset(values.get("email"));
        status.textContent = "If this email is registered, a reset link will be sent. Check your inbox and spam folder.";
      }
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

async function initializeAccount() {
  try {
    const link = consumeAuthLink();
    if (isSupabaseConfigured()) {
      loadContentRecord().then((record) => {
        if (!state.content) updateFavicon(record.content.site?.logoUrl);
      }).catch(() => { /* Keep the default icon if public content is unavailable. */ });
    }
    if (!link) return renderLogin();
    root.innerHTML = '<main class="admin-login"><p role="status">Verifying your link...</p></main>';
    const user = await verifyAdminToken(link.token);
    renderAccountForm(link, user);
  } catch (error) {
    renderLogin(error.message);
  }
}

function homePanel() {
  const highlightedCount = (state.content.projects || []).filter((project) => project.highlighted).length;
  return `<section class="admin-panel${state.active === "home" ? " active" : ""}" data-panel="home">
    <div class="panel-card"><div class="panel-card-heading"><div><h2>Hero content</h2><p>Keep the name and profession concise enough to scale across screen sizes.</p></div></div><div class="field-grid home-field-grid">
      ${translatableField("Greeting", "home.greeting")}${field("Name", "home.name")}${translatableField("Profession", "home.role")}${translatableField("Primary button label", "home.primaryCtaLabel")}${translatableField("CV button label", "home.cvLabel")}${field("CV URL", "home.cvUrl", { type: "url" })}${translatableField("Hero quote", "home.quote", { type: "textarea", wide: true })}
      ${uploadField("Transparent profile portrait", "home.portraitUrl", "portraits", "Upload a half-body portrait with a transparent background. Recommended size: 1200 x 1600 px (3:4). Keep the full head, hair, shoulders, and torso visible. PNG or WebP recommended; JPG supported; maximum 10 MB.")}
      ${uploadField("CV PDF", "home.cvUrl", "cv", "PDF only, maximum 10 MB. A direct URL can be used instead.", "application/pdf")}
    </div></div>
    <div class="panel-card"><h2>Statistics</h2><div class="field-grid home-field-grid">${(state.content.home.stats || []).map((stat, index) => `${field(`Statistic ${index + 1} value`, `home.stats.${index}.value`)}${translatableField(`Statistic ${index + 1} label`, `home.stats.${index}.label`)}`).join("")}</div></div>
    <div class="panel-card highlight-admin-note"><div><h2>Highlighted projects</h2><p>Choose up to three Published projects from the Projects editor. If none are selected, the first three Published projects are used.</p></div><div class="highlight-admin-actions"><span class="highlight-capacity">${highlightedCount} / 3 selected</span><button class="button button--outline" type="button" data-go-to="projects">Manage highlights</button></div></div>
  </section>`;
}

function aboutPanel() {
  return `<section class="admin-panel${state.active === "about" ? " active" : ""}" data-panel="about"><div class="panel-card"><h2>About Me</h2><div class="field-grid">
    ${translatableField("Title", "about.title")}${translatableField("Subtitle", "about.subtitle")}${translatableField("Button label", "about.buttonLabel")}${field("Button destination", "about.buttonHref")}
    ${translationPair("Body paragraphs", "about.paragraphs", `<div class="field"><label for="about-paragraphs">English (EN)</label><textarea id="about-paragraphs" data-special="about-paragraphs">${safe((state.content.about.paragraphs || []).join("\n\n"))}</textarea><span class="helper">Separate paragraphs with a blank line.</span></div>`, `<div class="field${bilingualEnabled() ? "" : " is-disabled"}"><label for="about-paragraphs-id">Bahasa Indonesia (ID)</label><textarea id="about-paragraphs-id" data-special="about-paragraphs-id"${bilingualEnabled() ? "" : ' disabled aria-disabled="true"'}>${safe((state.content.about.paragraphsId || []).join("\n\n"))}</textarea><span class="helper">Pisahkan paragraf dengan satu baris kosong.</span></div>`)}
    ${uploadField("About photo", "about.photoUrl", "about", "Recommended size: 1200 x 1400 px (6:7). JPG, PNG, WebP, or GIF; maximum 10 MB.")}
  </div></div></section>`;
}

function categoryMoveButtons(key, category, index) {
  if (category === "All") return "";
  const categories = state.content[key] || [];
  return [-1, 1].map((direction) => {
    const next = index + direction;
    const disabled = next < 0 || next >= categories.length || categories[next] === "All";
    const label = `Move ${category} ${direction < 0 ? "left" : "right"}`;
    return `<button type="button" data-move-category="${key}" data-category="${safe(category)}" data-direction="${direction}" aria-label="${safe(label)}" title="${safe(label)}" ${disabled ? "disabled" : ""}>${direction < 0 ? "&#8592;" : "&#8594;"}</button>`;
  }).join("");
}

function moveCategory(key, category, direction) {
  if (!["projectCategories", "experienceCategories"].includes(key) || ![-1, 1].includes(direction)) return;
  const categories = state.content[key];
  const index = categories.indexOf(category);
  const next = index + direction;
  if (index < 0 || category === "All" || next < 0 || next >= categories.length || categories[next] === "All") return;
  [categories[index], categories[next]] = [categories[next], categories[index]];
  renderAdmin();
  markDirty();
  const buttons = [...document.querySelectorAll("[data-move-category]")];
  const matching = buttons.filter(button => button.dataset.moveCategory === key && button.dataset.category === category);
  (matching.find(button => Number(button.dataset.direction) === direction && !button.disabled) || matching.find(button => !button.disabled))?.focus();
}

function listPanel(type, title, subtitle) {
  const source = type === "experience" ? state.content.experiences : state.content[type];
  const query = state.search[type].toLowerCase();
  const indexed = (source || []).map((item, index) => ({ item, index }));
  const ordered = type === "experience" ? sortExperiences(indexed) : indexed;
  const filtered = ordered.filter(({ item }) => JSON.stringify(item).toLowerCase().includes(query));
  const imageKey = type === "projects" ? "thumbnail" : type === "certificates" ? "imageUrl" : "";
  const canMove = type !== "experience";
  const cards = filtered.map(({ item, index }) => `
    <article class="item-card">
      <div class="item-thumbnail">${imageKey && item[imageKey] ? `<img src="${safe(item[imageKey])}" alt="" />` : safe((item.title || item.organization || "I").slice(0, 2).toUpperCase())}</div>
      <div class="item-copy"><h3>${safe(type === "testimonials" ? item.name || "Anonymous feedback" : item.title)}</h3><p>${type === "experience" ? `${safe(item.organization)} · ${formatMonth(item.startMonth)} - ${item.current ? "Present" : formatMonth(item.endMonth)}` : safe(item.category || item.context || item.organization || "")}</p><div class="item-badges"><span class="status ${safe(item.status || "published")}">${safe(item.status || "published")}</span>${type === "projects" && item.highlighted ? '<span class="status highlighted">Highlighted</span>' : ""}</div></div>
      <div class="item-actions">
        ${canMove ? `<button class="small-button" type="button" data-move="${type}" data-index="${index}" data-direction="-1" ${query ? "disabled" : ""} aria-label="Move up">&#8593;</button><button class="small-button" type="button" data-move="${type}" data-index="${index}" data-direction="1" ${query ? "disabled" : ""} aria-label="Move down">&#8595;</button>` : ""}
        <button class="small-button" type="button" data-edit="${type}" data-index="${index}">Edit</button>
        <button class="small-button danger" type="button" data-delete="${type}" data-index="${index}">Delete</button>
      </div>
    </article>`).join("");
  const categoryKey = type === "projects" ? "projectCategories" : type === "experience" ? "experienceCategories" : "";
  const categoryScope = categoryKey === "projectCategories" ? "project" : "experience";
  const categoryEditor = categoryKey ? `<div class="category-manager"><div class="category-heading"><div><h3>Filter categories</h3><p>Add, rename, reorder, or remove filters. Use the arrows to change their order, then save changes.</p></div><button class="small-button" type="button" data-add-category="${categoryKey}">Add category</button></div><div class="category-list">${(state.content[categoryKey] || []).map((category, index) => `<div class="category-chip"><span>${safe(category)}${bilingualEnabled() && state.content.categoryTranslations?.[categoryScope]?.[category] ? ` <small>/ ${safe(state.content.categoryTranslations[categoryScope][category])}</small>` : ""}</span>${category === "All" ? '<small>Required</small>' : `${categoryMoveButtons(categoryKey, category, index)}<button type="button" data-edit-category="${categoryKey}" data-category="${safe(category)}">Edit</button><button type="button" data-delete-category="${categoryKey}" data-category="${safe(category)}">Delete</button>`}</div>`).join("")}</div></div>` : "";
  const experiencePhoto = type === "experience" ? `<div class="panel-card"><h2>Experience section photo</h2>${uploadField("Experience photo", "experiencePhotoUrl", "experience", "Recommended size: 1200 x 1400 px (6:7). JPG, PNG, WebP, or GIF; maximum 10 MB.")}</div>` : "";
  const toolbarHelper = canMove ? "Ordering is disabled while search is active." : "The list uses the same date order as the public timeline.";
  return `<section class="admin-panel${state.active === type ? " active" : ""}" data-panel="${type}">${experiencePhoto}<div class="panel-card"><div class="panel-card-heading"><div><h2>${safe(title)}</h2><p>${safe(subtitle)}</p></div><button class="button" type="button" data-add="${type}">Add new</button></div>${categoryEditor}<div class="editor-toolbar"><input class="search-input" type="search" placeholder="Search ${safe(title.toLowerCase())}" value="${safe(state.search[type])}" data-search="${type}" /><span class="helper">${toolbarHelper}</span></div><div class="item-list">${cards || '<div class="empty-state">No matching items.</div>'}</div></div></section>`;
}

function testimonialsPanel() {
  return `<section class="admin-panel${state.active === "testimonials" ? " active" : ""}" data-panel="testimonials"><div class="panel-card"><h2>Section copy</h2><div class="field-grid home-field-grid">${translatableField("Heading", "testimonialTitle")}${translatableField("Supporting text", "testimonialSubtitle", { type: "textarea" })}</div></div>${listPanel("testimonials", "What they say about me", "Publish honest notes from teammates, collaborators, or partners. No ratings are shown.").replace(/^<section[^>]*>|<\/section>$/g, "")}</section>`;
}

function certificatesPanel() {
  return `<section class="admin-panel${state.active === "certificates" ? " active" : ""}" data-panel="certificates"><div class="panel-card"><h2>Section copy</h2><div class="field-grid home-field-grid">${translatableField("Heading", "certificateTitle")}${translatableField("Supporting text", "certificateSubtitle", { type: "textarea" })}</div></div>${listPanel("certificates", "Certificates", "Manage recognition, issuer, publication year, and display order.").replace(/^<section[^>]*>|<\/section>$/g, "")}</section>`;
}

function contactPanel() {
  return `<section class="admin-panel${state.active === "contact" ? " active" : ""}" data-panel="contact"><div class="panel-card"><h2>Contact</h2><div class="field-grid">
    ${translatableField("Title", "contact.title")}${translatableField("Accent subtitle", "contact.subtitle")}${field("Email address", "contact.email", { type: "email" })}${field("Phone number", "contact.phone", { type: "tel" })}${translatableField("Email button label", "contact.emailLabel")}${translatableField("Phone button label", "contact.phoneLabel")}
  </div></div><div class="panel-card"><div class="panel-card-heading"><div><h2>Social media</h2><p>Platforms are fixed; leave a URL empty to hide its button.</p></div><button class="button" type="button" id="save-socials">Save social media</button></div><div class="field-grid">${(state.content.contact.socials || []).map((social, index) => field(social.platform, `contact.socials.${index}.url`, { type: "url" })).join("")}</div></div></section>`;
}

function settingsPanel() {
  const navFields = (state.content.site.navigation || []).map((item, index) => `${translatableField(`Navigation ${index + 1} label`, `site.navigation.${index}.label`)}${field(`Navigation ${index + 1} destination`, `site.navigation.${index}.href`)}`).join("");
  return `<section class="admin-panel${state.active === "settings" ? " active" : ""}" data-panel="settings"><div class="panel-card language-settings"><div class="panel-card-heading"><div><h2>Website languages</h2><p>Use the global toggle in the top bar to enable Indonesian editing and the ID / EN switch on the public website.</p></div><span class="language-mode-badge">${bilingualEnabled() ? "Bilingual" : "English only"}</span></div><div class="field-grid">
    ${selectField("Default website language", "site.languages.defaultLanguage", state.content.site.languages.defaultLanguage, [{ value: "en", label: "English (EN)" }, { value: "id", label: "Indonesia (ID)" }], { disabled: !bilingualEnabled() })}
    <div class="language-help"><strong>${bilingualEnabled() ? "Both languages are active" : "Indonesian fields are locked"}</strong><span>${bilingualEnabled() ? "Complete both EN and ID before publishing changes." : "Existing Indonesian content stays saved and becomes editable again when bilingual mode is enabled."}</span></div>
  </div></div><div class="panel-card"><div class="panel-card-heading"><div><h2>Running text</h2><p>Edit the scrolling ribbon displayed between Projects and Certificates.</p></div></div><div class="field-grid">
    ${translatableField("Scrolling message", "site.runningText", { type: "textarea", wide: true })}
  </div></div><div class="panel-card"><h2>Header & Footer</h2><div class="field-grid">
    ${field("Website name", "site.name")}${translatableField("Browser description", "site.description")}${translatableField("Call-to-action label", "site.ctaLabel")}${field("Call-to-action destination", "site.ctaHref")}${translatableField("Footer note", "site.footerNote", { wide: true })}
    ${uploadField("Customer logo", "site.logoUrl", "logos", "Use a square logo (1:1). Recommended size: 512 x 512 px. PNG or WebP with a transparent background is recommended. Maximum file size: 10 MB. This logo is also used in the admin panel and browser tab.")}
  </div></div><div class="panel-card"><h2>Navigation labels</h2><div class="field-grid">${navFields}</div></div></section>`;
}

function openConfirmModal(options) {
  const modalRoot = document.querySelector("#modal-root");
  const titleId = "confirm-modal-title";
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal modal--compact confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="${titleId}" aria-describedby="confirm-modal-message"><div class="modal-header"><div><p class="eyebrow">${safe(options.eyebrow || "Please confirm")}</p><h2 id="${titleId}">${safe(options.title)}</h2></div><button class="small-button" type="button" data-close-confirm>Close</button></div><div class="category-delete-summary"><span class="warning-mark" aria-hidden="true">!</span><div><strong>${safe(options.summary)}</strong><p id="confirm-modal-message">${safe(options.message)}</p></div></div><div class="modal-actions"><button class="button button--outline" type="button" data-close-confirm>Cancel</button><button class="button button--danger" type="button" id="confirm-action">${safe(options.confirmLabel || "Continue")}</button></div></section></div>`;
  const close = () => {
    document.removeEventListener("keydown", handleKeydown);
    modalRoot.innerHTML = "";
  };
  const handleKeydown = (event) => {
    if (event.key === "Escape") close();
  };
  modalRoot.querySelectorAll("[data-close-confirm]").forEach((button) => button.addEventListener("click", close));
  modalRoot.querySelector(".modal-backdrop").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) close();
  });
  modalRoot.querySelector("#confirm-action").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = options.busyLabel || "Working...";
    try {
      await options.onConfirm();
      document.removeEventListener("keydown", handleKeydown);
      if (document.body.contains(modalRoot)) modalRoot.innerHTML = "";
    } catch (error) {
      button.disabled = false;
      button.textContent = options.confirmLabel || "Continue";
      showNotice(error.message, "error");
    }
  });
  document.addEventListener("keydown", handleKeydown);
  modalRoot.querySelector("#confirm-action").focus();
}

function renderAdmin() {
  const customerLogo = logoUrl(state.content.site?.logoUrl);
  updateFavicon(customerLogo);
  const menus = [
    ["home", "Home"], ["about", "About Me"], ["projects", "Projects"], ["certificates", "Certificates"], ["experience", "Experience"], ["testimonials", "What They Say"], ["contact", "Contact"], ["settings", "Header & Footer"],
  ];
  root.innerHTML = `<div class="admin-shell">
    <aside class="admin-sidebar" id="admin-sidebar"><div class="admin-brand">${customerLogo ? `<img class="admin-customer-logo" src="${safe(customerLogo)}" alt="Customer logo" /><span class="admin-brand-fallback" hidden>P</span>` : '<span class="admin-brand-fallback">P</span>'}<span>Portfolio CMS</span></div><nav class="admin-menu">${menus.map(([key, label]) => `<button class="${state.active === key ? "active" : ""}" type="button" data-tab="${key}">${label}</button>`).join("")}</nav><div class="sidebar-footer"><a class="sidebar-action" href="../index.html" target="_blank">View portfolio</a><button class="sidebar-action" id="logout" type="button">Sign out</button></div></aside>
    <main class="admin-main"><header class="admin-topbar"><div><button class="mobile-admin-toggle" id="mobile-admin-toggle" type="button" aria-label="Open menu">&#9776;</button><div><p class="eyebrow">Content dashboard</p><h1>${safe(menus.find(([key]) => key === state.active)?.[1] || "Dashboard")}</h1><p id="save-indicator">${state.demo ? "Preview mode - saving disabled" : safe(state.user)}</p></div></div><div class="admin-actions"><label class="admin-language-toggle" id="admin-language-toggle"><span class="language-toggle-copy"><strong>Enable Indonesian & English</strong><small>${bilingualEnabled() ? "Bilingual mode" : "English only"}</small></span><input type="checkbox" data-bind="site.languages.enabled" data-refresh-admin ${bilingualEnabled() ? "checked" : ""} aria-label="Enable bilingual editing" /><span class="toggle-track" aria-hidden="true"><span></span></span></label><button class="button button--outline" id="discard" type="button">Discard</button><button class="button" id="save" type="button">Save changes</button></div></header>
      <div id="notice-area"></div>
      ${homePanel()}${aboutPanel()}${listPanel("projects", "Projects", "Manage publishing, highlights, category filters, ordering, and project media.")}${certificatesPanel()}${listPanel("experience", "Experience", "Current roles are displayed first, followed by the latest end and start dates.")}${testimonialsPanel()}${contactPanel()}${settingsPanel()}
    </main></div><div id="modal-root"></div>`;
  bindAdminEvents();
}

function bindAdminEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => {
    state.active = button.dataset.tab;
    renderAdmin();
  }));
  document.querySelectorAll("[data-go-to]").forEach((button) => button.addEventListener("click", () => {
    state.active = button.dataset.goTo;
    renderAdmin();
  }));
  document.querySelector("#mobile-admin-toggle")?.addEventListener("click", () => document.querySelector("#admin-sidebar")?.classList.toggle("open"));
  document.querySelector(".admin-customer-logo")?.addEventListener("error", (event) => {
    event.currentTarget.hidden = true;
    document.querySelector(".admin-brand-fallback").hidden = false;
  });
  document.querySelector("#logout")?.addEventListener("click", () => {
    const signOut = () => {
      Object.assign(state, { content: null, token: "", user: "", dirty: false, demo: false });
      renderLogin();
    };
    if (!state.dirty) {
      signOut();
      return;
    }
    openConfirmModal({
      eyebrow: "Unsaved changes",
      title: "Sign out anyway?",
      summary: "Your unsaved edits will be lost.",
      message: "Save your changes first if you want to keep them.",
      confirmLabel: "Discard & sign out",
      busyLabel: "Signing out...",
      onConfirm: signOut,
    });
  });
  document.querySelectorAll("[data-bind]").forEach((input) => input.addEventListener("input", () => {
    setAtPath(state.content, input.dataset.bind, input.type === "checkbox" ? input.checked : input.value);
    markDirty();
    if (input.hasAttribute("data-refresh-admin")) renderAdmin();
  }));
  document.querySelector("[data-special='about-paragraphs']")?.addEventListener("input", (event) => {
    state.content.about.paragraphs = event.currentTarget.value.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
    markDirty();
  });
  document.querySelector("[data-special='about-paragraphs-id']")?.addEventListener("input", (event) => {
    state.content.about.paragraphsId = event.currentTarget.value.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
    markDirty();
  });
  document.querySelectorAll("[data-add-category]").forEach((button) => button.addEventListener("click", () => addCategory(button.dataset.addCategory)));
  document.querySelectorAll("[data-edit-category]").forEach((button) => button.addEventListener("click", () => editCategory(button.dataset.editCategory, button.dataset.category)));
  document.querySelectorAll("[data-move-category]").forEach((button) => button.addEventListener("click", () => moveCategory(button.dataset.moveCategory, button.dataset.category, Number(button.dataset.direction))));
  document.querySelectorAll("[data-delete-category]").forEach((button) => button.addEventListener("click", () => deleteCategory(button.dataset.deleteCategory, button.dataset.category)));
  document.querySelectorAll("[data-upload-path]").forEach((input) => input.addEventListener("change", handleUpload));
  document.querySelectorAll("[data-search]").forEach((input) => input.addEventListener("input", () => {
    state.search[input.dataset.search] = input.value;
    renderAdmin();
    document.querySelector(`[data-search='${input.dataset.search}']`)?.focus();
  }));
  document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => openEditor(button.dataset.add)));
  document.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditor(button.dataset.edit, Number(button.dataset.index))));
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteItem(button.dataset.delete, Number(button.dataset.index))));
  document.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => moveItem(button.dataset.move, Number(button.dataset.index), Number(button.dataset.direction))));
  document.querySelector("#save")?.addEventListener("click", persist);
  document.querySelector("#save-socials")?.addEventListener("click", persist);
  document.querySelector("#discard")?.addEventListener("click", async () => {
    const discardChanges = async () => {
      if (state.demo) {
        state.content = normalizeContent(structuredClone(demoContent));
      } else {
        const record = await loadContentRecord(state.token);
        state.content = record.content;
        state.updatedAt = record.updatedAt;
      }
      state.dirty = false;
      renderAdmin();
    };
    if (!state.dirty) {
      await discardChanges();
      return;
    }
    openConfirmModal({
      eyebrow: "Reset editor",
      title: "Discard changes?",
      summary: "All edits since your last save will be removed.",
      message: "This action cannot be undone after you continue.",
      confirmLabel: "Discard changes",
      busyLabel: "Discarding...",
      onConfirm: discardChanges,
    });
  });
}

function itemArray(type) {
  return type === "experience" ? state.content.experiences : state.content[type];
}

function categoryItems(categoryKey) {
  return categoryKey === "projectCategories" ? state.content.projects : state.content.experiences;
}

function openCategoryForm(categoryKey, current = "") {
  const editing = Boolean(current);
  const categories = state.content[categoryKey] || [];
  const scope = categoryKey === "projectCategories" ? "projects" : "experience";
  const translationScope = categoryKey === "projectCategories" ? "project" : "experience";
  const currentId = state.content.categoryTranslations?.[translationScope]?.[current] || "";
  const modalRoot = document.querySelector("#modal-root");
  modalRoot.innerHTML = `<div class="modal-backdrop"><form class="modal modal--compact category-modal" id="category-form"><div class="modal-header"><div><p class="eyebrow">${editing ? "Edit filter" : "New filter"}</p><h2>${editing ? "Edit category" : "Add category"}</h2></div><button class="small-button" type="button" data-close-category>Close</button></div><p class="modal-copy">This category will be available in the ${scope} editor and as a public portfolio filter.</p><div class="field-grid">${translationPair("Category name", `category.${translationScope}`, `<div class="field"><label for="category-name">English (EN)</label><input id="category-name" name="categoryName" value="${safe(current)}" maxlength="40" autocomplete="off" required /></div>`, `<div class="field${bilingualEnabled() ? "" : " is-disabled"}"><label for="category-name-id">Bahasa Indonesia (ID)</label><input id="category-name-id" name="categoryNameId" value="${safe(currentId)}" maxlength="40" autocomplete="off"${bilingualEnabled() ? "" : ' disabled aria-disabled="true"'} /></div>`)}</div><div class="form-error" id="category-error" role="alert"></div><div class="modal-actions"><button class="button button--outline" type="button" data-close-category>Cancel</button><button class="button" type="submit">${editing ? "Save category" : "Add category"}</button></div></form></div>`;
  const close = () => { modalRoot.innerHTML = ""; };
  modalRoot.querySelectorAll("[data-close-category]").forEach((button) => button.addEventListener("click", close));
  const input = modalRoot.querySelector("#category-name");
  input.focus();
  if (editing) input.select();
  modalRoot.querySelector("#category-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = formData.get("categoryName").trim();
    const valueId = bilingualEnabled() ? String(formData.get("categoryNameId") || "").trim() : currentId;
    const error = modalRoot.querySelector("#category-error");
    if (!value) {
      error.textContent = "Category name is required.";
      input.focus();
      return;
    }
    if (value.toLowerCase() === "all") {
      error.textContent = '"All" is reserved for the required default filter.';
      input.focus();
      return;
    }
    if (categories.some((category) => category !== current && category.toLowerCase() === value.toLowerCase())) {
      error.textContent = "That category already exists.";
      input.focus();
      return;
    }
    if (editing) {
      const index = categories.indexOf(current);
      if (index >= 0) categories[index] = value;
      categoryItems(categoryKey).forEach((item) => { if (item.category === current) item.category = value; });
      if (current !== value) delete state.content.categoryTranslations[translationScope][current];
    } else {
      categories.push(value);
    }
    if (valueId) state.content.categoryTranslations[translationScope][value] = valueId;
    else delete state.content.categoryTranslations[translationScope][value];
    markDirty();
    close();
    renderAdmin();
  });
}

function addCategory(categoryKey) {
  openCategoryForm(categoryKey);
}

function editCategory(categoryKey, current) {
  if (current !== "All") openCategoryForm(categoryKey, current);
}

function deleteCategory(categoryKey, category) {
  if (category === "All") return;
  const categories = state.content[categoryKey] || [];
  const fallback = categories.find((value) => value !== "All" && value !== category) || "";
  const affectedCount = categoryItems(categoryKey).filter((item) => item.category === category).length;
  const translationScope = categoryKey === "projectCategories" ? "project" : "experience";
  const modalRoot = document.querySelector("#modal-root");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal modal--compact category-modal category-modal--danger" role="dialog" aria-modal="true" aria-labelledby="delete-category-title"><div class="modal-header"><div><p class="eyebrow">Delete filter</p><h2 id="delete-category-title">Delete &quot;${safe(category)}&quot;?</h2></div><button class="small-button" type="button" data-close-category>Close</button></div><div class="category-delete-summary"><span class="warning-mark" aria-hidden="true">!</span><div><strong>${affectedCount} ${affectedCount === 1 ? "item uses" : "items use"} this category</strong><p>${affectedCount ? `They will be moved to &quot;${safe(fallback || "Uncategorized")}&quot;.` : "No content items will be affected."}</p></div></div><div class="modal-actions"><button class="button button--outline" type="button" data-close-category>Cancel</button><button class="button button--danger" type="button" id="confirm-delete-category">Delete category</button></div></section></div>`;
  const close = () => { modalRoot.innerHTML = ""; };
  modalRoot.querySelectorAll("[data-close-category]").forEach((button) => button.addEventListener("click", close));
  modalRoot.querySelector("#confirm-delete-category").addEventListener("click", () => {
    state.content[categoryKey] = categories.filter((value) => value !== category);
    delete state.content.categoryTranslations[translationScope][category];
    categoryItems(categoryKey).forEach((item) => { if (item.category === category) item.category = fallback; });
    markDirty();
    close();
    renderAdmin();
  });
}

function newItem(type) {
  if (type === "projects") return { title: "", titleId: "", slug: "", category: state.content.projectCategories?.[1] || "", description: "", descriptionId: "", challenge: "", challengeId: "", projectUrl: "", mainImage: "", thumbnail: "", gallery: [], highlighted: false, status: "draft", order: itemArray(type).length + 1 };
  if (type === "certificates") return { title: "", titleId: "", category: "", categoryId: "", issuer: "", year: "", imageUrl: "", status: "draft", order: itemArray(type).length + 1 };
  if (type === "testimonials") return { name: "", context: "", contextId: "", quote: "", quoteId: "", status: "draft", order: itemArray(type).length + 1 };
  return { title: "", titleId: "", organization: "", startMonth: "", endMonth: "", current: false, descriptions: [], descriptionsId: [], skills: [], category: state.content.experienceCategories?.[1] || "", status: "draft" };
}

function openEditor(type, index = -1) {
  const current = index >= 0 ? structuredClone(itemArray(type)[index]) : newItem(type);
  const highlightedCount = (state.content.projects || []).filter((project) => project.highlighted).length;
  const highlightLimitReached = type === "projects" && highlightedCount >= 3 && !current.highlighted;
  const commonStatus = directSelect("Status", "status", current.status || "draft", ["draft", "published"]);
  let fields = "";
  if (type === "projects") {
    fields = `${translatableDirectField("Title", "title", current)}${directField("Slug", "slug", current.slug)}${directSelect("Category", "category", current.category, (state.content.projectCategories || []).filter((category) => category !== "All"))}${commonStatus}${directField("Highlighted on homepage", "highlighted", current.highlighted, { type: "checkbox", wide: true, disabled: highlightLimitReached, helper: highlightLimitReached ? "3 of 3 selected. Remove another highlight before selecting this project." : `${highlightedCount} of 3 highlight slots selected.`, helperClass: "highlight-limit-note" })}${translatableDirectField("Description", "description", current, { type: "textarea", wide: true })}${translatableDirectField("Challenge", "challenge", current, { type: "textarea", wide: true })}${directField("Project URL", "projectUrl", current.projectUrl, { type: "url", wide: true })}${modalUploadField("Main project photo", "mainImageFile", { savedCount: current.mainImage ? 1 : 0, guidance: "Recommended 1600 x 1000 px. Selecting a new photo replaces the current one." })}${modalUploadField("Project thumbnail", "thumbnailFile", { savedCount: current.thumbnail ? 1 : 0, guidance: "Recommended 1200 x 900 px. Selecting a new photo replaces the current one." })}${modalUploadField("Project gallery", "galleryFiles", { multiple: true, wide: true, savedCount: Array.isArray(current.gallery) ? current.gallery.length : 0, guidance: "Select multiple photos together. New photos are added to the saved gallery." })}<p class="helper field--wide">Select up to three homepage highlights. Each uploaded photo can be up to 10 MB.</p>`;
  } else if (type === "certificates") {
    fields = `${translatableDirectField("Title", "title", current)}${translatableDirectField("Category", "category", current)}${directField("Issuer", "issuer", current.issuer)}${directField("Publication year", "year", current.year, { type: "number" })}${commonStatus}${modalUploadField("Certificate photo", "certificateFile", { wide: true, savedCount: current.imageUrl ? 1 : 0, guidance: "Recommended 1600 x 1100 px. Selecting a new photo replaces the current one." })}`;
  } else if (type === "testimonials") {
    fields = `${directField("Name or attribution", "name", current.name)}${translatableDirectField("Collaboration context", "context", current)}${commonStatus}${translatableDirectField("Feedback", "quote", current, { type: "textarea", wide: true })}`;
  } else {
    const descriptions = current.descriptions?.length ? current.descriptions : String(current.description || "").split(/\n+/).filter(Boolean);
    fields = `${translatableDirectField("Job title", "title", current)}${directField("Organization", "organization", current.organization)}${directSelect("Category", "category", current.category, (state.content.experienceCategories || []).filter((category) => category !== "All"))}${commonStatus}${directField("Start month", "startMonth", current.startMonth, { type: "month" })}${directField("End month", "endMonth", current.endMonth, { type: "month" })}${directField("Current position", "current", current.current, { type: "checkbox", wide: true })}${translatableRepeatableField("Description points", "descriptions", "descriptionsId", descriptions, current.descriptionsId || [], "Add a responsibility, outcome, or scope", "Tambahkan tanggung jawab, hasil, atau ruang lingkup")}${repeatableField("Skills", "skills", current.skills || [], "Add a skill")}`;
  }
  const itemLabel = type === "experience" ? "experience" : type === "testimonials" ? "feedback" : type.slice(0, -1);
  document.querySelector("#modal-root").innerHTML = `<div class="modal-backdrop"><form class="modal" id="item-editor"><div class="modal-header"><h2>${index >= 0 ? "Edit" : "Add"} ${safe(itemLabel)}</h2><button class="small-button" type="button" id="close-modal">Close</button></div><div class="field-grid">${fields}</div><div class="modal-actions"><button class="button button--outline" type="button" id="cancel-modal">Cancel</button><button class="button" type="submit">Apply changes</button></div></form></div>`;
  const close = () => { document.querySelector("#modal-root").innerHTML = ""; };
  document.querySelector("#close-modal").addEventListener("click", close);
  document.querySelector("#cancel-modal").addEventListener("click", close);
  document.querySelectorAll("[data-add-repeatable]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.addRepeatable;
    const list = button.closest("[data-repeatable]").querySelector(".repeatable-list");
    list.insertAdjacentHTML("beforeend", `<div class="repeatable-row"><input name="${safe(key)}[]" placeholder="${safe(button.dataset.placeholder)}" /><button class="small-button danger" type="button" data-remove-repeatable>Delete</button></div>`);
  }));
  document.querySelector("#item-editor").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-repeatable]");
    if (button) button.closest(".repeatable-row").remove();
  });
  document.querySelectorAll(".modal-file-input").forEach((input) => input.addEventListener("change", () => {
    const files = [...(input.files || [])];
    const status = document.querySelector(`[data-file-status-for='${input.name}']`);
    const picker = input.previousElementSibling;
    if (!status || !files.length) return;
    status.textContent = files.length === 1 ? files[0].name : `${files.length} photos selected`;
    picker?.classList.add("has-selection");
  }));
  document.querySelector("#item-editor").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Applying...";
    const data = new FormData(event.currentTarget);
    const updated = { ...current, ...Object.fromEntries(data.entries()) };
    delete updated.mainImageFile;
    delete updated.thumbnailFile;
    delete updated.galleryFiles;
    delete updated.certificateFile;
    delete updated["descriptions[]"];
    delete updated["descriptionsId[]"];
    delete updated["skills[]"];
    try {
      if (!state.demo && type === "projects") {
        const mainFile = event.currentTarget.elements.mainImageFile.files[0];
        const thumbnailFile = event.currentTarget.elements.thumbnailFile.files[0];
        const galleryFiles = [...event.currentTarget.elements.galleryFiles.files];
        if (mainFile) updated.mainImage = await uploadFile(mainFile, "projects/main", state.token);
        if (thumbnailFile) updated.thumbnail = await uploadFile(thumbnailFile, "projects/thumbnails", state.token);
        if (galleryFiles.length) {
          const uploaded = [];
          for (const file of galleryFiles) uploaded.push(await uploadFile(file, "projects/gallery", state.token));
          updated.gallery = [...(current.gallery || []), ...uploaded];
        }
      }
      if (!state.demo && type === "certificates") {
        const certificateFile = event.currentTarget.elements.certificateFile.files[0];
        if (certificateFile) updated.imageUrl = await uploadFile(certificateFile, "certificates", state.token);
      }
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = "Apply changes";
      showNotice(error.message, "error");
      return;
    }
    if (type === "projects") {
      updated.gallery = Array.isArray(updated.gallery)
        ? updated.gallery.filter(Boolean)
        : String(updated.gallery || "").split(/\n+/).map((value) => value.trim()).filter(Boolean);
      updated.highlighted = data.get("highlighted") === "on";
      const otherHighlights = state.content.projects.filter((project, projectIndex) => projectIndex !== index && project.highlighted).length;
      if (updated.highlighted && otherHighlights >= 3) {
        submitButton.disabled = false;
        submitButton.textContent = "Apply changes";
        showNotice("Only three projects can be highlighted. Remove one highlight first.", "error");
        return;
      }
      updated.order = current.order || itemArray(type).length + 1;
    } else if (type === "certificates" || type === "testimonials") {
      updated.order = current.order || itemArray(type).length + 1;
    } else if (type === "experience") {
      updated.current = data.get("current") === "on";
      updated.descriptions = data.getAll("descriptions[]").map((value) => value.trim()).filter(Boolean);
      updated.description = updated.descriptions.join("\n");
      if (bilingualEnabled()) updated.descriptionsId = data.getAll("descriptionsId[]").map((value) => value.trim()).filter(Boolean);
      updated.skills = data.getAll("skills[]").map((value) => value.trim()).filter(Boolean);
      if (updated.current) updated.endMonth = "";
    }
    if (index >= 0) itemArray(type)[index] = updated;
    else itemArray(type).push(updated);
    markDirty();
    close();
    renderAdmin();
  });
}

function deleteItem(type, index) {
  const item = itemArray(type)[index];
  if (!item) return;
  const labels = { projects: "project", certificates: "certificate", experience: "experience", testimonials: "feedback" };
  const label = labels[type] || "item";
  const itemName = item.title || item.name || "Untitled item";
  openConfirmModal({
    eyebrow: `Delete ${label}`,
    title: `Delete ${label}?`,
    summary: `“${itemName}” will be removed from the CMS.`,
    message: "Uploaded files will stay in storage. The item is removed after you save changes.",
    confirmLabel: `Delete ${label}`,
    busyLabel: "Deleting...",
    onConfirm: () => {
      itemArray(type).splice(index, 1);
      markDirty();
      renderAdmin();
    },
  });
}

function moveItem(type, index, direction) {
  const items = itemArray(type);
  const next = index + direction;
  if (next < 0 || next >= items.length) return;
  [items[index], items[next]] = [items[next], items[index]];
  items.forEach((item, itemIndex) => { if ("order" in item) item.order = itemIndex + 1; });
  markDirty();
  renderAdmin();
}

async function handleUpload(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file || input.disabled) return;
  if (state.demo) {
    showNotice("Supabase is required for uploads. Add config.js, then sign in with an authorized account.", "error");
    return;
  }
  const preview = document.querySelector(`[data-preview-for='${input.dataset.uploadPath}']`);
  const previous = getAtPath(state.content, input.dataset.uploadPath);
  const status = document.createElement("span");
  status.className = "helper";
  status.dataset.uploadStatus = "";
  status.setAttribute("role", "status");
  status.textContent = "Uploading...";
  const field = input.closest(".upload-field");
  field?.querySelectorAll("[data-upload-status]").forEach((item) => item.remove());
  (field || preview)?.append(status);
  input.disabled = true;
  try {
    const url = await uploadFile(file, input.dataset.uploadFolder, state.token);
    setAtPath(state.content, input.dataset.uploadPath, url);
    markDirty();
    renderAdmin();
    showNotice("Upload complete. Save changes to attach the uploaded URL to the CMS record.", "success");
  } catch (error) {
    setAtPath(state.content, input.dataset.uploadPath, previous);
    status.textContent = error.message;
    status.setAttribute("role", "alert");
    showNotice(error.message, "error");
  } finally {
    input.disabled = false;
    input.value = "";
    if (status.textContent === "Uploading...") status.remove();
  }
}

function validateBilingualContent(content) {
  if (!content.site?.languages?.enabled) return [];
  const missing = [];
  const requireValue = (value, label) => {
    const complete = Array.isArray(value) ? value.some((item) => String(item || "").trim()) : String(value || "").trim();
    if (!complete) missing.push(label);
  };

  [
    [content.site.descriptionId, "Header & Footer: browser description (ID)"],
    [content.site.ctaLabelId, "Header & Footer: call-to-action label (ID)"],
    [content.site.runningTextId, "Running text: scrolling message (ID)"],
    [content.site.footerNoteId, "Header & Footer: footer note (ID)"],
    [content.home.greetingId, "Home: greeting (ID)"],
    [content.home.roleId, "Home: profession (ID)"],
    [content.home.primaryCtaLabelId, "Home: primary button label (ID)"],
    [content.home.cvLabelId, "Home: CV button label (ID)"],
    [content.home.quoteId, "Home: hero quote (ID)"],
    [content.about.titleId, "About Me: title (ID)"],
    [content.about.subtitleId, "About Me: subtitle (ID)"],
    [content.about.buttonLabelId, "About Me: button label (ID)"],
    [content.about.paragraphsId, "About Me: body paragraphs (ID)"],
    [content.certificateTitleId, "Certificates: heading (ID)"],
    [content.certificateSubtitleId, "Certificates: supporting text (ID)"],
    [content.testimonialTitleId, "What They Say: heading (ID)"],
    [content.testimonialSubtitleId, "What They Say: supporting text (ID)"],
    [content.contact.titleId, "Contact: title (ID)"],
    [content.contact.subtitleId, "Contact: subtitle (ID)"],
    [content.contact.emailLabelId, "Contact: email button label (ID)"],
  ].forEach(([value, label]) => requireValue(value, label));

  (content.site.navigation || []).forEach((item, index) => requireValue(item.labelId, `Navigation ${index + 1}: label (ID)`));
  (content.home.stats || []).forEach((item, index) => requireValue(item.labelId, `Statistic ${index + 1}: label (ID)`));
  (content.projectCategories || []).forEach((category) => requireValue(content.categoryTranslations?.project?.[category], `Project category "${category}" (ID)`));
  (content.experienceCategories || []).forEach((category) => requireValue(content.categoryTranslations?.experience?.[category], `Experience category "${category}" (ID)`));

  (content.projects || []).filter((item) => (item.status || "published") === "published").forEach((item) => {
    requireValue(item.titleId, `Project "${item.title || "Untitled"}": title (ID)`);
    requireValue(item.descriptionId, `Project "${item.title || "Untitled"}": description (ID)`);
    requireValue(item.challengeId, `Project "${item.title || "Untitled"}": challenge (ID)`);
  });
  (content.certificates || []).filter((item) => (item.status || "published") === "published").forEach((item) => {
    requireValue(item.titleId, `Certificate "${item.title || "Untitled"}": title (ID)`);
    requireValue(item.categoryId, `Certificate "${item.title || "Untitled"}": category (ID)`);
  });
  (content.experiences || []).filter((item) => (item.status || "published") === "published").forEach((item) => {
    requireValue(item.titleId, `Experience "${item.title || "Untitled"}": job title (ID)`);
    requireValue(item.descriptionsId, `Experience "${item.title || "Untitled"}": description (ID)`);
  });
  (content.testimonials || []).filter((item) => (item.status || "published") === "published").forEach((item) => {
    requireValue(item.contextId, `Feedback from "${item.name || "Anonymous"}": context (ID)`);
    requireValue(item.quoteId, `Feedback from "${item.name || "Anonymous"}": quote (ID)`);
  });

  return missing;
}

async function persist() {
  if (state.saving) return;
  const missingTranslations = validateBilingualContent(state.content);
  if (missingTranslations.length) {
    const preview = missingTranslations.slice(0, 3).join("; ");
    showNotice(`Complete ${missingTranslations.length} Indonesian translation field${missingTranslations.length === 1 ? "" : "s"} before saving. ${preview}${missingTranslations.length > 3 ? "; ..." : ""}`, "error");
    return;
  }
  if (state.demo) {
    showNotice("Preview mode cannot save. Configure Supabase and sign in first.", "error");
    return;
  }
  state.saving = true;
  const button = document.querySelector("#save");
  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }
  try {
    const saved = await saveContent(state.content, state.token, state.updatedAt);
    state.updatedAt = saved.updated_at || state.updatedAt;
    state.dirty = false;
    showNotice("Changes saved. Published content is now available to the public portfolio.", "success");
    if (button) button.textContent = "Saved";
  } catch (error) {
    showNotice(error.message, "error");
    if (button) button.textContent = "Save changes";
  } finally {
    state.saving = false;
    if (button) button.disabled = false;
  }
}

function showNotice(message, type = "") {
  const area = document.querySelector("#notice-area");
  if (!area) return;
  area.innerHTML = `<div class="notice ${safe(type)}">${safe(message)}</div>`;
  window.setTimeout(() => { if (area) area.innerHTML = ""; }, 6000);
}

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

window.addEventListener("hashchange", () => {
  if (window.location.hash) initializeAccount();
});
initializeAccount();
