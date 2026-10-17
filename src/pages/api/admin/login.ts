import type { APIRoute } from 'astro';
import { hasAdminMembership, isSameOrigin } from '../../../lib/admin-auth';
import { createSupabaseServerClient } from '../../../lib/supabase';

function redirectToLogin(): Response {
	return new Response(null, {
		status: 303,
		headers: { location: '/admin/login?error=invalid' }
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
			return redirectToLogin();
		}

		const supabase = createSupabaseServerClient({ request, cookies });
		const loginPromise = supabase.auth.signInWithPassword({
			email: email.trim(),
			password
		});

		const timeoutPromise = new Promise<{ error: any }>((resolve) =>
			setTimeout(() => resolve({ error: new Error('Auth timeout') }), 6000)
		);

		const { error: signInError } = await Promise.race([loginPromise, timeoutPromise]);

		if (signInError) {
			return redirectToLogin();
		}

		const {
			data: { user },
			error: userError
		} = await supabase.auth.getUser();

		if (userError || !user || !(await hasAdminMembership(supabase, user.id))) {
			await supabase.auth.signOut();
			return redirectToLogin();
		}

		return redirect('/admin', 303);
	} catch {
		return redirectToLogin();
	}
};
