import { useCountUp } from './use-count-up';

/** A whole number that counts up to its value. */
export function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>;
}
