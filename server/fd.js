import "dotenv/config";
import { Composio } from "@composio/core";

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

const accountId = "ca_6VDweRmSMiLP";

try {
  const account = await composio.connectedAccounts.get(accountId);

  console.log("Connected account:", {
    id: account.id,
    status: account.status,
    toolkit: account.toolkit?.slug,
  });
} catch (error) {
  console.error("Account lookup failed:", error.message);
}
