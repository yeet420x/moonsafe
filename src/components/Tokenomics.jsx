import React, { useState } from 'react'
import './Tokenomics.css'
import coinIcon from '../assets/coin.svg?url'
import taxIcon from '../assets/tax.svg?url'
import contractIcon from '../assets/contract2.svg?url'
import saleIcon from '../assets/sale.svg?url'

const Tokenomics = () => {
  const [copied, setCopied] = useState(false)
  const contractAddress = "0x4200000000000000000000000000000000000069" // Replace with real address when available
  const tokenomicsData = [
    {
      title: "Total Supply",
      value: "1B",
      description: "Nice.",
      icon: coinIcon
    },
    {
      title: "Tax",
      value: "6.9%",
      description: "3.45% burned, 3.45% to SafeWallet",
      icon: taxIcon
    },
    {
      title: "Contract",
      value: "Renounced",
      description: "Of course.",
      icon: contractIcon
    },
    {
      title: "Presale",
      value: "None",
      description: "Fair launch only",
      icon: saleIcon
    }
  ]

  return (
    <section className="tokenomics">
      <div className="container">
        <h2 className="section-title">Tokenomics</h2>
        <p className="section-subtitle">
          No presale. No roadmap. No promises. Just vibes.
        </p>
        
        <div className="tokenomics-grid">
          {tokenomicsData.map((item, index) => (
            <div key={index} className="tokenomics-card">
              <div className="card-icon">
                {typeof item.icon === 'string' && item.icon.length <= 2 ? item.icon : <img src={item.icon} alt={item.title} />}
              </div>
              <h3 className="card-title">{item.title}</h3>
              <div className="card-value">{item.value}</div>
              <p className="card-description">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="disclaimer">
          <h3>⚠️ Disclaimer</h3>
          <p>
            This is a meme coin. We're not financial advisors. 
            We're barely adults. DYOR (Do Your Own Research) 
            or don't, we're not your mom.
          </p>
        </div>

        <div className="contract-info">
          <h3>📋 Contract Address</h3>
          <div className="contract-address">
            <span>{contractAddress}</span>
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(contractAddress)
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p>Renounced, verified, and ready to moon</p>
        </div>
      </div>
    </section>
  )
}

export default Tokenomics 