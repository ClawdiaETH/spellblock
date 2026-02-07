import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data } = body

    console.log('Farcaster webhook event:', event, data)

    switch (event) {
      case 'miniapp_added':
        // User added the mini app - store their notification token
        // data.fid - user's Farcaster ID
        // data.notificationToken - token for sending push notifications
        // data.notificationUrl - URL to POST notifications to
        console.log(`User ${data.fid} added mini app with token ${data.notificationToken}`)
        
        // TODO: Store notification token in database
        // await storeNotificationToken(data.fid, data.notificationToken, data.notificationUrl)
        break

      case 'miniapp_removed':
        // User removed the app - invalidate their tokens
        console.log(`User ${data.fid} removed mini app`)
        
        // TODO: Remove notification tokens from database
        // await removeNotificationTokens(data.fid)
        break

      case 'notifications_enabled':
        // User re-enabled notifications - store new token
        console.log(`User ${data.fid} enabled notifications with token ${data.notificationToken}`)
        
        // TODO: Store notification token in database
        // await storeNotificationToken(data.fid, data.notificationToken, data.notificationUrl)
        break

      case 'notifications_disabled':
        // User disabled notifications - invalidate tokens
        console.log(`User ${data.fid} disabled notifications`)
        
        // TODO: Invalidate notification tokens in database
        // await invalidateNotificationTokens(data.fid)
        break

      default:
        console.log('Unknown webhook event:', event)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}