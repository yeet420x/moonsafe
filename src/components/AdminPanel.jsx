import React, { useState, useEffect } from 'react'
import { getTokenSubmissions, updateTokenSubmissionStatus } from '../utils/supabase'
import './AdminPanel.css'

const AdminPanel = ({ onLogout }) => {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, approved, rejected, all
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchSubmissions()
  }, [filter])

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const data = await getTokenSubmissions(filter === 'all' ? null : filter)
      setSubmissions(data)
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (submissionId, status) => {
    setProcessing(true)
    try {
      const { error } = await updateTokenSubmissionStatus(submissionId, status, adminNotes)
      if (error) {
        alert(`Error updating status: ${error.message}`)
      } else {
        setSelectedSubmission(null)
        setAdminNotes('')
        fetchSubmissions() // Refresh the list
        alert(`Submission ${status} successfully!`)
      }
    } catch (error) {
      alert('An error occurred while updating the submission')
      console.error('Status update error:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: '#ffcc00', text: '⏳ Pending' },
      approved: { color: '#00ff00', text: '✅ Approved' },
      rejected: { color: '#ff4444', text: '❌ Rejected' }
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.text}
      </span>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading">Loading submissions...</div>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>🔧 Admin Panel - Token Submissions</h2>
        <div className="filter-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">⏳ Pending Review</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
            <option value="all">📋 All Submissions</option>
          </select>
          <button onClick={fetchSubmissions} className="refresh-btn">
            🔄 Refresh
          </button>
          <button onClick={onLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </div>

      <div className="submissions-list">
        {submissions.length === 0 ? (
          <div className="no-submissions">
            <p>No {filter === 'all' ? '' : filter} submissions found.</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <div key={submission.id} className="submission-card">
              <div className="submission-header">
                <h3>{submission.token_name}</h3>
                {getStatusBadge(submission.status)}
              </div>
              
              <div className="submission-details">
                <div className="detail-row">
                  <strong>Token Address:</strong>
                  <span className="token-address">{submission.token_address}</span>
                </div>
                <div className="detail-row">
                  <strong>Submitted by:</strong>
                  <span>{submission.submitter_name}</span>
                </div>
                <div className="detail-row">
                  <strong>Contact:</strong>
                  <span>{submission.submitter_contact}</span>
                </div>
                <div className="detail-row">
                  <strong>Submitted:</strong>
                  <span>{formatDate(submission.created_at)}</span>
                </div>
                {submission.reviewed_at && (
                  <div className="detail-row">
                    <strong>Reviewed:</strong>
                    <span>{formatDate(submission.reviewed_at)}</span>
                  </div>
                )}
              </div>

              <div className="submission-content">
                <div className="description">
                  <strong>Description:</strong>
                  <p>{submission.description}</p>
                </div>
                
                {submission.social_links && (
                  <div className="social-links">
                    <strong>Social Links:</strong>
                    <p>{submission.social_links}</p>
                  </div>
                )}

                {submission.admin_notes && (
                  <div className="admin-notes">
                    <strong>Admin Notes:</strong>
                    <p>{submission.admin_notes}</p>
                  </div>
                )}
              </div>

              {submission.status === 'pending' && (
                <div className="submission-actions">
                  <textarea
                    placeholder="Add admin notes (optional)..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="admin-notes-input"
                  />
                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      onClick={() => handleStatusUpdate(submission.id, 'approved')}
                      disabled={processing}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleStatusUpdate(submission.id, 'rejected')}
                      disabled={processing}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AdminPanel 