import './globals.css';

export const metadata = {
  title: 'WaBlast HIMASIF',
  description: 'Dashboard blast + voting HIMASIF',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
