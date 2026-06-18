import React, { useRef, useState, useEffect } from 'react';

interface DraggableModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

const DraggableModal: React.FC<DraggableModalProps> = ({ children, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Center initially
        if (modalRef.current) {
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = modalRef.current;
            setPosition({
                x: (innerWidth - offsetWidth) / 2,
                y: (innerHeight - offsetHeight) / 2,
            });
        }
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag if clicking the header area (we assume the first child is usually a header or we check target)
        // For simplicity, let's just allow dragging on the container itself if not interacting with inputs
        if ((e.target as HTMLElement).closest('input, button, textarea, select')) return;

        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStartRef.current.x,
                    y: e.clientY - dragStartRef.current.y,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            ref={modalRef}
            onMouseDown={handleMouseDown}
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            className="absolute top-0 left-0 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden cursor-move z-[9999]"
        >
            <div className="cursor-default">
                {children}
            </div>
        </div>
    );
};

export default DraggableModal;
