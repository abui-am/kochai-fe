import { Link, useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";

export function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 fixed top-0 right-0 left-0 w-full z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              KochAI
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/chat"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Chat
            </Link>

            <Link
              to="/profile"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-lg transition-colors"
            >
              Profile
            </Link>

            <button
              onClick={handleLogout}
              className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded-lg transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
