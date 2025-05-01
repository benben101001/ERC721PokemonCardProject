import React from 'react';

const HomePage = ({ setTab }) => {
  const features = [
    {
      title: "Mint Pokémon NFTs",
      description: "Create unique digital Pokémon cards as NFTs on the blockchain",
      icon: "🎨",
      tab: 'mint'
    },
    {
      title: "Trade Pokémon",
      description: "Buy and sell your Pokémon NFTs in our decentralized marketplace",
      icon: "💱",
      tab: 'market'
    },
    {
      title: "Auction House",
      description: "Participate in exciting auctions for rare Pokémon NFTs",
      icon: "🏆",
      tab: 'auction'
    },
    {
      title: "My Collection",
      description: "View and manage your personal Pokémon NFT collection",
      icon: "📚",
      tab: 'collection'
    }
  ];

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">Welcome to Pokémon NFT Marketplace</h1>
        <p className="hero-subtitle">Collect, Trade, and Battle with Digital Pokémon Cards on the Blockchain</p>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <div 
            key={index} 
            className="feature-card"
            onClick={() => setTab(feature.tab)}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
            <button className="feature-button">
              Get Started
              <span className="pixel-arrow">→</span>
            </button>
          </div>
        ))}
      </div>

      <div className="info-section">
        <h2 className="info-title">How It Works</h2>
        <div className="info-steps">
          <div className="info-step">
            <div className="step-number">1</div>
            <p>Connect your wallet to get started</p>
          </div>
          <div className="info-step">
            <div className="step-number">2</div>
            <p>Mint or purchase your first Pokémon NFT</p>
          </div>
          <div className="info-step">
            <div className="step-number">3</div>
            <p>Trade or auction your Pokémon cards</p>
          </div>
          <div className="info-step">
            <div className="step-number">4</div>
            <p>Build your ultimate collection</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 