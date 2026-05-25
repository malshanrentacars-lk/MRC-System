"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function BrandBanner() {
  return (
    <section className="w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#EF4444] via-[#B91C1C] to-[#991B1B] p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="relative flex flex-col items-center gap-6 rounded-2xl bg-white/6 p-6 backdrop-blur-sm sm:flex-row sm:items-stretch">
          <div className="flex shrink-0 items-center justify-center px-4">
            <Image src="/mrc-brand.png" alt="MRC" width={96} height={96} className="rounded-lg shadow-[0_8px_30px_rgba(255,255,255,0.08)]" />
          </div>

          <div className="flex flex-1 flex-col justify-center gap-3 px-2 text-center sm:text-left">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Drive Premium. Rent Effortlessly.
            </h2>
            <p className="max-w-xl text-sm text-white/85">
              Experience the next generation of fleet logistics management with the all-new MRC Pro ecosystem.
            </p>
          </div>

          <div className="flex items-center justify-center sm:justify-end">
            <button className="inline-flex items-center gap-3 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] shadow-md transition-transform hover:scale-105">
              Learn more
              <ArrowRight className="h-4 w-4 text-[#DC2626]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
