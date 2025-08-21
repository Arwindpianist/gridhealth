import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import Header from './components/Header'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://gridhealth.arwindpianist.store'),
  title: 'GridHealth - Enterprise System Health Monitoring',
  description: 'Professional system health monitoring platform for enterprises. Monitor CPU, memory, disk, and network health across your organization with real-time dashboards and intelligent alerts.',
  keywords: 'system monitoring, health monitoring, enterprise monitoring, IT monitoring, system health, performance monitoring, infrastructure monitoring',
  authors: [{ name: 'GridHealth Team' }],
  creator: 'GridHealth',
  publisher: 'GridHealth',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  // Favicon configuration
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/favicon.ico', sizes: '180x180', type: 'image/x-icon' }
    ],
    shortcut: '/favicon.ico',
  },

  // Open Graph / Facebook
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gridhealth.arwindpianist.store',
    siteName: 'GridHealth',
    title: 'GridHealth - Enterprise System Health Monitoring',
    description: 'Professional system health monitoring platform for enterprises. Monitor CPU, memory, disk, and network health across your organization.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'GridHealth - Enterprise System Health Monitoring',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'GridHealth - Enterprise System Health Monitoring',
    description: 'Professional system health monitoring platform for enterprises. Monitor CPU, memory, disk, and network health across your organization.',
    images: ['/og-image.svg'],
    creator: '@gridhealth',
    site: '@gridhealth',
  },

  // Additional meta tags
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },

  // Manifest
  manifest: '/manifest.json',

  // Apple web app
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GridHealth',
  },

  // Mobile web app
  other: {
    'mobile-web-app-capable': 'yes',
  },

  // Other
  category: 'technology',
  classification: 'Business Software',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#8b5cf6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1b4b' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-gray-900 text-gray-100`}>
          <Header />
          <div className="min-h-screen bg-gray-900 pt-20">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
} 