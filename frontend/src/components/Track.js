import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Track.css";
import { jwtDecode } from "jwt-decode";
import { Doughnut, Line   } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
} from "chart.js";
import 'chartjs-adapter-date-fns';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, 
  LineElement,
  TimeScale
);

const categories = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },
  { id: "period", label: "Periodo" },
];
const expenseCategories = ["Comida", "Ropa", "Hogar", "Transporte", "Salud", "Regalo"];
const incomeCategories = ["Ahorro", "Salario", "Bonos", "Otros ingresos"];
const iconOptions = ["💸", "🍔", "🚗", "🏠", "💼", "🎁", "🎉", "📦",  "👚", "🏥", "💰", "🎓"];

const Track = () => {
  const [data, setData] = useState([]);
  const [balance, setBalance] = useState({ expense: 0, income: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("day");
  const [modalOpen, setModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
  name: "",
  type: "expense",
  category: "",  
  value: "",
  icon: "💸",
});


// Obtener categorías únicas de gastos y de ingresos por separado
const expenseCategoriesUnique = [...new Set(data.filter(i => i.type === "expense").map(i => i.category))];
const incomeCategoriesUnique = [...new Set(data.filter(i => i.type === "income").map(i => i.category))];

// Total por categoría gastos
const expenseData = expenseCategoriesUnique.map(cat =>
  data
    .filter(i => i.type === "expense" && i.category === cat)
    .reduce((acc, curr) => acc + Number(curr.value), 0)
);

// Total por categoría ingresos
const incomeData = incomeCategoriesUnique.map(cat =>
  data
    .filter(i => i.type === "income" && i.category === cat)
    .reduce((acc, curr) => acc + Number(curr.value), 0)
);

// Colores (puedes ajustar o usar más)
const expenseColors = [
  "#f44336", "#e57373", "#ef9a9a", "#ffcdd2", "#b71c1c"
];
const incomeColors = [
  "#4caf50", "#81c784", "#a5d6a7", "#c8e6c9", "#1b5e20"
];

const expenseChartData = {
  labels: expenseCategoriesUnique,
  datasets: [
    {
      label: "Gastos",
      data: expenseData,
      backgroundColor: expenseColors.slice(0, expenseCategoriesUnique.length),
      hoverOffset: 30,
    },
  ],
};

const incomeChartData = {
  labels: incomeCategoriesUnique,
  datasets: [
    {
      label: "Ingresos",
      data: incomeData,
      backgroundColor: incomeColors.slice(0, incomeCategoriesUnique.length),
      hoverOffset: 30,
    },
  ],
};

// const options = {
//   responsive: true,
//   plugins: {
//     legend: {
//       position: "bottom",
//     },
//   },
// };

//Datos para el gráfico ingresos y gastos
const doughnutData = {
  labels: ["Gastos", "Ingresos"],
  datasets: [
    {
      label: "Balance",
      data: [balance.expense, balance.income],
      backgroundColor: ["#f44336", "#4caf50"], // rojo y verde
      hoverOffset: 30,
    },
  ],
};

const doughnutOptions = {
  responsive: true,
  //maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
    },
    tooltip: {
      enabled: true,
    },
    
  },
  animation: {
    animateRotate: true,
    duration: 1000,
  },
};
const today = new Date();
const options = { day: 'numeric', month: 'long' };
const formattedDate = today.toLocaleDateString('es-ES', options); 

  useEffect(() => {
  const token = localStorage.getItem("token");

  const fetchGastos = async () => {
    try {
      setLoading(true);
      // Llamada a la API con filtro según selectedCategory
      const response = await axios.get("http://localhost:4000/gastos/"+selectedCategory, {
        headers: {
          Authorization: "Bearer "+token,
        },
      });

      setData(response.data);

      // Calcular totales
      let totalExpense = 0;
      let totalIncome = 0;
      response.data.forEach((item) => {
        if (item.type === "expense") totalExpense += Number(item.value);
        if (item.type === "income") totalIncome += Number(item.value);
      });

      setBalance({ expense: totalExpense, income: totalIncome });
      setError("");
    } catch (error) {
      setError("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  fetchGastos();
}, [selectedCategory]);


  useEffect(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    data.forEach((item) => {
      if (item.type === "expense") totalExpense += Number(item.value);
      if (item.type === "income") totalIncome += Number(item.value);
    });
    setBalance((prev) => ({ ...prev, expense: totalExpense, income: totalIncome }));
  }, [data]);

  const handleAddGasto = () => {
  console.log("Abriendo modal");
  setModalOpen(true);
};

  // 1. Extraer fechas únicas, agrupar datos, preparar lineChartData
  const datesSet = new Set();
  data.forEach(item => {
    if (item.createdAt) {
      const day = new Date(item.createdAt).toISOString().slice(0, 10);
      datesSet.add(day);
    }
  });
  const dates = Array.from(datesSet).sort((a, b) => new Date(a) - new Date(b));

  const expensesByDate = {};
  const incomesByDate = {};
  dates.forEach(date => {
    expensesByDate[date] = 0;
    incomesByDate[date] = 0;
  });

  data.forEach(item => {
    if (item.createdAt) {
      const day = new Date(item.createdAt).toISOString().slice(0, 10);
      if (item.type === "expense") {
        expensesByDate[day] += Number(item.value);
      } else if (item.type === "income") {
        incomesByDate[day] += Number(item.value);
      }
    }
  });

  // Datos para el gráfico de líneas
const lineChartData = {
  labels: dates,
  datasets: [
    {
      label: "Gastos",
      data: dates.map(date => expensesByDate[date]),
      borderColor: "#f44336",
      backgroundColor: "#f4433620",
      fill: true,
      tension: 0.3,
    },
    {
      label: "Ingresos",
      data: dates.map(date => incomesByDate[date]),
      borderColor: "#4caf50",
      backgroundColor: "#4caf5020",
      fill: true,
      tension: 0.3,
    },
  ],
};

const lineChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: "bottom",
    },
    tooltip: {
      enabled: true,
    },
  },
  scales: {
    x: {
      type: "time",
      time: {
        unit: selectedCategory,
        tooltipFormat: "PP",
      },
      title: {
        display: true,
        text: "Fecha",
      },
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: "Cantidad (€)",
      },
    },
  },
};
console.log("Fechas para gráfico:", dates);
console.log(data.map(i => i.createdAt));

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!newEntry.name || !newEntry.value || isNaN(newEntry.value)) {
    alert("Por favor, completa el nombre y un valor válido.");
    return;
  }
  const token = localStorage.getItem("token");
  const decoded = jwtDecode(token);
  const clientId = decoded.userId; 

  const newItem = {
    name: newEntry.name,
    type: newEntry.type,
    category: newEntry.category,
    value: Number(newEntry.value),
    icon: newEntry.icon,
    clientId: clientId,
  };

  try {
    const response = await axios.post("http://localhost:4000/track", newItem);
    const response2 = await axios.get("http://localhost:4000/gastos/"+selectedCategory, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setData(response2.data);
    handleModalClose();
  } catch (error) {
    alert("Error al guardar el gasto/ingreso");
    console.error(error);
  }
};

const handleInputChange = (e) => {
  const { name, value } = e.target;
  setNewEntry((prev) => ({
    ...prev,
    [name]: value,
  }));
};
const handleModalClose = () => {
  setModalOpen(false);
  setNewEntry({ name: "", type: "expense", value: "", icon: "💸" });
};
function IconPicker({ selectedIcon, onSelect }) {
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
}

  // Calculamos porcentaje para el donut chart
const totalAmount = balance.income- balance.expense;
const safeTotal = totalAmount > 0 ? totalAmount : 1;
const expensePercent = ((balance.expense / safeTotal) * 100).toFixed(1);
const incomePercent = ((balance.income / safeTotal) * 100).toFixed(1);

  return (
    <div className="track-container">
      {error && <div className="error-message">{error}</div>}
      
      <header className="header">
        <h1 className="title">Control Financiero</h1>
        <p className="subtitle">Gestión inteligente de gastos e ingresos</p>
      </header>

      <nav className="tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`tab-button ${selectedCategory === cat.id ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      <div className="date-section">
        <p className="date-label">Hoy, {formattedDate}</p>
      </div>

      {balance.expense > 0 || balance.income > 0 ? (
        <>
          <div className="balance-card">
            <h2 className="balance-title">Balance Total</h2>
            <div className="balance-amount">
              <span className={totalAmount >= 0 ? 'positive' : 'negative'}>
                {totalAmount.toFixed(2)}€
              </span>
            </div>
            <div className="balance-details">
              <div className="balance-item expense">
                <span className="label">Gastos</span>
                <span className="amount">{balance.expense.toFixed(2)}€</span>
              </div>
              <div className="balance-item income">
                <span className="label">Ingresos</span>
                <span className="amount">{balance.income.toFixed(2)}€</span>
              </div>
            </div>
          </div>

         

  <div className="charts-grid">
  <div className="chart-card">
    <h3 className="chart-title">Balance General</h3>
    <div className="chart-wrapper">
      <Doughnut data={doughnutData} options={doughnutOptions} />
    </div>
  </div>

  <div className="chart-card">
    <h3 className="chart-title">Gastos por Categoría</h3>
    <div className="chart-wrapper">
      <Doughnut data={expenseChartData} options={doughnutOptions} />
    </div>
  </div>

  <div className="chart-card">
    <h3 className="chart-title">Ingresos por Categoría</h3>
    <div className="chart-wrapper">
      <Doughnut data={incomeChartData} options={doughnutOptions} />
    </div>
  </div>

  
</div>
<div className="chart-card">
  <h3 className="chart-title">Evolución Gastos e Ingresos</h3>
  <div className="chart-wrapper">
    <Line data={lineChartData} options={lineChartOptions} />
  </div>
</div>

          
        </>
      ) : (
        <div className="no-data-card">
          <div className="no-data-icon">📊</div>
          <h3>No hay datos disponibles</h3>
          <p>Comienza añadiendo tu primera transacción para ver los análisis</p>
        </div>
      )}

      <div className="transactions-section">
        <h3 className="section-title">Transacciones Recientes</h3>
        <div className="transactions-list">
          {data.slice(0, 10).map((transaction, idx) => (
            <div key={idx} className="transaction-item">
              <div className="transaction-icon">{transaction.icon}</div>
              <div className="transaction-details">
                <div className="transaction-name">{transaction.name}</div>
                <div className="transaction-category">{transaction.category}</div>
              </div>
              <div className={`transaction-amount ${transaction.type}`}>
                {transaction.type === 'expense' ? '-' : '+'}
                {transaction.value}€
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="add-button" onClick={handleAddGasto}>
        <span className="add-icon">+</span>
        <span className="add-text">Nueva Transacción</span>
      </button>

            {/* Modal para añadir gasto */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="custom-modal">
      

            <h2>Nuevo Gasto / Ingreso</h2>
            <form onSubmit={handleSubmit}>
              <label>
                Nombre:
                <input
                  type="text"
                  name="name"
                  value={newEntry.name}
                  onChange={handleInputChange}
                />
              </label>

              <label>
                Tipo:
                <select
                  name="type"
                  value={newEntry.type}
                  onChange={handleInputChange}
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
              </label>
              <label>
                  Categoría:
                  <select
                    name="category"
                    value={newEntry.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="" disabled>
                      Selecciona una categoría
                    </option>
                    {(newEntry.type === "expense" ? expenseCategories : incomeCategories).map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                </label>


              <label>
                Valor:
                <input
                  type="number"
                  name="value"
                  value={newEntry.value}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </label>

              <label>Icono:</label>
                <IconPicker
                  selectedIcon={newEntry.icon}
                  onSelect={(icon) =>
                    setNewEntry((prev) => ({
                      ...prev,
                      icon,
                    }))
                  }
                />

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">Añadir</button>
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Track;
