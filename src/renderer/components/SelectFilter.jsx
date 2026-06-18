import React from "react";
import "./SelectFilter.css";

const SelectFilter = ({ value, onChange, options, label }) => {
  return (
    <select
      className="select-filter"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === "Tous" ? `${label} ` : option}
        </option>
      ))}
    </select>
  );
};

export default SelectFilter;