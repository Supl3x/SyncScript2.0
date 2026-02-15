import { useNavigate } from "react-router-dom";
import { Pencil, Menu, PlayCircle, Star, Package, RefreshCw, Shield, ArrowRight, CheckCircle, Check, X } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fdfbf7] font-display overflow-x-hidden">
      {/* Grid Pattern Background */}
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-none" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%2316439c' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`
           }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full bg-[#fdfbf7]/90 backdrop-blur-sm border-b-2 border-[#16439c]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center gap-2 group cursor-pointer">
              <div className="relative w-10 h-10 flex items-center justify-center bg-[#16439c] text-white rounded-[255px_15px_225px_15px/15px_225px_15px_255px] shadow-[4px_4px_0px_0px_#16439c] group-hover:shadow-[2px_2px_0px_0px_#16439c] transition-all duration-200">
                <Pencil size={24} strokeWidth={2} />
              </div>
              <span className="font-bold text-2xl tracking-tight text-[#16439c]">SyncScript</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a className="relative group text-gray-700 hover:text-[#16439c] font-medium transition-colors" href="#">
                About
              </a>
              <a className="relative group text-gray-700 hover:text-[#16439c] font-medium transition-colors" href="#">
                Services
              </a>
              <a className="relative group text-gray-700 hover:text-[#16439c] font-medium transition-colors" href="#">
                Pricing
              </a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button 
                onClick={() => navigate("/login")}
                className="text-[#16439c] font-bold hover:text-[#16439c]/80 transition-colors font-hand text-lg"
              >
                Log In
              </button>
              <button 
                onClick={() => navigate("/register")}
                className="bg-[#16439c] text-white px-6 py-2 border-2 border-black rounded-[255px_15px_225px_15px/15px_225px_15px_255px] shadow-[4px_4px_0px_0px_black] hover:shadow-[2px_2px_0px_0px_black] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 font-bold"
              >
                Sign Up
              </button>
            </div>

            <div className="md:hidden flex items-center">
              <button className="text-gray-700 hover:text-[#16439c]">
                <Menu size={28} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 text-[#16439c]/20 transform -rotate-12 hidden lg:block">
          <Star size={100} strokeWidth={2} />
        </div>
        <div className="absolute bottom-10 right-10 text-[#16439c]/20 transform rotate-45 hidden lg:block">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10,10 Q60,60 110,10 T110,110 T10,110" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left z-20">
              <div className="inline-block px-4 py-1 mb-6 border-2 border-[#16439c]/30 rounded-full rounded-[255px_15px_225px_15px/15px_225px_15px_255px] transform -rotate-2 bg-white">
                <span className="font-hand text-[#16439c] font-bold text-lg">v2.0 is now live!</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6 leading-tight">
                Research Together. <br/>
                <span className="text-[#16439c] relative inline-block">
                  Sync Instantly.
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#16439c]" fill="none" viewBox="0 0 200 9">
                    <path d="M2.00025 6.99997C2.00025 6.99997 33.6577 1.49997 58.7699 1.49997C83.8821 1.49997 199.001 7.49997 199.001 7.49997" stroke="#16439c" strokeLinecap="round" strokeWidth="3" />
                  </svg>
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0 font-hand leading-relaxed">
                The collaborative workspace for architects of information. Sketch your ideas, share your vaults, and build knowledge in real-time.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center relative">
                <button 
                  onClick={() => navigate("/register")}
                  className="group relative px-8 py-4 bg-[#16439c] text-white text-xl font-bold border-2 border-black rounded-[255px_15px_225px_15px/15px_225px_15px_255px] shadow-[4px_4px_0px_0px_black] hover:shadow-[2px_2px_0px_0px_black] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200"
                >
                  Start Sketching
                </button>

                <button className="flex items-center gap-2 text-gray-700 font-bold hover:text-[#16439c] transition-colors px-6 py-4">
                  <PlayCircle size={24} />
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="relative h-[500px] lg:h-[600px] w-full flex items-center justify-center">
              <div className="absolute inset-0 opacity-30 rounded-3xl transform rotate-1" 
                   style={{
                     backgroundImage: 'radial-gradient(#16439c 1px, transparent 1px)',
                     backgroundSize: '20px 20px'
                   }}
              />
              {/* Simplified illustration elements */}
              <div className="absolute top-[10%] left-[10%] w-32 h-40 transform -rotate-12 opacity-80 z-10">
                <div className="w-full h-full border-2 border-gray-600 bg-white rounded-sm p-2">
                  <div className="space-y-2">
                    <div className="h-1 bg-gray-300 w-full" />
                    <div className="h-1 bg-gray-300 w-full" />
                    <div className="h-1 bg-gray-300 w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white border-t-2 border-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="font-hand text-[#16439c] text-xl font-bold block mb-2">- Features -</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Tools for the Modern Scholar</h2>
            <div className="w-24 h-2 bg-[#16439c] mx-auto rounded-[255px_15px_225px_15px/15px_225px_15px_255px]" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Package, title: "Knowledge Vaults", desc: "Securely store your research data in isolated containers. Like a digital safe, but easier to organize.", color: "bg-yellow-50", rotate: "rotate-1" },
              { icon: RefreshCw, title: "Real-Time Sync", desc: "Never lose a thought. Edits from your team appear instantly across all devices, faster than you can blink.", color: "bg-blue-50", rotate: "-rotate-1" },
              { icon: Shield, title: "Role Control", desc: "Granular permissions for every team member. You decide who sketches and who just watches.", color: "bg-green-50", rotate: "rotate-2" }
            ].map((feature, i) => (
              <div key={i} className={`${feature.color} p-8 border-2 border-black rounded-[255px_15px_225px_15px/15px_225px_15px_255px] shadow-[8px_8px_0px_0px_#111827] transform ${feature.rotate} hover:rotate-0 transition-transform duration-300`}>
                <div className="w-12 h-12 bg-white border-2 border-black rounded-full flex items-center justify-center mb-6 text-[#16439c] shadow-sm">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="font-hand text-gray-700 text-lg leading-relaxed">{feature.desc}</p>
                <div className="mt-6 border-t border-black/10 pt-4 flex items-center text-sm font-bold text-[#16439c] cursor-pointer">
                  <span>Explore More</span>
                  <ArrowRight size={16} className="ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 bg-[#16439c] text-white border-y-2 border-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" 
             style={{
               backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)',
               backgroundSize: '24px 24px'
             }}
        />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <p className="text-3xl md:text-4xl font-hand leading-relaxed mb-8">
            "SyncScript turned our messy whiteboard sessions into a structured, searchable digital blueprint. It's basically magic for messy thinkers."
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-white bg-gray-300" />
            <div className="text-left">
              <div className="font-bold text-xl">Sarah Jenkins</div>
              <div className="text-white/70 text-sm">Lead Architect, Studio 42</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-[#fdfbf7] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 relative inline-block">
              Plans that Scale
            </h2>
            <p className="text-xl text-gray-600 mt-4 font-hand">Choose the blueprint that fits your project size.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Student Plan */}
            <div className="bg-white border-2 border-black rounded-lg p-8 shadow-[4px_4px_0px_0px_black] hover:-translate-y-2 transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-hand">The Student</h3>
              <div className="text-4xl font-bold text-[#16439c] mb-6">
                $0<span className="text-lg text-gray-500 font-normal">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center"><Check size={20} className="text-[#16439c] mr-2" /> 1 Knowledge Vault</li>
                <li className="flex items-center"><Check size={20} className="text-[#16439c] mr-2" /> Basic Sync</li>
                <li className="flex items-center"><Check size={20} className="text-[#16439c] mr-2" /> 5 Collaborators</li>
                <li className="flex items-center opacity-50"><X size={20} className="mr-2" /> No Export</li>
              </ul>
              <button className="w-full py-3 border-2 border-black font-bold text-gray-900 hover:bg-gray-50 transition-colors rounded">
                Start Free
              </button>
            </div>

            {/* Researcher Plan */}
            <div className="bg-white border-2 border-[#16439c] rounded-lg p-8 shadow-xl transform scale-105 z-10 relative">
              <div className="absolute top-4 -right-12 bg-yellow-400 text-black text-xs font-bold px-12 py-1 rotate-45 border-y-2 border-black">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold text-[#16439c] mb-2 font-hand">The Researcher</h3>
              <div className="text-4xl font-bold text-[#16439c] mb-6">
                $12<span className="text-lg text-gray-500 font-normal">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center"><CheckCircle size={20} className="text-[#16439c] mr-2" /> Unlimited Vaults</li>
                <li className="flex items-center"><CheckCircle size={20} className="text-[#16439c] mr-2" /> Real-Time Sync</li>
                <li className="flex items-center"><CheckCircle size={20} className="text-[#16439c] mr-2" /> 20 Collaborators</li>
                <li className="flex items-center"><CheckCircle size={20} className="text-[#16439c] mr-2" /> PDF Exports</li>
              </ul>
              <button 
                onClick={() => navigate("/register")}
                className="w-full py-3 bg-[#16439c] text-white font-bold border-2 border-transparent shadow-lg hover:shadow-xl transition-all rounded hover:scale-[1.02]"
              >
                Get Started
              </button>
            </div>

            {/* Lab Plan */}
            <div className="bg-white border-2 border-black rounded-lg p-8 shadow-[4px_4px_0px_0px_black] hover:-translate-y-2 transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-hand">The Lab</h3>
              <div className="text-4xl font-bold text-[#16439c] mb-6">
                $49<span className="text-lg text-gray-500 font-normal">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center"><Check size={20} className="text-[#16439c] mr-2" /> Everything in Pro</li>
                <li className="flex items-center"><Check size={20} className="text-[#16439c] mr-2" /> Role Control</li>
                <li className="flex items-center"><Check size={20} className="text-[#16439c] mr-2" /> Unlimited Users</li>
                <li className="flex items-center"><Check size={20} className="text-[#16439c] mr-2" /> API Access</li>
              </ul>
              <button className="w-full py-3 border-2 border-black font-bold text-gray-900 hover:bg-gray-50 transition-colors rounded">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-black pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 flex items-center justify-center bg-[#16439c] text-white rounded-[155px_10px_145px_10px/10px_145px_10px_155px] border border-black">
                  <Pencil size={16} />
                </div>
                <span className="font-bold text-xl">SyncScript</span>
              </div>
              <p className="text-gray-500 font-hand text-sm">
                Building the future of collaborative research, one sketch at a time.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#16439c] mb-4 uppercase tracking-wider text-sm">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-[#16439c]">Features</a></li>
                <li><a href="#" className="hover:text-[#16439c]">Integrations</a></li>
                <li><a href="#" className="hover:text-[#16439c]">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#16439c] mb-4 uppercase tracking-wider text-sm">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-[#16439c]">About Us</a></li>
                <li><a href="#" className="hover:text-[#16439c]">Careers</a></li>
                <li><a href="#" className="hover:text-[#16439c]">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#16439c] mb-4 uppercase tracking-wider text-sm">Subscribe</h4>
              <div className="relative">
                <input 
                  className="w-full bg-gray-50 border-2 border-black rounded px-4 py-2 focus:ring-2 focus:ring-[#16439c] focus:border-transparent outline-none font-hand" 
                  placeholder="Email address" 
                  type="email"
                />
                <button className="absolute right-2 top-2 text-[#16439c] font-bold hover:text-[#16439c]/70">
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 text-center">
            <p className="text-gray-400 text-sm font-hand">© 2025 SyncScript Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
