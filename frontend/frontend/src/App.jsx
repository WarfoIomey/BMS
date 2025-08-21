import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Header from './components/Header';
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TeamDashboard from "./pages/TeamDashboard";
import TaskPage from "./pages/TaskPage";
import TaskForm from "./pages/TaskForm";
import TaskDetail from "./pages/TaskDetail";

function Layout({ children }) {
  return (
    <>
      <Header />
      <main style={{ padding: '20px' }}>
        {children}
      </main>
    </>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

function AuthRoute({ children }) {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
<AuthProvider>
  <Router>
    <Routes>
      <Route path="/" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/teams" element={<PrivateRoute><TeamDashboard /></PrivateRoute>} />
      
      <Route path="/tasks/create" element={<PrivateRoute><TaskForm /></PrivateRoute>} />
      <Route path="/tasks/:id/edit" element={<PrivateRoute><TaskForm /></PrivateRoute>} />
      <Route path="/tasks/:id" element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
      
      <Route path="/tasks" element={<PrivateRoute><TaskPage /></PrivateRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
</AuthProvider>
  );
}