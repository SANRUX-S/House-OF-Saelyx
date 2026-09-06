import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle2, Mail } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ContactMessage } from '../types';

export const CareConciergePage: React.FC = () => {
  const { navigateTo, sendMessage } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState<ContactMessage['topic']>('bespoke_sizing');
  const [orderReference, setOrderReference] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setLoading(true);
    setSubmitError('');
    try {
      const success = await sendMessage({
        name,
        email,
        phone,
        topic,
        orderReference: orderReference.trim() || undefined,
        message
      });
      if (success) {
        setSubmitted(true);
      } else {
        setSubmitError('Your inquiry could not be sent. Please try again.');
      }
    } catch {
      setSubmitError('Your inquiry could not be sent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] font-[\'Plus_Jakarta_Sans\'] pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <button
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#3E3730] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Boutique</span>
        </button>

        <div className="space-y-2 border-b border-[#E3D9CD] pb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#3E3730] font-semibold">
            SAELYXE · CLIENT CARE
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            Client Care & Order Assistance
          </h1>
          <p className="text-xs text-[#3E3730] font-medium">
            Submit sizing, order, authenticity, press, or general support inquiries through the secure form below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-6">
            <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#DDD3C4] flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#3E3730]" />
              </div>
              <h3 className="font-serif text-base font-semibold text-[#1A1816]">Online Concierge</h3>
              <p className="text-xs leading-relaxed text-[#3E3730]">
                SAELYXE support is handled through this online inquiry system so your request can be recorded and followed up by the admin team.
              </p>
              <p className="text-[11px] leading-relaxed text-[#3E3730]">
                Only verified contact channels and operating details are published on the storefront.
              </p>
            </div>
          </div>

          <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#E3D9CD] shadow-sm">
            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#1A1816]">Inquiry Received</h3>
                <p className="text-xs text-[#3E3730] max-w-sm mx-auto leading-relaxed">
                  Thank you, {name}. Your inquiry has been securely recorded for the SAELYXE support team.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                    setSubmitError('');
                  }}
                  className="px-6 py-2.5 bg-[#1A1816] text-white text-xs uppercase tracking-widest rounded-full hover:bg-black"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-serif text-lg font-semibold text-[#1A1816] border-b border-[#ECE3D8] pb-3">
                  Send a Support Inquiry
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#2B2723] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#2B2723] mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#2B2723] mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="Your contact number"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#2B2723] mb-1">Topic</label>
                    <select
                      value={topic}
                      onChange={e => setTopic(e.target.value as ContactMessage['topic'])}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    >
                      <option value="bespoke_sizing">Sizing & Fit</option>
                      <option value="order_inquiry">Order Status & Delivery</option>
                      <option value="concierge">Customer Support</option>
                      <option value="authenticity">Authenticity</option>
                      <option value="press">Press & Editorial</option>
                      <option value="other">General Inquiry</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#2B2723] mb-1">Order Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="Your SAELYXE order number"
                    value={orderReference}
                    onChange={e => setOrderReference(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#2B2723] mb-1">Your Message *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your request in detail..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl p-3.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                  />
                </div>

                {submitError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A1816] text-white text-xs uppercase font-semibold tracking-widest rounded-xl hover:bg-black transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Sending...' : 'Send Inquiry'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
