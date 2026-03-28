export default function ProtectedRoute({ children }) {
  const loggedIn = localStorage.getItem("role");
  return loggedIn ? children : window.location = "/";
}
