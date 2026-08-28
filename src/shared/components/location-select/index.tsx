import { useEffect, useMemo, useState } from 'react';
import { FormRow } from '../ui/form';
import { Label } from '../ui/label';
import { Select } from '../ui/select';

type CSCModule = typeof import('country-state-city');

interface NamedOption {
  name: string;
  isoCode: string;
}

export interface LocationSelectProps {
  /** Country name, e.g. "United States" */
  country: string;
  /** State name, e.g. "Texas" */
  state: string;
  /** City name, e.g. "Dallas" */
  city: string;
  onChange: (next: { country: string; state: string; city: string }) => void;
  /** Optional: receive the selected city's coordinates (empty strings if unknown). */
  onCoordinates?: (latitude: string, longitude: string) => void;
}

/**
 * Cascading Country → State → City dropdowns backed by the `country-state-city`
 * dataset. Values are stored as human-readable names; ISO codes are resolved
 * internally to drive the dependent lists. The dataset is imported lazily so the
 * (large) city data is code-split out of the main bundle.
 */
export function LocationSelect({ country, state, city, onChange, onCoordinates }: LocationSelectProps) {
  const [csc, setCsc] = useState<CSCModule | null>(null);

  useEffect(() => {
    let active = true;
    void import('country-state-city').then((mod) => {
      if (active) setCsc(mod);
    });
    return () => {
      active = false;
    };
  }, []);

  const countries = useMemo<NamedOption[]>(
    () => (csc ? csc.Country.getAllCountries().map((c) => ({ name: c.name, isoCode: c.isoCode })) : []),
    [csc],
  );

  const countryIso = useMemo(() => countries.find((c) => c.name === country)?.isoCode ?? '', [countries, country]);

  const states = useMemo<NamedOption[]>(
    () =>
      csc && countryIso
        ? csc.State.getStatesOfCountry(countryIso).map((s) => ({ name: s.name, isoCode: s.isoCode }))
        : [],
    [csc, countryIso],
  );

  const stateIso = useMemo(() => states.find((s) => s.name === state)?.isoCode ?? '', [states, state]);

  const cities = useMemo(
    () => (csc && countryIso && stateIso ? csc.City.getCitiesOfState(countryIso, stateIso) : []),
    [csc, countryIso, stateIso],
  );

  const handleCountry = (name: string) => onChange({ country: name, state: '', city: '' });
  const handleState = (name: string) => onChange({ country, state: name, city: '' });
  const handleCity = (name: string) => {
    onChange({ country, state, city: name });
    if (onCoordinates) {
      const selected = cities.find((c) => c.name === name);
      onCoordinates(selected?.latitude ?? '', selected?.longitude ?? '');
    }
  };

  return (
    <>
      <FormRow>
        <Label>Country *</Label>
        <Select variant="surface" value={country} onChange={(e) => handleCountry(e.target.value)}>
          <option value="">Select country</option>
          {countries.map((c) => (
            <option key={c.isoCode} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormRow>
      <FormRow>
        <Label>State *</Label>
        <Select
          variant="surface"
          value={state}
          disabled={!countryIso}
          onChange={(e) => handleState(e.target.value)}
        >
          <option value="">{countryIso ? 'Select state' : 'Select country first'}</option>
          {states.map((s) => (
            <option key={s.isoCode} value={s.name}>
              {s.name}
            </option>
          ))}
        </Select>
      </FormRow>
      <FormRow>
        <Label>City *</Label>
        <Select variant="surface" value={city} disabled={!stateIso} onChange={(e) => handleCity(e.target.value)}>
          <option value="">{stateIso ? 'Select city' : 'Select state first'}</option>
          {cities.map((c, index) => (
            <option key={`${c.name}-${index}`} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormRow>
    </>
  );
}
