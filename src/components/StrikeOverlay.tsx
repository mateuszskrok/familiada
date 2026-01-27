
import React from 'react';

interface StrikeOverlayProps {
    show: boolean;
    count: number; // 1, 2, or 3
}

export const StrikeOverlay: React.FC<StrikeOverlayProps> = ({ show, count }) => {
    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            pointerEvents: 'none'
        }}>
            <div style={{
                display: 'flex',
                gap: '20px',
                fontSize: '20rem',
                color: 'red',
                fontWeight: 'bold',
                textShadow: '0 0 20px white'
            }}>
                {Array.from({ length: count }).map((_, i) => (
                    <span key={i}>X</span>
                ))}
            </div>
        </div>
    );
};
