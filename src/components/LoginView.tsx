import { useState, type FormEvent } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  QrCode,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  KeyRound,
  X,
  ExternalLink,
} from 'lucide-react';

const FIREBASE_CONSOLE_AUTH_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0535309250/authentication/providers';

export function LoginView() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Register fields
  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  // Helper for friendly error messages in Portuguese without technical codes
  const parseAuthError = (err: any): { message: string; isNotAllowed: boolean } => {
    const code = String(err?.code || '').toLowerCase();
    const rawMsg = String(err?.message || '').toLowerCase();

    if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
      return {
        message:
          'O método de login por E-mail e Senha precisa ser ativado no Firebase Console deste projeto. Acesse o painel do Firebase Authentication para habilitar o provedor "E-mail/senha".',
        isNotAllowed: true,
      };
    }

    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      rawMsg.includes('invalid-credential') ||
      rawMsg.includes('wrong-password')
    ) {
      return {
        message: 'E-mail ou senha incorretos. Por favor, confira os dados informados e tente novamente.',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/user-not-found' || rawMsg.includes('user-not-found')) {
      return {
        message: 'Nenhuma conta encontrada com este e-mail. Crie uma nova conta na aba "Criar Conta".',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/email-already-in-use' || rawMsg.includes('email-already-in-use')) {
      return {
        message:
          'Este e-mail já está cadastrado. Alterne para a aba "Entrar" para acessar sua conta ou redefina sua senha.',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/weak-password' || rawMsg.includes('weak-password')) {
      return {
        message: 'A senha é muito fraca. Digite pelo menos 6 caracteres combinando letras e números.',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/invalid-email' || rawMsg.includes('invalid-email')) {
      return {
        message: 'O formato de e-mail é inválido. Digite um e-mail válido (ex: seu@email.com).',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/user-disabled' || rawMsg.includes('user-disabled')) {
      return {
        message: 'Esta conta de usuário foi desativada temporariamente. Entre em contato com o administrador.',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/too-many-requests' || rawMsg.includes('too-many-requests')) {
      return {
        message: 'Muitas tentativas consecutivas. Por segurança, aguarde alguns instantes e tente novamente.',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/network-request-failed' || rawMsg.includes('network-request-failed')) {
      return {
        message: 'Falha de conexão com os servidores do Firebase. Verifique sua conexão com a internet.',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/expired-action-code') {
      return {
        message: 'O link de recuperação expirou. Por favor, solicite um novo link.',
        isNotAllowed: false,
      };
    }

    if (code === 'auth/invalid-action-code') {
      return {
        message: 'O link de recuperação de senha é inválido ou já foi utilizado.',
        isNotAllowed: false,
      };
    }

    // Default clean fallback without technical codes
    return {
      message: 'Não foi possível processar sua solicitação no momento. Por favor, tente novamente.',
      isNotAllowed: false,
    };
  };

  // HANDLE LOGIN
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim();
    if (!cleanEmail || !loginPassword) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      setIsOperationNotAllowed(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setIsOperationNotAllowed(false);
      await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
      // onAuthStateChanged in App.tsx automatically switches to Dashboard
    } catch (err: any) {
      console.error('Erro de login:', err);
      const parsed = parseAuthError(err);
      setErrorMessage(parsed.message);
      setIsOperationNotAllowed(parsed.isNotAllowed);
    } finally {
      setLoading(false);
    }
  };

  // HANDLE REGISTER
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = registerEmail.trim();

    if (!cleanName) {
      setErrorMessage('Por favor, informe seu nome completo.');
      setIsOperationNotAllowed(false);
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      setIsOperationNotAllowed(false);
      return;
    }

    if (registerPassword.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      setIsOperationNotAllowed(false);
      return;
    }

    if (registerPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      setIsOperationNotAllowed(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setIsOperationNotAllowed(false);

      // 1. Create user in Firebase Authentication with Email and Password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        registerPassword
      );

      const createdUser = userCredential.user;

      // 2. Update display name in Firebase Auth
      try {
        await updateProfile(createdUser, { displayName: cleanName });
      } catch (profileErr) {
        console.warn('Could not update displayName on auth user:', profileErr);
      }

      // 3. Save user profile document in Firestore 'users' collection
      // Stores name, nome, email, uid, createdAt and updatedAt
      try {
        const userDocRef = doc(db, 'users', createdUser.uid);
        await setDoc(userDocRef, {
          uid: createdUser.uid,
          name: cleanName,
          nome: cleanName,
          email: cleanEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (dbErr) {
        console.error('Erro ao salvar perfil no Firestore:', dbErr);
      }

      // Automatically transitions to Dashboard through onAuthStateChanged
    } catch (err: any) {
      console.error('Erro de cadastro:', err);
      const parsed = parseAuthError(err);
      setErrorMessage(parsed.message);
      setIsOperationNotAllowed(parsed.isNotAllowed);
    } finally {
      setLoading(false);
    }
  };

  // HANDLE FORGOT PASSWORD
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setForgotError('Informe seu e-mail para receber o link de redefinição.');
      return;
    }

    try {
      setForgotLoading(true);
      setForgotError(null);
      await sendPasswordResetEmail(auth, cleanEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      console.error('Erro ao enviar email de recuperação:', err);
      const parsed = parseAuthError(err);
      setForgotError(parsed.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      id="login-view"
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      {/* High-tech ambient glowing lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />

      <div
        id="login-card"
        className="w-full max-w-md bg-[#0d121f]/90 border border-blue-500/30 rounded-2xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10"
      >
        {/* Logo Textual JZN CODE */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 text-white shadow-xl shadow-blue-600/30 mb-3 ring-4 ring-blue-500/20">
            <QrCode className="w-8 h-8" />
          </div>

          <div className="flex flex-col items-center leading-none mt-1">
            <div className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5 font-mono">
              <span className="text-blue-400">JZN</span>
              <span className="text-slate-100">CODE</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-blue-400/90 mt-1">
              QR Codes Dinâmicos
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-2">
            Acesso exclusivo para gerenciar seus códigos e destinos
          </p>
        </div>

        {/* Tab Selection: Entrar / Criar Conta */}
        <div className="flex bg-[#050811] p-1.5 rounded-xl border border-slate-800/90 mb-6">
          <button
            id="tab-btn-login"
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
              setIsOperationNotAllowed(false);
            }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar
          </button>
          <button
            id="tab-btn-register"
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
              setIsOperationNotAllowed(false);
            }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            id="auth-error-alert"
            className="mb-5 p-3.5 bg-red-950/70 border border-red-500/50 rounded-xl flex flex-col gap-2 text-red-300 text-xs leading-relaxed animate-fadeIn"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="space-y-1">
                <span>{errorMessage}</span>
              </div>
            </div>

            {/* Quick action button if Email/Password provider is pending activation in console */}
            {isOperationNotAllowed && (
              <div className="mt-2 pt-2 border-t border-red-500/20 flex flex-col gap-2">
                <span className="text-[11px] text-red-200/90 font-medium">
                  Para ativar em segundos no Firebase Console:
                </span>
                <ol className="list-decimal list-inside text-[11px] text-red-300/80 space-y-0.5 pl-1">
                  <li>Clique no botão abaixo para abrir a página de provedores</li>
                  <li>Clique no provedor <strong>E-mail/senha</strong></li>
                  <li>Ative a chave <strong>Ativar</strong> e clique em <strong>Salvar</strong></li>
                </ol>
                <a
                  id="btn-open-firebase-console"
                  href={FIREBASE_CONSOLE_AUTH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow transition-all self-start"
                >
                  <span>Abrir Firebase Console (Ativar E-mail/Senha)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="input-login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#050811] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setForgotSuccess(false);
                    setForgotError(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="input-login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[#050811] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>ENTRANDO...</span>
                </>
              ) : (
                <>
                  <span>ENTRAR</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: CRIAR CONTA */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="input-register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Jeann Santos"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050811] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="input-register-email"
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050811] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="input-register-password"
                  type="password"
                  required
                  minLength={6}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050811] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="input-register-confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a mesma senha"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050811] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <button
              id="btn-submit-register"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>CRIANDO CONTA…</span>
                </>
              ) : (
                <>
                  <span>CRIAR CONTA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Gerenciador de QR Codes Dinâmicos e Links</span>
          </p>
        </div>
      </div>

      {/* MODAL ESQUECI MINHA SENHA */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0d121f] border border-blue-500/30 rounded-2xl p-6 shadow-2xl relative text-slate-100">
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Recuperar Senha</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Digite seu e-mail para enviarmos um link seguro de redefinição de senha.
            </p>

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>E-mail enviado com sucesso!</span>
                </div>
                <p>
                  Verifique sua caixa de entrada (e também a pasta de spam) para redefinir sua
                  senha.
                </p>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full mt-2 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {forgotError && (
                  <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs">
                    {forgotError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Seu E-mail Cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-3.5 py-2.5 bg-[#050811] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

