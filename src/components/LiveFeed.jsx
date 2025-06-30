import React, { useState, useEffect } from 'react'
import './LiveFeed.css'
import { getLatestMoonshotTokens, getMockMoonshotTokens, setMintLookbackMinutes, MINT_LOOKBACK_MINUTES } from '../utils/solana.js'

const LiveFeed = () => {
  const [tokens, setTokens] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isRealData, setIsRealData] = useState(false)
  const [lookbackMinutes, setLookbackMinutes] = useState(60)
  const [sortBy, setSortBy] = useState('timestamp')
  const [filterBy, setFilterBy] = useState('all')
  const [showOnlyHot, setShowOnlyHot] = useState(false)

  const fetchTokens = async () => {
    try {
      console.log('🔄 Fetching live token data...')
      setIsLoading(true)
      
      // Update the lookback window
      setMintLookbackMinutes(lookbackMinutes)
      
      // Try to get real data first
      const realTokens = await getLatestMoonshotTokens()
      
      if (realTokens && realTokens.length > 0) {
        console.log('✅ Using real token data:', realTokens.length, 'tokens')
        setTokens(realTokens)
        setIsRealData(true)
      } else {
        console.log('⚠️ No real tokens found, using mock data')
        const mockTokens = getMockMoonshotTokens()
        setTokens(mockTokens)
        setIsRealData(false)
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('❌ Error fetching tokens:', error)
      const mockTokens = getMockMoonshotTokens()
      setTokens(mockTokens)
      setIsRealData(false)
      setLastUpdate(new Date())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
    
    // Update every 10 minutes
    const interval = setInterval(fetchTokens, 600000)
    
    return () => clearInterval(interval)
  }, [lookbackMinutes])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const formatNumber = (num) => {
    if (typeof num === 'string') return num
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Check if token is brand new (minted in last 5 minutes)
  const isBrandNew = (token) => {
    const now = Math.floor(Date.now() / 1000)
    return (now - token.timestamp) < 300 // 5 minutes
  }

  // Sort and filter tokens
  const getProcessedTokens = () => {
    let processed = [...tokens]

    // Filter by type
    if (filterBy === 'moonshot') {
      processed = processed.filter(token => token.isMoonshotLaunch)
    } else if (filterBy === 'spl') {
      processed = processed.filter(token => token.programType === 'SPL Token')
    } else if (filterBy === 'token2022') {
      processed = processed.filter(token => token.programType === 'Token-2022')
    }

    // Filter by hot status
    if (showOnlyHot) {
      processed = processed.filter(token => 
        token.status.includes('HOT') || token.status.includes('LAUNCHING') || token.status.includes('PUMPING')
      )
    }

    // Sort
    processed.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return b.timestamp - a.timestamp
        case 'holders':
          const aHoldersStr = String(a.holders || '0')
          const bHoldersStr = String(b.holders || '0')
          const aHolders = parseInt(aHoldersStr.replace(/,/g, '')) || 0
          const bHolders = parseInt(bHoldersStr.replace(/,/g, '')) || 0
          return bHolders - aHolders
        case 'marketCap':
          const aMarketCapStr = String(a.marketCap || '0')
          const bMarketCapStr = String(b.marketCap || '0')
          const aMarketCap = parseInt(aMarketCapStr.replace(/[$,]/g, '')) || 0
          const bMarketCap = parseInt(bMarketCapStr.replace(/[$,]/g, '')) || 0
          return bMarketCap - aMarketCap
        case 'name':
          const aName = String(a.name || '')
          const bName = String(b.name || '')
          return aName.localeCompare(bName)
        default:
          return b.timestamp - a.timestamp
      }
    })

    return processed
  }

  const processedTokens = getProcessedTokens()

  if (isLoading) {
    return (
      <section className="live-feed">
        <div className="container">
          <h2 className="section-title">Watch the Degeneracy Unfold</h2>
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Scanning Solana for the best degeneracy...</p>
           
            <p className="loading-note">⏱️ Timeout: 10 seconds - will use mock data if needed</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="live-feed">
      <div className="container">
        <h2 className="section-title">Watch the Degeneracy Unfold</h2>
        <p className="section-subtitle">
          Live feed of the latest Moonshot launches with our expert analysis
        </p>
        
        <div className="feed-container">
          <div className="feed-header">
            <h3>🔥 Hotest Moonshot Launches</h3>
            <div className="refresh-info">
              <div className="refresh-indicator">
                {isRealData ? 'Live  Data' : 'Mock Data'}
              </div>
              <div className="last-update">
                Last updated: {lastUpdate?.toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="feed-controls">
            <div className="control-group">
              <label>Time Window:</label>
              <select 
                value={lookbackMinutes} 
                onChange={(e) => setLookbackMinutes(parseInt(e.target.value))}
                className="control-select"
              >
                <option value={60}>1 Hour</option>
                <option value={360}>6 Hours</option>
                <option value={1440}>24 Hours</option>
              </select>
            </div>
            
            <div className="control-group">
              <label>Sort By:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="control-select"
              >
                <option value="timestamp">Newest First</option>
                <option value="holders">Most Holders</option>
                <option value="marketCap">Highest Market Cap</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
            
            <div className="control-group">
              <label>Filter:</label>
              <select 
                value={filterBy} 
                onChange={(e) => setFilterBy(e.target.value)}
                className="control-select"
              >
                <option value="all">All Tokens</option>
                <option value="moonshot">Moonshot Launches</option>
                <option value="spl">SPL Token</option>
                <option value="token2022">Token-2022</option>
              </select>
            </div>
            
            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={showOnlyHot} 
                  onChange={(e) => setShowOnlyHot(e.target.checked)}
                />
                Hot Only
              </label>
            </div>
          </div>
          
          <div className="feed-info">
            <p>Tracking fresh minted tokens from the last {lookbackMinutes === 60 ? 'hour' : lookbackMinutes === 360 ? '6 hours' : '24 hours'} so you can get in early!</p>
            {lastUpdate && (
              <p className="last-update">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="launches-list">
            {processedTokens.map((token, index) => (
              <div key={token.address + index} className={`launch-card ${isBrandNew(token) ? 'brand-new' : ''} ${token.errorFallback ? 'error-fallback' : ''}`}>
                <div className="launch-header">
                  <div className="launch-info">
                    <h4 className="launch-name">{token.name}</h4>
                    <div className="launch-symbol-container">
                      <span className="launch-symbol">${token.symbol}</span>
                      {isBrandNew(token) && (
                        <span className="brand-new-badge" title="Minted in the last 5 minutes">
                          🆕 BRAND NEW
                        </span>
                      )}
                      {token.isMoonshotLaunch && (
                        <span className="moonshot-badge" title="Launched through Moonshot program">
                          🌙 MOONSHOT
                        </span>
                      )}
                      {token.programType && (
                        <span className="program-badge" title={`Created with ${token.programType}`}>
                          {token.programType === 'SPL Token' ? '🔵 SPL' : '🟢 2022'}
                        </span>
                      )}
                      <button 
                        className="copy-address-btn"
                        onClick={() => copyToClipboard(token.address)}
                        title="Copy token address"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="launch-status">{token.status}</div>
                </div>
                
                <div className="launch-details">
                  <div className="detail-row">
                    <span className="label">Updated:</span>
                    <span className="value">{token.launchTime}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Price:</span>
                    <span className="value">{token.price}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Market Cap:</span>
                    <span className="value">{token.marketCap}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">FDV:</span>
                    <span className="value">{token.fdv}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Holders:</span>
                    <span className="value">{formatNumber(token.holders)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Supply:</span>
                    <span className="value">{token.supply}</span>
                  </div>
                  {isRealData && (
                    <div className="detail-row">
                      <span className="label">Address:</span>
                      <span className="value address" onClick={() => copyToClipboard(token.address)}>
                        {token.address.slice(0, 8)}...{token.address.slice(-8)}
                        <span className="copy-icon">📋</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="feed-footer">
          <p>
            {isRealData 
              ? `✅ Real-time data from Solana blockchain. Tracking fresh minted tokens from the last ${lookbackMinutes === 60 ? 'hour' : lookbackMinutes === 360 ? '6 hours' : '24 hours'} with real metadata from Moralis.`
              : "⚠️ Using mock data. Check your RPC connection for real-time data."
            }
          </p>
          <p className="update-note">
            Data refreshes every 10 minutes. Last update: {lastUpdate?.toLocaleTimeString()}
          </p>
          <p className="data-source">
            Source: QuickNode RPC → Fresh Token Mints (Last {lookbackMinutes === 60 ? 'Hour' : lookbackMinutes === 360 ? '6 Hours' : '24 Hours'}) + Moralis Token Metadata
          </p>
        </div>
      </div>
    </section>
  )
}

export default LiveFeed 