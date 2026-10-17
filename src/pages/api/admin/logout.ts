import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/admin-auth';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	if (!isSameOrigin(request)) {
		return new Response('Forbidden', { status: 403 });
	}

	try {
		const supabase = createSupabaseServerClient({ request, cookies });
		await supabase.auth.signOut();
	} catch {
		// Redirect even when the session is already invalid or expired.
	}

	return redirect('/admin/login', 303);
};
