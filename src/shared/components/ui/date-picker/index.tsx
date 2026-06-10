import DatePickerLib from 'react-datepicker';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';
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
  monthDayOnly?: boolean;
}

const dateVariantClasses: Record<NonNullable<BaseDateProps['variant']>, string> = {
  default: 'date-input input',
  surface: 'date-input input h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-white',
};

function toDate(value?: string) {
  if (!value) return null;
  // A date-only string ("yyyy-MM-dd") is parsed by `new Date()` as UTC
  // midnight, which rolls back to the previous day in timezones behind UTC
  // (e.g. the Americas). Parse it as a local date so the chosen day is
  // preserved in every region.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
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

function renderPopperInBody(props: { children?: React.ReactNode }) {
  const { children } = props;
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
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
  monthDayOnly = false,
}: DatePickerProps) {
  const dateFormat = monthDayOnly ? 'MMM dd' : 'yyyy-MM-dd';
  const placeholderText = placeholder || (monthDayOnly ? 'Select month and day' : 'Select date');

  return (
    <div className="date-input-wrap">
      <DatePickerLib
        selected={toDate(value)}
        onChange={(selected: Date | null) => onChange?.(toDateString(selected))}
        dateFormat={dateFormat}
        showMonthDropdown
        showYearDropdown={!monthDayOnly}
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={100}
        className={cn(dateVariantClasses[variant], 'date-input-with-icon', className)}
        wrapperClassName="date-picker-wrapper"
        popperClassName="date-picker-popper"
        calendarClassName="date-picker-calendar"
        showPopperArrow={false}
        popperProps={{ strategy: 'fixed' }}
        popperContainer={renderPopperInBody}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        placeholderText={placeholderText}
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
        popperContainer={renderPopperInBody}
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
        popperContainer={renderPopperInBody}
        isClearable={Boolean(start || end)}
      />
      <span className="date-input-icon" aria-hidden>
        <Calendar size={16} />
      </span>
    </div>
  );
}
