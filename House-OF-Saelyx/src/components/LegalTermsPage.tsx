import React from 'react';
import { 
  ArrowLeft, 
  Scale, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  CreditCard, 
  Truck, 
  AlertTriangle, 
  ShoppingBag, 
  Clock, 
  FileText, 
  Lock, 
  Globe, 
  Gavel, 
  MessageSquare
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LegalTermsPage: React.FC = () => {
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
            <Scale className="w-3.5 h-3.5 text-[#857768]" />
            HOUSE OF SAELYXE • TERMS OF SERVICE & CONDITIONS
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1816] font-normal tracking-tight leading-tight">
            SAELYXE Terms & Conditions
          </h1>
          <p className="text-xs text-[#7A6E60] uppercase tracking-widest font-mono">
            Last Updated: September 3, 2026
          </p>
          <p className="text-sm text-[#7A6E60] font-light max-w-3xl leading-relaxed pt-1">
            Welcome to <strong className="font-semibold text-[#1A1816]">SAELYXE</strong>. These Terms & Conditions govern your access to and use of the SAELYXE website, your SAELYXE account, and the purchase of products through our online store.
          </p>
          <p className="text-xs text-[#7A6E60] italic">
            By accessing our website, creating an account, or placing an order, you acknowledge that you have read, understood, and agreed to these Terms & Conditions and our applicable policies, including our <button onClick={() => navigateTo({ name: 'legal-privacy' })} className="underline hover:text-[#1A1816]">Privacy Policy</button> and <button onClick={() => navigateTo({ name: 'legal-returns' })} className="underline hover:text-[#1A1816]">Refund & Return Policy</button>.
          </p>
        </div>

        {/* Highlight Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <UserCheck className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">18+ Age Requirement</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Intended for customers 18 years of age or older.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <UserX className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">No Guest Checkout</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Eligible customer account required to place orders.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <CreditCard className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">PayPal Payments</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Authorised online payments with no full card storage on SAELYXE servers.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <Gavel className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Sri Lankan Law</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Governed by applicable laws & consumer rights in Sri Lanka.</p>
          </div>
        </div>

        {/* Detailed Sections List */}
        <div className="space-y-8 text-sm text-[#3A332C] leading-relaxed font-light">
          
          {/* Section 1 & 2 & 3 */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">1</span>
                Eligibility & Age Requirement
              </h3>
              <p className="text-xs sm:text-sm">
                SAELYXE is intended for customers who are <strong className="font-semibold text-[#1A1816]">18 years of age or older</strong>. By creating an account or placing an order, you confirm that you are at least 18 years old and legally able to enter into a transaction. SAELYXE does not knowingly accept purchases from individuals under 18 years of age.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">2</span>
                Account Registration
              </h3>
              <p className="text-xs sm:text-sm">
                Certain SAELYXE features and purchases require customers to create and maintain a personal account. Customers agree to provide accurate, current, and complete information, maintain account security, and not create accounts using false or unauthorised details. SAELYXE may restrict, suspend, or terminate accounts where there is evidence of fraud or misuse.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6 bg-[#FAF6F0] p-4 rounded-xl border border-[#E0D5C7]">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#E4D7C5] text-[#4A3E30] text-xs font-mono flex items-center justify-center">3</span>
                No Guest Checkout
              </h3>
              <p className="text-xs sm:text-sm text-[#4A3E30]">
                SAELYXE does not provide <strong className="font-semibold text-[#1A1816]">guest checkout</strong> where an order can be placed without an eligible customer account. Customers must use their own authorised SAELYXE account when placing an order. An account must not be created or used on behalf of another person without proper authorisation.
              </p>
            </div>
          </section>

          {/* Section 4 & 5 */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">4</span>
                Customer Information
              </h3>
              <p className="text-xs sm:text-sm">
                Customers are responsible for providing accurate information during registration and checkout (Full name, email, mobile number, delivery address, billing details). SAELYXE may not be responsible for delivery failures, delays, or communication errors caused by inaccurate customer information.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">5</span>
                Website Use & Restrictions
              </h3>
              <p className="text-xs sm:text-sm">
                Customers agree to use the SAELYXE website only for lawful purposes. You must not use the website for fraudulent activity, attempt unauthorised system access, upload malicious code, scrape data via automated tools, impersonate others, or misuse promotional offers.
              </p>
            </div>
          </section>

          {/* Section 6, 7 & 8 */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">6</span>
                Product Information
              </h3>
              <p className="text-xs sm:text-sm">
                SAELYXE makes reasonable efforts to ensure accurate product descriptions, images, colours, measurements, and availability. Slight variations may occur due to screen settings, lighting, or manufacturing factors. Images are for illustrative purposes.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">7</span>
                Product Availability & Stock
              </h3>
              <p className="text-xs sm:text-sm">
                All products are subject to availability (In-stock, limited-stock, pre-order, or temporarily sold out). In the event of a system error displaying an unavailable item as available, SAELYXE reserves the right to cancel the order and issue a full refund.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">8</span>
                Pre-Orders
              </h3>
              <p className="text-xs sm:text-sm">
                Where a product is offered as a <strong className="font-semibold text-[#1A1816]">pre-order</strong>, estimated dispatch periods will be communicated on the product page. Pre-order timelines may change due to production or logistics factors beyond reasonable control.
              </p>
            </div>
          </section>

          {/* Section 9 & 10 */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">9</span>
                Pricing & Price Errors
              </h3>
              <p className="text-xs sm:text-sm">
                Prices may change without prior notice. Price changes after a completed order will not affect that order. In the event of an obvious pricing or system error, SAELYXE may place the order on hold, contact the customer with the corrected price, or cancel the order with a full refund.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">10</span>
                Promotions, Discount Codes & Vouchers
              </h3>
              <p className="text-xs sm:text-sm">
                Promotions and discount vouchers are subject to specific conditions, eligibility rules, expiry dates, and usage limits per customer. Promotional benefits cannot be exchanged for cash.
              </p>
            </div>
          </section>

          {/* Section 11 & 12 */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">11</span>
                Orders & Acceptance
              </h3>
              <p className="text-xs sm:text-sm">
                Placing an order constitutes a request to purchase. Orders are subject to payment confirmation, stock verification, and acceptance by SAELYXE. We reserve the right to limit or cancel orders in cases of stock unavailability, pricing errors, or fraud verification.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">12</span>
                Order Confirmation
              </h3>
              <p className="text-xs sm:text-sm">
                After order submission, an order confirmation will be sent to your account email/contact. An order confirmation does not remove SAELYXE's right to review stock, payment, or pricing before dispatch.
              </p>
            </div>
          </section>

          {/* Section 13, 14, 15, 16 & 17 - Payment Methods & PayPal */}
          <section className="bg-[#FAF6F0] border border-[#DFD5C6] p-6 sm:p-8 rounded-2xl space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#E4D7C5] text-[#4A3E30] text-xs font-mono flex items-center justify-center">13</span>
                Payment Methods & No COD Policy
              </h3>
              <p className="text-xs sm:text-sm text-[#4A3E30]">
                SAELYXE accepts authorised online payment methods displayed on the website, including <strong className="font-semibold text-[#1A1816]">PayPal</strong>. SAELYXE does <strong className="font-semibold text-[#1A1816]">NOT accept Cash on Delivery (COD)</strong> unless expressly displayed on the website.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#E3D8C8] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#E4D7C5] text-[#4A3E30] text-xs font-mono flex items-center justify-center">14</span>
                PayPal Payments & Zero Card Storage
              </h3>
              <p className="text-xs sm:text-sm text-[#4A3E30]">
                Payments are processed through PayPal's infrastructure. An order is considered successfully paid only upon confirmation from the payment processor. SAELYXE does not intentionally store full credit/debit card numbers or security codes on its servers.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#E3D8C8] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#E4D7C5] text-[#4A3E30] text-xs font-mono flex items-center justify-center">15</span>
                Cardholder & Account Holder Verification
              </h3>
              <p className="text-xs sm:text-sm text-[#4A3E30]">
                The person placing an order must be authorised to use the selected payment method. For security, SAELYXE may review whether the payment holder and SAELYXE account holder are appropriately connected. Suspicious transactions may be delayed or cancelled.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E3D8C8] pt-6">
              <div className="p-3.5 bg-white/80 rounded-xl border border-[#E0D5C7] space-y-1">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">16. Payment Statuses</h4>
                <p className="text-xs text-[#5C5042]">
                  Status definitions: Pending (unconfirmed), Paid (confirmed), Failed (declined), Refunded (processed).
                </p>
              </div>

              <div className="p-3.5 bg-white/80 rounded-xl border border-[#E0D5C7] space-y-1">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">17. Duplicate Payments</h4>
                <p className="text-xs text-[#5C5042]">
                  If charged twice for an order, contact Customer Support with payment receipts for swift processor review and refund.
                </p>
              </div>
            </div>
          </section>

          {/* Section 18 & 19 - Shipping & Delivery */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">18</span>
                Shipping & Delivery Timelines
              </h3>
              <p className="text-xs sm:text-sm">
                SAELYXE provides delivery within <strong className="font-semibold text-[#1A1816]">Sri Lanka</strong>. Shipping charges are displayed at checkout. Estimated delivery timeframe is generally <strong className="font-semibold text-[#1A1816]">1–4 working days</strong>, depending on customer location and courier handling.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">19</span>
                Delivery Address & Failed Delivery
              </h3>
              <p className="text-xs sm:text-sm">
                Customers are responsible for providing complete and accurate address and contact details. SAELYXE is not responsible for delivery delays or extra re-dispatch costs caused by incorrect address info or customer unreachability.
              </p>
            </div>
          </section>

          {/* Section 20, 21 & 22 - Returns & Cancellations */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">20</span>
                Returns, Exchanges & Refunds
              </h3>
              <p className="text-xs sm:text-sm">
                Returns, exchanges, refunds, and defective claims are strictly governed by the <button onClick={() => navigateTo({ name: 'legal-returns' })} className="underline font-semibold text-[#1A1816]">SAELYXE Refund & Return Policy</button>.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">21</span>
                Order Cancellation
              </h3>
              <p className="text-xs sm:text-sm">
                Cancellation requests must be submitted as soon as possible. Orders cannot be cancelled once packed or dispatched. Approved cancellations will be refunded through the original payment processor.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">22</span>
                Damaged, Defective or Incorrect Products
              </h3>
              <p className="text-xs sm:text-sm">
                Contact Customer Support immediately upon delivery of damaged or incorrect items with clear photos/videos. Verified claims will be resolved via replacement, exchange, or refund without extra cost.
              </p>
            </div>
          </section>

          {/* Section 23, 24, 25 & 26 - IP, Content & Account Deletion */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">23</span>
                Intellectual Property
              </h3>
              <p className="text-xs sm:text-sm">
                All content (brand names, logos, product images, designs, text, graphics, layouts) is owned by or licensed to SAELYXE and protected by intellectual property laws. Unauthorised reproduction or commercial exploitation is prohibited.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F0E8DD] text-[#6E6050] text-xs font-mono flex items-center justify-center">24</span>
                User-Submitted Content
              </h3>
              <p className="text-xs sm:text-sm">
                Reviews, feedback, or photos submitted by customers must be lawful. SAELYXE reserves the right to moderate or remove offensive, fraudulent, or unlawful content.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#F0E8DD] pt-6">
              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EDE5DA] space-y-1">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">25. Privacy & Personal Info</h4>
                <p className="text-xs text-[#6E6050]">
                  Personal data collection & usage is handled strictly according to the SAELYXE Privacy Policy.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EDE5DA] space-y-1">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">26. Account Deletion</h4>
                <p className="text-xs text-[#6E6050]">
                  Request account deletion via Contact Support. Retention applies for legal, accounting, and anti-fraud purposes.
                </p>
              </div>
            </div>
          </section>

          {/* Section 27 to 36 - Legal Framework & Governance */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">27. Website Availability</h4>
                <p className="text-xs text-[#5C5042]">
                  SAELYXE aims for high uptime but cannot guarantee uninterrupted service during maintenance or third-party outages.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">28. Third-Party Services</h4>
                <p className="text-xs text-[#5C5042]">
                  Services rely on trusted partners (PayPal, couriers, cloud hosting) operating under their respective privacy terms.
                </p>
              </div>

              <div className="space-y-2 border-t border-[#F0E8DD] pt-4">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">29. Limitation of Liability</h4>
                <p className="text-xs text-[#5C5042]">
                  To maximum extent permitted by law, SAELYXE is not liable for indirect or consequential losses.
                </p>
              </div>

              <div className="space-y-2 border-t border-[#F0E8DD] pt-4">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">30. Force Majeure</h4>
                <p className="text-xs text-[#5C5042]">
                  Not responsible for delays caused by natural disasters, severe weather, courier strikes, or system failures.
                </p>
              </div>

              <div className="space-y-2 border-t border-[#F0E8DD] pt-4">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">31. Anti-Fraud Activity</h4>
                <p className="text-xs text-[#5C5042]">
                  Right to investigate, restrict, or report suspicious transactions or promotional abuse to authorities.
                </p>
              </div>

              <div className="space-y-2 border-t border-[#F0E8DD] pt-4">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">32. Changes to Terms</h4>
                <p className="text-xs text-[#5C5042]">
                  Terms may be modified periodically. Continued site usage constitutes acceptance of updated terms.
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t border-[#F0E8DD] pt-6">
              <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#DFD5C6] space-y-2">
                <h4 className="font-serif text-base font-semibold text-[#1A1816]">33 & 34. Governing Law & Sri Lankan Consumer Rights</h4>
                <p className="text-xs text-[#4A3E30] leading-relaxed">
                  These Terms & Conditions shall be interpreted and applied in accordance with the <strong className="font-semibold text-[#1A1816]">laws applicable in Sri Lanka</strong>. Nothing in these Terms & Conditions is intended to remove, restrict, or waive any mandatory consumer rights or protections available under applicable Sri Lankan law.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="font-serif text-sm font-semibold text-[#1A1816]">35. Dispute Resolution & Complaints</h4>
                <p className="text-xs text-[#5C5042]">
                  Customers are encouraged to contact SAELYXE Customer Support to resolve any complaint, dispute, payment, or delivery issue fairly.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Section 36 - Contact Us CTA Box */}
        <div className="bg-[#1A1816] text-[#FAF8F5] p-8 sm:p-10 rounded-2xl space-y-5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-white font-normal">
              36. Contact SAELYXE Support
            </h3>
            <p className="text-xs text-stone-300 font-light max-w-lg">
              For questions relating to these Terms & Conditions, orders, payments, refunds, or account issues, please contact SAELYXE Customer Support with your order number and registered account details.
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

