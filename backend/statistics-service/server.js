const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
require('dotenv').config();
const authMiddleware = require("../auth-middleware/index");

const app = express();
const Transaction = require("../statistics-service/statistics-model")
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ [Stats Service] Conectado a MongoDB"))
  .catch((err) => console.error("❌ [Stats Service] Error al conectar:", err));

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

 const resultadoAgrupado = agruparPorCategoria(gastos);
 res.json(resultadoAgrupado);
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});


app.post('/track', async (req, res) => {
  const { name, type, category, value, icon, clientId } = req.body;

  if (!clientId || !name || !type || !category || !value) {
      return res.status(400).json({ error: "Datos incompletos" });
    }
  // const existing = await Transaction.findOne({ clientId: clientId, category: category });
  // if(existing){
  //   existing.value+=value;
  //   await existing.save();
  //   return res.status(200).json(existing);
  // }

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

function agruparPorCategoria(transactions) {
  // Usamos un objeto para acumular por categoría
  const agrupados = {};

  transactions.forEach(({ category, type, value, icon, name, createdAt }) => {
    const key = `${type}-${category}`; // diferenciamos gastos e ingresos por categoría
    if (!agrupados[key]) {
      agrupados[key] = {
        category,
        type,
        value: 0,
        icon,
        name,
        createdAt
      };
    }
    agrupados[key].value += Number(value);
  });

  // Convertimos el objeto a array
  return Object.values(agrupados);
}


// Iniciar el servidor
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Stats Service corriendo en puerto ${PORT}`);
});
