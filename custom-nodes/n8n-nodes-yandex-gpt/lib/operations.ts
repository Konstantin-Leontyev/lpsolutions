import { ApplicationError, sleep } from 'n8n-workflow';

import { parseJsonResponse } from './jsonParse';
import { OPERATIONS_URL, POLL_INTERVAL_MS } from './yandexConstants';

export async function waitForOperation(
	apiKey: string,
	operationId: string,
	timeoutMs: number,
): Promise<Record<string, unknown>> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const pollRes = await fetch(`${OPERATIONS_URL}/operations/${operationId}`, {
			headers: { Authorization: `Api-Key ${apiKey}` },
		});
		if (!pollRes.ok) {
			await sleep(POLL_INTERVAL_MS);
			continue;
		}
		const poll = await parseJsonResponse(pollRes);
		const err = poll.error as { message?: string } | undefined;
		if (err?.message) {
			throw new ApplicationError(`Operation failed: ${err.message}`);
		}
		if (poll.done === true) {
			return poll;
		}
		await sleep(POLL_INTERVAL_MS);
	}
	throw new ApplicationError(`Operation timed out after ${Math.round(timeoutMs / 1000)}s`);
}
