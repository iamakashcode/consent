import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import ScrollProgress from "@/components/landing/ScrollProgress";

/**
 * Shared layout for all marketing sub-pages — same Nav/Footer and
 * design language as the homepage, with a standard aurora hero band.
 */
export default function PageShell({ kicker, title, subtitle, children, hero = null }) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <ScrollProgress />
      <Nav />

      <main>
        {/* Hero band */}
        <section className="noise relative pt-36 pb-16 overflow-hidden bg-aurora">
          <div className="absolute inset-0 bg-grid grid-fade-mask pointer-events-none" />
          <div className="absolute top-[-120px] right-[-120px] w-[560px] h-[560px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(183,83,239,0.13) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-140px] left-[-140px] w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(18,11,125,0.1) 0%, transparent 70%)" }} />

          <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
            {kicker && (
              <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">{kicker}</p>
            )}
            <h1 className="font-display font-bold text-navy-950 text-[clamp(2.6rem,5.5vw,4.2rem)] leading-[1.04] mb-5 max-w-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-slate-500 leading-relaxed max-w-2xl">{subtitle}</p>
            )}
            {hero}
          </div>
        </section>

        {children}
      </main>

      <Footer />
    </div>
  );
}
