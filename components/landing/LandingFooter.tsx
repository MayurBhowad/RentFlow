import Link from 'next/link';
import { Home } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">
                <Home className="h-4 w-4" />
                <span className="font-bold">RentFlow</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Modern rental and utility expense management for property owners and tenants in India.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/auth/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
              <li><Link href="/auth/register" className="hover:text-foreground transition-colors">Create account</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Built for</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Property owners</li>
              <li>Landlords</li>
              <li>Property managers</li>
              <li>Tenants</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RentFlow. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Rent &amp; utility expense tracker for India
          </p>
        </div>
      </div>
    </footer>
  );
}
