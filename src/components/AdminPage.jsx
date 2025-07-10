import React, { useState, useEffect } from 'react'
import AdminPanel from './AdminPanel'
import AdminAuth from './AdminAuth'
import './AdminPage.css'

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if admin is authenticated on component mount
  useEffect(() => {
    const adminSession = localStorage.getItem('moonsafe_admin')
    const adminTime = localStorage.getItem('moonsafe_admin_time')
    
    if (adminSession && adminTime) {
      // Check if session is less than 24 hours old
      const sessionAge = Date.now() - parseInt(adminTime)
      const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours
      
      if (sessionAge < maxSessionAge) {
        setIsAuthenticated(true)
      } else {
        // Session expired, clear it
        localStorage.removeItem('moonsafe_admin')
        localStorage.removeItem('moonsafe_admin_time')
      }
    }
  }, [])

  const handleAdminLogin = () => {
    setIsAuthenticated(true)
  }

  const handleAdminLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('moonsafe_admin')
    localStorage.removeItem('moonsafe_admin_time')
  }

  return (
    <div className="admin-page">
      {isAuthenticated ? (
        <AdminPanel onLogout={handleAdminLogout} />
      ) : (
        <AdminAuth onLogin={handleAdminLogin} />
      )}
    </div>
  )
}

export default AdminPage 