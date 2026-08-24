import React, { useRef, useState, useEffect } from "react";
import clsx from "clsx";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export default function OTPInput({ length = 6, value, onChange, error }: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) return;

    const newOtp = value.split("");
    newOtp[index] = val[val.length - 1]; // take the last character
    const newValue = newOtp.join("").padEnd(length, "").slice(0, length);
    onChange(newValue);

    if (index < length - 1 && val) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = value.split("");
      if (newOtp[index]) {
        newOtp[index] = "";
      } else if (index > 0) {
        newOtp[index - 1] = "";
        inputsRef.current[index - 1]?.focus();
      }
      onChange(newOtp.join(""));
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/[^0-9]/g, "").slice(0, length);
    onChange(pastedData);
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-1.5 sm:gap-2 max-w-sm mx-auto">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={clsx(
            "w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors bg-white",
            error ? "border-red-500 focus:ring-red-500 text-red-600" : "border-slate-300 text-slate-900"
          )}
        />
      ))}
    </div>
  );
}
