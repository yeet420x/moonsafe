import React, { useState, useEffect } from 'react'
import AdminPanel from './AdminPanel'
import AdminAuth from './AdminAuth'
import { isAdminSessionValid, clearAdminSession } from '../utils/adminAuth'
import './AdminPage.css'

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if admin is authenticated on component mount
  useEffect(() => {
    if (isAdminSessionValid()) {
      setIsAuthenticated(true)
    }
  }, [])

  const handleAdminLogin = () => {
    setIsAuthenticated(true)
  }

  const handleAdminLogout = () => {
    setIsAuthenticated(false)
    clearAdminSession()
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