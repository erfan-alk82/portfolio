"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/login/actions";

const initial: LoginState = { error: null, username: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate={false}>
      {state.error ? (
        <p id="login-error" role="alert" className="border-s-2 border-signal ps-3 text-sm font-semibold text-signal-deep">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-semibold text-ink">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          maxLength={100}
          defaultValue={state.username}
          aria-describedby={state.error ? "login-error" : undefined}
          className="admin-input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          aria-describedby={state.error ? "login-error" : undefined}
          className="admin-input"
        />
      </div>
      <button type="submit" disabled={pending} className="admin-button-primary">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
