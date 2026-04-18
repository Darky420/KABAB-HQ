import React from "react";
import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

const WindowControls: React.FC = () => {
  const onMinimize = () => appWindow.minimize();
  const onMaximize = () => appWindow.toggleMaximize();
  const onClose = () => appWindow.close();

  return (
    <div className="window-controls">
      <button onClick={onMinimize} className="control-btn" title="Minimize">
        <Minus size={14} />
      </button>
      <button onClick={onMaximize} className="control-btn" title="Maximize">
        <Square size={12} />
      </button>
      <button onClick={onClose} className="control-btn close" title="Close">
        <X size={16} />
      </button>
    </div>
  );
};

export default WindowControls;
