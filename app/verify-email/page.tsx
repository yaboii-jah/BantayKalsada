import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-auth-gradient px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-xl bg-card px-6 py-12 text-center shadow-lg ring-1 ring-foreground/10">
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Verify your email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to verify your email address before submitting reports. Check
          your inbox for the verification link we sent after registration.
        </p>
        <Link href="/browse" className="mt-6">
          <Button variant="outline">Back to browse</Button>
        </Link>
      </div>
    </div>
  );
}
