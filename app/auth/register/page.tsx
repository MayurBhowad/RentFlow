'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Home, Loader2 } from 'lucide-react';

const DUPLICATE_EMAIL_MESSAGE =
  'An account with this email already exists. Please sign in instead.';

function isDuplicateSignup(data: Awaited<ReturnType<typeof supabase.auth.signUp>>['data']) {
  return !data?.user?.identities?.length;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'owner' | 'tenant'>('owner');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const { data: emailTaken, error: checkError } = await supabase.rpc(
      'is_email_registered',
      { p_email: normalizedEmail }
    );
    if (checkError) {
      setError(checkError.message);
      setLoading(false);
      return;
    }
    if (emailTaken) {
      setError(DUPLICATE_EMAIL_MESSAGE);
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    if (signUpError) {
      const message = signUpError.message.toLowerCase();
      if (message.includes('already registered') || message.includes('already exists')) {
        setError(DUPLICATE_EMAIL_MESSAGE);
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    if (isDuplicateSignup(data)) {
      setError(DUPLICATE_EMAIL_MESSAGE);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSuccessMessage('Check your email to confirm your account, then sign in.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl">
            <Home className="h-6 w-6" />
            <span className="text-xl font-bold">Dwello</span>
          </Link>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Get started with Dwello today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {successMessage && (
                <Alert>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>I am a</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as 'owner' | 'tenant')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="owner" id="owner" />
                    <Label htmlFor="owner" className="cursor-pointer">Property Owner</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tenant" id="tenant" />
                    <Label htmlFor="tenant" className="cursor-pointer">Tenant</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Account
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
