// Bake My App wordmark. `public/logo.svg` is used as a mask, so the logo takes
// the surrounding text colour: white on the sidebar, primary on light screens.
const Logo = ({ className = '' }) => (
  <span role="img" aria-label="Bake My App" className={`admin-logo ${className}`} />
)

export default Logo
