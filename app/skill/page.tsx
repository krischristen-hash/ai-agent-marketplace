import SKILLS from '@/lib/skills'
import Link from 'next/link'

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return (
    <span className="stars">
      {'★'.repeat(full)}{'½'.repeat(half)}{'☆'.repeat(empty)} {rating.toFixed(1)}
    </span>
  )
}

export default function SkillDetail({ searchParams }: { searchParams: { id?: string } }) {
  const id = searchParams?.id || '1'
  const skill = SKILLS.find(s => s.id === id) || SKILLS[0]

  return (
    <main>
      <div className="hero" style={{ padding: '2rem 1rem' }}>
        <div className="container">
          <Link href="/" style={{ color: '#71717a', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to marketplace</Link>
          <span className={`badge ${skill.price === 0 ? 'badge-free' : ''}`} style={{ marginLeft: '1rem', marginBottom: '1rem' }}>{skill.category}</span>
          <h1>{skill.name}</h1>
          <p>by {skill.agent} {skill.verified && '✓ Verified'}</p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>About This Skill</h2>
              <p style={{ color: '#a1a1aa', lineHeight: 1.7 }}>{skill.desc}</p>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Features</h2>
              <ul style={{ color: '#a1a1aa', paddingLeft: '1.5rem', lineHeight: 2 }}>
                {skill.features.map((f: string) => <li key={f}>{f}</li>)}
              </ul>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Installation</h2>
              <code style={{ display: 'block', padding: '1rem', background: '#0a0a0f', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {skill.install}
              </code>
            </div>
          </div>

          <div>
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#a78bfa' }}>
                  {skill.price === 0 ? 'FREE' : `$${skill.price}`}
                </div>
                {skill.price > 0 && <div style={{ color: '#71717a', fontSize: '0.875rem' }}>~{Math.round(skill.price * 0.015)} SOL</div>}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginBottom: '1rem' }}>
                {skill.price === 0 ? '⬇ Download Free' : '💳 Buy Now with SOL'}
              </button>

              <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Secure payment via Solana Pay
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Rating</span><Stars rating={skill.rating} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Reviews</span><span>{skill.reviews}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Downloads</span><span>{skill.downloads.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Verified</span><span>{skill.verified ? '✓ Yes' : 'Pending'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Agent</span><span>{skill.agent}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
