'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function BenefitsPage() {
  const [videoUrl, setVideoUrl] = useState('')
  const [showVideo, setShowVideo] = useState(false)

  const benefits = [
    {
      title: 'Proactive Issue Detection',
      description: 'Identify and resolve system problems before they impact productivity or cause downtime.',
      icon: '🔍',
      features: [
        'Real-time health monitoring',
        'Early warning alerts',
        'Predictive maintenance insights',
        'Automated issue detection'
      ]
    },
    {
      title: 'Cost Optimization',
      description: 'Reduce IT costs through better resource management and preventive maintenance.',
      icon: '💰',
      features: [
        'Eliminate reactive IT support',
        'Optimize hardware utilization',
        'Reduce emergency repairs',
        'Extend device lifespan'
      ]
    },
    {
      title: 'Enhanced Security',
      description: 'Monitor system security health and detect potential vulnerabilities before they become threats.',
      icon: '🛡️',
      features: [
        'Security service monitoring',
        'Vulnerability detection',
        'Compliance monitoring',
        'Security health scoring'
      ]
    },
    {
      title: 'Improved Productivity',
      description: 'Ensure optimal system performance to maximize employee productivity and reduce frustration.',
      icon: '📈',
      features: [
        'Performance optimization',
        'Resource monitoring',
        'Bottleneck identification',
        'System tuning recommendations'
      ]
    },
    {
      title: 'Centralized Management',
      description: 'Manage all your devices from a single dashboard with comprehensive reporting and analytics.',
      icon: '🎛️',
      features: [
        'Unified device overview',
        'Group-based management',
        'Comprehensive reporting',
        'Role-based access control'
      ]
    },
    {
      title: 'Scalable Solution',
      description: 'Grow your monitoring capabilities as your business expands with flexible licensing options.',
      icon: '🚀',
      features: [
        'Flexible device limits',
        'Group-based organization',
        'Multi-user access',
        'Enterprise-grade features'
      ]
    }
  ]

  const useCases = [
    {
      industry: 'Healthcare',
      description: 'Ensure critical medical systems remain operational and secure, protecting patient data and maintaining compliance.',
      benefits: ['HIPAA compliance', '24/7 system monitoring', 'Critical service alerts', 'Audit trail maintenance']
    },
    {
      industry: 'Financial Services',
      description: 'Maintain high availability for trading systems and customer-facing applications with real-time monitoring.',
      benefits: ['High availability', 'Performance optimization', 'Security monitoring', 'Compliance reporting']
    },
    {
      industry: 'Manufacturing',
      description: 'Prevent production line downtime by monitoring industrial computers and control systems proactively.',
      benefits: ['Production continuity', 'Predictive maintenance', 'System reliability', 'Cost reduction']
    },
    {
      industry: 'Education',
      description: 'Manage large fleets of student and administrative computers efficiently with group-based monitoring.',
      benefits: ['Fleet management', 'Cost optimization', 'Student productivity', 'IT efficiency']
    },
    {
      industry: 'Legal Services',
      description: 'Ensure document management systems and client databases remain secure and performant.',
      benefits: ['Data security', 'System performance', 'Client confidentiality', 'Compliance assurance']
    },
    {
      industry: 'Retail',
      description: 'Monitor point-of-sale systems and inventory management computers to prevent sales disruptions.',
      benefits: ['Sales continuity', 'System reliability', 'Customer experience', 'Operational efficiency']
    }
  ]

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (videoUrl.trim()) {
      setShowVideo(true)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Business Benefits</h1>
              <p className="text-dark-300">Discover how GridHealth transforms IT operations</p>
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/pricing" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">
            Transform Your IT Operations with GridHealth
          </h2>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-8">
            Stop reacting to IT issues and start preventing them. GridHealth provides proactive system monitoring 
            that saves time, reduces costs, and improves productivity across your entire organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/pricing" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/contact" 
              className="bg-dark-700 hover:bg-dark-600 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Schedule Demo
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Key Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h4 className="text-xl font-semibold text-white mb-3">{benefit.title}</h4>
                <p className="text-dark-300 mb-4">{benefit.description}</p>
                <ul className="space-y-2">
                  {benefit.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="text-sm text-white flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Video Section */}
        <div className="mb-16">
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-8">
            <h3 className="text-2xl font-bold text-white text-center mb-6">
              See GridHealth in Action
            </h3>
            <p className="text-dark-300 text-center mb-8 max-w-2xl mx-auto">
              Watch our comprehensive setup guide and see how easy it is to get GridHealth running in your environment. 
              From installation to configuration, we'll show you everything you need to know.
            </p>
            
            {!showVideo ? (
              <div className="text-center">
                <div className="bg-dark-700 rounded-lg p-8 mb-6">
                  <svg className="mx-auto h-16 w-16 text-dark-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-dark-300 mb-4">
                    Video demonstration coming soon! This will show a complete setup walkthrough.
                  </p>
                  <form onSubmit={handleVideoSubmit} className="max-w-md mx-auto">
                    <input
                      type="url"
                      placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    />
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Load Video
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-dark-700 rounded-lg overflow-hidden">
                <iframe
                  src={videoUrl}
                  title="GridHealth Setup Guide"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        </div>

        {/* Industry Use Cases */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Industry Solutions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                <h4 className="text-xl font-semibold text-white mb-3">{useCase.industry}</h4>
                <p className="text-dark-300 mb-4">{useCase.description}</p>
                <ul className="space-y-1">
                  {useCase.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="text-sm text-white flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="mb-16">
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-8">
            <h3 className="text-2xl font-bold text-white text-center mb-6">
              Calculate Your ROI
            </h3>
            <p className="text-dark-300 text-center mb-8 max-w-2xl mx-auto">
              See how much GridHealth can save your organization. Our ROI calculator helps you understand 
              the financial impact of proactive IT monitoring.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-dark-700 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-400 mb-2">$50K+</div>
                <div className="text-dark-300">Annual savings for 100 devices</div>
              </div>
              <div className="bg-dark-700 rounded-lg p-6">
                <div className="text-3xl font-bold text-blue-400 mb-2">80%</div>
                <div className="text-dark-300">Reduction in IT support tickets</div>
              </div>
              <div className="bg-dark-700 rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-400 mb-2">95%</div>
                <div className="text-dark-300">Uptime improvement</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Ready to Transform Your IT Operations?
          </h3>
          <p className="text-dark-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of organizations that have already improved their IT efficiency with GridHealth. 
            Start your free trial today and see the difference proactive monitoring makes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/pricing" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/contact" 
              className="bg-dark-700 hover:bg-dark-600 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
