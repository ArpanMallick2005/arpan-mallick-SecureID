import React, { useState, useEffect } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function PhoneInput({ value, onChange, required }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState('+91');
  const [number, setNumber] = useState('');

  // Sync initial value if provided
  useEffect(() => {
    if (value && value !== countryCode + number) {
      if (value.startsWith('+91')) { setCountryCode('+91'); setNumber(value.slice(3)); }
      else if (value.startsWith('+1')) { setCountryCode('+1'); setNumber(value.slice(2)); }
      else if (value.startsWith('+44')) { setCountryCode('+44'); setNumber(value.slice(3)); }
      else { setNumber(value); } 
    }
  }, [value]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    onChange(newCode + number);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNum = e.target.value;
    setNumber(newNum);
    onChange(countryCode + newNum);
  };

  return (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-medium text-slate-700 block">
        Mobile Number
      </label>
      <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition-colors">
        <select
          value={countryCode}
          onChange={handleCountryChange}
          className="px-2 bg-transparent border-r outline-none text-sm text-slate-700 cursor-pointer"
        >
          <option value="+91">🇮🇳 +91</option>
          <option value="+1">🇺🇸 +1</option>
          <option value="+44">🇬🇧 +44</option>
        </select>
        <input
          type="tel"
          value={number}
          onChange={handleNumberChange}
          placeholder="98765 43210"
          required={required}
          className="flex-1 px-3 py-2 outline-none text-sm text-slate-900 placeholder:text-slate-400 min-w-0"
        />
      </div>
    </div>
  );
}
