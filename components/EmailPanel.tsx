import React, { useEffect, useState } from 'react';

type Status = { type: 'success' | 'error'; message: string } | null;

const STORAGE_KEY = 'autotrader_email_config';

const EmailPanel: React.FC = () => {
  const [principal, setPrincipal] = useState('');
  const [senha, setSenha] = useState('');
  const [destino, setDestino] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Carrega dados salvos no navegador
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.principal) setPrincipal(data.principal);
      if (data.senha) setSenha(data.senha);
      if (data.destino) setDestino(data.destino);
    } catch (err) {
      console.error('Erro ao ler config de e-mail do storage:', err);
    }
  }, []);

  const handleSave = async () => {
    setStatus(null);

    // Validações simples de tela
    if (!principal || !senha || !destino) {
      setStatus({
        type: 'error',
        message: 'Preencha todos os campos antes de salvar.',
      });
      return;
    }

    if (!principal.includes('@') || !destino.includes('@')) {
      setStatus({
        type: 'error',
        message: 'Verifique os endereços de e-mail digitados.',
      });
      return;
    }

    setSaving(true);

    try {
      // Salva apenas no navegador (por enquanto)
      const payload = { principal, senha, destino };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      // ⬇️ Aqui, numa próxima etapa, vamos plugar um endpoint Python
      //     para mandar um e-mail de teste de verdade.
      setStatus({
        type: 'success',
        message:
          'Configurações salvas neste navegador. O envio real dos alertas continua sendo feito pela automação Python.',
      });
    } catch (err) {
      console.error('Erro ao salvar config de e-mail:', err);
      setStatus({
        type: 'error',
        message: 'Erro ao salvar as configurações de e-mail.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto bg-[#032734] border border-[#0f3b4a] rounded-2xl p-6 sm:p-8 shadow-xl">
      <h2 className="text-2xl sm:text-3xl font-semibold text-[#ff7b1b] mb-6">
        E-MAIL
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-end">
        {/* Principal */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-[#ff7b1b] mb-2">
            Principal (remetente)
          </label>
          <input
            type="email"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="seu-email@gmail.com"
            className="w-full rounded-lg px-3 py-2 bg-[#021b25] text-[#e7edf3] border border-[#0f3b4a] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
          />
        </div>

        {/* Senha */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-[#ff7b1b] mb-2">
            Senha (App Password)
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg px-3 py-2 bg-[#021b25] text-[#e7edf3] border border-[#0f3b4a] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
          />
        </div>

        {/* Destino */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-[#ff7b1b] mb-2">
            Envio (destinatário)
          </label>
          <input
            type="email"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="destino@email.com"
            className="w-full rounded-lg px-3 py-2 bg-[#021b25] text-[#e7edf3] border border-[#0f3b4a] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
          />
        </div>

        {/* Botão */}
        <div className="lg:col-span-1 flex justify-start lg:justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full lg:w-auto px-6 py-3 rounded-lg bg-[#ff7b1b] text-[#02131d] font-semibold hover:bg-[#ffa24f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'TESTAR/SALVAR'}
          </button>
        </div>
      </div>

      {status && (
        <p
          className={`mt-6 text-sm sm:text-base font-medium ${
            status.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {status.message}
        </p>
      )}
    </section>
  );
};

export default EmailPanel;
