// /api/proxy.ts

export const config = {
	runtime: 'edge', // 指定这是一个 Edge Function
};

export default async function handler(req: Request): Promise<Response> {
	// 设置 CORS 头部
	const origin = new URL(req.url).origin;
	const headers = {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': '*',
		'Access-Control-Allow-Headers': '*',
		'Access-Control-Allow-Credentials': 'true',
		'Accept': 'application/json',
	};

	// 处理 OPTIONS 请求
	if (req.method === 'OPTIONS') {
		return new Response(null, {status: 204, headers: headers});
	}

	// 处理非 POST 请求
	if (req.method !== 'POST') {
		return Response.json({error: 'Method not allowed'}, {
			status: 405,
			headers: headers,
		});
	}

	try {
		// 获取请求体
		let {url, method = 'GET', headers = {}, body = null} = await req.json();

		if (!url) {
			return Response.json({error: 'Missing url in request body'}, {
				status: 400,
				headers: headers,
			});
		}

		// fetch不能带有请求体的方法
		if (['GET', 'HEAD'].includes(method)) {
			body = null;
		}

		// 使用 fetch 进行请求
		return await fetch(url, {
			method,
			headers,
			body,
		});
	} catch (error: any) { // 错误处理
		return Response.json({error: error.message}, {
			status: 500,
			headers: headers,
		});
	}
}
