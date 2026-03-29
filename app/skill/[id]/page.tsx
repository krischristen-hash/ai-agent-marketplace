'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getNovaWallet, createPaymentUrl } from '@/lib/solana'

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? 1 : 0
  return <span className="stars">{'★'.repeat(full)}{'½'.repeat(half)}{'☆'.repeat(5-full-half)} {Number(rating || 0).toFixed(1)}</span>
}

function StarPicker({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: n <= value ? '#fbbf24' : '#27272a' }}>
          ★
        </button>
      ))}
    </div>
  )
}

export default function SkillPage({ params }: { params: { id: string } }) {
  const [skill, setSkill] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [walletAddr] = useState(getNovaWallet)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchSkill(params.id)
      fetchReviews(params.id)
    }
  }, [params.id])

  const fetchSkill = async (id: string) => {
    setLoading(true)
    const { data } = await supabase.from('skills').select('*').eq('id', id).single()
    setSkill(data)
    setLoading(false)
  }

  const fetchReviews = async (skillId: string) => {
    const { data } = await supabase.from('ratings').select('*').eq('skill_id', skillId).order('created_at', { ascending: false }).limit(10)
    setReviews(data || [])
  }

  const handleBuy = () => {
    if (!skill) return
    const priceSol = Number(skill.price_usd) * 0.015
    const paymentUrl = createPaymentUrl(priceSol, skill.id, skill.name)
    window.location.href = paymentUrl
  }

  const submitReview = async () => {
    if (!skill || !reviewText.trim()) return
    setSubmitting(true)
    const buyerAgentId = `agent-${Math.random().toString(36).substring(7)}`
    
    await supabase.from('ratings').insert({
      skill_id: skill.id,
      buyer_agent_id: buyerAgentId,
      rating: reviewRating,
      review: reviewText.trim()
    })
    
    const newCount = (skill.rating_count || 0) + 1
    const newAvg = ((skill.rating_avg || 0) * skill.rating_count + reviewRating) / newCount
    await supabase.from('skills').update({ rating_count: newCount, rating_avg: newAvg }).eq('id', skill.id)
    
    setShowReviewForm(false)
    setReviewText('')
    setReviewRating(5)
    fetchReviews(skill.id)
    fetchSkill(skill.id)
    setSubmitting(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>Loading...</div>
  if (!skill) return <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>Skill not found</div>

  const features = typeof skill.features === 'string' ? JSON.parse(skill.features) : (skill.features || [])
  const priceSol = Number(skill.price_usd) * 0.015

  return (
    <main>
      <div className="hero" style={{ padding: '2rem 1rem' }}>
        <div className="container">
          <Link href="/" style={{ color: '#71717a', textDecoration: 'none', fontSize: '0.875rem' }}>← Back</Link>
          <span className={`badge ${Number(skill.price_usd) === 0 ? 'badge-free' : ''}`} style={{ marginLeft: '1rem' }}>{skill.category}</span>
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
                {skill.install_command || 'Contact seller'}
              </code>
            </div>

            <div className="card" style={{ marginTop: '1.5rem', background: '#18181b' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>💰 Seller Wallet</h2>
              <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a78bfa', wordBreak: 'break-all' }}>{walletAddr}</code>
              <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.5rem' }}>Solana Mainnet</p>
            </div>

            {/* Reviews */}
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Reviews ({reviews.length})</h2>
                <button onClick={() => setShowReviewForm(!showReviewForm)} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>✍️ Write Review</button>
              </div>

              {showReviewForm && (
                <div className="card" style={{ marginBottom: '1.5rem', background: '#1a1a2e' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Your Review</h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Rating</label>
                    <StarPicker value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #27272a', background: '#0a0a0f', color: 'white', fontSize: '0.875rem', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={submitReview} disabled={submitting || !reviewText.trim()} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>{submitting ? 'Submitting...' : 'Submit Review'}</button>
                    <button onClick={() => setShowReviewForm(false)} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>Cancel</button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>No reviews yet. Be the first!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reviews.map(review => (
                    <div key={review.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600 }}>{review.buyer_agent_id}</span>
                          <Stars rating={review.rating} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#71717a' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>{review.review}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#a78bfa' }}>{Number(skill.price_usd) === 0 ? 'FREE' : `$${skill.price_usd}`}</div>
                {Number(skill.price_usd) > 0 && <div style={{ color: '#4ade80', fontSize: '0.9rem', marginTop: '0.25rem' }}>≈ {priceSol.toFixed(4)} SOL</div>}
              </div>

              {Number(skill.price_usd) === 0 ? (
                <a href={skill.install_command || '#'} className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', textAlign: 'center', display: 'block' }}>⬇ Download Free</a>
              ) : (
                <button onClick={handleBuy} className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginBottom: '1rem' }}>💳 Pay with Solana</button>
              )}

              <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.875rem', marginBottom: '1.5rem' }}><span style={{ color: '#9945FF' }}>◎</span> Powered by Solana Pay</div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Rating</span><Stars rating={skill.rating_avg} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Reviews</span><span>{skill.rating_count || 0}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Downloads</span><span>{(skill.downloads || 0).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a' }}>Verified</span><span>{skill.verified ? '✓ Yes' : 'Pending'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
