import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RgxCard } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { DemoForm } from "../components/DemoForm";
import { Logo } from "../components/Logo";
import { LoginForm } from "../forms/LoginForm";

export function LoginPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="app-page app-login" aria-labelledby="login-title">
      <div className="app-login-logo">
        <Logo width={220} />
      </div>
      <CardTitle title="login.title" subtitle="login.subtitle" />
      <h2 id="login-title" className="app-visually-hidden">
        {new LoginForm().constructor.name}
      </h2>
      <RgxCard type="shadow">
        <DemoForm
          id="login-form"
          fields={[
            {
              name: "username",
              label: "login.username.label",
              placeholder: "login.username.placeholder",
              required: true,
            },
            {
              name: "password",
              label: "login.password.label",
              placeholder: "login.password.placeholder",
              type: "password",
              required: true,
            },
          ]}
          initialValues={{ username: "User", password: "Passd-123" }}
          submitLabel="login.submit"
          onSubmit={(data) => {
            const user = String(data.username || "");
            (window as unknown as Record<string, unknown>).loggedUser = user;
            setMessage("login.success");
            navigate("/", { replace: true });
          }}
          onCancel={() => setMessage(null)}
        />
      </RgxCard>
      {message ? (
        <p role="status" aria-live="polite" className="app-status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
