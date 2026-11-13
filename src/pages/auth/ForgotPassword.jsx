import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { Alert, Button, TextField } from '../FormParts'
import { requestPasswordReset } from '../../services/adminAuth'
import { useSubmit } from '../../services/hooks'
import { adminLinkClick, adminPaths } from '../../navigation'

// The server answers the same way whether or not the email exists, so the
// screen does too.
const SENT = 'If that email belongs to a staff account, a reset link is on its way.'

const BackToSignIn = () => (
  <a href={adminPaths.login} className="admin-link" onClick={adminLinkClick(adminPaths.login)}>
    <ArrowLeft strokeWidth={2} /> Back to sign in
  </a>
)

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { loading, error, fields, run, clearField } = useSubmit(['email'])

  const submit = async (event) => {
    event.preventDefault()
    const { ok } = await run(() => requestPasswordReset(email.trim()))
    if (ok) setSent(true)
  }

  return (
    <AuthLayout
      title="Forgot password"
      hint="Enter your work email and we'll send you a link to choose a new password."
      onSubmit={submit}
      footer={<BackToSignIn />}
    >
      {sent ? (
        <>
          <Alert tone="success">{SENT} The link is valid for 60 minutes.</Alert>
          <Button variant="secondary" className="w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </>
      ) : (
        <>
          <div className="admin-fields">
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearField('email') }}
              error={fields.email}
              required
              autoFocus
            />
          </div>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </>
      )}
    </AuthLayout>
  )
}

export default ForgotPassword
