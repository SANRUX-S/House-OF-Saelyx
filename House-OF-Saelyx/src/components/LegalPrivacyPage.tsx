import React from 'react';
import { 
  ArrowLeft, 
  Lock, 
  ShieldCheck, 
  Database, 
  CreditCard, 
  UserCheck, 
  Share2, 
  Cookie, 
  ShieldAlert, 
  Clock, 
  Sliders, 
  UserX, 
  ExternalLink, 
  RefreshCw, 
  MessageSquare
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LegalPrivacyPage: React.FC = () => {
  const { navigateTo } = useStore();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 pb-24 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Back Button */}
        <button
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7A6E60] hover:text-[#1A1816] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Return to Boutique</span>
        </button>

        {/* Title Header */}
        <div className="space-y-4 border-b border-[#E3D9CD] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE9E0] border border-[#DCD0C0] text-[11px] font-semibold uppercase tracking-[0.25em] text-[#7A6E60]">
            <Lock className="w-3.5 h-3.5 text-[#857768]" />
            HOUSE OF SAELYXE • CONFIDENTIALITY & DATA PROTECTION
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1816] font-normal tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#7A6E60] uppercase tracking-widest font-mono">
            Last Updated: September 6, 2026
          </p>
          <p className="text-sm text-[#7A6E60] font-light max-w-3xl leading-relaxed pt-1">
            At <strong className="font-semibold text-[#1A1816]">SAELYXE</strong>, we respect your privacy and are committed to protecting the personal information you provide when using our website, creating an account, placing an order, or contacting our customer support team.
          </p>
          <p className="text-xs text-[#7A6E60] italic">
            By using the SAELYXE website, you acknowledge and agree to the practices described in this Privacy Policy.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Zero Card Storage</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Card details are processed securely by PayPal without full card storage on our servers.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">No Data Selling</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">We never sell or rent your personal information to third parties.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <UserCheck className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Account Rights</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Manage, update, or request deletion of your account at any time.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <Cookie className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Cookie Control</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Manage your web tracking preferences directly in your browser.</p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-10 text-sm text-[#3A332C] leading-relaxed font-light">
          
          {/* Information We Collect */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Information We Collect
              </h2>
            </div>
            <p>
              When you use our website or place an order, we may collect information such as:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                "Full name",
                "Email address",
                "Mobile or telephone number",
                "Billing and delivery address",
                "Account and login information",
                "Order and purchase history",
                "Product preferences and interactions with our website",
                "Information provided when contacting customer support",
                "Information required to verify an order or resolve a payment, refund, return, or security issue"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#4A4036] bg-[#FAF8F5] p-3 rounded-lg border border-[#EDE5DA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#857768] shrink-0 mt-1.5"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#7A6E60] pt-2">
              We may also automatically collect certain technical information when you use our website, including your IP address, browser type, device information, operating system, website activity, and similar technical data.
            </p>
          </section>

          {/* Payment Information */}
          <section className="bg-[#FAF6F0] border border-[#DFD5C6] p-6 sm:p-8 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E3D8C8] pb-4">
              <div className="p-2 rounded-lg bg-[#EAE0D2] text-[#4A3E30]">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Payment Information
              </h2>
            </div>
            <p>
              SAELYXE uses <strong className="font-semibold text-[#1A1816]">PayPal</strong> to process online payments.
            </p>
            <p>
              Payment card details are processed through the applicable payment provider. SAELYXE does not intentionally store customers' full credit or debit card numbers or security codes on its own systems.
            </p>
            <p className="text-xs text-[#5C5042]">
              Payment providers may collect and process payment information in accordance with their own privacy policies, security practices, and terms.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <Sliders className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                How We Use Your Information
              </h2>
            </div>
            <p className="font-medium text-[#1A1816]">
              We may use the information we collect to:
            </p>
            <ul className="space-y-2 text-xs text-[#4A4036]">
              {[
                "Create and manage your SAELYXE account",
                "Process, confirm, and fulfil orders",
                "Arrange delivery of purchased products",
                "Process payments through PayPal",
                "Process refunds, returns, exchanges, and cancellations",
                "Contact you regarding your orders or account",
                "Provide customer support and respond to enquiries",
                "Verify information where reasonably necessary to prevent fraud or unauthorised transactions",
                "Detect, investigate, and prevent fraudulent, abusive, or suspicious activity",
                "Improve our website, products, services, and customer experience",
                "Maintain website security and functionality",
                "Send promotional or marketing communications where permitted and where you have provided the necessary consent"
              ].map((use, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#FAF8F5] border border-[#F0E8DD]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0 mt-1.5"></span>
                  <span>{use}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Account Information */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Account Information
              </h2>
            </div>
            <p>
              To place orders or access certain features, customers may be required to create and maintain an account.
            </p>
            <p>
              Customers are responsible for providing accurate and up-to-date information. We may use account information to identify customers, manage orders, provide support, and maintain account security.
            </p>
            <p className="text-xs text-[#7A6E60]">
              We may restrict, suspend, or terminate accounts where there is evidence of fraudulent, abusive, misleading, or unauthorised activity, subject to applicable law.
            </p>
            <p className="text-xs text-[#4A4036]">
              Order tracking is account-protected. Tracking lookups require an authenticated SAELYXE session and are limited to the account that placed the order (or authorised SAELYXE administrators). The tracking endpoint does not expose the customer's email address, phone number, street address, or payment details.
            </p>
          </section>

          {/* Information Sharing */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <Share2 className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Information Sharing
              </h2>
            </div>
            <p className="font-medium text-[#1A1816]">
              SAELYXE does not sell or rent customers' personal information.
            </p>
            <p>
              We may share information with trusted third parties where reasonably necessary to operate our business and provide our services, including:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE3D7] space-y-1.5">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Payment Service Providers</h4>
                <p className="text-xs text-[#665A4E]">
                  Payment information may be shared with PayPal to complete and verify transactions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE3D7] space-y-1.5">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Delivery & Logistics Providers</h4>
                <p className="text-xs text-[#665A4E]">
                  Relevant customer information, such as name, address, and contact number, may be shared with delivery partners to fulfil and deliver orders.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE3D7] space-y-1.5">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Technology & Service Providers</h4>
                <p className="text-xs text-[#665A4E]">
                  We may use third-party providers that support website hosting, security, analytics, communications, customer support, or other business functions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE3D7] space-y-1.5">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Legal & Regulatory Requirements</h4>
                <p className="text-xs text-[#665A4E]">
                  We may disclose information where required by applicable law, regulation, court order, or valid request from a competent authority.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#7A6E60] italic pt-1">
              We require service providers handling customer information on our behalf to use reasonable safeguards appropriate to the nature of the information.
            </p>
          </section>

          {/* Cookies and Similar Technologies */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <Cookie className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Cookies and Similar Technologies
              </h2>
            </div>
            <p>
              SAELYXE may use cookies and similar technologies to:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4A4036]">
              {[
                "Keep the website functioning correctly",
                "Remember customer preferences",
                "Maintain account and shopping-cart functionality",
                "Understand website usage and performance",
                "Improve the user experience",
                "Support security and fraud prevention",
                "Measure the effectiveness of relevant marketing activities"
              ].map((c, idx) => (
                <li key={idx} className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#F0E8DD] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#857768] shrink-0"></span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#7A6E60] pt-1">
              You may manage or disable cookies through your browser settings. However, disabling certain cookies may affect some website features or functionality.
            </p>
          </section>

          {/* Data Security & Retention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white border border-[#E6DCCF] p-6 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 border-b border-[#F0E8DD] pb-3">
                <ShieldAlert className="w-4 h-4 text-[#857768]" />
                <h3 className="font-serif text-lg font-semibold text-[#1A1816]">Data Security</h3>
              </div>
              <p className="text-xs text-[#5C5042] leading-relaxed">
                SAELYXE takes reasonable technical and organisational measures to protect personal information against unauthorised access, loss, misuse, alteration, disclosure, or destruction.
              </p>
              <p className="text-[11px] text-[#7A6E60] italic">
                However, no online transmission or electronic storage system can be guaranteed to be completely secure. Therefore, while we take reasonable precautions, we cannot guarantee absolute security of information transmitted over the internet.
              </p>
            </section>

            <section className="bg-white border border-[#E6DCCF] p-6 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 border-b border-[#F0E8DD] pb-3">
                <Clock className="w-4 h-4 text-[#857768]" />
                <h3 className="font-serif text-lg font-semibold text-[#1A1816]">Data Retention</h3>
              </div>
              <p className="text-xs text-[#5C5042] leading-relaxed">
                We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including fulfilling orders, maintaining accounts, providing customer support, resolving disputes, preventing fraud, meeting legal or regulatory obligations, and maintaining appropriate business records.
              </p>
              <p className="text-[11px] text-[#7A6E60] italic">
                When information is no longer reasonably required, it may be securely deleted, anonymised, or otherwise disposed of in accordance with applicable requirements.
              </p>
            </section>
          </div>

          {/* Your Privacy Choices & Children's Privacy */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <UserX className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Your Privacy Choices & Children's Privacy
              </h2>
            </div>
            <div className="space-y-3">
              <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Your Privacy Choices</h4>
              <p className="text-xs text-[#4A4036]">
                Subject to applicable law, you may have the right to request access to, correction of, or other appropriate handling of your personal information. You may also contact us regarding unwanted marketing communications or certain privacy-related concerns.
              </p>
              <p className="text-xs text-[#7A6E60]">
                Some information may need to be retained where required for legal, security, accounting, fraud-prevention, or legitimate business purposes.
              </p>
            </div>
            <div className="space-y-3 pt-3 border-t border-[#F0E8DD]">
              <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Children's Privacy</h4>
              <p className="text-xs text-[#4A4036]">
                SAELYXE is intended for customers who are <strong className="font-semibold text-[#1A1816]">18 years of age or older</strong>. We do not knowingly provide our services to individuals under 18. If we become aware that personal information has been provided by a person under the applicable age requirement, we may take reasonable steps to remove or handle that information appropriately.
              </p>
            </div>
          </section>

          {/* Third-Party Websites & Changes */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Third-Party Websites & Policy Changes
              </h2>
            </div>
            <div className="space-y-2">
              <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Third-Party Websites and Services</h4>
              <p className="text-xs text-[#4A4036]">
                Our website may contain links to third-party websites, services, social media platforms, or payment providers. SAELYXE is not responsible for the privacy practices, content, security, or policies of third-party services. Customers should review the relevant third party's privacy policy before providing personal information.
              </p>
            </div>
            <div className="space-y-2 pt-3 border-t border-[#F0E8DD]">
              <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Changes to This Privacy Policy</h4>
              <p className="text-xs text-[#4A4036]">
                SAELYXE may update or modify this Privacy Policy from time to time to reflect changes in our services, technology, legal requirements, or business practices. Any updated version will be published on this page with a revised <strong className="font-semibold text-[#1A1816]">Last Updated</strong> date.
              </p>
            </div>
          </section>

        </div>

        {/* Contact Us CTA Box */}
        <div className="bg-[#1A1816] text-[#FAF8F5] p-8 sm:p-10 rounded-2xl space-y-5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-white font-normal">
              Have privacy questions or data requests?
            </h3>
            <p className="text-xs text-stone-300 font-light max-w-lg">
              For questions, concerns, privacy requests, or complaints regarding the handling of your personal information, please contact SAELYXE Customer Support through our official Support page.
            </p>
          </div>
          <button
            onClick={() => navigateTo({ name: 'care-concierge' })}
            className="shrink-0 px-6 py-3.5 bg-white text-[#1A1816] text-xs font-semibold uppercase tracking-[0.2em] rounded-xl hover:bg-[#EFE9E0] transition-colors inline-flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact Support</span>
          </button>
        </div>

      </div>
    </div>
  );
};

