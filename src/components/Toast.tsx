"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

export default function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <CheckCircle size={18} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
