import React, { useEffect, useRef } from 'react';
import { Copy, Edit3, Trash2, Reply, Pin } from 'lucide-react';

interface MessageContextMenuProps {
  x: number;
  y: number;
  isOwnMessage: boolean;
  onClose: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onPin: () => void;
  isPinned: boolean;
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  x,
  y,
  isOwnMessage,
  onClose,
  onCopy,
  onEdit,
  onDelete,
  onReply,
  onPin,
  isPinned
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position if menu goes off screen
  const menuStyles: React.CSSProperties = {
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`,
    zIndex: 1000,
  };

  return (
    <div 
      ref={menuRef} 
      className="message-context-menu" 
      style={menuStyles}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="menu-group">
        <button className="menu-item" onClick={() => { onReply(); onClose(); }}>
          <Reply size={16} />
          <span>Reply</span>
        </button>
        <button className="menu-item" onClick={() => { onCopy(); onClose(); }}>
          <Copy size={16} />
          <span>Copy Text</span>
        </button>
        <button className="menu-item" onClick={() => { onPin(); onClose(); }}>
          <Pin size={16} style={{ fill: isPinned ? 'var(--cyber-red)' : 'none' }} />
          <span>{isPinned ? 'Unpin Message' : 'Pin Message'}</span>
        </button>
      </div>

      {isOwnMessage && (
        <>
          <div className="menu-separator" />
          <div className="menu-group">
            <button className="menu-item warning" onClick={() => { onEdit(); onClose(); }}>
              <Edit3 size={16} />
              <span>Edit Message</span>
            </button>
            <button className="menu-item danger" onClick={() => { onDelete(); onClose(); }}>
              <Trash2 size={16} />
              <span>Delete Message</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MessageContextMenu;
