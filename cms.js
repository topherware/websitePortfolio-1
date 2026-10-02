const demoContent = {
  site: {
    name: "Your Portfolio",
    description: "Independent product designer portfolio",
    descriptionId: "Portofolio desainer produk independen",
    logoUrl: "",
    languages: { enabled: true, defaultLanguage: "en" },
    navigation: [
      { label: "Home", labelId: "Beranda", href: "#home" },
      { label: "About", labelId: "Tentang", href: "#about" },
      { label: "Experience", labelId: "Pengalaman", href: "#experience" },
      { label: "Projects", labelId: "Proyek", href: "#projects" },
      { label: "Certificates", labelId: "Sertifikat", href: "#certificates" },
      { label: "Contact", labelId: "Kontak", href: "#contact" },
    ],
    ctaLabel: "Chat with me",
    ctaLabelId: "Hubungi saya",
    ctaHref: "#contact",
    runningText: "UX Design + App Design + Dashboard + Wireframe + User Research +",
    runningTextId: "Desain UX + Desain Aplikasi + Dashboard + Wireframe + Riset Pengguna +",
    footerNote: "Copyright 2026. All rights reserved.",
    footerNoteId: "Hak cipta 2026. Seluruh hak dilindungi.",
  },
  home: {
    greeting: "Hello!",
    greetingId: "Halo!",
    name: "Your Name",
    role: "Product Designer",
    roleId: "Desainer Produk",
    quote: "Thoughtful product design turns complex ideas into useful, memorable experiences.",
    quoteId: "Desain produk yang matang mengubah ide kompleks menjadi pengalaman yang berguna dan berkesan.",
    portraitUrl: "",
    cvLabel: "Download CV",
    cvLabelId: "Unduh CV",
    cvUrl: "",
    primaryCtaLabel: "Portfolio",
    primaryCtaLabelId: "Portofolio",
    stats: [
      { value: "10+", label: "Years Experience", labelId: "Tahun Pengalaman" },
      { value: "45+", label: "Projects Completed", labelId: "Proyek Selesai" },
      { value: "3.9", label: "GPA", labelId: "IPK" },
    ],
  },
  about: {
    title: "About me",
    titleId: "Tentang saya",
    subtitle: "Design with a clear point of view",
    subtitleId: "Desain dengan sudut pandang yang jelas",
    paragraphs: [
      "I connect product strategy, user research, interaction design, and visual craft to create experiences people understand quickly.",
      "Every decision is grounded in context, accessibility, and measurable product outcomes.",
    ],
    paragraphsId: [
      "Saya menghubungkan strategi produk, riset pengguna, desain interaksi, dan visual untuk membuat pengalaman yang cepat dipahami.",
      "Setiap keputusan didasarkan pada konteks, aksesibilitas, dan hasil produk yang terukur.",
    ],
    photoUrl: "",
    buttonLabel: "Experience",
    buttonLabelId: "Pengalaman",
    buttonHref: "#experience",
  },
  services: [
    { title: "UI/UX Design", description: "Interfaces shaped around real user needs.", imageUrl: "" },
    { title: "Web Design", description: "Responsive product and marketing experiences.", imageUrl: "" },
    { title: "Landing Pages", description: "Focused stories that turn attention into action.", imageUrl: "" },
  ],
  projectCategories: ["All", "Product Design", "Landing Page", "Mobile App"],
  categoryTranslations: {
    project: { All: "Semua", "Product Design": "Desain Produk", "Landing Page": "Landing Page", "Mobile App": "Aplikasi Mobile" },
    experience: { All: "Semua", "Product Design": "Desain Produk", Research: "Riset" },
  },
  projects: [
    {
      title: "Food Delivery Experience",
      titleId: "Pengalaman Pesan Antar Makanan",
      slug: "food-delivery-experience",
      category: "Product Design",
      description: "A clear, appetizing ordering flow designed to reduce friction from discovery to checkout.",
      descriptionId: "Alur pemesanan yang jelas dan menarik untuk mengurangi hambatan dari pencarian hingga pembayaran.",
      challenge: "Balance dense menu choices with a fast path to a confident purchase.",
      challengeId: "Menyeimbangkan banyak pilihan menu dengan jalur cepat menuju pembelian yang meyakinkan.",
      projectUrl: "",
      mainImage: "",
      thumbnail: "",
      gallery: [],
      highlighted: true,
      status: "published",
      order: 1,
    },
    {
      title: "Rural Finance Dashboard",
      titleId: "Dashboard Keuangan Pedesaan",
      slug: "rural-finance-dashboard",
      category: "Product Design",
      description: "An accessible financial overview for customers who need clarity before complexity.",
      descriptionId: "Ringkasan keuangan yang mudah diakses untuk pengguna yang membutuhkan kejelasan sebelum kompleksitas.",
      challenge: "Present unfamiliar financial concepts in a calm, trustworthy interface.",
      challengeId: "Menyajikan konsep keuangan yang belum familiar dalam antarmuka yang tenang dan tepercaya.",
      projectUrl: "",
      mainImage: "",
      thumbnail: "",
      gallery: [],
      highlighted: true,
      status: "published",
      order: 2,
    },
    {
      title: "Media Investment App",
      titleId: "Aplikasi Investasi Media",
      slug: "media-investment-app",
      category: "Mobile App",
      description: "A mobile investing concept pairing confident data presentation with simple actions.",
      descriptionId: "Konsep investasi mobile dengan penyajian data yang tegas dan tindakan yang sederhana.",
      challenge: "Make live market information useful without creating visual anxiety.",
      challengeId: "Membuat informasi pasar langsung tetap berguna tanpa menimbulkan kecemasan visual.",
      projectUrl: "",
      mainImage: "",
      thumbnail: "",
      gallery: [],
      highlighted: true,
      status: "published",
      order: 3,
    },
  ],
  certificateTitle: "Certificates & recognition",
  certificateTitleId: "Sertifikat & penghargaan",
  certificateSubtitle: "A record of continued learning and professional practice.",
  certificateSubtitleId: "Catatan pembelajaran berkelanjutan dan praktik profesional.",
  certificates: [
    { title: "Human-Centered Product Design", titleId: "Desain Produk Berpusat pada Manusia", category: "Product Design", categoryId: "Desain Produk", issuer: "Design Institute", year: "2025", imageUrl: "", status: "published", order: 1 },
    { title: "Accessible Interface Systems", titleId: "Sistem Antarmuka Aksesibel", category: "Accessibility", categoryId: "Aksesibilitas", issuer: "Interaction Academy", year: "2024", imageUrl: "", status: "published", order: 2 },
  ],
  experienceCategories: ["All", "Product Design", "Research"],
  experiences: [
    { title: "Lead Product Designer", titleId: "Lead Desainer Produk", organization: "Product Studio", startMonth: "2023-09", endMonth: "", current: true, descriptions: ["Leading end-to-end product design across research, systems, and delivery."], descriptionsId: ["Memimpin desain produk end-to-end dari riset, sistem, hingga delivery."], skills: ["Strategy", "Design Systems"], category: "Product Design", status: "published" },
    { title: "UI/UX Designer", titleId: "Desainer UI/UX", organization: "Digital Agency", startMonth: "2020-09", endMonth: "2023-07", current: false, descriptions: ["Designed responsive products for fast-moving client teams."], descriptionsId: ["Merancang produk responsif untuk tim klien yang bergerak cepat."], skills: ["Prototyping", "Research"], category: "Product Design", status: "published" },
    { title: "Experience Designer", titleId: "Desainer Pengalaman", organization: "Technology Company", startMonth: "2016-09", endMonth: "2020-07", current: false, descriptions: ["Built customer journeys and validated new service concepts."], descriptionsId: ["Membangun perjalanan pengguna dan memvalidasi konsep layanan baru."], skills: ["Journey Mapping", "Workshops"], category: "Research", status: "published" },
  ],
  testimonialTitle: "What they say about me",
  testimonialTitleId: "Apa kata mereka tentang saya",
  testimonialSubtitle: "Notes from people I have collaborated with across product strategy, design systems, and delivery.",
  testimonialSubtitleId: "Catatan dari orang-orang yang pernah berkolaborasi dengan saya dalam strategi produk, sistem desain, dan delivery.",
  testimonials: [
    { name: "Product teammate", context: "Cross-functional collaboration", contextId: "Kolaborasi lintas fungsi", quote: "A rare designer who can simplify a difficult problem without flattening its ambition.", quoteId: "Desainer langka yang mampu menyederhanakan masalah sulit tanpa mengurangi ambisinya.", status: "published", order: 1 },
    { name: "Engineering teammate", context: "Design and engineering collaboration", contextId: "Kolaborasi desain dan engineering", quote: "Clear decisions, excellent systems thinking, and a handoff our team could implement with confidence.", quoteId: "Keputusan yang jelas, pemikiran sistem yang kuat, dan handoff yang dapat diterapkan tim kami dengan percaya diri.", status: "published", order: 2 },
  ],
  posts: [
    { title: "Behind the scenes of a useful design system", category: "UI/UX Design", date: "2026-07-10", imageUrl: "", url: "#" },
    { title: "Designing financial tools for real-world confidence", category: "App Design", date: "2026-06-09", imageUrl: "", url: "#" },
    { title: "How to make research visible to the whole team", category: "Research", date: "2026-05-13", imageUrl: "", url: "#" },
  ],
  contact: {
    title: "Let us start a conversation",
    titleId: "Mari mulai percakapan",
    subtitle: "Chat about your next product",
    subtitleId: "Ceritakan produk berikutnya",
    email: "hello@example.com",
    phone: "",
    emailLabel: "Email me",
    emailLabelId: "Kirim email",
    phoneLabel: "Call me",
    phoneLabelId: "Telepon saya",
    socials: [
      { platform: "LinkedIn", url: "#" },
      { platform: "Instagram", url: "#" },
      { platform: "WhatsApp", url: "#" },
    ],
  },
};

const requiredNavigation = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Certificates", href: "#certificates" },
  { label: "Contact", href: "#contact" },
];

function normalizeContent(content) {
  const normalized = content || structuredClone(demoContent);
  normalized.site ||= {};
  normalized.site.languages = { enabled: false, defaultLanguage: "en", ...(normalized.site.languages || {}) };
  normalized.site.languages.defaultLanguage = normalized.site.languages.defaultLanguage === "id" ? "id" : "en";
  if (typeof normalized.site.runningText !== "string") normalized.site.runningText = "UX Design + App Design + Dashboard + Wireframe + User Research +";
  if (typeof normalized.site.runningTextId !== "string") normalized.site.runningTextId = "Desain UX + Desain Aplikasi + Dashboard + Wireframe + Riset Pengguna +";
  normalized.categoryTranslations ||= { project: {}, experience: {} };
  normalized.categoryTranslations.project ||= {};
  normalized.categoryTranslations.experience ||= {};
  normalized.categoryTranslations.project.All ||= "Semua";
  normalized.categoryTranslations.experience.All ||= "Semua";
  const existingNavigation = Array.isArray(normalized.site.navigation) ? normalized.site.navigation : [];
  normalized.site.navigation = requiredNavigation.map((fallback) => {
    const existing = existingNavigation.find((item) => item?.href === fallback.href);
    return { label: existing?.label || fallback.label, labelId: existing?.labelId || "", href: fallback.href };
  });
  if (!normalized.site.ctaLabel || normalized.site.ctaLabel.toLowerCase() === "hire me") normalized.site.ctaLabel = "Chat with me";
  const projects = normalized.projects || [];
  const allowedHighlights = new Set(
    projects
      .filter((project) => project.highlighted)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .slice(0, 3),
  );
  normalized.projects = projects.map((project) => ({ ...project, highlighted: allowedHighlights.has(project) }));
  normalized.certificates = (normalized.certificates || []).map((certificate) => ({ issuer: "", year: "", ...certificate }));
  normalized.experiences = (normalized.experiences || []).map((experience) => ({
    ...experience,
    descriptions: Array.isArray(experience.descriptions)
      ? experience.descriptions
      : String(experience.description || "").split(/\n+/).map((value) => value.trim()).filter(Boolean),
    skills: Array.isArray(experience.skills) ? experience.skills : [],
  }));
  normalized.testimonialTitle ||= "What they say about me";
  normalized.testimonialSubtitle ||= "Notes from people I have collaborated with across product strategy, design systems, and delivery.";
  normalized.testimonials = (normalized.testimonials || []).map((testimonial, index) => ({
    ...testimonial,
    name: testimonial.name || "",
    context: testimonial.context || testimonial.role || "",
    quote: testimonial.quote || "",
    status: testimonial.status || "published",
    order: testimonial.order || index + 1,
  }));
  return normalized;
}

const cleanUrl = (value) => {
  if (!value || value === "#") return "";
  try {
    const parsed = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) ? value : "";
  } catch {
    return "";
  }
};

const config = window.__PORTFOLIO_CONFIG__ || {};

export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes("YOUR_PROJECT"));
}

function headers(token) {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${token || config.supabaseAnonKey}`,
    "Content-Type": "application/json",
  };
}

const missingSiteMessage = "Portfolio record 'site' is missing or inaccessible. Ask the seller to run supabase-seed.sql and verify administrator access. Your edits have not been saved.";

export async function loadContentRecord(token = "") {
  if (!isSupabaseConfigured()) return { content: normalizeContent(structuredClone(demoContent)), updatedAt: "" };
  const endpoint = token ? "portfolio_content" : "portfolio_public_content";
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${endpoint}?id=eq.site&select=content,updated_at`, { headers: headers(token) });
  if (!response.ok) throw new Error(`CMS load failed (${response.status})`);
  const rows = await response.json();
  if (token && !rows.length) throw new Error(missingSiteMessage);
  return {
    content: normalizeContent(rows[0]?.content || structuredClone(demoContent)),
    updatedAt: rows[0]?.updated_at || "",
  };
}

export async function loadContent(token = "") {
  if (!isSupabaseConfigured()) return structuredClone(demoContent);
  return (await loadContentRecord(token)).content;
}

export async function login(email, password) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured. Copy config.example.js to config.js and add your project values.");
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error_description || result.msg || "Login failed");
  const check = await fetch(`${config.supabaseUrl}/rest/v1/admin_users?user_id=eq.${result.user.id}&select=user_id`, { headers: headers(result.access_token) });
  const admins = await check.json();
  if (!check.ok || !admins.length) throw new Error("This account is not an authorized portfolio administrator.");
  return result;
}

export async function saveContent(content, token, previousUpdatedAt = "") {
  if (!isSupabaseConfigured()) throw new Error("Supabase configuration is required before content can be saved.");
  const suffix = previousUpdatedAt ? `&updated_at=eq.${encodeURIComponent(previousUpdatedAt)}` : "";
  const response = await fetch(`${config.supabaseUrl}/rest/v1/portfolio_content?id=eq.site${suffix}`, {
    method: "PATCH",
    headers: { ...headers(token), Prefer: "return=representation" },
    body: JSON.stringify({ content, updated_at: new Date().toISOString() }),
  });
  const rows = await response.json();
  if (!response.ok) throw new Error(rows.message || "Save failed");
  if (!rows.length) {
    // An empty PATCH can mean a missing/hidden row, a denied update, or a stale revision.
    const check = await fetch(`${config.supabaseUrl}/rest/v1/portfolio_content?id=eq.site&select=updated_at`, { headers: headers(token) });
    if (!check.ok) throw new Error("Save could not be verified. Keep a copy of your edits and check your session and administrator access.");
    const current = await check.json();
    if (!current.length) throw new Error(missingSiteMessage);
    if (previousUpdatedAt && current[0].updated_at !== previousUpdatedAt) {
      throw new Error("Save conflict: content changed in another session. Copy your unsaved edits before reloading.");
    }
    throw new Error("Save was not permitted. Ask the seller to check admin_users and the portfolio_content update policy. Your edits have not been saved.");
  }
  return rows[0];
}

export async function uploadFile(file, folder, token) {
  const allowedImages = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const isCv = folder === "cv";
  if (file.size > 10 * 1024 * 1024) throw new Error("Maximum file size is 10 MB.");
  if (isCv ? file.type !== "application/pdf" : !allowedImages.includes(file.type)) throw new Error(isCv ? "CV must be a PDF." : "Use JPG, PNG, WebP, or GIF.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
  const response = await fetch(`${config.supabaseUrl}/storage/v1/object/${config.storageBucket || "portfolio"}/${path}`, {
    method: "POST",
    headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upsert": "false" },
    body: file,
    signal: controller.signal,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const message = result.message || result.error || "";
    if (/bucket.*not found/i.test(message)) throw new Error(`Storage bucket '${config.storageBucket || "portfolio"}' was not found. Ask the seller to create the bucket and check Storage settings.`);
    if (response.status === 401 || /jwt|token.*expired/i.test(message)) throw new Error("Your session has expired or is invalid. Copy your unsaved edits, sign in again, and retry the upload.");
    if (response.status === 403 || /row.level security|unauthorized/i.test(message)) throw new Error("Upload permission denied. Ask the seller to check admin_users and the Storage INSERT policy.");
    throw new Error(message || `Upload failed (${response.status}). Please try again.`);
  }
  return `${config.supabaseUrl}/storage/v1/object/public/${config.storageBucket || "portfolio"}/${path}`;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Upload timed out after 60 seconds. Check your connection and try again with a smaller file.");
    if (error instanceof TypeError) throw new Error("Unable to connect to Storage. Check your connection and try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export { cleanUrl, demoContent, normalizeContent };
