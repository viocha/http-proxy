// /api/get.ts

export default async function handler(req: Request): Promise<Response> {
	return new Response('Hello, World!', {
		status: 200,
		statusText: 'Fine',
	});
}
