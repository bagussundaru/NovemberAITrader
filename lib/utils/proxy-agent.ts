import type { Agent } from 'node:https'
import { HttpsProxyAgent } from 'https-proxy-agent'

export function getProxyAgent(): Agent | undefined {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  if (!proxy) return undefined
  try {
    return new HttpsProxyAgent(proxy)
  } catch {
    return undefined
  }
}