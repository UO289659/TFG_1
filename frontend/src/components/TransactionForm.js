import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import IconPicker from './IconPicker';

const TransactionForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  friends = [],
  expenseCategories = [],
  incomeCategories = [],
  iconOptions = [],
  isPremium = false,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "expense",
    category: "comida",
    value: "",
    icon: "💸",
    sharedWith: [],
    splitType: "equal",
    customAmounts: {},
    ...initialData
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "type") {
      const firstCategory = value === "income" 
        ? incomeCategories[0] || "" 
        : expenseCategories[0] || "";

      setFormData(prev => ({
        ...prev,
        type: value,
        category: firstCategory,
        sharedWith: (value === "expense" && isPremium) ? prev.sharedWith : [],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const friendsOptions = friends.map(friend => ({
    value: friend._id,
    label: friend.name
  }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="my-form-label">
          Nombre:
          <input
            placeholder="Ej: Alimentación, Salario..."
            className="form-input"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </label>
      </div>

      <div className="form-group">
        <label className="my-form-label">
          Tipo:
          <select
            className="form-select"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
          >
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </label>
      </div>

      <div className="form-group">
        <label className="my-form-label">
          Categoría:
          <select
            className="form-select"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
          >
            {(formData.type === "expense" ? expenseCategories : incomeCategories).map(
              (cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <label className="my-form-label">
        Valor:
        <input
          className="form-input"
          type="number"
          name="value"
          value={formData.value}
          onChange={handleInputChange}
          min="0.01" 
          step="0.01"
          required
        />
      </label>

      {/* Funcionalidad Premium - Compartir gastos */}
      {isPremium && formData.type === "expense" && (
        <>
          <label className="my-form-label">Compartir gasto con:</label>
          <Select
            isMulti
            value={friendsOptions.filter(option => formData.sharedWith.includes(option.value))}
            onChange={(selectedOptions) => {
              const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
              setFormData(prev => ({
                ...prev,
                sharedWith: selectedIds,
                splitType: selectedIds.length === 0 ? "equal" : prev.splitType,
                customAmounts: selectedIds.length === 0 ? {} : prev.customAmounts
              }));
            }}
            options={friendsOptions}
            placeholder="Selecciona amigos..."
            closeMenuOnSelect={false}
          />

          {formData.sharedWith.length > 0 && (
            <>
              <label className="my-form-label">Tipo de reparto:</label>
              <Select
                value={{
                  label: formData.splitType === "equal" ? "Reparto equitativo" : "Asignar cantidades",
                  value: formData.splitType
                }}
                onChange={(selected) =>
                  setFormData(prev => ({ ...prev, splitType: selected.value }))
                }
                options={[
                  { value: "equal", label: "Reparto equitativo" },
                  { value: "custom", label: "Asignar cantidades" }
                ]}
                placeholder="Selecciona tipo de reparto..."
                isSearchable={false}
              />

              {formData.splitType === "custom" && (
                <>
                  <label className="my-form-label">Distribución personalizada:</label>
                  {formData.sharedWith.map(friendId => {
                    const friend = friends.find(f => f._id === friendId);
                    return (
                      <div key={friendId}>
                        <label>{friend?.name || "Amigo"}:</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.customAmounts[friendId] || ""}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({
                              ...prev,
                              customAmounts: { ...prev.customAmounts, [friendId]: amount }
                            }));
                          }}
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </>
      )}

      {!isPremium && formData.type === "expense" && (
        <div className="upgrade-premium-message">
          💎 <strong>Función Premium:</strong> Actualiza a Premium para compartir gastos con amigos
        </div>
      )}

      <label className="my-form-label">Icono:</label>
      <IconPicker
        selectedIcon={formData.icon}
        onSelect={(icon) =>
          setFormData(prev => ({
            ...prev,
            icon,
          }))
        }
        iconOptions={iconOptions}
      />

      <div className="modal-actions">
        <button type="submit" className="submit-button">
          {isEditing ? 'Actualizar' : 'Crear'} Transacción
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;