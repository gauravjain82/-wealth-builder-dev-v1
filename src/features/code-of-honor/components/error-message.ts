/** A readable message for any failure, with the server's wording when it sent one. */

import { CohError } from '../services/code-of-honor-service';

export function errorMessage(error: unknown): string {
  if (error instanceof CohError) {
    if (error.status === 403) return "You don't have access to that.";
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
