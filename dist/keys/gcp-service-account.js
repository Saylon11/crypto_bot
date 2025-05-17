"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrainingWallets = void 0;
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SHEET_ID = "1wEP4oMTVw-_gW1wThjeqnreyNAo7J5rxbLstTAiQzhg";
const SHEET_RANGE = "training_wallets!A2:C";
const credentialsPath = path_1.default.join(__dirname, "./gcp-service-account.json");
const credentials = JSON.parse(fs_1.default.readFileSync(credentialsPath, "utf-8"));
const auth = new google_auth_library_1.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = googleapis_1.google.sheets({ version: "v4", auth });
const fetchTrainingWallets = async () => {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: SHEET_RANGE,
        });
        const rows = res.data.values || [];
        return rows.map((row) => {
            const [wallet = "", token = "", notes = ""] = row;
            return {
                wallet: wallet.trim(),
                token: token.trim(),
                notes: notes.trim(),
            };
        });
    }
    catch (err) {
        console.error("❌ Failed to fetch training wallets:", err instanceof Error ? err.message : err);
        return [];
    }
};
exports.fetchTrainingWallets = fetchTrainingWallets;
//# sourceMappingURL=gcp-service-account.js.map