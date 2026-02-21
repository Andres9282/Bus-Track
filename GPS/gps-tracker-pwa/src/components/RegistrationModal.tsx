
import { useState } from 'react';
import type { UserInfo } from '../hooks/usePathTracker.ts';

interface RegistrationModalProps {
    isOpen: boolean;
    onSave: (info: UserInfo) => void;
    savedUsers: UserInfo[];
}

export default function RegistrationModal({ isOpen, onSave, savedUsers }: RegistrationModalProps) {
    const [name, setName] = useState('');
    const [dui, setDui] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'select' | 'create'>(savedUsers.length > 0 ? 'select' : 'create');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Please enter your full name');
            return;
        }
        if (!dui.trim()) {
            setError('Please enter your DUI');
            return;
        }
        if (!phone.trim()) {
            setError('Please enter your phone number');
            return;
        }
        if (!password.trim()) {
            setError('Please enter a password');
            return;
        }

        onSave({ name: name.trim(), dui: dui.trim(), phone: phone.trim(), password: password.trim() });
    };

    const handleSelectUser = (user: UserInfo) => {
        onSave(user);
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <h2>User Identity</h2>

                {mode === 'select' && savedUsers.length > 0 ? (
                    <div className="user-selection">
                        <p>Select a user to continue:</p>
                        <div className="user-list">
                            {savedUsers.map((user) => (
                                <button
                                    key={user.dui}
                                    className="btn btn-outline user-item"
                                    onClick={() => handleSelectUser(user)}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <strong>{user.name}</strong>
                                        <small>DUI: {user.dui}</small>
                                        <small>Tel: {user.phone}</small>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="divider">or</div>
                        <button className="btn btn-secondary" onClick={() => setMode('create')}>
                            Register New User
                        </button>
                    </div>
                ) : (
                    <>
                        <p>Por favor ingrese sus detalles para continuar.</p>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                            Para contactarlo por este medio si usted es el ganador por usar más tiempo la app.
                        </p>

                        <form onSubmit={handleSubmit} className="registration-form">
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Juan Pérez"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="dui">DUI Document Number</label>
                                <input
                                    type="text"
                                    id="dui"
                                    value={dui}
                                    onChange={(e) => setDui(e.target.value)}
                                    placeholder="00000000-0"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Número de Teléfono</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="0000-0000"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Contraseña</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Contraseña"
                                    className="form-input"
                                />
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <div className="button-group">
                                <button type="submit" className="btn btn-primary">Continue</button>
                                {savedUsers.length > 0 && (
                                    <button type="button" className="btn btn-outline" onClick={() => setMode('select')}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
