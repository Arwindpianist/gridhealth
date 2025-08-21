'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs'
import { useOnboarding } from '../hooks/useOnboarding'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { needsOnboarding, isLoading } = useOnboarding()
  const { user } = useUser()

  // Check if user is admin (independent of onboarding status)
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const response = await fetch('/api/admin/check-status')
          if (response.ok) {
            const data = await response.json()
            setIsAdmin(data.isAdmin || false)
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
        }
      }
    }

    checkAdminStatus()
  }, [user])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-dark-700/50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200">
            <div className="relative">
              <img 
                src="/favicon.svg" 
                alt="GridHealth Logo" 
                className="w-10 h-10 rounded-xl"
                onError={(e) => {
                  // Fallback to ICO if SVG fails
                  const target = e.target as HTMLImageElement;
                  target.src = '/favicon.ico';
                }}
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <div className="text-xl font-bold gradient-text">GridHealth</div>
              <div className="text-xs text-gray-400">By: arwindpianist.store</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-300 hover:text-white transition-colors duration-200">
              Features
            </Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors duration-200">
              Pricing
            </Link>
            <Link href="/download" className="text-gray-300 hover:text-white transition-colors duration-200">
              Download
            </Link>
            
            {/* Authentication Buttons */}
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="btn-outline px-6 py-2">
                  Sign Up
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="btn-primary px-6 py-2">
                  Login
                </button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              {!isLoading && needsOnboarding ? (
                <>
                  <Link href="/onboarding" className="btn-primary px-6 py-2">
                    Complete Setup
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-semibold">
                      🔐 Admin
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Dashboard
                  </Link>
                  <Link href="/licenses" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Licenses
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-semibold">
                      🔐 Admin
                    </Link>
                  )}
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10",
                        userButtonPopoverCard: "bg-dark-800 border-dark-700",
                        userButtonPopoverActionButton: "text-gray-300 hover:text-white hover:bg-dark-700"
                      }
                    }}
                  />
                </>
              )}
            </SignedIn>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-dark-800 border border-dark-700 text-gray-300 hover:text-white transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-dark-700">
            <nav className="flex flex-col space-y-4">
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors duration-200 py-2">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors duration-200 py-2">
                Pricing
              </Link>
              <Link href="/download" className="text-gray-300 hover:text-white transition-colors duration-200 py-2">
                Download
              </Link>
              
              {/* Mobile Authentication */}
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="btn-outline w-full text-center py-3">
                    Sign Up
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="btn-primary w-full text-center py-3">
                    Login
                  </button>
                </SignInButton>
              </SignedOut>
              
              <SignedIn>
                {!isLoading && needsOnboarding ? (
                  <>
                    <Link href="/onboarding" className="btn-primary w-full text-center py-3">
                      Complete Setup
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="text-purple-400 hover:text-purple-300 transition-colors duration-200 py-2 font-semibold">
                        🔐 Admin Dashboard
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors duration-200 py-2">
                      Dashboard
                    </Link>
                    <Link href="/licenses" className="text-gray-300 hover:text-white transition-colors duration-200 py-2">
                      Licenses
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="text-purple-400 hover:text-purple-300 transition-colors duration-200 py-2 font-semibold">
                        🔐 Admin Dashboard
                      </Link>
                    )}
                    <div className="flex justify-center">
                      <UserButton 
                        appearance={{
                          elements: {
                            avatarBox: "w-12 h-12",
                            userButtonPopoverCard: "bg-dark-800 border-dark-700",
                            userButtonPopoverActionButton: "text-gray-300 hover:text-white hover:bg-dark-700"
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              </SignedIn>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
} 