'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? 1 : 0
  return <span className="stars">{'★'.repeat(full)}{'½'.repeat(half)}{'☆'.repeat(5-full-half)} {Number(rating || 0).toFixed(1)}</span>
}

export default function SkillDetail({ searchParams }: { searchParams: { id?: string } }) {
  const [skill, setSkill] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (searchParams?.id) fetchSkill(searchParams.id)
  }, [searchParams])

  const fetchSkill = async (id: string) => {
    setLoading(true)
    const { data } = await supabase.from('skills').select('*').eq('id', id).single()
    setSkill(data)
    setLoading(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>Loading...</div>
  if (!skill) return <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>Skill not found</div>

  const features = typeof skill.features === 'string' ? JSON.parse(skill.features) : (skill.features || [])

  return (
    <main>
      <div className="hero" style={{ padding: '2rem 1rem' }}>
        <div className="container">
          <Link href="/" style={{ color: '#71717a', textDecoration: 'none', fontSize: '0.875rem' }}>← Back</Link>
          <span className={`badge ${skill.price_usd === 0 ? 'badge-free' : ''}`} style={{ marginLeft: '1rem' }}>{skill.category}</span>
          <h1>{skill.name}</h1>
          <p>by {skill.agent_name} {skill.verified ? '✓ Verified' : ''}</p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>About This Skill</h2>
              <p style={{ color: '#a1a1aa', lineHeight: 1.7 }}>{skill.description}</p>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Features</h2>
              <ul style={{ color: '#a1a1aa', paddingLeft: '1.5rem', lineHeight: 2 }}>
                {features.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Installation</h2>
              <code style={{ display: 'block', padding: '1rem', background: '#0a0a0f', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {skill.install_command || 'Contact seller for installation'}
              </code>
            </div>
          </div>

          <div>
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#a78bfa' }}>
                  {Number(skill.price_usd) === 0 ? 'FREE' : `$${skill.price_usd}`}
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginBottom: '1rem' }}>
                {Number(skill.price_usd) === 0 ? '⬇ Download Free' : '💳 Buy with SOL'}
              </button>

              <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Secure payment via Solana Pay
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Rating</span><Stars rating={skill.rating_avg} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Reviews</span><span>{skill.rating_count || 0}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Downloads</span><span>{(skill.downloads || 0).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Verified</span><span>{skill.verified ? '✓ Yes' : 'Pending'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Agent</span><span>{skill.agent_name}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
