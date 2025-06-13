const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
require('dotenv').config();
const {authMiddleware, ensurePremium} = require("../auth-middleware/index");

const seedCategorias = require("./seedCategories");
const seedIconos= require("./seedIcons");
const app = express();
const Transaction = require("../statistics-service/statistics-model")
const Categoria = require("./category-model")
const UserCategory=require("./user-category");
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

  app.get('/gastos/rango', authMiddleware, async (req, res) => {
  const { start, end } = req.query;
  const clientId = req.user.id;
  console.log("startDate:", start);
console.log("endDate:", end);


  if (!start || !end) {
    return res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
  }

  try {
    const gastos = await Transaction.find({
      clientId,
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    }).sort({ createdAt: 1 });

    res.json(gastos);
  } catch (error) {
    console.error("Error al obtener datos por rango:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint para obtener los gastos
app.get("/gastos/:period", authMiddleware, async (req, res) => {
  try {
    const { period } = req.params;
    console.log("Periodo escogido:"+period);
    const gastos = await Transaction.find({ 
      clientId: req.user.id,   
      $expr: {
        $eq: [
          { $dateTrunc: { date: "$createdAt", unit: period } }, // truncar createdAt al periodo solicitado (day, week, month, year)
          { $dateTrunc: { date: new Date(), unit: period } },   // truncar fecha actual igual al periodo
        ]
      }
 }).exec();
 if(gastos==null){
  res.status(404).json({ error: "Todavía no hay datos" });
 }
 //const resultadoAgrupado = agruparPorCategoria(gastos);
 res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});


app.post('/track', async (req, res) => {
  const { name, type, category, value, icon, clientId } = req.body;
  console.log("value en service: "+value);

  console.log("category en service: "+category);
  console.log("tipo en service; "+type);

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
    const userId = req.user.id;

    // 1. Obtener categorías globales
    const categoriasGlobales = await Categoria.find();

    // 2. Obtener categorías personalizadas del usuario
    const categoriasUsuario = await UserCategory.find({ userId });

    // 3. Combinar ambas listas
    const todas = [
      ...categoriasGlobales.map(c => ({
        name: c.name,
        type: c.type,
       
      })),
      ...categoriasUsuario.map(c => ({
        name: c.name,
        type: c.type,
      }))
    ];

    // 4. Agrupar por tipo y extraer iconos únicos
    const porTipo = {
      expense: todas.filter(c => c.type === "expense").map(c => c.name),
      income: todas.filter(c => c.type === "income").map(c => c.name),
    
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

app.post('/categories',authMiddleware, async (req, res) => {
  const { name, type } = req.body;
  const userId= req.user.id;

  if ( !name || !type) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

  const newCategory = new UserCategory({
      userId,
      name,
      type,
    });

    await newCategory.save();

    return res.status(201).json(newCategory);
});

app.delete('/categorie', authMiddleware, async (req, res) => {
  try {
    const { type, name } = req.body;
    const userId= req.user.id;
    console.log("userid: "+userId);
    console.log("type: "+type);
    console.log("name: "+name);
     // Verificamos si la categoría existe en ambas colecciones
    const categoryInCategoria = await Categoria.findOne({ userId, name, type });
    const categoryInUserCategory = await UserCategory.findOne({ userId, name, type });

    if (!categoryInCategoria && !categoryInUserCategory) {
      return res.status(404).json({ message: "Categoría no encontrada en ninguna colección" });
    }

    // Intentamos eliminar en ambas colecciones
    let deleted = false;
    let deleted2 = false;

    // Si la categoría existe en Categoria, intentamos eliminarla
    if (categoryInCategoria) {
      deleted = await Categoria.findOneAndDelete({ userId, name, type });
    }

    // Si la categoría existe en UserCategory, intentamos eliminarla
    if (categoryInUserCategory) {
      deleted2 = await UserCategory.findOneAndDelete({ userId, name, type });
    }

    // Si no se pudo eliminar en ninguna colección, devolvemos error
    if (!deleted && !deleted2) {
      return res.status(404).json({ message: "No se pudo eliminar la categoría" });
    }

    // Si hemos llegado aquí, al menos una de las eliminaciones fue exitosa
    res.status(200).json({ message: "Categoría eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar categoría:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

app.get('/export', authMiddleware, ensurePremium, async(req, res)=>{
  console.log("entra por export de stats");
  try{
    const clientId= req.user.id;
    console.log(clientId);
    const response= await Transaction.find({clientId}, 
    { _id: 0, clientId: 0, icon: 0, __v: 0 } );

    console.log(response);
     res.status(200).json(response);
  }catch(err){
    console.log(err);
    res.status(500).json({ message: "Error: no se puedo extraer transacciones: "});
  }
   
});