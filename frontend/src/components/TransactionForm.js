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
    category: expenseCategories.length > 0 ? expenseCategories[0].name : "",
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
        ? incomeCategories[0].name|| "" 
        : expenseCategories[0].name || "";

      setFormData(prev => ({
        ...prev,
        type: value,
        category: firstCategory,
        sharedWith: (value === "expense" && isPremium) ? prev.sharedWith : [],
      }));
   } else if (name === "value") {
  // Permitir vacío mientras escribe
  if (value === "" || value === null) {
    setFormData(prev => ({
      ...prev,
      value: value,
    }));
  } else {
    const floatValue = parseFloat(value);
    if (!isNaN(floatValue) && floatValue >= 0) {
      const roundedValue = parseFloat(floatValue.toFixed(2));
      setFormData(prev => ({
        ...prev,
        value: roundedValue,
      }));
    }
  }
     
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    //Limpiar customAmounts antes de enviar
    const cleanedFormData = { ...formData };
    
    if (formData.splitType === 'custom') {
      // Filtrar solo los montos válidos (> 0)
      const validCustomAmounts = {};
      
      Object.entries(formData.customAmounts).forEach(([participantId, amount]) => {
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
          validCustomAmounts[participantId] = numAmount;
        }
      });
      
      cleanedFormData.customAmounts = validCustomAmounts;
      
      // También filtrar sharedWith para que coincida con los que tienen montos válidos
      cleanedFormData.sharedWith = formData.sharedWith.filter(friendId => 
        validCustomAmounts[friendId] > 0
      );
      
    }
    
    onSubmit(cleanedFormData);
  };

  const friendsOptions = friends.map(friend => ({
    value: friend._id,
    label: friend.name
  }));

  // Función helper para manejar cambios en customAmounts
  const handleCustomAmountChange = (participantId, inputValue) => {
    
    if (inputValue === "" || inputValue === null || inputValue === undefined) {
      // Si el campo está vacío, remover la entrada en lugar de poner 0
      setFormData(prev => {
        const newCustomAmounts = { ...prev.customAmounts };
        delete newCustomAmounts[participantId];
        
        return {
          ...prev,
          customAmounts: newCustomAmounts
        };
      });
    } else {
      const amount = parseFloat(inputValue);
      
      if (!isNaN(amount) && amount > 0) {
        const roundedAmount = Math.round(amount * 100) / 100;
        // Solo guardar si es un número válido y mayor que 0
        setFormData(prev => ({
          ...prev,
          customAmounts: { ...prev.customAmounts, [participantId]: roundedAmount }
        }));
        
      } else {
        console.log("❌ Monto inválido, no se guarda:", { participantId, inputValue, amount });
      }
    }
  };

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
                <option key={cat.name} value={cat.name}>
                  {cat.name}
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
          <label className="my-form-label">Compartir gasto con:
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
          </label>

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
                  {/* Mostrar campo para el creador si estamos editando */}
                  {isEditing && (
                    <div>
                      <label>Tú (creador):</label>
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.customAmounts[formData.clientId] || ""}
                        onChange={(e) => {
                          handleCustomAmountChange(formData.clientId, e.target.value);
                        }}
                      />
                    </div>
                  )}
                  {/* Mostrar campos para los amigos */}
                  {formData.sharedWith.map(friendId => {
                    const friend = friends.find(f => f._id === friendId);
                    return (
                      <div key={friendId}>
                        <label>{friend?.name || "Amigo"}:</label>
                        <input
                        required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={formData.customAmounts[friendId] || ""}
                          onChange={(e) => {
                            handleCustomAmountChange(friendId, e.target.value);
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