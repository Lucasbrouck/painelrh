import './globals.css';

export const metadata = {
  title: 'Jalapeño Super Admin — Gestão Central de Empresas & Usuários',
  description: 'Painel de Super Administrador para gerenciar empresas, usuários, senhas e acessos da rede Jalapeño',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
