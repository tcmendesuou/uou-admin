import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import logoUou from '../assets/logo-uou.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Verificar se é admin
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();

      if (!userData?.isAdmin) {
        setError('Você não tem permissão de administrador');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setError('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`html,body{background:#010208;margin:0}input:focus{border-color:#555 !important}`}</style>
      <div style={styles.card}>
        <div style={styles.header}>
          <img src={logoUou} alt="UOU" style={styles.logoImg} />
          <p style={styles.subtitle}>Painel Administrativo</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@uou.com"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button 
            type="submit" 
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Apenas administradores autorizados
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#010208',
    padding: '20px',
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#0d0d0d',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid #1f1f27',
  },
  header: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoImg: {
    height: '44px',
    width: 'auto',
    display: 'block',
    margin: '0 auto 10px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#8a8a95',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #1f1f27',
    backgroundColor: '#08080c',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '10px',
    border: '1px solid #52fa35',
    backgroundColor: 'rgba(82,250,53,0.05)',
    color: '#52fa35',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '10px',
    fontFamily: 'inherit',
  },
  error: {
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid rgba(255,68,68,0.5)',
    color: '#ff6b6b',
    fontSize: '14px',
    textAlign: 'center',
  },
  footer: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #1f1f27',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#8a8a95',
  },
};
