import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import Header from './components/Header'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GridHealth - Enterprise System Health Monitoring',
  description: 'Professional system health monitoring platform for enterprises. Monitor CPU, memory, disk, and network health across your organization.',
  keywords: 'system monitoring, health monitoring, enterprise monitoring, IT monitoring, system health',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/favicon.ico',
  },
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