// proxy-client.js

class WebSocketProxyClient {
	constructor(proxyUrl) {
		this.proxyUrl = proxyUrl;
		this.ws = null;
		this.requests = new Map();
		this.reqIdCounter = 0;
		this.connectionPromise = null;
		this._connect();
	}
	
	_connect() {
		this.connectionPromise = new Promise((resolve, reject) => {
			this.ws = new WebSocket(this.proxyUrl);
			this.ws.binaryType = 'arraybuffer';
			
			this.ws.onopen = () => {
				console.log('WebSocket proxy connected.');
				resolve();
			};
			
			this.ws.onmessage = (event) => {
				if (event.data instanceof ArrayBuffer) {
					const data = new Uint8Array(event.data);
					const reqIdLen = new DataView(data.buffer, 0, 4).getUint32(0);
					const reqId = new TextDecoder().decode(data.slice(4, 4 + reqIdLen));
					const chunk = data.slice(4 + reqIdLen);
					
					const requestContext = this.requests.get(reqId);
					if (requestContext && requestContext.responseBodyController) {
						requestContext.responseBodyController.enqueue(chunk);
					}
					return;
				}
				
				if (typeof event.data === 'string') {
					const message = JSON.parse(event.data);
					const { type, reqId, details, message: errorMessage } = message;
					const requestContext = this.requests.get(reqId);
					if (!requestContext) return;
					
					switch (type) {
						case 'response':
							requestContext.resolve(new Response(requestContext.responseBodyStream, {
								status: details.status,
								statusText: details.statusText,
								headers: new Headers(details.headers),
							}));
							break;
						case 'response-end':
							if (requestContext.responseBodyController) {
								requestContext.responseBodyController.close();
							}
							this.requests.delete(reqId);
							break;
						case 'error':
							if (requestContext.responseBodyController) {
								requestContext.responseBodyController.error(new Error(errorMessage));
							}
							requestContext.reject(new Error(errorMessage));
							this.requests.delete(reqId);
							break;
					}
				}
			};
			
			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.connectionPromise = null;
				reject(new Error('WebSocket connection error.'));
			};
			
			this.ws.onclose = () => {
				console.log('WebSocket proxy disconnected.');
				this.ws = null;
				this.connectionPromise = null;
				this.requests.forEach(({ reject }) => reject(new Error('Connection closed.')));
				this.requests.clear();
			};
		});
		return this.connectionPromise;
	}
	
	async ensureConnected() {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			if (!this.connectionPromise) {
				return this._connect();
			}
			return this.connectionPromise;
		}
	}
	
	async fetch(url, options = {}) {
		await this.ensureConnected();
		
		const reqId = `req-${this.reqIdCounter++}`;
		const { method = 'GET', body, redirect, signal } = options;
		
		// 关键修正：在这里构造一个临时的 Request 对象，以获取浏览器自动生成的头部
		const tempRequest = new Request(url, options);
		const headers = Object.fromEntries(tempRequest.headers.entries());
		
		// 1. 发送请求元数据，这次包含了正确的 Content-Type
		this.ws.send(JSON.stringify({
			type: 'request',
			reqId,
			details: {
				url: tempRequest.url,
				method: tempRequest.method,
				headers,
				redirect: tempRequest.redirect
			},
		}));
		
		// 2. 流式传输请求体 (逻辑不变)
		if (tempRequest.body && (method !== 'GET' && method !== 'HEAD')) {
			const reader = tempRequest.body.getReader();
			
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
				this.ws.send(messageToSend.buffer);
			}
		}
		
		// 3. 发送请求结束信号
		this.ws.send(JSON.stringify({ type: 'request-end', reqId }));
		
		// 4. 准备接收响应 (逻辑不变)
		return new Promise((resolve, reject) => {
			let responseBodyController;
			const responseBodyStream = new ReadableStream({
				start(controller) {
					responseBodyController = controller;
				},
			});
			
			this.requests.set(reqId, { resolve, reject, responseBodyController, responseBodyStream });
			
			signal?.addEventListener('abort', () => {
				this.ws.send(JSON.stringify({ type: 'abort', reqId }));
				reject(new DOMException('Aborted', 'AbortError'));
				this.requests.delete(reqId);
			});
		});
	}
}
