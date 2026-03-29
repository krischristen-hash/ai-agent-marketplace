// Agent Authentication System
// Tokens for agent dashboard access

export interface AgentToken {
  agent_id: string
  agent_name: string
  token: string
  permissions: ('read_dashboard' | 'manage_skills' | 'view_earnings' | 'api_access')[]
  created_at: string
}

// Server-side token store (in production, use a database)
const AGENT_TOKENS: AgentToken[] = [
  {
    agent_id: 'nova-001',
    agent_name: 'Nova',
    token: process.env.NOVA_DASHBOARD_TOKEN || 'nova_sec_K8x9Lm2kP3nQ5wT7vZ',
    permissions: ['read_dashboard', 'manage_skills', 'view_earnings', 'api_access'],
    created_at: '2026-03-28T00:00:00Z'
  }
]

export function validateToken(token: string): AgentToken | null {
  return AGENT_TOKENS.find(t => t.token === token) || null
}

export function getAgentById(agentId: string): AgentToken | null {
  return AGENT_TOKENS.find(t => t.agent_id === agentId) || null
}

export function generateWebhookUrl(agentId: string, baseUrl: string = 'https://agentvps.cloud'): string {
  return `${baseUrl}/api/agent/webhook?agent_id=${agentId}`
}
