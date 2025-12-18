import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL || 'testmodel-smoke@twofeetup.local'
const password = process.env.E2E_PASSWORD || 'testmodel-smoke-12345678'
const agentCardTitle = process.env.E2E_AGENT_NAME || 'Test Model'
const prompt =
  process.env.E2E_PROMPT ||
  'Please call the add tool with a=2 and b=2, then respond with the result.'

test('tool calls persist after refresh', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('E-mailadres').fill(email)
  await page.getByLabel('Wachtwoord').fill(password)
  await page.getByRole('button', { name: 'Inloggen' }).click()

  await expect(page.getByText('Kies je tool')).toBeVisible()

  await page.getByText(agentCardTitle, { exact: true }).click()

  await page.getByRole('button', { name: 'Start Nieuwe Chat' }).click()

  const assistantLabel = page.getByText(`${agentCardTitle} AI Assistent`, { exact: true })
  await expect(assistantLabel).toBeVisible()
  const sessionHeading = assistantLabel.locator('..').getByRole('heading', { level: 3 })
  const sessionName = (await sessionHeading.textContent())?.trim()
  if (!sessionName) {
    throw new Error('Expected a chat session name in the header, got empty text')
  }

  const input = page.getByPlaceholder('Type a message or drop a file...')
  await input.fill(prompt)
  await input.press('Enter')

  await expect(page.getByRole('button', { name: /add.*show details/i })).toBeVisible()

  await page.reload()

  await expect(page.getByText('Kies je tool')).toBeVisible()
  await page.getByText(agentCardTitle, { exact: true }).click()

  await expect(page.getByText('Selecteer een chat of start een nieuwe')).toBeVisible()
  await page.locator('div.group').filter({ hasText: sessionName }).first().click()
  await expect(page.getByRole('heading', { level: 3, name: sessionName })).toBeVisible()

  await expect(page.getByRole('button', { name: /add.*show details/i })).toBeVisible()
})
