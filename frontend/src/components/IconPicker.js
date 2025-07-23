import React from 'react';

const IconPicker = ({ selectedIcon, onSelect, iconOptions = [] }) => {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      {iconOptions.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onSelect(icon)}
          style={{
            fontSize: 28,
            padding: 6,
            borderRadius: 8,
            border: selectedIcon === icon ? "3px solid #4caf50" : "1px solid #ccc",
            background: selectedIcon === icon ? "#e8f5e9" : "white",
            cursor: "pointer",
            userSelect: "none",
          }}
          aria-label={`Seleccionar icono ${icon}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

export default IconPicker;