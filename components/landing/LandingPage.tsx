'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowRight,
  Check,
  Sparkles,
  TrendingUp,
  Clock,
  FileCheck,
} from 'lucide-react';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';
import {
  features,
  steps,
  pricingPlans,
  faqs,
  stats,
  audiences,
} from './landing-data';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5" />
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Rent &amp; utility management made simple
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Manage rent, utilities &amp; payments{' '}
              <span className="text-primary">in one place</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              RentFlow helps property owners and tenants track rent, generate utility bills,
              record payments, and stay on top of collections — without spreadsheets or chaos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/auth/register">
                  Start for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/auth/login">Sign in to your account</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free plan available · No credit card required
            </p>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-card/50 p-4 text-center backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="border-y bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for owners and tenants
            </h2>
            <p className="mt-4 text-muted-foreground">
              Whether you manage properties or rent one, RentFlow gives you the tools you need.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <Card key={audience.title} className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{audience.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {audience.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to manage rentals
            </h2>
            <p className="mt-4 text-muted-foreground">
              From property setup to payment tracking — RentFlow covers the full rental lifecycle.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y bg-muted/20 py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How RentFlow works
            </h2>
            <p className="mt-4 text-muted-foreground">
              Get up and running in minutes. No complex setup required.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <div key={item.step} className="relative">
                <div className="mb-4 text-4xl font-bold text-primary/20">{item.step}</div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-4 rounded-xl border bg-card p-6">
              <TrendingUp className="h-8 w-8 shrink-0 text-emerald-500" />
              <div>
                <h4 className="font-semibold">Track collection rates</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  See how much rent you&apos;ve collected vs. expected each month.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border bg-card p-6">
              <Clock className="h-8 w-8 shrink-0 text-amber-500" />
              <div>
                <h4 className="font-semibold">Catch overdue early</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Overdue bills are flagged automatically so you can follow up quickly.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border bg-card p-6">
              <FileCheck className="h-8 w-8 shrink-0 text-primary" />
              <div>
                <h4 className="font-semibold">Clear bill breakdown</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rent and utilities on one bill — tenants always know what they owe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free and upgrade as your portfolio grows. All plans include core billing features.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? 'border-primary shadow-xl ring-1 ring-primary'
                    : 'border-border'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3">Most popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period !== 'forever' && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                    {plan.period === 'forever' && (
                      <span className="ml-1 text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/auth/register">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t bg-muted/20 py-20 scroll-mt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-muted-foreground">
              Have questions? Here are answers to the most common ones.
            </p>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-indigo-600 opacity-90" />
            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">
                Ready to simplify your rental management?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
                Join property owners and tenants who use RentFlow to stay organized,
                get paid on time, and never lose track of a bill again.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/auth/register">
                    Create free account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
