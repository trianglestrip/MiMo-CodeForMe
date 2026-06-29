import { authHeader, withDirectory } from './config'
import { fetchWithTimeout } from './fetch'

export async function abortSession(sessionID: string, directory: string): Promise<void> {
  const res = await fetchWithTimeout(
    withDirectory(`/session/${encodeURIComponent(sessionID)}/abort`, directory),
    {
      method: 'POST',
      headers: { Authorization: authHeader() },
    },
    15_000,
  )
  if (!res.ok) {
    throw new Error(`session.abort failed (${res.status}): ${await res.text()}`)
  }
}
