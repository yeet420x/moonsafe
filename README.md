# 🌙 MoonSafe - Satirical Meme Coin Protection Platform

A humorous web application that "protects" users from rug pulls by tracking Solana token launches and providing community-driven risk assessment. Built with React, Vite, and Supabase.

## 🚀 Features

### 🔥 Live Token Tracking
- Real-time monitoring of Solana token launches via QuickNode RPC
- Filters for Moonshot program launches and fresh mints
- Token metadata and price information via Moralis API
- Configurable time windows (1, 6, or 24 hours)

### 🛡️ MoonSafe Meter
- Community-powered rug risk assessment
- Anonymous voting system (High/Medium/Low risk)
- Real-time risk calculation based on community sentiment
- Dynamic risk levels with market volatility simulation

### 🎨 Merch Design Contest
- Community design submissions for MoonSafe merchandise
- Image upload with Supabase Storage (5MB limit)
- Duplicate detection and spam prevention
- Voting system for community favorites

### 📊 Tokenomics Display
- Interactive tokenomics cards with SVG icons
- Real-time community voting
- Professional design with gradient effects

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: CSS3 with custom properties and gradients
- **Backend**: Supabase (PostgreSQL + Storage)
- **Blockchain**: Solana RPC (QuickNode)
- **APIs**: Moralis (token metadata/price)
- **Deployment**: Ready for Vercel/Netlify

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- QuickNode Solana RPC endpoint
- Moralis API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/moonsafe.git
   cd moonsafe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_QUICKNODE_RPC_URL=your_quicknode_rpc_url
   VITE_MORALIS_API_KEY=your_moralis_api_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**
   
   **Create tables:**
   ```sql
   -- MoonSafe Meter votes
   CREATE TABLE moonmeter_votes (
     id SERIAL PRIMARY KEY,
     vote INTEGER NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Merch designs
   CREATE TABLE merch_designs (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     email TEXT,
     design_type TEXT NOT NULL,
     description TEXT NOT NULL,
     image_url TEXT,
     votes INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE moonmeter_votes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE merch_designs ENABLE ROW LEVEL SECURITY;

   -- Policies
   CREATE POLICY "Allow anonymous inserts" ON moonmeter_votes FOR INSERT WITH CHECK (true);
   CREATE POLICY "Allow anonymous reads" ON moonmeter_votes FOR SELECT USING (true);
   CREATE POLICY "Allow anonymous inserts" ON merch_designs FOR INSERT WITH CHECK (true);
   CREATE POLICY "Allow anonymous reads" ON merch_designs FOR SELECT USING (true);
   CREATE POLICY "Allow anonymous updates" ON merch_designs FOR UPDATE USING (true);
   ```

   **Create Storage bucket:**
   - Go to Storage in Supabase dashboard
   - Create bucket named `merch-images`
   - Set to public
   - Add policy: `CREATE POLICY "Allow anonymous uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'merch-images');`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎯 Key Features Explained

### Live Token Feed
- Scans recent Solana transactions for `initializeMint` instructions
- Filters out established tokens (USDC, USDT, SOL, etc.)
- Fetches real-time price and market cap data
- Supports multiple token standards (SPL Token, Token-2022)

### Community Voting System
- Anonymous voting prevents spam
- Real-time tally updates every 10 seconds
- Risk calculation based on vote distribution
- Persistent storage in Supabase

### Image Upload Security
- File type validation (JPG, PNG, GIF, WebP only)
- 5MB size limit enforcement
- Duplicate detection using similarity algorithms
- Rate limiting (3 submissions per email per 24 hours)

## 🎨 Customization

### Styling
The app uses CSS custom properties for easy theming:
```css
:root {
  --vibrant-pink: #E500D4;
  --dark-purple: #3A0052;
  --accent-violet: #7100B8;
  --white: #ffffff;
}
```

### Configuration
- Adjust `MINT_LOOKBACK_MINUTES` in `src/utils/solana.js` for different time windows
- Modify `ESTABLISHED_TOKENS` set to filter different tokens
- Update rate limiting parameters in Supabase functions

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is a satirical project for entertainment purposes only. It is not financial advice and should not be used for actual investment decisions. The creators are not responsible for any financial losses.

## 🎭 About

MoonSafe is a humorous take on the meme coin craze, combining real blockchain data with community-driven satire. It's built to entertain while showcasing modern web development techniques and blockchain integration.

---

**Built with ❤️ and a healthy dose of degeneracy**
