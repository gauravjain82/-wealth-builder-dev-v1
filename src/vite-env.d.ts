/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_FRONTEND_BASE_URL: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  /** Code of Honor video (YouTube/Vimeo link or file URL). Unset shows a "coming soon" thumbnail. */
  readonly VITE_CODE_OF_HONOR_VIDEO_URL?: string;
  /** Build identifier (e.g. git SHA) sent with "Report a problem" tickets. */
  readonly VITE_APP_VERSION?: string;
  /** ISO build timestamp sent with "Report a problem" tickets. */
  readonly VITE_BUILD_TIME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
