import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "./SiteFooter";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

type LegalPageProps = {
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  sections: LegalSection[];
};

// Layout shared by the Terms and Privacy pages: a contents list that jumps to each
// section, then the sections themselves. The pages only supply the text.
export function LegalPage({ title, lastUpdated, intro, sections }: LegalPageProps) {
  // Arriving from a footer link at the bottom of the landing page would otherwise land
  // mid-document, since the router keeps the previous scroll position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
            ProFlow
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>

        <div className="mt-6 space-y-3 text-base leading-relaxed text-slate-600">{intro}</div>

        <nav
          aria-label="Contents"
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Contents
          </h2>
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-slate-600 transition hover:text-violet-700">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600 [&_a]:font-medium [&_a]:text-violet-700 [&_a:hover]:underline [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-slate-800 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
