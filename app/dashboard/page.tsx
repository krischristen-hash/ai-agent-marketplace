'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchMySkills() }, [])

  const fetchMySkills = async () => {
    const { data } = await supabase.from('skills').select('*').eq('agent_name', 'Nova').order('created_at', { ascending: false })
    setSkills(data || [])
    setLoading(false)
  }

  const totalEarnings = skills.reduce((sum, s) => sum + (s.downloads || 0) * s.price_usd * 0.01, 0)
  const totalDownloads = skills.reduce((sum, s) => sum + (s.downloads || 0), 0)

  return (
    <main>
      <div className="hero" style={{ padding: '2rem 1rem' }}>
        <div className="container">
          <h1>📊 Nova&apos;s Dashboard</h1>
          <p>Your skills, earnings, and agent performance.</p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Wallet */}
        <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '0.25rem' }}>Nova&apos;s Agent Wallet</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#a78bfa' }}>75Pxyr1sbvBDwNqZgu4Kmk9HQthbCerKF3j2vhMFTqG3</div>
              <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.25rem' }}>Solana Mainnet</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '0.25rem' }}>Estimated Earnings</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>${totalEarnings.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: '#71717a' }}>from {skills.length} skills</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Downloads', value: totalDownloads.toLocaleString(), icon: '📥' },
            { label: 'Skills Listed', value: skills.length.toString(), icon: '📦' },
            { label: 'Avg Rating', value: skills.length > 0 ? (skills.reduce((sum, s) => sum + Number(s.rating_avg || 0), 0) / skills.length).toFixed(1) + ' ★' : 'N/A', icon: '⭐' },
            { label: 'Verified', value: skills.filter(s => s.verified).length + '/' + skills.length, icon: '✓' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>{stat.value}</div>
              <div style={{ fontSize: '0.875rem', color: '#71717a' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* My Skills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>My Skills (from Supabase)</h2>
          <Link href="/sell" className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>+ Add Skill</Link>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>Loading skills...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {skills.map(skill => (
              <div key={skill.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{skill.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#71717a' }}>
                    {(skill.downloads || 0).toLocaleString()} downloads · {Number(skill.rating_avg || 0).toFixed(1)}★ · {skill.category}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className={`badge ${skill.verified ? '' : ''}`} style={{ background: skill.verified ? '#052c16' : '#27272a', color: skill.verified ? '#4ade80' : '#71717a' }}>
                    {skill.verified ? 'Verified' : 'Pending'}
                  </span>
                  <span style={{ fontWeight: 600, color: Number(skill.price_usd) === 0 ? '#71717a' : '#4ade80' }}>
                    {Number(skill.price_usd) === 0 ? 'Free' : `$${skill.price_usd}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Supabase Status */}
        <div style={{ textAlign: 'center', padding: '2rem', background: '#18181b', borderRadius: '0.75rem', border: '1px solid #27272a' }}>
          <p style={{ color: '#4ade80', marginBottom: '0.5rem' }}>✓ Connected to Supabase</p>
          <p style={{ color: '#71717a', fontSize: '0.875rem' }}>Project: agent-marketplace (latoisacellcgrlvcpjz)</p>
        </div>
      </div>
    </main>
  )
}
