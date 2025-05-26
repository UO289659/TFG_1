import React, { useEffect, useState } from "react";
import axios from "axios";
 

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    // agrega aquí otros campos que quieras mostrar/editar
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const response = await axios.get("http://localhost:4000/profile", {
           headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUserData(response.data);
        setFormData({
          name: response.data.name || "",
          email: response.data.email || "",
        });
      } catch (err) {
        setError("Error al cargar datos del usuario.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");

      await axios.put("http://localhost:4000/profile", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Perfil actualizado con éxito");
    } catch (err) {
      alert("Error al actualizar perfil");
    }
  };

  if (loading) return <p>Cargando perfil...</p>;
  if (error) return <p>{error}</p>;

  return (
 <div className="card shadow p-4" style={{ maxWidth: "50%", margin: "2rem auto" }}>
  <h2 className="text-center mb-4">Mi Perfil</h2>
  {error && <div className="alert alert-danger text-center">{error}</div>}
  <form onSubmit={handleSubmit}>
    <div className="mb-3">
      <label className="form-label">Nombre:</label>
      <input
        name="name"
        type="text"
        className="form-control"
        value={formData.name}
        onChange={handleChange}
        required
      />
    </div>
    <div className="mb-3">
      <label className="form-label">Email:</label>
      <input
        name="email"
        type="email"
        className="form-control"
        value={formData.email}
        onChange={handleChange}
        disabled
      />
    </div>
    {/* Agrega más campos según sea necesario */}
    <button type="submit" className="btn btn-primary w-100">
      Guardar cambios
    </button>
  </form>
</div>

  );
};

export default Profile;
