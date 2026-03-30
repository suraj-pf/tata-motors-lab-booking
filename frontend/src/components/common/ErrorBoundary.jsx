import React from 'react'
import { AlertTriangle } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20">
            <div className="w-20 h-20 bg-tata-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-tata-red" />
            </div>
            <h2 className="text-2xl font-bold text-ocean mb-3">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="tata-btn"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary