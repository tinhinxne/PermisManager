import React from "react";

const Card = ({ title, value, period, color = "#333", bgColor = "#F1F5F9", strokeColor = "#011659" }) => {
  return (
    <div
      style={{
        background: bgColor,
        padding: "20px",
        borderRadius: "15px",
        border: `1px solid ${strokeColor}`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        transition: "transform 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <h4
        style={{
          color: "#777",
          marginBottom: "10px",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        {title}
      </h4>
      <div
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: color,
          marginBottom: "8px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#999",
          marginTop: "5px",
        }}
      >
        {period}
      </div>
    </div>
  );
};

export default Card;