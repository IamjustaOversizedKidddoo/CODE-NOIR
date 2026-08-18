import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'CODE NOIR — Every codebase has a story. Investigate it.',
  description:
    'AI-powered codebase investigation and learning. Upload a project, uncover how its pieces connect, and learn how it works through the evidence inside the code itself.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&family=Public+Sans:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#171717] selection:bg-[#F4C542] selection:text-[#171717]">
        {children}
      </body>
    </html>
  );
}
