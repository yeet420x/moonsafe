import React from 'react'
import './App.css'
import HeroSection from './components/HeroSection'
import HowItWorks from './components/HowItWorks'
import Tokenomics from './components/Tokenomics'
import MerchSection from './components/MerchSection'
import LiveFeed from './components/LiveFeed'
import MoonSafeMeter from './components/MoonSafeMeter'

function App() {
  return (
    <div className="App">
      <HeroSection />
      <HowItWorks />
      <Tokenomics />
      <LiveFeed />
      <MoonSafeMeter />
    </div>
  )
}

export default App
