// src/components/ConfigurarCategorias.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const ConfigurarCategorias = () => {
  const [categorias, setCategorias] = useState({ expense: [], income: [] });
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("expense");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCategorias = async () => {
      const res = await axios.get("http://localhost:4000/categorias", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategorias(res.data);
    };
    fetchCategorias();
  }, []);

  const handleAddCategoria = async () => {
    if (!nuevoNombre.trim()) return;
    const res = await axios.post("http://localhost:4000/categorias", {
      name: nuevoNombre.trim(),
      type: nuevoTipo,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCategorias(res.data); // Actualiza tras guardar
    setNuevoNombre("");
  };

  const handleDeleteCategoria = async (type, name) => {
    const res = await axios.delete("http://localhost:4000/categorias", {
      headers: { Authorization: `Bearer ${token}` },
      data: { type, name },
    });
    setCategorias(res.data);
  };

  return (
    <div className="config-categorias">
      <h2>Configurar Categorías</h2>
      <div>
        <input
          placeholder="Nueva categoría"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
        <button onClick={handleAddCategoria}>Añadir</button>
      </div>

      <div className="categoria-list">
        {["expense", "income"].map((tipo) => (
          <div key={tipo}>
            <h3>{tipo === "expense" ? "Gastos" : "Ingresos"}</h3>
            <ul>
              {categorias[tipo]?.map((cat) => (
                <li key={cat}>
                  {cat}
                  <button onClick={() => handleDeleteCategoria(tipo, cat)}>🗑️</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfigurarCategorias;
