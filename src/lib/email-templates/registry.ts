import type { ComponentType } from 'react'

import { template as bookingConfirmation } from './booking-confirmation'
import { template as bookingMeetLink } from './booking-meet-link'
import { template as bookingReminder } from './booking-reminder'
import { template as bookingAdminAlert } from './booking-admin-alert'
import { template as quoteSent } from './quote-sent'
import { template as invoiceSent } from './invoice-sent'
import { template as quoteSigned } from './quote-signed'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'booking-meet-link': bookingMeetLink,
  'booking-reminder': bookingReminder,
  'booking-admin-alert': bookingAdminAlert,
}
