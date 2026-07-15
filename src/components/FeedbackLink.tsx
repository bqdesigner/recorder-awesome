const FEEDBACK_URL = 'https://forms.gle/deHEC1ekh5EzvTHj8'

/** Link no topo do bloco de gravação para enviar feedback via Google Forms. */
function FeedbackLink() {
  return (
    <a
      className="recorder__feedback"
      href={FEEDBACK_URL}
      target="_blank"
      rel="noreferrer"
    >
      📣 Dar feedback
    </a>
  )
}

export default FeedbackLink
