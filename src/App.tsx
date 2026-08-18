import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed w-full bg-slate-950/80 backdrop-blur-md z-50 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            FinFlow
          </div>
          <div className="hidden md:flex gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition">Features</a>
            <a href="#tools" className="hover:text-emerald-400 transition">Tools</a>
            <a href="#pricing" className="hover:text-emerald-400 transition">Pricing</a>
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
          Take Control of Your <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Financial Future</span>
        </h1>
        <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
          The intelligent platform that connects all your finances in one place. Track investments, manage budgets, and plan for financial independence with clarity and confidence.
        </p>
        <div className="flex gap-4 justify-center mb-12">
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition">
            Start Free Trial
          </button>
          <button className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 px-8 py-3 rounded-lg font-semibold transition">
            Watch Demo
          </button>
        </div>
        <div className="bg-gradient-to-b from-emerald-500/20 to-transparent p-1 rounded-xl max-w-4xl mx-auto">
          <div className="bg-slate-900 rounded-lg p-8 backdrop-blur">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-emerald-400">$2.4M</p>
                <p className="text-slate-400 text-sm">Assets Tracked</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">50K+</p>
                <p className="text-slate-400 text-sm">Active Users</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-violet-400">98%</p>
                <p className="text-slate-400 text-sm">User Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-white text-center mb-4">Everything You Need</h2>
        <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
          Stop juggling multiple apps. One platform for complete financial visibility.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-emerald-500/50 transition">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-3">Unified Dashboard</h3>
            <p className="text-slate-400">See your complete net worth across all accounts at a glance. Real-time updates from banks, brokers, and crypto wallets.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-emerald-500/50 transition">
            <div className="text-3xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-white mb-3">Smart Budgeting</h3>
            <p className="text-slate-400">Automatic expense categorization with AI insights. Spot spending patterns and optimize your budget effortlessly.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-emerald-500/50 transition">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-3">Financial Planning</h3>
            <p className="text-slate-400">Project your wealth over 30+ years. Model different scenarios and get personalized recommendations for retirement.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-emerald-500/50 transition">
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-white mb-3">Portfolio Analytics</h3>
            <p className="text-slate-400">Analyze asset allocation, diversification, and performance. Get alerts when your portfolio drifts from targets.</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-12">
          <h3 className="text-2xl font-bold text-white mb-4">Advanced Features</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Tax-loss harvesting opportunities</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Debt payoff calculator</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Real estate valuation tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Goal-based planning tools</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured In Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Trusted By Industry Leaders</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-2">Featured on Forbes Finance Podcast</h3>
            <p className="text-slate-400">Join thousands of listeners who learned how modern tools reshape personal finance strategy.</p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-2">Covered by CNBC Markets</h3>
            <p className="text-slate-400">Financial wellness segment highlights how transparent tracking leads to better investment decisions.</p>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-white text-center mb-4">Free Financial Calculators</h2>
        <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
          Get instant insights with our suite of powerful tools, free forever.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {['FIRE Calculator', 'Compound Interest', 'Retirement Planner', 'Debt Payoff', 'Investment Returns', 'Savings Goal'].map((tool, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/50 hover:bg-slate-800 transition cursor-pointer">
              <p className="text-white font-semibold">{tool}</p>
              <p className="text-slate-400 text-sm mt-2">Get instant calculations and insights</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-800">
        <h2 className="text-4xl font-bold text-white text-center mb-12">Simple, Transparent Pricing</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-2">Essential</h3>
            <p className="text-3xl font-bold text-emerald-400 mb-6">Free</p>
            <ul className="space-y-3 text-slate-300 mb-8">
              <li>✓ Unified dashboard</li>
              <li>✓ Basic budgeting</li>
              <li>✓ Up to 5 accounts</li>
              <li>✓ Free calculators</li>
            </ul>
            <button className="w-full border border-emerald-500 text-emerald-400 py-2 rounded-lg hover:bg-emerald-500/10 transition">
              Get Started
            </button>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/50 rounded-lg p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
            <p className="text-3xl font-bold text-emerald-400 mb-6">$9<span className="text-lg text-slate-400">/mo</span></p>
            <ul className="space-y-3 text-slate-300 mb-8">
              <li>✓ Everything in Essential</li>
              <li>✓ Unlimited accounts</li>
              <li>✓ Advanced analytics</li>
              <li>✓ FIRE projections</li>
              <li>✓ Priority support</li>
            </ul>
            <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg transition font-semibold">
              Start Trial
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Take Control?</h2>
          <p className="text-xl text-slate-300 mb-8">Join thousands building their financial independence with FinFlow.</p>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition text-lg">
            Start Your Journey Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <p className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">FinFlow</p>
            <p className="text-slate-400 text-sm">Your path to financial freedom starts here.</p>
          </div>
          <div>
            <p className="text-white font-semibold mb-4">Product</p>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition">Features</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition">Pricing</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition">Security</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-4">Company</p>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition">About</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition">Blog</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-4">Legal</p>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition">Privacy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition">Terms</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition">Disclosure</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
          <p>&copy; 2024 FinFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
