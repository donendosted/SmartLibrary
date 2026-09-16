import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = { title: 'Smart Library', description: 'Your campus library companion', manifest: '/manifest.json' };
export const viewport: Viewport = { themeColor: '#2563EB' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><PwaRegister />{children}</body></html>; }
