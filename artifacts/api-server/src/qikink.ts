import axios from "axios";
import { logger } from "./lib/logger";

const QIKINK_API_URL = "https://sandbox.qikink.com/api";

interface QikinkTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

/**
 * Get an active access token from Qikink Sandbox API.
 * Uses caching to prevent requesting a new token for every call.
 */
async function getQikinkToken(): Promise<string> {
  const clientId = process.env.QIKINK_CLIENT_ID;
  const clientSecret = process.env.QIKINK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Qikink API credentials in environment variables.");
  }

  // Check if we have a valid cached token (buffer of 60 seconds)
  const now = Date.now();
  if (cachedToken && tokenExpiryTime && now < tokenExpiryTime - 60000) {
    return cachedToken;
  }

  try {
    const response = await axios.post<QikinkTokenResponse>(`${QIKINK_API_URL}/token`, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials"
    });

    cachedToken = response.data.access_token;
    // expires_in is usually in seconds
    tokenExpiryTime = now + response.data.expires_in * 1000;

    return cachedToken;
  } catch (error: any) {
    logger.error({ error: error.response?.data || error.message }, "Failed to authenticate with Qikink API");
    throw new Error("Failed to authenticate with Qikink API");
  }
}

/**
 * Fetch all designed products from Qikink.
 */
export async function getMyProducts() {
  try {
    const token = await getQikinkToken();

    const response = await axios.get(`${QIKINK_API_URL}/products`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    logger.error({ error: error.response?.data || error.message }, "Failed to fetch products from Qikink");
    throw new Error("Failed to fetch products from Qikink");
  }
}
