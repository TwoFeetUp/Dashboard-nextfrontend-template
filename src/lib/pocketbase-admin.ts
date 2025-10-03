import PocketBase, { ClientResponseError } from "pocketbase"

type SuperuserAuthResponse = {
  token?: string
  record?: any // PocketBase authStore expects flexible record type
}

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL?.trim()
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL?.trim()
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD?.trim()

if (!pbUrl) {
  throw new Error("NEXT_PUBLIC_POCKETBASE_URL is not configured")
}

let adminClient: PocketBase | null = null
let authPromise: Promise<PocketBase> | null = null

async function authenticateAsSuperuser(
  client: PocketBase,
  email: string,
  password: string,
): Promise<void> {
  const form = new URLSearchParams()
  form.set("identity", email)
  form.set("password", password)

  let data: SuperuserAuthResponse | null = null

  try {
    const response = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      cache: "no-store",
      body: form.toString(),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      throw new Error(
        errorBody ? `status ${response.status}: ${errorBody}` : `status ${response.status}`,
      )
    }

    data = (await response.json()) as SuperuserAuthResponse
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to authenticate via superuser endpoint (${message})`)
  }

  if (!data?.token || !data?.record) {
    throw new Error("Fallback PocketBase superuser login returned an unexpected response")
  }

  client.authStore.save(data.token, data.record)
}

async function authenticate(client: PocketBase): Promise<PocketBase> {
  const doAuth = async () => {
    try {
      if (!adminEmail || !adminPassword) {
        throw new Error("PocketBase admin credentials are missing")
      }

      if (client.authStore.isValid) {
        try {
          await client.admins.authRefresh()
          return client
        } catch (refreshError) {
          client.authStore.clear()
        }
      }

      try {
        await client.admins.authWithPassword(adminEmail, adminPassword)
        return client
      } catch (error) {
        client.authStore.clear()

        if (
          error instanceof ClientResponseError &&
          (error.status === 400 || error.status === 404)
        ) {
          await authenticateAsSuperuser(client, adminEmail, adminPassword)
          return client
        }

        throw error
      }
    } catch (error) {
      client.authStore.clear()
      throw error
    }
  }

  if (!authPromise) {
    authPromise = doAuth().finally(() => {
      authPromise = null
    })
  }

  return authPromise
}

export async function getAdminPocketBase(): Promise<PocketBase> {
  if (!adminClient) {
    adminClient = new PocketBase(pbUrl)
    adminClient.autoCancellation(false)
  }

  if (!adminClient.authStore.isValid || !adminClient.authStore.token) {
    await authenticate(adminClient)
  }

  return adminClient
}
