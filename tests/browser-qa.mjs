import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
const outputDirectory = new URL("../artifacts/qa/", import.meta.url);
const longProjectCopy = [
  "This is a deliberately long case-study paragraph used to verify that detailed project context remains readable when an editor adds several sentences about constraints, decisions, research findings, and delivery trade-offs.\nA second paragraph confirms that intentional line breaks remain visible instead of collapsing into one dense block.",
  "The project description can also grow substantially when the team documents discovery, prototyping, usability testing, iteration, collaboration, and measurable outcomes. ThisUnusuallyLongUnbrokenReferenceMustWrapWithoutCreatingHorizontalOverflowInTheProjectDetailLayout.",
];
const viewports = [
  { name: "desktop-wide-1920", width: 1920, height: 1000 },
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "laptop-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 720 },
];

await mkdir(outputDirectory, { recursive: true });
const outputPath = (name) => fileURLToPath(new URL(name, outputDirectory));

const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
let failed = false;

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("config.js")) consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
    });

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      bodyWidth: document.body.scrollWidth,
      htmlWidth: document.documentElement.scrollWidth,
      logoWidth: document.querySelector(".brand-mark img")?.getBoundingClientRect().width || 0,
      portraitFit: getComputedStyle(document.querySelector(".portrait-image") || document.querySelector(".portrait-placeholder")).objectFit,
      portraitHeadTopRatio: (() => {
        const placeholder = document.querySelector(".portrait-placeholder");
        if (!placeholder) return 1;
        return parseFloat(getComputedStyle(placeholder, "::before").top) / placeholder.getBoundingClientRect().height;
      })(),
      aboutTorso: (() => {
        const placeholder = document.querySelector(".about-placeholder");
        if (!placeholder) return { content: "none", heightRatio: 1 };
        const style = getComputedStyle(placeholder, "::after");
        return {
          content: style.content,
          heightRatio: parseFloat(style.height) / placeholder.getBoundingClientRect().height,
        };
      })(),
    }));
    const overflow = Math.max(layout.bodyWidth, layout.htmlWidth) - layout.viewportWidth;
    assert.ok(layout.portraitHeadTopRatio >= 0.05, `${viewport.name}: placeholder head is clipped at the top`);
    assert.notEqual(layout.aboutTorso.content, "none", `${viewport.name}: About placeholder has no torso shape`);
    assert.ok(layout.aboutTorso.heightRatio >= 0.55, `${viewport.name}: About placeholder torso is too short`);

    const homepageStructure = await page.evaluate(() => {
      const about = document.querySelector("#about");
      const experience = document.querySelector("#experience");
      const projects = document.querySelector("#projects");
      const certificates = document.querySelector("#certificates");
      const testimonials = document.querySelector("#testimonials");
      const marquee = document.querySelector(".marquee--final");
      const footer = document.querySelector("#contact.site-footer");
      const emailButton = document.querySelector(".footer-email-button");
      const emailArrow = emailButton?.querySelector(".arrow");
      const emailButtonRect = emailButton?.getBoundingClientRect();
      const emailArrowRect = emailArrow?.getBoundingClientRect();
      return {
        aboutBeforeExperience: Boolean(about && experience && (about.compareDocumentPosition(experience) & Node.DOCUMENT_POSITION_FOLLOWING)),
        marqueeAfterProjects: Boolean(projects && marquee && (projects.compareDocumentPosition(marquee) & Node.DOCUMENT_POSITION_FOLLOWING)),
        marqueeBeforeCertificates: Boolean(marquee && certificates && (marquee.compareDocumentPosition(certificates) & Node.DOCUMENT_POSITION_FOLLOWING)),
        marqueeBeforeFooter: Boolean(marquee && footer && (marquee.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING)),
        testimonialFooterGap: testimonials && footer ? footer.getBoundingClientRect().top - testimonials.getBoundingClientRect().bottom : 0,
        footerEmailDisplay: emailButton ? getComputedStyle(emailButton).display : "",
        footerEmailArrowDelta: emailButtonRect && emailArrowRect ? Math.abs((emailButtonRect.top + emailButtonRect.height / 2) - (emailArrowRect.top + emailArrowRect.height / 2)) : 999,
        contactBandCount: document.querySelectorAll(".contact-band").length,
        postsCount: document.querySelectorAll(".posts").length,
        servicesCount: document.querySelectorAll(".services").length,
        highlightCount: document.querySelectorAll("#highlight.project-highlight").length,
        highlightCardCount: document.querySelectorAll("#highlight .highlight-card").length,
        testimonialHeading: document.querySelector(".testimonials .section-title")?.textContent.replace(/\s+/g, " ").trim() || "",
        testimonialStars: document.querySelectorAll(".testimonials .stars").length,
        certificateMetadata: [...document.querySelectorAll(".certificate-meta")].map((element) => element.textContent.trim()),
        experienceOrganizations: [...document.querySelectorAll("#experience-list .timeline-company h3")].map((element) => element.textContent.trim()),
        projectVisuals: [...document.querySelectorAll(".project-image")].map((element) => {
          const rect = element.getBoundingClientRect();
          return { display: getComputedStyle(element).display, width: rect.width, height: rect.height };
        }),
        footerNoteCount: document.querySelectorAll(".footer-note span").length,
        footerText: document.querySelector(".footer-note")?.textContent || "",
        marqueeText: document.querySelector(".marquee-track span")?.textContent.trim() || "",
        navColumns: (() => {
          const left = document.querySelector(".nav-shell > .nav-list")?.getBoundingClientRect();
          const right = document.querySelector(".nav-right")?.getBoundingClientRect();
          return left && right ? { left: left.width, right: right.width } : null;
        })(),
      };
    });
    assert.equal(homepageStructure.aboutBeforeExperience, true, `${viewport.name}: About must appear before Experience`);
    assert.equal(homepageStructure.marqueeAfterProjects, true, `${viewport.name}: marquee must follow projects`);
    assert.equal(homepageStructure.marqueeBeforeCertificates, true, `${viewport.name}: marquee must appear before certificates`);
    assert.equal(homepageStructure.marqueeBeforeFooter, true, `${viewport.name}: marquee must stay before footer`);
    assert.ok(homepageStructure.testimonialFooterGap >= 24, `${viewport.name}: testimonials and footer need visible spacing`);
    assert.equal(homepageStructure.footerEmailDisplay, "inline-flex", `${viewport.name}: email button must use inline-flex`);
    assert.ok(homepageStructure.footerEmailArrowDelta <= 2, `${viewport.name}: email button arrow is not vertically aligned`);
    assert.equal(homepageStructure.contactBandCount, 0, `${viewport.name}: project idea section still exists`);
    assert.equal(homepageStructure.postsCount, 0, `${viewport.name}: blog section still exists`);
    assert.equal(homepageStructure.servicesCount, 0, `${viewport.name}: services section still exists`);
    assert.equal(homepageStructure.highlightCount, 1, `${viewport.name}: highlight section missing`);
    assert.equal(homepageStructure.highlightCardCount, 3, `${viewport.name}: highlight must show three projects`);
    assert.match(homepageStructure.testimonialHeading, /What they say about me/i);
    assert.equal(homepageStructure.testimonialStars, 0, `${viewport.name}: testimonial ratings must be removed`);
    assert.ok(homepageStructure.certificateMetadata.every((value) => /202[0-9]/.test(value)), `${viewport.name}: certificate year is missing`);
    assert.deepEqual(homepageStructure.experienceOrganizations, ["Product Studio", "Digital Agency", "Technology Company"]);
    assert.ok(homepageStructure.projectVisuals.every((visual) => visual.display !== "inline" && visual.width > 200 && visual.height > 170 && visual.height < 380), `${viewport.name}: project visuals are not compact`);
    assert.equal(homepageStructure.footerNoteCount, 1, `${viewport.name}: footer should only keep the copyright note`);
    assert.doesNotMatch(homepageStructure.footerText, /Portfolio template|Privacy Policy/i);
    assert.equal(homepageStructure.marqueeText, "UX Design + App Design + Dashboard + Wireframe + User Research +");
    assert.ok(homepageStructure.navColumns, `${viewport.name}: grouped navbar structure is missing`);
    if (viewport.width > 820) assert.ok(Math.abs(homepageStructure.navColumns.left - homepageStructure.navColumns.right) <= 2, `${viewport.name}: navbar side columns are unbalanced`);

    assert.ok(await page.locator(".language-switch").isVisible(), `${viewport.name}: language switch is missing`);
    const languageSwitchStyle = await page.locator(".language-switch").evaluate((element) => {
      const style = getComputedStyle(element);
      const active = element.querySelector("button.active");
      const activeStyle = active ? getComputedStyle(active) : null;
      const rect = element.getBoundingClientRect();
      const thumbRect = element.querySelector(".language-switch-thumb")?.getBoundingClientRect();
      const navRect = document.querySelector(".nav-shell")?.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        background: style.backgroundColor,
        activeBackground: activeStyle?.backgroundColor || "",
        className: element.className,
        thumbCount: element.querySelectorAll(".language-switch-thumb").length,
        thumbWidth: thumbRect?.width || 0,
        thumbHeight: thumbRect?.height || 0,
        thumbVerticalClearance: thumbRect ? thumbRect.top - rect.top : 0,
        parentClass: element.parentElement?.className || "",
        nestedInNav: Boolean(element.closest(".nav-shell")),
        gapFromNav: navRect ? rect.left - navRect.right : -1,
      };
    });
    assert.ok(languageSwitchStyle.width <= 96 && languageSwitchStyle.height <= 56, `${viewport.name}: floating language switch is oversized`);
    assert.notEqual(languageSwitchStyle.background, "rgba(0, 0, 0, 0)", `${viewport.name}: floating language switch has no surface`);
    assert.equal(languageSwitchStyle.activeBackground, "rgba(0, 0, 0, 0)", `${viewport.name}: language button should rely on the sliding thumb`);
    assert.match(languageSwitchStyle.parentClass, /site-header/);
    assert.equal(languageSwitchStyle.nestedInNav, false, `${viewport.name}: language switch is still nested inside the navbar`);
    assert.ok(languageSwitchStyle.gapFromNav >= 8, `${viewport.name}: language switch is not separated from the navbar`);
    assert.match(languageSwitchStyle.className, /language-switch--en/);
    assert.equal(languageSwitchStyle.thumbCount, 1);
    assert.ok(Math.abs(languageSwitchStyle.thumbWidth - languageSwitchStyle.thumbHeight) <= 1, `${viewport.name}: orange toggle indicator is not circular`);
    assert.ok(languageSwitchStyle.thumbVerticalClearance >= 5, `${viewport.name}: orange toggle indicator is too close to the track edge`);
    await page.locator('[data-language="id"]').click();
    assert.equal(await page.locator("html").getAttribute("lang"), "id");
    assert.match(await page.locator(".language-switch").getAttribute("class"), /language-switch--id/);
    assert.equal((await page.locator(".hello-pill").textContent()).trim(), "Halo!");
    assert.equal((await page.locator(".marquee-track span").first().textContent()).trim(), "Desain UX + Desain Aplikasi + Dashboard + Wireframe + Riset Pengguna +");
    await page.locator('[data-language="en"]').click();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.match(await page.locator(".language-switch").getAttribute("class"), /language-switch--en/);

    if (viewport.width <= 768) {
      await page.locator(".menu-toggle").click();
      assert.equal(await page.locator(".nav-list.open").count(), 2, `${viewport.name}: mobile navigation did not open`);
      await page.locator(".menu-toggle").click();
    }

    const productFilter = page.locator('[data-filter-target="projects"] [data-filter="Product Design"]');
    if (await productFilter.count()) {
      await productFilter.click();
      const visibleCategories = await page.locator("#projects-list [data-category]:visible").evaluateAll((cards) => cards.map((card) => card.dataset.category));
      assert.ok(visibleCategories.every((category) => category === "Product Design"), `${viewport.name}: project filter mismatch`);
      await page.locator('[data-filter-target="projects"] [data-filter="All"]').click();
    }

    const researchFilter = page.locator('[data-filter-target="experience"] [data-filter="Research"]');
    if (await researchFilter.count()) {
      await researchFilter.click();
      const visibleCategories = await page.locator("#experience-list [data-category]:visible").evaluateAll((cards) => cards.map((card) => card.dataset.category));
      assert.ok(visibleCategories.every((category) => category === "Research"), `${viewport.name}: experience filter mismatch`);
      await page.locator('[data-filter-target="experience"] [data-filter="All"]').click();
    }

    const footerAlignment = await page.evaluate(() => {
      const footer = document.querySelector(".footer-note").getBoundingClientRect();
      const note = document.querySelector(".footer-note span").getBoundingClientRect();
      return Math.abs((footer.left + footer.width / 2) - (note.left + note.width / 2));
    });

    let headerGapRatio = 0;
    if (viewport.width >= 1440) {
      await page.waitForTimeout(750);
      headerGapRatio = await page.evaluate(() => {
        const shell = document.querySelector(".nav-shell").getBoundingClientRect();
        const brand = document.querySelector(".nav-shell > .brand").getBoundingClientRect();
        const left = [...document.querySelectorAll(".nav-shell > .nav-list .nav-link")];
        const right = [...document.querySelectorAll(".nav-right .nav-link")];
        const gaps = [left, right].flatMap((group) => {
          const centers = group.map((element) => {
            const rect = element.getBoundingClientRect();
            return rect.left + rect.width / 2;
          });
          return centers.slice(1).map((center, index) => center - centers[index]);
        });
        const brandCenterDelta = Math.abs((brand.left + brand.width / 2) - (shell.left + shell.width / 2));
        if (brandCenterDelta > 1) return 999;
        return Math.max(...gaps) / Math.min(...gaps);
      });
      assert.ok(headerGapRatio < 1.35, `desktop header spacing is uneven (${headerGapRatio.toFixed(2)} ratio)`);
      const timelineLayout = await page.locator("#experience-list").evaluate((timeline) => {
        const items = [...timeline.querySelectorAll(".timeline-item")];
        const timelineRect = timeline.getBoundingClientRect();
        const containerRect = timeline.closest(".container").getBoundingClientRect();
        const visibleContentRects = [...timeline.querySelectorAll(".timeline-company h3, .timeline-company p, .timeline-role h3, .timeline-role p, .timeline-role .skill-list")]
          .map((element) => element.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0);
        const visibleContentLeft = Math.min(...visibleContentRects.map((rect) => rect.left));
        const visibleContentRight = Math.max(...visibleContentRects.map((rect) => rect.right));
        const dots = items.map((item) => item.querySelector(".timeline-dot").getBoundingClientRect());
        const roles = items.map((item) => {
          const role = item.querySelector(".timeline-role");
          const style = getComputedStyle(role);
          return {
            background: style.backgroundColor,
            paddingTop: parseFloat(style.paddingTop),
            borderRadius: parseFloat(style.borderRadius),
          };
        });
        const itemRects = items.map((item) => item.getBoundingClientRect());
        const connectors = items.slice(0, -1).map((item) => {
          const style = getComputedStyle(item, "::before");
          const itemRect = item.getBoundingClientRect();
          return itemRect.left + parseFloat(style.left);
        });
        return {
          timelineWidth: timelineRect.width,
          timelineCenter: timelineRect.left + timelineRect.width / 2,
          containerCenter: containerRect.left + containerRect.width / 2,
          visibleContentCenter: (visibleContentLeft + visibleContentRight) / 2,
          gaps: itemRects.slice(1).map((rect, index) => rect.top - itemRects[index].bottom),
          dotCenters: dots.map((dot) => dot.left + dot.width / 2),
          connectors,
          roles,
        };
      });
      assert.ok(timelineLayout.timelineWidth <= 980, "desktop timeline is too wide to feel centered");
      assert.ok(Math.abs(timelineLayout.timelineCenter - timelineLayout.containerCenter) <= 1, "timeline container is not centered");
      assert.ok(Math.abs(timelineLayout.dotCenters[0] - (timelineLayout.containerCenter - timelineLayout.timelineWidth * 0.12)) <= 1, "desktop timeline axis must sit left of center to balance the longer role descriptions");
      assert.ok(timelineLayout.gaps.every((gap) => gap >= 40 && gap <= 56), `desktop timeline spacing is inconsistent (${timelineLayout.gaps.join(", ")}px)`);
      assert.ok(timelineLayout.roles.every((role) => role.background === "rgba(0, 0, 0, 0)" && role.paddingTop <= 4 && role.borderRadius <= 1), "timeline should keep the original clean, card-free presentation");
      assert.ok(timelineLayout.dotCenters.every((center) => Math.abs(center - timelineLayout.dotCenters[0]) <= 1), "timeline dots do not share one axis");
      assert.ok(timelineLayout.connectors.every((left) => Math.abs(left - timelineLayout.dotCenters[0]) <= 1), "timeline connectors do not align with the dots");
      await page.locator(".site-header").screenshot({ path: outputPath("navbar-desktop.png") });
      await page.locator(".portrait-stage").screenshot({ path: outputPath("hero-placeholder.png") });
      await page.locator("#about").screenshot({ path: outputPath("about-placeholder.png") });
      await page.locator("#experience").screenshot({ path: outputPath(`experience-timeline-${viewport.name}.png`) });
    }

    if (viewport.width === 390) {
      await page.waitForTimeout(750);
      await page.locator(".project-highlight").screenshot({ path: outputPath("mobile-highlight.png") });
      await page.locator("#experience").screenshot({ path: outputPath("mobile-experience-timeline.png") });
      await page.locator(".projects").screenshot({ path: outputPath("mobile-projects.png") });
    }

    if (viewport.width === 1440) {
      await page.locator("#testimonials").evaluate((element) => window.scrollTo(0, element.offsetTop + element.offsetHeight - 180));
      await page.screenshot({ path: outputPath("testimonials-footer.png") });
    }

    await page.screenshot({ path: outputPath(`${viewport.name}.png`), fullPage: true });
    const record = { ...viewport, overflow, footerCenterDelta: footerAlignment, headerGapRatio, consoleErrors, pageErrors };
    results.push(record);
    if (overflow > 1 || footerAlignment > 2 || consoleErrors.length || pageErrors.length) failed = true;
    await page.close();
  }

  const transitionPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await transitionPage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await transitionPage.locator(".page-transition.is-revealing").waitFor();
  await transitionPage.waitForTimeout(750);
  const transitionNavigation = transitionPage.waitForURL(/project\.html\?slug=food-delivery-experience/);
  await transitionPage.locator('.highlight-card h3 a[href*="food-delivery-experience"]').click();
  assert.ok(await transitionPage.locator(".page-transition.is-navigating").isVisible(), "page transition did not cover the outgoing page");
  await transitionPage.waitForTimeout(240);
  await transitionPage.screenshot({ path: outputPath("page-transition.png") });
  await transitionNavigation;
  assert.equal(await transitionPage.locator("h1").textContent(), "Food Delivery Experience");
  await transitionPage.close();

  const detailPage = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await detailPage.goto(`${baseUrl}/project.html?slug=food-delivery-experience`, { waitUntil: "networkidle" });
  assert.equal(await detailPage.locator("h1").textContent(), "Food Delivery Experience");
  assert.equal(await detailPage.locator(".error-state").count(), 0);
  assert.equal(await detailPage.locator(".project-story-card").count(), 2, "project challenge and description are not separated");
  assert.deepEqual(await detailPage.locator(".project-story-card h3").allTextContents(), ["Project description", "The challenge"]);
  const projectStoryHeight = await detailPage.locator(".project-story").evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(projectStoryHeight < 430, "project challenge section uses too much vertical space");
  await detailPage.locator(".project-story").scrollIntoViewIfNeeded();
  await detailPage.locator(".project-story.visible").waitFor();
  await detailPage.waitForTimeout(750);
  await detailPage.locator(".project-story").screenshot({ path: outputPath("project-story.png") });
  await detailPage.locator(".project-story-card p").evaluateAll((paragraphs, copy) => {
    paragraphs.forEach((paragraph, index) => { paragraph.textContent = copy[index]; });
  }, longProjectCopy);
  const longStoryLayout = await detailPage.locator(".project-story").evaluate((section) => {
    const cards = [...section.querySelectorAll(".project-story-card")];
    return {
      sectionFits: section.scrollWidth <= section.clientWidth,
      cards: cards.map((card) => {
        const paragraphStyle = getComputedStyle(card.querySelector("p"));
        return {
          height: card.getBoundingClientRect().height,
          fits: card.scrollWidth <= card.clientWidth,
          whiteSpace: paragraphStyle.whiteSpace,
          overflowWrap: paragraphStyle.overflowWrap,
        };
      }),
    };
  });
  assert.equal(longStoryLayout.sectionFits, true, "long project story content overflows its section");
  assert.ok(longStoryLayout.cards.every((card) => card.fits), "long project story content overflows its card");
  assert.ok(Math.abs(longStoryLayout.cards[0].height - longStoryLayout.cards[1].height) <= 1, "desktop project story cards should stay balanced with long content");
  assert.ok(longStoryLayout.cards.every((card) => card.whiteSpace === "pre-line" && card.overflowWrap === "anywhere"), "long project story typography is not resilient");
  await detailPage.locator(".project-story").screenshot({ path: outputPath("project-story-long.png") });
  await detailPage.locator('[data-language="id"]').click();
  assert.deepEqual(await detailPage.locator(".project-story-card h3").allTextContents(), ["Deskripsi proyek", "Tantangan"]);
  assert.equal(await detailPage.locator("h1").textContent(), "Pengalaman Pesan Antar Makanan");
  await detailPage.locator('[data-language="en"]').click();
  await detailPage.evaluate(() => document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible")));
  await detailPage.screenshot({ path: outputPath("project-detail.png"), fullPage: true });
  await detailPage.close();

  const detailMobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await detailMobilePage.goto(`${baseUrl}/project.html?slug=food-delivery-experience`, { waitUntil: "networkidle" });
  await detailMobilePage.locator(".project-story").scrollIntoViewIfNeeded();
  await detailMobilePage.locator(".project-story.visible").waitFor();
  await detailMobilePage.waitForTimeout(750);
  await detailMobilePage.locator(".project-story-card p").evaluateAll((paragraphs, copy) => {
    paragraphs.forEach((paragraph, index) => { paragraph.textContent = copy[index]; });
  }, longProjectCopy);
  const mobileStoryCards = await detailMobilePage.locator(".project-story-card").evaluateAll((cards) => cards.map((card) => {
    const rect = card.getBoundingClientRect();
    return { top: rect.top, left: rect.left, right: rect.right, viewportWidth: window.innerWidth, fits: card.scrollWidth <= card.clientWidth };
  }));
  assert.equal(mobileStoryCards.length, 2);
  assert.ok(mobileStoryCards[1].top > mobileStoryCards[0].top, "mobile project story cards should stack vertically");
  assert.ok(mobileStoryCards.every((card) => card.left >= 0 && card.right <= card.viewportWidth), "mobile project story cards overflow the viewport");
  assert.ok(mobileStoryCards.every((card) => card.fits), "long mobile project story content overflows its card");
  await detailMobilePage.locator(".project-story").screenshot({ path: outputPath("project-story-mobile.png") });
  await detailMobilePage.close();

  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const adminErrors = [];
  const adminDialogs = [];
  adminPage.on("pageerror", (error) => adminErrors.push(error.message));
  adminPage.on("dialog", async (dialog) => {
    adminDialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await adminPage.goto(`${baseUrl}/admin/`, { waitUntil: "networkidle" });
  await adminPage.locator("#preview-admin").click();
  assert.equal(await adminPage.locator(".admin-menu button").count(), 8);
  assert.ok(await adminPage.locator('[data-panel="home"]').isVisible());
  assert.ok(await adminPage.locator('#admin-language-toggle').isVisible());
  await adminPage.locator('[data-tab="settings"]').click();
  assert.ok(await adminPage.locator('input[data-bind="site.languages.enabled"]').isChecked());
  assert.ok(await adminPage.locator('input[data-bind="site.descriptionId"]').isVisible());
  await adminPage.locator('input[data-bind="site.languages.enabled"]').uncheck();
  assert.ok(await adminPage.locator('input[data-bind="site.descriptionId"]').isVisible());
  assert.ok(await adminPage.locator('input[data-bind="site.descriptionId"]').isDisabled());
  await adminPage.locator('[data-panel="settings"] .panel-card').first().screenshot({ path: outputPath("admin-bilingual-disabled.png") });
  await adminPage.locator('[data-tab="home"]').click();
  assert.ok(await adminPage.locator('input[data-bind="home.roleId"]').isVisible());
  assert.ok(await adminPage.locator('input[data-bind="home.roleId"]').isDisabled());
  await adminPage.locator('input[data-bind="site.languages.enabled"]').check();
  assert.equal(await adminPage.locator('input[data-bind="home.roleId"]').isDisabled(), false);
  const professionPair = adminPage.locator('[data-translation-pair="home.role"]');
  assert.ok(await professionPair.isVisible());
  const professionColumns = await professionPair.locator('.field').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, width: rect.width };
  }));
  assert.equal(professionColumns.length, 2);
  assert.ok(Math.abs(professionColumns[0].top - professionColumns[1].top) <= 1, "profession EN and ID fields are not aligned");
  assert.ok(Math.abs(professionColumns[0].width - professionColumns[1].width) <= 1, "profession EN and ID fields have different widths");
  await adminPage.locator('[data-tab="settings"]').click();
  await adminPage.locator('[data-panel="settings"] .language-settings').screenshot({ path: outputPath("admin-language-settings.png") });
  assert.ok(await adminPage.locator('[data-translation-pair="site.runningText"]').isVisible());
  assert.equal(await adminPage.locator('[data-bind="site.runningTextId"]').isDisabled(), false);
  await adminPage.locator('[data-tab="home"]').click();
  const homeUploadBoxes = await adminPage.locator('[data-panel="home"] .upload-box').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, height: rect.height };
  }));
  assert.equal(homeUploadBoxes.length, 2);
  assert.ok(Math.abs(homeUploadBoxes[0].top - homeUploadBoxes[1].top) <= 1, "home upload boxes are not top-aligned");
  assert.ok(Math.abs(homeUploadBoxes[0].height - homeUploadBoxes[1].height) <= 1, "home upload boxes have different heights");
  const manageHighlightsButton = await adminPage.locator('[data-go-to="projects"]').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, whiteSpace: getComputedStyle(element).whiteSpace };
  });
  assert.equal(manageHighlightsButton.whiteSpace, "nowrap", "Manage highlights button text can wrap");
  assert.ok(manageHighlightsButton.width >= 190 && manageHighlightsButton.height <= 56, "Manage highlights button feels cramped");
  await adminPage.locator('[data-panel="home"] .panel-card').first().screenshot({ path: outputPath("admin-home.png") });
  await adminPage.locator(".highlight-admin-note").screenshot({ path: outputPath("admin-highlights-card.png") });
  await adminPage.locator('[data-tab="projects"]').click();
  assert.ok(await adminPage.locator('[data-panel="projects"]').isVisible());
  assert.ok(await adminPage.locator('[data-panel="projects"] [data-add-category]').isVisible());
  await adminPage.locator('[data-panel="projects"] [data-add-category]').click();
  assert.ok(await adminPage.locator(".category-modal").isVisible());
  assert.equal(await adminPage.locator(".category-modal h2").textContent(), "Add category");
  await adminPage.locator(".category-modal").screenshot({ path: outputPath("admin-category-modal.png") });
  await adminPage.locator('[data-close-category]').last().click();
  await adminPage.locator('[data-panel="projects"] [data-edit-category]').first().click();
  assert.equal(await adminPage.locator('#category-name').inputValue(), "Product Design");
  await adminPage.locator('[data-close-category]').last().click();
  await adminPage.locator('[data-panel="projects"] [data-delete-category]').first().click();
  assert.ok(await adminPage.locator("#confirm-delete-category").isVisible());
  await adminPage.locator('[data-close-category]').last().click();
  await adminPage.locator('[data-panel="projects"] [data-delete="projects"]').first().click();
  assert.ok(await adminPage.locator(".confirm-modal").isVisible());
  assert.match(await adminPage.locator(".confirm-modal h2").textContent(), /Delete project/i);
  await adminPage.locator(".confirm-modal").screenshot({ path: outputPath("admin-delete-item-modal.png") });
  await adminPage.locator('[data-close-confirm]').last().click();
  assert.deepEqual(adminDialogs, [], "category controls opened a native browser dialog");
  await adminPage.locator('[data-panel="projects"] [data-add="projects"]').click();
  assert.ok(await adminPage.locator('input[name="highlighted"]').isDisabled(), "a fourth highlighted project can still be selected");
  assert.match(await adminPage.locator(".highlight-limit-note").textContent(), /3 of 3/i);
  assert.equal(await adminPage.locator('input[name="mainImage"]').count(), 0);
  assert.equal(await adminPage.locator('input[name="thumbnail"]').count(), 0);
  assert.equal(await adminPage.locator('textarea[name="gallery"]').count(), 0);
  assert.equal(await adminPage.locator(".modal-upload-field").count(), 3);
  assert.ok(await adminPage.locator('input[name="galleryFiles"]').evaluate((element) => element.multiple), "gallery picker must accept multiple photos");
  await adminPage.locator('input[name="galleryFiles"]').setInputFiles([
    { name: "gallery-one.png", mimeType: "image/png", buffer: Buffer.from("gallery-one") },
    { name: "gallery-two.png", mimeType: "image/png", buffer: Buffer.from("gallery-two") },
  ]);
  assert.equal(await adminPage.locator('[data-file-status-for="galleryFiles"]').textContent(), "2 photos selected");
  const modalOverflow = await adminPage.locator("#item-editor").evaluate((element) => getComputedStyle(element).overflowY);
  const backdropOverflow = await adminPage.locator(".modal-backdrop").evaluate((element) => getComputedStyle(element).overflowY);
  assert.equal(modalOverflow, "visible", "modal still has an inner scrollbar");
  assert.equal(backdropOverflow, "auto", "modal overlay is not handling scrolling");
  await adminPage.locator("#item-editor").screenshot({ path: outputPath("admin-highlight-limit.png") });
  await adminPage.locator("#close-modal").click();
  await adminPage.locator('[data-panel="projects"] [data-edit="projects"]').first().click();
  const highlightCheckbox = adminPage.locator('input[name="highlighted"]');
  const checkboxSize = await highlightCheckbox.evaluate((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
  assert.ok(checkboxSize.width <= 22 && checkboxSize.height <= 22, "highlight checkbox is oversized");
  await adminPage.locator("#close-modal").click();
  await adminPage.locator('[data-tab="experience"]').click();
  const adminExperienceOrganizations = await adminPage.locator('[data-panel="experience"] .item-copy p').evaluateAll((elements) => elements.map((element) => element.textContent.split(" · ")[0].trim()));
  assert.deepEqual(adminExperienceOrganizations, ["Product Studio", "Digital Agency", "Technology Company"]);
  await adminPage.locator('[data-panel="experience"] [data-edit="experience"]').first().click();
  assert.ok(await adminPage.locator('[data-repeatable="descriptions"] [data-add-repeatable]').isVisible());
  assert.ok(await adminPage.locator('[data-repeatable="skills"] [data-add-repeatable]').isVisible());
  const currentCheckbox = adminPage.locator('input[name="current"]');
  const currentCheckboxSize = await currentCheckbox.evaluate((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
  assert.ok(currentCheckboxSize.width <= 22 && currentCheckboxSize.height <= 22, "current position checkbox is oversized");
  await adminPage.locator("#close-modal").click();
  await adminPage.locator('[data-tab="testimonials"]').click();
  assert.ok(await adminPage.locator('[data-panel="testimonials"]').isVisible());
  assert.ok(await adminPage.locator('[data-panel="testimonials"] [data-add="testimonials"]').isVisible());
  const feedbackCount = await adminPage.locator('[data-panel="testimonials"] .item-card').count();
  await adminPage.locator('[data-panel="testimonials"] [data-delete="testimonials"]').first().click();
  await adminPage.locator("#confirm-action").click();
  assert.equal(await adminPage.locator('[data-panel="testimonials"] .item-card').count(), feedbackCount - 1);
  await adminPage.locator("#discard").click();
  assert.match(await adminPage.locator(".confirm-modal h2").textContent(), /Discard changes/i);
  await adminPage.locator('[data-close-confirm]').last().click();
  await adminPage.locator("#logout").click();
  assert.match(await adminPage.locator(".confirm-modal h2").textContent(), /Sign out/i);
  await adminPage.locator('[data-close-confirm]').last().click();
  assert.deepEqual(adminDialogs, [], "admin actions opened a native browser dialog");
  await adminPage.screenshot({ path: outputPath("admin-desktop.png"), fullPage: true });
  if (adminErrors.length) failed = true;
  results.push({ name: "admin-desktop", pageErrors: adminErrors });
  await adminPage.close();

  const adminMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await adminMobile.goto(`${baseUrl}/admin/`, { waitUntil: "networkidle" });
  await adminMobile.locator("#preview-admin").click();
  await adminMobile.locator("#mobile-admin-toggle").click();
  assert.ok(await adminMobile.locator("#admin-sidebar").evaluate((element) => element.classList.contains("open")));
  const adminOverflow = await adminMobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await adminMobile.screenshot({ path: outputPath("admin-mobile.png"), fullPage: true });
  results.push({ name: "admin-mobile", overflow: adminOverflow });
  if (adminOverflow > 1) failed = true;
  await adminMobile.close();
} finally {
  await browser.close();
}

await writeFile(new URL("results.json", outputDirectory), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (failed) process.exitCode = 1;
