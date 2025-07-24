"use strict";
// src/utils/apiClient.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBehaviorFromHelius = fetchBehaviorFromHelius;
var axios_1 = __importDefault(require("axios"));
var walletConcentration_1 = require("../modules/walletConcentration");
var HELIUS_API_KEY = process.env.HELIUS_API_KEY;
var TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS;
/**
 * Fetch behavioral token transfer data from Helius using a known wallet address.
 */
function fetchBehaviorFromHelius(walletAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, transactions, walletTransfers, walletData, walletDepthTarget, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("📡 Fetching token behavior from Helius for wallet:", walletAddress);
                    if (!HELIUS_API_KEY || !TOKEN_ADDRESS) {
                        throw new Error("HELIUS_API_KEY or TEST_TOKEN_ADDRESS is missing from environment variables!");
                    }
                    url = "https://api.helius.xyz/v0/addresses/".concat(walletAddress, "/transactions?api-key=").concat(HELIUS_API_KEY, "&limit=100");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1.default.get(url)];
                case 2:
                    response = _a.sent();
                    transactions = response.data || [];
                    console.log("\uD83D\uDCCA Fetched ".concat(transactions.length, " raw transactions from Helius"));
                    walletTransfers = transactions.flatMap(function (tx) {
                        var _a, _b, _c, _d;
                        var transfers = ((_a = tx === null || tx === void 0 ? void 0 : tx.events) === null || _a === void 0 ? void 0 : _a.tokenTransfers) || [];
                        var fallbackTransfers = transfers.length > 0
                            ? []
                            : __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], (((_b = tx === null || tx === void 0 ? void 0 : tx.events) === null || _b === void 0 ? void 0 : _b.parsedInstructions) || []), true), ((tx === null || tx === void 0 ? void 0 : tx.parsedInstructions) || []), true), ((tx === null || tx === void 0 ? void 0 : tx.instructions) || []), true), (((_d = (_c = tx === null || tx === void 0 ? void 0 : tx.transaction) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.instructions) || []), true), ((tx === null || tx === void 0 ? void 0 : tx.nativeTransfers) || []), true).filter(function (inst) {
                                var _a, _b, _c, _d;
                                var programOk = (inst === null || inst === void 0 ? void 0 : inst.programId) === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" ||
                                    ((_b = (_a = inst === null || inst === void 0 ? void 0 : inst.parsed) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.mint) === TOKEN_ADDRESS;
                                var hasTransferFields = ((_d = (_c = inst === null || inst === void 0 ? void 0 : inst.parsed) === null || _c === void 0 ? void 0 : _c.info) === null || _d === void 0 ? void 0 : _d.amount) || (inst === null || inst === void 0 ? void 0 : inst.amount);
                                var isSOLTransfer = (inst === null || inst === void 0 ? void 0 : inst.fromUserAccount) && (inst === null || inst === void 0 ? void 0 : inst.toUserAccount);
                                return programOk || hasTransferFields || isSOLTransfer;
                            })
                                .map(function (inst) {
                                var _a, _b, _c, _d, _e, _f, _g, _h;
                                var source = ((_b = (_a = inst.parsed) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.source) ||
                                    inst.fromUserAccount ||
                                    ((_c = inst.accounts) === null || _c === void 0 ? void 0 : _c[0]);
                                var destination = ((_e = (_d = inst.parsed) === null || _d === void 0 ? void 0 : _d.info) === null || _e === void 0 ? void 0 : _e.destination) ||
                                    inst.toUserAccount ||
                                    ((_f = inst.accounts) === null || _f === void 0 ? void 0 : _f[1]);
                                var rawAmount = ((_h = (_g = inst.parsed) === null || _g === void 0 ? void 0 : _g.info) === null || _h === void 0 ? void 0 : _h.amount) || inst.amount || "0";
                                var parsedAmount = parseFloat(rawAmount);
                                if (!parsedAmount || parsedAmount === 0)
                                    return null;
                                return {
                                    fromUserAccount: source,
                                    toUserAccount: destination,
                                    amount: parsedAmount,
                                };
                            })
                                .filter(Boolean);
                        var combinedTransfers = transfers.length > 0 ? transfers : fallbackTransfers;
                        return combinedTransfers.map(function (t) {
                            var _a, _b, _c, _d;
                            if (!t)
                                return null;
                            return {
                                timestamp: tx.blockTime
                                    ? tx.blockTime * 1000
                                    : tx.timestamp
                                        ? new Date(tx.timestamp).getTime()
                                        : Date.now(),
                                from: t.fromUserAccount || t.source || ((_a = t.accountKeys) === null || _a === void 0 ? void 0 : _a[0]) || "unknown",
                                toUserAccount: t.toUserAccount || t.destination || ((_b = t.accountKeys) === null || _b === void 0 ? void 0 : _b[1]) || "unknown",
                                amount: parseFloat(t.amount || ((_d = (_c = t.parsed) === null || _c === void 0 ? void 0 : _c.info) === null || _d === void 0 ? void 0 : _d.amount) || "0"),
                                mint: TOKEN_ADDRESS,
                                priceChangePercent: 0,
                                totalBalance: 1000
                            };
                        }).filter(Boolean);
                    });
                    if (!walletTransfers.length) {
                        console.warn("⚠️ No valid transfers parsed from transactions.");
                        return [2 /*return*/, []];
                    }
                    walletData = walletTransfers.map(function (t) { return ({
                        walletAddress: t.from,
                        tokenAddress: t.mint,
                        amount: t.amount,
                        timestamp: t.timestamp,
                        priceChangePercent: t.priceChangePercent,
                        totalBalance: t.totalBalance,
                        type: t.amount > 0 ? "buy" : "sell",
                    }); });
                    walletDepthTarget = (0, walletConcentration_1.analyzeWalletConcentration)(walletTransfers);
                    console.log("\uD83E\uDDE0 Wallet Concentration Target: Top ".concat(walletDepthTarget, " wallets"));
                    console.log("\u2705 Parsed ".concat(walletData.length, " behavioral events from Helius."));
                    return [2 /*return*/, walletData];
                case 3:
                    error_1 = _a.sent();
                    console.error("\uD83D\uDEA8 Error fetching behavioral data from Helius for wallet ".concat(walletAddress, " at URL: ").concat(url), error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
