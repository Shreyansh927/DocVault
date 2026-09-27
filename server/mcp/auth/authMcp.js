import jwt from "jsonwebtoken";
import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";

export async function verifyMcpAccessToken(token) {
  if (!token) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "Missing MCP token");
  }

  try {
    const decoded = jwt.verify(token, process.env.MCP_INTERNAL_SECRET);

    if (decoded.purpose !== "docvault-mcp") {
      throw new OAuthError(
        OAuthErrorCode.InvalidToken,
        "Invalid MCP token purpose",
      );
    }

    const userId = Number(decoded.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid MCP user ID");
    }

    return {
      token,
      clientId: String(userId),
      scopes: ["mcp"],
      expiresAt: decoded.exp,
    };
  } catch (error) {
    if (error instanceof OAuthError) {
      throw error;
    }

    console.error("[MCP AUTH] Token verification failed:", error.message);

    throw new OAuthError(
      OAuthErrorCode.InvalidToken,
      "Invalid MCP authentication",
    );
  }
}
