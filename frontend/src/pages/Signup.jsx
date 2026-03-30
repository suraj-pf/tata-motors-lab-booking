import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserPlus, User, Lock, Mail, Building2, AlertCircle, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    bc_number: '',
    department: '',
    role: 'user'
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const validateForm = () => {
    const newErrors = {}

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    // BC Number validation
    if (!formData.bc_number.trim()) {
      newErrors.bc_number = 'BC number is required'
    } else if (!/^[A-Z0-9]+$/.test(formData.bc_number.toUpperCase())) {
      newErrors.bc_number = 'BC number should contain only letters and numbers'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...signupData } = formData
      await signup(signupData)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cream via-peach to-pink-soft">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/30">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-teal to-teal-light rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <UserPlus size={40} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-ocean to-teal bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-teal font-medium mt-2">Join Tata Motors Lab System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <User size={18} className="text-teal" />
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all bg-white/80 ${
                  errors.username 
                    ? 'border-tata-red focus:border-tata-red focus:ring-4 focus:ring-tata-red/10' 
                    : 'border-teal/20 focus:border-teal focus:ring-4 focus:ring-teal/10'
                } focus:outline-none`}
                disabled={loading}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.username}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <User size={18} className="text-teal" />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all bg-white/80 ${
                  errors.name 
                    ? 'border-tata-red focus:border-tata-red focus:ring-4 focus:ring-tata-red/10' 
                    : 'border-teal/20 focus:border-teal focus:ring-4 focus:ring-teal/10'
                } focus:outline-none`}
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.name}
                </p>
              )}
            </div>

            {/* BC Number */}
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <Building2 size={18} className="text-teal" />
                BC Number
              </label>
              <input
                type="text"
                name="bc_number"
                value={formData.bc_number}
                onChange={handleChange}
                placeholder="Enter BC number"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all bg-white/80 ${
                  errors.bc_number 
                    ? 'border-tata-red focus:border-tata-red focus:ring-4 focus:ring-tata-red/10' 
                    : 'border-teal/20 focus:border-teal focus:ring-4 focus:ring-teal/10'
                } focus:outline-none`}
                disabled={loading}
              />
              {errors.bc_number && (
                <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.bc_number}
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <Building2 size={18} className="text-teal" />
                Department (Optional)
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter department"
                className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all bg-white/80"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <Lock size={18} className="text-teal" />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password (min 6 chars)"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all bg-white/80 ${
                  errors.password 
                    ? 'border-tata-red focus:border-tata-red focus:ring-4 focus:ring-tata-red/10' 
                    : 'border-teal/20 focus:border-teal focus:ring-4 focus:ring-teal/10'
                } focus:outline-none`}
                disabled={loading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <Lock size={18} className="text-teal" />
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all bg-white/80 ${
                  errors.confirmPassword 
                    ? 'border-tata-red focus:border-tata-red focus:ring-4 focus:ring-tata-red/10' 
                    : 'border-teal/20 focus:border-teal focus:ring-4 focus:ring-teal/10'
                } focus:outline-none`}
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
                <User size={18} className="text-teal" />
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                  className={`py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    formData.role === 'user'
                      ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                      : 'bg-cream/50 text-ocean hover:bg-teal/10'
                  }`}
                  disabled={loading}
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                  className={`py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    formData.role === 'admin'
                      ? 'bg-gradient-to-r from-tata-red to-tata-red-dark text-white shadow-lg'
                      : 'bg-cream/50 text-ocean hover:bg-tata-red/10'
                  }`}
                  disabled={loading}
                >
                  Admin
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full tata-btn py-4 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-teal/20 text-center">
            <p className="text-sm text-ocean/70">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-teal font-semibold hover:text-teal-light transition-colors flex items-center justify-center gap-1 mt-2"
              >
                <LogIn size={16} />
                Sign In Instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
