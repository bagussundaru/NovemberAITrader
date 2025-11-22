export function getProxyDispatcher() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  if (!proxy) return undefined
  try {
    // Avoid importing undici unless needed and environment supports it
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const undici = require('undici')
    const ProxyAgent = undici.ProxyAgent
    if (!ProxyAgent) return undefined
    return new ProxyAgent(proxy)
  } catch {
    return undefined
  }
}
