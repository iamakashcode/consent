"use client";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
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
      <Header />

      <main>
        <section className="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-5 leading-tight">
              Get in touch
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed">
              Have a question, a sales inquiry, or a compliance concern? We typically respond within one business day.
            </p>
          </div>
        </section>

        <section className="py-16 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {contactTypes.map(({ icon: Icon, title, desc, email }) => (
                <div
                  key={title}
                  className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-3">{desc}</p>
                  <a href={`mailto:${email}`} className="text-sm text-blue-600 font-medium hover:underline">
                    {email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Send us a message</h2>
                <p className="text-slate-500 leading-relaxed mb-8">
                  Fill in the form and our team will get back to you within 24 hours on business days.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <span className="text-sm text-slate-600">Response within 1 business day</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <span className="text-sm text-slate-600">India — serving customers worldwide</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <a
                      href="mailto:support@cookieaccess.io"
                      className="text-sm text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      support@cookieaccess.io
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
                      <Send className="w-7 h-7 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Message sent!</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Thanks for reaching out. We'll get back to you within one business day.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                        <input
                          type="text"
                          name="name"
                          required
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Jane Smith"
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={form.email}
                          onChange={handleChange}
                          placeholder="jane@example.com"
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        required
                        value={form.subject}
                        onChange={handleChange}
                        placeholder="How can we help?"
                        className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                      <textarea
                        name="message"
                        required
                        rows={5}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us what you need..."
                        className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-all duration-200 shadow-md shadow-blue-700/20"
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
