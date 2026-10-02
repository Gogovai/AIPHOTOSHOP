import Link from "next/link";

import { DocumentPreview } from "@/components/document-preview";
import { EDITOR_HREF } from "@/components/editor/editor-types";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const PRINCIPLES = [
  {
    title: "The document is the artifact",
    body: "A design is a structured document — canvas, layers, groups, text, shapes and vectors. Every render is a projection of that document, never the document itself.",
  },
  {
    title: "Every element has an identity",
    body: "Layers and objects carry stable IDs. That is what makes an AI edit traceable, reviewable, and reversible instead of a mystery repaint.",
  },
  {
    title: "AI proposes, the engine applies",
    body: "The AI layer never mutates state directly. It emits typed design operations which the design engine validates against the schema before anything changes.",
  },
  {
    title: "The output stays editable",
    body: "Export produces pixels and vectors when you ask for them. The layers remain — you can reopen the design and keep working on it.",
  },
] as const;

const PACKAGES = [
  {
    name: "@aiphotoshop/design-schema",
    body: "The serializable contract for a design document: canvas, layers, objects, stable identifiers.",
  },
  {
    name: "@aiphotoshop/design-engine",
    body: "Deterministic operations that produce a new document revision: create, transform, reorder, group.",
  },
  {
    name: "@aiphotoshop/ai-core",
    body: "Turns intent into validated design operations. Never returns a flattened image as the result.",
  },
  {
    name: "@aiphotoshop/typography-engine",
    body: "Font resolution, text measurement, line breaking and typographic scales.",
  },
  {
    name: "@aiphotoshop/color-engine",
    body: "Color spaces, palette derivation, contrast analysis and deterministic color maths.",
  },
  {
    name: "@aiphotoshop/export-engine",
    body: "Raster and vector export pipelines driven from the document.",
  },
  {
    name: "@aiphotoshop/ui",
    body: "Shared primitives and design tokens so the editor and the product surfaces feel like one tool.",
  },
] as const;

const IN_MILESTONE = [
  "Professional editor shell at /editor/[projectId]",
  "Top bar, tool rail, canvas viewport, sidebar and status bar",
  "Reusable, accessible editor regions with no hidden state",
  "Component tests covering every editor region",
  "pnpm workspace, strict TypeScript, ESLint, Prettier and Vitest",
] as const;

const NOT_YET = [
  "Layer engine and real document tree",
  "Canvas rendering, selection and transforms",
  "Undo / redo and document persistence",
  "AI provider integration",
  "Supabase persistence",
  "Export pipeline",
] as const;

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="font-mono text-[10px] tracking-[0.22em] text-ink-faint uppercase">{children}</p>
  );
}

export default function Home() {
  return (
    <div id="top" className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-28">
            <div>
              <Eyebrow>AI-native professional design</Eyebrow>
              <h1 className="mt-6 text-[38px] leading-[1.06] font-semibold tracking-[-0.03em] text-ink sm:text-[52px]">
                AI that designs in layers,
                <br />
                not in pixels.
              </h1>
              <p className="mt-7 max-w-xl text-[15px] leading-7 text-ink-muted">
                AIPHOTOSHOP is a professional design environment where AI creates, understands and
                modifies a real, structured design document — layers, text, shapes and vectors, each
                with a stable identity. A generated design is never reduced to one flattened image.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href={EDITOR_HREF}
                  data-testid="open-editor"
                  className="border border-ink bg-ink px-4 py-2.5 text-[13px] font-medium text-paper transition-colors hover:bg-ink-muted"
                >
                  Open Editor
                </Link>
                <a
                  href="#document"
                  className="border border-line-strong px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
                >
                  Explore the document model
                </a>
                <a
                  href="#architecture"
                  className="border border-line-strong px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
                >
                  Read the architecture
                </a>
              </div>

              <p className="mt-8 font-mono text-[10px] tracking-[0.16em] text-ink-faint">
                FOUNDATION RELEASE · EDITOR SHELL IN MILESTONE 002
              </p>
            </div>

            <DocumentPreview />
          </div>
        </section>

        <section id="document" className="scroll-mt-14 border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Eyebrow>Design model</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
              A design is a document, and the document is the source of truth.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-muted">
              Everything the product does — human or AI — is expressed as an operation against that
              document. Four rules hold the architecture together.
            </p>

            <dl className="mt-12 grid grid-cols-1 border-t border-line md:grid-cols-2">
              {PRINCIPLES.map((principle) => (
                <div
                  key={principle.title}
                  className="border-b border-line py-8 md:odd:border-r md:odd:pr-10 md:even:pl-10"
                >
                  <dt className="text-[15px] font-medium text-ink">{principle.title}</dt>
                  <dd className="mt-3 text-[14px] leading-6 text-ink-muted">{principle.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="architecture" className="scroll-mt-14 border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Eyebrow>Architecture</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
              Modular by construction, not by convention.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-muted">
              Each responsibility lives in its own package with an explicit boundary. The product
              surface composes them; none of them reach into another’s state.
            </p>

            <ul className="mt-12 border-t border-line">
              {PACKAGES.map((pkg) => (
                <li
                  key={pkg.name}
                  className="grid gap-2 border-b border-line py-5 sm:grid-cols-[280px_minmax(0,1fr)] sm:gap-8"
                >
                  <span className="font-mono text-[11px] tracking-[0.04em] text-ink">
                    {pkg.name}
                  </span>
                  <span className="text-[14px] leading-6 text-ink-muted">{pkg.body}</span>
                </li>
              ))}
              <li className="grid gap-2 border-b border-line py-5 sm:grid-cols-[280px_minmax(0,1fr)] sm:gap-8">
                <span className="font-mono text-[11px] tracking-[0.04em] text-ink">
                  @aiphotoshop/web
                </span>
                <span className="text-[14px] leading-6 text-ink-muted">
                  The Next.js product surface. The professional editor shell lives here from
                  Milestone 002.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section id="status" className="scroll-mt-14">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Eyebrow>Status</Eyebrow>
            <h2 className="mt-5 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
              Milestone 002 — Editor shell
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-muted">
              The workspace now exists: a professional editor shell you can open and navigate. It is
              structure only — layout and accessible regions — with no document mutation, rendering
              engine, AI, persistence or export yet. Those arrive in their own milestones.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-10 border-t border-line pt-10 md:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-ink-faint uppercase">
                  In this milestone
                </p>
                <ul className="mt-5 space-y-2.5">
                  {IN_MILESTONE.map((item) => (
                    <li key={item} className="flex gap-3 text-[14px] leading-6 text-ink-muted">
                      <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-ink-faint uppercase">
                  Not yet — by design
                </p>
                <ul className="mt-5 space-y-2.5">
                  {NOT_YET.map((item) => (
                    <li key={item} className="flex gap-3 text-[14px] leading-6 text-ink-muted">
                      <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-line-strong" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-12 border-t border-line pt-6 font-mono text-[10px] tracking-[0.16em] text-ink-faint">
              NEXT · MILESTONE 003 — LAYER ENGINE
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
