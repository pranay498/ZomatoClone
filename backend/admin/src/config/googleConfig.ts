import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const googleClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID     || "",
  process.env.GOOGLE_CLIENT_SECRET || "",
  "postmessage" // ✅ hardcode this — required for popup auth-code flow
);

export { googleClient };