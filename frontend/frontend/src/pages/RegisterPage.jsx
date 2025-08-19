import { useState } from "react";
import axios from "axios";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!email || !username || !password) {
        setError("Заполните все поля");
        return;
      }
      if (password.length < 8) {
        setError("Пароль должен быть не меньше 8 символов");
        return;
      }
      await axios.post("http://localhost:8000/api/users/", {
        email,
        username,
        password,
      });
      alert("Регистрация прошла успешно!");
    } catch (err) {
      alert("Ошибка регистрации!");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto" }}>
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        <input
          type="username"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        <button type="submit">Зарегистрироваться</button>
      </form>
    </div>
  );
}
