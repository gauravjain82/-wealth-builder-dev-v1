import { Timestamp } from 'firebase/firestore';

/**
 * Converts Firestore Timestamp to JavaScript Date
 */
export function timestampToDate(timestamp: Timestamp | Date | null | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

/**
 * Converts JavaScript Date to Firestore Timestamp
 */
export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Converts Firestore document data to domain model
 * Recursively converts all Timestamp fields to Date
 */
export function firestoreToDomain<T>(data: Record<string, unknown>): T {
  const converted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      converted[key] = timestampToDate(value);
    } else if (Array.isArray(value)) {
      converted[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? firestoreToDomain(item) : item
      );
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      converted[key] = firestoreToDomain(value as Record<string, unknown>);
    } else {
      converted[key] = value;
    }
  }

  return converted as T;
}

/**
 * Converts domain model to Firestore document data
 * Recursively converts all Date fields to Timestamp
 */
export function domainToFirestore(data: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      converted[key] = dateToTimestamp(value);
    } else if (Array.isArray(value)) {
      converted[key] = value.map((item) =>
        typeof item === 'object' && item !== null && !(item instanceof Date)
          ? domainToFirestore(item as Record<string, unknown>)
          : item instanceof Date
          ? dateToTimestamp(item)
          : item
      );
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      converted[key] = domainToFirestore(value as Record<string, unknown>);
    } else {
      converted[key] = value;
    }
  }

  return converted;
}
