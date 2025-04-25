// /api/proxy.ts

export const config = {
    runtime: 'edge', // 指定这是一个 Edge Function
};

export default async function handler(req: Request): Promise<Response> {
    // 设置 CORS 头部
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        return new Response(null, {status: 204, headers: corsHeaders});
    }

    // 处理非 GET 请求
    if (req.method !== 'GET') {
        return Response.json({error: 'Method not allowed',}, {
            status: 405,
            headers: corsHeaders,
        })
    }

    try {
        // 获取请求中的url参数
        const url = new URL(req.url).searchParams.get('url');

        if (!url) {
            return Response.json({error: 'Missing url search param'}, {
                status: 400,
                headers: corsHeaders,
            })
        }

        // 使用 fetch 进行请求
        return await fetch(url, {headers: req.headers,});
    } catch (error: any) { // 错误处理
        return Response.json({error: error.message}, {
            status: 500,
            headers: corsHeaders,
        });
    }
}
