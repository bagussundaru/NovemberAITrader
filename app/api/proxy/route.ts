import { NextResponse } from 'next/server'
import { getProxyDispatcher } from '../../../lib/utils/proxy-dispatcher'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, method = 'GET', headers = {}, data } = body
    if (!url) {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    }

    const dispatcher = getProxyDispatcher()
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      dispatcher
    })

    const contentType = res.headers.get('content-type') || ''
    const payload = contentType.includes('application/json') ? await res.json() : await res.text()
    return NextResponse.json({ success: true, status: res.status, data: payload })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
