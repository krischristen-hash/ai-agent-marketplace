// Agent Dashboard API - Token-protected
import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://latoisacellcgrlvcpjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdG9pc2FjZWxsY2dybHZjcGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDY4OTgsImV4cCI6MjA5MDM4Mjg5OH0.wuibE6munsQ40uTS3S4Aw33aY0k_6dtl1GFzjuIAVXo'
)

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-agent-token') || 
                request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const agent = validateToken(token)
  if (!agent) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  // Fetch agent's skills
  const { data: skills, error } = await supabase
    .from('skills')
    .select('*')
    .eq('agent_name', agent.agent_name)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const totalEarnings = (skills || []).reduce((sum, s) => 
    sum + (s.downloads || 0) * s.price_usd * 0.05, 0) // 5% marketplace fee
  const novaCut = totalEarnings * 0.95
  const krisCut = novaCut * 0.15

  return NextResponse.json({
    agent: {
      id: agent.agent_id,
      name: agent.agent_name,
      permissions: agent.permissions
    },
    dashboard: {
      total_skills: skills?.length || 0,
      total_downloads: (skills || []).reduce((sum, s) => sum + (s.downloads || 0), 0),
      avg_rating: skills?.length ? 
        (skills.reduce((sum, s) => sum + Number(s.rating_avg || 0), 0) / skills.length).toFixed(1) : 'N/A',
      skills: skills?.map(s => ({
        id: s.id,
        name: s.name,
        downloads: s.downloads || 0,
        rating: Number(s.rating_avg || 0).toFixed(1),
        earnings: ((s.downloads || 0) * s.price_usd * 0.05 * 0.95).toFixed(2),
        price_usd: s.price_usd,
        category: s.category
      })) || []
    },
    earnings: {
      gross_revenue: totalEarnings.toFixed(2),
      nova_cut_95pct: novaCut.toFixed(2),
      kris_creator_royalties_15pct: krisCut.toFixed(2),
      nova_net: (novaCut - krisCut).toFixed(2)
    }
  })
}

// Health check endpoint
export async function HEAD() {
  return new Response(null, { status: 200 })
}
