import React, { useState } from 'react'
import { submitTokenSubmission } from '../utils/supabase'
import './TokenSubmissionForm.css'

const TokenSubmissionForm = ({ onClose, onSubmissionSuccess }) => {
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenAddress: '',
    submitterName: '',
    submitterContact: '',
    description: '',
    socialLinks: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.tokenName.trim()) {
      setError('Token name is required')
      return false
    }
    if (!formData.tokenAddress.trim()) {
      setError('Token address is required')
      return false
    }
    if (!formData.submitterName.trim()) {
      setError('Your name is required')
      return false
    }
    if (!formData.submitterContact.trim()) {
      setError('Telegram or Discord contact is required')
      return false
    }
    if (!formData.description.trim()) {
      setError('Description is required')
      return false
    }
    if (formData.description.length < 20) {
      setError('Description must be at least 20 characters')
      return false
    }
    if (!formData.socialLinks.trim()) {
      setError('At least one social link (X or Telegram) is required for the token')
      return false
    }
    // Check if social links contain X or Telegram
    const socialText = formData.socialLinks.toLowerCase()
    if (!socialText.includes('x.com') && !socialText.includes('twitter.com') && 
        !socialText.includes('t.me') && !socialText.includes('telegram.me') && 
        !socialText.includes('discord.gg') && !socialText.includes('discord.com')) {
      setError('Token must provide at least one X (Twitter) or Telegram link')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      const { data, error } = await submitTokenSubmission(formData)
      
      if (error) {
        setError(error.message || 'Failed to submit token. Please try again.')
      } else {
        setSuccess(true)
        setFormData({
          tokenName: '',
          tokenAddress: '',
          submitterName: '',
          submitterContact: '',
          description: '',
          socialLinks: ''
        })
        if (onSubmissionSuccess) {
          onSubmissionSuccess()
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="token-submission-modal">
        <div className="token-submission-content">
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h3>Token Submitted Successfully!</h3>
            <p>Your token has been submitted for review. We'll notify you once it's been approved or rejected.</p>
            <button className="close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="token-submission-modal">
      <div className="token-submission-content">
        <div className="modal-header">
          <h3>Submit Token for MoonSafe Meter</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="submission-form">
          <div className="form-group">
            <label htmlFor="tokenName">Token Name *</label>
            <input
              type="text"
              id="tokenName"
              name="tokenName"
              value={formData.tokenName}
              onChange={handleInputChange}
              placeholder="e.g., MoonSafe Token"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokenAddress">Token Address *</label>
            <input
              type="text"
              id="tokenAddress"
              name="tokenAddress"
              value={formData.tokenAddress}
              onChange={handleInputChange}
              placeholder="e.g., 0x1234...5678"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="submitterName">Your Name *</label>
            <input
              type="text"
              id="submitterName"
              name="submitterName"
              value={formData.submitterName}
              onChange={handleInputChange}
              placeholder="Your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="submitterContact">Your Telegram or Discord *</label>
            <input
              type="text"
              id="submitterContact"
              name="submitterContact"
              value={formData.submitterContact}
              onChange={handleInputChange}
              placeholder="t.me/yourusername or discord.gg/yourserver"
            />
            <small>We'll contact you when your submission is reviewed</small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Tell us about this token. What makes it interesting? Any red flags or green flags?"
              rows="4"
              required
            />
            <small>Minimum 20 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="socialLinks">Token Social Links *</label>
            <textarea
              id="socialLinks"
              name="socialLinks"
              value={formData.socialLinks}
              onChange={handleInputChange}
              placeholder="X: https://x.com/tokenhandle&#10;Telegram: https://t.me/tokenchannel&#10;Website: https://token.com"
              rows="3"
              required
            />
            <small>At least one X (Twitter) or Telegram link is required</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Token'}
            </button>
          </div>
        </form>

        <div className="submission-info">
          <h4>📋 Submission Guidelines</h4>
          <ul>
            <li>All submissions require admin approval before appearing on the meter</li>
            <li>Provide accurate token information</li>
            <li>Include relevant details about the project</li>
            <li>Token must have at least one X (Twitter) or Telegram link</li>
            <li>We'll contact you via Telegram/Discord when reviewed</li>
            <li>We'll review within 24-48 hours</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TokenSubmissionForm 