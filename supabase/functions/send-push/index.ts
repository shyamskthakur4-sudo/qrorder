import { createClient } from 'jsr:@supabase/supabase-js@2';
import webPush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY =
  Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BI1WU_gSiMY-lQxUKj4O3pfRiG_9RZ1M3gI1Mkv3y2uvq5A4Bi9h2zboCVmWVSdS-V4NJLjD2OibZRRRJn5t3W4';
const VAPID_PRIVATE_KEY =
  Deno.env.get('VAPID_PRIVATE_KEY') || 'zx0Xe3Z44TlPC5gV54cLDUVNXTDW40XTcCQVUzJn-nM';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@cafeos.app';

webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const {
      business_id,
      branch_id,
      customer_id,
      session_id,
      order_id,
      campaign_id,
      notification_type = 'ORDER_STATUS',
      notification,
    } = body;

    if (!business_id || !notification || !notification.title) {
      return new Response(
        JSON.stringify({ error: 'Missing business_id or notification content' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. If order_id is present but customer_id is missing, look up customer_id from order
    if (order_id && !customer_id) {
      try {
        const { data: ord } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('id', order_id)
          .maybeSingle();
        if (ord?.customer_id) {
          customer_id = ord.customer_id;
        }
      } catch {}
    }

    // 2. Fetch active push subscriptions for this tenant / diner / order
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('business_id', business_id)
      .eq('is_active', true);

    const conditions: string[] = [];
    if (order_id) conditions.push(`order_id.eq.${order_id}`);
    if (customer_id) conditions.push(`customer_id.eq.${customer_id}`);
    if (session_id) conditions.push(`session_id.eq.${session_id}`);

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    let { data: subscriptions, error: subError } = await query;
    if (subError) {
      throw subError;
    }

    // If it's a TEST notification and no specific target matched, fallback to the latest active subscription for the business
    if (notification_type === 'TEST' && (!subscriptions || subscriptions.length === 0)) {
      const { data: fallbackSubs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('business_id', business_id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (fallbackSubs && fallbackSubs.length > 0) {
        subscriptions = fallbackSubs;
      }
    }

    const payloadString = JSON.stringify({
      title: notification.title,
      body: notification.body || '',
      icon: notification.icon || '/favicon.svg',
      badge: notification.badge || '/favicon.svg',
      image: notification.image,
      tag: notification.tag || `cafeos_${Date.now()}`,
      url: notification.url || '/',
      orderId: order_id || notification.orderId,
      timestamp: Date.now(),
      vibrate: [250, 100, 250, 100, 250],
    });

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ endpoint: string; error: string; statusCode?: number }> = [];
    const expiredSubIds: string[] = [];
    const seenEndpoints = new Set<string>();

    for (const sub of (subscriptions || [])) {
      // Duplicate prevention per batch
      if (seenEndpoints.has(sub.endpoint)) continue;
      seenEndpoints.add(sub.endpoint);

      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      let sent = false;
      let lastErr: any = null;

      // Retry mechanism (up to 2 attempts with backoff)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await webPush.sendNotification(pushConfig, payloadString, {
            TTL: 3600,
            urgency: 'high',
          });
          sent = true;
          break;
        } catch (err: any) {
          lastErr = err;
          // HTTP 404 or 410 indicates endpoint expired / unsubscribed by user
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredSubIds.push(sub.id);
            break;
          }
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      }

      if (sent) {
        successCount++;
      } else {
        failureCount++;
        errors.push({
          endpoint: sub.endpoint.substring(0, 40) + '...',
          error: lastErr?.message || 'Delivery failed',
          statusCode: lastErr?.statusCode,
        });
      }
    }

    // 2. Automatically clean up expired or unsubscribed endpoints
    if (expiredSubIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', expiredSubIds);
    }

    // 3. Log delivery metrics for restaurant dashboard
    const logStatus = failureCount === 0 ? 'SENT' : (successCount > 0 ? 'PARTIAL' : 'FAILED');
    await supabase.from('push_notification_logs').insert({
      business_id,
      campaign_id: campaign_id || null,
      order_id: order_id || null,
      notification_type,
      title: notification.title,
      body: notification.body || '',
      recipient_count: (subscriptions || []).length,
      success_count: successCount,
      failure_count: failureCount,
      status: logStatus,
      error_details: errors,
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipient_count: (subscriptions || []).length,
        success_count: successCount,
        failure_count: failureCount,
        cleaned_expired_count: expiredSubIds.length,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal push service error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
