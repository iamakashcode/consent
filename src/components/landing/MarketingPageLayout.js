import PageShell from "@/components/home/PageShell";

export default function MarketingPageLayout({
  title,
  subtitle,
  kicker,
  children,
}) {
  return (
    <PageShell kicker={kicker} title={title} subtitle={subtitle}>
      <section className="max-w-6xl mx-auto px-6 lg:px-8 py-14">
        <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-navy-950 prose-a:text-brand-600">
          {children}
        </div>
      </section>
    </PageShell>
  );
}
