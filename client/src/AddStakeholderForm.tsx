import { useState } from 'react';
import { apiPost, apiPatch, apiDelete } from './api';
import {
  RELATIONSHIPS,
  validateCreateStakeholder,
  validateUpdateStakeholder,
  type CreateStakeholderFieldErrors,
  type CreateStakeholderResponse,
  type StakeholderPositionDTO,
  type UpdateStakeholderRequest,
} from '../../shared';

// Same form serves both flows. In "edit" mode it pre-fills from the selected
// stakeholder and PATCHes only the changed fields.
export type StakeholderFormMode =
  | { kind: 'add' }
  | { kind: 'edit'; stakeholder: StakeholderPositionDTO };

interface AddStakeholderFormProps {
  projectId: string;
  mode: StakeholderFormMode;
  onCancel: () => void;
  onSaved: () => void;
}

const DEFAULT_POWER = 5;
const DEFAULT_INTEREST = 5;
const DEFAULT_RELATIONSHIP = 3; // Neutral

const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: 4 };
const fieldStyle: React.CSSProperties = { marginBottom: 14 };
const errorStyle: React.CSSProperties = { color: '#C0392B', fontSize: 13, marginTop: 4 };
// Destructive action: muted-red text + outline, clearly distinct from Save.
const deleteButtonStyle: React.CSSProperties = {
  color: '#C0392B',
  background: 'none',
  border: '1px solid #e3b4ae',
  borderRadius: 4,
  padding: '6px 10px',
  cursor: 'pointer',
};

// Normalise free text the same way the server does, so the change-diff compares
// like with like (trim; empty → null for the optional fields).
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export default function AddStakeholderForm({ projectId, mode, onCancel, onSaved }: AddStakeholderFormProps) {
  const initial = mode.kind === 'edit' ? mode.stakeholder : null;

  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [organisation, setOrganisation] = useState(initial?.organisation ?? '');
  const [power, setPower] = useState(initial?.power ?? DEFAULT_POWER);
  const [interest, setInterest] = useState(initial?.interest ?? DEFAULT_INTEREST);
  const [relationship, setRelationship] = useState(initial?.relationship ?? DEFAULT_RELATIONSHIP);

  const [errors, setErrors] = useState<CreateStakeholderFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = mode.kind === 'edit';

  // Clear a field's inline error as the user edits it.
  function clearError(field: keyof CreateStakeholderFieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  // Fields that differ from the original (edit mode only). null role/org clears.
  function buildDiff(current: StakeholderPositionDTO): UpdateStakeholderRequest {
    const diff: UpdateStakeholderRequest = {};
    const nameNorm = name.trim();
    const roleNorm = emptyToNull(role);
    const orgNorm = emptyToNull(organisation);
    if (nameNorm !== current.name) diff.name = nameNorm;
    if (roleNorm !== current.role) diff.role = roleNorm;
    if (orgNorm !== current.organisation) diff.organisation = orgNorm;
    if (power !== current.power) diff.power = power;
    if (interest !== current.interest) diff.interest = interest;
    if (relationship !== current.relationship) diff.relationship = relationship;
    return diff;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (mode.kind === 'edit') {
      const diff = buildDiff(mode.stakeholder);
      // No changes: close without an API call (acts like Cancel).
      if (Object.keys(diff).length === 0) {
        onCancel();
        return;
      }
      const result = validateUpdateStakeholder(diff);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      setSubmitting(true);
      try {
        await apiPatch<StakeholderPositionDTO>(
          `/api/projects/${projectId}/stakeholders/${mode.stakeholder.id}`,
          result.value,
        );
        onSaved();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        setSubmitting(false);
      }
      return;
    }

    // Add mode.
    const result = validateCreateStakeholder({ name, role, organisation, power, interest, relationship });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await apiPost<CreateStakeholderResponse>(`/api/projects/${projectId}/stakeholders`, result.value);
      onSaved();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // Remove this stakeholder from the project (edit mode only). On error, stay in
  // the confirmation state so the user can retry.
  async function handleDelete() {
    if (mode.kind !== 'edit') return;
    setSubmitError(null);
    setDeleting(true);
    try {
      await apiDelete(`/api/projects/${projectId}/stakeholders/${mode.stakeholder.id}`);
      onSaved();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not delete. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: '1px solid #d9d7cf',
        borderRadius: 8,
        padding: 20,
        margin: '12px 0 20px',
        background: '#fbfaf6',
        maxWidth: 480,
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 18 }}>{isEdit ? 'Edit stakeholder' : 'Add stakeholder'}</h2>

      <div style={fieldStyle}>
        <label htmlFor="sf-name" style={labelStyle}>
          Name <span style={{ color: '#C0392B' }}>*</span>
        </label>
        <input
          id="sf-name"
          type="text"
          value={name}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value);
            clearError('name');
          }}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
        {errors.name && <div style={errorStyle}>{errors.name}</div>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="sf-role" style={labelStyle}>
          Role
        </label>
        <input
          id="sf-role"
          type="text"
          value={role}
          maxLength={100}
          onChange={(e) => {
            setRole(e.target.value);
            clearError('role');
          }}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
        {errors.role && <div style={errorStyle}>{errors.role}</div>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="sf-org" style={labelStyle}>
          Organisation
        </label>
        <input
          id="sf-org"
          type="text"
          value={organisation}
          maxLength={100}
          onChange={(e) => {
            setOrganisation(e.target.value);
            clearError('organisation');
          }}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
        {errors.organisation && <div style={errorStyle}>{errors.organisation}</div>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="sf-power" style={labelStyle}>
          Power: {power}
        </label>
        <input
          id="sf-power"
          type="range"
          min={1}
          max={10}
          value={power}
          onChange={(e) => {
            setPower(Number(e.target.value));
            clearError('power');
          }}
          style={{ width: '100%' }}
        />
        {errors.power && <div style={errorStyle}>{errors.power}</div>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="sf-interest" style={labelStyle}>
          Interest: {interest}
        </label>
        <input
          id="sf-interest"
          type="range"
          min={1}
          max={10}
          value={interest}
          onChange={(e) => {
            setInterest(Number(e.target.value));
            clearError('interest');
          }}
          style={{ width: '100%' }}
        />
        {errors.interest && <div style={errorStyle}>{errors.interest}</div>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="sf-relationship" style={labelStyle}>
          Relationship
        </label>
        <select
          id="sf-relationship"
          value={relationship}
          onChange={(e) => {
            setRelationship(Number(e.target.value));
            clearError('relationship');
          }}
          style={{ width: '100%', padding: 8 }}
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label} ({r.value})
            </option>
          ))}
        </select>
        {errors.relationship && <div style={errorStyle}>{errors.relationship}</div>}
      </div>

      {submitError && (
        <div style={{ ...errorStyle, marginBottom: 12 }} role="alert">
          {submitError}
        </div>
      )}

      {confirmingDelete ? (
        // Inline confirmation: Save/Cancel hidden, fields preserved.
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#C0392B', fontWeight: 600 }}>Remove from this project?</span>
          <button type="button" onClick={handleDelete} disabled={deleting} style={deleteButtonStyle}>
            {deleting ? 'Deleting…' : 'Yes, remove'}
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
            No
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isEdit ? (
            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                setConfirmingDelete(true);
              }}
              disabled={submitting}
              style={deleteButtonStyle}
            >
              Delete from project
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add stakeholder'}
            </button>
            <button type="button" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
