import type { APIContext } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase';

export type AdminAuthorization =
	| { status: 'unauthenticated' }
	| { status: 'forbidden' }
	| { status: 'authorized'; user: User };

export async function hasAdminMembership(supabase: SupabaseClient, userId: string): Promise<boolean> {
	const { data, error } = await supabase
		.from('admin_users')
		.select('user_id')
		.eq('user_id', userId)
		.maybeSingle();

	return !error && data !== null;
}

export function isSameOrigin(request: Request): boolean {
	const originHeader = request.headers.get('origin') || request.headers.get('referer');

	if (!originHeader) {
		return false;
	}

	try {
		const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
		const originHost = new URL(originHeader).host;
		return requestHost === originHost;
	} catch {
		return false;
	}
}

export async function authorizeAdmin({
	request,
	cookies
}: Pick<APIContext, 'request' | 'cookies'>): Promise<AdminAuthorization> {
	try {
		const supabase = createSupabaseServerClient({ request, cookies });
		const {
			data: { user },
			error
		} = await supabase.auth.getUser();

		if (error || !user) {
			return { status: 'unauthenticated' };
		}

		if (!(await hasAdminMembership(supabase, user.id))) {
			return { status: 'forbidden' };
		}

		return { status: 'authorized', user };
	} catch {
		return { status: 'unauthenticated' };
	}
}
