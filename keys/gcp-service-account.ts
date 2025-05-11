import { google } from "googleapis";
import { JWT } from "google-auth-library";
import fs from "fs";
import path from "path";

const SHEET_ID = "1wEP4oMTVw-_gW1wThjeqnreyNAo7J5rxbLstTAiQzhg";
const SHEET_RANGE = "training_wallets!A2:C";

const credentialsPath = path.join(__dirname, "./gcp-service-account.json");
const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));

const auth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

const fetchTrainingWallets = async (): Promise<{ wallet: string; token: string; notes: string }[]> => {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = res.data.values || [];
    return rows.map((row: (string | undefined)[]) => {
      const [wallet = "", token = "", notes = ""] = row;
      return {
        wallet: wallet.trim(),
        token: token.trim(),
        notes: notes.trim(),
      };
    });
  } catch (err) {
    console.error("❌ Failed to fetch training wallets:", err instanceof Error ? err.message : err);
    return [];
  }
};

export { fetchTrainingWallets };