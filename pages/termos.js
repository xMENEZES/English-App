import Head from 'next/head'
import Documento from '../components/Documento'
import { TERMOS } from '../lib/lgpd/termos'
import { VIGENCIA } from '../lib/lgpd/config'

export default function Termos() {
  return (
    <>
      <Head><title>English Step By Step - Termos de Uso</title></Head>
      <Documento doc={TERMOS} vigencia={VIGENCIA} />
    </>
  )
}
