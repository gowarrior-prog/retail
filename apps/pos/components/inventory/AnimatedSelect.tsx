'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface OptionItem {
  label: string;
  value: string;
}

interface AnimatedSelectProps {
  label?: string;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AnimatedSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select Option',
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative font-sans" ref={containerRef}>
      {label && <label className="text-[10.5px] font-bold text-slate-700 block mb-1">{label}</label>}

      {/* Select Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs transition-all cursor-pointer select-none"
      >
        <span className={selectedOption?.value ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-medium'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-250 ${
            isOpen ? 'rotate-180 text-slate-800' : ''
          }`}
        />
      </button>

      {/* Smooth Slide-Down Dropdown Menu right under the trigger */}
      {isOpen && (
        <div
          style={{
            animation: 'toastSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            transformOrigin: 'top center',
          }}
          className="absolute left-0 right-0 top-full mt-1 z-[80] bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden py-1 max-h-52 overflow-y-auto"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-slate-100/80 text-slate-900 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
