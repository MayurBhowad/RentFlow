'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { isOwnerOrManager } from '@/lib/scope';

export default function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile && !isOwnerOrManager(profile)) {
      router.replace('/dashboard');
    }
  }, [profile, loading, router]);

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isOwnerOrManager(profile)) {
    return null;
  }

  return <>{children}</>;
}
