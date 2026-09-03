// Services
export { eventService } from './services/event-service';
export { configService } from './services/config-service';
export { orderService } from './services/order-service';
export { checkinService } from './services/checkin-service';
export { publicEventService, PublicApiError } from './services/public-event-service';
export { postSaleService } from './services/post-sale-service';

// Hooks
export { useEventBuilder } from './hooks/use-event-builder';
export { useEventOrders } from './hooks/use-event-orders';
export { useMyTickets } from './hooks/use-my-tickets';
export { useCheckIn } from './hooks/use-check-in';
export { useConfigList, type ConfigListApi } from './hooks/use-config-list';
export { usePublicEvent } from './hooks/use-public-event';
export { useEventCheckout, type CheckoutStage } from './hooks/use-event-checkout';
export { useTicketClaim } from './hooks/use-ticket-claim';

// Components — builder
export { EventBuilderShell } from './components/builder/event-builder-shell';
export { BuilderTabContent } from './components/builder/builder-tab-content';
export { TAB_REGISTRY, PUBLISH_REQUIRED_FIELDS } from './components/builder/tab-registry';
export { EventListTable } from './components/event-list-table';
export { AddEventModal } from './components/add-event-modal';
export { EventSubnav } from './components/event-subnav';
export { StatsCards } from './components/stats-cards';
export { OrderTable } from './components/order-table';
export { AddPurchaseModal } from './components/add-purchase-modal';
export { OrderDetailModal } from './components/order-detail-modal';
export { AssignTicketModal } from './components/assign-ticket-modal';
export { TransferTicketModal } from './components/transfer-ticket-modal';
export { ReportsPanel } from './components/reports-panel';
export { MyTicketsTable } from './components/my-tickets-table';

// Components — check-in
export { CheckinStatsCards } from './components/checkin-stats-cards';
export { CheckinScanBox } from './components/checkin-scan-box';
export { CheckinCameraScanner } from './components/checkin-camera-scanner';
export { AttendeeTable } from './components/attendee-table';

// Components — public
export {
  PublicEventShell,
  PublicSection,
  PublicCard,
  PublicField,
  PublicAlert,
  BrandButton,
} from './components/public/public-event-shell';
export { EventCountdown } from './components/public/event-countdown';
export { EventHero } from './components/public/event-hero';
export { PricingTiersSection } from './components/public/pricing-tiers-section';
export { SpeakersSection } from './components/public/speakers-section';
export { PartnersSection } from './components/public/partners-section';
export {
  LocationSection,
  AboutSection,
  AddOnsPreviewSection,
  ContactSection,
  RefundPolicySection,
} from './components/public/location-section';
export {
  QuantitySelector,
  PurchaserFields,
  SellerSelect,
  AddOnsPicker,
  CustomFieldsForm,
  PromoCodeInput,
} from './components/public/checkout-fields';
export { OrderSummaryCard } from './components/public/order-summary';
export { StripePaymentStep } from './components/public/stripe-payment-step';
export { TicketQr } from './components/public/ticket-qr';
export { ClaimedTicketRow } from './components/public/claimed-ticket-row';

// Utils
export {
  computeSummary,
  effectiveUnitCents,
  formatMoney,
  formatPrice,
  fromCents,
  toCents,
  findAddOn,
  type OrderSummary,
} from './utils/public-pricing';
export {
  formatEventDate,
  formatEventDateTime,
  formatEventRange,
  parseDate,
  shortTimeZone,
} from './utils/public-dates';
export {
  brandColor,
  DEFAULT_BRAND_COLOR,
  PUBLIC_FIELD_CLASS,
} from './utils/public-brand';
export { isCameraScanSupported } from './utils/checkin-scan';

// Types
export type * from './types/event';
export type * from './types/order';
export type * from './types/ticket';
export type * from './types/config';
export type * from './types/public';
export type * from './types/reports';
export type * from './types/checkin';
