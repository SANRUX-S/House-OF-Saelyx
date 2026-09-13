export interface DeliverableCountry {
  name: string;
  code: string;
  dialCode: string;
}

export const DELIVERABLE_COUNTRIES: DeliverableCountry[] = [
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94' },
  { name: 'United States', code: 'US', dialCode: '+1' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44' },
  { name: 'Australia', code: 'AU', dialCode: '+61' },
  { name: 'Canada', code: 'CA', dialCode: '+1' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971' },
  { name: 'Singapore', code: 'SG', dialCode: '+65' },
  { name: 'Germany', code: 'DE', dialCode: '+49' },
  { name: 'France', code: 'FR', dialCode: '+33' },
  { name: 'Italy', code: 'IT', dialCode: '+39' },
  { name: 'Japan', code: 'JP', dialCode: '+81' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64' },
  { name: 'India', code: 'IN', dialCode: '+91' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966' },
  { name: 'Qatar', code: 'QA', dialCode: '+974' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973' },
  { name: 'Oman', code: 'OM', dialCode: '+968' },
  { name: 'Sweden', code: 'SE', dialCode: '+46' },
  { name: 'Norway', code: 'NO', dialCode: '+47' },
  { name: 'Denmark', code: 'DK', dialCode: '+45' },
  { name: 'Finland', code: 'FI', dialCode: '+358' },
  { name: 'Ireland', code: 'IE', dialCode: '+353' },
  { name: 'Austria', code: 'AT', dialCode: '+43' },
  { name: 'Belgium', code: 'BE', dialCode: '+32' },
  { name: 'Spain', code: 'ES', dialCode: '+34' },
  { name: 'Portugal', code: 'PT', dialCode: '+351' },
  { name: 'Greece', code: 'GR', dialCode: '+30' },
  { name: 'Poland', code: 'PL', dialCode: '+48' },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420' },
  { name: 'Hungary', code: 'HU', dialCode: '+36' },
  { name: 'South Korea', code: 'KR', dialCode: '+82' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60' },
  { name: 'Thailand', code: 'TH', dialCode: '+66' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62' },
  { name: 'Philippines', code: 'PH', dialCode: '+63' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852' },
  { name: 'Taiwan', code: 'TW', dialCode: '+886' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27' },
  { name: 'Maldives', code: 'MV', dialCode: '+960' },
  { name: 'Cyprus', code: 'CY', dialCode: '+357' },
  { name: 'Turkey', code: 'TR', dialCode: '+90' },
  { name: 'Brazil', code: 'BR', dialCode: '+55' },
  { name: 'Mexico', code: 'MX', dialCode: '+52' },
  { name: 'Argentina', code: 'AR', dialCode: '+54' },
  { name: 'Chile', code: 'CL', dialCode: '+56' },
  { name: 'Israel', code: 'IL', dialCode: '+972' }
];

export function getCountryDialCode(countryName: string): string {
  const match = DELIVERABLE_COUNTRIES.find(
    c => c.name.toLowerCase() === countryName.trim().toLowerCase()
  );
  return match ? match.dialCode : '+94';
}
