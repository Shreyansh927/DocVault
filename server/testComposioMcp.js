import "dotenv/config"
import { composio } from "./utils/composioClient.js";

const ids = ["ca_J47rp6pVTO7Q", "ca_OvnPzDoFK7G", "ca_6VDweRmSMiLP"];

for (const id of ids) {
  try {
    const account = await composio.connectedAccounts.get(id);

    console.log({
      requestedId: id,
      returnedId: account.id,
      status: account.status,
      userId: account.userId,
      toolkit: account.toolkit?.slug,
    });
  } catch (error) {
    console.log({
      id,
      error: error.message,
    });
  }
}
