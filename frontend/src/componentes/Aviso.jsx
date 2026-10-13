export function Aviso({ tipo = 'erro', children, aoFechar }) {
  if (!children) {
    return null;
  }
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <span>{children}</span>
      {aoFechar && (
        <button type="button" className="aviso-fechar" onClick={aoFechar} aria-label="Fechar aviso">
          ×
        </button>
      )}
    </div>
  );
}
