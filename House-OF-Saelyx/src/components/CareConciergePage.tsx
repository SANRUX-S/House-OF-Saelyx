import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Send, CheckCircle2, Phone, Mail, Clock, MapPin } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setLoading(true);
    const success = await sendMessage({
      name,
      email,
      phone,
      topic,
      orderReference: orderReference.trim() || undefined,
      message
    });
    setLoading(false);

    if (success) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7A6E60] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Boutique</span>
        </button>

        {/* Title */}
        <div className="space-y-2 border-b border-[#E3D9CD] pb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
            HOUSE OF SAELYXE • ATELIER CONCIERGE
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            Client Care & Private Consultations
          </h1>
          <p className="text-xs text-[#7A6E60]">
            Direct WhatsApp consultations, bespoke sizing inquiries & white-glove order assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Direct Contact Details & WhatsApp button */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] space-y-5">
              <h3 className="font-serif text-base font-semibold text-[#1A1816]">Direct VIP Concierge</h3>
              
              <div className="space-y-4 text-xs text-[#4A4036]">
                <a
                  href="https://wa.me/94771234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#25D366]/10 text-[#128C7E] rounded-xl hover:bg-[#25D366]/20 transition-all font-semibold"
                >
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  <span>WhatsApp Atelier Concierge</span>
                </a>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#7A6E60] mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#1A1816]">Direct Desk</div>
                    <div className="text-[#635546]">+94 11 234 5678 / +94 77 123 4567</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#7A6E60] mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#1A1816]">Electronic Dispatch</div>
                    <div className="text-[#635546]">concierge@saelyxe.com</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#7A6E60] mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#1A1816]">Atelier Hours</div>
                    <div className="text-[#635546]">Mon – Sat: 09:00 – 19:00 IST</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#7A6E60] mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#1A1816]">Private Showroom</div>
                    <div className="text-[#635546]">Ward Place, Colombo 07, Sri Lanka</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#E3D9CD] shadow-sm">
            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#1A1816]">Inquiry Transmitted</h3>
                <p className="text-xs text-[#7A6E60] max-w-sm mx-auto leading-relaxed">
                  Thank you, {name}. Your inquiry has been routed to our Head Sartorial Advisor. We will respond within 4 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="px-6 py-2.5 bg-[#1A1816] text-white text-xs uppercase tracking-widest rounded-full hover:bg-black"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-serif text-lg font-semibold text-[#1A1816] border-b border-[#ECE3D8] pb-3">
                  Transmit an Atelier Inquiry
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A4E40] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Lord / Lady / Kasun"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A4E40] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="patron@domain.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A4E40] mb-1">
                      Topic of Inquiry
                    </label>
                    <select
                      value={topic}
                      onChange={e => setTopic(e.target.value as any)}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    >
                      <option value="bespoke_sizing">Bespoke Sizing & Fit Consultation</option>
                      <option value="order_inquiry">Order Status & White-Glove Dispatch</option>
                      <option value="concierge">Private VIP Concierge Assistance</option>
                      <option value="authenticity">Certificate of Authenticity</option>
                      <option value="press">Press & Editorial Inquiries</option>
                      <option value="other">General Atelier Inquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A4E40] mb-1">
                      Order Reference (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SLX-94821"
                      value={orderReference}
                      onChange={e => setOrderReference(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A4E40] mb-1">
                    Your Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your request in detail..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl p-3.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1A1816] hover:bg-black text-white font-semibold text-xs tracking-[0.2em] uppercase rounded-full transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'TRANSMITTING...' : 'TRANSMIT TO CONCIERGE'}</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
