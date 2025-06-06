// src/components/ConfigurarCategorias.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, Tag, TrendingUp, TrendingDown, X } from "lucide-react";
import "./ConfigurarCategorias.css";


const ConfigurarCategorias = () => {
  const [categorias, setCategorias] = useState({ expense: [], income: [] });
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("expense");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await axios.get(Process.env.GATEWAY_URL+"/categories", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategorias(res.data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategorias();
  }, [token]);

  const handleAddCategoria = async () => {
    if (!nuevoNombre.trim()) return;
    setIsLoading(true);
    try {
      const res = await axios.post("http://localhost:4000/categories", {
        name: nuevoNombre.trim(),
        type: nuevoTipo,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategorias((prev) => ({...prev,[nuevoTipo]: [...prev[nuevoTipo], nuevoNombre.trim()]}));
      setNuevoNombre("");
      setShowForm(false);
    } catch (error) {
      console.error("Error adding category:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategoria = async (type, name) => {
    try {
      const res = await axios.delete("http://localhost:4000/categorie", {
        headers: { Authorization: `Bearer ${token}` },
        data: { type, name },
      });
       setCategorias((prev) => ({
        ...prev,
        [type]: prev[type].filter((cat) => cat !== name),
      }));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const CategoryCard = ({ tipo, categorias: cats }) => (
    <div className="category-card">
      <div className={`category-header ${tipo === "expense" ? "expense-header" : "income-header"}`}>
        <div className="header-content">
          {tipo === "expense" ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
          <h3 className="header-title">
            {tipo === "expense" ? "Categorías de Gastos" : "Categorías de Ingresos"}
          </h3>
        </div>
        <p className="header-subtitle">
          {cats.length} {cats.length === 1 ? "categoría" : "categorías"}
        </p>
      </div>
      
      <div className="category-content">
        {cats.length === 0 ? (
          <div className="empty-state">
            <Tag size={48} className="empty-icon" />
            <p className="empty-title">No hay categorías</p>
            <p className="empty-subtitle">Añade tu primera categoría para empezar</p>
          </div>
        ) : (
          <div className="categories-list">
            {cats.map((cat, index) => (
              <div
                key={cat}
                className="category-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="category-info">
                  <div className={`category-dot ${tipo === "expense" ? "expense-dot" : "income-dot"}`}></div>
                  <span className="category-name">{cat}</span>
                </div>
                <button
                  onClick={() => handleDeleteCategoria(tipo, cat)}
                  className="delete-button"
                  title="Eliminar categoría"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="main-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">
            Configurar Categorías
          </h1>
          <p className="main-subtitle">
            Organiza tus finanzas creando y gestionando categorías personalizadas para tus gastos e ingresos
          </p>
        </div>

        {/* Action Button */}
        <div className="action-section">
          <button
            onClick={() => setShowForm(!showForm)}
            className="add-button"
          >
            <Plus size={20} />
            <span>Nueva Categoría</span>
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Añadir Categoría</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="close-button"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    Nombre de la categoría
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Alimentación, Salario..."
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Tipo de categoría
                  </label>
                  <select
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    className="form-select"
                  >
                    <option value="expense">💸 Gasto</option>
                    <option value="income">💰 Ingreso</option>
                  </select>
                </div>
                
                <div className="modal-actions">
                  <button
                    onClick={() => setShowForm(false)}
                    className="cancel-button"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddCategoria}
                    disabled={!nuevoNombre.trim() || isLoading}
                    className="submit-button"
                  >
                    {isLoading ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Añadir</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="categories-grid">
          <CategoryCard tipo="expense" categorias={categorias.expense} />
          <CategoryCard tipo="income" categorias={categorias.income} />
        </div>

        {/* Stats Summary */}
        <div className="stats-container">
          <h3 className="stats-title">Resumen</h3>
          <div className="stats-grid">
            <div className="stat-card expense-stat">
              <TrendingDown className="stat-icon" size={32} />
              <div className="stat-number">{categorias.expense.length}</div>
              <div className="stat-label">Categorías de Gastos</div>
            </div>
            <div className="stat-card income-stat">
              <TrendingUp className="stat-icon" size={32} />
              <div className="stat-number">{categorias.income.length}</div>
              <div className="stat-label">Categorías de Ingresos</div>
            </div>
            <div className="stat-card total-stat">
              <Tag className="stat-icon" size={32} />
              <div className="stat-number">{categorias.expense.length + categorias.income.length}</div>
              <div className="stat-label">Total Categorías</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurarCategorias;