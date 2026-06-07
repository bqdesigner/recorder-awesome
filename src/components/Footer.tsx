const AUTHOR_URL = 'https://brunoqueiros.com'

/** Rodapé do bloco de gravação: crédito do autor. */
function Footer() {
  return (
    <div className="recorder__footer">
      <p>
        criado ❤️ pelo{' '}
        <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
          brunão
        </a>
      </p>
      <p>Não coletamos seus dados :)</p>
    </div>
  )
}

export default Footer
