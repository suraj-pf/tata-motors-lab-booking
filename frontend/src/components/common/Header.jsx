import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  LogOut, 
  Calendar, 
  BarChart3, 
  Building2, 
  User,
  Bell,
  Settings,
  Menu,
  X,
  Map,
  Clock
} from 'lucide-react'
import { useState } from 'react'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Labs', path: '/labs', icon: Building2 },
    { name: 'Timeline', path: '/timeline', icon: Clock },
    { name: 'Lab Map', path: '/labmap', icon: Map },
    { name: 'My Bookings', path: '/bookings', icon: Calendar },
  ]

  if (user?.role === 'admin') {
    navItems.push({ name: 'Dashboard', path: '/dashboard', icon: BarChart3 })
    navItems.push({ name: 'Admin', path: '/admin', icon: Settings })
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const isActive = (path) => location.pathname === path

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-white/30 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link to="/labs" className="flex items-center space-x-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-tata-red to-tata-red-dark rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg viewBox="0 0 48 48" fill="none" className="w-6 h-6 md:w-7 md:h-7">
                <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="3" fill="none"/>
                <path d="M16 24 L24 16 L32 24 L24 32 Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-black text-ocean">TATA MOTORS</h1>
              <span className="text-xs text-teal font-semibold">Lab Booking System</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                      : 'text-ocean hover:bg-teal/10 hover:text-teal'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-cream/50 rounded-full">
                <User size={18} className="text-teal" />
                <span className="font-medium text-ocean">{user?.name || user?.username}</span>
                {user?.role === 'admin' && (
                  <span className="bg-tata-red text-white text-xs px-2 py-1 rounded-full font-bold">
                    ADMIN
                  </span>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-tata-red to-tata-red-dark text-white rounded-xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-teal/10 text-teal"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/30">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-teal to-teal-light text-white'
                        : 'text-ocean hover:bg-teal/10'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              <div className="border-t border-white/30 my-2 pt-2">
                <div className="flex items-center space-x-2 px-4 py-3">
                  <User size={18} className="text-teal" />
                  <span className="font-medium text-ocean">{user?.name}</span>
                  {user?.role === 'admin' && (
                    <span className="bg-tata-red text-white text-xs px-2 py-1 rounded-full font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-tata-red hover:bg-tata-red/10 rounded-xl font-medium"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header