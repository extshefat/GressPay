import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const allowed = new Set([
  'src/app/globals.css',
  'src/lib/design/tokens.ts',
  // OG ImageResponse cannot read CSS variables; keep hex aligned with LOGO_COLORS / paper tokens.
  'src/app/opengraph-image.tsx',
]);
const failures = [];
function visit(dir) {
 for (const item of readdirSync(dir, {withFileTypes:true})) {
  const path = join(dir,item.name);
  if(item.isDirectory()) visit(path);
  else if(/\.(tsx?|css)$/.test(path) && !allowed.has(path)) {
   const source = readFileSync(path,'utf8');
   // Color literals, not order numbers, fragment identifiers or HTML entities.
   if(/(?:["'`:(\[])\s*#[\da-f]{3,8}(?=["'`);,\s}\]])/i.test(source) || /\b(?:void\.|brand\.cyan|cyanGlow|emerald-glow)\b/.test(source)) failures.push(path);
  }
 }
}
visit('src');
if(failures.length) { console.error('Use semantic design tokens:',...failures); process.exit(1); }
console.log('Design token check passed.');
