import { useState, useRef, useEffect } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { syncSafetyDataToSW } from '@/hooks/useActivityTracker';
import { EmergencyContact, SafetySettings, defaultSafetySettings } from '@/types';
import { ArrowLeft, Plus, Trash2, Camera, X, Phone, MessageSquare, Shield, ShieldAlert, AlertTriangle, Edit2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MAX_CONTACTS = 5;

export default function EmergencyContacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useLocalStorage<EmergencyContact[]>('emergencyContacts', []);
  const [safety, setSafety] = useLocalStorage<SafetySettings>('safetySettings', defaultSafetySettings);

  useEffect(() => { syncSafetyDataToSW(); }, [contacts, safety]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [preferWhatsApp, setPreferWhatsApp] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName(''); setPhone(''); setDetails(''); setImage(undefined); setPreferWhatsApp(true);
    setShowAdd(false); setEditingId(null);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 128;
        let w = img.width, h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        setImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveContact = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    if (editingId) {
      setContacts(prev => prev.map(c => c.id === editingId ? { ...c, name: name.trim(), phone: phone.trim(), details: details.trim(), image, preferWhatsApp } : c));
      toast.success('Contact updated');
    } else {
      if (contacts.length >= MAX_CONTACTS) {
        toast.error(`Maximum ${MAX_CONTACTS} contacts allowed`);
        return;
      }
      const newContact: EmergencyContact = {
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone.trim(),
        details: details.trim(),
        image,
        preferWhatsApp,
      };
      setContacts(prev => [...prev, newContact]);
      toast.success('Emergency contact added');
    }
    resetForm();
  };

  const editContact = (c: EmergencyContact) => {
    setName(c.name); setPhone(c.phone); setDetails(c.details);
    setImage(c.image); setPreferWhatsApp(c.preferWhatsApp);
    setEditingId(c.id); setShowAdd(true);
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    toast('Contact removed');
  };

  const sendAlert = (contact: EmergencyContact) => {
    const msg = encodeURIComponent(safety.alertMessage);
    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
    if (contact.preferWhatsApp) {
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    } else {
      window.open(`sms:${cleanPhone}?body=${msg}`, '_blank');
    }
  };

  const sendAlertToAll = () => {
    if (contacts.length === 0) {
      toast.error('No emergency contacts to alert');
      return;
    }
    contacts.forEach(c => sendAlert(c));
    toast.success(`Opening messages for ${contacts.length} contact(s)`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1" data-tour="emergency-header">Emergency Contacts</h1>
        {contacts.length < MAX_CONTACTS && (
          <Button size="sm" variant="ghost" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus className="w-5 h-5" />
          </Button>
        )}
      </div>

      <PageOnboardingTooltips pageId="emergency" />

      {/* Safety Protocol Card */}
      <div className={`rounded-2xl p-4 space-y-3 border-2 transition-colors ${safety.enabled ? 'border-destructive/50 bg-destructive/5' : 'glass border-transparent'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" style={{ color: safety.enabled ? 'hsl(0, 84%, 60%)' : 'hsl(245, 58%, 62%)' }} />
            <div>
              <h2 className="text-sm font-bold">Safety Protocol</h2>
              <p className="text-[10px] text-muted-foreground">Alert contacts if you're inactive</p>
            </div>
          </div>
          <Switch checked={safety.enabled} onCheckedChange={v => setSafety(prev => ({ ...prev, enabled: v }))} />
        </div>

        <AnimatePresence>
          {safety.enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Inactivity threshold</label>
                  <span className="text-xs font-bold text-destructive">{safety.inactivityDays} day{safety.inactivityDays !== 1 ? 's' : ''}</span>
                </div>
                <Slider
                  value={[safety.inactivityDays]}
                  onValueChange={([v]) => setSafety(prev => ({ ...prev, inactivityDays: v }))}
                  min={1} max={30} step={1}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Alert message</label>
                <Textarea
                  value={safety.alertMessage}
                  onChange={e => setSafety(prev => ({ ...prev, alertMessage: e.target.value }))}
                  className="bg-secondary border-0 text-xs min-h-[60px]"
                />
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  When triggered, the app will open WhatsApp/SMS for each contact with your alert message pre-filled. You'll need to confirm sending each message.
                </p>
              </div>

              <Button
                size="sm"
                variant="destructive"
                className="w-full gap-1.5"
                onClick={sendAlertToAll}
                disabled={contacts.length === 0}
              >
                <Shield className="w-3.5 h-3.5" /> Test Alert Now ({contacts.length} contact{contacts.length !== 1 ? 's' : ''})
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">{editingId ? 'Edit Contact' : 'Add Contact'}</h3>

              {/* Photo */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {image ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-primary/30">
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                      <Phone className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                    <Camera className="w-3 h-3" />
                  </button>
                  {image && (
                    <button onClick={() => setImage(undefined)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>
                <div className="flex-1 space-y-2">
                  <Input placeholder="Name *" value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-0" />
                  <Input placeholder="Phone number *" value={phone} onChange={e => setPhone(e.target.value)} className="bg-secondary border-0" type="tel" />
                </div>
              </div>

              <Input placeholder="Relationship / details" value={details} onChange={e => setDetails(e.target.value)} className="bg-secondary border-0" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <span className="text-xs">Prefer WhatsApp</span>
                </div>
                <Switch checked={preferWhatsApp} onCheckedChange={setPreferWhatsApp} />
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">
                {preferWhatsApp ? 'Alert will open WhatsApp' : 'Alert will open SMS text message'}
              </p>

              <div className="flex gap-2">
                <Button onClick={saveContact} className="flex-1" size="sm">
                  <Check className="w-4 h-4 mr-1" /> {editingId ? 'Update' : 'Add'}
                </Button>
                <Button onClick={resetForm} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      <div className="space-y-3">
        {contacts.length === 0 && !showAdd && (
          <div className="text-center py-8 opacity-50">
            <Shield className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">No emergency contacts yet</p>
            <p className="text-xs mt-1">Add up to {MAX_CONTACTS} trusted contacts</p>
          </div>
        )}

        {contacts.map((contact, i) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              {contact.image ? (
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                  <img src={contact.image} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">{contact.name[0]?.toUpperCase()}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.phone}</p>
                {contact.details && <p className="text-[10px] text-muted-foreground mt-0.5">{contact.details}</p>}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600">
                    {contact.preferWhatsApp ? '📱 WhatsApp' : '💬 SMS'}
                  </span>
                </div>
              </div>

              <div className="flex gap-1">
                <button onClick={() => sendAlert(contact)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Send test alert">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={() => editContact(contact)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteContact(contact.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {contacts.length > 0 && contacts.length < MAX_CONTACTS && (
        <p className="text-center text-[10px] text-muted-foreground">{contacts.length}/{MAX_CONTACTS} contacts</p>
      )}
    </motion.div>
  );
}
