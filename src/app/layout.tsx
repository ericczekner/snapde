import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnapDE",
  description: "Your Data. Your Rules.",
};

import "@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>)
{
  return (

    <html lang="en">

      <body className="antialiased font-sans">

        <Providers>

          {/* <header className="fixed top-0 left-0 w-full shadow-md z-50 p-4 bg-darkGray">
            <div className="container mx-auto flex justify-between items-center">
              <div>
                <Link href="/" className="text-4xl  font-bold text-secondary">
                  SnapDE
                </Link>
               <p className="text-lg text-secondary">
                  Your Data. Your Rules.
                </p>
              </div>
              <div className="flex justify-between items-center py-5 gap-x-5">
                <Link href="/upload" className="text-xl font-bold text-lightGray">
                  Upload CSV
                </Link>
                <Link href="/history" className="text-xl font-bold text-lightGray">
                  View DE History
                </Link>
              </div>
            </div>
          </header> */}
          <div className="grid font-sans">
            <main >
              {children}
            </main>
          </div>
          {/* <footer className="fixed bottom-0 left-0 w-full p-4 bg-white justify-items-center justify-center gap-x-10 py-5 flex-rows flex">
            <div className="flex items-center gap-2 hover:underline hover:underline-offset-4">
              <p className="text-sm text-darkGray">&copy; 2025 BrightSpark Technologies, LLC</p>
            </div>
          </footer> */}
        </Providers>
      </body>
    </html>

  );
}
