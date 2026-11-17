import { readFile, writeFile, mkdir, lstat, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { validateConfig } from "../web/api.js";

export const webFiles = ["index.html", "styles.css", "app.js", "api.js"];
export function validateSettings({ url, publishableKey, authFile, sourceSha }) {
  if (
    !validateConfig({ url, publishableKey }) ||
    !/^[A-Za-z0-9_.-]+$/.test(publishableKey)
  )
    throw new Error(
      "A Supabase project URL and public publishable/anon key are required.",
    );
  if (!/^[a-f0-9]{40}$/.test(sourceSha))
    throw new Error("A full source commit SHA is required.");
  if (
    !/^\/(?:[A-Za-z0-9_-]+\/)*private-auth\/[A-Za-z0-9_.-]+$/.test(authFile) ||
    authFile.includes("..") ||
    /\/(public_html|preview-site)\//.test(authFile)
  )
    throw new Error(
      "Authentication file must be an absolute path inside a private-auth directory outside the web roots.",
    );
}
export async function buildStaging({
  sourceDir,
  outputDir,
  url,
  publishableKey,
  authFile,
  sourceSha,
}) {
  validateSettings({ url, publishableKey, authFile, sourceSha });
  // Read the allowlisted files before creating an output directory. Never follow links.
  const files = {};
  for (const name of webFiles) {
    const file = resolve(sourceDir, name);
    if (!(await lstat(file)).isFile())
      throw new Error("Only regular source files are permitted.");
    files[name] = await readFile(file);
  }
  files["config.js"] = Buffer.from(
    "window.SF_CRM_CONFIG = " + JSON.stringify({ url, publishableKey }) + ";\n",
  );
  files["robots.txt"] = Buffer.from("User-agent: *\nDisallow: /\n");
  files[".htaccess"] = Buffer.from(`Options -Indexes
AuthType Basic
AuthName "Staurus Foods CRM staging"
AuthUserFile ${authFile}
Require valid-user
# Missing mod_headers must fail deployment instead of silently dropping controls.
Header always set Cache-Control "no-store"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set Referrer-Policy "no-referrer"
Header always set X-Robots-Tag "noindex, nofollow, noarchive"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; connect-src ${url}; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
`);
  const manifest = {
    mode: "crm-staging",
    source_sha: sourceSha,
    files: Object.fromEntries(
      Object.entries(files).map(([name, data]) => [
        name,
        createHash("sha256").update(data).digest("hex"),
      ]),
    ),
  };
  // An existing output is rejected. No operation can overwrite an earlier release.
  await mkdir(outputDir, { recursive: false });
  try {
    for (const [name, data] of Object.entries(files))
      await writeFile(resolve(outputDir, name), data, { flag: "wx" });
    await writeFile(
      resolve(outputDir, "release.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      { flag: "wx" },
    );
  } catch (error) {
    await rm(outputDir, { recursive: true, force: true });
    throw error;
  }
  return manifest;
}
async function main() {
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repo,
    encoding: "utf8",
  }).trim();
  execFileSync(
    "git",
    [
      "diff",
      "--exit-code",
      "HEAD",
      "--",
      "crm/web",
      "crm/scripts/build-staging.mjs",
    ],
    { cwd: repo, stdio: "ignore" },
  );
  const output = resolve(repo, "dist", `crm-staging-${sha}`);
  await mkdir(dirname(output), { recursive: true });
  const result = await buildStaging({
    sourceDir: resolve(repo, "crm/web"),
    outputDir: output,
    sourceSha: sha,
    url: process.env.SF_CRM_URL,
    publishableKey: process.env.SF_CRM_PUBLISHABLE_KEY,
    authFile: process.env.SF_CRM_AUTH_FILE,
  });
  console.log(
    JSON.stringify({
      output,
      source_sha: sha,
      mode: result.mode,
      file_count: Object.keys(result.files).length,
    }),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch(() => {
    console.error(
      "Staging build failed. Check public configuration, private authentication path, clean source and unused output directory. No secret values are printed.",
    );
    process.exitCode = 1;
  });
