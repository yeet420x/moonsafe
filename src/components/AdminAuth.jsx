import React, { useState } from 'react'
import './AdminAuth.css'

const AdminAuth = ({ onLogin }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // You can change this password to whatever you want
  const ADMIN_PASSWORD = 'DRB2025'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simple password check - in production, you'd want proper authentication
    if (password === ADMIN_PASSWORD) {
      // Store admin session in localStorage
      localStorage.setItem('moonsafe_admin', 'true')
      localStorage.setItem('moonsafe_admin_time', Date.now().toString())
      onLogin()
    } else {
      setError('Invalid password. Please try again.')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="admin-auth">
      <div className="auth-container">
        <div className="auth-header">
          <h2>🔧 Admin Access</h2>
          <p>Enter admin password to access the submission panel</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">Admin Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
            />
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Checking...' : '🔓 Login to Admin Panel'}
          </button>
        </form>
        
        <div className="auth-info">
          <p>💡 <strong>Admin Password:</strong> *******</p>
          <p>🔒 Change this password in the AdminAuth.jsx file for security</p>
        </div>
      </div>
    </div>
  )
}

export default AdminAuth 