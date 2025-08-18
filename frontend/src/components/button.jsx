
export default function Button({ children, onClick, disabled = false, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
