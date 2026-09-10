const AUTHOR_URL = 'https://brunoqueiros.com'

/** Rodapé da tela inicial: crédito do autor + nota de privacidade. */
function Footer() {
  return (
    <footer className="footer">
      <p>
        criado ❤️ pelo{' '}
        <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
          brunão
        </a>
      </p>
      <p>Não coletamos seus dados :)</p>
    </footer>
  )
}

export default Footer
