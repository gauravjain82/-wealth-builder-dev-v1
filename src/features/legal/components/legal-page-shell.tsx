import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth';

const LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/fa509ca3-1165-43d5-b075-f174c232cb04.png?alt=media&token=0f5855f4-8176-47ca-b842-6d7d1301b939';

interface LegalPageShellProps {
  children: React.ReactNode;
}

export function LegalPageShell({ children }: LegalPageShellProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Wealth Builders" className="h-12 w-auto object-contain" />
            <span className="text-sm font-semibold tracking-wide text-[#f5d66a]">Wealth Builder</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link to="/" className="text-white/80 hover:text-[#f5d66a]">
              App purpose
            </Link>
            <Link to="/privacy-policy" className="text-white/80 hover:text-[#f5d66a]">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="text-white/80 hover:text-[#f5d66a]">
              Terms
            </Link>
            <Link to="/help-needed" className="text-white/80 hover:text-[#f5d66a]">
              Help
            </Link>
            <Link
              to={isAuthenticated ? '/home' : '/login'}
              className="rounded-lg bg-[#f5d66a] px-3 py-1.5 font-semibold text-black hover:opacity-90"
            >
              {isAuthenticated ? 'Open app' : 'Sign in'}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-white/60">
          <span>© {new Date().getFullYear()} Wealth Builders</span>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-[#f5d66a]">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-[#f5d66a]">
              Terms and Conditions
            </Link>
            <a href="mailto:website@iamawealthbuilder.com" className="hover:text-[#f5d66a]">
              website@iamawealthbuilder.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
