import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  emptyText?: string;
  label?: string;
  badge?: string;
  onSelectOption?: (val: string) => void;
}

export default function SearchableCombobox({
  value,
  onChange,
  options = [],
  placeholder = 'เลือกหรือพิมพ์...',
  className = '',
  disabled = false,
  emptyText = 'ไม่พบข้อมูลที่ตรงกัน (สามารถใช้ข้อความที่พิมพ์ได้)',
  label,
  badge,
  onSelectOption,
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on typed query
  const filteredOptions = useMemo(() => {
    if (!value || !value.trim()) {
      return options;
    }
    const q = value.trim().toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, value]);

  const handleSelect = (option: string) => {
    onChange(option);
    if (onSelectOption) {
      onSelectOption(option);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(prev => !prev);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-300">
            {label}
          </label>
          {badge && (
            <span className="text-[10px] text-slate-500 font-mono">
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Input container with dropdown toggle */}
      <div 
        className={`relative flex items-center w-full rounded-xl bg-slate-950 border transition-all ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-800 hover:border-slate-700'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-3 pr-16 py-2 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
        />

        {/* Action icons on right: Clear button & Dropdown toggle chevron */}
        <div className="absolute right-1.5 flex items-center gap-1 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="ล้างข้อความ"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={toggleDropdown}
            className={`p-1.5 rounded-lg hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isOpen ? 'text-blue-400 rotate-180' : 'text-slate-400'
            }`}
            title="เปิด/ปิด รายการตัวเลือก"
          >
            <ChevronDown size={14} className="transition-transform duration-200" />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 left-0 right-0 mt-1.5 bg-[#1E293B] border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden font-sans backdrop-blur-md max-h-64 flex flex-col animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '100%' }}
        >
          {/* Header indicator */}
          <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Search size={11} className="text-slate-500" />
              <span>{filteredOptions.length} รายการตัวเลือก</span>
            </span>
            {value && (
              <span className="text-[10px] text-emerald-400">
                พิมพ์: "{value}"
              </span>
            )}
          </div>

          {/* List items */}
          <div className="overflow-y-auto py-1 max-h-52 divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                <p className="font-medium text-slate-300">{emptyText}</p>
                {value && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    ระบบจะบันทึกข้อความ <span className="text-blue-400 font-semibold">"{value}"</span> ตามที่พิมพ์
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.trim() === opt.trim();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/20 text-blue-300 font-semibold' 
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {isSelected && (
                      <Check size={14} className="text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
