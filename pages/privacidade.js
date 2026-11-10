import Head from 'next/head'
import Documento from '../components/Documento'
import { POLITICA } from '../lib/lgpd/politica'
import { VIGENCIA } from '../lib/lgpd/config'

export default function Privacidade() {
  return (
    <>
      <Head><title>English Step By Step - Política de Privacidade</title></Head>
      <Documento doc={POLITICA} vigencia={VIGENCIA} />
    </>
  )
}
