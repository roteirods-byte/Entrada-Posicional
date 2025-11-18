import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'autotrader_email_config_v1';

interface EmailConfig {
  from: string;
  password: string;
  to: string;
}

const EmailPanel: React.FC = () => {
  const [from, setFrom] = useState('');
  const [password, setPassword] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Carregar configurações salvas no navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: EmailConfig = JSON.parse(raw);
        setFrom(parsed.from ?? '');
        setPassword(parsed.password ?? '');
        setTo(parsed.to ?? '');
      }
    } catch (e) {
      console.error('Erro ao carregar configuração de e-mail', e);
    }
  }, []);

  const handleTestAndSave = () => {
    setStatus(null);

    if (!from || !password || !to) {
      setStatus({ ok: false, message: 'Preencha todos os campos.' });
      return;
    }

    if (!from.includes('@') || !to.includes('@')) {
      setStatus({ ok: false, message: 'Verifique os e-mails informados.' });
      return;
    }

    setSaving(true);
    try {
      const config: EmailConfig = { from, password, to };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      setStatus({
        ok: true,
        message:
          'Configurações salvas no navegador. O envio real será feito pela automação do servidor quando estiver conectada.',
      });
    } catch (e) {
      console.error(e);
      setStatus({
        ok: false,
        message: 'Não foi possível salvar as configurações.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-[#ff7b1b] mb-4">E-MAIL</h2>

      <div className="bg-[#0b2533] border border-gray-700 rounded-lg p-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-sm text-[#ff7b1b] mb-1">
              Principal (remetente)
            </label>
            <input
              type="email"
              className="bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm text-[#e7edf3]"
              placeholder="seu-email@gmail.com"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-[#ff7b1b] mb-1">
              Senha (App Password)
            </label>
            <input
              type="password"
              className="bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm text-[#e7edf3]"
              placeholder="************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-[#ff7b1b] mb-1">
              Envio (destinatário)
            </label>
            <input
              type="email"
              className="bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm text-[#e7edf3]"
              placeholder="destino@email.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleTestAndSave}
            disabled={saving}
            className="bg-[#ff7b1b] hover:bg-[#ff9b46] disabled:opacity-70 text-sm font-semibold text-[#041019] px-6 py-2 rounded-md"
          >
            {saving ? 'Salvando...' : 'TESTAR/SALVAR'}
          </button>
        </div>

        {status && (
          <p
            className={`mt-4 text-sm px-3 py-2 rounded-md ${
              status.ok
                ? 'bg-green-900 text-green-300'
                : 'bg-red-900 text-red-300'
            }`}
          >
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailPanel;
