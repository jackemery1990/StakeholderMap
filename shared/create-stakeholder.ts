import type { StakeholderPositionDTO } from './index';
import { RELATIONSHIP_VALUES } from './relationships';

/** Request body for POST /api/projects/:projectId/stakeholders. */
export interface CreateStakeholderRequest {
  name: string;
  role?: string | null;
  organisation?: string | null;
  power: number; // 1–10
  interest: number; // 1–10
  relationship: number; // 1–5
}

/** 201 body: the created stakeholder + position, same shape as a GET entry. */
export type CreateStakeholderResponse = StakeholderPositionDTO;

/** Per-field validation messages, keyed by the field they belong to. */
export type CreateStakeholderFieldErrors = Partial<
  Record<keyof CreateStakeholderRequest, string>
>;

export type CreateStakeholderValidation =
  | { ok: true; value: CreateStakeholderRequest }
  | { ok: false; errors: CreateStakeholderFieldErrors };

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

// Optional free-text field: empty/absent → null, otherwise trimmed and length-
// capped. Records an error (and returns null) if present but invalid.
function optionalText(
  value: unknown,
  label: 'Role' | 'Organisation',
): { value: string | null; error?: string } {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value !== 'string') return { value: null, error: `${label} must be text.` };
  const trimmed = value.trim();
  if (trimmed.length > 100) return { value: null, error: `${label} must be 100 characters or fewer.` };
  return { value: trimmed === '' ? null : trimmed };
}

/**
 * Validate and normalise an add-stakeholder payload. Shared by the client form
 * (inline field errors) and the server endpoint (authoritative 400). On success
 * returns the trimmed/normalised value ready to persist.
 */
export function validateCreateStakeholder(input: unknown): CreateStakeholderValidation {
  const errors: CreateStakeholderFieldErrors = {};
  const data: Record<string, unknown> =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (name.length === 0) errors.name = 'Name is required.';
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.';

  const role = optionalText(data.role, 'Role');
  if (role.error) errors.role = role.error;

  const organisation = optionalText(data.organisation, 'Organisation');
  if (organisation.error) errors.organisation = organisation.error;

  if (!isInt(data.power) || data.power < 1 || data.power > 10) {
    errors.power = 'Power must be a whole number from 1 to 10.';
  }
  if (!isInt(data.interest) || data.interest < 1 || data.interest > 10) {
    errors.interest = 'Interest must be a whole number from 1 to 10.';
  }
  if (!isInt(data.relationship) || !RELATIONSHIP_VALUES.includes(data.relationship)) {
    errors.relationship = 'Relationship must be one of the five options.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      role: role.value,
      organisation: organisation.value,
      power: data.power as number,
      interest: data.interest as number,
      relationship: data.relationship as number,
    },
  };
}

/** Request body for PATCH /api/projects/:projectId/stakeholders/:stakeholderId. */
export interface UpdateStakeholderRequest {
  name?: string;
  role?: string | null; // null clears the field
  organisation?: string | null; // null clears the field
  power?: number; // 1–10
  interest?: number; // 1–10
  relationship?: number; // 1–5
}

export type UpdateStakeholderValidation =
  | { ok: true; value: UpdateStakeholderRequest }
  | { ok: false; errors: CreateStakeholderFieldErrors };

/**
 * Validate a partial update. Only fields PRESENT in the input are validated and
 * returned; absent fields mean "leave unchanged". role/organisation may be null
 * (to clear them); name, if present, must be a non-empty string. Field rules
 * otherwise match create. Reuses the same per-field helpers as create.
 */
export function validateUpdateStakeholder(input: unknown): UpdateStakeholderValidation {
  const errors: CreateStakeholderFieldErrors = {};
  const data: Record<string, unknown> =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const value: UpdateStakeholderRequest = {};

  if ('name' in data) {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (typeof data.name !== 'string' || name.length === 0) errors.name = 'Name is required.';
    else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.';
    else value.name = name;
  }

  if ('role' in data) {
    const r = optionalText(data.role, 'Role');
    if (r.error) errors.role = r.error;
    else value.role = r.value;
  }

  if ('organisation' in data) {
    const o = optionalText(data.organisation, 'Organisation');
    if (o.error) errors.organisation = o.error;
    else value.organisation = o.value;
  }

  if ('power' in data) {
    if (!isInt(data.power) || data.power < 1 || data.power > 10) {
      errors.power = 'Power must be a whole number from 1 to 10.';
    } else value.power = data.power;
  }

  if ('interest' in data) {
    if (!isInt(data.interest) || data.interest < 1 || data.interest > 10) {
      errors.interest = 'Interest must be a whole number from 1 to 10.';
    } else value.interest = data.interest;
  }

  if ('relationship' in data) {
    if (!isInt(data.relationship) || !RELATIONSHIP_VALUES.includes(data.relationship)) {
      errors.relationship = 'Relationship must be one of the five options.';
    } else value.relationship = data.relationship;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}
