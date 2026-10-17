// src/lib/case-study-schema.ts — Structured Case-Study Document Schema & Standard Template

export interface CaseStudySpecRow {
	label: string;
	value: string;
	description?: string;
}

export interface CaseStudyVisual {
	type: 'none' | 'image' | 'placeholder';
	url?: string;
	caption?: string;
	title?: string;
	description?: string;
}

export interface CaseStudyCallout {
	text: string;
	label?: string;
}

export interface CaseStudySection {
	id: string;
	heading: string;
	badge?: string;
	subheading?: string;
	body: string;
	list_items?: string[];
	specs?: CaseStudySpecRow[];
	callout?: CaseStudyCallout;
	visual?: CaseStudyVisual;
}

export interface CaseStudyMetadata {
	subtitle?: string;
	status_label?: string;
	system_role?: string;
	core_platform?: string;
	evidence_tier?: string;
	diagram_type?: 'none' | 'image' | 'placeholder';
	diagram_url?: string;
	diagram_caption?: string;
	additional_links?: Array<{ label: string; url: string }>;
}

export interface CaseStudyDocument {
	__version: 1;
	metadata: CaseStudyMetadata;
	sections: CaseStudySection[];
	plain_text_fallback?: string;
}

export function slugifyHeading(heading: string): string {
	return heading
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'section';
}

export const DEFAULT_ENGINEERING_TEMPLATE: CaseStudyDocument = {
	__version: 1,
	metadata: {
		subtitle: 'SYSTEM SPECIFICATION',
		status_label: 'PROTOTYPE DESIGN',
		system_role: 'Lead Systems Engineer',
		core_platform: 'Microcontroller / Embedded C++',
		evidence_tier: 'Tier 2: System Architecture',
		diagram_type: 'placeholder',
		diagram_caption: 'FIGURE 1.0 // System Block Diagram & Architecture',
		additional_links: []
	},
	sections: [
		{
			id: 'overview',
			heading: 'Project Overview & Engineering Scope',
			badge: '01 //',
			body: 'Provide a concise overview of this engineering system. Describe the core problem it solves, the operating constraints, and your specific technical responsibilities in designing and implementing it.'
		},
		{
			id: 'context',
			heading: 'Problem Context & Objectives',
			badge: '02 //',
			body: 'Detail why existing approaches or baseline setups fall short, and specify the concrete measurable engineering goals this system was developed to achieve.',
			list_items: [
				'Objective 1: Specify primary performance target or precision requirement.',
				'Objective 2: Define operational constraint (power budget, latency, component availability).',
				'Objective 3: Establish verification criteria and boundary conditions.'
			]
		},
		{
			id: 'architecture',
			heading: 'System Architecture & Signal Path',
			badge: '03 //',
			body: 'Explain how sensory inputs, processing units, actuation blocks, and telemetry interfaces communicate across the system.',
			visual: {
				type: 'placeholder',
				title: 'System Block Diagram',
				description: 'Upload or link an architecture schematic or signal flow diagram.'
			},
			callout: {
				label: 'ARCHITECTURE NOTE',
				text: 'Document any key trade-offs made between hardware complexity and firmware execution overhead.'
			}
		},
		{
			id: 'subsystems',
			heading: 'Subsystem Breakdown & Specifications',
			badge: '04 //',
			body: 'Detailed breakdown of the primary subsystems comprising the design:',
			specs: [
				{
					label: 'SUBSYSTEM A // ACQUISITION',
					value: 'Sensory Frontend',
					description: 'Sensor interfaces, signal conditioning, filtering stages, and ADC resolution.'
				},
				{
					label: 'SUBSYSTEM B // PROCESSING',
					value: 'Firmware / Computation',
					description: 'Control loop execution, timing constraints, RTOS tasks, and decision state-machines.'
				},
				{
					label: 'SUBSYSTEM C // ACTUATION',
					value: 'Power & Output Drivers',
					description: 'Power switching stages, isolation, drivers, and output mechanisms.'
				}
			]
		},
		{
			id: 'limitations',
			heading: 'Engineering Considerations & Next Steps',
			badge: '05 //',
			body: 'Honest evaluation of system limitations and future design iterations:',
			list_items: [
				'Identified limitation or thermal/noise constraint encountered during testing.',
				'Component revision or dedicated PCB layout planned for the next hardware iteration.',
				'Firmware optimizations planned to reduce latency or current draw.'
			]
		}
	]
};

export function sanitizeDiagramType(raw: unknown): 'none' | 'image' | 'placeholder' {
	if (raw === 'image') return 'image';
	if (raw === 'placeholder') return 'placeholder';
	if (raw === 'none') return 'none';
	// If a legacy diagram type or unrecognized non-empty string is encountered,
	// gracefully fallback to 'placeholder' so the technical artifact frame remains intact.
	if (typeof raw === 'string' && raw.trim().length > 0) {
		return 'placeholder';
	}
	return 'none';
}

export function parseCaseStudy(
	rawDescription: string | null | undefined,
	fallbackSummary?: string,
	fallbackType?: string
): CaseStudyDocument {
	if (!rawDescription || rawDescription.trim().length === 0) {
		const doc = JSON.parse(JSON.stringify(DEFAULT_ENGINEERING_TEMPLATE)) as CaseStudyDocument;
		if (fallbackSummary) {
			doc.sections[0].body = fallbackSummary;
		}
		if (fallbackType) {
			doc.metadata.status_label = fallbackType.toUpperCase();
		}
		return doc;
	}

	const trimmed = rawDescription.trim();

	// Check if this is a serialized JSON case-study document
	if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
		try {
			const parsed = JSON.parse(trimmed) as Partial<CaseStudyDocument>;
			if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
				return {
					__version: 1,
					metadata: {
						subtitle: parsed.metadata?.subtitle || 'ENGINEERING SPECIFICATION',
						status_label: parsed.metadata?.status_label || 'PROTOTYPE DESIGN',
						system_role: parsed.metadata?.system_role || 'Lead Engineer',
						core_platform: parsed.metadata?.core_platform || 'Standard Platform',
						evidence_tier: parsed.metadata?.evidence_tier || 'Tier 2: System Architecture',
						diagram_type: sanitizeDiagramType(parsed.metadata?.diagram_type),
						diagram_url: parsed.metadata?.diagram_url || '',
						diagram_caption: parsed.metadata?.diagram_caption || '',
						additional_links: parsed.metadata?.additional_links || []
					},
					sections: parsed.sections.map((sec, idx) => ({
						id: sec.id || `section-${idx + 1}`,
						heading: sec.heading || `Section ${idx + 1}`,
						badge: sec.badge || `${String(idx + 1).padStart(2, '0')} //`,
						subheading: sec.subheading || '',
						body: sec.body || '',
						list_items: Array.isArray(sec.list_items) ? sec.list_items : [],
						specs: Array.isArray(sec.specs) ? sec.specs : [],
						callout: sec.callout ? { text: sec.callout.text, label: sec.callout.label } : undefined,
						visual: sec.visual ? {
							type: sanitizeDiagramType(sec.visual.type),
							url: sec.visual.url,
							caption: sec.visual.caption,
							title: sec.visual.title,
							description: sec.visual.description
						} : undefined
					})),
					plain_text_fallback: parsed.plain_text_fallback || trimmed
				};
			}
		} catch {
			// Fallback to plain-text parser below if JSON parse fails
		}
	}

	// Legacy or plain-text fallback: convert raw text into a single cohesive monograph section
	return {
		__version: 1,
		metadata: {
			subtitle: 'ENGINEERING SPECIFICATION',
			status_label: fallbackType ? fallbackType.toUpperCase() : 'DOCUMENTED SYSTEM',
			system_role: 'Lead Engineer',
			core_platform: 'Hardware & Software',
			evidence_tier: 'Tier 1: Documented Record',
			diagram_type: 'placeholder',
			diagram_caption: '',
			additional_links: []
		},
		sections: [
			{
				id: 'overview',
				heading: 'Technical Overview & System Specifications',
				badge: '01 //',
				body: trimmed
			}
		],
		plain_text_fallback: trimmed
	};
}

export function serializeCaseStudy(doc: CaseStudyDocument): string {
	return JSON.stringify(doc);
}
