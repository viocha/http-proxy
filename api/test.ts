// /api/get.ts

export const config = {
	runtime: 'edge', // 指定这是一个 Edge Function
};

export default async function handler(req: Request): Promise<Response> {
	return new Response('Hello, World!', {
		status: 200,
		statusText: 'Fine',
	});
}
