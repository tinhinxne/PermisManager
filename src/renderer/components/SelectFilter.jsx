
import React from "react";
import "./SelectFilter.css";

const SelectFilter = ({ value, onChange, options, label }) => {
  return (
    <select
      className="select-filter"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => {
        const optValue = typeof option === "object" ? option.value : option;
        const optLabel = typeof option === "object" ? option.label : option;
        return (
          <option key={optValue} value={optValue}>
            {optValue === "Tous" ? `${label} ` : optLabel}
          </option>
        );
      })}
    </select>
  );
};

export default SelectFilter;

