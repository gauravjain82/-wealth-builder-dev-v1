import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

/**
 * Local form state for a builder tab with light dirty tracking.
 *
 * Seeds from `initial` and reseeds whenever `initial` changes (e.g. after a save
 * returns the server's fresh event), clearing the dirty flag. `submit` calls
 * `onSave` with the current form values and resets dirty on success.
 */
export function useTabForm<T extends object>(
  initial: T,
  onSave: (data: T) => Promise<void>,
) {
  const [form, setForm] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);

  const seed = JSON.stringify(initial);
  useEffect(() => {
    setForm(initial);
    setDirty(false);
    // Reseed keyed on the serialized snapshot, not the object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const set = <K extends keyof T>(key: K, value: T[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }) as T);
    setDirty(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await onSave(form);
    setDirty(false);
  };

  return { form, set, dirty, submit };
}

/** Coerce an empty string to null for nullable backend fields. */
export function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
