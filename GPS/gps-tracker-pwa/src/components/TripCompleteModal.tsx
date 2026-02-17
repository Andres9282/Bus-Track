import { useState } from 'react';
import type { RouteMetadata } from '../services/tripService';

const BUS_TYPES = ['Microbús', 'Bus', 'Bus articulado', 'Otro'];
const OCCUPANCY_LEVELS = ['Vacío', 'Medio', 'Lleno'];

interface TripCompleteModalProps {
  isOpen: boolean;
  pointCount: number;
  onConfirm: (metadata: RouteMetadata) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export default function TripCompleteModal({
  isOpen,
  pointCount,
  onConfirm,
  onCancel,
  isUploading = false
}: TripCompleteModalProps) {
  const [routeName, setRouteName] = useState('');
  const [busType, setBusType] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = routeName.trim();
    if (!name) {
      setError('El nombre o número de la ruta es obligatorio.');
      return;
    }
    onConfirm({
      routeName: name,
      busType: busType || undefined,
      occupancy: occupancy || undefined
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel trip-complete-modal">
        <h2>Finalizar viaje</h2>
        <p className="trip-summary">Puntos capturados: <strong>{pointCount}</strong></p>
        <p className="modal-hint">Completa los datos de la ruta para subir el viaje.</p>

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="routeName">Nombre/Número de la Ruta *</label>
            <input
              type="text"
              id="routeName"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Ej: Ruta 201-A"
              className="form-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="busType">Tipo de bus</label>
            <select
              id="busType"
              value={busType}
              onChange={(e) => setBusType(e.target.value)}
              className="form-input"
            >
              <option value="">Seleccionar...</option>
              {BUS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="occupancy">Nivel de ocupación</label>
            <select
              id="occupancy"
              value={occupancy}
              onChange={(e) => setOccupancy(e.target.value)}
              className="form-input"
            >
              <option value="">Seleccionar...</option>
              {OCCUPANCY_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUploading}
            >
              {isUploading ? 'Subiendo...' : 'Subir viaje'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
              disabled={isUploading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
