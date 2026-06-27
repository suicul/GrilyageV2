'use client';

import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/auth-modal';
import Header from '@/components/header';

type PublicShellProps = {
  headerSimple?: boolean;
  headerStickyMode?: boolean;
  children?: React.ReactNode;
};

/**
 * Client component wrapper for public pages.
 * Provides Header + AuthModal without requiring the page itself to be 'use client'.
 *
 * Usage: wrap your server component page's interactive shell with this,
 * and keep the static content as a Server Component.
 */
export default function PublicShell({ headerSimple, headerStickyMode, children }: PublicShellProps) {
  const { setAuthModalOpen } = useAuth();

  const handleAuthOpen = () => setAuthModalOpen((v) => !v);

  return (
    <>
      <Header
        simple={headerSimple}
        stickyMode={headerStickyMode}
        onAuthOpen={handleAuthOpen}
      />
      {children}
      <AuthModal />
    </>
  );
}
