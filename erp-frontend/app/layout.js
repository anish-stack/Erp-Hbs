import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shared/providers';

// Single typeface across the entire app. IBM Plex Sans reads engineered /
// industrial — apt for an electronic-components trading operation — and ships
// real tabular figures for the numbers-heavy tables.
const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap'
});

export const metadata = {
  title: 'The Chips Vally — Components Trading',
  description: 'Operations console for an electronic-components trading business.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plex.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
