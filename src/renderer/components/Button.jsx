import React from "react";

const Button = ({
  children,
  text,
  icon,
  showPlusIcon = false,
  onClick,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  type = "button",
  disabled = false,
}) => {
  const cssVars = `
    :root {
    --primary-blue: #2b537e;
      --primary-blue-hover: #2e7bd4;
      --primary-green: #26957A;
      --primary-green-hover: #1e7a63;
      --danger-red: #DC2626;
      --danger-red-hover: #b91c1c;
    }
  `;

  const colors = {
    primary: {
      background: "var(--primary-blue)",
      hover: "var(--primary-blue-hover)",
      color: "#fff",
    },
    secondary: {
      background: "var(--danger-red)",
      hover: "var(--danger-red-hover)",
      color: "#fff",
    },
    outline: {
      background: "transparent",
      hover: "var(--primary-blue)",
      color: "var(--primary-blue)",
      border: "1px solid var(--primary-blue)",
    },
  };

  const sizes = {
    small:  { padding: "6px 12px",   fontSize: "12px" },
    medium: { padding: "10px 20px",  fontSize: "14px" },
    large:  { padding: "12px 24px",  fontSize: "16px" },
  };

  const currentColor = colors[variant];
  const currentSize  = sizes[size];

  const styles = {
    background:   currentColor.background,
    color:        currentColor.color,
    padding:      currentSize.padding,
    fontSize:     currentSize.fontSize,
    border:       currentColor.border || "none",
    borderRadius: "10px",
    cursor:       disabled ? "not-allowed" : "pointer",
    fontWeight:   "700",
    transition:   "all 0.2s",
    width:        fullWidth ? "100%" : "auto",
    opacity:      disabled ? 0.6 : 1,
  };

  const label = text || children;

  return (
    <>
      <style>{cssVars}</style>
      <button
        type={type}
        style={styles}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = currentColor.hover;
            if (variant === "outline") {
              e.currentTarget.style.color  = "#fff";
              e.currentTarget.style.border = `1px solid ${currentColor.hover}`;
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = currentColor.background;
            if (variant === "outline") {
              e.currentTarget.style.color  = currentColor.color;
              e.currentTarget.style.border = currentColor.border;
            }
          }
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
          {(icon || showPlusIcon) && (
            <span style={{ fontSize: "18px", lineHeight: 1, fontWeight: 700 }}>
              {icon ?? "+"}
            </span>
          )}
          {label}
        </span>
      </button>
    </>
  );
};

export default Button;