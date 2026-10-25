"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Stepper } from "@/components/ui/stepper";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { CountryRailSelector } from "@/components/ui/country-rail-selector";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ThemeToggle } from "@/lib/theme";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { ArrowRight, ArrowLeft, Building2, User, Mail, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRails, setSelectedRails] = useState<string[]>([
    "bkash",
    "nagad",
    "binance_pay",
    "usdt_trc20",
  ]);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, title: "Account", description: "Merchant details" },
    { id: 2, title: "Rails", description: "Select methods" },
    { id: 3, title: "Launch", description: "Confirm & activate" },
  ];

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !businessName.trim() || !email.trim() || !password) {
      setError("Please complete all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setCurrentStep(1);
  };

  const handleCompleteRegistration = async () => {
    if (!agreeTerms) {
      setError("You must agree to the merchant services agreement to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api.register({ name, email, password, businessName });
      success(
        "Merchant account created. Sandbox environment is ready for testing.",
        "Account Activated"
      );
      router.push("/dashboard/overview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(msg);
      toastError(msg, "Registration Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 relative selection:bg-teal-500/20">
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <ThemeToggle size="sm" />
      </div>

      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center mb-1">
            <GressPayLogo variant="auto" size="lg" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Open Your Merchant Account
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Automated MFS settlement and global crypto checkout in minutes
          </p>
        </div>

        {/* Stepper Card */}
        <Card className="p-6 sm:p-8 shadow-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <div className="mb-8">
            <Stepper steps={steps} activeStep={currentStep} />
          </div>

          {error && (
            <div className="mb-5">
              <Alert variant="danger" title="Validation Note">
                {error}
              </Alert>
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {currentStep === 0 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Tariq Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Store / Business Name"
                  placeholder="e.g. Apex Digital"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  required
                />
              </div>

              <Input
                label="Business Email"
                type="email"
                placeholder="billing@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <PasswordInput
                label="Account Password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showStrengthMeter
                required
                autoComplete="new-password"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Rail Selection
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: Rail Selection */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Select Initial Payment Rails
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose which payment methods to activate for your checkout. You can modify these settings anytime.
                </p>
              </div>

              <CountryRailSelector
                selectedCodes={selectedRails}
                onChange={setSelectedRails}
              />

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(0)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(2)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Review & Activate
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Finalize */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Confirm Merchant Registration
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Review your credentials before opening your sandbox environment.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Merchant Name:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Business / Store:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{businessName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Email Address:</span>
                  <span className="font-medium font-mono text-zinc-900 dark:text-zinc-100">{email}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Active Rails:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {selectedRails.length} Rails Selected
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <Checkbox
                  label="I agree to the GressPay Merchant Terms of Service and acknowledge the sandbox ledger testing requirements."
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(1)}
                  disabled={isLoading}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCompleteRegistration}
                  isLoading={isLoading}
                  disabled={!agreeTerms}
                  rightIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Create Account & Open Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-[#077C74] font-medium hover:underline dark:text-[#1BD1C0]">
            Sign in to Merchant Portal →
          </Link>
        </p>
      </div>
    </div>
  );
}
