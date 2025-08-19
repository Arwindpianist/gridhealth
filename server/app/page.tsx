import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-gridhealth-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-dark-800/50 border border-dark-700 text-gridhealth-400 text-sm font-medium mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 bg-gridhealth-400 rounded-full mr-2 animate-pulse-slow"></span>
              Enterprise System Health Monitoring
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">GridHealth</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Enterprise-grade system health monitoring platform. Monitor CPU, memory, disk, and network health across your entire organization in real-time with beautiful, intuitive dashboards.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/signup" className="btn-primary text-lg px-10 py-4 text-lg">
                🚀 Get Started
              </Link>
              <Link href="#features" className="btn-outline text-lg px-10 py-4">
                ✨ Learn More
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gridhealth-400 mb-2">99.9%</div>
                <div className="text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-400 mb-2">&lt;200ms</div>
                <div className="text-gray-400">Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gridhealth-400 mb-2">24/7</div>
                <div className="text-gray-400">Monitoring</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-dark-800/50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(139,92,246,0.05),transparent_50%)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powerful Monitoring Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive system health monitoring with enterprise-grade reliability, security, and beautiful visualizations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-hover text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-gridhealth-500 to-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Real-time Monitoring</h3>
              <p className="text-gray-300 leading-relaxed">Monitor system health metrics in real-time with sub-second latency, automatic alerting, and beautiful real-time dashboards.</p>
            </div>
            
            <div className="card-hover text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-gridhealth-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Enterprise Security</h3>
              <p className="text-gray-300 leading-relaxed">Multi-tenant architecture with row-level security, enterprise-grade authentication, and SOC 2 compliance ready.</p>
            </div>
            
            <div className="card-hover text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-gridhealth-500 to-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Advanced Analytics</h3>
              <p className="text-gray-300 leading-relaxed">Comprehensive reporting and analytics with customizable dashboards, predictive insights, and automated recommendations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-dark-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(168,85,247,0.05),transparent_50%)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Pay only for what you use. No hidden fees, no surprises. Enterprise-grade monitoring at startup prices.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="card-hover text-center relative overflow-hidden pb-8">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gridhealth-500 to-primary-500"></div>
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-white mt-4 mb-4">Per Device Pricing</h3>
                <div className="text-6xl font-bold gradient-text mb-2">
                  MYR 11
                </div>
                <div className="text-xl text-gray-400">per device per 3 months</div>
              </div>
              
              <ul className="text-left space-y-4 mb-10 max-w-md mx-auto">
                <li className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-200">Real-time health monitoring</span>
                </li>
                <li className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-200">Multi-tenant dashboards</span>
                </li>
                <li className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-200">Enterprise security & compliance</span>
                </li>
                <li className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-200">24/7 support & monitoring</span>
                </li>
                <li className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-200">Advanced analytics & insights</span>
                </li>
              </ul>
              
              <Link href="/signup" className="btn-primary w-full text-lg py-4">
                🚀 Start Monitoring
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-dark-800 to-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-10 left-10 w-64 h-64 bg-gridhealth-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Monitor Your Systems?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join hundreds of organizations already using GridHealth to monitor their critical infrastructure. 
            Get started in minutes, not days.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/signup" className="btn-primary text-lg px-12 py-4">
              🚀 Get Started Today
            </Link>
            <Link href="/signup" className="btn-outline text-lg px-12 py-4">
              📊 View Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
} 