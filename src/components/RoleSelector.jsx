export const TARGET_ROLES = [
  'Software Engineering',
  'AI Engineering',
  'Machine Learning',
  'Data Science',
  'Frontend Engineering',
  'Backend Engineering',
  'Full-Stack Engineering',
]

function RoleSelector({ value, onChange, disabled }) {
  return (
    <div className="role-selector">
      <label htmlFor="target-role">Target co-op / internship role</label>
      <select
        id="target-role"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {TARGET_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  )
}

export default RoleSelector
