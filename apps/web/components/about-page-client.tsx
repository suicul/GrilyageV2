'use client';

import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/auth-modal';
import Header from '@/components/header';

export default function AboutPageClient() {
  const { setAuthModalOpen } = useAuth();

  return (
    <>
      <Header stickyMode onAuthOpen={() => setAuthModalOpen((v) => !v)} />
      <AuthModal />
    </>
  );
}
