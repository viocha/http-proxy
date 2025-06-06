// /api/proxy.ts

export const config = {
	runtime: 'edge', // 指定这是一个 Edge Function
};

export const AllowedHeaders = 'X-Url, X-Method, Accept, Accept-Encoding, Accept-Language, Authorization,' +
		' Cache-Control,' +
		' Content-Disposition, Content-Encoding, Content-Language, Content-Length, Content-Range, Content-Type,' +
		' Cookie, Date, ETag, Expires, Host, If-Match, If-Modified-Since, If-None-Match, If-Range, If-Unmodified-Since,' +
		' Last-Modified, Location, Origin, Pragma, Range, Referer, Server, Transfer-Encoding, User-Agent, Vary,' +
		' X-Requested-With, X-HTTP-Method-Override, X-Forwarded-For, X-Forwarded-Proto, X-Real-IP, X-CSRF-Token,' +
		' X-Auth-Token, X-API-Key, X-Client-Version, X-Device-ID, X-Session-ID';


export default async function handler(req: Request): Promise<Response> {
	// 设置 CORS 头部
	const clientOrigin = req.headers.get('Origin');
	const corsHeaders: Record<string, string> = {
		'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, HEAD, PATCH',
	};

	if (clientOrigin) {
		corsHeaders['Access-Control-Allow-Origin'] = clientOrigin;
		corsHeaders['Access-Control-Allow-Credentials'] = 'true';
		// 当允许凭据时，Access-Control-Allow-Headers 不能为 '*', 会被当成字面量，
		// 可以反射客户端在 Access-Control-Request-Headers 中请求的头部，或者是一个明确的列表
		corsHeaders['Access-Control-Allow-Headers'] =
				req.headers.get('Access-Control-Request-Headers') || AllowedHeaders;
	} else {
		// 如果没有 Origin 头部 (例如，非浏览器请求或同源请求)，则允许所有源
		// 当 Access-Control-Allow-Origin 为 '*' 时，不能允许凭据
		corsHeaders['Access-Control-Allow-Origin'] = '*';
		corsHeaders['Access-Control-Allow-Headers'] = '*';
	}

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
			if (lowerKey !== 'x-url' && lowerKey !== 'x-method' && lowerKey !== 'host') {
				headers.append(key, value);
			}
		});

		// 只有当方法不是 GET 或 HEAD，并且请求体存在时，才转发请求体
		let body: BodyInit | null = null;
		if (method !== 'GET' && method !== 'HEAD' && req.body) {
			body = req.body;
		} else {
			headers.delete('Content-Length'); // content-length和body长度不匹配fetch会报错
		}

		// 使用 fetch 向目标 URL 发起请求
		const fetchOptions = {
			method: method,
			headers: headers,
			body: body,
		};
		// 流式传输请求体时 duplex: 'half' 是必需的
		if (body) {
			// @ts-ignore duplex属性是存在的，但是ts会报错
			fetchOptions.duplex = 'half';
		}

		const response = await fetch(url, fetchOptions);

		// 准备发送回客户端的响应头，先复制目标服务器的响应头
		const respHeaders = new Headers(response.headers);
		// 然后应用代理服务器的 CORS 策略
		Object.entries(corsHeaders).forEach(([key, value]) => {
			respHeaders.set(key, value);
		});

		// 将目标服务器的响应体和处理过的头部返回给客户端
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: respHeaders,
		});

	} catch (error: any) {
		console.error('Proxy error:', error);
		return Response.json({error: 'Proxy error: ' + error.message}, {
			status: 500,
			headers: corsHeaders,
		});
	}
}
