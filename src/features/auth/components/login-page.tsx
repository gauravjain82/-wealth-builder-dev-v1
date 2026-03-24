import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Eye, EyeOff } from 'lucide-react';
import { Heading, Text, Link, Badge, Button, Input, Label } from '@shared/components/ui';

const GIF_URL = 'https://files2.edgagement.com/sites/wb/images/login.gif';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [gifLoaded, setGifLoaded] = useState(false);

  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/dashboard';

  // Preload GIF
  useEffect(() => {
    const img = new Image();
    img.onload = () => setGifLoaded(true);
    img.src = GIF_URL;
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setIsLoading(true);

    try {
      await signIn({ email, password });
      // Navigation will happen via useEffect when isAuthenticated changes
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    if (!email) {
      setError('Enter your email first, then click Forgot password.');
      return;
    }

    setResetMessage('Password reset is managed by admin in the new platform. Please contact support.');
  };

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* LEFT: GIF Section */}
      <section className="flex-1 grid place-items-center relative">
        {!gifLoaded && (
          <div className="w-[300px] h-[300px] bg-[rgba(255,215,0,0.05)] rounded-full animate-pulse" />
        )}
        <img
          src={GIF_URL}
          alt="Wealth Builders motion graphic"
          className="max-w-[400px] max-h-[400px] object-contain transition-opacity duration-300"
          style={{ opacity: gifLoaded ? 1 : 0 }}
        />
        <div className="absolute bottom-6 left-6">
          <Badge className="font-bold tracking-wide text-[#f5d66a] bg-black/50 px-3 py-1.5 rounded-lg text-base">
            Wealth Builders
          </Badge>
        </div>
      </section>

      {/* RIGHT: Login Form */}
      <section className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-[420px] bg-[#111] border border-white/[0.08] rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)] grid content-start gap-2.5">
          <Heading as="h2" variant="h3" className="my-1">Sign in</Heading>

          <form onSubmit={handleSubmit} className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-sm text-[#e7e7ea]">
                Email
              </Label>
              <Input
                id="email"
                // type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[10px] px-3.5 py-3 text-white outline-none"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password" className="text-sm text-[#e7e7ea]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[10px] px-3.5 py-3 pr-16 text-white outline-none"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#cfcfd6] cursor-pointer h-8 w-8 hover:bg-white/5"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
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

            {resetMessage && (
              <Text
                variant="small"
                weight="semibold"
                align="center"
                className="p-2 px-2.5 rounded-[10px] bg-green-500/[0.12] border border-green-500/25 text-[#6DFF8B]"
              >
                {resetMessage}
              </Text>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-0.5 bg-gradient-to-br from-[rgba(255,215,0,0.9)] to-[rgba(255,215,0,0.75)] text-black font-bold border-none rounded-xl px-3.5 py-3 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isLoading ? 'Signing in…' : 'Continue'}
            </Button>
          </form>

          <div className="mt-1.5 flex justify-between gap-3">
            <Link
              href="#"
              onClick={handleForgotPassword as any}
              variant="discrete"
              size="sm"
              className="text-[#f5d66a]"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
