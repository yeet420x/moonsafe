import React, { useState, useEffect } from 'react'
import './MoonSafeMeter.css'
import { submitVote, getVoteTally, testConnection, getApprovedTokens, getTokenById } from '../utils/supabase'
import TokenSubmissionForm from './TokenSubmissionForm'
import communityIcon from '../assets/community.svg'
import chartIcon from '../assets/graph2.svg'

const MoonSafeMeter = () => {
  const [currentRugRisk, setCurrentRugRisk] = useState(50) // Start at neutral
  const [communityVotes, setCommunityVotes] = useState(0)
  const [userVote, setUserVote] = useState(null)
  const [voteHistory, setVoteHistory] = useState([])
  const [isVoting, setIsVoting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [voteTally, setVoteTally] = useState({ high: 0, medium: 0, low: 0 })
  const [connectionStatus, setConnectionStatus] = useState('testing')
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [approvedTokens, setApprovedTokens] = useState([])
  const [selectedToken, setSelectedToken] = useState(null)
  const [currentToken, setCurrentToken] = useState({
    id: null,
    name: 'MoonSafe',
    address: 'Default Token',
    description: 'The original MoonSafe token - the community favorite!',
    socialLinks: 'https://moonsafe.online'
  })

  // Calculate rug risk based on vote distribution
  const calculateRugRisk = (tally) => {
    const total = tally.high + tally.medium + tally.low
    if (total === 0) return 50 // Neutral when no votes
    
    // Weighted calculation: high votes increase risk, low votes decrease risk
    const highWeight = tally.high / total * 100
    const lowWeight = tally.low / total * 100
    const mediumWeight = tally.medium / total * 50 // Medium votes are neutral
    
    // Calculate risk: high votes push towards 100%, low votes push towards 0%
    const risk = (highWeight * 0.8) + (mediumWeight * 0.5) + (lowWeight * 0.2)
    
    // Ensure risk is within bounds and return rounded value
    return Math.round(Math.max(0, Math.min(100, risk)))
  }

  // Test Supabase connection on component mount
  useEffect(() => {
    const testSupabase = async () => {
      const isConnected = await testConnection()
      setConnectionStatus(isConnected ? 'connected' : 'failed')
      console.log('Supabase connection status:', isConnected ? 'connected' : 'failed')
    }
    testSupabase()
  }, [])

  // Fetch approved tokens on component mount
  useEffect(() => {
    const fetchApprovedTokens = async () => {
      const tokens = await getApprovedTokens()
      setApprovedTokens(tokens)
    }
    fetchApprovedTokens()
  }, [])

  // Fetch vote tally from Supabase and update risk
  useEffect(() => {
    if (connectionStatus !== 'connected') return
    
    const fetchTally = async () => {
      const tally = await getVoteTally(currentToken.id)
      setVoteTally(tally)
      setCommunityVotes(tally.high + tally.medium + tally.low)
      
      // Calculate new risk based on votes
      const newRisk = calculateRugRisk(tally)
      setCurrentRugRisk(newRisk)
      setLastUpdate(new Date())
    }
    fetchTally()
    const interval = setInterval(fetchTally, 10000) // refresh every 10s
    return () => clearInterval(interval)
  }, [connectionStatus, currentToken.id])

  const getRiskLevel = (risk) => {
    if (risk >= 90) return { level: "CRITICAL", emoji: "💀", color: "#ff4444", description: "Peak degeneracy detected" }
    if (risk >= 70) return { level: "HIGH", emoji: "🔥", color: "#ff8800", description: "High risk of rug pull" }
    if (risk >= 50) return { level: "MEDIUM", emoji: "⚠️", color: "#ffcc00", description: "Moderate risk level" }
    if (risk >= 30) return { level: "LOW", emoji: "🟡", color: "#00cc00", description: "Relatively safe" }
    return { level: "SAFE", emoji: "🛡️", color: "#00ff00", description: "Actually looks decent" }
  }

  const handleVote = async (vote) => {
    if (userVote !== null || isVoting) return
    if (connectionStatus !== 'connected') {
      alert('Database connection failed. Please check your Supabase setup.')
      return
    }
    
    setIsVoting(true)
    const { error } = await submitVote(vote, currentToken.id)
    if (!error) {
      setUserVote(vote)
      setVoteHistory(prev => [{ id: Date.now(), vote, timestamp: new Date() }, ...prev.slice(0, 9)])
      // Refresh tally after vote
      const tally = await getVoteTally(currentToken.id)
      setVoteTally(tally)
      setCommunityVotes(tally.high + tally.medium + tally.low)
      
      // Update risk immediately after vote
      const newRisk = calculateRugRisk(tally)
      setCurrentRugRisk(newRisk)
      setLastUpdate(new Date())
    } else {
      console.error('Vote error details:', error)
      alert(`Vote failed: ${error.message || 'Unknown error'}`)
    }
    setIsVoting(false)
  }

  const handleTokenSelect = async (tokenId) => {
    if (tokenId === null) {
      // Select default MoonSafe token
      setCurrentToken({
        id: null,
        name: 'MoonSafe',
        address: 'Default Token',
        description: 'The original MoonSafe token - the community favorite!',
        socialLinks: 'https://moonsafe.com'
      })
      setSelectedToken(null)
    } else {
      // Select specific token
      const token = await getTokenById(tokenId)
      if (token) {
        setCurrentToken({
          id: token.id,
          name: token.token_name,
          address: token.token_address,
          description: token.description,
          socialLinks: token.social_links
        })
        setSelectedToken(tokenId)
      }
    }
    
    // Reset user vote when switching tokens
    setUserVote(null)
  }

  const getVotePercentage = () => {
    const totalVotes = communityVotes
    if (totalVotes === 0) return { high: 0, medium: 0, low: 0 }
    return {
      high: Math.round((voteTally.high / totalVotes) * 100),
      medium: Math.round((voteTally.medium / totalVotes) * 100),
      low: Math.round((voteTally.low / totalVotes) * 100)
    }
  }

  const riskInfo = getRiskLevel(currentRugRisk)
  const votePercentages = getVotePercentage()

  return (
    <section className="moon-safe-meter">
      <div className="container">
        <h2 className="section-title">MoonSafe Meter</h2>
        <p className="section-subtitle">
          Community-powered rug detection. Vote with your gut feeling.
        </p>
        <div className="meter-container">
          <div className="meter-display">
            {/* Token Information Display */}
            <div className="token-info">
              <div className="token-header">
                <h3>{currentToken.name}</h3>
                <div className="token-address">
                  {currentToken.address}
                </div>
              </div>
              <div className="token-description">
                <p>{currentToken.description}</p>
                {currentToken.socialLinks && (
                  <div className="token-social">
                    <strong>Links:</strong> {currentToken.socialLinks}
                  </div>
                )}
              </div>
            </div>

            {/* Token Selection */}
            <div className="token-selector">
              <h4>Select Token to Vote On:</h4>
              <div className="token-options">
                <button 
                  className={`token-option ${selectedToken === null ? 'selected' : ''}`}
                  onClick={() => handleTokenSelect(null)}
                >
                  🚀 MoonSafe (Default)
                </button>
                {approvedTokens.map((token) => (
                  <button
                    key={token.id}
                    className={`token-option ${selectedToken === token.id ? 'selected' : ''}`}
                    onClick={() => handleTokenSelect(token.id)}
                  >
                    💎 {token.token_name}
                  </button>
                ))}
              </div>
            </div>

            <div className="meter-header">
              <h3>Current Rug Risk Level</h3>
              <div className="risk-level" style={{ color: riskInfo.color }}>
                {riskInfo.emoji} {riskInfo.level}
              </div>
            </div>
            <div className="risk-description">
              <p>{riskInfo.description}</p>
            </div>
            <div className="meter-bar">
              <div 
                className="meter-fill" 
                style={{ 
                  width: `${currentRugRisk}%`,
                  backgroundColor: riskInfo.color
                }}
              ></div>
              <div className="meter-value">{currentRugRisk}%</div>
            </div>
            <div className="meter-stats">
              <div className="stat">
                <span className="stat-label">Community Votes:</span>
                <span className="stat-value">{communityVotes.toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Last Updated:</span>
                <span className="stat-value">{lastUpdate.toLocaleTimeString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Database:</span>
                <span className={`stat-value ${connectionStatus === 'connected' ? 'connected' : connectionStatus === 'failed' ? 'failed' : 'testing'}`}>
                  {connectionStatus === 'connected' ? '🟢 Connected' : connectionStatus === 'failed' ? '🔴 Failed' : '🟡 Testing...'}
                </span>
              </div>
            </div>
            <div className="vote-distribution">
              <h4>Community Sentiment</h4>
              <div className="vote-bars">
                <div className="vote-bar-item">
                  <span className="vote-label">🔥 High Risk</span>
                  <div className="vote-bar">
                    <div className="vote-fill high" style={{ width: `${votePercentages.high}%` }}></div>
                  </div>
                  <span className="vote-percentage">{votePercentages.high}%</span>
                </div>
                <div className="vote-bar-item">
                  <span className="vote-label">⚠️ Medium Risk</span>
                  <div className="vote-bar">
                    <div className="vote-fill medium" style={{ width: `${votePercentages.medium}%` }}></div>
                  </div>
                  <span className="vote-percentage">{votePercentages.medium}%</span>
                </div>
                <div className="vote-bar-item">
                  <span className="vote-label">🛡️ Low Risk</span>
                  <div className="vote-bar">
                    <div className="vote-fill low" style={{ width: `${votePercentages.low}%` }}></div>
                  </div>
                  <span className="vote-percentage">{votePercentages.low}%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="vote-section">
            <h4>What's your gut feeling?</h4>
            <div className="vote-buttons">
              <button 
                className={`vote-btn ${userVote === 'high' ? 'voted' : ''}`}
                onClick={() => handleVote('high')}
                disabled={userVote !== null || isVoting}
              >
                {isVoting && userVote === null ? 'Voting...' : '🔥 High Risk'}
              </button>
              <button 
                className={`vote-btn ${userVote === 'medium' ? 'voted' : ''}`}
                onClick={() => handleVote('medium')}
                disabled={userVote !== null || isVoting}
              >
                {isVoting && userVote === null ? 'Voting...' : '⚠️ Medium Risk'}
              </button>
              <button 
                className={`vote-btn ${userVote === 'low' ? 'voted' : ''}`}
                onClick={() => handleVote('low')}
                disabled={userVote !== null || isVoting}
              >
                {isVoting && userVote === null ? 'Voting...' : '🛡️ Low Risk'}
              </button>
            </div>
            {userVote && (
              <div className="vote-confirmation">
                <p>Thanks for voting! Your voice matters in the community.</p>
              </div>
            )}
            {voteHistory.length > 0 && (
              <div className="recent-votes">
                <h5>Recent Your Votes</h5>
                <div className="vote-history">
                  {voteHistory.slice(0, 5).map((vote) => (
                    <div key={vote.id} className="history-item">
                      <span className={`vote-emoji ${vote.vote}`}>
                        {vote.vote === 'high' ? '🔥' : vote.vote === 'medium' ? '⚠️' : '🛡️'}
                      </span>
                      <span className="vote-time">{vote.timestamp.toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="meter-info">
          <h3>How it works</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-icon">
                <img src={communityIcon} alt="Community" />
              </div>
              <h4>Community Votes</h4>
              <p>Real degens voting with their experience</p>
            </div>
            
            <div className="info-item">
              <div className="info-icon">
                <img src={chartIcon} alt="Chart" />
              </div>
              <h4>Market Vibes</h4>
              <p>Social sentiment and market conditions</p>
            </div>
          </div>
          
          <div className="submit-token-section">
            <h4>Submit a Token for Review</h4>
            <p>Found a suspicious or interesting token? Submit it for community review!</p>
            <button 
              className="submit-token-btn"
              onClick={() => setShowSubmissionForm(true)}
            >
              🚀 Submit Token
            </button>
          </div>
        </div>
        <div className="meter-disclaimer">
          <p>
            *The MoonSafe Meter is for entertainment purposes. 
            Not financial advice. We're just vibing here.
          </p>
          <p className="update-frequency">
            Risk level updates based on community votes every 10 seconds.
          </p>
        </div>
      </div>
      
      {showSubmissionForm && (
        <TokenSubmissionForm
          onClose={() => setShowSubmissionForm(false)}
          onSubmissionSuccess={() => {
            setShowSubmissionForm(false)
            // Refresh approved tokens list
            const fetchApprovedTokens = async () => {
              const tokens = await getApprovedTokens()
              setApprovedTokens(tokens)
            }
            fetchApprovedTokens()
          }}
        />
      )}
    </section>
  )
}

export default MoonSafeMeter 