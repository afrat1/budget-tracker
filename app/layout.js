import './globals.css';

export const metadata = {
  title: 'Bütçe Yönetimi - Aylık Ödemelerinizi Takip Edin',
  description: 'Ana hesap bakiyenizi, otomatik ödemelerinizi ve kredi taksitlerinizi takip edin. Ay sonunda ne kadar paranız kalacağını görün.',
  keywords: 'bütçe, finans, ödeme takip, kredi, fatura',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
