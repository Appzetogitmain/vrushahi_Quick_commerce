import { useState, useRef, useEffect } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  focusBorderClass?: string;
  focusRingClass?: string;
  hoverBorderClass?: string;
}

export default function OTPInput({
  length = 4,
  onComplete,
  disabled = false,
  focusBorderClass = 'border-green-500 ring-4 ring-green-100',
  focusRingClass = '', // Not strictly needed with the unified approach but kept for prop compatibility
  hoverBorderClass = '',
}: OTPInputProps) {
  const [value, setValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    // Only allow digits
    const newValue = e.target.value.replace(/\D/g, '').slice(0, length);
    setValue(newValue);

    if (newValue.length === length) {
      onComplete(newValue);
    }
  };

  return (
    <div className="relative flex gap-2 justify-center w-full max-w-xs mx-auto group">
      {/* Visual Boxes */}
      {Array.from({ length }).map((_, index) => {
        const isActive = isFocused && value.length === index;
        const isFilled = index < value.length;
        
        return (
          <div
            key={index}
            className={`w-14 h-14 flex items-center justify-center text-xl font-bold border-2 rounded-xl transition-all ${
              disabled ? 'bg-neutral-50 border-neutral-200 text-neutral-400' : 'bg-white text-neutral-900'
            } ${
              isActive && !disabled
                ? focusBorderClass
                : isFilled
                ? 'border-neutral-400'
                : 'border-neutral-200'
            }`}
          >
            {value[index] || ''}
            {isActive && !disabled && (
              <span className="w-[2px] h-6 bg-current animate-pulse ml-[1px]" />
            )}
          </div>
        );
      })}

      {/* Invisible Input overlay */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={length}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10 disabled:cursor-not-allowed"
        autoComplete="one-time-code"
      />
    </div>
  );
}
