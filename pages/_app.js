import '../styles/globals.css'
import AppShell from '../components/AppShell'

// O menu lateral fica aqui para NAO ser recriado a cada troca de tela
// (antes ele sumia e voltava, e o perfil era recarregado). Cada pagina informa o titulo em Pagina.shellTitle.
export default function App({ Component, pageProps }) {
  const pagina = <Component {...pageProps} />
  return Component.shellTitle ? <AppShell titulo={Component.shellTitle}>{pagina}</AppShell> : pagina
}
