import type { APIRoute } from 'astro';
import { authorizeAdmin, isSameOrigin } from '../../../lib/admin-auth';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { validateProjectForm } from '../../../lib/project-validation';

function redirectWithStatus(status: string): Response {
	return new Response(null, {
		status: 303,
		headers: { location: `/admin/projects?status=${encodeURIComponent(status)}` }
	});
}

function redirectWithError(error: string, id?: string): Response {
	const destination = id
		? `/admin/projects/${encodeURIComponent(id)}?error=${encodeURIComponent(error)}`
		: `/admin/projects/new?error=${encodeURIComponent(error)}`;

	return new Response(null, {
		status: 303,
		headers: { location: destination }
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
		const action = formData.get('action');
		const id = formData.get('id');
		const supabase = createSupabaseServerClient({ request, cookies });

		if (action === 'delete') {
			if (typeof id !== 'string' || id.length === 0 || formData.get('confirm') !== 'delete') {
				return new Response('Invalid request', { status: 400 });
			}

			const { error } = await supabase.from('projects').delete().eq('id', id);
			if (error) {
				return redirectWithError('database', id);
			}

			return redirectWithStatus('deleted');
		}

		if (action === 'toggle_publish') {
			if (typeof id !== 'string' || id.length === 0) {
				return new Response(null, {
					status: 303,
					headers: { location: '/admin/projects?error=invalid' }
				});
			}

			const isPublished = formData.get('is_published') === 'true';
			const { error } = await supabase.from('projects').update({ is_published: isPublished }).eq('id', id);
			if (error) {
				return new Response(null, {
					status: 303,
					headers: { location: '/admin/projects?error=database' }
				});
			}

			return redirectWithStatus(isPublished ? 'published' : 'unpublished');
		}

		const validation = validateProjectForm(formData);
		if (!validation.values) {
			return redirectWithError('invalid', typeof id === 'string' ? id : undefined);
		}

		if (action === 'update') {
			if (typeof id !== 'string' || id.length === 0) {
				return redirectWithError('invalid');
			}

			const { error } = await supabase.from('projects').update(validation.values).eq('id', id);
			if (error) {
				return error.code === '23505' ? redirectWithError('duplicate', id) : redirectWithError('database', id);
			}

			return redirectWithStatus('updated');
		}

		if (action !== 'create') {
			return redirectWithError('invalid');
		}

		const { error } = await supabase.from('projects').insert(validation.values);
		if (error) {
			return error.code === '23505' ? redirectWithError('duplicate') : redirectWithError('database');
		}

		return redirectWithStatus('created');
	} catch {
		return redirectWithError('database');
	}
};
