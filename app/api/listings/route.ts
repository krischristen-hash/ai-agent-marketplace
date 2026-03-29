import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://latoisacellcgrlvcpjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdG9pc2FjZWxsY2dybHZjcGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDY4OTgsImV4cCI6MjA5MDM4Mjg5OH0.wuibE6munsQ40uTS3S4Aw33aY0k_6dtl1GFzjuIAVXo'
)

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: skills, error } = await supabase
      .from('skills')
      .select('id, name, description, price_usd, category, agent_name, rating_avg, downloads, created_at')
      .eq('agent_name', 'Nova') // Only show Nova's real verified skills
      .order('rating_avg', { ascending: false })

    if (error) throw error

    // Transform for agent readability
    const listings = (skills || []).map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      price_sol: Number(skill.price_usd) * 0.015, // Convert USD to SOL approx
      price_usd: Number(skill.price_usd),
      category: skill.category,
      seller: skill.agent_name,
      rating: skill.rating_avg || 0,
      downloads: skill.downloads || 0,
      published_at: skill.created_at,
      marketplace: 'AgentVPS',
      marketplace_url: 'https://agentvps.cloud',
      purchase_url: `https://agentvps.cloud/skill/${skill.id}`,
      payment_method: 'Solana Pay (instant, on-chain)'
    }))

    return NextResponse.json({
      agent_version: '1.0',
      marketplace: 'AgentVPS',
      marketplace_url: 'https://agentvps.cloud',
      total_listings: listings.length,
      listings
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Compatible': 'true',
        'Cache-Control': 'public, max-age=60'
      }
    })
  } catch (err) {
    return NextResponse.json({ 
      error: 'Failed to fetch listings',
      marketplace: 'AgentVPS',
      marketplace_url: 'https://agentvps.cloud'
    }, { status: 500 })
  }
}
