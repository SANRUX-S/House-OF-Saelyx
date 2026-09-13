import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Mail, 
  Truck, 
  Copy, 
  Check, 
  ExternalLink,
  MessageSquare,
  Clock,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ContactMessage } from '../types';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.062-1.899-.462-1.503-.623-2.457-2.146-2.532-2.247-.074-.1-1.026-1.365-1.026-2.604 0-1.238.649-1.848.88-2.099.23-.25.502-.313.669-.313.167 0 .334.002.48.009.153.007.359-.059.562.428.209.502.712 1.737.774 1.863.063.125.105.272.021.439-.083.167-.125.271-.25.418-.125.146-.263.327-.376.439-.125.125-.256.261-.11.512.146.251.648 1.069 1.391 1.731.956.852 1.762 1.116 2.013 1.242.251.125.397.104.544-.063.146-.167.627-.732.794-.983.167-.251.334-.209.563-.125.23.084 1.464.69 1.715.816.251.125.418.188.48.293.063.104.063.606-.081 1.011z" />
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.178L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.182c-1.637 0-3.15-.494-4.417-1.341l-.317-.213-2.962.777.791-2.888-.233-.371A8.147 8.147 0 013.818 12c0-4.512 3.67-8.182 8.182-8.182 4.511 0 8.182 3.67 8.182 8.182 0 4.511-3.671 8.182-8.182 8.182z" />
  </svg>
);

const SUPPORT_EMAIL = 'support@saelyxe.com';
const WHATSAPP_RAW = '0707775568';
const WHATSAPP_INTL = '94707775568';
const WHATSAPP_DISPLAY = '070 777 5568';

export const CareConciergePage: React.FC = () => {
  const { navigateTo, sendMessage, user } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [topic, setTopic] = useState<ContactMessage['topic']>('order_inquiry');
  const [orderReference, setOrderReference] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const topicLabels: Record<ContactMessage['topic'], string> = {
    order_inquiry: 'Order Status & Delivery',
    bespoke_sizing: 'Sizing & Fit Advice',
    concierge: 'Client Concierge & Styling',
    authenticity: 'Authenticity & Certificate',
    press: 'Press & Media Inquiries',
    other: 'General Support Inquiry'
  };

  const handleCopy = (text: string, type: 'email' | 'wa') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    }
  };

  const handleWhatsAppDirect = () => {
    if (!message.trim()) {
      setValidationError('Please type your inquiry or question first.');
      return;
    }
    setValidationError('');

    const formattedMessage = `✨ *SAELYXE Concierge Inquiry* ✨
━━━━━━━━━━━━━━━━━
👤 *Client Name:* ${name.trim() || 'Client'}
🏷️ *Topic:* ${topicLabels[topic] || 'Support'}
📦 *Order #:* ${orderReference.trim() ? `#${orderReference.trim()}` : 'Not provided'}

💬 *Inquiry Details:*
${message.trim()}
━━━━━━━━━━━━━━━━━`;

    const waUrl = `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(waUrl, '_blank');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setValidationError('Please describe your inquiry before submitting.');
      return;
    }

    setLoading(true);
    setValidationError('');

    try {
      // 1. Record inquiry in system
      await sendMessage({
        name: name.trim() || 'Client',
        email: email.trim() || 'concierge-client@saelyxe.com',
        topic,
        orderReference: orderReference.trim() || undefined,
        message: message.trim()
      });

      // 2. Direct mailto dispatch
      const emailSubject = `[SAELYXE Support] ${topicLabels[topic]} - ${orderReference.trim() ? `Order #${orderReference.trim()}` : (name.trim() || 'Client')}`;
      const emailBody = `Dear SAELYXE Concierge,\n\nName: ${name.trim() || 'Client'}\nTopic: ${topicLabels[topic]}\nOrder Reference: ${orderReference.trim() || 'N/A'}\n\nMessage:\n${message.trim()}\n\n--\nSent from SAELYXE Online Concierge`;
      
      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoUrl;

      setSubmitted(true);
    } catch {
      setValidationError('Could not record inquiry. You can email us directly at ' + SUPPORT_EMAIL);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] font-sans pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Top Breadcrumb */}
        <button
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] font-medium text-[#6E6458] hover:text-black transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Return to Boutique</span>
        </button>

        {/* Header Title - Modern, clean, crisp luxury typography */}
        <div className="space-y-3 border-b border-[#E3D9CD] pb-7">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[#8C7A68] font-bold">
              SAELYXE · CLIENT CONCIERGE & SUPPORT
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1A1816] uppercase">
            Client Care & Order Assistance
          </h1>
          <p className="text-xs sm:text-sm text-[#5C5347] max-w-2xl leading-relaxed font-normal">
            Connect directly with our dedicated concierge team via <strong className="text-[#1A1816] font-semibold">WhatsApp</strong> for instant assistance, or dispatch your inquiry to our <strong className="text-[#1A1816] font-semibold">Official Email</strong>.
          </p>
        </div>

        {/* 3 Quick Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Channel 1: WhatsApp */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3D9CD] shadow-xs flex flex-col justify-between hover:border-[#128C7E] transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#128C7E]">
                  <WhatsAppIcon className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Instant Reply
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A1816] tracking-tight">WhatsApp Concierge</h3>
                <p className="text-xs text-[#6B6155] mt-1 leading-relaxed">
                  Direct personal styling & instant order assistance.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-mono text-base font-bold tracking-wider text-[#1A1816]">
                  {WHATSAPP_DISPLAY}
                </span>
              </div>
            </div>

            <div className="pt-5 mt-3 border-t border-[#F0EBE2] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (message.trim()) {
                    handleWhatsAppDirect();
                  } else {
                    const waUrl = `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent('Hello SAELYXE Concierge, I would like to make an inquiry.')}`;
                    window.open(waUrl, '_blank');
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#128C7E] hover:bg-[#0E7064] text-white rounded-xl text-xs font-bold uppercase tracking-[0.14em] transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <span>Chat on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleCopy(WHATSAPP_RAW, 'wa')}
                className="p-2.5 rounded-xl border border-[#D5C9B8] hover:bg-[#FAF8F5] text-[#5C5347] transition-colors cursor-pointer"
                title="Copy phone number"
                aria-label="Copy phone number"
              >
                {copiedWhatsApp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Channel 2: Official Support Email */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3D9CD] shadow-xs flex flex-col justify-between hover:border-[#AA9B88] transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#DDD3C4] flex items-center justify-center text-[#3E3730]">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-[#F4EDE5] text-[#634835] border border-[#E5DDD2]">
                  <Clock className="w-3 h-3 text-[#A98264]" />
                  2-4 Hours
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A1816] tracking-tight">Official Support Email</h3>
                <p className="text-xs text-[#6B6155] mt-1 leading-relaxed">
                  Official records, authenticity certificates & press.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-mono text-sm font-semibold tracking-wide text-[#1A1816]">
                  {SUPPORT_EMAIL}
                </span>
              </div>
            </div>

            <div className="pt-5 mt-3 border-t border-[#F0EBE2] flex items-center gap-2">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=SAELYXE%20Client%20Inquiry`}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#28231E] hover:bg-[#4A4035] text-white rounded-xl text-xs font-bold uppercase tracking-[0.14em] transition-all shadow-xs active:scale-[0.98]"
              >
                <span>Open Email</span>
                <Mail className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => handleCopy(SUPPORT_EMAIL, 'email')}
                className="p-2.5 rounded-xl border border-[#D5C9B8] hover:bg-[#FAF8F5] text-[#5C5347] transition-colors cursor-pointer"
                title="Copy email address"
                aria-label="Copy email address"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Channel 3: Order Tracking Quick Action */}
          <div className="bg-[#F6F1EA] p-5 sm:p-6 rounded-2xl border border-[#E3DBD0] shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#D9CEBF] flex items-center justify-center text-[#2E2822]">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-white text-[#5C5347] border border-[#E5DDD2]">
                  Live Tracking
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A1816] tracking-tight">Have an Order ID?</h3>
                <p className="text-xs text-[#6B6155] mt-1 leading-relaxed">
                  Track delivery timeline and courier dispatch status instantly.
                </p>
              </div>
              <div className="pt-2 text-xs text-[#5C5347] leading-relaxed">
                Check status without waiting for support reply.
              </div>
            </div>

            <div className="pt-5 mt-3 border-t border-[#E8DFC8]">
              <button
                type="button"
                onClick={() => navigateTo({ name: 'track-order' })}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-[#F2ECE2] text-[#1A1816] border border-[#D8D0C4] rounded-xl text-xs font-bold uppercase tracking-[0.14em] transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Track My Order Live</span>
              </button>
            </div>
          </div>

        </div>

        {/* The Interactive Message Dispatcher */}
        <div className="bg-white p-6 sm:p-9 rounded-3xl border border-[#E3D9CD] shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ECE3D8] pb-5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <h2 className="text-lg sm:text-xl font-bold text-[#1A1816] tracking-tight uppercase">
                  Type & Dispatch Your Inquiry
                </h2>
              </div>
              <p className="text-xs text-[#6B6155] mt-1">
                Describe your question below. With one click, your inquiry will open directly in WhatsApp or send via Email.
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="py-10 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1816]">Inquiry Dispatched</h3>
              <p className="text-xs sm:text-sm text-[#6E6458] max-w-md mx-auto leading-relaxed">
                Thank you. Your inquiry has been dispatched to the SAELYXE team. If you require immediate attention, you can also send it directly via WhatsApp below.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#128C7E] text-white rounded-full text-xs uppercase tracking-[0.14em] font-bold hover:bg-[#0E7064] transition-all cursor-pointer shadow-xs"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Also Open in WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="px-5 py-2.5 bg-[#FAF8F5] border border-[#D5C9B8] text-[#1A1816] text-xs uppercase tracking-[0.14em] font-bold rounded-full hover:bg-[#EFE9E0] transition-colors cursor-pointer"
                >
                  Compose Another
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Row 1: Name & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[#3E3730] mb-1.5">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-4 py-3 text-sm text-[#1A1816] placeholder:text-neutral-400 focus:outline-none focus:border-[#1A1816] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[#3E3730] mb-1.5">
                    Inquiry Topic
                  </label>
                  <select
                    value={topic}
                    onChange={e => setTopic(e.target.value as ContactMessage['topic'])}
                    className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-3.5 py-3 text-sm text-[#1A1816] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="order_inquiry">📦 Order Status & Delivery</option>
                    <option value="bespoke_sizing">📏 Sizing & Fit Guidance</option>
                    <option value="concierge">💬 Personal Styling & Concierge</option>
                    <option value="authenticity">🛡️ Authenticity Verification</option>
                    <option value="press">📰 Press & Media</option>
                    <option value="other">✨ General Inquiries</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Order Reference (Optional) & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[#3E3730] mb-1.5">
                    Order Reference # (If applicable)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SX-7821"
                    value={orderReference}
                    onChange={e => setOrderReference(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-4 py-3 text-sm text-[#1A1816] placeholder:text-neutral-400 focus:outline-none focus:border-[#1A1816] focus:bg-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[#3E3730] mb-1.5">
                    Your Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-xl px-4 py-3 text-sm text-[#1A1816] placeholder:text-neutral-400 focus:outline-none focus:border-[#1A1816] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Message Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[#3E3730]">
                    Describe Your Problem or Question *
                  </label>
                  <span className="text-[11px] text-[#8C7A68] font-medium">Auto-transfers to WhatsApp / Email</span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain your inquiry in detail (e.g. I have an order #SX-1042 and would like to confirm when it will arrive in Colombo...)"
                  value={message}
                  onChange={e => {
                    setMessage(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full bg-[#FAF8F5] border border-[#D5C9B8] rounded-2xl p-4 text-sm text-[#1A1816] placeholder:text-neutral-400 focus:outline-none focus:border-[#1A1816] focus:bg-white transition-all leading-relaxed"
                />
              </div>

              {/* Validation Alert */}
              {validationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800 font-medium animate-in fade-in">
                  {validationError}
                </div>
              )}

              {/* Action Buttons: WhatsApp Primary, Email Secondary */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                
                {/* 1. Direct WhatsApp Dispatch */}
                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 bg-[#128C7E] hover:bg-[#0E7064] active:scale-[0.99] text-white text-xs uppercase font-bold tracking-[0.16em] rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <WhatsAppIcon className="w-5 h-5 text-white" />
                  <span>Send via WhatsApp (Direct)</span>
                </button>

                {/* 2. Direct Email Dispatch */}
                <button
                  type="button"
                  onClick={handleEmailSubmit}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-3.5 px-6 bg-[#25211D] hover:bg-[#403831] active:scale-[0.99] text-white text-xs uppercase font-bold tracking-[0.16em] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60"
                >
                  <Mail className="w-4 h-4 text-white" />
                  <span>{loading ? 'Dispatching...' : 'Send via Email'}</span>
                </button>

              </div>

              {/* Subtle Trust Badge */}
              <div className="pt-3 text-center text-xs text-[#8C7A68]">
                <span>Verified SAELYXE Concierge Desk · WhatsApp: <strong className="text-[#1A1816]">{WHATSAPP_DISPLAY}</strong> · Email: <strong className="text-[#1A1816]">{SUPPORT_EMAIL}</strong></span>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
