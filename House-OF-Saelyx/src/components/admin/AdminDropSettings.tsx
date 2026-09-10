import React, { useEffect, useState } from 'react';
import { Settings, CheckCircle2, Save, AlertCircle, UploadCloud } from 'lucide-react';
import { DropSettings } from '../../types';
import { ADMIN_IMAGE_ACCEPT, isSupportedAdminImageFile, uploadAdminImage } from '../../lib/adminMedia';

export interface AdminDropSettingsProps {
  settings: DropSettings | null;
  onUpdateSettings: (newSettings: Partial<DropSettings>) => Promise<boolean>;
}

export const AdminDropSettings: React.FC<AdminDropSettingsProps> = ({ settings, onUpdateSettings }) => {
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
  const [spotlightBackgroundImage, setSpotlightBackgroundImage] = useState('');
  const [showHeroSection, setShowHeroSection] = useState(true);
  const [showSpotlightSection, setShowSpotlightSection] = useState(true);
  const [showCollectionSection, setShowCollectionSection] = useState(true);
  const [showSocialFAQSection, setShowSocialFAQSection] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [backgroundError, setBackgroundError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!settings) return;
    setDropTitle(settings.spotlightTitle ?? 'THE SIGNATURE COORDINATES SET');
    setDropSubhead(settings.spotlightSubhead ?? 'A balanced pairing of relaxed weight & refined contour.');
    setDropDesc(settings.spotlightDescription ?? 'Cut from 400 GSM custom combed cotton, this two-piece ensemble redefines casual architectural tailoring.');
    setSpotlightEyebrow(settings.spotlightEyebrow ?? 'DROP 001');
    setSpotlightPrice(settings.spotlightPriceLKR ?? 38500);
    setCountdownTarget(settings.countdownTarget ?? new Date(Date.now() + 86400000 * 7).toISOString());
    setAnnouncementText(settings.announcementText ?? 'FREE WHITE-GLOVE DOORSTEP DELIVERY WITHIN SRI LANKA');
    setFreeShippingThreshold(settings.freeShippingThresholdLKR ?? 35000);
    setHeroHeadline(settings.heroHeadline ?? 'THE SAELYXE COLLECTION');
    setHeroSubhead(settings.heroSubhead ?? 'A curation of our most refined heavyweight textures.');
    setSpotlightBackgroundImage(settings.spotlightBackgroundImage ?? '');
    setShowHeroSection(settings.showHeroSection !== false);
    setShowSpotlightSection(settings.showSpotlightSection !== false);
    setShowCollectionSection(settings.showCollectionSection !== false);
    setShowSocialFAQSection(settings.showSocialFAQSection !== false);
  }, [settings]);

  const handleBackgroundImage = async (file?: File) => {
    if (!file || isUploadingBackground || isSaving) return;
    if (!isSupportedAdminImageFile(file)) {
      setBackgroundError('Use a JPG, PNG, WebP, or AVIF image.');
      return;
    }
    setIsUploadingBackground(true);
    setBackgroundError('');
    try {
      const url = await uploadAdminImage(file, 'settings');
      setSpotlightBackgroundImage(url);
    } catch (error) {
      setBackgroundError(error instanceof Error ? error.message : 'Background image upload failed.');
    } finally {
      setIsUploadingBackground(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || isUploadingBackground) return;
    setIsSaving(true);
    setConfigSaved(false);
    setSaveError('');
    try {
      const success = await onUpdateSettings({
        spotlightTitle: dropTitle.trim(),
        spotlightSubhead: dropSubhead.trim(),
        spotlightDescription: dropDesc.trim(),
        spotlightEyebrow: spotlightEyebrow.trim(),
        spotlightPriceLKR: Number(spotlightPrice),
        countdownTarget: countdownTarget.trim(),
        announcementText: announcementText.trim(),
        freeShippingThresholdLKR: Number(freeShippingThreshold),
        heroHeadline: heroHeadline.trim(),
        heroSubhead: heroSubhead.trim(),
        spotlightBackgroundImage,
        showHeroSection,
        showSpotlightSection,
        showCollectionSection,
        showSocialFAQSection
      });
      if (!success) {
        setSaveError('Settings were not published. Check the field values and your Super Admin session.');
        return;
      }
      setConfigSaved(true);
      window.setTimeout(() => setConfigSaved(false), 3500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Settings were not published. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="admin-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div><h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2"><Settings className="w-4 h-4" />Storefront Configuration</h3><p className="text-xs text-stone-500 mt-0.5">Manage spotlight content, homepage copy, thresholds, and section visibility.</p></div>
          <div className="flex items-center gap-3">
            {configSaved && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"><CheckCircle2 className="w-4 h-4" />Published</span>}
            <button type="submit" disabled={isSaving || isUploadingBackground} className="btn-saelyxe-lime text-xs disabled:opacity-50"><Save className="w-4 h-4" /><span>{isSaving ? 'Publishing...' : 'SAVE & PUBLISH'}</span></button>
          </div>
        </div>

        {saveError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{saveError}</div>}

        <div className="admin-card space-y-6">
          <div className="form-section-title">Spotlight Garment & Editorial Story</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="form-label-custom">Spotlight Garment Headline</label><input type="text" required value={dropTitle} onChange={event => setDropTitle(event.target.value)} className="form-input-custom" /></div>
            <div><label className="form-label-custom">Spotlight Eyebrow</label><input type="text" required value={spotlightEyebrow} onChange={event => setSpotlightEyebrow(event.target.value)} className="form-input-custom" /></div>
          </div>
          <div><label className="form-label-custom">Spotlight Subhead</label><input type="text" required value={dropSubhead} onChange={event => setDropSubhead(event.target.value)} className="form-input-custom" /></div>
          <div><label className="form-label-custom">Editorial Story Description</label><textarea rows={3} required value={dropDesc} onChange={event => setDropDesc(event.target.value)} className="form-textarea-custom" /></div>

          <div>
            <label className="form-label-custom">Spotlight Background (recommended 1920 × 1080)</label>
            <div className="rounded-xl border-2 border-dashed border-stone-200 p-4 text-center text-xs text-stone-500 hover:border-stone-400" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void handleBackgroundImage(Array.from(event.dataTransfer.files || [])[0]); }}>
              <UploadCloud className="w-5 h-5 mx-auto mb-2 text-stone-500" />
              <p className="font-semibold text-stone-700">{isUploadingBackground ? 'Uploading image...' : 'Drag and drop a JPG, PNG, WebP, or AVIF image here.'}</p>
              <label className={`mt-3 inline-flex cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold text-stone-700 ${isUploadingBackground || isSaving ? 'pointer-events-none opacity-50' : 'hover:bg-stone-50'}`}>Choose image<input type="file" accept={ADMIN_IMAGE_ACCEPT} className="hidden" disabled={isUploadingBackground || isSaving} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void handleBackgroundImage(file); }} /></label>
            </div>
            {backgroundError && <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{backgroundError}</div>}
            {spotlightBackgroundImage && <img src={spotlightBackgroundImage} alt="Spotlight background preview" className="mt-3 aspect-video w-full rounded-xl border border-stone-200 object-cover" />}
          </div>

          <div className="form-section-title pt-4">Boutique Financial Thresholds & Hero</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="form-label-custom">Spotlight Price (LKR)</label><input type="number" required min={0} step={1} value={spotlightPrice} onChange={event => setSpotlightPrice(Number(event.target.value))} className="form-input-custom" /></div>
            <div><label className="form-label-custom">Free Shipping Threshold (LKR)</label><input type="number" required min={0} step={1} value={freeShippingThreshold} onChange={event => setFreeShippingThreshold(Number(event.target.value))} className="form-input-custom" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="form-label-custom">Hero Main Headline</label><input type="text" required value={heroHeadline} onChange={event => setHeroHeadline(event.target.value)} className="form-input-custom" /></div>
            <div><label className="form-label-custom">Hero Subheading</label><input type="text" required value={heroSubhead} onChange={event => setHeroSubhead(event.target.value)} className="form-input-custom" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="form-label-custom">Announcement Bar Text</label><input type="text" required value={announcementText} onChange={event => setAnnouncementText(event.target.value)} className="form-input-custom" /></div>
            <div><label className="form-label-custom">Countdown Timer Target (ISO)</label><input type="text" required value={countdownTarget} onChange={event => setCountdownTarget(event.target.value)} className="form-input-custom font-mono text-xs" /></div>
          </div>
        </div>

        <div className="admin-card space-y-5">
          <div className="form-section-title">Homepage Section Controls</div>
          {[
            ['Editorial Hero Section', showHeroSection, setShowHeroSection],
            ['Global Drop Spotlight', showSpotlightSection, setShowSpotlightSection],
            ['Boutique Catalog / Drops Grid', showCollectionSection, setShowCollectionSection],
            ['Brand Authenticity & FAQ', showSocialFAQSection, setShowSocialFAQSection]
          ].map(([label, checked, setter]) => (
            <div key={String(label)} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div><h5 className="text-sm font-bold text-stone-900">{String(label)}</h5></div>
              <label className="ios-switch"><input type="checkbox" checked={Boolean(checked)} onChange={event => (setter as React.Dispatch<React.SetStateAction<boolean>>)(event.target.checked)} /><span className="ios-slider" /></label>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2"><button type="submit" disabled={isSaving || isUploadingBackground} className="btn-saelyxe-lime text-xs disabled:opacity-50"><Save className="w-4 h-4" /><span>{isSaving ? 'Publishing...' : 'SAVE & PUBLISH TO BOUTIQUE'}</span></button></div>
      </form>
    </div>
  );
};
