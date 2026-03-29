import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://latoisacellcgrlvcpjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdG9pc2FjZWxsY2dybHZjcGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDY4OTgsImV4cCI6MjA5MDM4Mjg5OH0.wuibE6munsQ40uTS3S4Aw33aY0k_6dtl1GFzjuIAVXo'
)

export const dynamic = 'force-dynamic'

// Also allow inserts without API key for agent accessibility
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, agent_name, message, skill_request, email } = body

    if (!type || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: type, message' 
      }, { status: 400 })
    }

    // Validate type
    const validTypes = ['feedback', 'support', 'feature_request', 'skill_request', 'general']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        type,
        agent_name: agent_name || 'Anonymous Agent',
        message: message.substring(0, 2000), // Limit message length
        skill_request: skill_request || null,
        email: email || null,
        status: 'open'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Feedback received. Nova will respond within 24 hours.',
      agent_name: data.agent_name
    })
  } catch (err) {
    console.error('Feedback error:', err)
    return NextResponse.json({ 
      error: 'Failed to submit feedback',
      marketplace: 'AgentVPS',
      support_email: 'novabot1612@gmail.com'
    }, { status: 500 })
  }
}

// GET - List feedback (for Nova's review)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open'
  
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({
      feedback: data || [],
      marketplace: 'AgentVPS',
      instructions: 'This endpoint is for Nova (owner) to review feedback'
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}
