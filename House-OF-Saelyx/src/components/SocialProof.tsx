import React from 'react';
import { Check } from 'lucide-react';

interface SocialProofProps {
  customerCount?: string;
  quote?: string;
  authorName?: string;
  purchasedItem?: string;
  onItemClick?: () => void;
}

export const SocialProof: React.FC<SocialProofProps> = ({
  customerCount = "4,000+ Happy Customers!",
  quote = "Hands down the most comfiest Tracksuit I have ever ordered. If you want to buy it I would, it’s better than my Essentials tracksuit that i paid almost $500 for in total",
  authorName = "Brody",
  purchasedItem = "Black Hoodie",
  onItemClick,
}) => {
  return (
    <section className="w-full bg-[#f6f6f6] text-[#000000] pt-16 pb-8 px-4 sm:px-6 font-sans">
      <div className="max-w-[880px] mx-auto space-y-12">
        {/* Section Title */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-[28px] font-medium tracking-tight text-[#000000]">
            {customerCount}
          </h2>
        </div>

        {/* Floating Testimonial Card */}
        <div className="relative bg-[#f8f8f8] rounded-none px-8 py-10 sm:px-14 sm:py-12 text-center shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-[#eeeeee]">
          {/* Quote Mark Icon */}
          <div className="flex justify-center mb-6">
            <span className="text-4xl font-serif leading-none select-none text-[#000000]">
              ”
            </span>
          </div>

          {/* Testimonial Quote */}
          <p className="text-base sm:text-[17px] font-normal leading-relaxed text-[#1a1a1a] max-w-[700px] mx-auto mb-8">
            {quote}
          </p>

          {/* Author Name with Verified Check */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="text-sm font-bold text-[#000000]">{authorName}</span>
            <div className="w-3.5 h-3.5 rounded-full bg-black flex items-center justify-center text-white">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          </div>

          {/* Purchased Item Link */}
          <div>
            <span 
              onClick={onItemClick}
              className="text-xs font-normal underline underline-offset-4 text-[#000000] cursor-pointer hover:opacity-75 transition-opacity"
            >
              {purchasedItem}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};