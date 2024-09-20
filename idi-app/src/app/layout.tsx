import "@/styles/globals.css";
import "react-toastify/dist/ReactToastify.css"; // Add this line

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Provider } from "jotai";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/toaster";

import { Nunito_Sans } from "next/font/google";
import { ToastContainer } from "react-toastify";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Interoo",
  description: "AI powered qualitative research",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦘</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className={nunitoSans.className}>
        <TRPCReactProvider>
          <Provider>
            {children}
            <ToastContainer />
            <Toaster />
          </Provider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
