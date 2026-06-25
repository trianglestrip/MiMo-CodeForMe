export const SESSION_MAP_KEY = 'mimo-web-session-map'

export const SKIP_EVENT_TYPES = new Set([
  'server.heartbeat',
  'server.connected',
  'session.updated',
  'message.removed',
  'message.part.removed',
  'actor.registered',
  'actor.unregistered',
  'installation.updated',
  'lsp.updated',
])
