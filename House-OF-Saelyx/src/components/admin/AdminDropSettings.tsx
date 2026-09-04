import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sparkles, 
  CheckCircle2, 
  Save, 
  Clock, 
  Truck, 
  Eye, 
  LayoutTemplate
} from 'lucide-react';
import { DropSettings } from '../../types';

export interface AdminDropSettingsProps {
  settings: DropSettings | null;
  onUpdateSettings: (newSettings: Partial<DropSettings>) => Promise<boolean>;
}

export const AdminDropSettings: React.FC<AdminDropSettingsProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [dropTitle, setDropTitle] = useState('');
  const [dropSubhead, setDropSubhead] = useState('');
  const [dropDesc, setDropDesc] = useState('');
  const [spotlightEyebrow, setSpotlightEyebrow] = useState('');
  const [spotlightPrice, setSpotlightPrice] = useState(0);
  const [countdownTarget, setCountdownTarget] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubhead, setHeroSubhead] = useState('');
  
  // Section visibility switches
  const [showHeroSection, setShowHeroSection] = useState(true);
  const [showSpotlightSection, setShowSpotlightSection] = useState(true);
  const [showCollectionSection, setShowCollectionSection] = useState(true);
  const [showSocialFAQSection, setShowSocialFAQSection] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setDropTitle(settings.spotlightTitle || 'THE SIGNATURE COORDINATES SET');
      setDropSubhead(settings.spotlightSubhead || 'A balanced pairing of relaxed weight & refined contour.');
      setDropDesc(settings.spotlightDescription || 'Cut from 400 GSM custom combed cotton, this two-piece ensemble redefines casual architectural tailoring.');
      setSpotlightEyebrow(settings.spotlightEyebrow || 'DROP 001');
      setSpotlightPrice(settings.spotlightPriceLKR || 38500);
      setCountdownTarget(settings.countdownTarget || new Date(Date.now() + 86400000 * 7).toISOString());
      setAnnouncementText(settings.announcementText || 'FREE WHITE-GLOVE DOORSTEP DELIVERY WITHIN SRI LANKA');
      setFreeShippingThreshold(settings.freeShippingThresholdLKR || 35000);
      setHeroHeadline(settings.heroHeadline || 'THE ATELIER COLLECTION');
      setHeroSubhead(settings.heroSubhead || 'A curation of our most refined heavyweight textures.');
      setShowHeroSection(settings.showHeroSection !== false);
      setShowSpotlightSection(settings.showSpotlightSection !== false);
      setShowCollectionSection(settings.showCollectionSection !== false);
      setShowSocialFAQSection(settings.showSocialFAQSection !== false);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setConfigSaved(false);

    try {
      const success = await onUpdateSettings({
        spotlightTitle: dropTitle,
        spotlightSubhead: dropSubhead,
        spotlightDescription: dropDesc,
        spotlightEyebrow,
        spotlightPriceLKR: Number(spotlightPrice),
        countdownTarget,
        announcementText,
        freeShippingThresholdLKR: Number(freeShippingThreshold),
        heroHeadline,
        heroSubhead,
        showHeroSection,
        showSpotlightSection,
        showCollectionSection,
        showSocialFAQSection
      });

      if (success) {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 3500);
      }
    } catch (err) {
      console.error('Failed to save drop settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Banner with Save Button */}
        <div className="admin-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-stone-900">
              Global Drop 001 Configuration
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Hero spotlight headline, countdown target, and boutique thresholds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {configSaved && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Published to Boutique!</span>
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="btn-saelyxe-lime text-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Publishing...' : 'SAVE & PUBLISH TO BOUTIQUE'}</span>
            </button>
          </div>
        </div>

        {/* Form Fields Card */}
        <div className="admin-card space-y-6">
          <div className="form-section-title">Spotlight Garment & Editorial Story</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label-custom">Spotlight Garment Headline</label>
              <input
                type="text"
                required
                value={dropTitle}
                onChange={e => setDropTitle(e.target.value)}
                className="form-input-custom"
                placeholder="THE SIGNATURE COORDINATES SET"
              />
            </div>

            <div>
              <label className="form-label-custom">Spotlight Eyebrow (e.g. DROP 001)</label>
              <input
                type="text"
                required
                value={spotlightEyebrow}
                onChange={e => setSpotlightEyebrow(e.target.value)}
                className="form-input-custom"
                placeholder="DROP 001"
              />
            </div>
          </div>

          <div>
            <label className="form-label-custom">Spotlight Subhead (Value Proposition)</label>
            <input
              type="text"
              required
              value={dropSubhead}
              onChange={e => setDropSubhead(e.target.value)}
              className="form-input-custom"
              placeholder="A balanced pairing of relaxed weight & refined contour."
            />
          </div>

          <div>
            <label className="form-label-custom">Editorial Story Description</label>
            <textarea
              rows={3}
              required
              value={dropDesc}
              onChange={e => setDropDesc(e.target.value)}
              className="form-textarea-custom"
              placeholder="Cut from 400 GSM custom combed cotton..."
            />
          </div>

          <div className="form-section-title pt-4">Boutique Financial Thresholds & Hero</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label-custom">Spotlight Price (LKR)</label>
              <input
                type="number"
                required
                value={spotlightPrice}
                onChange={e => setSpotlightPrice(Number(e.target.value))}
                className="form-input-custom"
              />
            </div>

            <div>
              <label className="form-label-custom">Free Shipping Threshold (LKR)</label>
              <input
                type="number"
                required
                value={freeShippingThreshold}
                onChange={e => setFreeShippingThreshold(Number(e.target.value))}
                className="form-input-custom"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label-custom">Hero Main Headline (Home Page)</label>
              <input
                type="text"
                required
                value={heroHeadline}
                onChange={e => setHeroHeadline(e.target.value)}
                className="form-input-custom"
                placeholder="THE ATELIER COLLECTION"
              />
            </div>

            <div>
              <label className="form-label-custom">Hero Subheading</label>
              <input
                type="text"
                required
                value={heroSubhead}
                onChange={e => setHeroSubhead(e.target.value)}
                className="form-input-custom"
                placeholder="A curation of our most refined heavyweight textures."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label-custom">Announcement Bar Banner Text</label>
              <input
                type="text"
                required
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                className="form-input-custom"
                placeholder="FREE WHITE-GLOVE DOORSTEP DELIVERY WITHIN SRI LANKA"
              />
            </div>

            <div>
              <label className="form-label-custom">Countdown Timer Target (ISO Date Format)</label>
              <input
                type="text"
                required
                value={countdownTarget}
                onChange={e => setCountdownTarget(e.target.value)}
                className="form-input-custom font-mono text-xs"
                placeholder="2026-09-15T18:00:00.000Z"
              />
            </div>
          </div>
        </div>

        {/* Homepage Section Controls with iOS Style Switches */}
        <div className="admin-card space-y-5">
          <div className="form-section-title">
            Homepage Section Controls
            <span className="text-xs font-normal text-stone-500 block mt-1">
              Toggle visibility of specific layout modules across the public showcase instantly.
            </span>
          </div>

          <div className="space-y-4">
            {/* Switch 1: Editorial Hero Section */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div>
                <h5 className="text-sm font-bold text-stone-900">Editorial Hero Section</h5>
                <p className="text-xs text-stone-500">High-fashion introduction banner & visual narrative.</p>
              </div>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={showHeroSection}
                  onChange={e => setShowHeroSection(e.target.checked)}
                />
                <span className="ios-slider" />
              </label>
            </div>

            {/* Switch 2: Global Drop Spotlight */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div>
                <h5 className="text-sm font-bold text-stone-900">Global Drop Spotlight</h5>
                <p className="text-xs text-stone-500">Main centerpiece section highlighting active drop.</p>
              </div>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={showSpotlightSection}
                  onChange={e => setShowSpotlightSection(e.target.checked)}
                />
                <span className="ios-slider" />
              </label>
            </div>

            {/* Switch 3: Boutique Catalog / Drops Grid */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div>
                <h5 className="text-sm font-bold text-stone-900">Boutique Catalog / Drops Grid</h5>
                <p className="text-xs text-stone-500">Display full grids of all curated release products.</p>
              </div>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={showCollectionSection}
                  onChange={e => setShowCollectionSection(e.target.checked)}
                />
                <span className="ios-slider" />
              </label>
            </div>

            {/* Switch 4: Atelier Authenticity & FAQ */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div>
                <h5 className="text-sm font-bold text-stone-900">Atelier Authenticity & FAQ</h5>
                <p className="text-xs text-stone-500">Brand trust, dispatch schedules, & social proof elements.</p>
              </div>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={showSocialFAQSection}
                  onChange={e => setShowSocialFAQSection(e.target.checked)}
                />
                <span className="ios-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-saelyxe-primary"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Publishing Changes...' : 'SAVE & PUBLISH TO BOUTIQUE'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
