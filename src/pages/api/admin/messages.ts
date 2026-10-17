import type { APIRoute } from 'astro';
import { authorizeAdmin, isSameOrigin } from '../../../lib/admin-auth';
import { createSupabaseServerClient } from '../../../lib/supabase';

const messageIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectWithError(error: 'invalid' | 'database'): Response {
	return new Response(null, {
		status: 303,
		headers: { location: `/admin/messages?error=${error}` }
	});
}

export const POST: APIRoute = async ({ request, cookies }) => {
	const authorization = await authorizeAdmin({ request, cookies });

	if (authorization.status === 'unauthenticated') {
		return new Response('Unauthorized', { status: 401 });
	}

	if (authorization.status === 'forbidden') {
		return new Response('Forbidden', { status: 403 });
	}

	if (!isSameOrigin(request)) {
		return new Response('Forbidden', { status: 403 });
	}

	try {
		const formData = await request.formData();
		const id = formData.get('id');
		const action = formData.get('action');

		if (typeof id !== 'string' || !messageIdPattern.test(id) || (action !== 'read' && action !== 'unread')) {
			return redirectWithError('invalid');
		}

		const supabase = createSupabaseServerClient({ request, cookies });
		const { error } = await supabase
			.from('contact_messages')
			.update({ is_read: action === 'read' })
			.eq('id', id);

		if (error) {
			return redirectWithError('database');
		}

		return new Response(null, {
			status: 303,
			headers: { location: `/admin/messages?status=${action}` }
		});
	} catch {
		return redirectWithError('database');
	}
};
