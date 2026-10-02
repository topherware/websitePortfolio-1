import { writeFile } from "node:fs/promises";

globalThis.window = {};
const { demoContent } = await import("../cms.js");
const content = JSON.stringify(demoContent).replaceAll("'", "''");
const sql = `-- Run in the buyer's Supabase SQL Editor after supabase-schema.sql.
-- Inserts initial template content only if site does not exist. Existing content is preserved.
insert into public.portfolio_content (id, content)
values ('site', '${content}'::jsonb)
on conflict (id) do nothing;

select id, updated_at from public.portfolio_content where id = 'site';
`;
await writeFile(new URL("../supabase-seed.sql", import.meta.url), sql);
console.log("Generated supabase-seed.sql. Run it manually in the correct Supabase project.");
