import React from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  Truck, 
  AlertTriangle, 
  Clock, 
  Info, 
  HelpCircle,
  FileText,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LegalReturnsPage: React.FC = () => {
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
            <RotateCcw className="w-3.5 h-3.5 text-[#857768]" />
            HOUSE OF SAELYXE • OFFICIAL POLICIES
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1816] font-normal tracking-tight leading-tight">
            Refund & Return Policy
          </h1>
          <p className="text-sm text-[#7A6E60] font-light max-w-2xl">
            Thank you for shopping with SAELYXE. We value your trust and are committed to providing you with a premium shopping experience. If you experience any issue with your order, our support team is here to assist you.
          </p>
        </div>

        {/* Highlight Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">7-Day Eligibility</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Returns & exchanges accepted within 7 days of order receipt.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <CreditCard className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">PayHere & Card Refunds</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Processed securely to your original payment method.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Size & Product Exchange</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Bespoke exchange options subject to stock availability.</p>
          </div>

          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center text-[#5C5042]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Defect Guarantee</h4>
            <p className="text-[12px] text-[#7A6E60] font-light leading-snug">Full support & resolution for damaged or wrong items.</p>
          </div>
        </div>

        {/* Detailed Policy Sections */}
        <div className="space-y-10 text-sm text-[#3A332C] leading-relaxed font-light">
          
          {/* Returns */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Returns
              </h2>
            </div>
            <p>
              We accept eligible returns within <strong className="font-semibold text-[#1A1816]">7 days of receiving your order</strong>.
            </p>
            <p className="font-medium text-[#1A1816] pt-1">
              To be eligible for a return, the item must be:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                "Unworn and unused",
                "In its original condition",
                "Free from stains, perfume, makeup, washing, alterations, or other signs of use",
                "Returned with the original tags, labels, and packaging where applicable"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#4A4036] bg-[#FAF8F5] p-3 rounded-lg border border-[#EDE5DA]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#7A6E60] italic pt-2">
              Items that do not meet these conditions may not be accepted for return.
            </p>
          </section>

          {/* Refunds */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Refunds
              </h2>
            </div>
            <p>
              Once we receive and inspect the returned item, we will notify you whether the return has been approved.
            </p>
            <p>
              If approved, the eligible refund will be processed through the original payment method or the applicable payment processor, including <strong className="font-semibold text-[#1A1816]">PayHere where applicable</strong>.
            </p>
            <p>
              Any shipping or delivery charges paid for the original order may be non-refundable, except where the return is caused by an error on our part, such as sending the wrong item or an item that arrived damaged or defective.
            </p>
            <p className="text-xs text-[#7A6E60]">
              Refund processing times may vary depending on the payment processor, bank, or card issuer.
            </p>
          </section>

          {/* Exchanges */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Exchanges
              </h2>
            </div>
            <p>
              We may offer exchanges for an alternative <strong className="font-semibold text-[#1A1816]">size or eligible product</strong>, subject to stock availability.
            </p>
            <p>
              Exchange requests must be made within <strong className="font-semibold text-[#1A1816]">7 days of receiving your order</strong>. Customers should contact our support team before sending any item back so that the exchange can be reviewed and the appropriate return instructions provided.
            </p>
          </section>

          {/* Non-Returnable Items */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FFF5F5] text-rose-700">
                <XCircle className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Non-Returnable Items
              </h2>
            </div>
            <p className="font-medium text-[#1A1816]">
              The following items are generally not eligible for return or refund:
            </p>
            <ul className="space-y-2.5">
              {[
                "Items that have been worn, washed, altered, stained, damaged, or otherwise used",
                "Items without required original tags or packaging, where applicable",
                "Products damaged after delivery due to customer handling or misuse",
                "Customised or personalised products, unless the item is defective or incorrectly supplied",
                "Any other item specifically identified as non-returnable at the time of purchase"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#5C4A3A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Damaged or Defective Items */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FFFBEB] text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Damaged or Defective Items
              </h2>
            </div>
            <p>
              If your order arrives <strong className="font-semibold text-[#1A1816]">damaged, defective, or incorrect</strong>, please contact House of Saelyxe customer support as soon as possible after delivery.
            </p>
            <p>
              You may be required to provide clear photographs or other reasonable evidence of the issue so that we can review the claim.
            </p>
            <p>
              After verification, we may provide a <strong className="font-semibold text-[#1A1816]">replacement, exchange, or refund</strong>, depending on the circumstances and product availability.
            </p>
            <p className="text-xs bg-[#FAF5EE] p-3 rounded-lg border border-[#EDE5DA] text-[#5C5042]">
              Where the issue was caused by an error on our part, we will take reasonable steps to resolve the matter without charging the customer for the applicable return process.
            </p>
          </section>

          {/* Return Shipping */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <Truck className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Return Shipping
              </h2>
            </div>
            <p>
              For customer-requested returns that are not caused by a fault or error on our part, the customer may be responsible for the applicable return shipping costs.
            </p>
            <p>
              Where the return is due to an incorrect item, defective product, or another confirmed error by House of Saelyxe, we will determine the appropriate shipping arrangement.
            </p>
          </section>

          {/* Order Cancellation */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Order Cancellation
              </h2>
            </div>
            <p>
              Cancellation requests should be submitted as soon as possible after placing an order.
            </p>
            <p>
              An order may not be cancellable once it has been processed, packed, dispatched, or otherwise entered the fulfilment process.
            </p>
            <p>
              Where a cancellation is approved and payment has already been made, any applicable refund will be processed through the relevant payment method or payment processor.
            </p>
          </section>

          {/* Payment Method & PayHere */}
          <section className="bg-[#FAF6F0] border border-[#DFD5C6] p-6 sm:p-8 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E3D8C8] pb-4">
              <div className="p-2 rounded-lg bg-[#EAE0D2] text-[#4A3E30]">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Payment Method & PayHere
              </h2>
            </div>
            <p>
              Saelyxe uses <strong className="font-semibold text-[#1A1816]">PayHere and other authorised payment methods</strong> for applicable online payments.
            </p>
            <p>
              A payment is considered successfully received only when the payment has been successfully confirmed by the relevant payment processor.
            </p>
            <p>
              House of Saelyxe does not request or store customers' full card details for payment processing. Payment card information is handled through the applicable payment service provider.
            </p>
            <p className="text-xs text-[#5C5042] leading-relaxed">
              Where a refund relates to a PayHere transaction, the refund will be handled through the applicable payment and payment-processing procedures. The time required for the refunded amount to appear in a customer's account may depend on the payment provider, issuing bank, or card issuer.
            </p>
          </section>

          {/* Processing Time */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Processing Time
              </h2>
            </div>
            <p>
              Approved returns, exchanges, and refunds will be processed within a reasonable business period after the returned item has been received and inspected.
            </p>
            <p className="text-xs text-[#7A6E60]">
              The actual time for a refunded amount to appear in your account may vary depending on your bank, card issuer, PayHere, or other applicable payment provider.
            </p>
          </section>

          {/* Important Notice */}
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-[#F0E8DD] pb-4">
              <div className="p-2 rounded-lg bg-[#FAF5EE] text-[#6E6050]">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1A1816]">
                Important Notice
              </h2>
            </div>
            <p>
              Customers should carefully check the <strong className="font-semibold text-[#1A1816]">size, colour, product details, delivery address, and contact information</strong> before completing an order.
            </p>
            <p>
              House of Saelyxe is not responsible for issues caused by incorrect or incomplete customer-provided information, subject to applicable consumer rights and law.
            </p>
            <p className="text-xs text-[#7A6E60] border-t border-[#F0E8DD] pt-3">
              Nothing in this Refund & Return Policy is intended to remove or limit any rights available to consumers under applicable Sri Lankan law.
            </p>
          </section>

        </div>

        {/* Contact Us CTA Box */}
        <div className="bg-[#1A1816] text-[#FAF8F5] p-8 sm:p-10 rounded-2xl space-y-5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-white font-normal">
              Need assistance with a return or exchange?
            </h3>
            <p className="text-xs text-stone-300 font-light max-w-lg">
              For return, exchange, refund, or order-related assistance, please contact saelyxe Customer Support through our official concierge channel. We are committed to handling customer concerns fairly.
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

