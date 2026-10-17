import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { isSameOrigin } from '../../lib/admin-auth';

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

interface ContactPayload {
	name: unknown;
	email: unknown;
	subject: unknown;
	message: unknown;
	website: unknown;
}

interface ContactValues {
	name: string;
	email: string;
	subject: string;
	message: string;
}

function methodNotAllowed(): Response {
	return jsonResponse({ code: 'method_not_allowed', message: 'Method not allowed.' }, 405);
}

function jsonResponse(body: Record<string, string>, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
}

function getRequiredEnvironmentValue(name: 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY' | 'RESEND_API_KEY' | 'CONTACT_RECIPIENT_EMAIL' | 'RESEND_FROM_EMAIL'): string | null {
	const value = import.meta.env[name];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

async function readBody(request: Request): Promise<unknown | 'too_large' | null> {
	const contentLength = request.headers.get('content-length');
	if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
		return 'too_large';
	}

	if (!request.body) {
		return null;
	}

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let totalBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			totalBytes += value.byteLength;
			if (totalBytes > MAX_BODY_BYTES) {
				await reader.cancel();
				return 'too_large';
			}

			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const body = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown;
	} catch {
		return null;
	}
}

function getRateLimitKey(request: Request): string {
	return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

// This process-local limiter is only best-effort; serverless instances do not share its state.
function exceedsRateLimit(key: string): boolean {
	const now = Date.now();
	for (const [storedKey, entry] of rateLimit) {
		if (entry.resetAt <= now) {
			rateLimit.delete(storedKey);
		}
	}

	const existing = rateLimit.get(key);
	if (!existing || existing.resetAt <= now) {
		rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}

	existing.count += 1;
	return existing.count > RATE_LIMIT_MAX;
}

function isContactPayload(value: unknown): value is ContactPayload {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getValidatedValues(payload: ContactPayload): ContactValues | null {
	if (payload.website !== undefined && typeof payload.website !== 'string') {
		return null;
	}

	if (typeof payload.website === 'string' && payload.website.trim().length > 0) {
		return null;
	}

	if (typeof payload.name !== 'string' || typeof payload.email !== 'string' || typeof payload.subject !== 'string' || typeof payload.message !== 'string') {
		return null;
	}

	const values = {
		name: payload.name.trim(),
		email: payload.email.trim(),
		subject: payload.subject.trim(),
		message: payload.message.trim()
	};

	if (
		values.name.length < 2 ||
		values.name.length > 100 ||
		values.email.length === 0 ||
		values.email.length > 254 ||
		values.subject.length < 1 ||
		values.subject.length > 150 ||
		values.message.length < 10 ||
		values.message.length > 5000 ||
		/[\u0000-\u001f\u007f]/.test(values.name) ||
		/[\r\n\u0000-\u001f\u007f]/.test(values.email) ||
		/[\r\n\u0000-\u001f\u007f]/.test(values.subject)
	) {
		return null;
	}

	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailPattern.test(values.email) ? values : null;
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		};
		return entities[character];
	});
}

export const POST: APIRoute = async ({ request }) => {
	if (request.method !== 'POST') {
		return methodNotAllowed();
	}

	if (!isSameOrigin(request)) {
		return jsonResponse({ code: 'forbidden', message: 'Request not allowed.' }, 403);
	}

	if (exceedsRateLimit(getRateLimitKey(request))) {
		return jsonResponse({ code: 'rate_limited', message: 'Please try again later.' }, 429);
	}

	if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
		return jsonResponse({ code: 'invalid_request', message: 'Invalid request.' }, 415);
	}

	const parsedBody = await readBody(request);
	if (parsedBody === 'too_large') {
		return jsonResponse({ code: 'request_too_large', message: 'Invalid request.' }, 413);
	}

	if (!isContactPayload(parsedBody)) {
		return jsonResponse({ code: 'invalid_request', message: 'Please check the form and try again.' }, 400);
	}

	const values = getValidatedValues(parsedBody);
	if (!values) {
		return jsonResponse({ code: 'invalid_request', message: 'Please check the form and try again.' }, 400);
	}

	const supabaseUrl = getRequiredEnvironmentValue('SUPABASE_URL');
	const supabaseSecretKey = getRequiredEnvironmentValue('SUPABASE_SECRET_KEY');
	const resendApiKey = getRequiredEnvironmentValue('RESEND_API_KEY');
	const recipientEmail = getRequiredEnvironmentValue('CONTACT_RECIPIENT_EMAIL');
	const fromEmail = getRequiredEnvironmentValue('RESEND_FROM_EMAIL');

	if (!supabaseUrl || !supabaseSecretKey || !resendApiKey || !recipientEmail || !fromEmail) {
		return jsonResponse({ code: 'service_unavailable', message: 'The contact service is temporarily unavailable.' }, 503);
	}

	const supabase = createClient(supabaseUrl, supabaseSecretKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		}
	});

	try {
		const { error } = await supabase.from('contact_messages').insert({
			name: values.name,
			email: values.email,
			subject: values.subject,
			message: values.message
		});

		if (error) {
			return jsonResponse({ code: 'storage_failed', message: 'We couldn’t save your message right now. Please try again later.' }, 500);
		}
	} catch {
		return jsonResponse({ code: 'storage_failed', message: 'We couldn’t save your message right now. Please try again later.' }, 500);
	}

	const resend = new Resend(resendApiKey);
	const escapedName = escapeHtml(values.name);
	const escapedEmail = escapeHtml(values.email);
	const escapedSubject = escapeHtml(values.subject);
	const escapedMessage = escapeHtml(values.message).replace(/\r?\n/g, '<br />');

	try {
		const { error } = await resend.emails.send({
			from: fromEmail,
			to: recipientEmail,
			replyTo: values.email,
			subject: `New portfolio contact: ${values.subject}`,
			text: `Name: ${values.name}\nEmail: ${values.email}\nSubject: ${values.subject}\n\n${values.message}`,
			html: `<p><strong>Name:</strong> ${escapedName}</p><p><strong>Email:</strong> ${escapedEmail}</p><p><strong>Subject:</strong> ${escapedSubject}</p><p>${escapedMessage}</p>`
		});

		if (error) {
			return jsonResponse({ code: 'notification_failed', message: 'Your message was saved, but notification delivery is temporarily delayed.' }, 202);
		}
	} catch {
		return jsonResponse({ code: 'notification_failed', message: 'Your message was saved, but notification delivery is temporarily delayed.' }, 202);
	}

	return jsonResponse({ code: 'sent', message: 'Your message was sent successfully.' }, 200);
};

export const GET: APIRoute = methodNotAllowed;
