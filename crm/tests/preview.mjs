// Internal visual QA server. Deliberately separate from the deployable web/ folder.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname } from "node:path";
const root = fileURLToPath(new URL("../web/", import.meta.url));
const fixture = await readFile(
  new URL("./fixtures.mjs", import.meta.url),
  "utf8",
);
const html = (await readFile(resolve(root, "index.html"), "utf8"))
  .replace(
    '<script src="config.js" defer></script>',
    `<script type="module">${fixture}\ninstallFixture(window);</script>`,
  )
  .replace(
    "<main>",
    '<main><p style="background:#fff0c4;padding:12px">ISOLATED TEST PREVIEW. Synthetic data only. No live connection. Use any test email and password.</p>',
  );
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
};
createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  try {
    if (path === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
      return;
    }
    if (!["/app.js", "/api.js", "/styles.css"].includes(path)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader("Content-Type", types[extname(path)]);
    res.end(await readFile(resolve(root, path.slice(1))));
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(
  Number(
    process.argv[process.argv.indexOf("--port") + 1] &&
      process.argv.includes("--port")
      ? process.argv[process.argv.indexOf("--port") + 1]
      : process.env.PORT || 3000,
  ),
  "0.0.0.0",
  () => console.log("CRM isolated preview ready"),
);
