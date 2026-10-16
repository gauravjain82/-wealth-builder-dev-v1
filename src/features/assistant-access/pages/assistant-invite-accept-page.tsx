/**
 * Public `/assistant/accept?token=` page: the link in an assistant's invite email.
 * Previews the invite (who invited whom), then sets the assistant's password, which
 * activates the access, and sends them to /login. Styled like the reset-password page.
 */

import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';

import { Badge, Button, Heading, Input, Label, Text } from '@shared/components/ui';
import { useToastStore } from '@/store';

import { acceptInvite, fetchInvitePreview } from '../services/assistant-access-service';

const GIF_URL = 'https://files2.edgagement.com/sites/wb/images/login.gif';
/** Django's MinimumLengthValidator default; the backend also rejects common/numeric/name-like passwords. */
const MIN_PASSWORD_LENGTH = 8;

const INPUT_CLASS =
  'w-full bg-white/[0.06] border border-white/[0.12] rounded-[10px] px-3.5 py-3 pr-16 text-white outline-none';
const PRIMARY_BUTTON_CLASS =
  'bg-gradient-to-br from-[rgba(255,215,0,0.9)] to-[rgba(255,215,0,0.75)] text-black font-bold border-none rounded-xl px-3.5 py-3 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity';
const ERROR_CLASS = 'p-3 rounded-[10px] bg-red-500/10 border border-red-500/30 text-[#ff6b6b]';

/** Password input with a show/hide toggle. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm text-[#e7e7ea]">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={INPUT_CLASS}
          autoComplete="new-password"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#cfcfd6] cursor-pointer h-8 w-8 hover:bg-white/5"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function AssistantInviteAcceptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToastStore();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const invite = useQuery({
    queryKey: ['assistant-access', 'invite', token],
    queryFn: ({ signal }) => fetchInvitePreview(token, signal),
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await acceptInvite({ token, password });
      addToast({
        type: 'success',
        message: result?.detail || 'Your password is set. Sign in with your email and new password.',
      });
      navigate('/login', { replace: true });
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to set your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const preview = invite.data;
  const inviteUsable = Boolean(token && preview?.valid);

  return (
    <div className="min-h-screen flex bg-black text-white">
      <section className="hidden lg:grid flex-1 place-items-center relative">
        <img src={GIF_URL} alt="Wealth Builders motion graphic" className="max-w-[420px] max-h-[420px] object-contain" />
        <div className="absolute bottom-6 left-6">
          <Badge className="font-bold tracking-wide text-[#f5d66a] bg-black/50 px-3 py-1.5 rounded-lg text-base">
            Wealth Builders
          </Badge>
        </div>
      </section>

      <section className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-[520px] bg-[#111] border border-white/[0.08] rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)] grid content-start gap-3">
          <Heading as="h2" variant="h3" className="my-1">Set Up Assistant Access</Heading>

          {token && invite.isLoading ? <Text className="text-[#cfcfd6]">Checking your invite…</Text> : null}

          {!token || invite.isError || (preview && !preview.valid) ? (
            <div className="grid gap-3">
              <Text className={ERROR_CLASS}>
                This invite link is invalid or has expired. Ask the SMD who invited you to resend it.
              </Text>
              <Button type="button" onClick={() => navigate('/login')} className={PRIMARY_BUTTON_CLASS}>
                Go To Login
              </Button>
            </div>
          ) : null}

          {inviteUsable && preview ? (
            <>
              <Text className="text-[#e7e7ea]">
                Hi {preview.assistant_name}, {preview.principal_name} has given you assistant access. Choose a
                password to sign in as <strong>{preview.assistant_email}</strong>.
              </Text>

              <form onSubmit={handleSubmit} className="grid gap-3.5">
                <PasswordField
                  id="password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  disabled={isSubmitting}
                />
                <PasswordField
                  id="confirmPassword"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter password"
                  disabled={isSubmitting}
                />

                {error ? (
                  <Text
                    variant="small"
                    weight="semibold"
                    align="center"
                    role="alert"
                    className="p-2 px-2.5 rounded-[10px] bg-red-500/10 border border-red-500/30 text-[#ff6b6b]"
                  >
                    {error}
                  </Text>
                ) : null}

                <Button type="submit" disabled={isSubmitting} className={`mt-0.5 ${PRIMARY_BUTTON_CLASS}`}>
                  {isSubmitting ? 'Processing...' : 'Set Password'}
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
