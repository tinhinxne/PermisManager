import React from "react";

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  rows,
  textarea = false,
}) => {
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${error ? "#DC2626" : "#4E96E1"}`,
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s",
    fontFamily: "inherit",
    resize: "vertical",
    backgroundColor: disabled ? "#f5f5f5" : "#fff",
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
      {textarea ? (
        <textarea
          rows={rows || 3}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
};

export default Input;