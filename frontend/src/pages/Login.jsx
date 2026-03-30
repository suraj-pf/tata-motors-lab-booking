import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, User, Lock, Shield, Users } from 'lucide-react'
import { DEMO_CREDENTIALS } from '../utils/constants'
import toast from 'react-hot-toast'

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const credentials = {
        username: formData.username || (role === 'admin' ? DEMO_CREDENTIALS.ADMIN.username : DEMO_CREDENTIALS.USER.username),
        password: formData.password || (role === 'admin' ? DEMO_CREDENTIALS.ADMIN.password : DEMO_CREDENTIALS.USER.password),
      }

      await login(credentials)
      navigate(role === 'admin' ? '/dashboard' : '/labs')
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = (userRole) => {
    setRole(userRole)
    setFormData({
      username: userRole === 'admin' ? DEMO_CREDENTIALS.ADMIN.username : DEMO_CREDENTIALS.USER.username,
      password: userRole === 'admin' ? DEMO_CREDENTIALS.ADMIN.password : DEMO_CREDENTIALS.USER.password,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cream via-peach to-pink-soft">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/30">
          {/* Logo & Title Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              {/* Real Tata Logo Image */}
              <img
                src="https://z-cdn-media.chatglm.cn/files/cb754f67-f4f9-4b9a-b65e-30feb12ecec5.png?auth_key=1874361574-4bebe605b8e84140bdbf4c3618732462-0-983f0b5fdf378ccaefafd503242f562c"
                alt="Tata Motors Logo"
                className="h-20 w-auto object-contain"
              />
              <div className="text-left">
                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-ocean to-teal bg-clip-text text-transparent">
                  TATA MOTORS
                </h1>
                <p className="text-teal font-medium mt-1">Lab Booking System</p>
              </div>
            </div>
          </div>

          {/* Role Toggle */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => fillDemoCredentials('user')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                role === 'user'
                  ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                  : 'bg-cream/50 text-ocean hover:bg-teal/10'
              }`}
            >
              <Users size={20} />
              Staff
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                role === 'admin'
                  ? 'bg-gradient-to-r from-tata-red to-tata-red-dark text-white shadow-lg'
                  : 'bg-cream/50 text-ocean hover:bg-tata-red/10'
              }`}
            >
              <Shield size={20} />
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <User size={18} className="text-teal" />
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder={role === 'admin' ? 'admin' : 'staff1'}
                className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all bg-white/80"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <Lock size={18} className="text-teal" />
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                // Updated placeholder to match new DB password
                placeholder={role === 'admin' ? 'admin123' : 'staff123'} 
                className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all bg-white/80"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full tata-btn py-4 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-teal/20">
            <p className="text-sm text-center text-ocean/60 mb-4">Demo Credentials:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream/50 p-3 rounded-xl text-center">
                <p className="text-xs text-teal font-semibold mb-1">STAFF</p>
                {/* Updated to staff123 to match database */}
                <p className="font-mono text-sm">staff1 / staff123</p>
              </div>
              <div className="bg-tata-red/10 p-3 rounded-xl text-center">
                <p className="text-xs text-tata-red font-semibold mb-1">ADMIN</p>
                <p className="font-mono text-sm">admin / admin123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login