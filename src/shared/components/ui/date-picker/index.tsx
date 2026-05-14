import DatePickerLib from 'react-datepicker';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '@core/utils';
import 'react-datepicker/dist/react-datepicker.css';
import './date-picker.css';

interface BaseDateProps {
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'default' | 'surface';
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  name?: string;
  id?: string;
  minDate?: Date;
  maxDate?: Date;
}

const dateVariantClasses: Record<NonNullable<BaseDateProps['variant']>, string> = {
  default: 'date-input input',
  surface: 'date-input input h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-white',
};

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateString(value: Date | null) {
  if (!value) return '';
  return format(value, 'yyyy-MM-dd');
}

function toDateTimeString(value: Date | null) {
  if (!value) return '';
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export interface DatePickerProps extends BaseDateProps {}

export function DatePicker({
  value,
  onChange,
  className,
  variant = 'surface',
  disabled,
  required,
  autoFocus,
  placeholder,
  name,
  id,
  minDate,
  maxDate,
}: DatePickerProps) {
  return (
    <div className="date-input-wrap">
      <DatePickerLib
        selected={toDate(value)}
        onChange={(selected: Date | null) => onChange?.(toDateString(selected))}
        dateFormat="yyyy-MM-dd"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={100}
        className={cn(dateVariantClasses[variant], 'date-input-with-icon', className)}
        wrapperClassName="date-picker-wrapper"
        popperClassName="date-picker-popper"
        calendarClassName="date-picker-calendar"
        showPopperArrow={false}
        popperProps={{ strategy: 'fixed' }}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        placeholderText={placeholder || 'Select date'}
        name={name}
        id={id}
        minDate={minDate}
        maxDate={maxDate}
      />
      <span className="date-input-icon" aria-hidden>
        <Calendar size={16} />
      </span>
    </div>
  );
}

export interface DateTimePickerProps extends BaseDateProps {}

export function DateTimePicker({
  value,
  onChange,
  className,
  variant = 'surface',
  disabled,
  required,
  autoFocus,
  placeholder,
  name,
  id,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  return (
    <div className="date-input-wrap">
      <DatePickerLib
        selected={toDate(value)}
        onChange={(selected: Date | null) => onChange?.(toDateTimeString(selected))}
        showTimeSelect
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={100}
        timeIntervals={15}
        dateFormat="yyyy-MM-dd HH:mm"
        className={cn(dateVariantClasses[variant], 'date-input-with-icon', className)}
        wrapperClassName="date-picker-wrapper"
        popperClassName="date-picker-popper"
        calendarClassName="date-picker-calendar"
        showPopperArrow={false}
        popperProps={{ strategy: 'fixed' }}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        placeholderText={placeholder || 'Select date and time'}
        name={name}
        id={id}
        minDate={minDate}
        maxDate={maxDate}
      />
      <span className="date-input-icon" aria-hidden>
        <Calendar size={16} />
      </span>
    </div>
  );
}

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
  startLabel?: string;
  endLabel?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  startLabel = 'Start date',
  endLabel = 'End date',
  disabled,
}: DateRangePickerProps) {
  const start = toDate(value.startDate);
  const end = toDate(value.endDate);

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label className="mb-1 block text-xs font-semibold text-white/80">
        {startLabel} - {endLabel}
      </label>
      <DatePickerLib
        selected={start}
        startDate={start}
        endDate={end}
        onChange={(range) => {
          if (!range) {
            onChange({ startDate: '', endDate: '' });
            return;
          }
          const [nextStart, nextEnd] = range as [Date | null, Date | null];
          onChange({
            startDate: toDateString(nextStart),
            endDate: toDateString(nextEnd),
          });
        }}
        selectsRange
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={100}
        dateFormat="yyyy-MM-dd"
        disabled={disabled}
        placeholderText="Select date range"
        className={cn(dateVariantClasses.surface, 'date-input-with-icon h-11')}
        wrapperClassName="date-picker-wrapper"
        popperClassName="date-picker-popper"
        calendarClassName="date-picker-calendar"
        showPopperArrow={false}
        isClearable={Boolean(start || end)}
      />
      <span className="date-input-icon" aria-hidden>
        <Calendar size={16} />
      </span>
    </div>
  );
}
