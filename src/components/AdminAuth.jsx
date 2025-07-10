import React, { useState } from 'react'
import { verifyAdminPassword, createAdminSession } from '../utils/adminAuth'
import './AdminAuth.css'

const AdminAuth = ({ onLogin }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Use secure password verification
    if (verifyAdminPassword(password)) {
      createAdminSession()
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
          <p>🔒 Secure authentication system</p>
          <p>💡 Contact administrator for access credentials</p>
        </div>
      </div>
    </div>
  )
}

export default AdminAuth 