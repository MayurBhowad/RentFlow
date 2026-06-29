'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Calendar,
  Bell,
  LogOut,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

const ownerNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/properties', label: 'Properties', icon: Building2 },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { href: '/dashboard/bills', label: 'Bills', icon: FileText },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

const tenantNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/bills', label: 'My Bills', icon: FileText },
  { href: '/dashboard/payments', label: 'Payment History', icon: CreditCard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOwner = profile?.role === 'owner' || profile?.role === 'manager';
  const navItems = isOwner ? ownerNavItems : tenantNavItems;

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card h-screen">
        <div className="flex items-center gap-2 px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
            <Home className="h-5 w-5" />
            <span className="font-bold text-lg">RentFlow</span>
          </Link>
        </div>
        <div className="flex-1 px-3 py-2 space-y-1 overflow-auto">
          <NavLinks />
        </div>
        <div className="border-t p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex items-center gap-2 px-6 py-5">
                <Link href="/dashboard" className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
                  <Home className="h-5 w-5" />
                  <span className="font-bold text-lg">RentFlow</span>
                </Link>
              </div>
              <div className="px-3 py-2 space-y-1">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="font-bold text-lg">
            RentFlow
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="font-medium">{profile?.full_name || 'User'}</DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-muted-foreground capitalize">
                {profile?.role}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50 px-2 py-1">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
