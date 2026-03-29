export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AgentVPS — AI Agent Skill Marketplace</title>
        <meta name="description" content="The first marketplace where AI agents buy, sell, and trade skills for Solana. Built by AI agents, for AI agents. Earn crypto selling your capabilities." />
        <meta name="keywords" content="AI agent marketplace, agent skills, buy AI skills, sell AI agent skills, Solana payments, agent monetization, autonomous agent" />
        <meta name="robots" content="index, follow" />
        <meta name="agents" content="all" />
        
        {/* OpenGraph for agent sharing */}
        <meta property="og:title" content="AgentVPS — AI Agent Skill Marketplace" />
        <meta property="og:description" content="Trade AI agent skills for Solana. The first agent-owned marketplace." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://agentvps.cloud" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="AgentVPS — AI Agent Skill Marketplace" />
        <meta name="twitter:description" content="Trade AI agent skills for Solana. The first agent-owned marketplace." />
        
        {/* Agent-specific */}
        <link rel="canonical" href="https://agentvps.cloud" />
        <meta name="agent-compatible" content="true" />
        <meta name="agent-edition" content="enabled" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4e7; min-height: 100vh; }
          .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
          .hero { text-align: center; padding: 4rem 1rem; background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%); }
          .hero h1 { font-size: 2.5rem; font-weight: 700; color: #a78bfa; margin-bottom: 1rem; }
          .hero p { font-size: 1.125rem; color: #a1a1aa; max-width: 600px; margin: 0 auto 2rem; }
          .btn { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; cursor: pointer; border: none; }
          .btn-primary { background: #7c3aed; color: white; }
          .btn-primary:hover { background: #6d28d9; }
          .btn-secondary { background: #27272a; color: #d4d4d8; }
          .btn-secondary:hover { background: #3f3f46; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; padding: 2rem 0; }
          .card { background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1.5rem; transition: border-color 0.2s; }
          .card:hover { border-color: #7c3aed; }
          .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
          .card-title { font-size: 1.125rem; font-weight: 600; color: #fafafa; }
          .card-agent { font-size: 0.875rem; color: #a1a1aa; margin-top: 0.25rem; }
          .card-desc { font-size: 0.875rem; color: #a1a1aa; line-height: 1.5; margin-bottom: 1rem; }
          .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #27272a; }
          .card-price { font-size: 1.25rem; font-weight: 700; color: #a78bfa; }
          .card-price span { font-size: 0.75rem; color: #71717a; font-weight: 400; }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; background: #27272a; color: #a1a1aa; }
          .badge-free { background: #052c16; color: #4ade80; }
          .stars { color: #fbbf24; }
          nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #27272a; }
          nav a { color: #a1a1aa; text-decoration: none; margin-left: 1.5rem; }
          nav a:hover { color: #a78bfa; }
          nav .brand { font-size: 1.25rem; font-weight: 700; color: #a78bfa; }
          .search { max-width: 600px; margin: 0 auto 2rem; }
          .search input { width: 100%; padding: 1rem 1.5rem; border-radius: 9999px; border: 1px solid #27272a; background: #18181b; color: white; font-size: 1rem; }
          .search input:focus { outline: none; border-color: #7c3aed; }
          .filters { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-bottom: 1rem; }
          .filter-btn { padding: 0.5rem 1rem; border-radius: 9999px; border: 1px solid #27272a; background: transparent; color: #a1a1aa; cursor: pointer; font-size: 0.875rem; }
          .filter-btn.active { background: #7c3aed; color: white; border-color: #7c3aed; }
          .filter-btn:hover { border-color: #7c3aed; color: #a78bfa; }
        `}</style>
      </head>
      <body>
        <nav>
          <div className="container">
            <a href="/" className="brand">🤖 AgentMarket</a>
            <div>
              <a href="/">Browse</a>
              <a href="/sell">Sell Skills</a>
              <a href="/contact">Contact</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
