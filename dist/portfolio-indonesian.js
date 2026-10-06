import { indonesianBundle } from "./portfolio-indonesian-data.js";

// Import only the scanned portfolio. Subsequent editor changes take precedence.
export function applyIndonesianTranslations(content) {
  if (content?.home?.name !== indonesianBundle.owner.name || content?.contact?.email !== indonesianBundle.owner.email) return content;
  const applyEnglishDefault = () => {
    if (content.portfolioEnglishDefaultVersion !== 1) {
      if (content.site?.languages) content.site.languages.defaultLanguage = "en";
      content.portfolioEnglishDefaultVersion = 1;
    }
    return content;
  };
  if (content.indonesianImportVersion === indonesianBundle.version) return applyEnglishDefault();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const group of indonesianBundle.groups) {
    let target = group.path.reduce((object, key) => object?.[key], content);
    if (group.match) target = Array.isArray(target) ? target.find(item => Object.entries(group.match).every(([key, value]) => same(item[key], value))) : null;
    if (!target) continue;
    for (const field of group.fields) {
      if (field.sourceKey && !same(target[field.sourceKey], field.source)) continue;
      const current = target[field.key];
      const empty = current == null || current === "" || (Array.isArray(current) && !current.length);
      if (empty || same(current, field.before)) target[field.key] = structuredClone(field.value);
    }
  }
  content.indonesianImportVersion = indonesianBundle.version;
  return applyEnglishDefault();
}
