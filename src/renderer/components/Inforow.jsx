import React from "react";
import "./InfoRow.css";

const InfoRow = ({ label, value }) => {
  return (
    <div className="info-row">
      <span className="info-row__label">{label}</span>
      <span className="info-row__value">{value}</span>
    </div>
  );
};

export default InfoRow;