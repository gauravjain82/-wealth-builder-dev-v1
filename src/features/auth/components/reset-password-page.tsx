import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Badge, Button, Heading, Input, Label, Text } from '@shared/components/ui';

const GIF_URL = 'https://files2.edgagement.com/sites/wb/images/login.gif';
const MIN_PASSWORD_LENGTH = 6;

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as Record<string, unknown>;
    const detail = data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    const message = data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setStatusMessage('');

    if (!token) {
      setError('Invalid setup link. Missing reset token.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      setStatusMessage('Resetting your password...');
      const resetResponse = await fetch(buildApiUrl('/api/accounts/password-reset/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      if (!resetResponse.ok) {
        throw new Error(await parseError(resetResponse, 'Failed to reset password.'));
      }

      setStatusMessage('');
      setSuccessMessage('Your password was updated successfully. Redirecting to login...');
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1800);
    } catch (submitError: unknown) {
      setStatusMessage('');
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError('Unable to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-black text-white">
      <section className="hidden lg:grid flex-1 place-items-center relative">
        <img
          src={GIF_URL}
          alt="Wealth Builders motion graphic"
          className="max-w-[420px] max-h-[420px] object-contain"
        />
        <div className="absolute bottom-6 left-6">
          <Badge className="font-bold tracking-wide text-[#f5d66a] bg-black/50 px-3 py-1.5 rounded-lg text-base">
            Wealth Builders
          </Badge>
        </div>
      </section>

      <section className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-[520px] bg-[#111] border border-white/[0.08] rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)] grid content-start gap-3">
          <Heading as="h2" variant="h3" className="my-1">Set New Password</Heading>

          {!token && (
            <div className="grid gap-3">
              <Text className="p-3 rounded-[10px] bg-red-500/10 border border-red-500/30 text-[#ff6b6b]">
                Invalid or missing reset token. Please use the link from your email.
              </Text>
              <Button
                type="button"
                onClick={() => navigate('/login')}
                className="bg-gradient-to-br from-[rgba(255,215,0,0.9)] to-[rgba(255,215,0,0.75)] text-black font-bold border-none rounded-xl px-3.5 py-3"
              >
                Go To Login
              </Button>
            </div>
          )}

          {token && (
            <form onSubmit={handleSubmit} className="grid gap-3.5">
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-sm text-[#e7e7ea]">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[10px] px-3.5 py-3 pr-16 text-white outline-none"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#cfcfd6] cursor-pointer h-8 w-8 hover:bg-white/5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="confirmPassword" className="text-sm text-[#e7e7ea]">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[10px] px-3.5 py-3 pr-16 text-white outline-none"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#cfcfd6] cursor-pointer h-8 w-8 hover:bg-white/5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Text
                  variant="small"
                  weight="semibold"
                  align="center"
                  className="p-2 px-2.5 rounded-[10px] bg-red-500/10 border border-red-500/30 text-[#ff6b6b]"
                >
                  {error}
                </Text>
              )}

              {statusMessage && (
                <Text
                  variant="small"
                  weight="semibold"
                  align="center"
                  className="p-2 px-2.5 rounded-[10px] bg-amber-500/[0.12] border border-amber-500/25 text-[#f5d66a]"
                >
                  {statusMessage}
                </Text>
              )}

              {successMessage && (
                <Text
                  variant="small"
                  weight="semibold"
                  align="center"
                  className="p-2 px-2.5 rounded-[10px] bg-green-500/[0.12] border border-green-500/25 text-[#6DFF8B]"
                >
                  {successMessage}
                </Text>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-0.5 bg-gradient-to-br from-[rgba(255,215,0,0.9)] to-[rgba(255,215,0,0.75)] text-black font-bold border-none rounded-xl px-3.5 py-3 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isLoading ? 'Processing...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
