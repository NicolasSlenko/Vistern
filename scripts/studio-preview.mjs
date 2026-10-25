import { build } from "esbuild"
import { createServer } from "node:http"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

// A standalone look at the resume studio, with no Clerk, S3 or OpenAI behind
// it. Same shape as scripts/student-preview.mjs: esbuild bundles the studio
// with preview/studio/adapters.tsx in place of the modules that need a server.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(root, ".studio-preview")
const adapter = path.join(root, "preview/studio/adapters.tsx")
await mkdir(output, { recursive: true })
await build({
  absWorkingDir: root,
  entryPoints: ["preview/studio/main.tsx"],
  outdir: output,
  bundle: true,
  format: "esm",
  jsx: "automatic",
  sourcemap: true,
  define: { "process.env.NODE_ENV": '"development"' },
  alias: {
    "next/link": adapter,
    "next/navigation": adapter,
    "@/contexts/resume-context": adapter,
    sonner: adapter,
  },
  plugins: [
    {
      name: "tailwind",
      setup(builder) {
        builder.onLoad({ filter: /globals\.css$/ }, async (args) => {
          const { default: postcss } = await import("postcss")
          const { default: tailwind } = await import("@tailwindcss/postcss")
          const result = await postcss([tailwind({ base: root })]).process(await readFile(args.path, "utf8"), { from: args.path })
          return { contents: result.css, loader: "css", resolveDir: path.dirname(args.path) }
        })
      },
    },
  ],
})

// Next loads Newsreader and Geist with next/font; this build has no Next, so
// it asks Google for the same families to keep the preview's type honest.
const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap">'
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vistern · Resume studio preview</title>${FONTS}<link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>`
await writeFile(path.join(output, "index.html"), html)

const port = Number(process.env.PORT || 4192)
if (!process.argv.includes("--build-only"))
  createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1")
    const assets = {
      "/main.js": ["main.js", "text/javascript"],
      "/main.css": ["main.css", "text/css"],
      "/main.js.map": ["main.js.map", "application/json"],
      "/main.css.map": ["main.css.map", "application/json"],
    }
    try {
      const asset = assets[url.pathname]
      response.writeHead(200, { "Content-Type": asset ? asset[1] : "text/html; charset=utf-8", "Cache-Control": "no-store" })
      response.end(asset ? await readFile(path.join(output, asset[0])) : html)
    } catch {
      response.writeHead(500)
      response.end("Preview unavailable")
    }
  }).listen(port, "127.0.0.1", () => console.log(`Resume studio preview: http://127.0.0.1:${port}/`))
