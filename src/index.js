/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === '/api/status') {
			return new Response(JSON.stringify({
				status: 'online',
				platform: 'Cloudflare Workers',
				device: 'AULA F87 / F87 Pro Web Controller',
				timestamp: new Date().toISOString()
			}), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}
		return new Response('Not Found', { status: 404 });
	},
};
