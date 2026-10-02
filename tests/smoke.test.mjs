import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function run(name, callback) {
  await callback();
  console.log(`PASS ${name}`);
}

await run("public page exposes required dynamic sections", async () => {
  const source = await read("app.js");
  for (const section of ["home", "highlight", "about", "experience", "projects", "certificates", "testimonials", "contact"]) {
    assert.match(source, new RegExp(`id=\\"${section}\\"|id=\\'${section}\\'`));
  }
  assert.match(source, /filter\(isPublished\)/);
  assert.match(source, /project\.html\?slug=/);
  assert.doesNotMatch(source, /renderContact\(content\)/);
  assert.doesNotMatch(source, /renderPosts\(content\)/);
  assert.match(source, /project\.highlighted/);
  assert.match(source, /certificate\.issuer/);
  assert.doesNotMatch(source, /testimonial\.rating/);
  assert.match(source, /setupPageTransitions/);
  assert.match(source, /page-transition/);
  assert.match(source, /language-switch/);
  assert.match(source, /nav-right/);
  assert.match(source, /portfolio-language/);
  assert.match(source, /translated\(content\.site, "runningText"\)/);
  assert.doesNotMatch(source, /<span>UX Design \+ App Design \+ Dashboard/);
  assert.doesNotMatch(source, /Portfolio template|Privacy Policy/);
});

await run("admin preserves the required menu and upload validation path", async () => {
  const source = await read("admin/admin.js");
  for (const label of ["Home", "About Me", "Projects", "Certificates", "Experience", "What They Say", "Contact", "Header & Footer"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /uploadFile/);
  assert.match(source, /Save social media/);
  assert.match(source, /Unsaved changes/);
  assert.match(source, /data-add-category/);
  assert.match(source, /data-add-repeatable/);
  assert.match(source, /Highlighted on homepage/);
  assert.match(source, /category-modal/);
  assert.doesNotMatch(source, /window\.prompt/);
  assert.doesNotMatch(source, /window\.confirm/);
  assert.doesNotMatch(source, /Main image URL|Thumbnail URL|Gallery URLs|Certificate image URL/);
  assert.match(source, /modal-upload-field/);
  assert.match(source, /Enable Indonesian & English/);
  assert.match(source, /translatableField/);
  assert.match(source, /translation-pair/);
  assert.match(source, /admin-language-toggle/);
  assert.match(source, /site\.runningText/);
  assert.match(source, /validateBilingualContent/);
});

await run("CMS normalizes optional bilingual settings", async () => {
  const source = await read("cms.js");
  assert.match(source, /defaultLanguage/);
  assert.match(source, /categoryTranslations/);
});

await run("frontend does not contain a service role key", async () => {
  const files = await Promise.all([read("cms.js"), read("app.js"), read("admin/admin.js"), read("config.example.js")]);
  assert.equal(files.join("\n").includes("service_role"), false);
});

await run("public CMS view filters draft collaborator feedback", async () => {
  const schema = await read("supabase-schema.sql");
  assert.match(schema, /'\{testimonials\}'/);
  assert.match(schema, /p\.content->'testimonials'/);
});

await run("responsive breakpoints include required small and tablet widths", async () => {
  const css = await read("styles.css");
  assert.match(css, /max-width: 820px/);
  assert.match(css, /max-width: 600px/);
  assert.match(css, /max-width: 340px/);
  assert.match(css, /object-fit: contain/);
});
