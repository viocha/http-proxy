// /api/proxy.ts

import {genCorsHeaders} from './_lib/util.js';

export default async function handler(req: Request): Promise<Response> {
	const corsHeaders: Record<string, string> = genCorsHeaders(
			{request: req, allowMethods: 'POST, OPTIONS'},
	);


	// 处理 OPTIONS 预检请求
	if (req.method === 'OPTIONS') {
		return new Response(null, {status: 204, headers: corsHeaders});
	}

	// 代理端点本身只接受 POST 请求，因为它通过头部和请求体携带代理指令
	if (req.method !== 'POST') {
		return Response.json({error: 'Proxy endpoint only accepts POST. Use X-Method header for target method.'}, {
			status: 405,
			headers: corsHeaders,
		});
	}

	try {
		// 从自定义头部获取目标 URL 和方法
		const url = req.headers.get('X-Url');
		const method = req.headers.get('X-Method')?.toUpperCase() || 'GET';
		const redirect = (req.headers.get('X-Redirect')?.toLowerCase() || 'follow') as RequestRedirect;

		if (!url) {
			return Response.json({error: 'Missing X-Url in request headers'}, {
				status: 400,
				headers: corsHeaders,
			});
		}

		// 准备转发到目标服务器的请求头
		const headers = new Headers();
		req.headers.forEach((value, key) => {
			const lowerKey = key.toLowerCase();
			// 过滤掉代理特定的头部和 Host 头部 (fetch 会根据目标 URL 自动设置 Host)
			if (['host', 'x-url', 'x-method', 'x-redirect'].includes(lowerKey)) {
				return; // 跳过这些头部
			}
			headers.append(key, value);
		});

		// 只有当方法不是 GET 或 HEAD，并且请求体存在时，才转发请求体
		let body: BodyInit | null = null;
		if (method === 'GET' || method === 'HEAD') { // 不能携带请求体的方法
			headers.delete('Content-Length'); // content-length和body长度不匹配fetch会报错
		} else {
			if (req.body) {
				body = req.body;
			}
		}


		// huggingface space主页 必须删除x-forwarded-host才能访问
		// 直接移除 x-forwarded- 开头的请求头
		for (const key of [...headers.keys()]) {
			if (key.toLowerCase().startsWith('x-forwarded-')) {
				headers.delete(key);
			}
			if (key.toLowerCase().startsWith('x-vercel-')) {
				headers.delete(key);
			}
		}
		headers.delete('x-real-ip');

		const response = await fetch(url, {
			method,
			headers,
			body,
			redirect, // nodejs fetch默认是follow
		});

		// 先复制目标服务器的响应头，然后应用代理服务器的 CORS 策略
		const respHeaders = new Headers(response.headers);
		respHeaders.delete('content-encoding');
		Object.entries(corsHeaders).forEach(([key, value]) => {
			respHeaders.set(key, value);
		});

		// 如果是手动处理重定向，且响应码是3xx，则将响应码修改为2xx，返回重定向中间响应
		if (redirect === 'manual' && response.status >= 300 && response.status < 400) {
			respHeaders.set('X-Redirect-Status', String(response.status));
			respHeaders.set('X-Redirect-Location', response.headers.get('Location') || '');
			return new Response(response.body, {
				status: 200,
				statusText:'OK - Redirect',
				headers: respHeaders,
			});
		}

		// 返回最终的响应
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: respHeaders,
		});
	} catch (error: any) {
		console.error('Proxy error:', error);
		return Response.json({error: 'Proxy error: ' + error.message}, {
			status: 500,
			statusText: 'Proxy Internal Server Error',
			headers: corsHeaders,
		});
	}
}
