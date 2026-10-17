import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { APIContext } from 'astro';

function getRequiredEnv(name: 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEY'): string {
	const value = import.meta.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

function getRequestCookies(request: Request): { name: string; value: string }[] {
	const cookieHeader = request.headers.get('cookie');

	if (!cookieHeader) {
		return [];
	}

	return cookieHeader.split(';').flatMap((cookie) => {
		const separatorIndex = cookie.indexOf('=');

		if (separatorIndex === -1) {
			return [];
		}

		return [
			{
				name: cookie.slice(0, separatorIndex).trim(),
				value: cookie.slice(separatorIndex + 1).trim()
			}
		];
	});
}

function toAstroCookieOptions(options: CookieOptions) {
	return {
		domain: options.domain,
		path: options.path,
		expires: options.expires,
		maxAge: options.maxAge,
		httpOnly: options.httpOnly,
		sameSite: options.sameSite,
		secure: options.secure,
		encode: options.encode,
		partitioned: options.partitioned
	};
}

export function createSupabaseServerClient({ request, cookies }: Pick<APIContext, 'request' | 'cookies'>) {
	const supabaseUrl = getRequiredEnv('SUPABASE_URL');
	const supabasePublishableKey = getRequiredEnv('SUPABASE_PUBLISHABLE_KEY');

	return createServerClient(supabaseUrl, supabasePublishableKey, {
		cookies: {
			getAll: () => getRequestCookies(request),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, toAstroCookieOptions(options));
				});
			}
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false,
			detectSessionInUrl: false
		}
	});
}
