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

import { Pencil, Trash2  } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, 
  LineElement,
  TimeScale
);

const categories = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },

];


const Track = () => {
  const [data, setData] = useState([]);
  const [balance, setBalance] = useState({ expense: 0, income: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("day");
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [iconOptions, setIconOptions] = useState([]);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [period, setPeriod] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // Estado para verificar si el usuario es premium
  const [newEntry, setNewEntry] = useState({
  name: "",
  type: "expense",
  category: "Comida",  
  value: "",
  icon: "💸",
  sharedWith: [],
  splitType: "equal", // o "custom"
  customAmounts: {},  // Ejemplo: { friendId1: 10, friendId2: 5 }

});
const [friends, setFriends] = useState([]);


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



// Verificar si el usuario es premium al cargar el componente
useEffect(() => {
  const checkPremiumStatus = () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Asumiendo que el token contiene información sobre el estado premium
        setIsPremium(decoded.isPremium || decoded.premium || false);
      } catch (error) {
        console.error("Error al decodificar token:", error);
        setIsPremium(false);
      }
    }
  };

  checkPremiumStatus();
}, []);

useEffect(() => {
  const fetchCategorias = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://localhost:4000/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExpenseCategories(res.data.expense || []);
      setIncomeCategories(res.data.income || []);
    } catch (err) {
      console.error("Error al cargar categorías:", err);
    }
  };

  fetchCategorias();
}, []);

useEffect(() => {
  const fetchIcons = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://localhost:4000/icons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIconOptions(res.data|| []);
    } catch (err) {
      console.error("Error al cargar iconos:", err);
    }
  };

  fetchIcons();
}, []);


  useEffect(() => {
    console.log("useEffect triggered with selectedCategory:", selectedCategory);
  console.log("Current loading state:", loading);
     setLoading(false);
  setError("");
    if (selectedCategory === "") {
         
    return;
  }


  const fetchGastos = async () => {
     const token = localStorage.getItem("token");
    try {
      setLoading(true);
      setError(""); // Limpia errores previos
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
  const fetchFriends = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://localhost:4000/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
     setFriends(res.data);
    } catch (err) {
      console.error("Error al cargar amigos:", err);
    }
  };

  fetchFriends();
}, []);

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

//para el select de amigos
const friendsOptions = friends.map(friend => ({
  value: friend._id,
  label: friend.name
}));

const handleSubmit = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const decoded = jwtDecode(token);
  const clientId = decoded.userId; 
  let newValue=0;

  if (newEntry._id) {
    console.log("Editando transacción:", newEntry._id);
  // Editar transacción existente
  const response=await axios.put(`http://localhost:4000/track/${newEntry._id}`, newEntry, {
    headers: { Authorization: `Bearer ${token}` },
  });
} else {
  if (!newEntry.name || !newEntry.value || isNaN(newEntry.value)) {
    alert("Por favor, completa el nombre y un valor válido.");
    return;
  }

  
  try {
      newValue = parseFloat(newEntry.value);
      if (isNaN(newValue)) {
        throw new Error("Valor no válido");
      }
      console.log(newValue);
    } catch (error) {
      console.log(error);  
      alert("Valor no válido.");
      return;
    }

    if (newEntry.splitType === "custom") {
  const total = parseFloat(newEntry.value);
  const sumCustomAmounts = Object.values(newEntry.customAmounts).reduce((acc, val) => acc + Number(val), 0);

  if (sumCustomAmounts >= total) {
    alert(`La suma de los importes asignados (${sumCustomAmounts.toFixed(2)}€) no puede superar el valor total del gasto (${total.toFixed(2)}€).`);
    return;
  }
}


  const newItem = {
    name: newEntry.name,
    type: newEntry.type,
    category: newEntry.category,
    value: newValue,
    icon: newEntry.icon,
    clientId: clientId,
    sharedWith: newEntry.sharedWith,
    splitType: newEntry.splitType,
    customAmounts: newEntry.splitType === "custom" ? newEntry.customAmounts : {},
  };

  await axios.post("http://localhost:4000/track", newItem);
 

}
  try {

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

  if (name === "type") {
    const firstCategory = value === "income" 
      ? incomeCategories[0] || "" 
      : expenseCategories[0] || "";

    setNewEntry((prev) => ({
      ...prev,
      type: value,
      category: firstCategory, // actualizar categoría automáticamente
      // Limpiar sharedWith si cambia a income o si no es premium
      sharedWith: (value === "expense" && isPremium) ? prev.sharedWith : [],
    }));
  } else {
    setNewEntry((prev) => ({
      ...prev,
      [name]: value,
    }));
  }
};

const handleModalClose = () => {
  setModalOpen(false);
  setNewEntry({ name: "", type: "expense", category:"Comida", value: "", icon: "💸",  sharedWith: [], splitType: "equal", customAmounts: {}});
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

const handleEditTransaction = (transaction) => {
  setNewEntry({
    name: transaction.name,
    type: transaction.type,
    category: transaction.category,
    value: transaction.value,
    icon: transaction.icon,
    _id: transaction._id, // Asegúrate de que existe este campo
    sharedWith: transaction.sharedWith,
  });
  setModalOpen(true);
};

const handleDeleteTransaction = async (id) => {
  const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar esta transacción?");
  if (!confirmDelete) return;

  try {
    const token = localStorage.getItem("token");
    await axios.delete(`http://localhost:4000/track/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Recargar lista después de borrar
    const response = await axios.get(`http://localhost:4000/gastos/${selectedCategory}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(response.data);
  } catch (error) {
    console.error("Error al borrar la transacción:", error);
    alert("Error al eliminar la transacción");
  }
};

const fetchCustomRangeData = async () => {
  if (!customStartDate || !customEndDate) {
    alert("Selecciona un rango de fechas válido.");
    return;
  }

  // Evitar llamadas innecesarias si ya estamos cargando
  if (loading) return;
  
  const token = localStorage.getItem("token");

  // Función para crear timestamps inclusivos
  const formatDateRange = (startDate, endDate) => {
    // Inicio del día para startDate (00:00:00)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    // Final del día para endDate (23:59:59)
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  };

  const { start, end } = formatDateRange(customStartDate, customEndDate);
  
  console.log("📅 Enviando fechas:", { start, end });

  try {
    setLoading(true);
    const res = await axios.get("http://localhost:4000/gastos/rango", {
      headers: { Authorization: `Bearer ${token}` },
      params: { start, end },
    });
    
     console.log("Datos recibidos desde el backend:", res.data);  // Verifica los datos
    setData(res.data);

    // Calcular balance
    let totalExpense = 0;
    let totalIncome = 0;
    res.data.forEach((item) => {
      if (item.type === "expense") totalExpense += Number(item.value);
      if (item.type === "income") totalIncome += Number(item.value);
    });

    setBalance({ expense: totalExpense, income: totalIncome });
  } catch (error) {
    console.error("Error al obtener datos personalizados:", error);
    setError("Error al obtener datos personalizados.");
  } finally {
    setLoading(false);
    setSelectedCategory("");
  }
};


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
            className={`tab-button ${selectedCategory === cat.id && !period? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(cat.id);
              setPeriod(false);
              // Limpiar las fechas del periodo personalizado
              setCustomStartDate(null);
              setCustomEndDate(null);
            }
          }
          >
            {cat.label}
          </button>
        )
        )}

          <button
            key={"period"}
            className={`tab-button ${period==true ? "active" : ""}`}
            onClick={() => {
                setPeriod(true)}
            }
              
          >
            Periodo
          </button>

      </nav>
      {period == true && (
  <div className="period-date-picker">
    <div className="date-input-group">
      <label>📅 Desde:</label>
      <div className="date-input-wrapper">
        <DatePicker
          selected={customStartDate}
          onChange={(date) => setCustomStartDate(date)}
          selectsStart
          startDate={customStartDate}
          endDate={customEndDate}
          dateFormat="dd/MM/yyyy"
          showTodayButton
          todayButton="📅 Hoy"
          placeholderText="Selecciona fecha inicial"
          className="custom-date-input"
          calendarClassName="custom-calendar"
          popperClassName="custom-popper"
          showPopperArrow={false}
          maxDate={new Date()} // No permitir fechas futuras
        />
      </div>
    </div>
    
    <div className="date-input-group">
      <label>📅 Hasta:</label>
      <div className="date-input-wrapper">
        <DatePicker
          selected={customEndDate}
          onChange={(date) => setCustomEndDate(date)}
          selectsEnd
          startDate={customStartDate}
          endDate={customEndDate}
          minDate={customStartDate}
          dateFormat="dd/MM/yyyy"
          placeholderText="Selecciona fecha final"
          className="custom-date-input"
          calendarClassName="custom-calendar"
          popperClassName="custom-popper"
          showPopperArrow={false}
          maxDate={new Date()} // No permitir fechas futuras
        />
      </div>
    </div>
    
    <button 
      onClick={fetchCustomRangeData} 
      className="btn btn-primary"
      disabled={!customStartDate || !customEndDate || loading}
    >
      {loading ? (
        <>
          <span className="spinner">⏳</span>
          Cargando...
        </>
      ) : (
        <>
          <span>✨</span>
          Aplicar Filtro
        </>
      )}
    </button>
  </div>
)}

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
         {[...data].slice(-10).reverse().map((transaction, idx) => (
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
              <button onClick={() => handleEditTransaction(transaction)} className="edit-button" title="Editar">
              <Pencil size={18} />
            </button>
            <button onClick={() => handleDeleteTransaction(transaction._id)} className="delete-button" title="Eliminar transacción">
              <Trash2 size={18} />
            </button>
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

              {/* Solo mostrar el campo de compartir gastos si es usuario premium Y el tipo es expense */}
              {isPremium && newEntry.type === "expense" && (
  <>
    <label>Compartir gasto con:</label>
    <Select
      isMulti
      value={friendsOptions.filter(option => newEntry.sharedWith.includes(option.value))}
      onChange={(selectedOptions) => {
        const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
        setNewEntry(prev => ({
          ...prev,
          sharedWith: selectedIds,
          // Resetear si ya no hay amigos seleccionados
          splitType: selectedIds.length === 0 ? "equal" : prev.splitType,
          customAmounts: selectedIds.length === 0 ? {} : prev.customAmounts
        }));
      }}
      options={friendsOptions}
      placeholder="Selecciona amigos..."
      closeMenuOnSelect={false}
    />

    {/* Mostrar tipo de reparto SOLO si hay amigos seleccionados */}
    {newEntry.sharedWith.length > 0 && (
      <>
        <label>Tipo de reparto:</label>
          <Select
            value={{ label: newEntry.splitType === "equal" ? "Reparto equitativo" : "Asignar cantidades", value: newEntry.splitType }}
            onChange={(selected) =>
              setNewEntry(prev => ({ ...prev, splitType: selected.value }))
            }
            options={[
              { value: "equal", label: "Reparto equitativo" },
              { value: "custom", label: "Asignar cantidades" }
            ]}
            placeholder="Selecciona tipo de reparto..."
            className="split-type-select"
            isSearchable={false}
          />

          
        
      </>
    )}
    {newEntry.splitType === "custom" && newEntry.sharedWith.length > 0 && (
      <>
        <label>Distribución personalizada:</label>
        {newEntry.sharedWith.map(friendId => {
          const friend = friends.find(f => f._id === friendId);
          return (
            <div key={friendId}>
              <label>{friend?.name || "Amigo"}:</label>
              <input
                type="number"
                min="0"
                value={newEntry.customAmounts[friendId] || ""}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  setNewEntry(prev => ({
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

              {/* Mensaje informativo para usuarios no premium */}
              {!isPremium && newEntry.type === "expense" && (
                <div className="upgrade-premium-message">
                  💎 <strong>Función Premium:</strong> Actualiza a Premium para compartir gastos con amigos
                </div>
              )}


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
                <button type="submit" className="btn btn-primary">Aceptar</button>
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