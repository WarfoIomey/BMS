import React from 'react';

const ErrorModal = ({ message, onClose }) => {
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.content}>
          <p style={modalStyles.message}>{message}</p>
          <button onClick={onClose} style={modalStyles.button}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  message: {
    marginBottom: '20px',
    fontSize: '16px',
    color: '#1e293b',
    textAlign: 'center',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    ':hover': {
      backgroundColor: '#4338ca',
    },
  },
};

export default ErrorModal;