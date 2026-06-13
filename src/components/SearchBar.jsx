function SearchBar({ value, onChange, onSearch, disabled }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      onSearch()
    }
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Enter GitHub username"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button type="button" onClick={onSearch} disabled={disabled}>
        Search
      </button>
    </div>
  )
}

export default SearchBar
