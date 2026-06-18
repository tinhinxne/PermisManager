import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CarImage from '../../assets/Car.png';
import '../../styles/Access.css';

/* Icône bouclier admin */
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);

/* Icône moniteur */
const InstructorIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12c2.7 0 5-2.3 5-5S14.7 2 12 2 7 4.3 7 7s2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/>
    <circle cx="18" cy="16" r="4" fill="white" stroke="white"/>
    <text x="15.5" y="19" fontSize="5" fill="#26a69a" fontWeight="bold">✓</text>
  </svg>
);

const Access = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  const roles = [
    {
      id: 'admin',
      label: 'Administrateur',
      Icon: ShieldIcon,
      desc: 'Gérer les candidats, les instructeurs, les sessions, les examens et les paiements',
      className: 'admin',
    },
    {
      id: 'moniteur',
      label: 'Moniteur',
      Icon: InstructorIcon,
      desc: 'Voir les étudiants, gérer les sessions et suivre les progrès',
      className: 'moniteur',
    },
  ];

 const handleConfirm = () => {
    if (!selectedRole) return;
    
    // On enregistre le rôle (utile pour plus tard)
    sessionStorage.setItem('userRole', selectedRole);

    // Redirection conditionnelle
    if (selectedRole === 'moniteur') {
      navigate('/moniteur/dashboard');
    } else {
      navigate('/dashboard'); // Pour l'admin
    }
  };

  return (
    <div
      className="access-page"
      style={{ backgroundImage: `url(${CarImage})` }}
    >
      {/* Titre */}
      <p className="access-title">
        Sélectionnez votre rôle pour accéder au tableau de bord
      </p>

      {/* Cartes rôles */}
      <div className="role-grid">
        {roles.map(({ id, label, Icon, desc, className }) => (
          <div
            key={id}
            className={`role-card ${className} ${selectedRole === id ? 'selected' : ''}`}
            onClick={() => setSelectedRole(id)}
          >
            <div className="role-icon-wrap">
              <Icon />
            </div>
            <p className="role-name">{label}</p>
            <p className="role-desc">{desc}</p>
          </div>
        ))}
      </div>

      {/* Bouton */}
      <button
        className="access-btn"
        disabled={!selectedRole}
        onClick={handleConfirm}
      >
        {selectedRole
          ? `Accéder en tant que ${roles.find(r => r.id === selectedRole)?.label}`
          : 'Sélectionnez un rôle'}
      </button>

      {/* Retour */}
      <p className="access-back">
        <a
          href="#"
          onClick={e => { e.preventDefault(); navigate('/'); }}
        >
          ← Retour à la connexion
        </a>
      </p>
    </div>
  );
};

export default Access;
