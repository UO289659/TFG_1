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
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Pencil, Trash2  } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import CreateTransactionModal from './CreateTransactionModal';
import EditTransactionModal from './EditTransactionModal';
import ReactPaginate from 'react-paginate';
import Footer from "./Footer";
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

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000';

const Track = () => {
  const [data, setData] = useState([]);
  const [balance, setBalance] = useState({ expense: 0, income: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("day");
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
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
const [clientId, setClientId] = useState(null);

// Obtener categorías únicas de gastos y de ingresos por separado
const expenseCategoriesUnique = [...new Set(data.filter(i => i.type === "expense").map(i => i.category.name))];
const incomeCategoriesUnique = [...new Set(data.filter(i => i.type === "income").map(i => i.category.name))];

// Total por categoría gastos
const expenseData = expenseCategoriesUnique.map(cat =>
  data
    .filter(i => i.type === "expense" && i.category.name === cat)
    .reduce((acc, curr) => acc + Number(curr.value), 0)
);

// Total por categoría ingresos
const incomeData = incomeCategoriesUnique.map(cat =>
  data
    .filter(i => i.type === "income" && i.category.name === cat)
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

// Estados para la paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [transactionsPerPage] = useState(5); // Número de transacciones por página

   // Calcular transacciones para mostrar en la página actual
  const sortedTransactions = [...data]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
  const offset = currentPage * transactionsPerPage;
  const currentTransactions = sortedTransactions.slice(offset, offset + transactionsPerPage);
  const pageCount = Math.ceil(data.length / transactionsPerPage);

  // Función para manejar el cambio de página
  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  // Resetear página cuando cambien los datos
  useEffect(() => {
    setCurrentPage(0);
  }, [data, selectedCategory]);


const validateAndPrepareTransaction = (formData, clientId, friends = []) => {
    console.log("🔍 Iniciando validación con datos:", {
      name: formData.name,
      value: formData.value,
      originalValue: formData.value,
      _id: formData._id,
      clientId: formData.clientId,
      isEditing: !!formData._id
    });
    
    if (!formData.name || !formData.value || isNaN(formData.value)) {
      toast.error("Por favor, completa el nombre y un valor válido.");
      return null;
    }

    const newValue = parseFloat(formData.value);
    if (isNaN(newValue) || newValue <= 0) {
      toast.error("El valor debe ser un número positivo.");
      return null;
    }

    // Validación mejorada para splits personalizados
    if (formData.splitType === "custom" && formData.sharedWith?.length > 0) {
      const customAmounts = formData.customAmounts || {};
      
      // Obtener todos los participantes (incluyendo al creador si es edición)
      let allParticipants = [...formData.sharedWith];
      if (formData._id && formData.clientId && !allParticipants.includes(formData.clientId)) {
        allParticipants.push(formData.clientId);
      }
      
      // Calcular suma total de importes asignados
      let sumCustomAmounts = allParticipants.reduce((acc, participantId) => {
        const amount = Number(customAmounts[participantId] || 0);
        return acc + amount;
      }, 0);
      
      // Determinar el valor total para validación
      let totalValue;
      if (formData._id && formData.originalValue) {
        totalValue = formData.originalValue;
      } else {
        totalValue = newValue;
      }
      
      console.log("🔍 Validación splits personalizados:", {
        participantes: allParticipants,
        importesPersonalizados: customAmounts,
        sumaImportes: sumCustomAmounts,
        valorTotal: totalValue
      });
      
      // Validar la suma
   
         // CAMBIO CLAVE: Para edición, permitir cambio del valor total
      // solo validar si hay importes personalizados definidos
      if (formData._id) {
        // Si hay importes personalizados definidos, deben sumar exactamente al NUEVO valor
        const hasDefinedAmounts = allParticipants.some(participantId => 
          customAmounts[participantId] && customAmounts[participantId] > 0
        );
        
        if (hasDefinedAmounts) {
          // Solo validar si todos los participantes tienen importes asignados
          const allHaveAmounts = allParticipants.every(participantId => 
            customAmounts[participantId] && customAmounts[participantId] > 0
          );
          
          if (allHaveAmounts && Math.abs(sumCustomAmounts - newValue) > 0.01) {
            toast.error(
              `La suma de los importes asignados (${sumCustomAmounts.toFixed(2)}€) debe ser exactamente igual al nuevo valor del gasto (${newValue.toFixed(2)}€). ` +
              `Ajusta los importes personalizados o deja algunos en 0 para que se calculen automáticamente.`
            );
            return null;
          }
        }
        
        // Si no todos tienen importes definidos, está bien - el backend los calculará
        
      } else {
        // Al crear: suma no debe exceder el total
        if (sumCustomAmounts >= newValue) {
          toast.error(`La suma de los importes asignados (${sumCustomAmounts.toFixed(2)}€) no puede ser mayor o igual al valor total del gasto (${newValue.toFixed(2)}€).`);
          return null;
        }
      }

      // Validar que los importes definidos sean positivos
      const negativeAmounts = allParticipants.filter(participantId => {
        const amount = customAmounts[participantId];
        return amount && amount <= 0;
      });
      
      if (negativeAmounts.length > 0) {
        const negativeNames = negativeAmounts.map(id => {
          if (id === clientId) return "Tú";
          const friend = friends?.find(f => f._id === id);
          return friend?.name || `Usuario ${id}`;
        });
        toast.error(`Los importes asignados deben ser mayores a 0: ${negativeNames.join(', ')}`);
        return null;
      }
    }

    // Preparar datos limpios
    const cleanCustomAmounts = {};
    if (formData.splitType === "custom" && formData.sharedWith?.length > 0) {
      formData.sharedWith.forEach(friendId => {
        if (formData.customAmounts && formData.customAmounts[friendId]) {
          cleanCustomAmounts[friendId] = formData.customAmounts[friendId];
        }
      });
      
      if (formData._id && formData.customAmounts && formData.customAmounts[clientId]) {
        cleanCustomAmounts[clientId] = formData.customAmounts[clientId];
      }
    }

    // Construir datos de transacción
    const transactionData = {
      name: formData.name,
      type: formData.type,
      category: formData.category,
      value: newValue,
      icon: formData.icon || "💰",
      clientId: clientId,
      sharedWith: formData.sharedWith || [],
      splitType: formData.splitType || "equal",
      customAmounts: formData.splitType === "custom" ? cleanCustomAmounts : {},
    };

    // Datos adicionales para edición
    if (formData._id) {
      transactionData._id = formData._id;
      if (formData.originalValue) {
        transactionData.originalValue = formData.originalValue;
      }
    }

    console.log("✅ Datos validados para transacción:", transactionData);
    return transactionData;
  };

// Función para limpiar customAmounts cuando se eliminen usuarios (agregar al EditTransactionModal)
const handleSharedWithChange = (selectedOptions) => {
  const newSharedWith = selectedOptions.map(option => option.value);
  
  // Si estamos usando split personalizado, limpiar importes de usuarios eliminados
  if (formData.splitType === "custom") {
    const newCustomAmounts = { ...formData.customAmounts };
    
    // Eliminar importes de usuarios que ya no están seleccionados
    Object.keys(newCustomAmounts).forEach(friendId => {
      if (!newSharedWith.includes(friendId)) {
        delete newCustomAmounts[friendId];
        console.log(`🗑️ Eliminado importe personalizado del usuario: ${friendId}`);
      }
    });
    
    setFormData(prev => ({
      ...prev,
      sharedWith: newSharedWith,
      customAmounts: newCustomAmounts
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      sharedWith: newSharedWith
    }));
  }
  
  console.log("👥 Usuarios compartidos actualizados:", newSharedWith);
};

const handleRemoveUserFromSharedTransaction = async (transactionId, userIdToRemove) => {
  const token = localStorage.getItem("token");
  
  try {
    const response = await axios.patch(GATEWAY_URL+`/track/${transactionId}/remove-user`, {
      userIdToRemove: userIdToRemove
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success) {
      console.log("✅ Usuario eliminado, transacción actualizada:", response.data.transaction);
      
      // Actualizar la lista local con la transacción completa del servidor
      setData(prevTransactions =>
        prevTransactions.map(t => 
          t._id === transactionId ? response.data.transaction : t
        )
      );
      
      // SI EL MODAL DE EDICIÓN ESTÁ ABIERTO PARA ESTA TRANSACCIÓN, ACTUALIZARLO
      if (editModalOpen && editingTransaction?._id === transactionId) {
        console.log("🔄 Actualizando modal de edición con datos frescos");
        setEditingTransaction(response.data.transaction);
      }
      
      toast.success("Usuario eliminado del gasto compartido");
    }
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    toast.error("Error al eliminar el usuario del gasto");
  }
};

// Función mejorada para recargar datos después de cambios complejos
const refreshTransactionsData = async () => {
    const token = localStorage.getItem("token");
    
    try {
      setLoading(true);
      
      // Determinar qué endpoint usar basado en el filtro actual
      let endpoint;
      if (period && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        
        endpoint = GATEWAY_URL+`/gastos/rango?start=${start.toISOString()}&end=${end.toISOString()}`;
      } else {
        endpoint = GATEWAY_URL+`/gastos/${selectedCategory}`;
      }
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setData(response.data);
      
      // Recalcular balance
      let totalExpense = 0;
      let totalIncome = 0;
      response.data.forEach((item) => {
        if (item.type === "expense") totalExpense += Number(item.value);
        if (item.type === "income") totalIncome += Number(item.value);
      });
      
      setBalance({ expense: totalExpense, income: totalIncome });
      
    } catch (error) {
      console.error("Error al recargar datos:", error);
      setError("Error al recargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  const canEditTransaction = (transaction) => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const currentUserId = decoded.userId;
    
    // Solo puede editar si es el creador original
    return transaction.createdBy === currentUserId ;
  } catch (error) {
    console.error("Error al verificar permisos:", error);
    return false;
  }
};



const handleCreateTransaction = async (formData) => {

   console.log("Category being sent:", formData.category);
  console.log("Category type:", typeof formData.category);
  console.log("Category has _id:", formData.category?._id ? "Yes" : "No");

  console.log("transaccion en create: ", formData);
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const currentClientId = decoded.userId; 

    console.log("📝 Creando transacción:", formData);

    try {
      const newItem = validateAndPrepareTransaction(formData, currentClientId, friends);
      if (!newItem) return;

      console.log("📤 Enviando datos:", newItem);

      const response = await axios.post(GATEWAY_URL+"/track", newItem, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📥 Respuesta del servidor:", response.data);

      // Recargar datos actualizados
      await refreshTransactionsData();
      
      setCreateModalOpen(false);
      toast.success("Transacción creada correctamente");

    } catch (error) {
      console.error("❌ Error al crear transacción:", error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Error al guardar el gasto/ingreso");
      }
    }
  };


const handleEditTransaction = async (transaction) => {
  console.log("✏️ Editando transacción:", transaction);  
  try {
   
    setEditingTransaction(transaction);
    setEditModalOpen(true);
    
  } catch (error) {
    console.error("❌ Error al obtener datos frescos:", error);
    
    // Fallback: usar los datos locales si falla la consulta al servidor
    const transactionForEdit = {
      ...transaction,
      originalValue: transaction.originalValue || transaction.value,
      isSharedTransaction: transaction.sharedWith && transaction.sharedWith.length > 0,
      customAmounts: transaction.customAmounts || {},
      splitType: transaction.splitType || "equal"
    };

    console.log("📋 Usando datos locales como fallback:", transactionForEdit);
    console.log("💰 CustomAmounts del fallback:", transactionForEdit.customAmounts);
    
    setEditingTransaction(transactionForEdit);
    setEditModalOpen(true);
  }
};

const handleUpdateTransaction = async (formData) => {
  const token = localStorage.getItem("token");
  const decoded = jwtDecode(token);
  const currentClientId = decoded.userId;

  console.log("🔄 Actualizando transacción:", formData);

  try {
    const updateData = validateAndPrepareTransaction(formData, currentClientId, friends);
    
    if (!updateData) {
      return;
    }

    const response = await axios.put(GATEWAY_URL+`/track/${formData._id}`, updateData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("📥 Respuesta del servidor:", response.data);

    // CLAVE: Actualizar datos locales con información completa del servidor
    if (response.data.isConverted) {
      // Caso: se convirtió a transacción compartida
      console.log("🔄 Transacción convertida a compartida:", response.data.transactions);
      
      setData(prevTransactions => {
        const filteredTransactions = prevTransactions.filter(t => t._id !== formData._id);
        // IMPORTANTE: Guardar todas las transacciones con datos completos
        const allNewTransactions = response.data.transactions;
        const userTransactions = allNewTransactions.filter(t => t.clientId === currentClientId);
        
        return [...filteredTransactions, ...userTransactions];
      });
      
      toast.success("Transacción convertida a gasto compartido");
    } else if (response.data.wasShared && response.data.nowIndividual) {
      // Caso: se convirtió de compartida a individual
      setData(prevTransactions =>
        prevTransactions.map(t => 
          t._id === formData._id ? response.data.transaction : t
        )
      );
      
      toast.success("Transacción convertida a gasto individual");
    } else if (response.data.updatedTransactions) {
      // Caso: se actualizaron múltiples transacciones relacionadas
      console.log("🔄 Múltiples transacciones actualizadas:", response.data.updatedTransactions);
      
      // Actualizar todas las transacciones relacionadas en el estado local
      setData(prevTransactions => {
        const updatedMap = new Map();
        response.data.updatedTransactions.forEach(updatedTx => {
          updatedMap.set(updatedTx._id, updatedTx);
        });
        
        return prevTransactions.map(t => 
          updatedMap.has(t._id) ? updatedMap.get(t._id) : t
        );
      });
      
      toast.success("Transacción y gastos relacionados actualizados");
    } else {
      // Caso: actualización normal
      setData(prevTransactions =>
        prevTransactions.map(t => 
          t._id === formData._id ? response.data : t
        )
      );
      
      toast.success("Transacción actualizada correctamente");
    }

    setEditModalOpen(false);
    setEditingTransaction(null);

  } catch (error) {
    console.error("❌ Error al actualizar transacción:", error);
    
    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error("Error al actualizar la transacción");
    }
  }
};


// Verificar si el usuario es premium al cargar el componente
useEffect(() => {
  const checkPremiumStatus = () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Asumiendo que el token contiene información sobre el estado premium
        setIsPremium(decoded.isPremium || decoded.premium || false);
        setClientId()
      } catch (error) {
        console.error("Error al decodificar token:", error);
        setIsPremium( decoded.userId);
      }
    }
  };

  checkPremiumStatus();
}, []);

useEffect(() => {
  const fetchCategorias = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(GATEWAY_URL+"/categories", {
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
      const res = await axios.get(GATEWAY_URL+"/icons", {
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
      const response = await axios.get(GATEWAY_URL+"/gastos/"+selectedCategory, {
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
      const res = await axios.get(GATEWAY_URL+"/friends", {
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
  

  if (newEntry._id) {
    console.log("Editando transacción:", newEntry._id);

    // Preparar datos limpios para la actualización
    const updateData = {
      name: newEntry.name,
      type: newEntry.type,
      category: newEntry.category,
      value: newValue,
      icon: newEntry.icon,
      sharedWith: newEntry.sharedWith || [],
      splitType: newEntry.splitType,
      customAmounts: newEntry.splitType === "custom" ? newEntry.customAmounts : {},
    };

    try {
      const response = await axios.put(GATEWAY_URL+`/track/${newEntry._id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Manejar caso especial de conversión a transacción compartida
      if (response.data.isConverted) {
        console.log("Transacción convertida a compartida:", response.data.transactions);
        
        // Actualizar el estado local removiendo la transacción original
        setData(prevTransactions => {
          // Remover la transacción original
          const filteredTransactions = prevTransactions.filter(t => t._id !== newEntry._id);
          
          // Agregar las nuevas transacciones compartidas
          const newTransactions = response.data.transactions.filter(t => t.clientId === clientId);
          
          return [...filteredTransactions, ...newTransactions];
        });
        
        toast.success("Transacción convertida a gasto compartido");
      } else {
        console.log("Transacción actualizada:", response.data);
        
        // Actualizar la transacción en el estado local
        setData(prevTransactions =>
          prevTransactions.map(t => 
            t._id === newEntry._id ? response.data : t
          )
        );
        
        toast.success("Transacción actualizada correctamente");
      }

      // Limpiar el formulario y cerrar modal
      setNewEntry({
        name: "",
        type: "expense",
        category: "",
        value: "",
        icon: "💰",
        sharedWith: [],
        splitType: "equal",
        customAmounts: {}
      });
      setModalOpen(false);

    } catch (error) {
      console.error("Error al actualizar transacción:", error);
      toast.error("Error al actualizar la transacción");
    }

  } else {
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

const handleDeleteTransaction = async (id) => {
  // Opcionalmente, puedes obtener datos de la transacción para mostrar más detalles
  // const transaction = data.find(t => t._id === id);
  
  const result = await Swal.fire({
    title: '¿Eliminar transacción?',
    text: "Esta acción no se puede deshacer",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true, // Pone "Cancelar" a la izquierda
    focusCancel: true // Enfoca el botón cancelar por defecto
  });

  if (!result.isConfirmed) return;

  try {
    // Mostrar loading mientras se elimina
    Swal.fire({
      title: 'Eliminando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const token = localStorage.getItem("token");
    await axios.delete(GATEWAY_URL+`/track/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Recargar lista después de borrar
    const response = await axios.get(GATEWAY_URL+`/gastos/${selectedCategory}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(response.data);

    // Mensaje de éxito
    Swal.fire({
      title: '¡Eliminada!',
      text: 'La transacción ha sido eliminada correctamente',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (error) {
    console.error("Error al borrar la transacción:", error);
    
    // Mensaje de error con SweetAlert2
    Swal.fire({
      title: 'Error',
      text: 'No se pudo eliminar la transacción. Inténtalo de nuevo.',
      icon: 'error',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#dc3545'
    });
    
    toast.error("Error al eliminar la transacción");
  }
};

const fetchCustomRangeData = async () => {
  if (!customStartDate || !customEndDate) {
    toast.error("Selecciona un rango de fechas válido.");
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
    const res = await axios.get(GATEWAY_URL+"/gastos/rango", {
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

  return (
    <>
    <div className="track-container">
      {error && <div className="error-message">{error}</div>}
      
      <header className="header">
        <h1 className="header-title">Control Financiero</h1>
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
       {balance.expense > 0 ? (
        <Doughnut data={expenseChartData} options={doughnutOptions} />
      ) : (
        <div className="no-data-card">
          <div className="no-data-icon">💸</div>
          <h4>No hay gastos</h4>
          <p>Aún no has registrado ningún gasto en este período</p>
        </div>
      )}
    </div>
  </div>

  <div className="chart-card">
    <h3 className="chart-title">Ingresos por Categoría</h3>
    <div className="chart-wrapper">
      {balance.income > 0 ? (
        <Doughnut data={incomeChartData} options={doughnutOptions} />
      ) : (
        <div className="no-data-card">
          <div className="no-data-icon">💰</div>
          <h4>No hay ingresos</h4>
          <p>Aún no has registrado ningún ingreso en este período</p>
        </div>
      )}
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
        <div className="transactions-header">
          <h3 className="section-title">Transacciones Recientes</h3>
          <div className="transactions-info">
            <span className="transactions-count">
              Mostrando {currentTransactions.length} de {data.length} transacciones
            </span>
          </div>
        </div>

        <div className="transactions-list">
          {currentTransactions.map((transaction, idx) => (
            <div key={idx} className="transaction-item">
              <div className="transaction-icon">{transaction.icon}</div>
              <div className="transaction-details">
                <div className="transaction-name">{transaction.name}</div>
                <div className="transaction-category">{transaction.category.name}</div>
              </div>
              <div className={`transaction-amount ${transaction.type}`}>
                {transaction.type === 'expense' ? '-' : '+'}
                {transaction.value}€
              </div>
               {/* Botón de editar - solo visible para el creador */}
              {canEditTransaction(transaction) && (
                <button 
                  onClick={() => handleEditTransaction(transaction)} 
                  className="edit-button" 
                  title="Editar"
                >
                  <Pencil size={18} />
                </button>
              )}
                 {/* Indicador visual si no puede editar */}
    {!canEditTransaction(transaction) && (
      <span className="read-only-indicator" title="Solo el creador puede editar">
        🔒
      </span>
    )}
              <button onClick={() => handleDeleteTransaction(transaction._id)} className="delete-button" title="Eliminar transacción">
                <Trash2 size={18} />
              </button>
           
              
            </div>
            
          ))}
          
        </div>
        

        {/* Componente de paginación */}
      {pageCount > 1 && (
        <ReactPaginate
          previousLabel="← Anterior"
          nextLabel="Siguiente →"
          breakLabel="..."
          pageCount={pageCount}
          marginPagesDisplayed={2}
          pageRangeDisplayed={3}
          onPageChange={handlePageClick}
          containerClassName="pagination"
          activeClassName="active"
          pageClassName="page-item"
          pageLinkClassName="page-link"
          previousClassName="page-item"
          previousLinkClassName="page-link"
          nextClassName="page-item"
          nextLinkClassName="page-link"
          breakClassName="page-item"
          breakLinkClassName="page-link"
          disabledClassName="disabled"
        />
      )}
    </div>
      
      <button className="add-button-track" onClick={() => setCreateModalOpen(true)}>
        <span className="add-icon">+</span>
        <span className="add-text">Nueva Transacción</span>
      </button>

        {/* Modal para crear transacción */}
          <CreateTransactionModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onSubmit={handleCreateTransaction}
            friends={friends}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            iconOptions={iconOptions}
            isPremium={isPremium}
          />

          {/* Modal para editar transacción */}
          <EditTransactionModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setEditingTransaction(null);
            }}
            onSubmit={handleUpdateTransaction}
            transaction={editingTransaction}
            friends={friends}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            iconOptions={iconOptions}
            isPremium={isPremium}
          />

             
      </div>
       <Footer/>
       </>
    );
  };

export default Track;