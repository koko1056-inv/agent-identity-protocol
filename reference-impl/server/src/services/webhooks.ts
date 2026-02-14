/**
 * WebHook notification service
 */

import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export type WebhookEvent =
  | 'agent.registered'
  | 'agent.updated'
  | 'agent.deleted'
  | 'agent.metrics_reported';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(event: WebhookEvent, data: any): Promise<void> {
  try {
    // Find active webhooks listening to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) {
      logger.debug('No webhooks registered for event', { event });
      return;
    }

    // Send webhooks in parallel (fire and forget)
    const promises = webhooks.map((webhook) => sendWebhook(webhook, event, data));
    
    // Don't wait for webhooks to complete
    Promise.allSettled(promises).then((results) => {
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      
      logger.info('Webhooks triggered', {
        event,
        total: webhooks.length,
        succeeded,
        failed,
      });
    });
  } catch (error: any) {
    logger.error('Failed to trigger webhooks', {
      event,
      error: error.message,
    });
  }
}

/**
 * Send a single webhook
 */
async function sendWebhook(
  webhook: { id: string; url: string; secret: string | null },
  event: WebhookEvent,
  data: any
): Promise<void> {
  try {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const body = JSON.stringify(payload);

    // Generate signature if secret is set
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AIP-Registry/0.3.1',
      'X-Webhook-Event': event,
    };

    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    // Send webhook with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Update last triggered timestamp
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { lastTriggeredAt: new Date() },
    });

    if (!response.ok) {
      logger.warn('Webhook failed', {
        webhookId: webhook.id,
        url: webhook.url,
        status: response.status,
      });
    } else {
      logger.debug('Webhook sent successfully', {
        webhookId: webhook.id,
        event,
      });
    }
  } catch (error: any) {
    logger.error('Webhook delivery failed', {
      webhookId: webhook.id,
      url: webhook.url,
      error: error.message,
    });
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}
