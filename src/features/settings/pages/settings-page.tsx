import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { useAuth } from '@/features/auth';
import { config } from '@/core/config';
import { Plan } from '@/core/types';
import { DatePicker, Modal, Text } from '@/shared/components';
import { useToastStore } from '@/store';
import {
  createSetupIntent,
  createSubscriptionApprovalRequest,
  fetchCurrentUserDetails,
  updateCurrentUserDetails,
  uploadCurrentUserPhoto,
  fetchMySubscriptionApprovalRequests,
  fetchPaymentProducts,
  fetchRoles,
  fetchMyApprovalRequests,
  approveRequest,
  rejectRequest,
  type CurrentUserDetails,
  type PaymentProduct,
  type RoleOption,
  type SubscriptionApprovalRequestResponse,
} from '../services/settings-billing-service';
import './settings-page.css';

const US_STATES = [
  'AB', 'AK', 'AL', 'AR', 'AZ', 'BC', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL',
  'IN', 'KS', 'KY', 'LA', 'MA', 'MB', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NB', 'NC', 'ND',
  'NE', 'NH', 'NJ', 'NL', 'NM', 'NS', 'NT', 'NU', 'NV', 'NY', 'OH', 'OK', 'ON', 'OR', 'PA', 'PE',
  'QC', 'RI', 'SC', 'SD', 'SK', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY', 'YT',
];

const GENDERS = ['', 'Male', 'Female'];

const POLO_SIZES = [
  '', 'Male XS', 'Male S', 'Male M', 'Male L', 'Male XL', 'Male 2XL', 'Male 3XL',
  'Female XS', 'Female S', 'Female M', 'Female L', 'Female XL', 'Female 2XL', 'Female 3XL',
];

interface ProfileFormState {
  state: string;
  gender: string;
  homeZip: string;
  homeAddress: string;
  homeAddress2: string;
  homeCity: string;
  poloSize: string;
  spouseName: string;
  spousePhone: string;
  spousePoloSize: string;
  dateOfBirth: string;
}

const DEFAULT_PROFILE_FORM: ProfileFormState = {
  state: '',
  gender: '',
  homeZip: '',
  homeAddress: '',
  homeAddress2: '',
  homeCity: '',
  poloSize: '',
  spouseName: '',
  spousePhone: '',
  spousePoloSize: '',
  dateOfBirth: '',
};

const stripePromise = config.stripe.publishableKey ? loadStripe(config.stripe.publishableKey) : null;

const UPGRADE_PLANS: Plan[] = [
  Plan.Agent,
  Plan.Leader,
  Plan.Broker,
  Plan.SeniorBroker,
  Plan.Admin,
];

const PLAN_ORDER: Record<Plan, number> = {
  [Plan.NewAgent]: 0,
  [Plan.Agent]: 1,
  [Plan.Leader]: 2,
  [Plan.Broker]: 3,
  [Plan.SeniorBroker]: 4,
  [Plan.Admin]: 5,
};

const PLAN_CARDS: Array<{
  plan: Plan;
  priceLabel: string;
  features: string[];
}> = [
  {
    plan: Plan.NewAgent,
    priceLabel: 'Free',
    features: ['Basic CRM', '1 Prospect', 'Limited Reports'],
  },
  {
    plan: Plan.Agent,
    priceLabel: '$14.99/month',
    features: ['Full CRM', 'Unlimited Prospects', 'Advanced Reports', 'Team Features'],
  },
  {
    plan: Plan.Leader,
    priceLabel: '$24.99/month',
    features: ['Everything in Agent', 'Team Management', 'Custom Reports'],
  },
  {
    plan: Plan.Broker,
    priceLabel: '$69.99/month',
    features: ['Everything in Leader', 'Broker Tools', 'Multi-team Management', 'Advanced Analytics'],
  },
  {
    plan: Plan.SeniorBroker,
    priceLabel: '$99.99/month',
    features: ['Everything in Broker', 'White Label Options', 'API Access', 'Priority Support'],
  },
  // {
  //   plan: Plan.Admin,
  //   priceLabel: 'Enterprise',
  //   features: ['Everything in Senior Broker', 'User Management', 'Admin Dashboard', 'Full API Access'],
  // },
];

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontSize: '14px',
      '::placeholder': {
        color: '#94a3b8',
      },
    },
    invalid: {
      color: '#f87171',
    },
  },
};

function normalizePlanToRoleName(plan: Plan): string {
  if (plan === Plan.NewAgent) return 'NEW_AGENT';
  if (plan === Plan.SeniorBroker) return 'SENIOR_BROKER';
  return plan.toUpperCase().replace(/ /g, '_');
}

function normalizePlan(value?: string | null): Plan {
  const raw = (value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (raw === Plan.Agent.toLowerCase()) return Plan.Agent;
  if (raw === Plan.Leader.toLowerCase()) return Plan.Leader;
  if (raw === Plan.Broker.toLowerCase()) return Plan.Broker;
  if (raw === Plan.SeniorBroker.toLowerCase()) return Plan.SeniorBroker;
  if (raw === Plan.Admin.toLowerCase()) return Plan.Admin;
  return Plan.NewAgent;
}

function resolveLevelLabel(level: CurrentUserDetails['level']): string {
  if (typeof level === 'string') {
    const normalized = level.trim();
    return normalized || '-';
  }

  if (!level) return '-';

  const label = level.name || level.code || '';
  return label.trim() || '-';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function ApprovalStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let statusClass = 'status-unknown';
  if (normalized === 'pending_approval') statusClass = 'status-pending';
  if (normalized === 'subscription_created') statusClass = 'status-approved';
  if (normalized === 'rejected') statusClass = 'status-rejected';
  if (normalized === 'failed') statusClass = 'status-failed';

  return (
    <span className={`status-badge ${statusClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function getInitials(name: string): string {
  const normalized = name.trim();
  if (!normalized) return '?';
  return normalized
    .split(/\s+/)
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function UpgradeRequestForm({
  user,
  products,
  roles,
  onCreated,
}: {
  user: CurrentUserDetails;
  products: PaymentProduct[];
  roles: RoleOption[];
  onCreated: (request: SubscriptionApprovalRequestResponse) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { addToast } = useToastStore();
  const { user: authUser } = useAuth();

  const [targetPlan, setTargetPlan] = useState<Plan>(Plan.Agent);
  const [priceId, setPriceId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [savedCard, setSavedCard] = useState<{
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPlan = useMemo(() => normalizePlan(user.roles?.[0]), [user.roles]);
  const nextPlan = useMemo(
    () => UPGRADE_PLANS.find((plan) => PLAN_ORDER[plan] > PLAN_ORDER[currentPlan]) || null,
    [currentPlan]
  );

  const targetProduct = useMemo(() => {
    const planText = targetPlan.toLowerCase();
    const direct = products.find((item) => item.name?.toLowerCase().includes(planText));
    if (direct) return direct;
    return products[0] || null;
  }, [products, targetPlan]);

  const selectedRoleId = useMemo(() => {
    const expected = normalizePlanToRoleName(targetPlan);
    return roles.find((role) => role.name?.toUpperCase() === expected)?.id;
  }, [roles, targetPlan]);

  const selectedPlanCard = useMemo(
    () => PLAN_CARDS.find((item) => item.plan === targetPlan) || null,
    [targetPlan]
  );

  useEffect(() => {
    if (targetProduct?.default_price_id) {
      setPriceId(targetProduct.default_price_id);
    }
  }, [targetProduct?.default_price_id]);

  useEffect(() => {
    if (!user.id) return;
    const raw = localStorage.getItem(`wb.savedBillingCard.${user.id}`);
    if (!raw) return;
    try {
      setSavedCard(JSON.parse(raw));
    } catch {
      setSavedCard(null);
    }
  }, [user.id]);

  useEffect(() => {
    if (nextPlan) {
      setTargetPlan(nextPlan);
    }
  }, [nextPlan]);

  const openUpgradeModal = (plan: Plan) => {
    setTargetPlan(plan);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      addToast({ type: 'error', message: 'Stripe is not ready yet. Please try again.' });
      return;
    }
    if (!user.old_id) {
      addToast({ type: 'error', message: 'Your account is missing old_id. Contact support.' });
      return;
    }
    if (!priceId.trim()) {
      addToast({ type: 'error', message: 'Price is not configured for this plan. Contact admin.' });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      addToast({ type: 'error', message: 'Card form is unavailable. Reload and try again.' });
      return;
    }

    try {
      setSubmitting(true);

      const paymentMethodResult = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || authUser?.displayName || undefined,
          email: user.email || authUser?.email || undefined,
        },
      });

      if (paymentMethodResult.error || !paymentMethodResult.paymentMethod) {
        throw new Error(paymentMethodResult.error?.message || 'Unable to create payment method.');
      }

      const setupIntent = await createSetupIntent(user.old_id);
      const setupResult = await stripe.confirmCardSetup(setupIntent.client_secret, {
        payment_method: paymentMethodResult.paymentMethod.id,
      });

      if (setupResult.error) {
        throw new Error(setupResult.error.message || 'Stripe card verification failed.');
      }

      const setupIntentId = setupResult.setupIntent?.id || setupIntent.setup_intent_id;
      const paymentMethodId =
        typeof setupResult.setupIntent?.payment_method === 'string'
          ? setupResult.setupIntent.payment_method
          : paymentMethodResult.paymentMethod.id;

      if (!setupIntentId || !paymentMethodId) {
        throw new Error('Missing setup_intent_id or payment_method_id after card confirmation.');
      }

      const created = await createSubscriptionApprovalRequest({
        old_id: user.old_id,
        price_id: priceId.trim(),
        product_id: targetProduct?.stripe_product_id || undefined,
        setup_intent_id: setupIntentId,
        payment_method_id: paymentMethodId,
        target_role_id: selectedRoleId,
        metadata: {
          source: 'settings_profile_upgrade',
          target_plan: targetPlan,
          current_plan: currentPlan,
        },
      });

      onCreated(created);
      const nextSavedCard = {
        brand: paymentMethodResult.paymentMethod.card?.brand || 'card',
        last4: paymentMethodResult.paymentMethod.card?.last4 || '****',
        expMonth: paymentMethodResult.paymentMethod.card?.exp_month || 0,
        expYear: paymentMethodResult.paymentMethod.card?.exp_year || 0,
      };
      setSavedCard(nextSavedCard);
      if (user.id) {
        localStorage.setItem(`wb.savedBillingCard.${user.id}`, JSON.stringify(nextSavedCard));
      }
      setModalOpen(false);
      const message =
        created.status === 'pending_approval'
          ? 'Card saved and upgrade request submitted for admin approval.'
          : 'Subscription created successfully.';
      addToast({ type: 'success', message });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit upgrade request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="payment-method-content">
      {currentPlan === Plan.Admin ? (
        <div className="max-level-info">
          You are an Administrator. Upgrades are not available for admin users.
        </div>
      ) : nextPlan === null ? (
        <div className="max-level-info">
          You are already at the highest self-service plan.
        </div>
      ) : null}

      <div className="plan-cards-grid">
        {PLAN_CARDS.map((card) => {
          const isCurrent = card.plan === currentPlan;
          const isNext = nextPlan === card.plan;
          const isAdmin = currentPlan === Plan.Admin;
          const isDisabled = isAdmin || !isNext;

          let buttonLabel = `Upgrade to ${card.plan}`;
          if (isCurrent) buttonLabel = 'Current Plan';
          if (card.plan === Plan.NewAgent && isCurrent) buttonLabel = 'Current Plan';
          if (isAdmin) buttonLabel = 'Not Available for Admins';
          if (isDisabled && !isCurrent && !isAdmin) buttonLabel = 'Not Available';

          return (
            <div key={card.plan} className={`plan-card ${isCurrent ? 'current' : ''}`}>
              <div className="plan-name">{card.plan}</div>
              <div className="plan-price">{card.priceLabel}</div>
              <div className="plan-divider" />
              <ul className="plan-features">
                {card.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <button
                type="button"
                className="plan-action-btn"
                disabled={isDisabled}
                onClick={() => openUpgradeModal(card.plan)}
              >
                {buttonLabel}
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Upgrade to ${targetPlan}`}
        contentClassName="max-w-[620px]"
      >
        <div className="payment-form">
          <div className="field-group">
            <label>Price</label>
            <div className="input-field" role="status" aria-live="polite">
              {selectedPlanCard?.priceLabel || '-'}
            </div>
          </div>

          <div className="field-group">
            <label>Card Details</label>
            <div className="card-element-wrapper">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          <div className="payment-notice">
            <span className="notice-icon">🔒</span>
            <p>
              Save card and submit upgrade request. Charge will be deducted only after admin approval.
            </p>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !stripePromise || nextPlan === null}
            >
              {submitting ? 'Submitting...' : 'Save & Upgrade Request'}
            </button>
          </div>
        </div>
      </Modal>

      {savedCard ? (
        <div className="saved-card-block">
          <div className="saved-card-title">Saved Card</div>
          <div className="card-display">
            <div className="card-brand">{savedCard.brand.toUpperCase()}</div>
            <div className="card-number">•••• •••• •••• {savedCard.last4}</div>
            <div className="card-expiry">
              Expires {savedCard.expMonth}/{savedCard.expYear}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const { addToast } = useToastStore();

  const [userDetails, setUserDetails] = useState<CurrentUserDetails | null>(null);
  const [products, setProducts] = useState<PaymentProduct[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [requests, setRequests] = useState<SubscriptionApprovalRequestResponse[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<SubscriptionApprovalRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileFormState>(DEFAULT_PROFILE_FORM);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    requestId: number | null;
    action: 'approve' | 'reject' | null;
    inputValue: string;
  }>({
    open: false,
    requestId: null,
    action: null,
    inputValue: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const me = await fetchCurrentUserDetails();
      setUserDetails(me);

      try {
        const productData = await fetchPaymentProducts();
        setProducts(productData);
      } catch {
        // Product list may be permission-restricted; user can still enter price id manually.
        setProducts([]);
      }

      try {
        const roleData = await fetchRoles();
        setRoles(roleData);
      } catch {
        // Roles list may be permission-restricted; target_role_id remains optional.
        setRoles([]);
      }

      if (me.old_id) {
        const requestData = await fetchMySubscriptionApprovalRequests(me.old_id);
        setRequests(requestData);
      } else {
        setRequests([]);
      }

      // Load approval requests for admins/approvers
      try {
        const approvalData = await fetchMyApprovalRequests();
        setApprovalRequests(approvalData);
      } catch {
        // User may not be an approver
        setApprovalRequests([]);
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load profile settings.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!userDetails) {
      setProfileEmail('');
      setProfileForm(DEFAULT_PROFILE_FORM);
      return;
    }

    setProfileEmail(userDetails.email || '');
    setProfileForm({
      state: userDetails.profile?.state || '',
      gender: userDetails.profile?.gender || '',
      homeZip: userDetails.profile?.home_zip || '',
      homeAddress: userDetails.profile?.home_address || '',
      homeAddress2: userDetails.profile?.home_address2 || '',
      homeCity: userDetails.profile?.home_city || '',
      poloSize: userDetails.polo_size || '',
      spouseName: userDetails.spouse_name || '',
      spousePhone: userDetails.spouse_phone || '',
      spousePoloSize: userDetails.spouse_polo_size || '',
      dateOfBirth: userDetails.profile?.birthday?.split('T')[0] || '',
    });
  }, [userDetails]);

  const onRequestCreated = (created: SubscriptionApprovalRequestResponse) => {
    setRequests((prev) => [created, ...prev]);
  };

  const openActionModal = (requestId: number, action: 'approve' | 'reject') => {
    setActionModal({
      open: true,
      requestId,
      action,
      inputValue: '',
    });
  };

  const closeActionModal = () => {
    setActionModal({
      open: false,
      requestId: null,
      action: null,
      inputValue: '',
    });
  };

  const handleApprove = async (requestId: number, note?: string) => {
    if (processingIds.has(requestId)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(requestId));
      const updated = await approveRequest(requestId, note);
      setApprovalRequests((prev) =>
        prev.map((req) => (req.id === requestId ? updated : req))
      );
      addToast({
        type: 'success',
        message: `Upgrade request #${requestId} approved successfully.`,
      });
      closeActionModal();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to approve request.',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: number, reason: string) => {
    if (!reason.trim()) {
      addToast({
        type: 'error',
        message: 'Please provide a rejection reason.',
      });
      return;
    }

    if (processingIds.has(requestId)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(requestId));
      const updated = await rejectRequest(requestId, reason);
      setApprovalRequests((prev) =>
        prev.map((req) => (req.id === requestId ? updated : req))
      );
      addToast({
        type: 'success',
        message: `Upgrade request #${requestId} rejected.`,
      });
      closeActionModal();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to reject request.',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleModalAction = () => {
    const { requestId, action, inputValue } = actionModal;
    if (!requestId || !action) return;

    if (action === 'approve') {
      void handleApprove(requestId, inputValue);
    } else if (action === 'reject') {
      void handleReject(requestId, inputValue);
    }
  };

  const updateProfileField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    if (!userDetails?.id) return;

    const normalizedEmail = profileEmail.trim();
    if (!normalizedEmail) {
      addToast({ type: 'warning', message: 'Email is required.' });
      return;
    }

    if (!profileForm.homeZip.trim()) {
      addToast({ type: 'warning', message: 'Zip is required.' });
      return;
    }
    if (!profileForm.homeAddress.trim()) {
      addToast({ type: 'warning', message: 'Address is required.' });
      return;
    }
    if (!profileForm.homeAddress2.trim()) {
      addToast({ type: 'warning', message: 'Address 2 is required.' });
      return;
    }
    if (!profileForm.homeCity.trim()) {
      addToast({ type: 'warning', message: 'City is required.' });
      return;
    }
    if (!profileForm.dateOfBirth.trim()) {
      addToast({ type: 'warning', message: 'Date of Birth is required.' });
      return;
    }

    try {
      setSavingProfile(true);
      const updated = await updateCurrentUserDetails(userDetails.id, {
        email: normalizedEmail,
        polo_size: profileForm.poloSize.trim(),
        spouse_name: profileForm.spouseName.trim(),
        spouse_phone: profileForm.spousePhone.trim(),
        spouse_polo_size: profileForm.spousePoloSize.trim(),
        profile: {
          birthday: profileForm.dateOfBirth,
          state: profileForm.state.trim(),
          gender: profileForm.gender.trim(),
          home_zip: profileForm.homeZip.trim(),
          home_address: profileForm.homeAddress.trim(),
          home_address2: profileForm.homeAddress2.trim(),
          home_city: profileForm.homeCity.trim(),
        },
      });
      setUserDetails((prev) => ({ ...prev, ...updated }));
      addToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const currentPlan = normalizePlan(userDetails?.roles?.[0]);
  const currentLevel = resolveLevelLabel(userDetails?.level);
  const agencyCode = userDetails?.agency_code?.trim() || '-';
  const nextPlan = UPGRADE_PLANS.find((plan) => PLAN_ORDER[plan] > PLAN_ORDER[currentPlan]) || null;
  const displayName =
    userDetails?.full_name
    || `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim()
    || userDetails?.email
    || '';
  // Use only photo_url_thumb for the profile picture
  const avatarUrl = userDetails?.profile?.photo_url_thumb || null;
  const avatarSrc = avatarUrl;//avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${avatarVersion}` : null;

  const handleUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !userDetails?.id) return;

    try {
      setUploadingPhoto(true);
      const updated = await uploadCurrentUserPhoto(userDetails.id, file);
      setUserDetails((prev) => ({ ...prev, ...updated }));
      addToast({ type: 'success', message: 'Profile photo uploaded successfully.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload profile photo.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="settings-profile-page profile-page">
      <div className="profile-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account settings and billing preferences</p>
      </div>

      <div className="profile-grid">
        <div className="glass-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="title-icon">👤</span>
              Profile
            </h3>
          </div>

          {loading ? (
            <div className="loading-state">Loading profile...</div>
          ) : (
            <div className="profile-content">
              <div className="profile-photo-section">
                <div className="profile-photo">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={displayName || 'Profile'} className="profile-photo-img" />
                  ) : (
                    <div className="profile-initials">{getInitials(displayName)}</div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden-file-input"
                  onChange={handleUploadPhoto}
                />
                <button
                  type="button"
                  className="btn-primary btn-upload-photo"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto || loading}
                >
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>

              <div className="profile-fields">
                <div className="field-row">
                  <div className="field-group">
                    <label>Full Name</label>
                    <input className="input-field" value={displayName || '-'} disabled />
                  </div>
                  <div className="field-group">
                    <label>Email</label>
                    <input
                      className="input-field"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      disabled={savingProfile || loading}
                    />
                  </div>
                </div>

                <div className="field-row field-row-four">
                  <div className="field-group">
                    <label>Current Plan</label>
                    <input className="input-field" value={currentPlan || '-'} disabled />
                  </div>
                  <div className="field-group">
                    <label>Level</label>
                    <input className="input-field" value={currentLevel} disabled />
                  </div>
                  <div className="field-group">
                    <label>Agency Code</label>
                    <input className="input-field" value={agencyCode} disabled />
                  </div>
                  <div className="field-group">
                    <label>Date of Birth*</label>
                    <DatePicker
                      value={profileForm.dateOfBirth}
                      onChange={(value) => updateProfileField('dateOfBirth', value)}
                      monthDayOnly
                      className="h-11"
                      disabled={savingProfile}
                    />
                  </div>
                </div>

                <div className="field-row field-row-four">
                  <div className="field-group">
                    <label>Gender</label>
                    <select
                      className="input-field"
                      value={profileForm.gender}
                      onChange={(e) => updateProfileField('gender', e.target.value)}
                      disabled={savingProfile}
                    >
                      {GENDERS.map((gender) => (
                        <option key={gender || 'empty'} value={gender}>
                          {gender || 'Select gender'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>State Located</label>
                    <select
                      className="input-field"
                      value={profileForm.state}
                      onChange={(e) => updateProfileField('state', e.target.value)}
                      disabled={savingProfile}
                    >
                      <option value="">Select State</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>City*</label>
                    <input
                      className="input-field"
                      value={profileForm.homeCity}
                      onChange={(e) => updateProfileField('homeCity', e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="field-group">
                    <label>Zip*</label>
                    <input
                      className="input-field"
                      value={profileForm.homeZip}
                      onChange={(e) => updateProfileField('homeZip', e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>
                </div>

                <div className="field-row field-row-four">
                  <div className="field-group">
                    <label>Address*</label>
                    <input
                      className="input-field"
                      value={profileForm.homeAddress}
                      onChange={(e) => updateProfileField('homeAddress', e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="field-group">
                    <label>Address 2*</label>
                    <input
                      className="input-field"
                      value={profileForm.homeAddress2}
                      onChange={(e) => updateProfileField('homeAddress2', e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="field-group">
                    <label>Poloshirt Size</label>
                    <select
                      className="input-field"
                      value={profileForm.poloSize}
                      onChange={(e) => updateProfileField('poloSize', e.target.value)}
                      disabled={savingProfile}
                    >
                      {POLO_SIZES.map((size) => (
                        <option key={size || 'empty'} value={size}>
                          {size || 'Select size'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Spouse Full Name</label>
                    <input
                      className="input-field"
                      value={profileForm.spouseName}
                      onChange={(e) => updateProfileField('spouseName', e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>
                </div>

                <div className="field-row field-row-four">
                  <div className="field-group">
                    <label>Spouse Phone</label>
                    <input
                      className="input-field"
                      value={profileForm.spousePhone}
                      onChange={(e) => updateProfileField('spousePhone', e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="field-group">
                    <label>Spouse Poloshirt Size</label>
                    <select
                      className="input-field"
                      value={profileForm.spousePoloSize}
                      onChange={(e) => updateProfileField('spousePoloSize', e.target.value)}
                      disabled={savingProfile}
                    >
                      {POLO_SIZES.map((size) => (
                        <option key={`sp-${size || 'empty'}`} value={size}>
                          {size || 'Select size'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="button-group">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void handleSaveProfile()}
                    disabled={savingProfile || loading}
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="title-icon">⭐</span>
              Account Level
            </h3>
          </div>

          <div className="account-level-content">
            <div className="current-level">
              <div className="level-badge">
                <div className="level-name">{currentPlan || Plan.NewAgent}</div>
                <div className="level-description">Current Account Level</div>
              </div>
            </div>

            {currentPlan === Plan.Admin ? (
              <div className="admin-level-info">
                <p>You have Administrator privileges. User management and upgrades are handled through the admin panel.</p>
              </div>
            ) : nextPlan ? (
              <div className="upgrade-section">
                <div className="upgrade-info">
                  <div className="upgrade-arrow">↓</div>
                  <div className="next-level">
                    Next Level: <strong>{nextPlan}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-upgrade"
                  onClick={() => {
                    const target = document.getElementById('settings-billing-upgrade');
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Request Upgrade to {nextPlan}
                </button>
              </div>
            ) : (
              <div className="max-level-info">
                <p>You are already at the highest self-service level.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-section" id="settings-billing-upgrade">
          <div className="section-header">
            <h3 className="section-title">
              <span className="title-icon">💎</span>
              Subscription & Billing
            </h3>
          </div>

          {currentPlan === Plan.Admin ? (
            <div className="max-level-info">
              Admin users do not have upgrade options.
            </div>
          ) : !config.stripe.publishableKey ? (
            <div className="max-level-info">
              Missing VITE_STRIPE_PUBLISHABLE_KEY. Add Stripe publishable key to frontend env.
            </div>
          ) : !stripePromise ? (
            <Text variant="body">Loading Stripe...</Text>
          ) : !userDetails ? (
            <Text variant="body">Loading user details...</Text>
          ) : (
            <Elements stripe={stripePromise}>
              <UpgradeRequestForm
                user={userDetails}
                products={products}
                roles={roles}
                onCreated={onRequestCreated}
              />
            </Elements>
          )}
        </div>

        {currentPlan !== Plan.Admin ? (
        <div className="glass-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="title-icon">🧾</span>
              My Upgrade Requests
            </h3>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state">No upgrade requests yet.</div>
          ) : (
            <div className="tickets-content">
              {requests
                .slice()
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((request) => (
                  <div key={request.id} className="ticket-card">
                    <div className="section-header request-card-header">
                      <div className="ticket-event">
                        Request #{request.id} • {request.metadata?.current_plan ?? '—'} → {request.metadata?.target_plan ?? '—'}
                      </div>
                      <ApprovalStatusBadge status={request.status} />
                    </div>

                    <div className="ticket-info">
                      <div className="ticket-detail">
                        <span className="detail-label">Created</span>
                        <span className="detail-value">{formatDate(request.created_at)}</span>
                      </div>
                      <div className="ticket-detail">
                        <span className="detail-label">Approved</span>
                        <span className="detail-value">{formatDate(request.approved_at)}</span>
                      </div>
                      <div className="ticket-detail">
                        <span className="detail-label">Rejected</span>
                        <span className="detail-value">{formatDate(request.rejected_at)}</span>
                      </div>
                    </div>

                    {request.rejection_reason ? (
                      <div className="payment-notice request-reason">
                        <span className="notice-icon">⚠️</span>
                        <p>Rejection reason: {request.rejection_reason}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </div>
        ) : null}

        {approvalRequests.length > 0 && (
          <div className="glass-section">
            <div className="section-header">
              <h3 className="section-title">
                <span className="title-icon">✅</span>
                Pending Approval Requests
              </h3>
            </div>

            <div className="approvals-content">
              <div className="approvals-table-container">
                <table className="approvals-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>User</th>
                      <th>Current Plan</th>
                      <th>Target Plan</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalRequests.map((request) => {
                      const isProcessing = processingIds.has(request.id);
                      const isPending = request.status.toLowerCase() === 'pending_approval';

                      return (
                        <tr key={request.id}>
                          <td className="request-id">#{request.id}</td>
                          <td className="role-cell">{request.buyer_name || request.old_id_snapshot}</td>
                          <td className="role-cell">{request.metadata?.current_plan || request.buyer_role_snapshot_name || '—'}</td>
                          <td className="role-cell">{request.metadata?.target_plan || '—'}</td>
                          <td className="status-cell">
                            <ApprovalStatusBadge status={request.status} />
                          </td>
                          <td className="created-date">{formatDate(request.created_at)}</td>
                          <td className="actions-cell">
                            {isPending ? (
                              <div className="action-buttons">
                                <button
                                  className="btn-approve-small"
                                  onClick={() => openActionModal(request.id, 'approve')}
                                  disabled={isProcessing}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  className="btn-reject-small"
                                  onClick={() => openActionModal(request.id, 'reject')}
                                  disabled={isProcessing}
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            ) : (
                              <span className="status-text">
                                {request.status === 'subscription_created' && '✓ Approved'}
                                {request.status === 'rejected' && '✗ Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={actionModal.open}
        onClose={closeActionModal}
        title={
          actionModal.action === 'approve'
            ? 'Approve Upgrade Request'
            : 'Reject Upgrade Request'
        }
        contentClassName="max-w-[500px]"
      >
        <div className="action-modal-content">
          {actionModal.action === 'approve' ? (
            <>
              <p className="modal-description">
                Approve this upgrade request? The user will be charged immediately upon approval.
              </p>
              <div className="form-group">
                <label htmlFor="approval-note">
                  Approval Note (Optional)
                </label>
                <textarea
                  id="approval-note"
                  className="textarea-field"
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  value={actionModal.inputValue}
                  onChange={(e) =>
                    setActionModal((prev) => ({ ...prev, inputValue: e.target.value }))
                  }
                />
              </div>
            </>
          ) : (
            <>
              <p className="modal-description">
                Reject this upgrade request. A reason is required.
              </p>
              <div className="form-group">
                <label htmlFor="rejection-reason">
                  Rejection Reason
                </label>
                <textarea
                  id="rejection-reason"
                  className="textarea-field"
                  placeholder="Explain why this request is being rejected..."
                  rows={3}
                  value={actionModal.inputValue}
                  onChange={(e) =>
                    setActionModal((prev) => ({ ...prev, inputValue: e.target.value }))
                  }
                  required
                />
              </div>
            </>
          )}

          <div className="modal-buttons">
            <button
              type="button"
              className="btn-secondary"
              onClick={closeActionModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className={actionModal.action === 'approve' ? 'btn-approve' : 'btn-reject'}
              onClick={handleModalAction}
              disabled={
                actionModal.action === 'reject' && !actionModal.inputValue.trim()
              }
            >
              {actionModal.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
