"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForOperation = waitForOperation;
const n8n_workflow_1 = require("n8n-workflow");
const jsonParse_1 = require("./jsonParse");
const yandexConstants_1 = require("./yandexConstants");
async function waitForOperation(apiKey, operationId, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const pollRes = await fetch(`${yandexConstants_1.OPERATIONS_URL}/operations/${operationId}`, {
            headers: { Authorization: `Api-Key ${apiKey}` },
        });
        if (!pollRes.ok) {
            await (0, n8n_workflow_1.sleep)(yandexConstants_1.POLL_INTERVAL_MS);
            continue;
        }
        const poll = await (0, jsonParse_1.parseJsonResponse)(pollRes);
        const err = poll.error;
        if (err === null || err === void 0 ? void 0 : err.message) {
            throw new n8n_workflow_1.ApplicationError(`Operation failed: ${err.message}`);
        }
        if (poll.done === true) {
            return poll;
        }
        await (0, n8n_workflow_1.sleep)(yandexConstants_1.POLL_INTERVAL_MS);
    }
    throw new n8n_workflow_1.ApplicationError(`Operation timed out after ${Math.round(timeoutMs / 1000)}s`);
}
//# sourceMappingURL=operations.js.map