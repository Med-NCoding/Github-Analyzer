function RoleSelector({ value, onChange, disabled }) {
  return (
    <div className="field">
      <label htmlFor="target-role">Target role</label>
      <select
        id="target-role"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {TARGET_ROLES.map((role) => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
    </div>
  )
}

export const TARGET_ROLES = [
  'Software Engineering',
  'AI Engineering',
  'Machine Learning',
  'Data Science',
  'Frontend Engineering',
  'Backend Engineering',
  'Full-Stack Engineering',
]

export default RoleSelector
