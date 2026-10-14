import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  Gift,
  Heart,
  Sparkles,
  Send,
  X,
  ThumbsUp,
} from 'lucide-react';
import { Order, Business, Branch } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export interface GoogleReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  business: Business;
  branch?: Branch | null;
  onSubmitReview?: (review: {
    rating: number;
    feedback?: string;
    platform: 'GOOGLE' | 'INTERNAL';
  }) => void;
  previewMode?: boolean;
}

const COMPLIMENT_TAGS = [
  '☕ Incredible Coffee & Drinks',
  '⚡ Fast & Courteous Service',
  '✨ Beautiful Ambiance',
  '🍕 Delicious & Fresh Food',
  '🧁 Heavenly Desserts',
  '👨‍🍳 Friendly Staff',
];

const RATING_MESSAGES: Record<number, { title: string; subtitle: string; icon: string }> = {
  5: {
    title: 'Outstanding Experience!',
    subtitle: 'Loved everything! Would you mind sharing a quick review on Google?',
    icon: '😍',
  },
  4: {
    title: 'Great Experience!',
    subtitle: 'So glad you enjoyed your meal! Help fellow foodies find us on Google.',
    icon: '😊',
  },
  3: {
    title: 'Thank you for dining with us',
    subtitle: 'How can we make your next visit a 5-star experience?',
    icon: '🙂',
  },
  2: {
    title: 'We are sorry we fell short',
    subtitle: 'Please let our management know what went wrong so we can fix it.',
    icon: '😕',
  },
  1: {
    title: 'We sincerely apologize',
    subtitle: 'Please tell us what happened so our team can resolve it immediately.',
    icon: '😞',
  },
};

export const GoogleReviewModal: React.FC<GoogleReviewModalProps> = ({
  isOpen,
  onClose,
  order,
  business,
  branch,
  onSubmitReview,
  previewMode = false,
}) => {
  const { success, info } = useToast();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  const minRatingForGoogle = business.min_rating_for_google ?? 4;
  const isPositiveRating = rating >= minRatingForGoogle;

  // Resolve review URL from branch or business
  const reviewUrl =
    branch?.google_review_url ||
    business.google_review_url ||
    `https://www.google.com/search?q=${encodeURIComponent(`${business.name} ${branch?.name || ''} reviews`)}`;

  const rewardText =
    business.review_reward_text ||
    'Show your Google review to our staff or use code REVIEW10 for 10% off your next visit!';

  const couponCode = business.review_coupon_code || 'REVIEW10';

  const handleTagToggle = (tag: string) => {
    const isSelected = selectedTags.includes(tag);
    const updatedTags = isSelected
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(updatedTags);

    // Update feedback text based on selected tags
    if (!isSelected) {
      const cleanTag = tag.replace(/^[\p{Emoji}\s]+/u, '').trim();
      setFeedbackText((prev) => {
        if (!prev) return cleanTag;
        return `${prev}, ${cleanTag.toLowerCase()}`;
      });
    }
  };

  const fullReviewContent = [
    feedbackText.trim(),
    selectedTags.length > 0 && !feedbackText.trim()
      ? `Highlights: ${selectedTags.map((t) => t.replace(/^[\p{Emoji}\s]+/u, '')).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const handleCopyReviewText = () => {
    const textToCopy = fullReviewContent || `Loved dining at ${business.name}! Fantastic food and great hospitality. Highly recommended!`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      success('Copied to Clipboard! 📋', 'Now click "Post on Google" and paste it in.');
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const handleGoToGoogle = () => {
    const textToCopy = fullReviewContent || `Loved dining at ${business.name}! Fantastic food and wonderful service. Highly recommended!`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      info('Review Copied! 📋', 'Your compliments were copied. Simply paste into Google Reviews!');
    }

    if (onSubmitReview) {
      onSubmitReview({
        rating,
        feedback: fullReviewContent,
        platform: 'GOOGLE',
      });
    }

    setHasSubmitted(true);
    window.open(reviewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendPrivateFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmitReview) {
      onSubmitReview({
        rating,
        feedback: feedbackText || 'Low rating submitted without comment.',
        platform: 'INTERNAL',
      });
    }
    setHasSubmitted(true);
    success('Feedback Sent to Management', 'Thank you for your honesty. The manager will review this promptly.');
  };

  const handleCopyCoupon = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(couponCode);
      success('Coupon Copied! 🎉', `Use ${couponCode} on your next order.`);
    }
  };

  const activeStarCount = hoverRating || rating;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      showCloseButton={true}
    >
      <div className="space-y-5 text-center">
        {/* Google Header Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/80 shadow-xl flex items-center justify-center p-2.5">
              <GoogleIcon className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1 shadow-md">
              <Star className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-medium text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Diner Feedback
              {order && <span className="text-amber-400 font-mono font-bold">&bull; {order.order_number}</span>}
            </div>

            <h3 className="text-xl font-extrabold text-slate-100 font-['Outfit'] mt-1.5">
              {business.name}
            </h3>
            {branch && <p className="text-xs text-slate-400">{branch.name}</p>}
          </div>
        </div>

        {/* Post-submission Thank You State */}
        {hasSubmitted ? (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-100 font-['Outfit']">
                Thank You for Your Feedback!
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {isPositiveRating
                  ? 'Your support means the world to our team and local kitchen crew.'
                  : 'We have received your private feedback and are committed to improving.'}
              </p>
            </div>

            {/* Reward claim voucher */}
            {isPositiveRating && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Diner Appreciation Reward</span>
                </div>
                <p className="text-xs text-slate-300">{rewardText}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono font-bold text-amber-400 text-sm tracking-wider bg-slate-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    {couponCode}
                  </span>
                  <button
                    onClick={handleCopyCoupon}
                    className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 font-medium px-2 py-1 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </button>
                </div>
              </div>
            )}

            <Button variant="primary" className="w-full" onClick={onClose}>
              Done & Return to Menu
            </Button>
          </div>
        ) : (
          /* Active Review Form */
          <div className="space-y-5">
            {/* 5-Star Interactive Rating */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Tap to rate your experience:</p>

              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= activeStarCount;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 sm:p-2 rounded-2xl transition-all duration-200 transform hover:scale-125 focus:outline-none cursor-pointer"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-200 ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                            : 'text-slate-700 hover:text-slate-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Rating Message */}
              <div className="h-10 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5 font-['Outfit']">
                  <span>{RATING_MESSAGES[rating]?.icon}</span>
                  <span>{RATING_MESSAGES[rating]?.title}</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {RATING_MESSAGES[rating]?.subtitle}
                </span>
              </div>
            </div>

            {/* Smart Review Flow */}
            {isPositiveRating ? (
              /* Positive Rating: Direct to Google Reviews with Compliment Tags */
              <div className="space-y-4 text-left">
                {/* One-Tap Tags */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    What stood out most? (Tap tags to include)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPLIMENT_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`text-xs px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Custom Comments */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Write your review:
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyReviewText}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                      title="Copy text before opening Google"
                    >
                      <Copy className="w-3 h-3" />
                      {isCopied ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="e.g. The barista prepared the smoothest Spanish latte, and the vibes were top-notch!"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Reward Banner Callout */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
                  <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-amber-300 font-semibold block">Diner Reward:</strong>
                    {rewardText}
                  </div>
                </div>

                {/* Primary Google Action Button */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGoToGoogle}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer font-['Outfit']"
                  >
                    <GoogleIcon className="w-5 h-5" />
                    <span>Post Review on Google</span>
                    <ExternalLink className="w-4 h-4 text-slate-600 ml-auto" />
                  </button>

                  <p className="text-[11px] text-slate-500 text-center">
                    Clicking opens Google Reviews in a new tab. Your review text is auto-copied!
                  </p>
                </div>
              </div>
            ) : (
              /* Low Rating: Constructive Private Management Feedback */
              <form onSubmit={handleSendPrivateFeedback} className="space-y-3.5 text-left">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  We are genuinely sorry your experience was not ideal. Your feedback goes directly to executive management so we can rectify it.
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    What could we have done better?
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what went wrong (e.g., food temperature, waiting time, order accuracy)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full">
                  <Send className="w-4 h-4 mr-1.5" />
                  Send Private Feedback to Manager
                </Button>
              </form>
            )}

            {/* Dismissal option */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer"
              >
                {previewMode ? 'Close Preview' : 'Maybe Later'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
