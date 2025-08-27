import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff } from "react-feather";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email обязателен";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Введите корректный email";
    }
    if (!formData.password) {
      newErrors.password = "Пароль обязателен";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setErrors({
        general: err.response?.data?.non_field_errors?.[0] || 
                "Ошибка входа. Проверьте email и пароль",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Вход в систему</h2>
        
        {errors.general && (
          <div style={styles.errorAlert}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Mail size={18} style={styles.icon} />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(errors.email && styles.inputError)
              }}
              placeholder="example@mail.com"
            />
            {errors.email && (
              <span style={styles.errorText}>{errors.email}</span>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Lock size={18} style={styles.icon} />
              Пароль
            </label>
            <div style={styles.passwordInputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  ...(errors.password && styles.inputError)
                }}
                placeholder="Введите пароль"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <span style={styles.errorText}>{errors.password}</span>
            )}
          </div>

          <div style={styles.forgotPassword}>
            <Link to="/forgot-password" style={styles.link}>
              Забыли пароль?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={styles.submitButton}
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>
        </form>

        <div style={styles.signupLink}>
          Ещё нет аккаунта?{" "}
          <Link to="/register" style={styles.link}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "40px",
    width: "100%",
    maxWidth: "400px",
  },
  title: {
    textAlign: "center",
    marginBottom: "24px",
    color: "#333",
    fontSize: "24px",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#555",
  },
  icon: {
    color: "#666",
  },
  input: {
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    transition: "border-color 0.3s",
  },
  inputError: {
    borderColor: "#ff4444",
  },
  passwordInputContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  passwordToggle: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#666",
  },
  errorText: {
    color: "#ff4444",
    fontSize: "13px",
    marginTop: "4px",
  },
  errorAlert: {
    backgroundColor: "#ffeeee",
    color: "#ff4444",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  forgotPassword: {
    textAlign: "right",
    fontSize: "14px",
  },
  submitButton: {
    backgroundColor: "#4285f4",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s",
    marginTop: "8px",
  },
  signupLink: {
    textAlign: "center",
    marginTop: "24px",
    fontSize: "14px",
    color: "#555",
  },
  link: {
    color: "#4285f4",
    textDecoration: "none",
    fontWeight: "500",
  },
};