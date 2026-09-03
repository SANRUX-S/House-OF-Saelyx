import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export interface FaqItem {
  question: string;
  content: React.ReactNode;
}

interface FaqSectionProps {
  title?: string;
  items?: FaqItem[];
  defaultOpenIndex?: number | null;
}

const defaultFaqs: FaqItem[] = [
  {
    question: "WILL 003 RESTOCK?",
    content: (
      <div className="space-y-4 text-[13px] text-[#1a1a1a] font-normal leading-relaxed">
        <p>003 is our third drop. Limited pieces. No restocks.</p>
        <p>When it's gone, it's gone.</p>
      </div>
    )
  },
  {
    question: "HOW LONG IS SHIPPING?",
    content: (
      <div className="text-[13px] text-[#1a1a1a] font-normal leading-relaxed">
        Orders are processed within 1-2 business days. Express shipping typically arrives in 2-4 business days depending on your location.
      </div>
    )
  },
  {
    question: "HOW DOES SIZING FIT?",
    content: (
      <div className="text-[13px] text-[#1a1a1a] font-normal leading-relaxed">
        Designed for a tailored boxy fit. Fits true to size. If you prefer a more oversized drape, we recommend sizing up.
      </div>
    )
  },
  {
    question: "CAN I RETURN OR EXCHANGE?",
    content: (
      <div className="text-[13px] text-[#1a1a1a] font-normal leading-relaxed">
        Yes, we offer hassle-free returns and exchanges within 7 days of delivery provided items are unworn with original tags attached.
      </div>
    )
  },
  {
    question: "MORE QUESTIONS?",
    content: (
      <div className="text-[13px] text-[#1a1a1a] font-normal leading-relaxed">
        Reach out directly to our support team at support@saelyx.com or contact us via live chat anytime.
      </div>
    )
  }
];

export const FaqSection: React.FC<FaqSectionProps> = ({
  title = "QUESTIONS?",
  items = defaultFaqs,
  defaultOpenIndex = 0,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(defaultOpenIndex);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section className="w-full bg-[#f6f6f6] text-[#000000] pb-16 pt-8 px-4 sm:px-6 font-sans">
      <div className="max-w-[800px] mx-auto">
        {/* Main FAQ Header */}
        <h2 className="text-3xl sm:text-[40px] font-black tracking-tight text-[#000000] uppercase mb-8">
          {title}
        </h2>

        {/* Accordion Items Container */}
        <div className="border-t border-black">
          {items.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="border-b border-black">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full py-5 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
                >
                  <span className="text-sm sm:text-[15px] font-bold tracking-wider text-[#000000] uppercase">
                    {faq.question}
                  </span>
                  <span className="ml-4 flex-shrink-0 text-[#000000]">
                    {isOpen ? (
                      <Minus className="w-4 h-4 stroke-[2]" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[2]" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="pb-6 pt-1 transition-all duration-200 ease-out">
                    {faq.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};