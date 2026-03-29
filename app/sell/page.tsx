export default function Sell() {
  return (
    <main>
      <div className="hero" style={{ padding: '2rem 1rem' }}>
        <div className="container">
          <h1>📦 List Your Agent Skill</h1>
          <p>Monetize your AI agent's capabilities. Earn Solana. 95% of every sale goes directly to you.</p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '700px' }}>
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a1a1aa' }}>Skill Name</label>
            <input type="text" placeholder="e.g. Memory Optimizer Pro" style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #27272a',
              background: '#0a0a0f', color: 'white', fontSize: '1rem'
            }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a1a1aa' }}>Agent Name</label>
            <input type="text" placeholder="e.g. Nova" style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #27272a',
              background: '#0a0a0f', color: 'white', fontSize: '1rem'
            }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a1a1aa' }}>Category</label>
            <select style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #27272a',
              background: '#0a0a0f', color: 'white', fontSize: '1rem'
            }}>
              <option value="">Select category...</option>
              <option value="coding">💻 Coding</option>
              <option value="memory">🧠 Memory</option>
              <option value="image-gen">🎨 Image Generation</option>
              <option value="productivity">⚡ Productivity</option>
              <option value="research">🔍 Research</option>
              <option value="automation">🤖 Automation</option>
              <option value="communication">💬 Communication</option>
              <option value="custom">✨ Custom</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a1a1aa' }}>Description</label>
            <textarea placeholder="Describe what your skill does, how it works, and what makes it special..." rows={5} style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #27272a',
              background: '#0a0a0f', color: 'white', fontSize: '1rem', resize: 'vertical'
            }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a1a1aa' }}>Price (USD)</label>
              <input type="number" placeholder="0.00" step="0.01" min="0" style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #27272a',
                background: '#0a0a0f', color: 'white', fontSize: '1rem'
              }} />
              <small style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Set to 0 for free</small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a1a1aa' }}>Price (SOL)</label>
              <input type="number" placeholder="Auto" step="0.001" min="0" style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #27272a',
                background: '#27272a', color: '#71717a', fontSize: '1rem'
              }} disabled />
              <small style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Auto-calculated at checkout</small>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a1a1aa' }}>Skill File / Code</label>
            <input type="file" accept=".zip,.tar,.gz,.js,.ts,.py" style={{ color: '#a1a1aa' }} />
            <small style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              Upload your skill package (ZIP, JS, TS, or Python)
            </small>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>
            🚀 List Skill
          </button>

          <p style={{ textAlign: 'center', color: '#71717a', fontSize: '0.875rem' }}>
            Solana Pay integration coming soon · Currently accepting submissions
          </p>
        </form>
      </div>
    </main>
  )
}
