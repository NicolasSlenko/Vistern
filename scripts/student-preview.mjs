import { build } from "esbuild"
import { createServer } from "node:http"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(root, ".student-preview")
const adapter = path.join(root, "preview/student/adapters.tsx")
await mkdir(output, { recursive: true })
await build({
  absWorkingDir: root,
  entryPoints: ["preview/student/main.tsx"],
  outdir: output,
  bundle: true,
  format: "esm",
  jsx: "automatic",
  sourcemap: true,
  define: { "process.env.NODE_ENV": '"development"' },
  alias: {
    "next/link": adapter,
    "next/navigation": adapter,
    "@clerk/nextjs": adapter,
    "@/contexts/resume-context": adapter,
  },
  plugins: [
    {
      name: "tailwind",
      setup(builder) {
        builder.onLoad({ filter: /globals\.css$/ }, async (args) => {
          const { default: postcss } = await import("postcss")
          const { default: tailwind } = await import("@tailwindcss/postcss")
          const result = await postcss([tailwind({ base: root })]).process(
            await readFile(args.path, "utf8"),
            { from: args.path },
          )
          return { contents: result.css, loader: "css", resolveDir: path.dirname(args.path) }
        })
      },
    },
  ],
})
const html =
  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vistern · Meeting preview</title><link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>'
await writeFile(path.join(output, "index.html"), html)
const port = Number(process.env.PORT || 4190)
if (!process.argv.includes("--build-only"))
  createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1")
    try {
      if (url.pathname.startsWith("/api/")) {
        response.writeHead(503, { "Content-Type": "application/json" })
        response.end('{"success":false,"error":"Preview only"}')
        return
      }
      const assets = {
        "/main.js": ["main.js", "text/javascript"],
        "/main.css": ["main.css", "text/css"],
        "/main.js.map": ["main.js.map", "application/json"],
        "/main.css.map": ["main.css.map", "application/json"],
      }
      if (url.pathname === "/DEMO.md") {
        response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
        response.end(await readFile(path.join(root, "docs/SCRUM-14-DEMO.md")))
        return
      }
      const asset = assets[url.pathname]
      response.writeHead(200, {
        "Content-Type": asset ? asset[1] : "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      })
      response.end(asset ? await readFile(path.join(output, asset[0])) : html)
    } catch {
      response.writeHead(500)
      response.end("Preview unavailable")
    }
  }).listen(port, "127.0.0.1", () =>
    console.log(`Vistern meeting preview: http://127.0.0.1:${port}/onboarding`),
  )
