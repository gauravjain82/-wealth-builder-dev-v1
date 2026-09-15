import * as React from 'react';
import ReactPhoneInput, { type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@core/utils';
import './phone-input.css';

export interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  defaultCountry?: Country;
  className?: string;
  /** Small helper text rendered below the field. */
  helperText?: React.ReactNode;
  id?: string;
}

/**
 * Country-code aware phone input. The selected country dial code and the typed
 * number are combined into a single E.164 string (e.g. `+14155552671`) that is
 * passed to `onChange`. This is the exact format the backend / Twilio expects,
 * so the stored value is always `country_code + number`.
 */
export function PhoneField({
  value,
  onChange,
  disabled,
  placeholder = 'Phone number',
  defaultCountry = 'US',
  className,
  helperText = 'Select the country code, then enter the number. Saved as country code + number (e.g. +1 415 555 2671).',
  id,
}: PhoneFieldProps) {
  return (
    <div className="wb-phone-field">
      <ReactPhoneInput
        id={id}
        className={cn('wb-phone-input', className)}
        international
        defaultCountry={defaultCountry}
        value={value || undefined}
        onChange={(next) => onChange(next || '')}
        disabled={disabled}
        placeholder={placeholder}
      />
      {helperText ? <p className="wb-phone-field__hint">{helperText}</p> : null}
    </div>
  );
}
