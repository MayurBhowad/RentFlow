import {
  Building2,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Bell,
  Calendar,
  Zap,
  Shield,
  IndianRupee,
} from 'lucide-react';

export const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export const features = [
  {
    icon: Building2,
    title: 'Property Management',
    description:
      'Organize apartments, houses, villas, and commercial units. Track status, units, and details in one place.',
  },
  {
    icon: Users,
    title: 'Tenant Management',
    description:
      'Manage leases, rent amounts, billing cycles, security deposits, and tenant contact information effortlessly.',
  },
  {
    icon: FileText,
    title: 'Rent & Utility Bills',
    description:
      'Generate monthly bills combining rent and utilities. Support fixed and variable utility charges per tenant.',
  },
  {
    icon: CreditCard,
    title: 'Payment Tracking',
    description:
      'Record payments via UPI, bank transfer, cash, or cheque. Track partial payments and outstanding balances.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description:
      'Visualize revenue trends, collection rates, and payment status. Make data-driven decisions for your portfolio.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description:
      'Stay informed about overdue bills, payment reminders, and important updates for owners and tenants.',
  },
  {
    icon: Calendar,
    title: 'Billing Calendar',
    description:
      'View upcoming due dates and billing schedules. Never miss a rent collection or utility deadline.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description:
      'Separate dashboards for property owners, managers, and tenants — each sees only what they need.',
  },
  {
    icon: IndianRupee,
    title: 'Built for India',
    description:
      'INR currency formatting, flexible billing cycles, and payment methods commonly used in India.',
  },
];

export const steps = [
  {
    step: '01',
    title: 'Create your account',
    description:
      'Sign up as a property owner or tenant. Owners can start managing properties immediately after registration.',
  },
  {
    step: '02',
    title: 'Add properties & tenants',
    description:
      'Set up your properties, add tenants with lease details, rent amounts, and billing preferences.',
  },
  {
    step: '03',
    title: 'Generate & track bills',
    description:
      'Create monthly bills with rent and utilities. Tenants view bills and owners track payments in real time.',
  },
  {
    step: '04',
    title: 'Analyze & grow',
    description:
      'Use dashboards and reports to monitor collection rates, identify overdue accounts, and optimize cash flow.',
  },
];

export const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for individual landlords with a small portfolio.',
    features: [
      'Up to 2 properties',
      'Up to 5 tenants',
      'Monthly billing',
      'Payment tracking',
      'Basic dashboard',
      'Email notifications',
    ],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹499',
    period: '/month',
    description: 'For growing landlords and small property managers.',
    features: [
      'Up to 10 properties',
      'Unlimited tenants',
      'All billing cycles',
      'Utility bill management',
      'Analytics & reports',
      'Calendar & reminders',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '₹1,499',
    period: '/month',
    description: 'For agencies and large property portfolios.',
    features: [
      'Unlimited properties',
      'Unlimited tenants',
      'Manager role access',
      'Advanced analytics',
      'Audit logs',
      'Custom utility types',
      'Dedicated support',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
];

export const faqs = [
  {
    question: 'Who is RentFlow for?',
    answer:
      'RentFlow is designed for property owners, landlords, property managers, and tenants in India who want a simple way to manage rent, utilities, and payments without spreadsheets.',
  },
  {
    question: 'Can tenants use RentFlow too?',
    answer:
      'Yes. Tenants get their own dashboard to view bills, check payment history, see upcoming due dates, and receive notifications — all linked to their landlord\'s account.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'You can record payments made via UPI, bank transfer, cash, cheque, or other methods. RentFlow tracks the payment history; actual payment collection happens outside the app.',
  },
  {
    question: 'Does RentFlow handle utility bills?',
    answer:
      'Yes. Owners can define utility types (fixed or variable), attach them to monthly bills, and track consumption and charges alongside rent.',
  },
  {
    question: 'Is there a free plan?',
    answer:
      'Yes. The Starter plan is free forever and includes up to 2 properties and 5 tenants — enough to get started without any commitment.',
  },
  {
    question: 'Can I switch plans later?',
    answer:
      'Absolutely. You can upgrade or downgrade your plan at any time as your portfolio grows. Changes take effect at the start of your next billing cycle.',
  },
];

export const stats = [
  { value: '500+', label: 'Properties managed' },
  { value: '₹2Cr+', label: 'Rent tracked monthly' },
  { value: '98%', label: 'Collection visibility' },
  { value: '24/7', label: 'Access anywhere' },
];

export const audiences = [
  {
    icon: Building2,
    title: 'For Property Owners',
    items: [
      'Manage multiple properties and units',
      'Track rent collection and overdue accounts',
      'Generate bills with rent + utilities',
      'View revenue analytics and reports',
    ],
  },
  {
    icon: Zap,
    title: 'For Tenants',
    items: [
      'View current and past bills online',
      'Track payment history and balances',
      'See upcoming due dates on calendar',
      'Receive payment reminders',
    ],
  },
];
