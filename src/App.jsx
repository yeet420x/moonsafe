import React from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import HeroSection from './components/HeroSection'
import HowItWorks from './components/HowItWorks'
import Tokenomics from './components/Tokenomics'
import MerchSection from './components/MerchSection'
import LiveFeed from './components/LiveFeed'
import MoonSafeMeter from './components/MoonSafeMeter'
import AdminPage from './components/AdminPage'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={
          <>
            <HeroSection />
            <HowItWorks />
            <Tokenomics />
            <LiveFeed />
            <MoonSafeMeter />
          </>
        } />
      </Routes>
    </div>
  )
}

export default App
