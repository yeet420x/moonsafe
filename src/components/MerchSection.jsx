import React, { useState, useEffect } from 'react'
import './MerchSection.css'
import { submitDesign, getDesigns, voteDesign, uploadImageToStorage, validateImageFile } from '../utils/supabase'

const MerchSection = () => {
  const [showDesignForm, setShowDesignForm] = useState(false)
  const [designForm, setDesignForm] = useState({
    name: '',
    email: '',
    designType: 'condom',
    description: '',
    file: null
  })
  const [submittedDesigns, setSubmittedDesigns] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [fileError, setFileError] = useState('')

  // Fetch designs on component mount
  useEffect(() => {
    fetchDesigns()
  }, [])

  const fetchDesigns = async () => {
    try {
      const designs = await getDesigns()
      setSubmittedDesigns(designs)
    } catch (error) {
      console.error('Error fetching designs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDesignSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFileError('')
    
    try {
      let imageUrl = null
      
      // Handle file upload if present
      if (designForm.file) {
        const uploadResult = await uploadImageToStorage(designForm.file)
        if (uploadResult.error) {
          setFileError(uploadResult.error)
          setIsSubmitting(false)
          return
        }
        imageUrl = uploadResult.url
      }
      
      const designData = {
        ...designForm,
        imageUrl
      }
      
      const { error } = await submitDesign(designData)
      
      if (error) {
        alert(`Failed to submit design: ${error}`)
        return
      }
      
      // Refresh designs
      await fetchDesigns()
      
      // Reset form
      setDesignForm({
        name: '',
        email: '',
        designType: 'condom',
        description: '',
        file: null
      })
      setShowDesignForm(false)
      setFileError('')
      
      alert('Design submitted successfully!')
    } catch (error) {
      console.error('Error submitting design:', error)
      alert('Failed to submit design. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVote = async (designId) => {
    try {
      const { error } = await voteDesign(designId)
      
      if (error) {
        alert('Failed to vote. Please try again.')
        return
      }
      
      // Refresh designs to get updated vote count
      await fetchDesigns()
    } catch (error) {
      console.error('Error voting:', error)
      alert('Failed to vote. Please try again.')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setFileError('')
    
    if (file) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        setFileError(validation.error)
        e.target.value = '' // Clear the input
        setDesignForm(prev => ({ ...prev, file: null }))
        return
      }
      
      setDesignForm(prev => ({ ...prev, file }))
    } else {
      setDesignForm(prev => ({ ...prev, file: null }))
    }
  }

  const merchItems = [
    {
      name: "MoonSafe Condoms",
      description: "Branded protection for your portfolio",
      price: "Coming Soon",
      image: "🛡️",
      status: "Design Phase",
      votes: 156
    },
    {
      name: "I Ape Safely Sticker",
      description: "Show off your degeneracy with pride",
      price: "Coming Soon",
      image: "🦍",
      status: "Design Phase",
      votes: 89
    },
    {
      name: "Moonbagged & Protected",
      description: "For those who learned the hard way",
      price: "Coming Soon",
      image: "🌕",
      status: "Design Phase",
      votes: 234
    },
    {
      name: "MoonSafe T-Shirt",
      description: "Wear your protection on your sleeve",
      price: "Coming Soon",
      image: "👕",
      status: "Design Phase",
      votes: 67
    }
  ]

  return (
    <section className="merch-section">
      <div className="container">
        <h2 className="section-title">Wrap It in Real Life</h2>
        <p className="section-subtitle">
          Because sometimes you need physical reminders of your poor decisions
        </p>
        
        <div className="merch-grid">
          {merchItems.map((item, index) => (
            <div key={index} className="merch-card">
              <div className="merch-image">{item.image}</div>
              <h3 className="merch-name">{item.name}</h3>
              <p className="merch-description">{item.description}</p>
              <div className="merch-price">{item.price}</div>
              <div className="merch-status">{item.status}</div>
              <div className="merch-votes">
                <span className="vote-count">❤️ {item.votes}</span>
                <span className="vote-label">community votes</span>
              </div>
            </div>
          ))}
        </div>

        <div className="merch-notice">
          <h3>🎨 Design Contest</h3>
          <p>
            Submit your best MoonSafe merch designs! 
            The community will vote on the best ones.
            Winners get free merch and eternal glory.
          </p>
          <button 
            className="submit-design-btn"
            onClick={() => setShowDesignForm(true)}
          >
            Submit Design
          </button>
        </div>

        {isLoading ? (
          <div className="loading-designs">
            <p>Loading community designs...</p>
          </div>
        ) : submittedDesigns.length > 0 && (
          <div className="submitted-designs">
            <h3>🎨 Community Submissions</h3>
            <div className="designs-grid">
              {submittedDesigns.map((design) => (
                <div key={design.id} className="design-card">
                  <div className="design-header">
                    <h4>{design.name}</h4>
                    <span className="design-type">{design.design_type}</span>
                  </div>
                  <p className="design-description">{design.description}</p>
                  {design.image_url && (
                    <div className="design-image">
                      <img src={design.image_url} alt={design.name} />
                    </div>
                  )}
                  <div className="design-meta">
                    <span className="design-date">
                      {new Date(design.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      className="vote-design-btn"
                      onClick={() => handleVote(design.id)}
                    >
                      ❤️ {design.votes || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showDesignForm && (
          <div className="design-form-overlay">
            <div className="design-form-modal">
              <button 
                className="close-form-btn"
                onClick={() => {
                  setShowDesignForm(false)
                  setFileError('')
                }}
              >
                ✕
              </button>
              <h3>Submit Your Design</h3>
              <form onSubmit={handleDesignSubmit}>
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={designForm.name}
                    onChange={(e) => setDesignForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Anonymous Degeneracy"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email (optional)</label>
                  <input
                    type="email"
                    value={designForm.email}
                    onChange={(e) => setDesignForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                  />
                </div>
                
                <div className="form-group">
                  <label>Design Type</label>
                  <select
                    value={designForm.designType}
                    onChange={(e) => setDesignForm(prev => ({ ...prev, designType: e.target.value }))}
                  >
                    <option value="condom">MoonSafe Condom</option>
                    <option value="sticker">Sticker</option>
                    <option value="tshirt">T-Shirt</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Design Description</label>
                  <textarea
                    value={designForm.description}
                    onChange={(e) => setDesignForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    placeholder="Describe your amazing design idea..."
                    rows="4"
                  />
                </div>
                
                <div className="form-group">
                  <label>Upload Design (optional)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                  />
                  <small>Supported formats: JPG, PNG, GIF, WebP (max 5MB)</small>
                  {fileError && (
                    <div className="file-error">
                      ❌ {fileError}
                    </div>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="submit-form-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Design'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="merch-disclaimer">
          <p>
            *Note: MoonSafe condoms are for entertainment purposes only. 
            Please use actual protection in real life situations.
          </p>
        </div>
      </div>
    </section>
  )
}

export default MerchSection 