import { useState } from 'react';
import { apiPost } from './api';
import {
  RELATIONSHIPS,
  validateCreateStakeholder,
  type CreateStakeholderFieldErrors,
  type CreateStakeholderResponse,
} from '../../shared';

interface AddStakeholderFormProps {
  projectId: string;
  onCancel: () => void;
  onCreated: () => void;
}

const DEFAULT_POWER = 5;
const DEFAULT_INTEREST = 5;
const DEFAULT_RELATIONSHIP = 3; // Neutral

const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: 4 };
const fieldStyle: React.CSSProperties = { marginBottom: 14 };
const errorStyle: React.CSSProperties = { color: '#C0392B', fontSize: 13, marginTop: 4 };

export default function AddStakeholderForm({ projectId, onCancel, onCreated }: AddStakeholderFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [power, setPower] = useState(DEFAULT_POWER);
  const [interest, setInterest] = useState(DEFAULT_INTEREST);
  const [relationship, setRelationship] = useState(DEFAULT_RELATIONSHIP);

  const [errors, setErrors] = useState<CreateStakeholderFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Clear a field's inline error as the user edits it.
  function clearError(field: keyof CreateStakeholderFieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Validate with the same shared validator the server uses.
    const result = validateCreateStakeholder({ name, role, organisation, power, interest, relationship });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      await apiPost<CreateStakeholderResponse>(`/api/projects/${projectId}/stakeholders`, result.value);
      onCreated();
    } catch (err) {
      // Server/network error: keep the form open so the user can retry.
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
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
      <h2 style={{ marginTop: 0, fontSize: 18 }}>Add stakeholder</h2>

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

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add stakeholder'}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
