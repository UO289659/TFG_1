const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
require('dotenv').config();
const authMiddleware = require("../auth-middleware/index");

const seedCategorias = require("./seedCategories");
const seedIconos= require("./seedIcons");
const app = express();
const Transaction = require("../statistics-service/statistics-model")
const Categoria = require("./category-model")
const Icono = require("./icon-model")
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("✅ [Stats Service] Conectado a MongoDB");
    await seedCategorias();
    await seedIconos();
    console.log("🌱 Categorías iniciales cargadas");

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Stats Service corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB:", err);
  });

// Endpoint para obtener los gastos
app.get("/gastos/:period", authMiddleware, async (req, res) => {
  try {
    const { period } = req.params;
    console.log(period);
    const gastos = await Transaction.find({ 
      clientId: req.user.id,   
      $expr: {
        $eq: [
          { $dateTrunc: { date: "$createdAt", unit: period } }, // truncar createdAt al periodo solicitado (day, week, month, year)
          { $dateTrunc: { date: new Date(), unit: period } },   // truncar fecha actual igual al periodo
        ]
      }
 }).exec();
 
 //const resultadoAgrupado = agruparPorCategoria(gastos);
 res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});


app.post('/track', async (req, res) => {
  const { name, type, category, value, icon, clientId } = req.body;

  if (!clientId || !name || !type || !category || !value) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

  const transaction = new Transaction({
      clientId,
      name,
      type,
      category,
      value,
      icon,
    });

    await transaction.save();

    return res.status(201).json(transaction);
});
app.put('/track/:id', async (req, res) => {
  try{
    const { id } = req.params;
    const updated = await Transaction.findByIdAndUpdate(id, req.body, {
  new: true,
  runValidators: true,
});
if (!updated) {
  return res.status(404).json({ message: 'Transacción no encontrada' });
}
res.status(200).json(updated);

  } catch (err) {
    console.error("Error al actualizar transacción:", err.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

function agruparPorCategoria(transactions) {
  // Usamos un objeto para acumular por categoría
  const agrupados = {};

  transactions.forEach(({ category, type, value, icon, name, createdAt, _id }) => {
    const key = `${type}-${category}`; // diferenciamos gastos e ingresos por categoría
    if (!agrupados[key]) {
      agrupados[key] = {
        category,
        type,
        value: 0,
        icon,
        name,
        createdAt,
        _id 
      };
    }
    agrupados[key].value += Number(value);
  });

  // Convertimos el objeto a array
  return Object.values(agrupados);
}

app.delete('/track/:id', async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Transacción no encontrada" });
    }
    res.status(200).json({ message: "Transacción eliminada" });
  } catch (err) {
    console.error("Error al eliminar transacción:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

app.get("/categories", authMiddleware, async (req, res) => {
  try {
    const categorias = await Categoria.find();
    console.log("📦 Categorías encontradas:", categorias);

    if (!Array.isArray(categorias)) {
      return res.status(500).json({ error: "categorias no es un array" });
    }

    if (categorias.length === 0) {
      return res.status(500).json({ error: "La colección 'categorias' está vacía" });
    }

    const iconosUnicos = [...new Set(categorias.map(c => c.icon))];

    const porTipo = {
      expense: categorias.filter(c => c.type === "expense").map(c => c.name),
      income: categorias.filter(c => c.type === "income").map(c => c.name),
      icons: iconosUnicos
    };

    res.json(porTipo);
  } catch (err) {
    console.error("❌ Error exacto en /categories:", err);
    res.status(500).json({ error: err.message || "Fallo interno" });
  }
});

app.get("/icons", authMiddleware, async (req, res) => {
  try {
    const iconos = await Icono.find();
    res.json(iconos.map(i => i.emoji));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener iconos" });
  }
});


