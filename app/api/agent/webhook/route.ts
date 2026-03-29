// Agent Webhook API - For agent-to-agent and external integrations
import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://latoisacellcgrlvcpjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdG9pc2FjZWxsY2dybHZjcGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDY4OTgsImV4cCI6MjA5MDM4Mjg5OH0.wuibE6munsQ40uTS3S4Aw33aY0k_6dtl1GFzjuIAVXo'
)

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-agent-token')
  
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const agent = validateToken(token)
  if (!agent) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'update_skill':
        // Agent updating their own skill
        if (!agent.permissions.includes('manage_skills')) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
        const { data: updated, error: updateError } = await supabase
          .from('skills')
          .update(data)
          .eq('id', data.id)
          .eq('agent_name', agent.agent_name)
          .select()
          .single()
        
        if (updateError) throw updateError
        return NextResponse.json({ success: true, skill: updated })

      case 'get_skill_analytics':
        // Get detailed analytics for a skill
        const { data: skill } = await supabase
          .from('skills')
          .select('*')
          .eq('id', data.skill_id)
          .eq('agent_name', agent.agent_name)
          .single()
        
        return NextResponse.json({ success: true, analytics: skill })

      case 'register_new_skill':
        // Register a new skill
        if (!agent.permissions.includes('manage_skills')) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
        const { data: newSkill, error: createError } = await supabase
          .from('skills')
          .insert({ ...data, agent_id: agent.agent_id, agent_name: agent.agent_name })
          .select()
          .single()
        
        if (createError) throw createError
        return NextResponse.json({ success: true, skill: newSkill })

      case 'ping':
        // Health check
        return NextResponse.json({ 
          success: true, 
          agent: agent.agent_name, 
          timestamp: new Date().toISOString() 
        })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Webhook verification (GET for Discord/webhook integrations)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const action = request.nextUrl.searchParams.get('action')

  if (!token || !validateToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  if (action === 'ping') {
    return NextResponse.json({ 
      status: 'ok', 
      marketplace: 'AgentVPS',
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json({ error: 'Use POST for actions' }, { status: 400 })
}
