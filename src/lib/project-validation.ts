export const projectTypes = ['project', 'concept', 'in_progress'] as const;

export type ProjectType = (typeof projectTypes)[number];

export interface ProjectFormValues {
	title: string;
	slug: string;
	summary: string;
	description: string;
	technologies: string[];
	project_type: ProjectType;
	is_featured: boolean;
	is_published: boolean;
	github_url: string | null;
	demo_url: string | null;
	sort_order: number;
}

export interface ProjectValidationResult {
	values?: ProjectFormValues;
	error?: string;
}

function getString(formData: FormData, name: string): string | null {
	const value = formData.get(name);
	return typeof value === 'string' ? value.trim() : null;
}

function getOptionalUrl(formData: FormData, name: string): string | null | 'invalid' {
	const value = getString(formData, name);

	if (!value) {
		return null;
	}

	try {
		const url = new URL(value);
		if (value.length > 2048 || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
			return 'invalid';
		}

		return url.toString();
	} catch {
		return 'invalid';
	}
}

function getBoolean(formData: FormData, name: string): boolean {
	return formData.getAll(name).includes('true');
}

export function validateProjectForm(formData: FormData): ProjectValidationResult {
	const title = getString(formData, 'title');
	const slug = getString(formData, 'slug');
	const summary = getString(formData, 'summary');
	const description = getString(formData, 'description');
	const projectType = getString(formData, 'project_type');
	const sortOrder = getString(formData, 'sort_order');
	const githubUrl = getOptionalUrl(formData, 'github_url');
	const demoUrl = getOptionalUrl(formData, 'demo_url');

	if (!title || title.length > 200) {
		return { error: 'Enter a title up to 200 characters.' };
	}

	if (!slug || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		return { error: 'Use a lowercase hyphen-separated slug.' };
	}

	if (!summary || summary.length > 500) {
		return { error: 'Enter a summary up to 500 characters.' };
	}

	if (!description || description.length > 100000) {
		return { error: 'Enter a description up to 100,000 characters.' };
	}

	if (!projectType || !projectTypes.includes(projectType as ProjectType)) {
		return { error: 'Choose a valid project type.' };
	}

	if (!sortOrder || !/^-?\d+$/.test(sortOrder)) {
		return { error: 'Sort order must be an integer.' };
	}

	const parsedSortOrder = Number(sortOrder);
	if (!Number.isSafeInteger(parsedSortOrder)) {
		return { error: 'Sort order must be a safe integer.' };
	}

	if (githubUrl === 'invalid' || demoUrl === 'invalid') {
		return { error: 'Links must use valid HTTP or HTTPS URLs.' };
	}

	const technologiesInput = getString(formData, 'technologies') ?? '';
	if (technologiesInput.length > 2000) {
		return { error: 'The technologies field is too long.' };
	}

	const technologies = technologiesInput
		.split(',')
		.map((technology) => technology.trim())
		.filter(Boolean);

	if (technologies.length > 20 || technologies.some((technology) => technology.length > 100)) {
		return { error: 'Enter up to 20 technologies, with each name up to 100 characters.' };
	}

	return {
		values: {
			title,
			slug,
			summary,
			description,
			technologies,
			project_type: projectType as ProjectType,
			is_featured: getBoolean(formData, 'is_featured'),
			is_published: getBoolean(formData, 'is_published'),
			github_url: githubUrl,
			demo_url: demoUrl,
			sort_order: parsedSortOrder
		}
	};
}
