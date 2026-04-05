import type { INodePropertyOptions } from 'n8n-workflow';

export const ASPECT_RATIO_PRESETS: INodePropertyOptions[] = [
	{ name: 'Default (omit)', value: '' },
	{ name: '1:1', value: '1:1' },
	{ name: '2:1 (landscape)', value: '2:1' },
	{ name: '1:2 (portrait)', value: '1:2' },
	{ name: '16:9', value: '16:9' },
	{ name: '9:16', value: '9:16' },
	{ name: 'Custom (width / height below)', value: 'custom' },
];

export function parseAspectPreset(
	value: string | number | boolean | object | null | undefined,
): { widthRatio: number; heightRatio: number } | null {
	if (!value || value === 'custom') return null;
	const parts = String(value).split(':');
	if (parts.length !== 2) return null;
	const w = Number(parts[0]);
	const h = Number(parts[1]);
	if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
	return { widthRatio: Math.trunc(w), heightRatio: Math.trunc(h) };
}
