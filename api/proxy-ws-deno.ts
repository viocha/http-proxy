// @ts-nocheck

// 假设您有这个工具函数
import { genCorsHeaders } from "./_lib/util.js";

interface ActiveFetch {
	controller: AbortController;
	requestBodyWriter: WritableStreamDefaultWriter<Uint8Array>;
}

export default async function handler(request: Request): Promise<Response> {
	const upgradeHeader = request.headers.get("Upgrade");
	if (upgradeHeader !== "websocket") {
		return new Response("Expected Upgrade: websocket", { status: 426 });
	}

	// *** 关键修正 ***
	// 在升级 WebSocket 之前生成 CORS 头部。
	// 此时 'request' 对象仍然是有效的。
	const corsHeaders = genCorsHeaders({ request, allowMethods: "GET, OPTIONS" });

	// 现在，升级 WebSocket。这个调用会“消费”掉 request 对象。
	const { socket, response: upgradeResponse } = Deno.upgradeWebSocket(request);

	const activeFetches = new Map<string, ActiveFetch>();

	// 为 socket 绑定事件监听器的逻辑保持不变
	socket.addEventListener("message", async (event) => {
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
		if (typeof event.data === "string") {
			try {
				const message = JSON.parse(event.data);
				const { type, reqId, details } = message;

				switch (type) {
					case "request": {
						const { url, method, headers: clientHeaders, redirect } = details;
						const controller = new AbortController();

						const headers = new Headers(clientHeaders);

						headers.delete("host");
						for (const key of [...headers.keys()]) {
							if (
									key.toLowerCase().startsWith("x-vercel-") ||
									key.toLowerCase().startsWith("x-forwarded-")
							) {
								headers.delete(key);
							}
						}
						headers.delete("x-real-ip");

						const requestBodyStream = new TransformStream();
						const requestBodyWriter = requestBodyStream.writable.getWriter();

						activeFetches.set(reqId, { controller, requestBodyWriter });

						const newRequest = new Request(url, {
							method,
							headers,
							body: (method === "GET" || method === "HEAD")
									? undefined
									: requestBodyStream.readable,
							redirect: redirect || "follow",
							signal: controller.signal,
						});

						fetch(newRequest).then(async (fetchResponse) => {
							socket.send(JSON.stringify({
								type: "response",
								reqId,
								details: {
									status: fetchResponse.status,
									statusText: fetchResponse.statusText,
									headers: Object.fromEntries(fetchResponse.headers.entries()),
								},
							}));

							if (fetchResponse.body) {
								const reader = fetchResponse.body.getReader();
								const reqIdBytes = new TextEncoder().encode(reqId);
								const reqIdLenBytes = new Uint8Array(4);
								new DataView(reqIdLenBytes.buffer).setUint32(0, reqIdBytes.length);

								while (true) {
									const { done, value } = await reader.read();
									if (done) break;

									const messageToSend = new Uint8Array(
											4 + reqIdBytes.length + value.length,
									);
									messageToSend.set(reqIdLenBytes, 0);
									messageToSend.set(reqIdBytes, 4);
									messageToSend.set(value, 4 + reqIdBytes.length);
									socket.send(messageToSend.buffer);
								}
							}

							socket.send(JSON.stringify({ type: "response-end", reqId }));
						}).catch((error) => {
							socket.send(
									JSON.stringify({
										type: "error",
										reqId,
										message: error.message,
									}),
							);
						}).finally(() => {
							activeFetches.delete(reqId);
						});
						break;
					}

					case "request-end": {
						const fetchCtx = activeFetches.get(reqId);
						if (fetchCtx) {
							await fetchCtx.requestBodyWriter.close();
						}
						break;
					}

					case "abort": {
						const fetchCtx = activeFetches.get(reqId);
						if (fetchCtx) {
							fetchCtx.controller.abort();
							activeFetches.delete(reqId);
						}
						break;
					}
				}
			} catch (e) {
				console.error("Error processing control message:", e);
			}
		}
	});

	socket.addEventListener("close", () => {
		console.log("Client disconnected, aborting all active fetches.");
		activeFetches.forEach(({ controller }) => controller.abort());
		activeFetches.clear();
	});

	socket.addEventListener("error", (err) => {
		console.error("WebSocket error:", err);
		activeFetches.forEach(({ controller }) => controller.abort());
		activeFetches.clear();
	});

	// 创建最终的响应头部，合并升级头部和我们的CORS头部
	const finalHeaders = new Headers(upgradeResponse.headers);
	for (const [key, value] of Object.entries(corsHeaders)) {
		finalHeaders.set(key, value);
	}

	// 返回一个新的 Response 对象，其中包含所有正确的头部
	return new Response(upgradeResponse.body, {
		status: upgradeResponse.status,
		statusText: upgradeResponse.statusText,
		headers: finalHeaders,
	});
}
