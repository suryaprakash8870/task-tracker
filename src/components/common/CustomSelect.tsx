import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
  colorDot?: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  align?: 'left' | 'right';
  icon?: React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'md',
  disabled = false,
  align = 'left',
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 min-h-[32px]',
    md: 'px-3 py-2 text-xs sm:text-sm gap-2 min-h-[38px]',
    lg: 'px-3.5 py-2.5 text-sm gap-2.5 min-h-[44px]'
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`} id={id ? `${id}-container` : undefined}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-50/80 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
          sizeClasses[size]
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.colorDot && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedOption.colorDot }}
                />
              )}
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.badge}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'transform rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-full min-w-[180px] bg-white rounded-xl border border-slate-200/90 shadow-lg py-1 max-h-60 overflow-y-auto focus:outline-hidden animate-in fade-in-50 zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">No options available</div>
          ) : (
            options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs sm:text-sm transition-colors hover:bg-slate-50 cursor-pointer ${
                    isSelected ? 'bg-blue-50/70 text-blue-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {opt.colorDot && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.colorDot }}
                      />
                    )}
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="truncate">
                      <div className="truncate">{opt.label}</div>
                      {opt.description && (
                        <div className="text-[11px] text-slate-400 font-normal truncate">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {opt.badge}
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
