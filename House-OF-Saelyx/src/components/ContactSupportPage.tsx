import React, { useState } from 'react';
import { 
  Headset, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Mail, 
  Phone, 
  ShieldCheck,
  Clock
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const ContactSupportPage: React.FC = () => {
  const { user, sendMessage, navigateTo } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [orderReference, setOrderReference] = useState('');
  const [topic, setTopic] = useState<'order_inquiry' | 'bespoke_sizing' | 'concierge' | 'press' | 'authenticity' | 'other'>('order_inquiry');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const ok = await sendMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        topic,
        orderReference: orderReference.trim(),
        message: message.trim()
      });

      if (ok) {
        setIsSuccess(true);
        setMessage('');
      }
    } catch (err) {
      console.error('Failed to submit message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 sm:pt-28 pb-28 px-5 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#7A6E60] hover:text-[#1A1816] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Return to Boutique</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#7A6E60]">
            <Clock className="w-4 h-4 text-emerald-800 stroke-[1.5]" />
            <span>Atelier Response within 2h</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4 text-center">
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#8C7A68]">
            CLIENT CONCIERGE & SUPPORT
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            HOW MAY WE ASSIST YOU?
          </h1>
          <p className="text-xs text-[#7A6E60] max-w-md mx-auto leading-relaxed">
            Our Colombo atelier directors and dedicated logistics concierges are on standby for your bespoke requests.
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-white p-10 sm:p-12 rounded-3xl border border-[#EAE3D9] shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-[#1A1816]">
                Message Received by Atelier
              </h2>
              <p className="text-xs text-[#7A6E60] max-w-md mx-auto leading-relaxed">
                Thank you, {name}. Your inquiry has been registered in our concierge ledger. A private director will follow up directly at <strong className="text-[#1A1816]">{email}</strong>.
              </p>
            </div>
            <button
              onClick={() => setIsSuccess(false)}
              className="px-8 h-11 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.18em] font-medium rounded-full transition-all cursor-pointer"
            >
              SEND ANOTHER MESSAGE
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-11 bg-[#FCFBF9] border border-[#D5CBBF] rounded-xl px-3.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-11 bg-[#FCFBF9] border border-[#D5CBBF] rounded-xl px-3.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+94 77 123 4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full h-11 bg-[#FCFBF9] border border-[#D5CBBF] rounded-xl px-3.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Order Number (If Applicable)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOX-20260902-4821"
                  value={orderReference}
                  onChange={e => setOrderReference(e.target.value)}
                  className="w-full h-11 bg-[#FCFBF9] border border-[#D5CBBF] rounded-xl px-3.5 text-xs font-mono text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                Inquiry Topic
              </label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value as any)}
                className="w-full h-11 bg-[#FCFBF9] border border-[#D5CBBF] rounded-xl px-3.5 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
              >
                <option value="order_inquiry">Order Status & Courier Dispatch Inquiry</option>
                <option value="bespoke_sizing">Bespoke Sizing & Garment Dimensions</option>
                <option value="concierge">Private Client Concierge Consultation</option>
                <option value="authenticity">Garment Authenticity & Archival Verification</option>
                <option value="other">General Inquiries & Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                Your Message / Request *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your request in detail..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-[#FCFBF9] border border-[#D5CBBF] rounded-xl p-3.5 text-xs text-[#1A1816] placeholder:text-[#9E9080] focus:outline-none focus:border-[#1A1816] resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-full transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'DISPATCHING TO ATELIER...' : 'TRANSMIT TO CONCIERGE'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
