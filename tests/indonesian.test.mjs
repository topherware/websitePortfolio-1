import assert from "node:assert/strict";
import { test } from "node:test";
import { applyIndonesianTranslations } from "../portfolio-indonesian.js";

function original() {
  return {
    home: { name: "Christopher Cuangdinata", role: "Product Manager", roleId: "Product Manager" },
    contact: { email: "christozuang@gmail.com" },
    site: { languages: { enabled: false, defaultLanguage: "en" } },
    projects: [{ slug: "mental health support", title: "EASE: Easing Anxiety Supporting Each", titleId: "EASE: Easing Anxiety Supporting Each",
      description: "EASE is a digital mental health platform designed specifically to help individuals with anxiety disorders go through a holistic recovery process. Through the Three-Way Care approach, EASE integrates patients, doctors, and guardians into one care ecosystem connected in real time, ensuring that the healing process does not happen alone but is supported by a system that is supportive, inclusive, and free of stigma.",
      descriptionId: "Alur pemesanan yang jelas dan menarik untuk mengurangi hambatan dari pencarian hingga pembayaran.",
      gallery: ["/assets/ease/1.png"], status: "published" }],
    categoryTranslations: { project: { All: "Semua" }, experience: { Work: "Kerja" } },
  };
}

test("imports Indonesian copy and fixes stale EASE template without changing English or assets", () => {
  const content = original();
  const english = content.projects[0].description;
  applyIndonesianTranslations(content);
  assert.equal(content.home.roleId, "Manajer Produk");
  assert.equal(content.projects[0].description, english);
  assert.match(content.projects[0].descriptionId, /kesehatan mental digital/);
  assert.doesNotMatch(content.projects[0].descriptionId, /pemesanan|pembayaran/);
  assert.equal(content.projects[0].title, "EASE: Easing Anxiety Supporting Each");
  assert.deepEqual(content.projects[0].gallery, ["/assets/ease/1.png"]);
  assert.deepEqual(content.site.languages, { enabled: true, defaultLanguage: "id" });
});

test("preserves later source edits and custom Indonesian translations", () => {
  const content = original();
  content.home.roleId = "Kepala Produk";
  content.projects[0].description = "An updated project scope.";
  const previousDescriptionId = content.projects[0].descriptionId;
  applyIndonesianTranslations(content);
  assert.equal(content.home.roleId, "Kepala Produk");
  assert.equal(content.projects[0].descriptionId, previousDescriptionId);
});

test("matches projects by slug after reorder and leaves other portfolios untouched", () => {
  const content = original();
  content.projects.unshift({ slug: "other", title: "Other project", titleId: "Judul lain" });
  applyIndonesianTranslations(content);
  assert.match(content.projects[1].descriptionId, /kesehatan mental/);
  assert.equal(content.projects[0].titleId, "Judul lain");
  const differentOwner = original();
  differentOwner.contact.email = "other@example.com";
  const before = structuredClone(differentOwner);
  applyIndonesianTranslations(differentOwner);
  assert.deepEqual(differentOwner, before);
});

test("saved imports are idempotent and keep subsequent language preferences", () => {
  const content = applyIndonesianTranslations(original());
  content.site.languages = { enabled: false, defaultLanguage: "en" };
  content.home.roleId = "Terjemahan yang diperbarui";
  const before = structuredClone(content);
  applyIndonesianTranslations(content);
  assert.deepEqual(content, before);
});
