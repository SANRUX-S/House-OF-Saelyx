import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Save, 
  Edit3, 
  X, 
  CheckCircle2, 
  Sparkles,
  ArrowLeft,
  Calendar,
  Key
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const ProfilePage: React.FC = () => {
  const { user, updateUserProfile, navigateTo } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Sri Lanka');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setAddress(user.address || '');
      setCity(user.city || '');
      setPostalCode(user.postalCode || '');
      setCountry(user.country || 'Sri Lanka');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const ok = await updateUserProfile({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim()
      });

      if (ok) {
        setIsEditing(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setAddress(user.address || '');
      setCity(user.city || '');
      setPostalCode(user.postalCode || '');
      setCountry(user.country || 'Sri Lanka');
    }
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-32 pb-24 px-5 sm:px-8">
        <div className="max-w-xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-[#EAE3D9] text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center mx-auto text-[#7A6E60]">
            <User className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1816] font-normal">
              AUTHENTICATION REQUIRED
            </h2>
            <p className="text-xs text-[#7A6E60] leading-relaxed max-w-md mx-auto">
              Please sign in with your House of Saelyx account or Google profile to access your private client records.
            </p>
          </div>
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="px-8 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-full transition-all shadow-md cursor-pointer"
          >
            RETURN TO BOUTIQUE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 sm:pt-28 pb-28 px-5 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#7A6E60] hover:text-[#1A1816] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Return to Boutique</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#7A6E60]">
            <ShieldCheck className="w-4 h-4 text-emerald-800 stroke-[1.5]" />
            <span>Encrypted Client Record</span>
          </div>
        </div>

        {/* Top Header Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1A1816] text-amber-200 border border-[#2E2A25] flex items-center justify-center font-serif text-2xl font-semibold shadow-md flex-shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name ? user.name[0]?.toUpperCase() : 'S'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#8C7A68]">
                  CLIENT DOSSIER
                </span>
                <span className="text-[9px] uppercase tracking-wider bg-[#F2EDE4] text-[#5A4E40] px-2 py-0.5 rounded font-medium">
                  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Director' : 'VIP Patron'}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#1A1816] font-normal tracking-tight">
                {user.name}
              </h1>
              <p className="text-xs text-[#7A6E60] mt-0.5">
                {user.email || 'Private Client'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-11 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.18em] font-medium rounded-full transition-all shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>EDIT PROFILE</span>
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-11 bg-white border border-[#D5CBBF] hover:bg-[#FAF8F5] text-[#1A1816] text-[11px] uppercase tracking-[0.18em] font-medium rounded-full transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>CANCEL</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Your client profile and delivery details have been securely synchronized with the atelier.</span>
          </div>
        )}

        {/* Profile Details Form */}
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Section 1: Personal Information */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
            <div className="flex items-center justify-between border-b border-[#ECE3D8] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center text-[#1A1816]">
                  <User className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
                <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#1A1816]">
                  PERSONAL INFORMATION
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`w-full h-11 rounded-xl px-3.5 text-xs text-[#1A1816] transition-colors ${
                    isEditing 
                      ? 'bg-[#FCFBF9] border border-[#D5CBBF] focus:outline-none focus:border-[#1A1816]' 
                      : 'bg-[#FAF8F5] border border-transparent cursor-not-allowed text-[#4A4036]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled={true}
                  value={email}
                  className="w-full h-11 rounded-xl px-3.5 text-xs text-[#4A4036] bg-[#FAF8F5] border border-transparent cursor-not-allowed opacity-80"
                />
                <span className="text-[9.5px] text-[#8C7A68] mt-1 block">Primary login identity verified via {user.authProvider || 'Google'}</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  placeholder="+94 77 123 4567"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className={`w-full h-11 rounded-xl px-3.5 text-xs text-[#1A1816] transition-colors ${
                    isEditing 
                      ? 'bg-[#FCFBF9] border border-[#D5CBBF] focus:outline-none focus:border-[#1A1816]' 
                      : 'bg-[#FAF8F5] border border-transparent cursor-not-allowed text-[#4A4036]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Information */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
            <div className="flex items-center justify-between border-b border-[#ECE3D8] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center text-[#1A1816]">
                  <MapPin className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
                <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#1A1816]">
                  DELIVERY INFORMATION
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Address Line
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  placeholder="e.g. 74 Ward Place, Suite 4B"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className={`w-full h-11 rounded-xl px-3.5 text-xs text-[#1A1816] transition-colors ${
                    isEditing 
                      ? 'bg-[#FCFBF9] border border-[#D5CBBF] focus:outline-none focus:border-[#1A1816]' 
                      : 'bg-[#FAF8F5] border border-transparent cursor-not-allowed text-[#4A4036]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  placeholder="Colombo"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className={`w-full h-11 rounded-xl px-3.5 text-xs text-[#1A1816] transition-colors ${
                    isEditing 
                      ? 'bg-[#FCFBF9] border border-[#D5CBBF] focus:outline-none focus:border-[#1A1816]' 
                      : 'bg-[#FAF8F5] border border-transparent cursor-not-allowed text-[#4A4036]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  placeholder="00700"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  className={`w-full h-11 rounded-xl px-3.5 text-xs text-[#1A1816] transition-colors ${
                    isEditing 
                      ? 'bg-[#FCFBF9] border border-[#D5CBBF] focus:outline-none focus:border-[#1A1816]' 
                      : 'bg-[#FAF8F5] border border-transparent cursor-not-allowed text-[#4A4036]'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className={`w-full h-11 rounded-xl px-3.5 text-xs text-[#1A1816] transition-colors ${
                    isEditing 
                      ? 'bg-[#FCFBF9] border border-[#D5CBBF] focus:outline-none focus:border-[#1A1816]' 
                      : 'bg-[#FAF8F5] border border-transparent cursor-not-allowed text-[#4A4036]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Account Information */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#ECE3D8] pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center text-[#1A1816]">
                <Key className="w-3.5 h-3.5 stroke-[1.5]" />
              </div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#1A1816]">
                ACCOUNT CREDENTIALS
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE3D9]">
                <span className="text-[10px] uppercase tracking-wider text-[#7A6E60] block mb-1">
                  Auth Method
                </span>
                <span className="font-medium text-[#1A1816] uppercase">
                  {user.authProvider || 'Google Account'}
                </span>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE3D9]">
                <span className="text-[10px] uppercase tracking-wider text-[#7A6E60] block mb-1">
                  Patron Status
                </span>
                <span className="font-medium text-emerald-800">
                  Active & Verified
                </span>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE3D9]">
                <span className="text-[10px] uppercase tracking-wider text-[#7A6E60] block mb-1">
                  Client ID
                </span>
                <span className="font-mono text-[11px] text-[#4A4036]">
                  {user.uid.slice(0, 12)}...
                </span>
              </div>
            </div>
          </div>

          {/* Save Button Bar (When Editing) */}
          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 h-12 bg-white border border-[#D5CBBF] hover:bg-[#FAF8F5] text-[#1A1816] text-[11px] uppercase tracking-[0.18em] font-medium rounded-full transition-colors cursor-pointer"
              >
                DISCARD CHANGES
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'SYNCHRONIZING...' : 'SAVE CHANGES'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
