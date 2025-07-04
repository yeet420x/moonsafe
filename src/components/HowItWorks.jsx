import React from 'react'
import './HowItWorks.css'

const HowItWorks = () => {
  const timelineSteps = [
    {
      step: 1,
      title: "Meme Coin Launches",
      description: "Another 'revolutionary' token hits the market",
      icon: "🚀",
      color: "#E500D4"
    },
    {
      step: 2,
      title: "Degens Ape In",
      description: "FOMO hits hard, bags get heavy",
      icon: "🦍",
      color: "#7100B8"
    },
    {
      step: 3,
      title: "They Regret",
      description: "Reality sets in, charts go red",
      icon: "😭",
      color: "#3A0052"
    },
    {
      step: 4,
      title: "MoonSafe Shows Up",
      description: "We told you so, but we're here to laugh with you",
      icon: "🛡️",
      color: "#E500D4"
    }
  ]

  return (
    <section className="how-it-works">
      <div className="container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          The cycle of degeneracy, visualized for your entertainment
        </p>
        
        <div className="timeline">
          {timelineSteps.map((step, index) => (
            <div key={step.step} className="timeline-step">
              <div className="step-number" style={{ backgroundColor: step.color }}>
                {step.step}
              </div>
              <div className="step-content">
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
              {index < timelineSteps.length - 1 && (
                <div className="timeline-connector"></div>
              )}
            </div>
          ))}
        </div>

       
      </div>
    </section>
  )
}

export default HowItWorks 