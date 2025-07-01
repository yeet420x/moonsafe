import React, { useState, useEffect } from 'react'
import './HeroSection.css'
import bagImg from '../assets/condom.png'
import moonImg from '../assets/moon3.svg'
import rocketImg from '../assets/rocket.svg'

const HeroSection = () => {
  const [isButtonClicked, setIsButtonClicked] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const handleWrapBags = () => {
    setIsButtonClicked(true)
    setShowConfetti(true)
    setClickCount(prev => prev + 1)
    
    // Reset button state after animation
    setTimeout(() => {
      setIsButtonClicked(false)
      setShowConfetti(false)
    }, 2000)
  }

  // Auto-animate floating elements
  useEffect(() => {
    const animateElements = () => {
      const elements = document.querySelectorAll('.floating-img')
      elements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.5}s`
      })
    }
    
    animateElements()
  }, [])

  const generateConfetti = () => {
    const confetti = []
    for (let i = 0; i < 50; i++) {
      confetti.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#E500D4', '#7100B8', '#3A0052'][Math.floor(Math.random() * 3)],
        delay: Math.random() * 2
      })
    }
    return confetti
  }

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            MoonSafe
          </h1>
          <h2 className="hero-subtitle">
            The Last Protection Against Your Own Poor Decisions
          </h2>
          <p className="hero-tagline">
            Moon responsibly. Wrap your bags. Don't get rugged.
          </p>
          <button 
            className={`cta-button ${isButtonClicked ? 'clicked' : ''}`}
            onClick={handleWrapBags}
            disabled={isButtonClicked}
          >
            {isButtonClicked ? 'Bags Wrapped! 🛡️' : 'Wrap Your Bags'}
          </button>
          
          {clickCount > 0 && (
            <div className="click-counter">
              <p>Bags wrapped: {clickCount} times</p>
              <p className="counter-subtitle">(You can never be too safe)</p>
            </div>
          )}
        </div>
        <div className="hero-animation">
          <div className="bag-moon-container">
            <img src={bagImg} alt="Bag" className="bag-img" />
            <img src={moonImg} alt="Moon" className="moon-img" />
          </div>
        </div>
      </div>
      
      <div className="floating-elements">
        <img src={bagImg} alt="Coin" className="floating-img floating-coin" />
        <img src={bagImg} alt="Coin" className="floating-img floating-coin" />
        <img src={bagImg} alt="Coin" className="floating-img floating-coin" />
        <img src={rocketImg} alt="Rocket" className="floating-img floating-rocket" />
        <img src={rocketImg} alt="Rocket" className="floating-img floating-rocket" />
      </div>

      {showConfetti && (
        <div className="confetti-container">
          {generateConfetti().map(particle => (
            <div
              key={particle.id}
              className="confetti-particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: particle.color,
                animationDelay: `${particle.delay}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="hero-stats">
        <div className="stat-item">
          <span className="stat-number">1B</span>
          <span className="stat-label">Total Supply</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">6.9%</span>
          <span className="stat-label">Burn & Lock</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">∞</span>
          <span className="stat-label">Rug Pulls Prevented</span>
        </div>
      </div>
    </section>
  )
}

export default HeroSection 