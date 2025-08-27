import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, User, Lock, Eye, EyeOff } from "react-feather";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "Email обязателен";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Введите корректный email";
    }
    
    if (!formData.username.trim()) {
      newErrors.username = "Имя пользователя обязательно";
    } else if (formData.username.length < 3) {
      newErrors.username = "Минимум 3 символа";
    }
    
    if (!formData.password) {
      newErrors.password = "Пароль обязателен";
    } else if (formData.password.length < 8) {
      newErrors.password = "Минимум 8 символов";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают";
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
      const success = await register(
        formData.email,
        formData.username,
        formData.password
      );
      
      if (success) {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Registration error:", err.response?.data || err.message);
      
      const serverErrors = err.response?.data || {};
      const formattedErrors = {};
      
      if (serverErrors.email) {
        formattedErrors.email = Array.isArray(serverErrors.email) 
          ? serverErrors.email[0] 
          : serverErrors.email;
      }
      
      if (serverErrors.username) {
        formattedErrors.username = Array.isArray(serverErrors.username) 
          ? serverErrors.username[0] 
          : serverErrors.username;
      }
      
      if (serverErrors.password) {
        formattedErrors.password = Array.isArray(serverErrors.password) 
          ? serverErrors.password[0] 
          : serverErrors.password;
      }
      
      if (Object.keys(formattedErrors).length === 0) {
        formattedErrors.general = "Ошибка регистрации. Попробуйте позже.";
      }
      
      setErrors(formattedErrors);
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
        <h2 style={styles.title}>Создать аккаунт</h2>
        
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
              <User size={18} style={styles.icon} />
              Имя пользователя
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(errors.username && styles.inputError)
              }}
              placeholder="Ваш username"
            />
            {errors.username && (
              <span style={styles.errorText}>{errors.username}</span>
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
                placeholder="Не менее 8 символов"
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

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Lock size={18} style={styles.icon} />
              Подтвердите пароль
            </label>
            <div style={styles.passwordInputContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  ...(errors.confirmPassword && styles.inputError)
                }}
                placeholder="Повторите пароль"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span style={styles.errorText}>{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={styles.submitButton}
          >
            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <div style={styles.loginLink}>
          Уже есть аккаунт?{" "}
          <Link to="/login" style={styles.link}>
            Войти
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
    maxWidth: "450px",
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
    gap: "20px",
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
    width: "100%",
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
  submitButton: {
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s",
    marginTop: "8px",
    ":hover": {
      backgroundColor: "#3e8e41",
    },
    ":disabled": {
      backgroundColor: "#a5d6a7",
      cursor: "not-allowed",
    },
  },
  loginLink: {
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