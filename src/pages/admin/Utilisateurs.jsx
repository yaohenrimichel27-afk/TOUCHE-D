import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../lib/firebase";
import { useToast } from "../../components/shared/Toast";
import { Plus, Trash2, X, Check, Users, ShieldCheck } from "lucide-react";

const EMPTY = { name: "", email: "", password: "", role: "cashier" };

export default function Utilisateurs() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) return toast("Tous les champs sont requis", "error");
    if (form.password.length < 6) return toast("Mot de passe : 6 caractères minimum", "error");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name: form.name, email: form.email, role: form.role
      });
      toast("Utilisateur créé ✓", "success");
      setShowForm(false);
      setForm(EMPTY);
    } catch (e) {
      toast(e.code === "auth/email-already-in-use" ? "Email déjà utilisé" : "Erreur création", "error");
    } finally { setLoading(false); }
  };

  const toggleRole = async (u) => {
    const newRole = u.role === "admin" ? "cashier" : "admin";
    await updateDoc(doc(db, "users", u.id), { role: newRole });
    toast(`Rôle changé : ${newRole}`, "info");
  };

  const remove = async (u) => {
    if (!confirm(`Supprimer ${u.name} ?`)) return;
    await deleteDoc(doc(db, "users", u.id));
    toast("Utilisateur supprimé", "info");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Utilisateurs</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>{users.length} compte(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Ajouter un utilisateur
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {users.map(u => (
          <div key={u.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: u.role === "admin" ? "var(--brand-pale)" : "var(--gray-100)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {u.role === "admin" ? <ShieldCheck size={20} color="var(--brand)" /> : <Users size={20} color="var(--gray-500)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{u.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => toggleRole(u)} className={`badge ${u.role === "admin" ? "badge-brand" : "badge-success"}`} style={{ cursor: "pointer", border: "none", padding: "5px 12px" }}>
                {u.role === "admin" ? "Admin" : "Caissier"}
              </button>
              <button className="btn btn-icon" style={{ padding: 8, background: "#FEE2E2", color: "var(--danger)" }} onClick={() => remove(u)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && <div className="empty-state card"><Users size={32} /><p>Aucun utilisateur</p></div>}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: 24, paddingBottom: "calc(24px + env(safe-area-inset-bottom))", animation: "slideUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18 }}>Nouvel utilisateur</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label>Nom complet</label><input className="input" placeholder="Ex: Marie Koné" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label>Email</label><input className="input" type="email" placeholder="marie@latouched.ci" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoCapitalize="none" /></div>
              <div><label>Mot de passe</label><input className="input" type="password" placeholder="Min. 6 caractères" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
              <div><label>Rôle</label>
                <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="cashier">Caissier</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8 }} onClick={createUser} disabled={loading}>
                {loading ? <span className="loader" /> : <><Check size={18} /> Créer l'utilisateur</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
