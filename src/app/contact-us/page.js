"use client";

import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import ScrollProgress from "@/components/landing/ScrollProgress";
import { useState } from "react";
import { Mail, MessageSquare, Phone, Shield, MapPin, Clock, Send } from "lucide-react";

const contactTypes = [
  {
    icon: MessageSquare,
    title: "Sales",
    desc: "Talk to our team about plans, pricing, and custom enterprise deals.",
    email: "sales@cookieaccess.io",
  },
  {
    icon: Shield,
    title: "Technical support",
    desc: "Get help integrating the script, troubleshooting, or API questions.",
    email: "support@cookieaccess.io",
  },
  {
    icon: Mail,
    title: "Legal & compliance",
    desc: "DPA requests, privacy inquiries, and compliance documentation.",
    email: "legal@cookieaccess.io",
  },
  {
    icon: Phone,
    title: "Media & press",
    desc: "Interview requests, press kits, and partnership announcements.",
    email: "press@cookieaccess.io",
  },
];

const inputCls =
  "w-full px-4 py-2.5 text-sm border border-brand-200/70 bg-white rounded-xl text-navy-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition";

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <ScrollProgress />
      <Nav />

      <main>
        {/* Hero */}
        <section className="noise relative pt-36 pb-16 overflow-hidden bg-aurora">
          <div className="absolute inset-0 bg-grid grid-fade-mask pointer-events-none" />
          <div className="absolute top-[-120px] right-[-120px] w-[560px] h-[560px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(183,83,239,0.13) 0%, transparent 70%)" }} />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">Contact</p>
            <h1 className="font-display font-bold text-navy-950 text-[clamp(2.6rem,5.5vw,4.2rem)] leading-[1.04] mb-5">
              Get <span className="trust-gradient">in touch.</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed">
              Have a question, a sales inquiry, or a compliance concern? We typically respond within one business day.
            </p>
          </div>
        </section>

        {/* Contact channels */}
        <section className="py-16 border-b border-brand-100/60 bg-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {contactTypes.map(({ icon: Icon, title, desc, email }) => (
                <div
                  key={title}
                  className="glass rounded-2xl p-6 glow-card-hover hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-navy-950 mb-2">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-3">{desc}</p>
                  <a href={`mailto:${email}`} className="text-sm text-brand-600 font-semibold hover:text-brand-800 transition-colors">
                    {email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="py-20 bg-gradient-to-b from-white to-brand-50/40">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
                  Send us <span className="trust-gradient">a message.</span>
                </h2>
                <p className="text-slate-500 leading-relaxed mb-8">
                  Fill in the form and our team will get back to you within 24 hours on business days.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    <span className="text-sm text-slate-600">Response within 1 business day</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    <span className="text-sm text-slate-600">India — serving customers worldwide</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    <a
                      href="mailto:support@cookieaccess.io"
                      className="text-sm text-slate-600 hover:text-brand-600 transition-colors"
                    >
                      support@cookieaccess.io
                    </a>
                  </div>
                </div>
              </div>

              <div className="glass rounded-3xl p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="icon-tile w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <Send className="w-7 h-7" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-navy-950 mb-3">Message sent!</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Thanks for reaching out. We&apos;ll get back to you within one business day.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-1.5">Full name</label>
                        <input
                          type="text"
                          name="name"
                          required
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Jane Smith"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-1.5">Email</label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={form.email}
                          onChange={handleChange}
                          placeholder="jane@example.com"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-1.5">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        required
                        value={form.subject}
                        onChange={handleChange}
                        placeholder="How can we help?"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-1.5">Message</label>
                      <textarea
                        name="message"
                        required
                        rows={5}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us what you need..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-brand shine w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                      Send message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
