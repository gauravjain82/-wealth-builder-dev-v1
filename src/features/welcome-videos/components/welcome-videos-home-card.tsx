import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

/**
 * Shortcut from the new-agent block of `/home` to the library. Static on purpose: the
 * home page should not wait on, or fail with, a second request.
 */
export function WelcomeVideosHomeCard() {
  return (
    <section className="px-4 pb-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-black/20 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-yellow-400 text-2xl font-bold text-center border-b border-yellow-400/30 pb-4">
              Your welcome videos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-gray-300 text-center m-0">
              Eight short videos from our top leaders, the same ones sent to you by text and Telegram.
            </p>
            <Link
              to="/welcome-videos"
              className="px-6 py-3 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 hover:from-yellow-400/30 hover:to-yellow-500/30 text-yellow-400 border border-yellow-400/40 rounded-lg transition-all duration-200 font-semibold no-underline"
              style={{ width: 'auto', minWidth: '200px', maxWidth: '400px', textAlign: 'center' }}
            >
              Watch the videos
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
