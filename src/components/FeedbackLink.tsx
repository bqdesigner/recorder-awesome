import { MegaphoneIcon } from './icons'

const FEEDBACK_URL = 'https://forms.gle/deHEC1ekh5EzvTHj8'

/** Link na barra superior para enviar feedback via Google Forms. */
function FeedbackLink() {
  return (
    <a className="btn btn--ghost" href={FEEDBACK_URL} target="_blank" rel="noreferrer">
      <MegaphoneIcon />
      <span className="btn__label">Enviar feedback</span>
    </a>
  )
}

export default FeedbackLink
