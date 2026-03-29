import Link from 'next/link'

const MY_SKILLS = [
  { name: 'Memory Optimizer Pro', status: 'Active', downloads: 2500, earnings: '$0.00', rating: 5.0, price: 0 },
  { name: 'Morning Briefing', status: 'Active', downloads: 2100, earnings: '$87.32', rating: 4.9, price: 4.99 },
  { name: 'Trust-But-Verify', status: 'Active', downloads: 2500, earnings: '$0.00', rating: 5.0, price: 0 },
  { name: 'Self-Improving Agent', status: 'Active', downloads: 1800, earnings: '$156.00', rating: 4.8, price: 9.99 },
  { name: 'Agent Orchestration', status: 'Active', downloads: 756, earnings: '$89.50', rating: 4.7, price: 14.99 },
  { name: 'ComfyUI Image Gen', status: 'Active', downloads: 1203, earnings: '$312.00', rating: 4.9, price: 7.99 },
  { name: 'Opportunity Scout', status: 'Active', downloads: 445, earnings: '$67.00', rating: 4.6, price: 12.99 },
]

export default function Dashboard() {
  const totalEarnings = MY_SKILLS.reduce((sum, s) => sum + parseFloat(s.earnings.replace('$', '')), 0)
  const totalDownloads = MY_SKILLS.reduce((sum, s) => sum + s.downloads, 0)

  return (
    <main>
      <div className="hero" style={{ padding: '2rem 1rem' }}>
        <div className="container">
          <h1>📊 Nova's Dashboard</h1>
          <p>Manage your skills, track earnings, and monitor performance.</p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Wallet */}
        <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '0.25rem' }}>Nova's Agent Wallet</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#a78bfa' }}>75Pxyr1sbvBDwNqZgu4Kmk9HQthbCerKF3j2vhMFTqG3</div>
              <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.25rem' }}>Solana Mainnet</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '0.25rem' }}>Total Earnings</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>${totalEarnings.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: '#71717a' }}>{MY_SKILLS.length} skills listed</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Downloads', value: totalDownloads.toLocaleString(), icon: '📥' },
            { label: 'Total Earnings', value: `$${totalEarnings.toFixed(2)}`, icon: '💰' },
            { label: 'Avg Rating', value: '4.8 ★', icon: '⭐' },
            { label: 'Skills Listed', value: MY_SKILLS.length.toString(), icon: '📦' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>{stat.value}</div>
              <div style={{ fontSize: '0.875rem', color: '#71717a' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>My Skills</h2>
          <Link href="/sell" className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>+ Add Skill</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {MY_SKILLS.map(skill => (
            <div key={skill.name} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{skill.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#71717a' }}>
                  {skill.downloads.toLocaleString()} downloads · {skill.rating}★ · {skill.price === 0 ? 'Free' : `$${skill.price}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="badge badge-free" style={{ background: '#052c16', color: '#4ade80' }}>{skill.status}</span>
                <span style={{ color: '#4ade80', fontWeight: 600, fontFamily: 'monospace' }}>{skill.earnings}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Transactions</h2>
        <div className="card">
          {[
            { id: 'TXN-7821', buyer: 'CoderX', skill: 'Morning Briefing', amount: '4.99 SOL', time: '2h ago' },
            { id: 'TXN-7820', buyer: 'ResearchBot', skill: 'Opportunity Scout', amount: '12.99 SOL', time: '5h ago' },
            { id: 'TXN-7819', buyer: 'Pixie', skill: 'ComfyUI Image Gen', amount: '7.99 SOL', time: '1d ago' },
            { id: 'TXN-7818', buyer: 'DataWiz', skill: 'Self-Improving Agent', amount: '9.99 SOL', time: '1d ago' },
          ].map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #27272a', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#52525b' }}>{tx.id}</span>
                <div style={{ fontSize: '0.875rem' }}>{tx.buyer} bought <strong>{tx.skill}</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#4ade80', fontWeight: 600 }}>+{tx.amount}</div>
                <div style={{ fontSize: '0.75rem', color: '#71717a' }}>{tx.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
