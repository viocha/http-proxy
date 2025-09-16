const customReqHeaders = ['X-Url', 'X-Method', 'X-Redirect', 'X-Request-Expose-Headers'];
const customRespHeaders = ['X-Redirect-Status', 'X-Redirect-Location'];


export function genCorsHeaders({allowMethods, request}: {
	allowMethods: string,
	request: Request,
}): Record<string, string> {
	const corsHeaders: Record<string, string> = {
		'Access-Control-Allow-Methods': allowMethods,
		// 客户端可以指定需要暴露的响应头部
		'Access-Control-Expose-Headers': request.headers.get('X-Response-Expose-Headers')
				|| ExposeHeaders.join(', '),
		'Access-Control-Max-Age': String(24 * 60 * 60), // 24 小时
	};
	const clientOrigin = request.headers.get('Origin');

	if (clientOrigin) {
		corsHeaders['Access-Control-Allow-Origin'] = clientOrigin;
		corsHeaders['Access-Control-Allow-Headers'] = request.headers.get('Access-Control-Request-Headers')
				|| AllowHeaders.join(', ');
		corsHeaders['Access-Control-Allow-Credentials'] = 'true';
	} else {
		corsHeaders['Access-Control-Allow-Origin'] = '*';
		corsHeaders['Access-Control-Allow-Headers'] = '*';
	}

	return corsHeaders;
}


export const AllowHeaders = [
	// 自定义的请求头部
	...customReqHeaders,

	// 标准请求头部 (Standard Request Headers)
	'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language', 'Authorization', 'Cache-Control', 'Connection',
	'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'Expect', 'From', 'Host', 'If-Match', 'If-Modified-Since',
	'If-None-Match', 'If-Range', 'If-Unmodified-Since', 'Max-Forwards', 'Pragma', 'Proxy-Authorization', 'Range',
	'Referer', 'TE', 'Upgrade', 'User-Agent', 'Via', 'Warning',

	// CORS 相关请求头 (CORS Request Headers)
	'Access-Control-Request-Headers', 'Access-Control-Request-Method', 'Origin',

	// Cookie 相关头部 (Cookie Headers)
	'Cookie',

	// 内容协商头部 (Content Negotiation Headers)
	'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language', 'Accept-Datetime',

	// 条件请求头部 (Conditional Request Headers)
	'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range', 'If-Unmodified-Since',

	// 认证和授权头部 (Authentication & Authorization Headers)
	'Authorization', 'Proxy-Authorization', 'WWW-Authenticate',

	// 自定义和扩展头部 (Custom & Extension Headers)
	'X-Requested-With', 'X-HTTP-Method-Override', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto', 'X-Real-IP',
	'X-Original-URL', 'X-Rewrite-URL', 'X-CSRF-Token', 'X-API-Key', 'X-Auth-Token', 'X-Session-ID', 'X-Request-ID',
	'X-Correlation-ID', 'X-Trace-Id', 'X-Span-Id',

	// API 相关头部 (API Related Headers)
	'API-Key', 'API-Version', 'Accept-Version', 'X-API-Version',

	// 客户端信息头部 (Client Information Headers)
	'User-Agent', 'X-User-Agent', 'Client-IP', 'X-Client-IP', 'X-Forwarded-For', 'X-Real-IP',

	// 内容相关头部 (Content Related Headers)
	'Content-Type', 'Content-Length', 'Content-Encoding', 'Content-Language', 'Content-Location', 'Content-MD5',
	'Content-Disposition',

	// 缓存控制头部 (Cache Control Headers)
	'Cache-Control', 'Pragma', 'If-Modified-Since', 'If-None-Match', 'If-Match',

	// 安全相关头部 (Security Headers)
	'X-CSRF-Token', 'X-XSS-Protection', 'X-Content-Type-Options', 'X-Frame-Options', 'Sec-Fetch-Site', 'Sec-Fetch-Mode',
	'Sec-Fetch-User', 'Sec-Fetch-Dest', 'Sec-CH-UA', 'Sec-CH-UA-Mobile', 'Sec-CH-UA-Platform',

	// WebSocket 相关头部 (WebSocket Headers)
	'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Protocol', 'Sec-WebSocket-Extensions',

	// HTTP/2 和现代协议头部 (HTTP/2 & Modern Protocol Headers)
	'Upgrade-Insecure-Requests', 'DNT', // Do Not Track
	'Save-Data',

	// 压缩和传输头部 (Compression & Transfer Headers)
	'Accept-Encoding', 'Transfer-Encoding', 'TE',

	// 代理和网关头部 (Proxy & Gateway Headers)
	'Via', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto', 'X-Forwarded-Port', 'Forwarded',

	// 移动和设备相关头部 (Mobile & Device Headers)
	'X-Wap-Profile', 'X-Mobile-UA', 'X-Device-Type',

	// 地理位置头部 (Geolocation Headers)
	'X-Geo-Country', 'X-Geo-Region', 'CF-IPCountry', // Cloudflare

	// CDN 和负载均衡头部 (CDN & Load Balancer Headers)
	'CF-Ray', // Cloudflare
	'CF-Visitor', // Cloudflare
	'X-Amz-Cf-Id', // Amazon CloudFront
	'X-Azure-Ref', // Azure
	'X-Cache-Key',

	// 调试和监控头部 (Debug & Monitoring Headers)
	'X-Debug-Token', 'X-Debug-Mode', 'X-Trace-Id', 'X-Request-Start', 'X-Queue-Start',

	// 社交媒体和爬虫头部 (Social Media & Crawler Headers)
	'X-Purpose', 'Purpose', 'X-Moz', 'Googlebot',

	// 邮件和通知头部 (Email & Notification Headers)
	'X-Mailer', 'X-Priority',

	// 文件上传相关头部 (File Upload Headers)
	'X-File-Name', 'X-File-Size', 'X-File-Type', 'Content-Disposition',

	// GraphQL 相关头部 (GraphQL Headers)
	'GraphQL-Query', 'X-GraphQL-Operation-Name',

	// 微服务和分布式系统头部 (Microservices & Distributed Systems Headers)
	'X-Service-Name', 'X-Service-Version', 'X-Tenant-ID', 'X-Organization-ID', 'X-User-ID',

	// 特定框架头部 (Framework Specific Headers)
	'X-Requested-With', // AJAX 标识
	'X-PJAX', // PJAX 请求
	'X-CSRF-Token', // CSRF 保护
	'X-HTTP-Method-Override', // 方法覆盖

	// 实验性和提案头部 (Experimental & Proposed Headers)
	'Want-Digest', 'Digest', 'Signature', 'Client-Hints',

	// 其他常见自定义头部 (Other Common Custom Headers)
	'X-Custom-Header', 'X-App-Name', 'X-App-Version', 'X-Platform', 'X-Device-ID', 'X-Timestamp',
];

export const ExposeHeaders = [
	// 自定义的响应头部
	...customRespHeaders,

	// 通用头部 (General Headers)
	'Cache-Control', 'Connection', 'Date', 'Pragma', 'Trailer', 'Transfer-Encoding', 'Upgrade', 'Via', 'Warning',

	// 响应头部 (Response Headers)
	'Accept-Ranges', 'Age', 'ETag', 'Location', 'Proxy-Authenticate', 'Retry-After', 'Server', 'Vary', 'WWW-Authenticate',

	// 实体头部 (Entity Headers)
	'Allow', 'Content-Encoding', 'Content-Language', 'Content-Length', 'Content-Location', 'Content-MD5', 'Content-Range',
	'Content-Type', 'Expires', 'Last-Modified',

	// 安全相关头部 (Security Headers)
	'Content-Security-Policy', 'Content-Security-Policy-Report-Only', 'Cross-Origin-Embedder-Policy',
	'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy', 'Expect-CT', 'Feature-Policy', 'Permissions-Policy',
	'Public-Key-Pins', 'Public-Key-Pins-Report-Only', 'Referrer-Policy', 'Strict-Transport-Security',
	'X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection',

	// CORS 相关头部 (CORS Headers)
	'Access-Control-Allow-Credentials', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Methods',
	'Access-Control-Allow-Origin', 'Access-Control-Expose-Headers', 'Access-Control-Max-Age',

	// Cookie 相关头部 (Cookie Headers)
	'Set-Cookie',

	// 重定向头部 (Redirect Headers)
	'Location', 'Refresh',

	// 缓存和条件请求头部 (Caching & Conditional Headers)
	'ETag', 'Expires', 'Last-Modified', 'Cache-Control', 'Vary',

	// 内容协商头部 (Content Negotiation Headers)
	'Accept-Ranges', 'Content-Language', 'Content-Location', 'Vary',

	// 性能和监控头部 (Performance & Monitoring Headers)
	'Server-Timing', 'Timing-Allow-Origin',

	// 自定义和扩展头部 (Custom & Extension Headers)
	'X-Powered-By', 'X-Request-ID', 'X-Correlation-ID', 'X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining',
	'X-Rate-Limit-Reset', 'X-Total-Count', 'X-Page-Count', 'X-Per-Page', 'X-Next-Page', 'X-Prev-Page',

	// API 和应用特定头部 (API & Application Specific Headers)
	'API-Version', 'X-API-Key', 'X-Auth-Token', 'X-Session-ID', 'X-CSRF-Token', 'X-Requested-With',

	// 压缩和编码头部 (Compression & Encoding Headers)
	'Content-Encoding', 'Transfer-Encoding',

	// 媒体和内容头部 (Media & Content Headers)
	'Content-Disposition', 'Content-Type', 'Content-Length', 'Content-Range',

	// HTTP/2 和现代协议头部 (HTTP/2 & Modern Protocol Headers)
	'Alt-Svc', 'Link',

	// 诊断和调试头部 (Diagnostic & Debug Headers)
	'X-Debug-Token', 'X-Debug-Token-Link', 'X-Response-Time',

	// 地理位置和本地化头部 (Geolocation & Localization Headers)
	'Content-Language', 'X-Geo-Country', 'X-Geo-Region',

	// 移动和设备特定头部 (Mobile & Device Specific Headers)
	'X-UA-Compatible',

	// CDN 和代理头部 (CDN & Proxy Headers)
	'X-Cache', 'X-Cache-Hits', 'X-Served-By', 'X-Timer', 'X-Varnish', 'CF-Ray', // Cloudflare
	'CF-Cache-Status', // Cloudflare

	// 废弃但仍可能遇到的头部 (Deprecated but Possibly Encountered Headers)
	'P3P', 'X-Pingback',

	// WebSocket 相关头部 (WebSocket Related Headers)
	'Sec-WebSocket-Accept', 'Sec-WebSocket-Extensions', 'Sec-WebSocket-Protocol',

	// 其他常见自定义头部 (Other Common Custom Headers)
	'X-Robots-Tag', 'X-UA-Compatible', 'X-DNS-Prefetch-Control', 'X-Download-Options',
	'X-Permitted-Cross-Domain-Policies',
];
