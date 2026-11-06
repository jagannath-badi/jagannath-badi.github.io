import type { APIRoute } from 'astro';
import { hasAdminMembership, isSameOrigin } from '../../../lib/admin-auth';
import { createSupabaseServerClient } from '../../../lib/supabase';

function redirectToLogin(error = 'invalid'): Response {
	return new Response(null, {
		status: 303,
		headers: { location: `/admin/login?error=${encodeURIComponent(error)}` }
	});
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	if (!isSameOrigin(request)) {
		return new Response('Forbidden', { status: 403 });
	}

	try {
		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		if (
			typeof email !== 'string' ||
			typeof password !== 'string' ||
			email.trim().length === 0 ||
			email.trim().length > 320 ||
			password.length === 0 ||
			password.length > 1024
		) {
			return redirectToLogin('invalid');
		}

		const supabase = createSupabaseServerClient({ request, cookies });
		const loginPromise = supabase.auth.signInWithPassword({
			email: email.trim(),
			password
		});

		const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
			setTimeout(() => resolve({ data: null, error: new Error('Auth timeout') }), 6000)
		);

		const { data: signInData, error: signInError } = await Promise.race([loginPromise, timeoutPromise]);

		if (signInError || !signInData?.user) {
			return redirectToLogin('invalid');
		}

		const isMember = await hasAdminMembership(supabase, signInData.user.id);
		if (!isMember) {
			await supabase.auth.signOut();
			return redirectToLogin('unauthorized_role');
		}

		return redirect('/admin', 303);
	} catch {
		return redirectToLogin('invalid');
	}
};
