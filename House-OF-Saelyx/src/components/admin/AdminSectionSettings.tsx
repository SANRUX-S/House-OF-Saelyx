import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { DropSettings } from '../../types';

export interface AdminSectionSettingsProps {
  settings: DropSettings | null;
  onUpdateSettings: (newSettings: Partial<DropSettings>) => Promise<boolean>;
}

export const AdminSectionSettings: React.FC<AdminSectionSettingsProps> = ({ settings, onUpdateSettings }) => {
  const [sections, setSections] = useState({
    hero: true,
    spotlight: true,
    collection: true,
    socialFaq: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSections({
      hero: settings?.showHeroSection !== false,
      spotlight: settings?.showSpotlightSection !== false,
      collection: settings?.showCollectionSection !== false,
      socialFaq: settings?.showSocialFAQSection !== false
    });
  }, [settings]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    const success = await onUpdateSettings({
      showHeroSection: sections.hero,
      showSpotlightSection: sections.spotlight,
      showCollectionSection: sections.collection,
      showSocialFAQSection: sections.socialFaq
    });
    setIsSaving(false);
    if (success) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    }
  };

  const rows = [
    ['hero', 'Editorial Hero Section', 'High-fashion introduction banner and visual narrative.'],
    ['spotlight', 'Global Drop Spotlight', 'Main centerpiece section highlighting the active drop.'],
    ['collection', 'Boutique Catalog / Drops Grid', 'Display the curated release products.'],
    ['socialFaq', 'Atelier Authenticity & FAQ', 'Brand trust, dispatch schedules, and social proof.']
  ] as const;

  return (
    <form onSubmit={save} className="admin-card space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-stone-900">Homepage Section Controls</h3>
          <p className="text-xs text-stone-500 mt-1">Show or hide public homepage sections instantly.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
          <button type="submit" disabled={isSaving} className="btn-saelyxe-lime text-xs"><Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map(([key, title, description]) => (
          <div key={key} className="flex items-center justify-between gap-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div><h5 className="text-sm font-bold text-stone-900">{title}</h5><p className="text-xs text-stone-500">{description}</p></div>
            <label className="ios-switch">
              <input type="checkbox" checked={sections[key]} onChange={event => setSections(current => ({ ...current, [key]: event.target.checked }))} />
              <span className="ios-slider" />
            </label>
          </div>
        ))}
      </div>
    </form>
  );
};
