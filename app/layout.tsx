import type {Metadata} from 'next';
export const metadata:Metadata={title:'Nocturne · After Dark Chess Club',description:'Ajedrez contra IA con colecciones personales y guardado en tu cuenta.',icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
