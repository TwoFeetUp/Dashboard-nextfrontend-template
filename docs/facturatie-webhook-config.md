# Facturatie Webhook Configuration

This document explains how to configure the Make.com webhook URL for the facturatie (invoice) system.

## Overview

The facturatie system sends invoice data to Make.com via webhooks. The URL is configured through environment variables.

## Configuration Variables

### Required
- `MAKE_WEBHOOK_URL`: The URL where invoice data will be sent via POST request

### Optional
- `MAKE_WEBHOOK_SECRET`: A secret token for authentication (sent as Bearer token in Authorization header)

## Setup Instructions

1. Create a webhook scenario in Make.com
2. Copy the webhook URL provided by Make.com
3. Add the URL to your `.env.local` file:
   ```
   MAKE_WEBHOOK_URL=https://hook.eu1.make.com/your-actual-webhook-url
   ```

4. If your Make.com scenario requires authentication, uncomment and set the secret:
   ```
   MAKE_WEBHOOK_SECRET=your-secret-token
   ```

## How It Works

When invoices are sent from the Facturatie Tool:
1. The system checks for the `MAKE_WEBHOOK_URL` environment variable
2. If not set, it returns an error: "MAKE_WEBHOOK_URL is niet ingesteld"
3. If set, it sends a POST request with invoice data to the URL
4. The request includes an Authorization header if `MAKE_WEBHOOK_SECRET` is set

## Example Webhook Payload

The payload sent to Make.com contains:
- `cycle_key`: The billing cycle identifier
- `issued_at`: Invoice issue date
- `due_at`: Invoice due date
- `member_count`: Number of members being invoiced
- `notes`: Optional notes
- `members`: Array of member data including:
  - Customer information (name, address, email, etc.)
  - Membership details (type, year, display name)
  - Invoice metadata (dates, reference, notes)
  - Invoice lines with description and amounts
  - Tax information
  - Totals (currency, subtotal, VAT, grand total)

## Testing

To test the webhook integration:
1. Ensure `MAKE_WEBHOOK_URL` is properly set in `.env.local`
2. Use the Facturatie Tool in the application to send invoices
3. Check the Make.com scenario execution history for successful triggers
