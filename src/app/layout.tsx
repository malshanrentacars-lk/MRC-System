import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "react-day-picker/dist/style.css";
import Providers from "./providers";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: "MRC | Fleet Management",
  description: "MRC - Staff Car Rental Management System, Colombo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} ${poppins.variable}`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
