import React from "react";
import "./StatCard.css";

const StatCard = ({ label, value, color }) => {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value" style={{ color }}>
        {value}
      </div>
    </div>
  );
};

export default StatCard;