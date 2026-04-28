import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

export default function MarketingPageLayout({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      <Header />
      <main className="pt-24 pb-16">
        <section className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="prose prose-slate max-w-none">{children}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
