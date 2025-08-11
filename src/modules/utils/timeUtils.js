"use strict";
// s./utils/timeUtils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTimestampToUTCDate = convertTimestampToUTCDate;
exports.getUTCHourFromTimestamp = getUTCHourFromTimestamp;
exports.bucketTimestampByHour = bucketTimestampByHour;
/**
 * Basic Time Utilities for HootBot M-I-N-D
 * Phase 1: Core Foundation Only
 */
function convertTimestampToUTCDate(timestamp) {
    return new Date(timestamp * 1000); // Assuming incoming timestamp is in seconds
}
function getUTCHourFromTimestamp(timestamp) {
    var date = convertTimestampToUTCDate(timestamp);
    return date.getUTCHours();
}
function bucketTimestampByHour(timestamp) {
    var hour = getUTCHourFromTimestamp(timestamp);
    return "".concat(hour, ":00 - ").concat(hour + 1, ":00 UTC");
}
