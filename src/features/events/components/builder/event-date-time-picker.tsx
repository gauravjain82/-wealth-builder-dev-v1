import { DateTimePicker, Text } from '@shared/components';
import { fromWallClock, toWallClock, zoneAbbreviation } from '../../utils/zoned-time';

interface EventDateTimePickerProps {
  /** A UTC ISO instant, or `''` when unset. */
  value: string;
  /** Receives a UTC ISO instant (always with an offset), or `''` when cleared. */
  onChange: (value: string) => void;
  /** The event's IANA timezone — the wall clock the organizer is typing in. */
  timeZone: string;
}

/**
 * A date & time picker that reads and writes in the *event's* timezone.
 *
 * The shared `DateTimePicker` works on the browser's wall clock and emits a
 * string with no offset, which the server would store as UTC — so "9:00 AM"
 * for a Los Angeles event went live at 2:00 AM there. This wrapper shows the
 * stored instant as the event's local time and converts what the organizer
 * picks back to an exact instant, whatever zone their own browser is in.
 */
export function EventDateTimePicker({ value, onChange, timeZone }: EventDateTimePickerProps) {
  const wall = value ? toWallClock(value, timeZone) : null;
  const zoneAt = value ? new Date(value) : new Date();

  return (
    <div className="flex flex-col gap-1">
      <DateTimePicker
        value={wall ? `${wall.date}T${wall.time}` : ''}
        onChange={(picked) => {
          if (!picked) return onChange('');
          const [date, time] = picked.split('T');
          onChange(fromWallClock(date, time, timeZone));
        }}
      />
      <Text variant="muted" className="text-xs">
        Event time — {zoneAbbreviation(timeZone, zoneAt)} ({timeZone})
      </Text>
    </div>
  );
}
