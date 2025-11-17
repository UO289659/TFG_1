// src/components/ConfigurarCategorias.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, Tag, TrendingUp, TrendingDown, X, AlertCircle, CheckCircle } from "lucide-react";
import "./ConfigurarCategorias.css";
import Footer from "./Footer.js";
import toast, { Toaster } from 'react-hot-toast';

const ConfigurarCategorias = () => {
  //const GATEWAY_URL = "http://localhost:4000"; 
  //const GATEWAY_URL = 'https://gateway-tfg.azure-api.net/transactions' || 'http://localhost:4000'; 
  const GATEWAY_URL = process.env.REACT_APP_GATEWAY_URL;
  const [categorias, setCategorias] = useState({ expense: [], income: [] });
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("expense");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setInitialLoading(true);
        
        const res = await axios.get(`${GATEWAY_URL}/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategorias(res.data);
      } catch (error) {
       toast.error(error.response?.data?.message || "Error al cargar las categorías");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCategorias();
  }, [token]);

  const handleAddCategoria = async () => {
    if (!nuevoNombre.trim()) {
       toast.error("El nombre de la categoría es obligatorio");
      return;
    }

    // Verificar si la categoría ya existe
    const categoriaExiste = categorias[nuevoTipo].some(
      cat => cat.name.toLowerCase() === nuevoNombre.trim().toLowerCase()
    );
    
    if (categoriaExiste) {
      toast.error("Esta categoría ya existe");
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post(`${GATEWAY_URL}/categories`, {
        name: nuevoNombre.trim(),
        type: nuevoTipo,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
        const nuevaCategoria = {
      name: nuevoNombre.trim(),
      categoryType: "CategoriaUsuario" // Marcar como categoría de usuario
    };
    
    setCategorias((prev) => ({
      ...prev,
      [nuevoTipo]: [...prev[nuevoTipo], nuevaCategoria] 
    }));
      
      setNuevoNombre("");
      setShowForm(false);
      toast.success(`Categoría "${nuevoNombre.trim()}" añadida correctamente`);
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al añadir la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategoria = async (type, name) => {
    try {
      const res = await axios.delete(`${GATEWAY_URL}/categorie`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { type, name },
      });
      
      setCategorias((prev) => ({
        ...prev,
        [type]: prev[type].filter((cat) => cat.name !== name),
      }));
      
      toast.success(`Categoría "${name}" eliminada correctamente`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al eliminar la categoría");
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
                key={cat.name}
                className="category-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="category-info">
                  <div className={`category-dot ${tipo === "expense" ? "expense-dot" : "income-dot"}`}></div>
                  <span className="category-name">{cat.name}</span>
                </div>
                
                {cat.categoryType === "CategoriaUsuario" ? (
                <button
                  onClick={() => handleDeleteCategoria(tipo, cat.name)}
                  className="delete-button"
                  title="Eliminar categoría"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <span className="read-only-indicator" title="Las categorías predeterminadas no se pueden eliminar">
                  🔒
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

  // Pantalla de carga inicial
  if (initialLoading) {
    return (
      <div className="main-container">
        <div className="content-wrapper">
          <div className="loading-container text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="text-muted">Cargando categorías...</p>
          </div>
        </div>
      </div>
    );
  }

   return (
    <div className="main-container">
      
      <div className="content-wrapper">
        {/* Header */}
        <div className="header-section">
          <h1 className="header-title">
            Configurar Categorías
          </h1>
          <p className="main-subtitle">
            Organiza tus finanzas creando y gestionando categorías personalizadas para tus gastos e ingresos
          </p>
        </div>

        {/* Action Button */}
        <div className="action-section">
          <button
            onClick={() => {
              setShowForm(!showForm);
            }}
            className="add-button"
          >
            <Plus size={20} />
            <span>Nueva Categoría</span>
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="my-modal-content">
              <div className="my-modal-header">
                <h3 className="my-modal-title">Añadir Categoría</h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setNuevoNombre("");
                  }}
                  className="close-button"
                  aria-label="Cerrar formulario"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="my-modal-body">
                <div className="form-group">
                  <label className="my-form-label">
                    Nombre de la categoría
                  <input
                    type="text"
                    placeholder="Ej: Alimentación, Salario..."
                    value={nuevoNombre}
                    onChange={(e) => {
                      setNuevoNombre(e.target.value);
                    }}
                    className="form-input"
                    autoFocus
                    maxLength={50} // Límite de caracteres
                  />
                   </label>
                  <small className="form-text text-muted">
                    {nuevoNombre.length}/50 caracteres
                  </small>
                </div>
                 
                
                <div className="form-group">
                  <label className="my-form-label">
                    Tipo de categoría
                  <select
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    className="form-select"
                  >
                    <option value="expense">💸 Gasto</option>
                    <option value="income">💰 Ingreso</option>
                  </select>
                   </label>
                </div>
                
                <div className="modal-actions">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNuevoNombre("");
                    }}
                    className="cancel-button"
                    disabled={isLoading}
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
      <Footer/>
    </div>
  );
};

export default ConfigurarCategorias;