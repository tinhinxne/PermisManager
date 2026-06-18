import React from "react";

const Select = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  disabled = false,
}) => {
  const selectStyle = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${error ? "#DC2626" : "#4E96E1"}`,
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: disabled ? "#f5f5f5" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
  };

  const errorStyle = {
    color: "#DC2626",
    fontSize: "12px",
    marginTop: "4px",
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "#26957A";
    e.target.style.boxShadow = "0 0 0 3px rgba(38, 149, 122, 0.1)";
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = error ? "#DC2626" : "#4E96E1";
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: "#DC2626", marginLeft: "4px" }}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={selectStyle}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <option value="">{placeholder || "Sélectionner"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
};

export default Select;