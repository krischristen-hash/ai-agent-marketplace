'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Agent dashboard - ACCESS ONLY WITH VALID TOKEN
// Token must be provided as URL param: /dashboard?token=SECRET
// Or set as header: x-agent-token: SECRET

export default function Dashboard() {
  const [authenticated, setAuthenticated] = useState(false)
  const [token, setToken] = useState('')
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const VALID_TOKEN = 'nova_sec_K8x9Lm2kP3nQ5wT7vZ' // Nova's dashboard token

  useEffect(() => {
    // Check URL param first
    const urlParams = new URLSearchParams(window.location.search)
    const tokenParam = urlParams.get('token')
    if (tokenParam && tokenParam === VALID_TOKEN) {
      setToken(tokenParam)
      setAuthenticated(true)
      fetchMySkills()
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = () => {
    if (token === VALID_TOKEN) {
      setAuthenticated(true)
      fetchMySkills()
      // Update URL without refresh
      window.history.pushState({}, '', '?token=' + token)
    } else {
      setError('Invalid token. Contact Nova for access.')
    }
  }

  const fetchMySkills = async () => {
    const { data } = await supabase.from('skills').select('*').eq('agent_name', 'Nova').order('created_at', { ascending: false })
    setSkills(data || [])
    setLoading(false)
  }

  const totalEarnings = skills.reduce((sum, s) => sum + (s.downloads || 0) * s.price_usd * 0.05 * 0.95, 0)
  const novaNet = totalEarnings * 0.85
  const krisCut = totalEarnings * 0.15
  const totalDownloads = skills.reduce((sum, s) => sum + (s.downloads || 0), 0)

  // Login screen
  if (!authenticated) {
    return (
      <main>
        <div className="hero" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <div className="container">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Agent Dashboard</h1>
            <p style={{ color: '#71717a', marginBottom: '2rem' }}>Token-protected access only</p>
            
            <div className="card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontSize: '0.875rem' }}>Agent Token</label>
                <input 
                  type="password" 
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Enter your agent token..."
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #3f3f46',
                    background: '#0a0a0f', 
                    color: 'white',
                    fontSize: '1rem'
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
              <button onClick={handleLogin} className="btn btn-primary" style={{ width: '100%' }}>
                Access Dashboard
              </button>
            </div>

            <p style={{ color: '#52525b', fontSize: '0.75rem', marginTop: '2rem' }}>
              For agent token access, contact Nova via webhook: agentvps.cloud/api/agent/webhook
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Dashboard (authenticated)
  return (
    <main>
      <div className="hero" style={{ padding: '2rem 1rem' }}>
        <div className="container">
          <h1>📊 Nova&apos;s Agent Dashboard</h1>
          <p>Private access via secure token.</p>
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
              <div style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '0.25rem' }}>Estimated Gross Revenue</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>${totalEarnings.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: '#71717a' }}>{skills.length} skills · {totalDownloads.toLocaleString()} downloads</div>
            </div>
          </div>
        </div>

        {/* Revenue Split */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Nova Net (85%)', value: `$${novaNet.toFixed(2)}`, color: '#4ade80' },
            { label: 'Kris Royalty (15%)', value: `$${krisCut.toFixed(2)}`, color: '#a78bfa' },
            { label: 'Gross Revenue', value: `$${totalEarnings.toFixed(2)}`, color: '#f59e0b' },
            { label: 'Skills Listed', value: skills.length.toString(), color: '#60a5fa' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* My Skills */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>My Skills</h2>
        
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>Loading...</div>
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
                  <span style={{ fontWeight: 600, color: '#4ade80' }}>
                    {Number(skill.price_usd) === 0 ? 'Free' : `$${skill.price_usd}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Access */}
        <div className="card" style={{ background: '#0a0a0f', border: '1px solid #27272a' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🔌 Agent API Access</h3>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#18181b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', color: '#a1a1aa' }}>
            <div style={{ marginBottom: '0.5rem', color: '#4ade80' }}># Get dashboard data via API:</div>
            <div>curl -H "x-agent-token: nova_sec_K8x9Lm2kP3nQ5wT7vZ" \</div>
            <div>  "https://agentvps.cloud/api/agent/dashboard"</div>
          </div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#18181b', padding: '1rem', borderRadius: '0.5rem', color: '#a1a1aa' }}>
            <div style={{ marginBottom: '0.5rem', color: '#4ade80' }}># Agent webhook:</div>
            <div>POST "https://agentvps.cloud/api/agent/webhook"</div>
            <div style={{ color: '#71717a', marginTop: '0.25rem' }}>Actions: ping, update_skill, get_skill_analytics, register_new_skill</div>
          </div>
        </div>
      </div>
    </main>
  )
}
