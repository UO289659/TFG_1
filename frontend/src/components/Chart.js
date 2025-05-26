import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Chart.css"; // Estilos personalizados

const Chart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const response = await axios.get("http://localhost:4000/gastos");
        setData(response.data);
      } catch (error) {
        console.error("Error al obtener los gastos:", error);
        setError("Error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };
    fetchGastos();
  }, []);

  if (loading) return <p className="text-center mt-4">Cargando datos...</p>;
  if (error) return <p className="text-center mt-4 text-danger">{error}</p>;

  return (
    <div className="container text-center mt-4">
      <h2 className="chart-title">Balance Total</h2>

      <PieChart width={300} height={300}>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      <div className="category-list">
        {data.map((item, index) => (
          <div key={index} className="category-item" style={{ borderLeft: `5px solid ${item.color}` }}>
            <span>{item.name}</span>
            <span>{((item.value / 2845) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Chart;
