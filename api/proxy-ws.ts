// /api/proxy-ws.ts

// 不检查 ts 错误
// @ts-nocheck

interface ActiveFetch {
	controller: AbortController;
	requestBodyWriter: WritableStreamDefaultWriter<Uint8Array>;
}

// 这个函数现在是 Worker 的默认导出
export default async function handler(request: Request): Promise<Response> {
	const upgradeHeader = request.headers.get('Upgrade');
	if (upgradeHeader !== 'websocket') {
		return new Response('Expected Upgrade: websocket', { status: 426 });
	}

	const webSocketPair = new WebSocketPair();
	const [client, server] = Object.values(webSocketPair);

	server.accept();

	const activeFetches = new Map<string, ActiveFetch>();

	server.addEventListener('message', async (event) => {
		// --- 处理数据消息 (二进制) ---
		if (event.data instanceof ArrayBuffer) {
			const data = new Uint8Array(event.data);
			const reqIdLen = new DataView(data.buffer, 0, 4).getUint32(0);
			const reqId = new TextDecoder().decode(data.slice(4, 4 + reqIdLen));
			const chunk = data.slice(4 + reqIdLen);

			const fetchCtx = activeFetches.get(reqId);
			if (fetchCtx && chunk.length > 0) {
				try {
					await fetchCtx.requestBodyWriter.write(chunk);
				} catch (e) {
					console.error(`Error writing to request stream for ${reqId}:`, e);
					fetchCtx.controller.abort();
					activeFetches.delete(reqId);
				}
			}
			return;
		}

		// --- 处理控制消息 (JSON) ---
		if (typeof event.data === 'string') {
			try {
				const message = JSON.parse(event.data);
				const { type, reqId, details } = message;

				switch (type) {
					case 'request': {
						const { url, method, headers: clientHeaders, redirect } = details;
						const controller = new AbortController();

						const headers = new Headers(clientHeaders);

						headers.delete('host');
						for (const key of [...headers.keys()]) {
							if (key.toLowerCase().startsWith('x-vercel-') || key.toLowerCase().startsWith('x-forwarded-')) {
								headers.delete(key);
							}
						}
						headers.delete('x-real-ip');

						const requestBodyStream = new TransformStream();
						const requestBodyWriter = requestBodyStream.writable.getWriter();

						activeFetches.set(reqId, { controller, requestBodyWriter });

						const newRequest = new Request(url, {
							method,
							headers,
							body: (method === 'GET' || method === 'HEAD') ? undefined : requestBodyStream.readable,
							redirect: redirect || 'follow',
							signal: controller.signal,
						});

						fetch(newRequest).then(async (response) => {
							server.send(JSON.stringify({
								type: 'response',
								reqId,
								details: {
									status: response.status,
									statusText: response.statusText,
									headers: Object.fromEntries(response.headers.entries()),
								},
							}));

							if (response.body) {
								const reader = response.body.getReader();
								const reqIdBytes = new TextEncoder().encode(reqId);
								const reqIdLenBytes = new Uint8Array(4);
								new DataView(reqIdLenBytes.buffer).setUint32(0, reqIdBytes.length);

								while (true) {
									const { done, value } = await reader.read();
									if (done) break;

									const messageToSend = new Uint8Array(4 + reqIdBytes.length + value.length);
									messageToSend.set(reqIdLenBytes, 0);
									messageToSend.set(reqIdBytes, 4);
									messageToSend.set(value, 4 + reqIdBytes.length);
									server.send(messageToSend.buffer);
								}
							}

							server.send(JSON.stringify({ type: 'response-end', reqId }));
						}).catch(error => {
							server.send(JSON.stringify({ type: 'error', reqId, message: error.message }));
						}).finally(() => {
							activeFetches.delete(reqId);
						});
						break;
					}

					case 'request-end': {
						const fetchCtx = activeFetches.get(reqId);
						if (fetchCtx) {
							await fetchCtx.requestBodyWriter.close();
						}
						break;
					}

					case 'abort': {
						const fetchCtx = activeFetches.get(reqId);
						if (fetchCtx) {
							fetchCtx.controller.abort();
							activeFetches.delete(reqId);
						}
						break;
					}
				}
			} catch (e) {
				console.error('Error processing control message:', e);
			}
		}
	});

	server.addEventListener('close', () => {
		console.log('Client disconnected, aborting all active fetches.');
		activeFetches.forEach(({ controller }) => controller.abort());
		activeFetches.clear();
	});

	server.addEventListener('error', (err) => {
		console.error('WebSocket error:', err);
		activeFetches.forEach(({ controller }) => controller.abort());
		activeFetches.clear();
	});

	return new Response(null, {
		status: 101,
		webSocket: client,
	});
}
