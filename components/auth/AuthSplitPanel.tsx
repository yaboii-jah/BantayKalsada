import Image from "next/image";
import type { ReactNode } from "react";

export function AuthSplitPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg md:flex-row">
        <aside className="hidden flex-col justify-between border-border bg-card p-8 lg:p-12 md:flex md:w-1/2 md:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background shadow-sm">
              <Image
                src="/logo/bantay-kalsada-logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Bantay Kalsada
              </p>
              <p className="text-xs text-muted-foreground">
                Road hazard reporting for every citizen.
              </p>
            </div>
          </div>

          <div className="relative my-12 aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
            <div className="absolute inset-0 opacity-[0.06]">
              <div className="absolute -left-8 -top-8 h-64 w-64 rounded-full border-2 border-primary" />
              <div className="absolute -left-4 -top-4 h-56 w-56 rounded-full border-2 border-primary" />
              <div className="absolute left-4 top-4 h-40 w-40 rounded-full border-2 border-primary" />
              <div className="absolute left-12 top-12 h-28 w-28 rounded-full border-2 border-primary" />
              <div className="absolute bottom-8 right-8 h-48 w-48 rounded-full border-2 border-primary" />
              <div className="absolute bottom-14 right-14 h-32 w-32 rounded-full border-2 border-primary" />
              <div className="absolute right-4 top-1/3 h-20 w-20 rounded-full border-2 border-primary" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-lg font-semibold text-foreground">
                Report hazards from your phone
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Snap a photo, pin the location, and let authorities know.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Bantay Kalsada
          </p>
        </aside>

        <section className="flex w-full items-center justify-center bg-background p-6 md:w-1/2">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card p-2 shadow-sm">
                <Image
                  src="/logo/bantay-kalsada-logo.png"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Bantay Kalsada
                </p>
                <p className="text-sm text-muted-foreground">
                  Road hazard reporting for every citizen.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background p-5 shadow-sm">
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
