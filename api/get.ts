// /api/get.ts

import {genCorsHeaders} from './_lib/util.js';

export const config ={
	path: '/api/get', // 适配netlify
}

export default async function handler(req: Request): Promise<Response> {
	const corsHeaders: Record<string, string> = genCorsHeaders(
			{request: req, allowMethods: 'GET, OPTIONS'},
	);

	// 处理 OPTIONS 预检请求
	if (req.method === 'OPTIONS') {
		return new Response(null, {status: 204, headers: corsHeaders});
	}

	// 此端点只处理 GET 请求
	if (req.method !== 'GET') {
		return Response.json({error: 'Method not allowed. This endpoint only accepts GET requests.'}, {
			status: 405,
			headers: corsHeaders,
		});
	}

	try {
		const reqUrl = new URL(req.url);

		const targetUrl = reqUrl.searchParams.get('url');
		if (!targetUrl) {
			return Response.json({error: 'Missing "url" search parameter'}, {
				status: 400,
				headers: corsHeaders,
			});
		}

		// 准备转发到 /api/proxy 的请求头，设置代理目标和方法
		const headers = new Headers(req.headers);
		headers.set('X-Url', targetUrl);
		headers.set('X-Method', 'GET'); // 明确指定目标方法为 GET

		// 构造到 /api/proxy 的请求 URL，使用 reqUrl.origin 来确保协议、主机和端口正确
		const proxyEndpointUrl = new URL('/api/proxy', reqUrl.origin).toString();

		return await fetch(proxyEndpointUrl, {
			method: 'POST',
			headers: headers,
			body: null,
		});
	} catch (error: any) {
		console.error('Error in /api/get handler:', error);
		return Response.json({error: 'Proxy GET request failed: ' + error.message}, {
			status: 500,
			headers: corsHeaders,
		});
	}
}
