import { readFile, writeFile } from "node:fs/promises";

const [{ content: source, updated_at: sourceRevision }] = JSON.parse(await readFile(new URL("../tmp/translation/source-public.json", import.meta.url), "utf8"));
const draft = JSON.parse(await readFile(new URL("../tmp/translation/indonesian-draft.json", import.meta.url), "utf8"));
const translated = structuredClone(source);
const groups = [];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function addGroup(path, original, values, match) {
  const fields = Object.entries(values).filter(([key]) => key.endsWith("Id")).map(([key, value]) => ({
    key, sourceKey: key.slice(0, -2), source: original[key.slice(0, -2)],
    before: original[key] ?? null, value,
  }));
  if (fields.length) groups.push({ path, ...(match ? { match } : {}), fields });
}

for (const key of ["home", "site", "about", "contact"]) {
  Object.assign(translated[key], draft[key] || {});
  addGroup([key], source[key], translated[key]);
}
source.home.stats.forEach(stat => addGroup(["home", "stats"], stat, stat, { label: stat.label, value: stat.value }));
source.site.navigation.forEach(item => addGroup(["site", "navigation"], item, item, { href: item.href }));
for (const collection of ["projects", "experiences", "certificates", "testimonials", "posts"]) {
  if (draft[collection].length !== source[collection].length) throw new Error(`${collection}: translation count mismatch`);
  translated[collection].forEach((item, i) => {
    Object.assign(item, draft[collection][i]);
    if (collection === "experiences") {
      if (item.descriptionsId.length !== item.descriptions.length) throw new Error(`${item.title}: missing responsibility translation`);
      item.skillsId = item.skills.map(skill => {
        if (!draft.skillTranslations[skill]) throw new Error(`Missing skill translation: ${skill}`);
        return draft.skillTranslations[skill];
      });
      if (item.description) item.descriptionId = item.descriptionsId.join("\n");
    }
    const match = collection === "projects" ? { slug: item.slug } : collection === "testimonials" ? { name: item.name } : { title: item.title };
    addGroup([collection], source[collection][i], item, match);
  });
}
Object.entries(source).filter(([key]) => key.endsWith("Id")).forEach(([key]) => { translated[key] = draft[key] || source[key]; });
addGroup([], source, translated);
translated.categoryTranslations = draft.categoryTranslations;
for (const scope of ["project", "experience"]) groups.push({
  path: ["categoryTranslations", scope], fields: Object.entries(draft.categoryTranslations[scope]).map(([key, value]) => ({
    key, before: source.categoryTranslations[scope]?.[key] ?? null, value,
  })),
});
translated.site.languages = { ...source.site.languages, enabled: true, defaultLanguage: "en" };
groups.push({ path: ["site", "languages"], fields: [
  { key: "enabled", before: source.site.languages.enabled, value: true },
  { key: "defaultLanguage", before: source.site.languages.defaultLanguage, value: "en" },
] });
const version = "chris-indonesian-2026-10-06";
translated.indonesianImportVersion = version;
const bundle = { version, owner: { name: source.home.name, email: source.contact.email }, sourceRevision, groups };
await writeFile(new URL("../portfolio-indonesian-data.js", import.meta.url), `// Translated from the public portfolio CMS record on 2026-10-06.\nexport const indonesianBundle = ${JSON.stringify(bundle, null, 2)};\n`);
await writeFile(new URL("../tmp/translation/translated-public.json", import.meta.url), JSON.stringify(translated, null, 2));
console.log(`Prepared ${groups.reduce((count, group) => count + group.fields.length, 0)} Indonesian fields: ${source.projects.length} projects, ${source.experiences.length} experiences, ${source.certificates.length} certificates.`);
// Confirm that English copy, assets, dates and status are preserved.
function englishOnly(value) {
  if (Array.isArray(value)) return value.map(englishOnly);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "categoryTranslations" && key !== "indonesianImportVersion" && !key.endsWith("Id")).map(([key, item]) => [key, englishOnly(item)]));
}
const originalEnglish = englishOnly(source);
const updatedEnglish = englishOnly(translated);
updatedEnglish.site.languages = originalEnglish.site.languages;
if (!same(originalEnglish, updatedEnglish)) throw new Error("An English field or source asset changed unexpectedly");
