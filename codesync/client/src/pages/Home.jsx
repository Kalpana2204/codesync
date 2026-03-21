import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4">
          Code<span className="text-blue-500">Sync</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg">
          Collaborate on code in real-time. Write, run, and debug together — no setup needed.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        {[
          { icon: "⚡", title: "Realtime Sync", desc: "Code together simultaneously" },
          { icon: "🤖", title: "AI Assistant", desc: "Get AI help inline" },
          { icon: "▶️", title: "Run Code", desc: "Execute in secure sandbox" },
        ].map((f) => (
          <div key={f.title} className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-lg mb-1">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-4">
        {user ? (
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-bold text-lg transition"
          >
            Go to Dashboard →
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate("/register")}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-bold text-lg transition"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate("/login")}
              className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg font-bold text-lg transition"
            >
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;