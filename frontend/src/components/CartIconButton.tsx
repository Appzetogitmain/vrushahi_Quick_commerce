import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

interface CartIconButtonProps {
  className?: string;
  iconColor?: string;
  showBadge?: boolean;
}

export default function CartIconButton({ 
  className = "", 
  iconColor = "currentColor",
  showBadge = true
}: CartIconButtonProps) {
  const navigate = useNavigate();
  const { cart } = useCart();
  
  const itemCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate("/cart");
      }}
      className={`p-2 rounded-full transition-all relative group active:scale-90 ${className}`}
      title="Cart"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
          fill={iconColor}
        />
      </svg>
      
      {showBadge && itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-[#ff3269] text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm ring-1 ring-pink-100">
          {itemCount}
        </span>
      )}
    </button>
  );
}
